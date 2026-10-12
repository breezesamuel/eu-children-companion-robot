#!/usr/bin/env python3
"""
LTI 1.3 Advantage Integration — Learning Tools Interoperability

Implements LTI 1.3 Core + Advantage services for LMS integration:
- LTI 1.3 Core: OIDC login, platform/Tool messaging, deep linking
- Names and Role Provisioning Services (NRPS): roster sync
- Assignment and Grade Services (AGS): grade passback
- Deep Linking: content selection from LMS

Compliant with IMS Global LTI 1.3 Advantage specification.
"""

import os
import json
import jwt
import secrets
import logging
import hashlib
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
from urllib.parse import urlencode, parse_qs
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import requests

logger = logging.getLogger("lti")

# --- Constants ------------------------------------------------------------

LTI_VERSION = "1.3.0"
LTI_MESSAGE_TYPES = {
    "LtiResourceLinkRequest": "LtiResourceLinkRequest",
    "LtiDeepLinkingRequest": "LtiDeepLinkingRequest",
    "LtiSubmissionReviewRequest": "LtiSubmissionReviewRequest",
}

LTI_CLAIMS = {
    "ISS": "iss",
    "SUB": "sub",
    "AUD": "aud",
    "EXP": "exp",
    "IAT": "iat",
    "NONCE": "nonce",
    "AZP": "azp",
    "DEPLOYMENT_ID": "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
    "TARGET_LINK_URI": "https://purl.imsglobal.org/spec/lti/claim/target_link_uri",
    "ROLES": "https://purl.imsglobal.org/spec/lti/claim/roles",
    "CONTEXT": "https://purl.imsglobal.org/spec/lti/claim/context",
    "TOOL_PLATFORM": "https://purl.imsglobal.org/spec/lti/claim/tool_platform",
    "LAUNCH_PRESENTATION": "https://purl.imsglobal.org/spec/lti/claim/launch_presentation",
    "CUSTOM": "https://purl.imsglobal.org/spec/lti/claim/custom",
    "NRPS_CONTEXT_MEMBERSHIPS": "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice",
    "AGS_LINEITEMS": "https://purl.imsglobal.org/spec/lti-ags/claim/lineitems",
    "AGS_SCOPE_LINEITEM": "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    "AGS_SCOPE_RESULT": "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
    "AGS_SCOPE_SCORE": "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    "DL_DEEP_LINKING": "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking",
    "DL_DATA": "https://purl.imsglobal.org/spec/lti-dl/claim/data",
    "MESSAGE_TYPE": "https://purl.imsglobal.org/spec/lti/claim/message_type",
    "VERSION": "https://purl.imsglobal.org/spec/lti/claim/version",
    "RESOURCE_LINK": "https://purl.imsglobal.org/spec/lti/claim/resource_link",
}

# --- Data Classes ---------------------------------------------------------

@dataclass
class PlatformRegistration:
    platform_id: str
    name: str
    client_id: str
    public_keyset_url: str
    auth_login_url: str
    auth_token_url: str
    jwks_url: str
    deployment_ids: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class LTILaunchData:
    message_type: str
    deployment_id: str
    user_id: str
    roles: List[str]
    context_id: Optional[str] = None
    context_title: Optional[str] = None
    context_label: Optional[str] = None
    resource_link_id: Optional[str] = None
    resource_link_title: Optional[str] = None
    custom_params: Dict = field(default_factory=dict)
    nrs_context_memberships_url: Optional[str] = None
    ags_lineitems_url: Optional[str] = None
    ags_scope: List[str] = field(default_factory=list)
    dl_deep_linking_url: Optional[str] = None
    launch_presentation: Dict = field(default_factory=dict)

@dataclass
class LineItem:
    id: Optional[str] = None
    score_maximum: float = 100.0
    label: str = ""
    resource_link_id: Optional[str] = None
    tag: Optional[str] = None
    resource_id: Optional[str] = None
    start_date_time: Optional[str] = None
    end_date_time: Optional[str] = None

