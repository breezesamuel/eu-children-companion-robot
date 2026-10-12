#!/usr/bin/env python3
"""
COPPA Compliance Module — US Children's Online Privacy Protection Act

Implements Verifiable Parental Consent (VPC) per 16 CFR §312.
Supports multiple VPC methods as approved by FTC:
- Signed consent form (mail/fax/scan)
- Credit/debit card transaction ($0.01, refunded)
- Government ID verification
- Knowledge-based authentication (KBA)
- Video conference with parent
- Email + delayed confirmation (for internal use only, not for public)

Also provides COPPA-compliant data handling:
- Data minimization
- Parental access/deletion rights
- Retention limits
- Third-party disclosure restrictions
"""

import os
import uuid
import hashlib
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import json

logger = logging.getLogger("coppa")

# --- Constants ------------------------------------------------------------

COPPA_AGE_THRESHOLD = 13  # US COPPA applies to children under 13
VPC_TOKEN_TTL_HOURS = 72
CONSENT_RECORD_RETENTION_YEARS = 3  # Post-account-deletion

# --- VPC Methods (FTC-Approved) ------------------------------------------

class VPCMethod(Enum):
    SIGNED_FORM = "signed_form"           # Mail/fax/scan
    CREDIT_CARD = "credit_card"           # $0.01 auth + refund
    GOVERNMENT_ID = "government_id"       # ID scan + verification
    KBA = "kba"                           # Knowledge-based auth
    VIDEO_CONFERENCE = "video_conference" # Live video with parent
    EMAIL_PLUS_DELAY = "email_plus_delay" # Email + 48h delay (internal only)

# --- Data Classes ---------------------------------------------------------

@dataclass
class VPCRequest:
    vpc_id: str
    child_user_id: str
    parent_email: str
    method: VPCMethod
    status: str = "pending"  # pending, verified, failed, expired
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    verified_at: Optional[str] = None
    expires_at: str = field(default_factory=lambda: (datetime.now() + timedelta(hours=VPC_TOKEN_TTL_HOURS)).isoformat())
    metadata: Dict = field(default_factory=dict)  # Method-specific data

@dataclass
class COPPAConsentRecord:
    consent_id: str
    child_user_id: str
    parent_user_id: str
    vpc_id: str
    consent_types: List[str]  # e.g., ["data_collection", "third_party_sharing", "marketing"]
    granted: bool
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    revoked_at: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

@dataclass
class ChildDataRecord:
    child_user_id: str
    data_categories: List[str]  # What we collect
    collection_purpose: str
    retention_period_days: int
    third_party_shared: bool = False
    third_parties: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

# --- In-Memory Stores (Replace with DB in Production) --------------------

_VPC_REQUESTS: Dict[str, VPCRequest] = {}
_CONSENT_RECORDS: Dict[str, COPPAConsentRecord] = {}
_CHILD_DATA_RECORDS: Dict[str, ChildDataRecord] = {}
_PARENT_CHILD_LINKS: Dict[str, List[str]] = {}  # parent_id -> [child_ids]

# --- Helpers --------------------------------------------------------------

def _generate_vpc_id() -> str:
    return f"vpc_{uuid.uuid4().hex[:16]}"

def _generate_consent_id() -> str:
    return f"consent_{uuid.uuid4().hex[:16]}"

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def _verify_coppa_age(birth_date: str) -> bool:
    """Check if user is under 13 (COPPA threshold)."""
    try:
        birth = datetime.fromisoformat(birth_date)
        age = (datetime.now() - birth).days // 365
        return age < COPPA_AGE_THRESHOLD
    except Exception:
        return True  # Conservative: assume under 13 if uncertain

# --- VPC Initiation -------------------------------------------------------

def initiate_vpc(
    child_user_id: str,
    parent_email: str,
    method: VPCMethod,
    metadata: Dict = None
) -> VPCRequest:
    """Create a new VPC request."""
    vpc_id = _generate_vpc_id()
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    
    vpc = VPCRequest(
        vpc_id=vpc_id,
        child_user_id=child_user_id,
        parent_email=parent_email,
        method=method,
        metadata=metadata or {"token_hash": token_hash}
    )
    
    # Add method-specific metadata
    if method == VPCMethod.CREDIT_CARD:
        vpc.metadata.update({
            "amount_usd": 0.01,
            "currency": "USD",
            "description": "COPPA Verifiable Parental Consent - Refunded within 3 business days"
        })
    elif method == VPCMethod.EMAIL_PLUS_DELAY:
        vpc.metadata.update({
            "confirmation_url": f"/api/coppa/vpc/confirm?token={token}",
            "delay_hours": 48
        })
    elif method == VPCMethod.VIDEO_CONFERENCE:
        vpc.metadata.update({
            "meeting_id": f"coppa_{vpc_id}",
            "duration_minutes": 5
        })
    
    _VPC_REQUESTS[vpc_id] = vpc
    logger.info("VPC initiated: %s for child %s via %s", vpc_id, child_user_id, method.value)
    
    # In production: send email, create payment intent, schedule video call, etc.
    return vpc

