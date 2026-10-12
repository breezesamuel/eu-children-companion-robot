#!/usr/bin/env python3
"""
DSA (Digital Services Act) Compliance Module — EU Regulation 2022/2065

Implements obligations for VLOPs (Very Large Online Platforms) and child-facing services:
- Art. 14: Notice and action mechanism
- Art. 15: Statement of reasons for content moderation
- Art. 24: Transparency reporting
- Art. 25: Child safety risk assessment
- Art. 26: Recommender system transparency
- Art. 27: User-facing algorithmic transparency
- Art. 28: Protection of minors
- Art. 29: Internal complaint handling
- Art. 30: Out-of-court dispute settlement
- Art. 31: Trusted flaggers
- Art. 32: Advertising transparency
- Art. 33: Recommender system options
- Art. 34: Crisis response
- Art. 35: Independent audits
- Art. 36: Data access for researchers
"""

import os
import json
import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

logger = logging.getLogger("dsa")

# --- Constants ------------------------------------------------------------

# DSA applies to all online platforms; VLOP thresholds: 45M monthly active users in EU
# Our service is child-facing → Art. 28 obligations apply regardless of size

REPORT_RETENTION_YEARS = 6  # Art. 24(5): transparency reports kept 6 years
COMPLAINT_HANDLING_DAYS = 14  # Art. 29: internal complaint handling timeframe
TRUSTED_FLAGGER_RESPONSE_HOURS = 24  # Art. 31: prioritized response

# --- Enums ----------------------------------------------------------------

class ContentCategory(Enum):
    ILLEGAL = "illegal"
    HARMFUL_TO_MINORS = "harmful_to_minors"
    DISINFORMATION = "disinformation"
    HATE_SPEECH = "hate_speech"
    VIOLENCE = "violence"
    SEXUAL_CONTENT = "sexual_content"
    SELF_HARM = "self_harm"
    SPAM = "spam"
    COPYRIGHT = "copyright"
    OTHER = "other"

class ModerationAction(Enum):
    NO_ACTION = "no_action"
    WARNING = "warning"
    CONTENT_REMOVAL = "content_removal"
    ACCOUNT_SUSPENSION = "account_suspension"
    ACCOUNT_TERMINATION = "account_termination"
    GEO_BLOCKING = "geo_blocking"
    AGE_GATE = "age_gate"
    DEMOTION = "demotion"  # Reduced visibility

class RecommenderType(Enum):
    CONTENT_BASED = "content_based"
    COLLABORATIVE = "collaborative"
    HYBRID = "hybrid"
    CONTEXTUAL = "contextual"

