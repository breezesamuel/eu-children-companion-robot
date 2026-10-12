#!/usr/bin/env python3
"""
GDPR-K Age Verification Middleware (Art. 8 GDPR + DSA Art. 28)

Implements age-gating per Member State (13–16) with verifiable parental consent (VPC).
Supports multiple VPC methods: email+link, micro-transaction, ID scan, signed form.

Usage:
    from children_age_gate import AgeGateMiddleware, require_parental_consent
    
    app.add_middleware(AgeGateMiddleware)
    
    @app.post("/api/child/data")
    @require_parental_consent("data_processing")
    async def child_data_endpoint(...):
        ...
"""

import os
import json
import time
import uuid
import logging
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Awaitable, List
from functools import wraps

from fastapi import Request, Response, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("age_gate")

# --- Member State age of digital consent (GDPR Art. 8) ---
# Default 16; Member States may lower to 13.
# Source: EDPS guidelines, national implementations.
MS_AGE_OF_CONSENT = {
    "AT": 14, "BE": 13, "BG": 14, "HR": 16, "CY": 14, "CZ": 15,
    "DK": 13, "EE": 13, "FI": 13, "FR": 15, "DE": 16, "GR": 15,
    "HU": 16, "IE": 16, "IT": 14, "LV": 13, "LT": 14, "LU": 16,
    "MT": 16, "NL": 16, "PL": 16, "PT": 13, "RO": 16, "SK": 16,
    "SI": 15, "ES": 14, "SE": 13,
    # Non-EU but relevant
    "UK": 13, "CH": 16, "NO": 13,
}
DEFAULT_AGE_OF_CONSENT = 16

# Consent types that require VPC for under-age users
VPC_REQUIRED_CONSENTS = {
    "data_processing", "profiling", "marketing", "third_party_sharing",
    "location_tracking", "voice_recording", "video_recording",
    "behavioral_analytics", "personalized_content"
}

# --- VPC Methods ---
class VPCMethod:
    EMAIL_LINK = "email_link"           # Parent clicks signed link
    MICRO_TRANSACTION = "micro_txn"     # Small card charge (€0.01), refunded
    ID_SCAN = "id_scan"                 # Government ID upload + OCR
    SIGNED_FORM = "signed_form"         # PDF form, e-signed
    CREDENTIAL = "credential"           # Verified credential (eIDAS, etc.)

# --- In-memory stores (replace with Redis/DB in production) ---
_vpc_requests: Dict[str, Dict] = {}      # vpc_id -> {user_id, method, status, ...}
_consent_records: Dict[str, Dict] = {}   # user_id -> {consent_type: {granted, vpc_id, ts}}
_user_age: Dict[str, Dict] = {}          # user_id -> {age, country, verified, method}

# --- Helpers -------------------------------------------------------------

def _get_client_country(request: Request) -> str:
    """Determine user's country from headers, geoip, or fallback."""
    # 1. Explicit header (set by frontend after geoip)
    c = request.headers.get("X-User-Country")
    if c and c.upper() in MS_AGE_OF_CONSENT:
        return c.upper()
    # 2. Cloudflare / CDN header
    c = request.headers.get("CF-IPCountry") or request.headers.get("X-Country-Code")
    if c and c.upper() in MS_AGE_OF_CONSENT:
        return c.upper()
    # 3. Default
    return "DE"  # Conservative default (16)

def _age_of_consent(country: str) -> int:
    return MS_AGE_OF_CONSENT.get(country.upper(), DEFAULT_AGE_OF_CONSENT)

def _requires_vpc(user_age: int, country: str, consent_type: str) -> bool:
    if consent_type not in VPC_REQUIRED_CONSENTS:
        return False
    return user_age < _age_of_consent(country)

def _generate_vpc_token() -> str:
    return secrets.token_urlsafe(32)

def _store_vpc_request(user_id: str, country: str, consent_type: str, method: str, parent_email: str = None) -> str:
    vpc_id = str(uuid.uuid4())
    token = _generate_vpc_token()
    expires = datetime.now() + timedelta(hours=24)
    _vpc_requests[vpc_id] = {
        "vpc_id": vpc_id,
        "token": token,
        "user_id": user_id,
        "country": country,
        "consent_type": consent_type,
        "method": method,
        "parent_email": parent_email,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "expires_at": expires.isoformat(),
    }
    logger.info("VPC request created: %s for user %s (consent=%s, method=%s)",
                vpc_id, user_id, consent_type, method)
    return vpc_id

def _verify_vpc_token(vpc_id: str, token: str) -> bool:
    req = _vpc_requests.get(vpc_id)
    if not req:
        return False
    if req["status"] != "pending":
        return False
    if datetime.now() > datetime.fromisoformat(req["expires_at"]):
        req["status"] = "expired"
        return False
    if not secrets.compare_digest(req["token"], token):
        return False
    return True

