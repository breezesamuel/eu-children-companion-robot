#!/usr/bin/env python3
"""
Support Desk -- 客服工单闭环 (closes the aftersales corner beyond RMA)

A genuine closed loop:
  ticket -> auto-triage -> KB deflection / agent -> first response -> resolve
  -> CSAT survey -> self-learning (task="support") -> macro / KB improvement

Signals produced:
  * `support.ticket.created` / `support.ticket.resolved` /
    `support.csat.recorded` events into the data_loop
  * CSAT (low scores) -> self_learning (task="support") so the
    `support.resolution_rate` baseline reflects real customer satisfaction
  * SLA compliance reporting (first response + resolution) with overdue alerts
  * a small deterministic knowledge base for self-service deflection

Offline-testable, no external service required; every network call is deferred
to the caller. Privacy-preserving: household pseudonym only.
"""

import logging
import threading
import uuid
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger("support")

# ── taxonomy ────────────────────────────────────────────────────────────────
CATEGORIES = ["billing", "device", "content", "account", "privacy", "shipping", "other"]
PRIORITIES = ["low", "normal", "high", "urgent"]
STATUSES = ["new", "open", "pending_customer", "resolved", "closed"]

# first-response / resolution SLA targets (hours) per priority
SLA_HOURS = {
    "urgent": {"first_response": 1, "resolve": 8},
    "high":   {"first_response": 4, "resolve": 24},
    "normal": {"first_response": 12, "resolve": 72},
    "low":    {"first_response": 24, "resolve": 120},
}

# keyword -> (category, priority) for deterministic auto-triage
TRIAGE_RULES = [
    (["charge", "charged", "refund", "invoice", "payment", "billing", "double"], "billing", "high"),
    (["broken", "crash", "won't turn on", "not working", "no sound", "battery", "screen"], "device", "urgent"),
    (["lesson", "content", "wrong level", "too hard", "too easy", "language"], "content", "normal"),
    (["login", "password", "account", "profile", "email change"], "account", "normal"),
    (["gdpr", "delete my data", "privacy", "consent", "export my data"], "privacy", "high"),
    (["shipping", "delivery", "parcel", "not arrived", "tracking", "package"], "shipping", "high"),
]

# deterministic knowledge base: (matcher keywords) -> canned resolution
KNOWLEDGE_BASE = [
    (["pair", "pairing", "bluetooth", "connect"],
     "To pair the robot: hold the power button 5s until the light blinks blue, "
     "then in the app tap Devices > Add > select the robot's name. "
     "If it fails, restart the app and try again."),
    (["reset", "factory", "restore"],
     "To factory-reset: Settings > Device > Reset. This signs the device out "
     "but keeps your subscription and progress."),
    (["refund", "cancel", "money back"],
     "You can cancel or pause anytime under Account > Subscription. Refunds for "
     "the current period are issued within 5 business days; EU 14-day cooling-off applies."),
    (["gdpr", "export", "download my data", "delete my data"],
     "Under GDPR you can export or delete your data in Account > Privacy. "
     "Exports arrive by email within 72h; deletion is completed within 30 days."),
    (["delivery", "shipping", "parcel", "tracking"],
     "EU deliveries ship within 2-5 business days. Track your parcel from the "
     "order confirmation email or Orders > Track."),
    (["language", "deutsch", "french", "english"],
     "The robot speaks EN/DE/FR/NL/ES/IT. Change it in Settings > Language; "
     "content adapts to the child's age band automatically."),
]