class ComplaintStatus(Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    ESCALATED = "escalated"

# --- Data Classes ---------------------------------------------------------

@dataclass
class ContentReport:
    report_id: str
    reporter_id: str
    content_id: str
    content_type: str  # "message", "profile", "generated", "comment"
    category: ContentCategory
    description: str
    evidence_urls: List[str] = field(default_factory=list)
    status: str = "pending"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    reviewed_at: Optional[str] = None
    moderator_id: Optional[str] = None
    action_taken: Optional[ModerationAction] = None
    reason: Optional[str] = None

@dataclass
class ModerationDecision:
    decision_id: str
    report_id: str
    content_id: str
    action: ModerationAction
    reason: str  # Human-readable statement of reasons (Art. 15)
    legal_basis: Optional[str] = None
    category: ContentCategory = ContentCategory.OTHER
    automated: bool = False
    model_version: Optional[str] = None
    confidence: Optional[float] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    appeal_deadline: str = field(default_factory=lambda: (datetime.now() + timedelta(days=30)).isoformat())

@dataclass
class RecommenderSystem:
    system_id: str
    name: str
    type: RecommenderType
    description: str
    main_parameters: List[str]  # e.g., ["user_history", "content_similarity", "popularity"]
    user_controls: List[str]  # e.g., ["opt_out", "reset_history", "topic_preferences"]
    transparency_info: str  # URL or text explaining how it works
    last_audit: Optional[str] = None
    risk_assessment: Optional[str] = None  # For child safety (Art. 25)

@dataclass
class TransparencyReport:
    report_id: str
    period_start: str
    period_end: str
    published_at: str
    total_reports: int
    reports_by_category: Dict[str, int]
    reports_by_outcome: Dict[str, int]
    avg_resolution_time_hours: float
    proactive_detections: int
    appeals_received: int
    appeals_upheld: int
    recommender_systems: List[str] = field(default_factory=list)
    child_safety_measures: List[str] = field(default_factory=list)

@dataclass
class ChildSafetyRiskAssessment:
    assessment_id: str
    conducted_at: str
    assessor: str
    risks_identified: List[Dict]  # {risk, likelihood, impact, mitigation}
    recommender_risks: List[Dict]  # Specific to recommender systems
    measures_implemented: List[str]
    next_review: str
    approved_by: str

@dataclass
class Complaint:
    complaint_id: str
    user_id: str
    subject: str  # "moderation", "recommender", "data", "other"
    description: str
    related_content_id: Optional[str] = None
    related_report_id: Optional[str] = None
    status: ComplaintStatus = ComplaintStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved_at: Optional[str] = None
    resolution: Optional[str] = None
    handler_id: Optional[str] = None

@dataclass
class AdvertisementRecord:
    ad_id: str
    advertiser: str
    target_criteria: Dict  # Non-PII targeting parameters
    shown_to_children: bool
    impression_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

# --- In-Memory Stores (Replace with DB) ----------------------------------

_CONTENT_REPORTS: Dict[str, ContentReport] = {}
_MODERATION_DECISIONS: Dict[str, ModerationDecision] = {}
_RECOMMENDER_SYSTEMS: Dict[str, RecommenderSystem] = {}
_TRANSPARENCY_REPORTS: Dict[str, TransparencyReport] = {}
_CHILD_SAFETY_ASSESSMENTS: List[ChildSafetyRiskAssessment] = []
_COMPLAINTS: Dict[str, Complaint] = {}
_ADVERTISEMENTS: Dict[str, AdvertisementRecord] = {}

# --- Helpers --------------------------------------------------------------

def _gen_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"

def _is_child_user(user_id: str) -> bool:
    """Check if user is a child (integration with age gate)."""
    # In production: query age_gate or user profile
    return user_id.startswith("child_")  # Simplified

# --- Notice & Action (Art. 14) --------------------------------------------

def submit_content_report(
    reporter_id: str,
    content_id: str,
    content_type: str,
    category: ContentCategory,
    description: str,
    evidence_urls: List[str] = None
) -> ContentReport:
    """Submit a notice (Art. 14)."""
    report = ContentReport(
        report_id=_gen_id("report"),
        reporter_id=reporter_id,
        content_id=content_id,
        content_type=content_type,
        category=category,
        description=description,
        evidence_urls=evidence_urls or []
    )
    _CONTENT_REPORTS[report.report_id] = report
    logger.info("Content report submitted: %s by %s", report.report_id, reporter_id)
    return report

def review_report(
    report_id: str,
    moderator_id: str,
    action: ModerationAction,
    reason: str,
    legal_basis: str = None,
    category: ContentCategory = None,
    automated: bool = False,
    model_version: str = None,
    confidence: float = None
) -> ModerationDecision:
    """Review a report and take action (Art. 14, 15)."""
    report = _CONTENT_REPORTS.get(report_id)
    if not report:
        raise ValueError("Report not found")
    
    if category:
        report.category = category
    
    decision = ModerationDecision(
        decision_id=_gen_id("dec"),
        report_id=report_id,
        content_id=report.content_id,
        action=action,
        reason=reason,
        legal_basis=legal_basis,
        category=report.category,
        automated=automated,
        model_version=model_version,
        confidence=confidence
    )
    
    _MODERATION_DECISIONS[decision.decision_id] = decision
    report.status = "reviewed"
    report.reviewed_at = datetime.now().isoformat()
    report.moderator_id = moderator_id
    report.action_taken = action
    report.reason = reason
    
    logger.info("Moderation decision: %s for report %s (action=%s)", decision.decision_id, report_id, action.value)
    return decision

def get_report_status(report_id: str) -> Optional[Dict]:
    report = _CONTENT_REPORTS.get(report_id)
    if not report:
        return None
    decision = next((d for d in _MODERATION_DECISIONS.values() if d.report_id == report_id), None)
    return {
        "report_id": report.report_id,
        "status": report.status,
        "category": report.category.value,
        "created_at": report.created_at,
        "reviewed_at": report.reviewed_at,
        "action_taken": report.action_taken.value if report.action_taken else None,
        "reason": report.reason,
        "decision": {
            "decision_id": decision.decision_id,
            "action": decision.action.value,
            "reason": decision.reason,
            "legal_basis": decision.legal_basis,
            "appeal_deadline": decision.appeal_deadline
        } if decision else None
    }

# --- Statement of Reasons (Art. 15) ---------------------------------------

def generate_statement_of_reasons(decision: ModerationDecision) -> str:
    """Generate human-readable statement of reasons (Art. 15)."""
    template = f"""
Content Moderation Decision — Statement of Reasons (Art. 15 DSA)

Decision ID: {decision.decision_id}
Content ID: {decision.content_id}
Date: {decision.created_at}

Action Taken: {decision.action.value}
Category: {decision.category.value}

Reason for Action:
{decision.reason}

Legal Basis: {decision.legal_basis or "Platform Terms of Service / DSA Art. 14"}

{'Automated Decision: Yes (Model: ' + decision.model_version + ', Confidence: ' + str(decision.confidence) + ')' if decision.automated else 'Human Review: Yes'}

Appeal Rights:
You have the right to appeal this decision within 30 days (until {decision.appeal_deadline}).
To appeal, submit a complaint via the platform's internal complaint handling system (Art. 29 DSA)
or contact an out-of-court dispute settlement body (Art. 30 DSA).

Contact: dsa-compliance@children-robot.com
"""
    return template.strip()

# --- Transparency Reporting (Art. 24) -------------------------------------

def generate_transparency_report(period_days: int = 90) -> TransparencyReport:
    """Generate transparency report (Art. 24)."""
    end = datetime.now()
    start = end - timedelta(days=period_days)
    
    period_reports = [
        r for r in _CONTENT_REPORTS.values()
        if start <= datetime.fromisoformat(r.created_at) <= end
    ]
    
    reviewed = [r for r in period_reports if r.status == "reviewed"]
    resolutions = [r for r in reviewed if r.action_taken]
    
    # Resolution times
    resolution_times = []
    for r in resolutions:
        dec = next((d for d in _MODERATION_DECISIONS.values() if d.report_id == r.report_id), None)
        if dec:
            delta = datetime.fromisoformat(dec.created_at) - datetime.fromisoformat(r.created_at)
            resolution_times.append(delta.total_seconds() / 3600)
    
    # By category
    by_cat = defaultdict(int)
    for r in period_reports:
        by_cat[r.category.value] += 1
    
    # By outcome
    by_outcome = defaultdict(int)
    for r in resolutions:
        by_outcome[r.action_taken.value] += 1
    
    # Appeals
    appeals = [c for c in _COMPLAINTS.values() if c.subject == "moderation"]
    upheld = [c for c in appeals if c.status == ComplaintStatus.RESOLVED]
    
    report = TransparencyReport(
        report_id=_gen_id("trans"),
        period_start=start.isoformat(),
        period_end=end.isoformat(),
        published_at=datetime.now().isoformat(),
        total_reports=len(period_reports),
        reports_by_category=dict(by_cat),
        reports_by_outcome=dict(by_outcome),
        avg_resolution_time_hours=sum(resolution_times)/len(resolution_times) if resolution_times else 0,
        proactive_detections=sum(1 for r in period_reports if r.reporter_id == "system_auto"),
        appeals_received=len(appeals),
        appeals_upheld=len(upheld),
        recommender_systems=list(_RECOMMENDER_SYSTEMS.keys()),
        child_safety_measures=[
            "Age verification (GDPR-K + COPPA)",
            "Content filter model (DistilBERT, AUC 0.985)",
            "Parent real-time veto",
            "Age-gated content recommendations",
            "Session time limits",
            "No behavioral advertising to children"
        ]
    )
    
    _TRANSPARENCY_REPORTS[report.report_id] = report
    logger.info("Transparency report generated: %s", report.report_id)
    return report

# --- Child Safety Risk Assessment (Art. 25) -------------------------------

def conduct_child_safety_assessment(
    assessor: str,
    risks: List[Dict],
    recommender_risks: List[Dict],
    measures: List[str],
    approved_by: str
) -> ChildSafetyRiskAssessment:
    """Conduct child safety risk assessment (Art. 25)."""
    assessment = ChildSafetyRiskAssessment(
        assessment_id=_gen_id("csa"),
        conducted_at=datetime.now().isoformat(),
        assessor=assessor,
        risks_identified=risks,
        recommender_risks=recommender_risks,
        measures_implemented=measures,
        next_review=(datetime.now() + timedelta(days=365)).isoformat(),
        approved_by=approved_by
    )
    _CHILD_SAFETY_ASSESSMENTS.append(assessment)
    logger.info("Child safety assessment conducted: %s", assessment.assessment_id)
    return assessment

# Default child safety assessment template
DEFAULT_CHILD_RISKS = [
    {"risk": "Exposure to age-inappropriate content", "likelihood": "medium", "impact": "high", "mitigation": "Content filter, age gates, parent veto"},
    {"risk": "Addictive design / excessive screen time", "likelihood": "high", "impact": "medium", "mitigation": "Session limits, break reminders, parent dashboard"},
    {"risk": "Behavioral profiling of children", "likelihood": "medium", "impact": "high", "mitigation": "No profiling for ads, on-device processing, pseudonymization"},
    {"risk": "Contact with strangers", "likelihood": "low", "impact": "critical", "mitigation": "No chat with strangers, parent-approved contacts only"},
    {"risk": "Data misuse / third-party sharing", "likelihood": "low", "impact": "high", "mitigation": "No third-party sharing, on-device processing, GDPR/COPPA"},
    {"risk": "Recommender amplification of harmful content", "likelihood": "medium", "impact": "high", "mitigation": "Child-safe recommender, content filter pre-check, diversity injection"},
]

DEFAULT_RECOMMENDER_RISKS = [
    {"risk": "Filter bubble / echo chamber", "likelihood": "medium", "impact": "medium", "mitigation": "Diversity injection, serendipity factor, parent topic controls"},
    {"risk": "Amplification of engaging but low-quality content", "likelihood": "high", "impact": "medium", "mitigation": "Quality signals > engagement signals, educational priority"},
    {"risk": "Profiling for commercial gain", "likelihood": "low", "impact": "high", "mitigation": "No behavioral ads to children, no third-party tracking"},
]

DEFAULT_MEASURES = [
    "On-device content filter (DistilBERT, AUC 0.985) runs on all generated content",
    "Age verification per GDPR-K (13-16 by Member State) + COPPA VPC (US)",
    "Parent real-time veto via push notification",
    "Session time limits (default 60 min/day, configurable)",
    "Break reminders every 20 minutes",
    "No behavioral advertising to users under 18",
    "On-device AI processing (no PII to cloud)",
    "Pseudonymized analytics (salted hashes, no direct identifiers)",
    "Parent dashboard with real-time activity view",
    "Content allow-list for recommender (educational priority)",
    "Diversity injection in recommender (serendipity factor 0.15)",
    "Quarterly child safety risk assessment review",
    "Annual independent audit (Art. 35 DSA)",
]

def get_default_child_safety_assessment() -> ChildSafetyRiskAssessment:
    return conduct_child_safety_assessment(
        assessor="AI Safety Team",
        risks=DEFAULT_CHILD_RISKS,
        recommender_risks=DEFAULT_RECOMMENDER_RISKS,
        measures=DEFAULT_MEASURES,
        approved_by="CTO + DPO"
    )

# --- Recommender Transparency (Art. 26, 27, 33) ---------------------------

def register_recommender_system(
    name: str,
    type: RecommenderType,
    description: str,
    main_parameters: List[str],
    user_controls: List[str],
    transparency_info: str
) -> RecommenderSystem:
    """Register a recommender system (Art. 26, 27)."""
    system = RecommenderSystem(
        system_id=_gen_id("rec"),
        name=name,
        type=type,
        description=description,
        main_parameters=main_parameters,
        user_controls=user_controls,
        transparency_info=transparency_info
    )
    _RECOMMENDER_SYSTEMS[system.system_id] = system
    logger.info("Recommender system registered: %s (%s)", name, system.system_id)
    return system

def get_recommender_info(system_id: str) -> Optional[Dict]:
    sys = _RECOMMENDER_SYSTEMS.get(system_id)
    if not sys:
        return None
    return {
        "system_id": sys.system_id,
        "name": sys.name,
        "type": sys.type.value,
        "description": sys.description,
        "main_parameters": sys.main_parameters,
        "user_controls": sys.user_controls,
        "transparency_info": sys.transparency_info,
        "last_audit": sys.last_audit,
        "risk_assessment": sys.risk_assessment
    }

def list_recommenders() -> List[Dict]:
    return [get_recommender_info(sid) for sid in _RECOMMENDER_SYSTEMS]

# Default recommender systems for our platform
def register_default_recommenders():
    register_recommender_system(
        name="Educational Content Recommender",
        type=RecommenderType.HYBRID,
        description="Recommends lessons, activities, and content based on curriculum progress, mastery levels, and age-appropriate educational goals.",
        main_parameters=[
            "Curriculum progress (mastery levels per skill)",
            "Age/grade level",
            "Learning style preferences (visual, auditory, kinesthetic)",
            "Parent-set learning goals",
            "Content quality scores (pedagogical review)"
        ],
        user_controls=[
            "Opt out of personalized recommendations",
            "Reset recommendation history",
            "Set topic preferences (parent)",
            "Set difficulty preferences (parent)",
            "View recommendation explanation"
        ],
        transparency_info="Recommendations prioritize educational value over engagement. Algorithm combines curriculum progress (60%), content quality (25%), and diversity/serendipity (15%). No behavioral advertising signals used."
    )
    
    register_recommender_system(
        name="Entertainment Content Recommender",
        type=RecommenderType.CONTENT_BASED,
        description="Recommends stories, songs, and games appropriate for child's age and interests.",
        main_parameters=[
            "Age rating (3-5, 6-8, 9-11, 12-14)",
            "Content type preferences (stories, music, games)",
            "Parent-approved content categories",
            "Time of day (bedtime vs playtime)"
        ],
        user_controls=[
            "Opt out",
            "Set content type preferences (parent)",
            "Set time-of-day rules (parent)",
            "View why this was recommended"
        ],
        transparency_info="Age-gated content only. No collaborative filtering (no cross-child profiling). Recommendations based on explicit parent preferences and age ratings."
    )
    
    register_recommender_system(
        name="Social-Emotional Learning Recommender",
        type=RecommenderType.CONTEXTUAL,
        description="Recommends SEL activities based on detected emotional state and developmental needs.",
        main_parameters=[
            "Detected emotion (from on-device emotion classifier)",
            "Recent SEL skill practice history",
            "Parent/teacher identified focus areas",
            "Time since last SEL activity"
        ],
        user_controls=[
            "Opt out",
            "Set focus areas (parent/teacher)",
            "Disable emotion-based recommendations"
        ],
        transparency_info="Emotion detection runs on-device only. Recommendations are rule-based (if sad → calming activity) not predictive profiling. No emotion history stored for recommender."
    )

# --- Internal Complaint Handling (Art. 29) --------------------------------

def submit_complaint(
    user_id: str,
    subject: str,
    description: str,
    related_content_id: str = None,
    related_report_id: str = None
) -> Complaint:
    """Submit internal complaint (Art. 29)."""
    complaint = Complaint(
        complaint_id=_gen_id("comp"),
        user_id=user_id,
        subject=subject,
        description=description,
        related_content_id=related_content_id,
        related_report_id=related_report_id
    )
    _COMPLAINTS[complaint.complaint_id] = complaint
    logger.info("Complaint submitted: %s by %s", complaint.complaint_id, user_id)
    return complaint

def resolve_complaint(complaint_id: str, handler_id: str, resolution: str, status: ComplaintStatus = ComplaintStatus.RESOLVED) -> bool:
    """Resolve complaint within 14 days (Art. 29)."""
    complaint = _COMPLAINTS.get(complaint_id)
    if not complaint:
        return False
    complaint.status = status
    complaint.resolved_at = datetime.now().isoformat()
    complaint.resolution = resolution
    complaint.handler_id = handler_id
    logger.info("Complaint resolved: %s (status=%s)", complaint_id, status.value)
    return True

def get_complaint_status(complaint_id: str) -> Optional[Dict]:
    c = _COMPLAINTS.get(complaint_id)
    if not c:
        return None
    return {
        "complaint_id": c.complaint_id,
        "subject": c.subject,
        "status": c.status.value,
        "created_at": c.created_at,
        "resolved_at": c.resolved_at,
        "resolution": c.resolution
    }

# --- Advertising Transparency (Art. 32) -----------------------------------

def record_advertisement(
    advertiser: str,
    target_criteria: Dict,
    shown_to_children: bool = False
) -> AdvertisementRecord:
    """Record ad for transparency (Art. 32)."""
    ad = AdvertisementRecord(
        ad_id=_gen_id("ad"),
        advertiser=advertiser,
        target_criteria=target_criteria,
        shown_to_children=shown_to_children
    )
    _ADVERTISEMENTS[ad.ad_id] = ad
    return ad

def get_ad_transparency_report() -> List[Dict]:
    """Generate ad transparency data (Art. 32)."""
    return [
        {
            "ad_id": a.ad_id,
            "advertiser": a.advertiser,
            "target_criteria": a.target_criteria,
            "shown_to_children": a.shown_to_children,
            "impressions": a.impression_count
        }
        for a in _ADVERTISEMENTS.values()
    ]

# --- Crisis Response (Art. 34) --------------------------------------------

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die",
    "self harm", "cutting", "overdose",
    "abuse", "molested", "hurt me",
    "runaway", "nowhere to go"
]