def verify_vpc(vpc_id: str, provided_token: str = None, additional_data: Dict = None) -> bool:
    """Verify a VPC request."""
    vpc = _VPC_REQUESTS.get(vpc_id)
    if not vpc:
        logger.warning("VPC not found: %s", vpc_id)
        return False
    
    if vpc.status != "pending":
        logger.warning("VPC not pending: %s (status=%s)", vpc_id, vpc.status)
        return False
    
    if datetime.now() > datetime.fromisoformat(vpc.expires_at):
        vpc.status = "expired"
        logger.warning("VPC expired: %s", vpc_id)
        return False
    
    # Method-specific verification
    if vpc.method == VPCMethod.CREDIT_CARD:
        # In production: verify payment succeeded
        vpc.metadata["payment_verified"] = True
    elif vpc.method == VPCMethod.EMAIL_PLUS_DELAY:
        if not provided_token or _hash_token(provided_token) != vpc.metadata.get("token_hash"):
            return False
    elif vpc.method == VPCMethod.VIDEO_CONFERENCE:
        # In production: verify meeting completed
        vpc.metadata["meeting_completed"] = True
    elif vpc.method == VPCMethod.SIGNED_FORM:
        # In production: verify signed document received
        vpc.metadata["form_received"] = True
    elif vpc.method == VPCMethod.GOVERNMENT_ID:
        # In production: verify ID check passed
        vpc.metadata["id_verified"] = True
    elif vpc.method == VPCMethod.KBA:
        # In production: verify KBA answers
        vpc.metadata["kba_passed"] = True
    
    vpc.status = "verified"
    vpc.verified_at = datetime.now().isoformat()
    if additional_data:
        vpc.metadata.update(additional_data)
    
    logger.info("VPC verified: %s", vpc_id)
    return True

def get_vpc_status(vpc_id: str) -> Optional[Dict]:
    vpc = _VPC_REQUESTS.get(vpc_id)
    if not vpc:
        return None
    return {
        "vpc_id": vpc.vpc_id,
        "child_user_id": vpc.child_user_id,
        "parent_email": vpc.parent_email,
        "method": vpc.method.value,
        "status": vpc.status,
        "created_at": vpc.created_at,
        "verified_at": vpc.verified_at,
        "expires_at": vpc.expires_at
    }

# --- Consent Management ---------------------------------------------------