def _complete_vpc(vpc_id: str) -> bool:
    req = _vpc_requests.get(vpc_id)
    if not req or req["status"] != "pending":
        return False
    req["status"] = "verified"
    req["verified_at"] = datetime.now().isoformat()
    _record_consent(req["user_id"], req["consent_type"], True, vpc_id)
    logger.info("VPC completed: %s", vpc_id)
    return True

def _record_consent(user_id: str, consent_type: str, granted: bool, vpc_id: str = None) -> None:
    if user_id not in _consent_records:
        _consent_records[user_id] = {}
    _consent_records[user_id][consent_type] = {
        "granted": granted,
        "vpc_id": vpc_id,
        "timestamp": datetime.now().isoformat(),
    }

def get_consent_status(user_id: str, consent_type: str) -> Dict:
    return _consent_records.get(user_id, {}).get(consent_type, {"granted": False})

def set_user_age(user_id: str, age: int, country: str, verified: bool = False, method: str = "self_declared") -> None:
    _user_age[user_id] = {
        "age": age,
        "country": country.upper(),
        "verified": verified,
        "method": method,
        "updated_at": datetime.now().isoformat(),
    }

def get_user_age_info(user_id: str) -> Dict:
    return _user_age.get(user_id, {"age": 0, "country": "DE", "verified": False})

# --- Middleware ----------------------------------------------------------

class AgeGateMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware that:
    1. Attaches `request.state.age_gate` with user's age info and country.
    2. For mutating endpoints under /api/child/*, checks VPC requirements.
    3. Returns 403 with VPC initiation info if consent missing.
    """
    
    def __init__(self, app, excluded_paths: List[str] = None):
        super().__init__(app)
        self.excluded_paths = excluded_paths or [
            "/health", "/api/health", "/api/info", "/api/docs", "/api/redoc",
            "/api/auth/login", "/api/auth/register", "/api/auth/refresh",
            "/api/vpc/",  # VPC endpoints themselves
        ]

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        path = request.url.path
        
        # Skip excluded paths
        if any(path.startswith(p) for p in self.excluded_paths):
            return await call_next(request)
        
        # Attach age gate info to request.state
        user_id = getattr(request.state, "user_id", None) or request.headers.get("X-User-ID")
        country = _get_client_country(request)
        age_info = get_user_age_info(user_id) if user_id else {"age": 0, "country": country, "verified": False}
        
        request.state.age_gate = {
            "user_id": user_id,
            "age": age_info.get("age", 0),
            "country": age_info.get("country", country),
            "verified": age_info.get("verified", False),
            "age_of_consent": _age_of_consent(age_info.get("country", country)),
        }
        
        # For child data endpoints, check consent
        if path.startswith("/api/child/") and request.method in ("POST", "PUT", "PATCH", "DELETE"):
            # Determine required consent from path
            consent_type = self._consent_type_from_path(path)
            if consent_type and user_id:
                age = age_info.get("age", 0)
                if _requires_vpc(age, country, consent_type):
                    consent = get_consent_status(user_id, consent_type)
                    if not consent.get("granted"):
                        return JSONResponse(
                            status_code=403,
                            content={
                                "error": "parental_consent_required",
                                "message": f"Parental consent required for {consent_type} (user age {age}, country {country} requires {_age_of_consent(country)}+)",
                                "consent_type": consent_type,
                                "age_of_consent": _age_of_consent(country),
                                "user_age": age,
                                "vpc_methods": [VPCMethod.EMAIL_LINK, VPCMethod.MICRO_TRANSACTION, VPCMethod.SIGNED_FORM],
                                "initiate_vpc_url": f"/api/vpc/initiate?user_id={user_id}&consent_type={consent_type}&country={country}",
                            }
                        )
        
        return await call_next(request)

    def _consent_type_from_path(self, path: str) -> Optional[str]:
        """Map API path to consent type."""
        mapping = {
            "/api/child/profile": "data_processing",
            "/api/child/location": "location_tracking",
            "/api/child/voice": "voice_recording",
            "/api/child/video": "video_recording",
            "/api/child/analytics": "behavioral_analytics",
            "/api/child/recommendations": "profiling",
            "/api/child/share": "third_party_sharing",
        }
        for prefix, ctype in mapping.items():
            if path.startswith(prefix):
                return ctype
        return "data_processing"  # Default

# --- Dependency for route-level protection -------------------------------

async def require_parental_consent(consent_type: str):
    """FastAPI dependency: raises 403 if VPC required but not granted."""
    async def _check(request: Request):
        age_gate = getattr(request.state, "age_gate", None)
        if not age_gate:
            return  # Middleware not run? Allow (defense in depth)
        user_id = age_gate.get("user_id")
        if not user_id:
            return
        age = age_gate.get("age", 0)
        country = age_gate.get("country", "DE")
        if _requires_vpc(age, country, consent_type):
            consent = get_consent_status(user_id, consent_type)
            if not consent.get("granted"):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "parental_consent_required",
                        "consent_type": consent_type,
                        "age_of_consent": _age_of_consent(country),
                        "user_age": age,
                        "vpc_methods": [VPCMethod.EMAIL_LINK, VPCMethod.MICRO_TRANSACTION, VPCMethod.SIGNED_FORM],
                    }
                )
    return Depends(_check)

# --- VPC Initiation / Verification Endpoints (to be mounted) ------------

def create_vpc_router():
    """Create a FastAPI router with VPC endpoints."""
    from fastapi import APIRouter, Query, Body
    from pydantic import BaseModel, EmailStr
    
    router = APIRouter(prefix="/api/vpc", tags=["Verifiable Parental Consent"])
    
    class VPCInitiateRequest(BaseModel):
        user_id: str
        consent_type: str
        country: str
        method: str = VPCMethod.EMAIL_LINK
        parent_email: Optional[EmailStr] = None
    
    class VPCVerifyRequest(BaseModel):
        vpc_id: str
        token: str
    
    @router.post("/initiate")
    async def initiate_vpc(req: VPCInitiateRequest):
        if req.consent_type not in VPC_REQUIRED_CONSENTS:
            raise HTTPException(400, "Invalid consent type")
        if req.method not in [VPCMethod.EMAIL_LINK, VPCMethod.MICRO_TRANSACTION, VPCMethod.SIGNED_FORM, VPCMethod.ID_SCAN]:
            raise HTTPException(400, "Unsupported VPC method")
        
        vpc_id = _store_vpc_request(req.user_id, req.country, req.consent_type, req.method, req.parent_email)
        req_obj = _vpc_requests[vpc_id]
        
        # In production: send email, create payment intent, generate form URL, etc.
        action_url = None
        if req.method == VPCMethod.EMAIL_LINK:
            action_url = f"/api/vpc/verify?vpc_id={vpc_id}&token={req_obj['token']}"
        elif req.method == VPCMethod.MICRO_TRANSACTION:
            action_url = f"/api/vpc/payment?session_id={vpc_id}"  # Stripe/etc.
        elif req.method == VPCMethod.SIGNED_FORM:
            action_url = f"/api/vpc/form?form_id={vpc_id}"
        
        return {
            "vpc_id": vpc_id,
            "method": req.method,
            "expires_at": req_obj["expires_at"],
            "action_url": action_url,
            "message": "Check parent email for consent link" if req.method == VPCMethod.EMAIL_LINK else "Follow the action_url"
        }
    
    @router.get("/verify")
    async def verify_vpc(vpc_id: str, token: str):
        if _verify_vpc_token(vpc_id, token):
            _complete_vpc(vpc_id)
            return {"success": True, "message": "Parental consent verified"}
        raise HTTPException(400, "Invalid or expired VPC token")
    
    @router.post("/verify")
    async def verify_vpc_post(req: VPCVerifyRequest):
        return await verify_vpc(req.vpc_id, req.token)
    
    @router.get("/status/{user_id}/{consent_type}")
    async def vpc_status(user_id: str, consent_type: str):
        consent = get_consent_status(user_id, consent_type)
        age_info = get_user_age_info(user_id)
        return {
            "user_id": user_id,
            "consent_type": consent_type,
            "granted": consent.get("granted", False),
            "vpc_id": consent.get("vpc_id"),
            "timestamp": consent.get("timestamp"),
            "age_info": age_info,
            "requires_vpc": _requires_vpc(age_info.get("age", 0), age_info.get("country", "DE"), consent_type),
        }
    
    return router

# --- Utility: Decorator for sync functions (non-FastAPI) ----------------

def require_vpc(consent_type: str, get_user_id: Callable, get_country: Callable = lambda: "DE"):
    """Decorator for non-FastAPI code (e.g., internal service calls)."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_id = get_user_id(*args, **kwargs)
            country = get_country(*args, **kwargs)
            age_info = get_user_age_info(user_id)
            age = age_info.get("age", 0)
            if _requires_vpc(age, country, consent_type):
                consent = get_consent_status(user_id, consent_type)
                if not consent.get("granted"):
                    raise PermissionError(f"Parental consent required for {consent_type}")
            return func(*args, **kwargs)
        return wrapper
    return decorator

# --- Export ---
__all__ = [
    "AgeGateMiddleware",
    "require_parental_consent",
    "create_vpc_router",
    "VPCMethod",
    "set_user_age",
    "get_user_age_info",
    "get_consent_status",
    "_requires_vpc",
    "MS_AGE_OF_CONSENT",
    "VPC_REQUIRED_CONSENTS",
]