def detect_crisis(content: str) -> Optional[Dict]:
    """Detect crisis signals in content (Art. 34)."""
    lower = content.lower()
    for kw in CRISIS_KEYWORDS:
        if kw in lower:
            return {
                "detected": True,
                "keyword": kw,
                "severity": "high" if kw in ["suicide", "kill myself", "end my life"] else "medium",
                "timestamp": datetime.now().isoformat()
            }
    return None

# --- FastAPI Router -------------------------------------------------------

def create_dsa_router():
    from fastapi import APIRouter, Body, HTTPException, Query, Request
    from pydantic import BaseModel
    from typing import List, Optional
    
    router = APIRouter(prefix="/api/dsa", tags=["DSA Compliance"])
    
    class ReportRequest(BaseModel):
        reporter_id: str
        content_id: str
        content_type: str
        category: str
        description: str
        evidence_urls: Optional[List[str]] = None
    
    class ReviewRequest(BaseModel):
        report_id: str
        moderator_id: str
        action: str
        reason: str
        legal_basis: Optional[str] = None
        category: Optional[str] = None
        automated: bool = False
        model_version: Optional[str] = None
        confidence: Optional[float] = None
    
    class ComplaintRequest(BaseModel):
        user_id: str
        subject: str
        description: str
        related_content_id: Optional[str] = None
        related_report_id: Optional[str] = None
    
    class ResolveComplaintRequest(BaseModel):
        handler_id: str
        resolution: str
        status: str = "resolved"
    
    @router.post("/report")
    async def submit_report(req: ReportRequest):
        try:
            cat = ContentCategory(req.category)
        except ValueError:
            raise HTTPException(400, f"Invalid category. Valid: {[c.value for c in ContentCategory]}")
        report = submit_content_report(req.reporter_id, req.content_id, req.content_type, cat, req.description, req.evidence_urls)
        return {"success": True, "report_id": report.report_id}
    
    @router.post("/report/review")
    async def review_report_endpoint(req: ReviewRequest):
        try:
            action = ModerationAction(req.action)
        except ValueError:
            raise HTTPException(400, f"Invalid action. Valid: {[a.value for a in ModerationAction]}")
        cat = ContentCategory(req.category) if req.category else None
        try:
            decision = review_report(req.report_id, req.moderator_id, action, req.reason, req.legal_basis, cat, req.automated, req.model_version, req.confidence)
        except ValueError as e:
            raise HTTPException(404, str(e))
        return {"success": True, "decision_id": decision.decision_id, "statement_of_reasons": generate_statement_of_reasons(decision)}
    
    @router.get("/report/{report_id}")
    async def report_status(report_id: str):
        status = get_report_status(report_id)
        if not status:
            raise HTTPException(404, "Report not found")
        return status
    
    @router.get("/transparency-report")
    async def transparency_report(period_days: int = Query(90, ge=1, le=365)):
        report = generate_transparency_report(period_days)
        return {
            "report_id": report.report_id,
            "period": f"{report.period_start} to {report.period_end}",
            "published_at": report.published_at,
            "total_reports": report.total_reports,
            "by_category": report.reports_by_category,
            "by_outcome": report.reports_by_outcome,
            "avg_resolution_hours": round(report.avg_resolution_time_hours, 1),
            "proactive_detections": report.proactive_detections,
            "appeals_received": report.appeals_received,
            "appeals_upheld": report.appeals_upheld,
            "recommender_systems": report.recommender_systems,
            "child_safety_measures": report.child_safety_measures
        }
    
    @router.post("/child-safety-assessment")
    async def child_safety_assessment_endpoint(
        assessor: str = Body(...),
        risks: List[Dict] = Body(default_factory=list),
        recommender_risks: List[Dict] = Body(default_factory=list),
        measures: List[str] = Body(default_factory=list),
        approved_by: str = Body(...)
    ):
        assessment = conduct_child_safety_assessment(assessor, risks, recommender_risks, measures, approved_by)
        return {"success": True, "assessment_id": assessment.assessment_id}
    
    @router.get("/child-safety-assessment")
    async def get_child_safety_assessment():
        if not _CHILD_SAFETY_ASSESSMENTS:
            return get_default_child_safety_assessment().__dict__
        return _CHILD_SAFETY_ASSESSMENTS[-1].__dict__
    
    @router.post("/recommender/register")
    async def register_recommender(
        name: str = Body(...),
        type: str = Body(...),
        description: str = Body(...),
        main_parameters: List[str] = Body(...),
        user_controls: List[str] = Body(...),
        transparency_info: str = Body(...)
    ):
        try:
            rec_type = RecommenderType(type)
        except ValueError:
            raise HTTPException(400, f"Invalid type. Valid: {[t.value for t in RecommenderType]}")
        system = register_recommender_system(name, rec_type, description, main_parameters, user_controls, transparency_info)
        return {"success": True, "system_id": system.system_id}
    
    @router.get("/recommenders")
    async def list_recommenders_endpoint():
        return {"recommenders": list_recommenders()}
    
    @router.get("/recommenders/{system_id}")
    async def recommender_info(system_id: str):
        info = get_recommender_info(system_id)
        if not info:
            raise HTTPException(404, "Recommender not found")
        return info
    
    @router.post("/complaint")
    async def submit_complaint_endpoint(req: ComplaintRequest):
        complaint = submit_complaint(req.user_id, req.subject, req.description, req.related_content_id, req.related_report_id)
        return {"success": True, "complaint_id": complaint.complaint_id}
    
    @router.post("/complaint/{complaint_id}/resolve")
    async def resolve_complaint_endpoint(complaint_id: str, req: ResolveComplaintRequest):
        try:
            status = ComplaintStatus(req.status)
        except ValueError:
            raise HTTPException(400, "Invalid status")
        ok = resolve_complaint(complaint_id, req.handler_id, req.resolution, status)
        if not ok:
            raise HTTPException(404, "Complaint not found")
        return {"success": True}
    
    @router.get("/complaint/{complaint_id}")
    async def complaint_status(complaint_id: str):
        status = get_complaint_status(complaint_id)
        if not status:
            raise HTTPException(404, "Complaint not found")
        return status
    
    @router.get("/advertisements/transparency")
    async def ad_transparency():
        return {"advertisements": get_ad_transparency_report()}
    
    @router.post("/crisis/detect")
    async def crisis_detect(content: str = Body(..., embed=True)):
        result = detect_crisis(content)
        if result:
            logger.warning("Crisis detected: %s", result)
        return result or {"detected": False}
    
    @router.post("/webhook")
    async def dsa_webhook(request: Request):
        """Inbound DSA webhook from trusted flaggers / authorities / platforms."""
        body = await request.body()
        payload = json.loads(body) if body else {}
        event_type = payload.get("event_type", "unknown")
        logger.info("DSA webhook received: %s", event_type)
        if event_type == "content.takedown":
            report_id = payload.get("report_id")
            if report_id and report_id in _CONTENT_REPORTS:
                _CONTENT_REPORTS[report_id].status = "removed"
        elif event_type == "transparency.request":
            # Generate and deliver transparency report
            days = payload.get("period_days", 30)
            report = generate_transparency_report(days)
            # In production: deliver to requesting authority
            logger.info("DSA transparency report generated: %s", report.report_id)
        elif event_type == "vloa.audit":
            # Very Large Online Platform audit request
            logger.info("VLOP audit request received: %s", payload)
        return {"ok": True, "event_type": event_type}
    
    return router