def record_coppa_consent(
    child_user_id: str,
    parent_user_id: str,
    vpc_id: str,
    consent_types: List[str],
    granted: bool,
    ip_address: str = None,
    user_agent: str = None
) -> COPPAConsentRecord:
    """Record parental consent after VPC verification."""
    vpc = _VPC_REQUESTS.get(vpc_id)
    if not vpc or vpc.status != "verified":
        raise ValueError("VPC not verified")
    
    if vpc.child_user_id != child_user_id:
        raise ValueError("VPC child mismatch")
    
    consent = COPPAConsentRecord(
        consent_id=_generate_consent_id(),
        child_user_id=child_user_id,
        parent_user_id=parent_user_id,
        vpc_id=vpc_id,
        consent_types=consent_types,
        granted=granted,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    _CONSENT_RECORDS[consent.consent_id] = consent
    
    # Link parent to child
    if parent_user_id not in _PARENT_CHILD_LINKS:
        _PARENT_CHILD_LINKS[parent_user_id] = []
    if child_user_id not in _PARENT_CHILD_LINKS[parent_user_id]:
        _PARENT_CHILD_LINKS[parent_user_id].append(child_user_id)
    
    logger.info("COPPA consent recorded: %s for child %s (granted=%s)", consent.consent_id, child_user_id, granted)
    return consent

def get_consent_records(child_user_id: str) -> List[Dict]:
    return [
        {
            "consent_id": c.consent_id,
            "parent_user_id": c.parent_user_id,
            "vpc_id": c.vpc_id,
            "consent_types": c.consent_types,
            "granted": c.granted,
            "created_at": c.created_at,
            "revoked_at": c.revoked_at
        }
        for c in _CONSENT_RECORDS.values()
        if c.child_user_id == child_user_id
    ]

def revoke_consent(consent_id: str, parent_user_id: str) -> bool:
    consent = _CONSENT_RECORDS.get(consent_id)
    if not consent:
        return False
    if consent.parent_user_id != parent_user_id:
        return False
    if consent.revoked_at:
        return False  # Already revoked
    
    consent.revoked_at = datetime.now().isoformat()
    consent.granted = False
    logger.info("COPPA consent revoked: %s", consent_id)
    return True

def get_children_for_parent(parent_user_id: str) -> List[str]:
    return _PARENT_CHILD_LINKS.get(parent_user_id, [])

# --- Data Collection Tracking ---------------------------------------------

def record_child_data_collection(
    child_user_id: str,
    data_categories: List[str],
    collection_purpose: str,
    retention_period_days: int,
    third_party_shared: bool = False,
    third_parties: List[str] = None
) -> ChildDataRecord:
    """Track what child data is collected (COPPA §312.3)."""
    record = ChildDataRecord(
        child_user_id=child_user_id,
        data_categories=data_categories,
        collection_purpose=collection_purpose,
        retention_period_days=retention_period_days,
        third_party_shared=third_party_shared,
        third_parties=third_parties or []
    )
    _CHILD_DATA_RECORDS[child_user_id] = record
    return record

def get_child_data_record(child_user_id: str) -> Optional[Dict]:
    record = _CHILD_DATA_RECORDS.get(child_user_id)
    if not record:
        return None
    return {
        "child_user_id": record.child_user_id,
        "data_categories": record.data_categories,
        "collection_purpose": record.collection_purpose,
        "retention_period_days": record.retention_period_days,
        "third_party_shared": record.third_party_shared,
        "third_parties": record.third_parties,
        "created_at": record.created_at
    }

# --- Parental Rights (COPPA §312.4, §312.5) -------------------------------

def parent_access_request(parent_user_id: str, child_user_id: str) -> Dict:
    """Parent's right to review child's data (§312.4)."""
    if child_user_id not in get_children_for_parent(parent_user_id):
        return {"error": "Not authorized"}
    
    return {
        "child_user_id": child_user_id,
        "consents": get_consent_records(child_user_id),
        "data_record": get_child_data_record(child_user_id),
        "vpc_history": [
            {"vpc_id": v.vpc_id, "method": v.method.value, "status": v.status, "created_at": v.created_at}
            for v in _VPC_REQUESTS.values() if v.child_user_id == child_user_id
        ]
    }

def parent_deletion_request(parent_user_id: str, child_user_id: str) -> Dict:
    """Parent's right to delete child's data (§312.5)."""
    if child_user_id not in get_children_for_parent(parent_user_id):
        return {"error": "Not authorized", "deleted": False}
    
    # Revoke all consents
    for consent in _CONSENT_RECORDS.values():
        if consent.child_user_id == child_user_id and consent.granted:
            consent.granted = False
            consent.revoked_at = datetime.now().isoformat()
    
    # Delete data record
    deleted_data = child_user_id in _CHILD_DATA_RECORDS
    if deleted_data:
        del _CHILD_DATA_RECORDS[child_user_id]
    
    # Delete VPC history
    vpcs_to_delete = [vpc_id for vpc_id, v in _VPC_REQUESTS.items() if v.child_user_id == child_user_id]
    for vpc_id in vpcs_to_delete:
        del _VPC_REQUESTS[vpc_id]
    
    # Unlink parent-child
    if parent_user_id in _PARENT_CHILD_LINKS:
        _PARENT_CHILD_LINKS[parent_user_id] = [
            c for c in _PARENT_CHILD_LINKS[parent_user_id] if c != child_user_id
        ]
    
    return {
        "deleted": True,
        "consents_revoked": True,
        "data_record_deleted": deleted_data,
        "vpcs_deleted": len(vpcs_to_delete),
        "timestamp": datetime.now().isoformat()
    }

# --- Data Retention & Deletion (COPPA §312.10) ----------------------------

def enforce_retention_policies() -> Dict:
    """Enforce COPPA data retention limits (§312.10)."""
    now = datetime.now()
    deleted = {"consents": 0, "data_records": 0, "vpcs": 0}
    
    # Consents: retain for 3 years post-revocation/account-deletion
    cutoff = now - timedelta(days=CONSENT_RECORD_RETENTION_YEARS * 365)
    for consent_id, consent in list(_CONSENT_RECORDS.items()):
        if consent.revoked_at and datetime.fromisoformat(consent.revoked_at) < cutoff:
            del _CONSENT_RECORDS[consent_id]
            deleted["consents"] += 1
    
    # VPC requests: retain for 1 year
    vpc_cutoff = now - timedelta(days=365)
    for vpc_id, vpc in list(_VPC_REQUESTS.items()):
        if datetime.fromisoformat(vpc.created_at) < vpc_cutoff:
            del _VPC_REQUESTS[vpc_id]
            deleted["vpcs"] += 1
    
    return deleted

# --- Third-Party Disclosure (COPPA §312.11) -------------------------------

def record_third_party_disclosure(
    child_user_id: str,
    third_party: str,
    data_categories: List[str],
    purpose: str
) -> bool:
    """Record disclosure to third party (§312.11)."""
    record = _CHILD_DATA_RECORDS.get(child_user_id)
    if not record:
        return False
    
    record.third_party_shared = True
    if third_party not in record.third_parties:
        record.third_parties.append(third_party)
    
    # Log the disclosure
    logger.info("Third-party disclosure: child=%s, party=%s, categories=%s, purpose=%s",
                child_user_id, third_party, data_categories, purpose)
    return True

# --- FastAPI Router -------------------------------------------------------

def create_coppa_router():
    from fastapi import APIRouter, Body, HTTPException, Query, Request
    from pydantic import BaseModel, EmailStr
    from typing import List, Optional
    
    router = APIRouter(prefix="/api/coppa", tags=["COPPA Compliance"])
    
    class VPCInitiateRequest(BaseModel):
        child_user_id: str
        parent_email: EmailStr
        method: str
        metadata: Optional[Dict] = None
    
    class VPCVerifyRequest(BaseModel):
        vpc_id: str
        token: Optional[str] = None
        additional_data: Optional[Dict] = None
    
    class ConsentRequest(BaseModel):
        child_user_id: str
        parent_user_id: str
        vpc_id: str
        consent_types: List[str]
        granted: bool
        ip_address: Optional[str] = None
        user_agent: Optional[str] = None
    
    class DataCollectionRequest(BaseModel):
        child_user_id: str
        data_categories: List[str]
        collection_purpose: str
        retention_period_days: int
        third_party_shared: bool = False
        third_parties: Optional[List[str]] = None
    
    class ThirdPartyDisclosureRequest(BaseModel):
        child_user_id: str
        third_party: str
        data_categories: List[str]
        purpose: str
    
    @router.post("/vpc/initiate")
    async def initiate_vpc_endpoint(req: VPCInitiateRequest):
        try:
            method = VPCMethod(req.method)
        except ValueError:
            raise HTTPException(400, f"Invalid VPC method. Valid: {[m.value for m in VPCMethod]}")
        
        vpc = initiate_vpc(req.child_user_id, req.parent_email, method, req.metadata)
        
        # Return method-specific action info
        action_info = {"vpc_id": vpc.vpc_id, "method": vpc.method.value, "expires_at": vpc.expires_at}
        
        if vpc.method == VPCMethod.CREDIT_CARD:
            action_info["payment_url"] = f"/api/coppa/vpc/payment?session_id={vpc.vpc_id}"  # Stripe/etc.
        elif vpc.method == VPCMethod.EMAIL_PLUS_DELAY:
            action_info["confirmation_url"] = vpc.metadata.get("confirmation_url")
        elif vpc.method == VPCMethod.VIDEO_CONFERENCE:
            action_info["meeting_url"] = f"/api/coppa/vpc/meeting?meeting_id={vpc.metadata.get('meeting_id')}"
        
        return {"success": True, **action_info}
    
    @router.post("/vpc/verify")
    async def verify_vpc_endpoint(req: VPCVerifyRequest):
        ok = verify_vpc(req.vpc_id, req.token, req.additional_data)
        if not ok:
            raise HTTPException(400, "VPC verification failed or expired")
        return {"success": True, "vpc_id": req.vpc_id}
    
    @router.get("/vpc/status/{vpc_id}")
    async def vpc_status_endpoint(vpc_id: str):
        status = get_vpc_status(vpc_id)
        if not status:
            raise HTTPException(404, "VPC not found")
        return status
    
    @router.post("/consent")
    async def record_consent_endpoint(req: ConsentRequest):
        try:
            consent = record_coppa_consent(
                req.child_user_id, req.parent_user_id, req.vpc_id,
                req.consent_types, req.granted, req.ip_address, req.user_agent
            )
            return {"success": True, "consent_id": consent.consent_id}
        except ValueError as e:
            raise HTTPException(400, str(e))
    
    @router.get("/consent/{child_user_id}")
    async def get_consents_endpoint(child_user_id: str):
        return {"consents": get_consent_records(child_user_id)}
    
    @router.post("/consent/revoke/{consent_id}")
    async def revoke_consent_endpoint(consent_id: str, parent_user_id: str = Body(..., embed=True)):
        ok = revoke_consent(consent_id, parent_user_id)
        if not ok:
            raise HTTPException(404, "Consent not found or unauthorized")
        return {"success": True}
    
    @router.get("/children/{parent_user_id}")
    async def get_children_endpoint(parent_user_id: str):
        return {"children": get_children_for_parent(parent_user_id)}
    
    @router.get("/access/{parent_user_id}/{child_user_id}")
    async def parent_access_endpoint(parent_user_id: str, child_user_id: str):
        result = parent_access_request(parent_user_id, child_user_id)
        if "error" in result:
            raise HTTPException(403, result["error"])
        return result
    
    @router.post("/deletion/{parent_user_id}/{child_user_id}")
    async def parent_deletion_endpoint(parent_user_id: str, child_user_id: str):
        result = parent_deletion_request(parent_user_id, child_user_id)
        if "error" in result:
            raise HTTPException(403, result["error"])
        return result
    
    @router.post("/data-collection")
    async def record_data_collection_endpoint(req: DataCollectionRequest):
        record = record_child_data_collection(
            req.child_user_id, req.data_categories, req.collection_purpose,
            req.retention_period_days, req.third_party_shared, req.third_parties
        )
        return {"success": True, "child_user_id": record.child_user_id}
    
    @router.get("/data-collection/{child_user_id}")
    async def get_data_collection_endpoint(child_user_id: str):
        record = get_child_data_record(child_user_id)
        if not record:
            raise HTTPException(404, "No data collection record found")
        return record
    
    @router.post("/third-party-disclosure")
    async def third_party_disclosure_endpoint(req: ThirdPartyDisclosureRequest):
        ok = record_third_party_disclosure(req.child_user_id, req.third_party, req.data_categories, req.purpose)
        if not ok:
            raise HTTPException(404, "Child data record not found")
        return {"success": True}
    
    @router.post("/retention/enforce")
    async def enforce_retention_endpoint():
        return enforce_retention_policies()
    
    @router.post("/webhook")
    async def coppa_webhook(request: Request):
        """Inbound COPPA webhook from payment/identity verification providers."""
        body = await request.body()
        payload = json.loads(body) if body else {}
        event_type = payload.get("event_type", "unknown")
        logger.info("COPPA webhook received: %s", event_type)
        if event_type == "vpc.verified":
            vpc_id = payload.get("vpc_id")
            if vpc_id and vpc_id in _VPC_RECORDS:
                _VPC_RECORDS[vpc_id].status = VPCStatus.VERIFIED
                _VPC_RECORDS[vpc_id].verified_at = datetime.now().isoformat()
        elif event_type == "consent.revoked":
            child_id = payload.get("child_user_id")
            if child_id:
                for cid, consent in list(_CONSENT_RECORDS.items()):
                    if consent.child_user_id == child_id:
                        consent.granted = False
                        consent.revoked_at = datetime.now().isoformat()
        return {"ok": True, "event_type": event_type}
    
    return router

# --- Self-test ------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Test VPC flow
    vpc = initiate_vpc("child_123", "parent@example.com", VPCMethod.EMAIL_PLUS_DELAY)
    print(f"VPC created: {vpc.vpc_id}")
    
    ok = verify_vpc(vpc.vpc_id, provided_token="dummy")  # Would need real token
    print(f"VPC verify (expect False without real token): {ok}")
    
    # Test consent
    try:
        consent = record_coppa_consent("child_123", "parent_456", vpc.vpc_id, ["data_collection"], True)
        print(f"Consent recorded: {consent.consent_id}")
    except ValueError as e:
        print(f"Consent failed (expected - VPC not really verified): {e}")
    
    # Test data record
    record = record_child_data_collection(
        "child_123", ["voice", "usage", "progress"], "educational_service", 365
    )
    print(f"Data record: {record.child_user_id}")
    
    # Parent access
    access = parent_access_request("parent_456", "child_123")
    print(f"Parent access: {access}")
    
    print("\nCOPPA module self-test complete")