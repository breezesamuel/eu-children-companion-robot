#!/usr/bin/env python3
"""
CRM -- 外联 / 跟进 (steps 8-9 of the 16-step commerce workflow)

  * lead & contact management (with GDPR consent gating)
  * outreach sequences (multi-step, consent-checked, rate-limited)
  * follow-up tasks / reminders
  * interaction timeline (calls, emails, chat, tickets)
  * pipeline stages + conversion (feeds the 6-stage funnel)

Never contacts anyone without a valid, revocable consent on record
(GDPR Art. 6/21, ePrivacy Art. 13).
"""
import os, json, uuid, logging, threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger("crm")


class LeadStatus(Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    WON = "won"
    LOST = "lost"


class Stage(Enum):
    """Six-stage funnel: 获客->咨询->下单->支付->物流->售后."""
    ACQUISITION = "acquisition"   # 获客
    CONSULTATION = "consultation" # 咨询
    ORDER = "order"               # 下单
    PAYMENT = "payment"           # 支付
    LOGISTICS = "logistics"       # 物流
    AFTERSALES = "aftersales"     # 售后


class OutreachStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    REPLIED = "replied"
    BOUNCED = "bounced"
    UNSUBSCRIBED = "unsubscribed"
    BLOCKED_NO_CONSENT = "blocked_no_consent"


@dataclass
class Contact:
    contact_id: str
    email: str
    name: str = ""
    phone: str = ""
    country: str = "DE"
    language: str = "en"
    lead_status: LeadStatus = LeadStatus.NEW
    stage: Stage = Stage.ACQUISITION
    consent_marketing: bool = False
    consent_updated_at: Optional[str] = None
    source: str = ""
    tags: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_contacted_at: Optional[str] = None


@dataclass
class Interaction:
    interaction_id: str
    contact_id: str
    channel: str            # email | phone | chat | ticket | meeting
    direction: str          # inbound | outbound
    subject: str = ""
    body: str = ""
    sent_by: str = ""       # user id or "automation"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class OutreachStep:
    step_no: int
    delay_hours: int
    channel: str
    template_id: str
    subject: str = ""
    skip_if_replied: bool = True


@dataclass
class Sequence:
    sequence_id: str
    name: str
    steps: List[OutreachStep]
    enabled: bool = True


@dataclass
class FollowUp:
    task_id: str
    contact_id: str
    due_at: str
    note: str = ""
    owner: str = ""
    done: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


class CRM:
    def __init__(self):
        self.contacts: Dict[str, Contact] = {}
        self.interactions: List[Interaction] = []
        self.sequences: Dict[str, Sequence] = {}
        self.enrolments: Dict[str, Dict] = {}       # contact_id -> {sequence_id, next_step, next_at}
        self.followups: Dict[str, FollowUp] = {}
        self.funnel: Dict[str, Dict[str, int]] = {s.value: {} for s in Stage}
        self._lock = threading.RLock()

    # -- contacts --
    def add_contact(self, c: Contact) -> Contact:
        with self._lock:
            self.contacts[c.contact_id] = c
            self.funnel[c.stage.value][c.contact_id] = c.contact_id
        return c

    def get_contact(self, contact_id: str) -> Optional[Contact]:
        return self.contacts.get(contact_id)

    def set_consent(self, contact_id: str, granted: bool) -> bool:
        with self._lock:
            c = self.contacts.get(contact_id)
            if not c:
                return False
            c.consent_marketing = granted
            c.consent_updated_at = datetime.now().isoformat()
            if not granted:
                for e in self.enrolments.values():
                    if e["contact_id"] == contact_id:
                        e["status"] = OutreachStatus.UNSUBSCRIBED.value
            return True

    def move_stage(self, contact_id: str, stage: Stage) -> bool:
        with self._lock:
            c = self.contacts.get(contact_id)
            if not c:
                return False
            old = c.stage.value
            self.funnel[old].pop(contact_id, None)
            c.stage = stage
            self.funnel[stage.value][contact_id] = contact_id
            return True

    def log_interaction(self, i: Interaction) -> Interaction:
        with self._lock:
            self.interactions.append(i)
            c = self.contacts.get(i.contact_id)
            if c:
                c.last_contacted_at = i.created_at
        return i

    def timeline(self, contact_id: str) -> List[Dict]:
        rows = [i for i in self.interactions if i.contact_id == contact_id]
        return [asdict(i) for i in sorted(rows, key=lambda x: x.created_at)]

    # -- outreach --
    def add_sequence(self, s: Sequence):
        with self._lock:
            self.sequences[s.sequence_id] = s

    def enrol(self, contact_id: str, sequence_id: str) -> Dict:
        with self._lock:
            c = self.contacts.get(contact_id)
            if not c:
                return {"success": False, "error": "contact not found"}
            if not c.consent_marketing:
                self.enrolments[contact_id] = {"contact_id": contact_id,
                                               "status": OutreachStatus.BLOCKED_NO_CONSENT.value}
                logger.info("outreach blocked: %s has no marketing consent", contact_id)
                return {"success": False, "error": "no_marketing_consent",
                        "note": "GDPR: consent required before outbound marketing"}
            self.enrolments[contact_id] = {
                "contact_id": contact_id, "sequence_id": sequence_id,
                "next_step": 0, "status": OutreachStatus.PENDING.value,
                "next_at": (datetime.now() + timedelta(hours=1)).isoformat()}
            return {"success": True}

    def due_outreach(self, now: datetime = None) -> List[Dict]:
        """Return the messages that should be sent now (consent re-checked)."""
        now = now or datetime.now()
        out = []
        with self._lock:
            for cid, e in self.enrolments.items():
                if e.get("status") != OutreachStatus.PENDING.value:
                    continue
                c = self.contacts.get(cid)
                if not c:
                    continue
                if not c.consent_marketing:      # re-check every send
                    e["status"] = OutreachStatus.BLOCKED_NO_CONSENT.value
                    continue
                if datetime.fromisoformat(e["next_at"]) > now:
                    continue
                seq = self.sequences.get(e.get("sequence_id", ""))
                if not seq or e["next_step"] >= len(seq.steps):
                    e["status"] = OutreachStatus.SENT.value
                    continue
                step = seq.steps[e["next_step"]]
                if step.skip_if_replied and c.last_contacted_at:
                    last = [i for i in self.interactions if i.contact_id == cid]
                    if any(i.direction == "inbound" for i in last):
                        e["status"] = OutreachStatus.REPLIED.value
                        continue
                out.append({"contact_id": cid, "email": c.email, "language": c.language,
                            "step_no": step.step_no, "channel": step.channel,
                            "template_id": step.template_id, "subject": step.subject})
        return out

    def mark_sent(self, contact_id: str, channel: str = "email", subject: str = ""):
        with self._lock:
            e = self.enrolments.get(contact_id)
            if not e:
                return
            seq = self.sequences.get(e.get("sequence_id", ""))
            idx = e.get("next_step", 0)
            delay = 24
            if seq and idx < len(seq.steps):
                delay = seq.steps[idx].delay_hours
            e["next_step"] = idx + 1
            e["next_at"] = (datetime.now() + timedelta(hours=delay)).isoformat()
            self.log_interaction(Interaction(
                interaction_id=f"in_{uuid.uuid4().hex[:10]}",
                contact_id=contact_id, channel=channel, direction="outbound",
                subject=subject, sent_by="automation"))

    # -- follow-ups --
    def add_followup(self, f: FollowUp) -> FollowUp:
        with self._lock:
            self.followups[f.task_id] = f
        return f

    def complete_followup(self, task_id: str) -> bool:
        f = self.followups.get(task_id)
        if not f:
            return False
        f.done = True
        return True

    def due_followups(self, now: datetime = None) -> List[Dict]:
        now = now or datetime.now()
        return [asdict(f) for f in self.followups.values()
                if not f.done and datetime.fromisoformat(f.due_at) <= now]

    # -- analytics --
    def funnel_snapshot(self) -> Dict[str, Any]:
        snap = {k: len(v) for k, v in self.funnel.items()}
        order_acq = ["acquisition", "consultation", "order", "payment", "logistics", "aftersales"]
        conv = {}
        for a, b in zip(order_acq, order_acq[1:]):
            conv[f"{a}->{b}"] = round(snap[b] / snap[a], 4) if snap[a] else 0.0
        return {"stages": snap, "conversion": conv,
                "contacts_total": len(self.contacts),
                "marketing_consent_rate": (
                    round(sum(1 for c in self.contacts.values() if c.consent_marketing)
                          / len(self.contacts), 4) if self.contacts else 0.0)}


crm = CRM()


def create_crm_router():
    from fastapi import APIRouter, HTTPException, Body
    from pydantic import BaseModel
    router = APIRouter(prefix="/api/crm", tags=["CRM / 外联跟进"])

    class ContactReq(BaseModel):
        contact_id: str
        email: str
        name: str = ""
        phone: str = ""
        country: str = "DE"
        language: str = "en"
        source: str = ""

    class SeqReq(BaseModel):
        sequence_id: str
        name: str
        steps: List[Dict[str, Any]]

    class EnrolReq(BaseModel):
        contact_id: str
        sequence_id: str

    class InteractionReq(BaseModel):
        contact_id: str
        channel: str
        direction: str
        subject: str = ""
        body: str = ""
        sent_by: str = "human"

    class FollowUpReq(BaseModel):
        task_id: str
        contact_id: str
        due_at: str
        note: str = ""
        owner: str = ""

    @router.post("/contacts")
    async def add_contact(req: ContactReq):
        return asdict(crm.add_contact(Contact(
            contact_id=req.contact_id, email=req.email, name=req.name, phone=req.phone,
            country=req.country, language=req.language, source=req.source)))

    @router.get("/contacts")
    async def list_contacts():
        return {"contacts": [asdict(c) for c in crm.contacts.values()]}

    @router.get("/contacts/{contact_id}")
    async def get_contact(contact_id: str):
        c = crm.get_contact(contact_id)
        if not c:
            raise HTTPException(404, "contact not found")
        return {"contact": asdict(c), "timeline": crm.timeline(contact_id)}

    @router.post("/contacts/{contact_id}/consent")
    async def set_consent(contact_id: str, granted: bool = Body(..., embed=True)):
        ok = crm.set_consent(contact_id, granted)
        if not ok:
            raise HTTPException(404, "contact not found")
        return {"success": True, "consent_marketing": granted}

    @router.post("/contacts/{contact_id}/stage")
    async def move_stage(contact_id: str, stage: str = Body(..., embed=True)):
        try:
            st = Stage(stage)
        except ValueError:
            raise HTTPException(400, f"invalid stage. valid: {[s.value for s in Stage]}")
        return {"success": crm.move_stage(contact_id, st)}

    @router.post("/sequences")
    async def add_sequence(req: SeqReq):
        steps = [OutreachStep(step_no=i + 1,
                              delay_hours=s.get("delay_hours", 24),
                              channel=s.get("channel", "email"),
                              template_id=s.get("template_id", "tpl_default"),
                              subject=s.get("subject", ""),
                              skip_if_replied=s.get("skip_if_replied", True))
                 for i, s in enumerate(req.steps)]
        crm.add_sequence(Sequence(req.sequence_id, req.name, steps))
        return {"success": True}

    @router.get("/sequences")
    async def list_sequences():
        return {"sequences": [asdict(s) for s in crm.sequences.values()]}

    @router.post("/outreach/enrol")
    async def enrol(req: EnrolReq):
        return crm.enrol(req.contact_id, req.sequence_id)

    @router.get("/outreach/due")
    async def due_outreach():
        return {"due": crm.due_outreach()}

    @router.post("/outreach/sent/{contact_id}")
    async def mark_sent(contact_id: str, subject: str = Body("", embed=True)):
        crm.mark_sent(contact_id, subject=subject)
        return {"success": True}

    @router.post("/interactions")
    async def log_interaction(req: InteractionReq):
        crm.log_interaction(Interaction(
            interaction_id=f"in_{uuid.uuid4().hex[:10]}",
            contact_id=req.contact_id, channel=req.channel, direction=req.direction,
            subject=req.subject, body=req.body, sent_by=req.sent_by))
        return {"success": True}

    @router.post("/followups")
    async def add_followup(req: FollowUpReq):
        f = crm.add_followup(FollowUp(req.task_id, req.contact_id, req.due_at,
                                      req.note, req.owner))
        return {"success": True, "task_id": f.task_id}

    @router.get("/followups/due")
    async def due_followups():
        return {"due": crm.due_followups()}

    @router.post("/followups/{task_id}/done")
    async def complete_followup(task_id: str):
        if not crm.complete_followup(task_id):
            raise HTTPException(404, "task not found")
        return {"success": True}

    @router.get("/funnel")
    async def funnel():
        return crm.funnel_snapshot()

    return router


if __name__ == "__main__":
    logging.basicConfig(level=INFO if False else logging.INFO)
    crm.add_contact(Contact("c1", "a@example.com", "Ann", consent_marketing=True))
    crm.add_contact(Contact("c2", "b@example.com", "Bob", consent_marketing=False))
    crm.add_sequence(Sequence("seq1", "Welcome", [
        OutreachStep(1, 1, "email", "tpl_welcome", "Welcome to RoboBuddy"),
        OutreachStep(2, 48, "email", "tpl_tips", "3 tips for week one"),
    ]))
    print("enrol with consent:", crm.enrol("c1", "seq1"))
    print("enrol WITHOUT consent:", crm.enrol("c2", "seq1"))
    print("due:", crm.due_outreach())
    print("funnel:", json.dumps(crm.funnel_snapshot(), indent=2))