# ── models ──────────────────────────────────────────────────────────────────
@dataclass
class Ticket:
    ticket_id: str
    household_id: str
    subject: str
    body: str = ""
    category: str = "other"
    priority: str = "normal"
    status: str = "new"
    channel: str = "in_app"           # in_app | email | phone | chat
    assignee: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    first_response_at: Optional[str] = None
    resolved_at: Optional[str] = None
    closed_at: Optional[str] = None
    sla_first_response_due: Optional[str] = None
    sla_resolve_due: Optional[str] = None
    csat_score: Optional[int] = None        # 1..5
    csat_comment: str = ""
    escalation_level: int = 0
    tags: List[str] = field(default_factory=list)
    linked_order_id: Optional[str] = None
    linked_device_id: Optional[str] = None
    resolution: str = ""
    auto_deflected: bool = False

    def _sla(self, key: str) -> Dict[str, Any]:
        due = {
            "first_response": self.sla_first_response_due,
            "resolve": self.sla_resolve_due,
        }[key]
        actual_field = {
            "first_response": self.first_response_at,
            "resolve": self.resolved_at,
        }[key]
        if not due:
            return {"met": None, "due": None, "actual": actual_field}
        due_dt = datetime.fromisoformat(due)
        actual = datetime.fromisoformat(actual_field) if actual_field else None
        if actual is None:
            overdue = datetime.now() > due_dt
            return {"met": None, "due": due, "overdue": overdue,
                    "remaining_hours": round((due_dt - datetime.now()).total_seconds() / 3600, 1)}
        return {"met": actual <= due_dt, "due": due, "actual": actual_field,
                "delta_hours": round((actual - due_dt).total_seconds() / 3600, 1)}

    def sla_status(self) -> Dict[str, Any]:
        return {"first_response": self._sla("first_response"),
                "resolve": self._sla("resolve")}

    def age_hours(self) -> float:
        return round((datetime.now() - datetime.fromisoformat(self.created_at)).total_seconds() / 3600, 1)

    def first_response_hours(self) -> Optional[float]:
        if not self.first_response_at:
            return None
        return round((datetime.fromisoformat(self.first_response_at)
                      - datetime.fromisoformat(self.created_at)).total_seconds() / 3600, 2)

    def resolution_hours(self) -> Optional[float]:
        if not self.resolved_at:
            return None
        return round((datetime.fromisoformat(self.resolved_at)
                      - datetime.fromisoformat(self.created_at)).total_seconds() / 3600, 2)