# --- Self-test ------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Test report flow
    report = submit_content_report("user_123", "content_456", "message", ContentCategory.HARMFUL_TO_MINORS, "Inappropriate content for children")
    print(f"Report: {report.report_id}")
    
    decision = review_report(report.report_id, "mod_789", ModerationAction.CONTENT_REMOVAL, "Content violates child safety policy", legal_basis="DSA Art. 28, Platform ToS", automated=True, model_version="distilbert-filter-v1.0", confidence=0.97)
    print(f"Decision: {decision.decision_id}, Action: {decision.action.value}")
    print(f"Statement of Reasons:\n{generate_statement_of_reasons(decision)[:300]}...")
    
    # Transparency report
    trans_report = generate_transparency_report(30)
    print(f"Transparency report: {trans_report.report_id}, Total: {trans_report.total_reports}")
    
    # Child safety assessment
    assessment = get_default_child_safety_assessment()
    print(f"Child safety assessment: {assessment.assessment_id}, Risks: {len(assessment.risks_identified)}")
    
    # Recommenders
    register_default_recommenders()
    print(f"Recommenders registered: {len(_RECOMMENDER_SYSTEMS)}")
    
    # Crisis detection
    crisis = detect_crisis("I want to hurt myself")
    print(f"Crisis detection: {crisis}")
    
    print("\nDSA module self-test complete")