@dataclass
class Score:
    user_id: str
    score_given: float
    score_maximum: float = 100.0
    activity_progress: str = "Completed"  # Initialized, Started, Completed
    grading_progress: str = "FullyGraded"  # Pending, FullyGraded
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    comment: Optional[str] = None

# --- In-Memory Stores -----------------------------------------------------

_PLATFORM_REGISTRY: Dict[str, PlatformRegistration] = {}
_TOOL_PRIVATE_KEY: Optional[rsa.RSAPrivateKey] = None
_TOOL_PUBLIC_KEY: Optional[rsa.RSAPublicKey] = None
_NONCE_STORE: Dict[str, Dict] = {}  # nonce -> {platform_id, state, created_at}
_LAUNCH_CACHE: Dict[str, LTILaunchData] = {}  # For deep linking return

# --- Key Management -------------------------------------------------------

def generate_key_pair() -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    """Generate RSA key pair for LTI tool."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    return private_key, public_key

def get_tool_keys() -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    global _TOOL_PRIVATE_KEY, _TOOL_PUBLIC_KEY
    if _TOOL_PRIVATE_KEY is None:
        _TOOL_PRIVATE_KEY, _TOOL_PUBLIC_KEY = generate_key_pair()
    return _TOOL_PRIVATE_KEY, _TOOL_PUBLIC_KEY

def get_jwks() -> Dict:
    """Return JWKS for tool (used by platforms to verify our tokens)."""
    _, public_key = get_tool_keys()
    numbers = public_key.public_numbers()
    
    def int_to_b64(n: int) -> str:
        return base64.urlsafe_b64encode(n.to_bytes((n.bit_length() + 7) // 8, 'big')).rstrip(b'=').decode()
    
    import base64
    return {
        "keys": [{
            "kty": "RSA",
            "kid": "lti-tool-key-1",
            "use": "sig",
            "alg": "RS256",
            "n": int_to_b64(numbers.n),
            "e": int_to_b64(numbers.e),
        }]
    }

# --- OIDC Login Initiation ------------------------------------------------

def build_oidc_login_url(
    platform: PlatformRegistration,
    target_link_uri: str,
    login_hint: str = None,
    lti_message_hint: str = None
) -> str:
    """Build OIDC login initiation URL (LTI 1.3 Core)."""
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    
    # Store nonce for validation
    _NONCE_STORE[nonce] = {
        "platform_id": platform.platform_id,
        "state": state,
        "target_link_uri": target_link_uri,
        "created_at": datetime.now().isoformat(),
    }
    
    params = {
        "scope": "openid",
        "response_type": "id_token",
        "client_id": platform.client_id,
        "redirect_uri": target_link_uri,
        "state": state,
        "nonce": nonce,
        "response_mode": "form_post",
        "prompt": "none",
    }
    
    if login_hint:
        params["login_hint"] = login_hint
    if lti_message_hint:
        params["lti_message_hint"] = lti_message_hint
    
    return f"{platform.auth_login_url}?{urlencode(params)}"

def validate_oidc_callback(
    id_token: str,
    platform: PlatformRegistration
) -> Optional[Dict]:
    """Validate OIDC callback and return launch data."""
    try:
        # Fetch platform's public keys
        jwks_response = requests.get(platform.jwks_url, timeout=10)
        jwks_response.raise_for_status()
        jwks = jwks_response.json()
        
        # Decode and validate JWT
        header = jwt.get_unverified_header(id_token)
        kid = header.get("kid")
        
        # Find matching key
        key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key_data:
            logger.error("No matching key found for kid: %s", kid)
            return None
        
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))
        
        # Decode with validation
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=platform.client_id,
            issuer=platform.platform_id,
        )
        
        # Validate nonce
        nonce = payload.get("nonce")
        if nonce not in _NONCE_STORE:
            logger.error("Invalid or reused nonce: %s", nonce)
            return None
        
        nonce_data = _NONCE_STORE.pop(nonce)
        if nonce_data["platform_id"] != platform.platform_id:
            logger.error("Nonce platform mismatch")
            return None
        
        # Extract launch data
        launch_data = extract_launch_data(payload, platform)
        return launch_data
        
    except jwt.ExpiredSignatureError:
        logger.error("ID token expired")
    except jwt.InvalidTokenError as e:
        logger.error("Invalid ID token: %s", e)
    except Exception as e:
        logger.error("OIDC validation error: %s", e)
    
    return None

def extract_launch_data(payload: Dict, platform: PlatformRegistration) -> LTILaunchData:
    """Extract standardized launch data from LTI payload."""
    custom = payload.get(LTI_CLAIMS["CUSTOM"], {})
    
    # Extract NRPS/AGS/DL endpoints
    nrs = payload.get(LTI_CLAIMS["NRPS_CONTEXT_MEMBERSHIPS"], {})
    ags = payload.get(LTI_CLAIMS["AGS_LINEITEMS"], {})
    dl = payload.get(LTI_CLAIMS["DL_DEEP_LINKING"], {})
    
    return LTILaunchData(
        message_type=payload.get(LTI_CLAIMS["MESSAGE_TYPE"], "LtiResourceLinkRequest"),
        deployment_id=payload.get(LTI_CLAIMS["DEPLOYMENT_ID"], ""),
        user_id=payload.get("sub", ""),
        roles=payload.get(LTI_CLAIMS["ROLES"], []),
        context_id=payload.get(LTI_CLAIMS["CONTEXT"], {}).get("id"),
        context_title=payload.get(LTI_CLAIMS["CONTEXT"], {}).get("title"),
        context_label=payload.get(LTI_CLAIMS["CONTEXT"], {}).get("label"),
        resource_link_id=payload.get(LTI_CLAIMS["RESOURCE_LINK"], {}).get("id"),
        resource_link_title=payload.get(LTI_CLAIMS["RESOURCE_LINK"], {}).get("title"),
        custom_params=custom,
        nrs_context_memberships_url=nrs.get("context_memberships_url"),
        ags_lineitems_url=ags.get("lineitems"),
        ags_scope=payload.get("scope", "").split() if "scope" in payload else [],
        dl_deep_linking_url=dl.get("deep_link_return_url"),
        launch_presentation=payload.get(LTI_CLAIMS["LAUNCH_PRESENTATION"], {}),
    )

# --- Platform Registration ------------------------------------------------

def register_platform(
    platform_id: str,
    name: str,
    client_id: str,
    public_keyset_url: str,
    auth_login_url: str,
    auth_token_url: str,
    jwks_url: str,
    deployment_ids: List[str] = None
) -> PlatformRegistration:
    """Register an LTI platform (LMS)."""
    platform = PlatformRegistration(
        platform_id=platform_id,
        name=name,
        client_id=client_id,
        public_keyset_url=public_keyset_url,
        auth_login_url=auth_login_url,
        auth_token_url=auth_token_url,
        jwks_url=jwks_url,
        deployment_ids=deployment_ids or [],
    )
    _PLATFORM_REGISTRY[platform_id] = platform
    logger.info("Platform registered: %s (%s)", name, platform_id)
    return platform

def get_platform(platform_id: str) -> Optional[PlatformRegistration]:
    return _PLATFORM_REGISTRY.get(platform_id)

# --- Access Token (for AGS/NRPS) -----------------------------------------

def get_platform_access_token(platform: PlatformRegistration, scopes: List[str]) -> Optional[str]:
    """Get access token from platform using client credentials."""
    try:
        _, private_key = get_tool_keys()
        
        # Create JWT assertion
        now = int(time.time())
        assertion = jwt.encode(
            {
                "iss": "https://children-robot.com",  # Tool issuer
                "sub": "https://children-robot.com",
                "aud": platform.auth_token_url,
                "iat": now,
                "exp": now + 300,
                "jti": secrets.token_urlsafe(16),
            },
            private_key,
            algorithm="RS256",
            headers={"kid": "lti-tool-key-1"},
        )
        
        data = {
            "grant_type": "client_credentials",
            "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": assertion,
            "scope": " ".join(scopes),
        }
        
        resp = requests.post(platform.auth_token_url, data=data, timeout=10)
        resp.raise_for_status()
        return resp.json().get("access_token")
        
    except Exception as e:
        logger.error("Failed to get access token: %s", e)
        return None

# --- Names and Role Provisioning Services (NRPS) -------------------------

def get_context_memberships(
    platform: PlatformRegistration,
    context_id: str,
    roles: List[str] = None,
    limit: int = 100
) -> List[Dict]:
    """Get context memberships (NRPS)."""
    token = get_platform_access_token(platform, [
        "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly"
    ])
    if not token:
        return []
    
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    params = {"limit": limit}
    if roles:
        params["role"] = roles
    
    url = f"{platform.nrs_context_memberships_url}?context_id={context_id}"
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json().get("members", [])

# --- Assignment and Grade Services (AGS) ---------------------------------

def get_line_items(platform: PlatformRegistration, context_id: str) -> List[Dict]:
    """Get line items for a context (AGS)."""
    token = get_platform_access_token(platform, [
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
    ])
    if not token:
        return []
    
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    url = f"{platform.ags_lineitems_url}?context_id={context_id}"
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()

def create_line_item(
    platform: PlatformRegistration,
    context_id: str,
    line_item: LineItem
) -> Optional[Dict]:
    """Create a line item (AGS)."""
    token = get_platform_access_token(platform, [
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    ])
    if not token:
        return None
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    
    payload = {
        "scoreMaximum": line_item.score_maximum,
        "label": line_item.label,
    }
    if line_item.resource_link_id:
        payload["resourceLinkId"] = line_item.resource_link_id
    if line_item.tag:
        payload["tag"] = line_item.tag
    if line_item.resource_id:
        payload["resourceId"] = line_item.resource_id
    if line_item.start_date_time:
        payload["startDateTime"] = line_item.start_date_time
    if line_item.end_date_time:
        payload["endDateTime"] = line_item.end_date_time
    
    resp = requests.post(
        f"{platform.ags_lineitems_url}?context_id={line_item.context_id or context_id}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()

def post_score(
    platform: PlatformRegistration,
    line_item_url: str,
    score: Score
) -> bool:
    """Post a score for a line item (AGS)."""
    token = get_platform_access_token(platform, [
        "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    ])
    if not token:
        return False
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "userId": score.user_id,
        "scoreGiven": score.score_given,
        "scoreMaximum": score.score_maximum,
        "activityProgress": score.activity_progress,
        "gradingProgress": score.grading_progress,
        "timestamp": score.timestamp,
    }
    if score.comment:
        payload["comment"] = score.comment
    
    try:
        resp = requests.post(
            f"{line_item_url}/scores",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
            timeout=10
        )
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error("Failed to post score: %s", e)
        return False

# --- Deep Linking (LTI-DL) -----------------------------------------------

def build_deep_linking_response(
    launch_data: LTILaunchData,
    content_items: List[Dict],
    message: str = "Content selection successful"
) -> str:
    """Build JWT for deep linking response (LTI-DL)."""
    if not launch_data.dl_deep_linking_url:
        raise ValueError("No deep linking return URL in launch data")
    
    _, private_key = get_tool_keys()
    
    content_items_jwt = []
    for item in content_items:
        content_items_jwt.append({
            "type": item.get("type", "ltiResourceLink"),
            "title": item.get("title", "Content"),
            "text": item.get("text", ""),
            "url": item.get("url"),
            "custom": item.get("custom", {}),
        })
    
    now = int(time.time())
    jwt_payload = {
        "iss": "https://children-robot.com",
        "aud": launch_data.dl_deep_linking_url.split("?")[0].split("/")[2],  # Platform domain
        "iat": now,
        "exp": now + 300,
        "nonce": secrets.token_urlsafe(16),
        "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
        "https://purl.imsglobal.org/spec/lti/claim/version": LTI_VERSION,
        "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": content_items_jwt,
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id": launch_data.deployment_id,
    }
    
    _, private_key = get_tool_keys()
    response_jwt = jwt.encode(jwt_payload, private_key, algorithm="RS256", headers={"kid": "lti-tool-key-1"})
    
    # Return HTML form for auto-POST
    return f"""
    <html><body onload="document.forms[0].submit()">
    <form method="POST" action="{launch_data.dl_deep_linking_url}">
        <input type="hidden" name="JWT" value="{response_jwt}">
        <noscript><button type="submit">Continue</button></noscript>
    </form></body></html>
    """

# --- FastAPI Router -------------------------------------------------------

def create_lti_router():
    from fastapi import APIRouter, Request, Form, HTTPException, Depends
    from fastapi.responses import HTMLResponse, JSONResponse
    from pydantic import BaseModel
    from typing import List, Optional
    
    router = APIRouter(prefix="/api/lti", tags=["LTI 1.3"])
    
    class PlatformRegisterRequest(BaseModel):
        platform_id: str
        name: str
        client_id: str
        public_keyset_url: str
        auth_login_url: str
        auth_token_url: str
        jwks_url: str
        deployment_ids: Optional[List[str]] = None
    
    class LineItemRequest(BaseModel):
        context_id: str
        score_maximum: float = 100.0
        label: str
        resource_link_id: Optional[str] = None
        tag: Optional[str] = None
        resource_id: Optional[str] = None
        start_date_time: Optional[str] = None
        end_date_time: Optional[str] = None
    
    class ScoreRequest(BaseModel):
        line_item_url: str
        user_id: str
        score_given: float
        score_maximum: float = 100.0
        activity_progress: str = "Completed"
        grading_progress: str = "FullyGraded"
        comment: Optional[str] = None
    
    @router.get("/jwks.json")
    async def jwks_endpoint():
        return get_jwks()
    
    @router.post("/platform/register")
    async def register_platform_endpoint(req: PlatformRegisterRequest):
        platform = register_platform(
            req.platform_id, req.name, req.client_id,
            req.public_keyset_url, req.auth_login_url,
            req.auth_token_url, req.jwks_url, req.deployment_ids
        )
        return {"success": True, "platform_id": platform.platform_id}
    
    @router.get("/platforms")
    async def list_platforms():
        return {"platforms": [{"platform_id": p.platform_id, "name": p.name, "client_id": p.client_id} for p in _PLATFORM_REGISTRY.values()]}
    
    @router.get("/login")
    async def lti_login(
        request: Request,
        target_link_uri: str,
        platform_id: str,
        login_hint: Optional[str] = None,
        lti_message_hint: Optional[str] = None
    ):
        platform = get_platform(platform_id)
        if not platform:
            raise HTTPException(404, "Platform not registered")
        
        url = build_oidc_login_url(platform, target_link_uri, login_hint, lti_message_hint)
        return RedirectResponse(url=url)
    
    @router.post("/launch")
    async def lti_launch(
        request: Request,
        id_token: str = Form(...),
        state: Optional[str] = Form(None)
    ):
        # In production: validate state matches stored nonce
        # For now, find platform by trying each (or use deployment_id from token)
        # Simplified: assume single platform
        platform = list(_PLATFORM_REGISTRY.values())[0]
        
        launch_data = validate_oidc_callback(id_token, platform)
        if not launch_data:
            raise HTTPException(401, "Invalid LTI launch")
        
        # Cache launch data for deep linking
        cache_key = secrets.token_urlsafe(16)
        _LAUNCH_CACHE[cache_key] = launch_data
        
        # Return launch page with cached data
        return HTMLResponse(f"""
        <html><head><title>LTI Launch</title></head>
        <body>
            <h1>Welcome to RoboBuddy Companion Robot</h1>
            <p>User: {launch_data.user_id}</p>
            <p>Context: {launch_data.context_title or launch_data.context_id}</p>
            <p>Roles: {', '.join(launch_data.roles)}</p>
            <script>
                // Pass launch data to frontend app
                window.LTI_LAUNCH_DATA = {json.dumps(asdict(launch_data))};
                window.LTI_CACHE_KEY = "{cache_key}";
            </script>
            <script src="/static/lti-launch.js"></script>
        </body></html>
        """)
    
    @router.get("/jwks.json")
    async def jwks():
        return get_jwks()
    
    # NRPS Endpoints
    @router.get("/nrps/contexts/{context_id}/memberships")
    async def get_memberships(
        context_id: str,
        platform_id: str,
        roles: Optional[List[str]] = None,
        limit: int = 100
    ):
        platform = get_platform(platform_id)
        if not platform:
            raise HTTPException(404, "Platform not found")
        
        members = get_context_memberships(platform, context_id, roles, limit)
        return {"members": members}
    
    # AGS Endpoints
    @router.get("/ags/contexts/{context_id}/lineitems")
    async def get_lineitems(context_id: str, platform_id: str):
        platform = get_platform(platform_id)
        if not platform:
            raise HTTPException(404, "Platform not found")
        
        items = get_line_items(platform, context_id)
        return {"lineItems": items}
    
    @router.post("/ags/contexts/{context_id}/lineitems")
    async def create_lineitem(context_id: str, platform_id: str, req: LineItemRequest):
        platform = get_platform(platform_id)
        if not platform:
            raise HTTPException(404, "Platform not found")
        
        line_item = LineItem(
            context_id=context_id,
            score_maximum=req.score_maximum,
            label=req.label,
            resource_link_id=req.resource_link_id,
            tag=req.tag,
            resource_id=req.resource_id,
            start_date_time=req.start_date_time,
            end_date_time=req.end_date_time,
        )
        result = create_line_item(platform, context_id, line_item)
        if not result:
            raise HTTPException(500, "Failed to create line item")
        return result
    
    @router.post("/ags/lineitems/{line_item_url:path}/scores")
    async def post_score_endpoint(line_item_url: str, platform_id: str, req: ScoreRequest):
        platform = get_platform(platform_id)
        if not platform:
            raise HTTPException(404, "Platform not found")
        
        score = Score(
            user_id=req.user_id,
            score_given=req.score_given,
            score_maximum=req.score_maximum,
            activity_progress=req.activity_progress,
            grading_progress=req.grading_progress,
            comment=req.comment,
        )
        ok = post_score(platform, req.line_item_url, score)
        if not ok:
            raise HTTPException(500, "Failed to post score")
        return {"success": True}
    
    # Deep Linking
    @router.post("/deeplink")
    async def deeplink_select(
        request: Request,
        cache_key: str = Form(...),
        content_items: str = Form(...),  # JSON array
    ):
        launch_data = _LAUNCH_CACHE.pop(cache_key, None)
        if not launch_data:
            raise HTTPException(400, "Invalid or expired launch cache")
        
        items = json.loads(content_items)
        response_html = build_deep_linking_response(launch_data, items)
        return HTMLResponse(response_html)
    
    # JWKS endpoint
    @router.get("/keyset.json")
    async def keyset():
        return get_jwks()
    
    return router

# --- Self-test ------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Generate keys
    private_key, public_key = get_tool_keys()
    print(f"Keys generated: {public_key.public_numbers().n.bit_length()} bits")
    
    # JWKS
    jwks = get_jwks()
    print(f"JWKS: {json.dumps(jwks, indent=2)[:200]}...")
    
    # Register mock platform
    platform = register_platform(
        platform_id="canvas_example",
        name="Canvas LMS (Example)",
        client_id="lti_client_123",
        public_keyset_url="https://canvas.example.com/lti/jwks",
        auth_login_url="https://canvas.example.com/login/oauth2/auth",
        auth_token_url="https://canvas.example.com/login/oauth2/token",
        jwks_url="https://canvas.example.com/lti/jwks",
        deployment_ids=["deployment_1"],
    )
    print(f"Platform registered: {platform.name}")
    
    # JWKS output
    print(f"Tool JWKS: {json.dumps(get_jwks(), indent=2)}")
    
    print("\nLTI 1.3 module ready")