# ── engine ──────────────────────────────────────────────────────────────────
class SupportEngine:
    def __init__(self, data_loop=None, self_learning=None):
        self._lock = threading.RLock()
        self.tickets: Dict[str, Ticket] = {}
        self.messages: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.macros_used: Dict[str, int] = defaultdict(int)
        self.data_loop = data_loop
        self.self_learning = self_learning

    # -- triage & deflection --
    def auto_triage(self, subject: str, body: str) -> Dict[str, str]:
        text = f"{subject} {body}".lower()
        category, priority = "other", "normal"
        best = 0
        for kws, cat, prio in TRIAGE_RULES:
            hits = sum(1 for k in kws if k in text)
            if hits > best:
                best, category, priority = hits, cat, prio
        return {"category": category, "priority": priority}

    def kb_search(self, query: str) -> List[Dict[str, Any]]:
        text = (query or "").lower()
        hits = []
        for kws, answer in KNOWLEDGE_BASE:
            score = sum(1 for k in kws if k in text)
            if score:
                hits.append({"score": score, "answer": answer})
        hits.sort(key=lambda h: -h["score"])
        return hits

    def suggest_deflection(self, query: str) -> Dict[str, Any]:
        hits = self.kb_search(query)
        return {"deflected": bool(hits), "answer": hits[0]["answer"] if hits else "",
                "alternatives": [h["answer"] for h in hits[1:3]]}

    # -- lifecycle --
    def create_ticket(self, household_id: str, subject: str, body: str = "",
                      channel: str = "in_app", category: Optional[str] = None,
                      priority: Optional[str] = None,
                      linked_order_id: Optional[str] = None,
                      linked_device_id: Optional[str] = None,
                      tags: Optional[List[str]] = None,
                      auto_deflect: bool = True) -> Ticket:
        triage = self.auto_triage(subject, body)
        category = category if category in CATEGORIES else triage["category"]
        priority = priority if priority in PRIORITIES else triage["priority"]

        now = datetime.now()
        sla = SLA_HOURS[priority]
        ticket = Ticket(
            ticket_id=f"tkt_{uuid.uuid4().hex[:10]}",
            household_id=household_id, subject=subject.strip()[:200],
            body=(body or "").strip()[:2000], category=category, priority=priority,
            channel=channel, linked_order_id=linked_order_id,
            linked_device_id=linked_device_id, tags=list(tags or [])[:8],
            sla_first_response_due=(now + timedelta(hours=sla["first_response"])).isoformat(),
            sla_resolve_due=(now + timedelta(hours=sla["resolve"])).isoformat(),
        )

        # KB deflection: if a canned answer matches well, auto-answer + resolve.
        deflection = self.suggest_deflection(f"{subject} {body}")
        if auto_deflect and deflection["deflected"]:
            ticket.auto_deflected = True
            ticket.first_response_at = now.isoformat()
            ticket.status = "resolved"
            ticket.resolved_at = now.isoformat()
            ticket.resolution = deflection["answer"]
            self.messages[ticket.ticket_id].append(
                {"role": "bot", "text": deflection["answer"], "at": now.isoformat()})

        with self._lock:
            self.tickets[ticket.ticket_id] = ticket

        self._emit("support.ticket.created", household_id, {
            "ticket_id": ticket.ticket_id, "category": category, "priority": priority,
            "auto_deflected": ticket.auto_deflected})
        if ticket.auto_deflected:
            self._emit("support.ticket.resolved", household_id, {
                "ticket_id": ticket.ticket_id, "resolution_hours": 0.0,
                "deflected": True})
        return ticket

    def get_ticket(self, ticket_id: str) -> Optional[Ticket]:
        return self.tickets.get(ticket_id)

    def add_message(self, ticket_id: str, role: str, text: str) -> Optional[Dict[str, Any]]:
        t = self.tickets.get(ticket_id)
        if not t:
            return None
        msg = {"role": role, "text": text, "at": datetime.now().isoformat()}
        with self._lock:
            self.messages[ticket_id].append(msg)
            if role in ("agent", "bot") and not t.first_response_at:
                t.first_response_at = msg["at"]
                if t.status == "new":
                    t.status = "open"
        return msg

    def assign(self, ticket_id: str, agent: str) -> Optional[Ticket]:
        t = self.tickets.get(ticket_id)
        if not t:
            return None
        t.assignee = agent
        if t.status == "new":
            t.status = "open"
        return t

    def escalate(self, ticket_id: str, reason: str = "") -> Optional[Ticket]:
        t = self.tickets.get(ticket_id)
        if not t:
            return None
        t.escalation_level += 1
        if t.escalation_level == 1:
            t.priority = "high"
        elif t.escalation_level >= 2:
            t.priority = "urgent"
        # recompute resolve SLA against the new priority
        sla = SLA_HOURS[t.priority]
        t.sla_resolve_due = (datetime.fromisoformat(t.created_at)
                             + timedelta(hours=sla["resolve"])).isoformat()
        self.add_message(ticket_id, "system", f"Escalated: {reason or 'no reason given'}")
        self._emit("support.ticket.escalated", t.household_id,
                   {"ticket_id": ticket_id, "level": t.escalation_level,
                    "priority": t.priority})
        return t

    def resolve(self, ticket_id: str, resolution: str = "") -> Optional[Ticket]:
        t = self.tickets.get(ticket_id)
        if not t:
            return None
        t.status = "resolved"
        t.resolved_at = datetime.now().isoformat()
        t.resolution = (resolution or t.resolution)[:2000]
        self._emit("support.ticket.resolved", t.household_id, {
            "ticket_id": ticket_id, "resolution_hours": t.resolution_hours(),
            "deflected": False})
        return t

    def reopen(self, ticket_id: str, reason: str = "") -> Optional[Ticket]:
        t = self.tickets.get(ticket_id)
        if not t:
            return None
        t.status = "open"
        t.resolved_at = None
        self.add_message(ticket_id, "customer", reason or "reopened")
        return t

    def close(self, ticket_id: str) -> Optional[Ticket]:
        t = self.tickets.get(ticket_id)
        if not t:
            return None
        t.status = "closed"
        t.closed_at = datetime.now().isoformat()
        return t

    # -- CSAT closed loop --
    def record_csat(self, ticket_id: str, score: int, comment: str = "") -> Optional[Dict[str, Any]]:
        t = self.tickets.get(ticket_id)
        if not t:
            return None
        t.csat_score = max(1, min(5, int(score)))
        t.csat_comment = (comment or "").strip()[:500]
        # low CSAT -> self-learning signal for the support model
        if self.self_learning:
            try:
                self.self_learning.thumbs("support", ticket_id, up=t.csat_score >= 4)
            except Exception as exc:
                logger.warning("self_learning feed failed: %s", exc)
        self._emit("support.csat.recorded", t.household_id, {
            "ticket_id": ticket_id, "csat": t.csat_score,
            "category": t.category, "priority": t.priority})
        return {"ticket_id": ticket_id, "csat": t.csat_score}

    # -- reporting --
    def overdue(self) -> List[Dict[str, Any]]:
        rows = []
        with self._lock:
            for t in self.tickets.values():
                if t.status in ("resolved", "closed"):
                    continue
                sla = t.sla_status()
                fr = sla["first_response"]
                rs = sla["resolve"]
                if fr.get("overdue") or rs.get("overdue"):
                    rows.append({"ticket_id": t.ticket_id, "category": t.category,
                                 "priority": t.priority, "status": t.status,
                                 "age_hours": t.age_hours(),
                                 "first_response_overdue": bool(fr.get("overdue")),
                                 "resolve_overdue": bool(rs.get("overdue"))})
        rows.sort(key=lambda r: -r["age_hours"])
        return rows

    def sla_report(self) -> Dict[str, Any]:
        with self._lock:
            tickets = list(self.tickets.values())
        fr_total = [t for t in tickets if t.first_response_at]
        fr_met = sum(1 for t in fr_total
                     if t.sla_status()["first_response"].get("met"))
        resolved = [t for t in tickets if t.resolved_at]
        rs_met = sum(1 for t in resolved
                     if t.sla_status()["resolve"].get("met"))
        fr_hours = [t.first_response_hours() for t in fr_total if t.first_response_hours() is not None]
        rs_hours = [t.resolution_hours() for t in resolved if t.resolution_hours() is not None]
        return {
            "tickets": len(tickets),
            "first_response_sla_pct": round(fr_met / len(fr_total) * 100, 1) if fr_total else 100.0,
            "resolution_sla_pct": round(rs_met / len(resolved) * 100, 1) if resolved else 100.0,
            "avg_first_response_hours": round(sum(fr_hours) / len(fr_hours), 2) if fr_hours else 0.0,
            "avg_resolution_hours": round(sum(rs_hours) / len(rs_hours), 2) if rs_hours else 0.0,
            "overdue_open": len(self.overdue()),
        }

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            tickets = list(self.tickets.values())
        by_status = {s: sum(1 for t in tickets if t.status == s) for s in STATUSES}
        by_category = {c: sum(1 for t in tickets if t.category == c) for c in CATEGORIES}
        by_priority = {p: sum(1 for t in tickets if t.priority == p) for p in PRIORITIES}
        csat = [t.csat_score for t in tickets if t.csat_score is not None]
        deflected = sum(1 for t in tickets if t.auto_deflected)
        return {
            "total_tickets": len(tickets),
            "by_status": by_status, "by_category": by_category,
            "by_priority": by_priority,
            "auto_deflection_rate": round(deflected / len(tickets) * 100, 1) if tickets else 0.0,
            "csat_avg": round(sum(csat) / len(csat), 2) if csat else 0.0,
            "csat_responses": len(csat),
            "open_backlog": by_status.get("new", 0) + by_status.get("open", 0)
                            + by_status.get("pending_customer", 0),
            "sla": self.sla_report(),
        }

    # -- events --
    def _emit(self, name: str, household_id: str, payload: Dict[str, Any]):
        if not self.data_loop:
            return
        try:
            self.data_loop.emit(name, household_id, 0, 0, payload)
        except Exception as exc:
            logger.warning("data_loop emit failed: %s", exc)


# ── FastAPI router ──────────────────────────────────────────────────────────
# NOTE: static paths are declared BEFORE the "/{ticket_id}" paths so they are
# not shadowed by the path parameter (FastAPI matches in registration order).
def create_support_router():
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel, Field

    router = APIRouter(prefix="/api/support", tags=["support"])

    class TicketIn(BaseModel):
        household_id: str
        subject: str
        body: str = ""
        channel: str = "in_app"
        category: Optional[str] = None
        priority: Optional[str] = None
        linked_order_id: Optional[str] = None
        linked_device_id: Optional[str] = None
        tags: List[str] = []
        auto_deflect: bool = True

    class MessageIn(BaseModel):
        role: str = "customer"
        text: str

    class AssignIn(BaseModel):
        agent: str

    class ResolveIn(BaseModel):
        resolution: str = ""

    class EscalateIn(BaseModel):
        reason: str = ""

    class CsatIn(BaseModel):
        score: int = Field(..., ge=1, le=5)
        comment: str = ""

    class DeflectIn(BaseModel):
        query: str

    @router.post("/tickets")
    def create_ticket(req: TicketIn):
        t = support.create_ticket(
            req.household_id, req.subject, req.body, req.channel, req.category,
            req.priority, req.linked_order_id, req.linked_device_id, req.tags,
            req.auto_deflect)
        return {"ok": True, "ticket": asdict(t)}

    @router.get("/stats")
    def stats():
        return {"ok": True, "stats": support.stats()}

    @router.get("/sla")
    def sla():
        return {"ok": True, "sla": support.sla_report()}

    @router.get("/overdue")
    def overdue():
        return {"ok": True, "overdue": support.overdue()}

    @router.get("/kb")
    def kb(q: str = ""):
        return {"ok": True, "results": support.kb_search(q)}

    @router.post("/deflect")
    def deflect(req: DeflectIn):
        return {"ok": True, **support.suggest_deflection(req.query)}

    @router.get("/tickets/{ticket_id}")
    def get_ticket(ticket_id: str):
        t = support.get_ticket(ticket_id)
        if not t:
            raise HTTPException(404, "ticket not found")
        return {"ok": True, "ticket": asdict(t),
                "messages": support.messages.get(ticket_id, [])}

    @router.post("/tickets/{ticket_id}/messages")
    def add_message(ticket_id: str, req: MessageIn):
        msg = support.add_message(ticket_id, req.role, req.text)
        if not msg:
            raise HTTPException(404, "ticket not found")
        return {"ok": True, "message": msg}

    @router.post("/tickets/{ticket_id}/assign")
    def assign(ticket_id: str, req: AssignIn):
        t = support.assign(ticket_id, req.agent)
        if not t:
            raise HTTPException(404, "ticket not found")
        return {"ok": True, "ticket": asdict(t)}

    @router.post("/tickets/{ticket_id}/resolve")
    def resolve(ticket_id: str, req: ResolveIn):
        t = support.resolve(ticket_id, req.resolution)
        if not t:
            raise HTTPException(404, "ticket not found")
        return {"ok": True, "ticket": asdict(t)}

    @router.post("/tickets/{ticket_id}/reopen")
    def reopen(ticket_id: str, req: MessageIn):
        t = support.reopen(ticket_id, req.text)
        if not t:
            raise HTTPException(404, "ticket not found")
        return {"ok": True, "ticket": asdict(t)}

    @router.post("/tickets/{ticket_id}/close")
    def close(ticket_id: str):
        t = support.close(ticket_id)
        if not t:
            raise HTTPException(404, "ticket not found")
        return {"ok": True, "ticket": asdict(t)}

    @router.post("/tickets/{ticket_id}/escalate")
    def escalate(ticket_id: str, req: EscalateIn):
        t = support.escalate(ticket_id, req.reason)
        if not t:
            raise HTTPException(404, "ticket not found")
        return {"ok": True, "ticket": asdict(t)}

    @router.post("/tickets/{ticket_id}/csat")
    def csat(ticket_id: str, req: CsatIn):
        out = support.record_csat(ticket_id, req.score, req.comment)
        if not out:
            raise HTTPException(404, "ticket not found")
        return {"ok": True, **out}

    return router


# ── singleton (lazily wired) ────────────────────────────────────────────────
def _wire() -> SupportEngine:
    data_loop = self_learning = None
    try:
        from children_data_loop import data_loop as _dl
        data_loop = _dl
    except Exception:
        pass
    try:
        from children_self_learning import self_learning as _sl
        self_learning = _sl
    except Exception:
        pass
    return SupportEngine(data_loop=data_loop, self_learning=self_learning)


support = _wire()
