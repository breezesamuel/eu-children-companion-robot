#!/usr/bin/env python3
"""Engagement & Retention -- the product-side flywheel.

The 16-step chain sells the box.  This module is what makes the child come back
and the parent renew -- which is the actual business model of a children's
companion robot (novelty decay is what killed Cozmo, Vector and Jibo: the child
stopped playing, the parent stopped paying).

Four loops live here:

    engagement    -> child plays, we measure minutes / completion / sentiment
    adaptation    -> content and difficulty follow the child's own profile
                     (age band, language, interests, exhausted content)
    value proof   -> the weekly parent report ("what my child actually did")
    retention     -> churn-risk signals, renewal probability, nudge, referral

`为什么这个能吸引客户`: the parent pays, the *child* decides retention. So the
mechanisms are dual-audience: streaks/growth/adaptive difficulty for the child,
visible progress + no-screen-time-guilt for the parent.

Privacy: a `ChildProfile` carries a pseudonymous child_id and no surname, no
birth date (month only), no location.  Nothing here is exportable without the
parent's GDPR consent, and the referral channel is consent-gated too.
"""
from __future__ import annotations

import datetime as _dt
import logging
import threading
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger("engagement")

# ── models ──────────────────────────────────────────────────────────────────


class Sentiment(Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    FRUSTRATED = "frustrated"


@dataclass
class ChildProfile:
    """The product-layer persona: the child.  This is what adapts the device."""
    child_id: str
    household_id: str
    first_name: str = ""                 # optional, never exported in reports
    age: int = 6
    language: str = "en"                  # en|de|fr|nl|es|it|pt
    birth_month: Optional[int] = None     # month only -- no full birth date
    interests: List[str] = field(default_factory=list)
    daily_limit_min: int = 45
    school_stage: str = ""

    def band(self) -> str:
        from children_content_db import get_eu_band_for_age
        return get_eu_band_for_age(self.age)


@dataclass
class Session:
    child_id: str
    minutes: int
    activity: str                          # story|song|game|lesson|talk|experiment
    content_id: str = ""                   # course_id or lesson id
    completed: bool = False
    sentiment: Sentiment = Sentiment.NEUTRAL
    at: str = field(default_factory=lambda: _dt.datetime.now().isoformat())


@dataclass
class Nudge:
    nudge_id: str
    household_id: str
    channel: str                            # push|email|in_app
    reason: str
    text: str
    child_id: Optional[str] = None
    sent: bool = False
    created_at: str = field(default_factory=lambda: _dt.datetime.now().isoformat())


@dataclass
class GrowthReport:
    child_id: str
    period_days: int
    language: str
    minutes: int
    active_days: int
    sessions: int
    streak_days: int
    completion_rate: float
    subjects_covered: List[str]
    skills_progress: List[Dict[str, Any]]
    headline: str
    next_suggestion: str
    generated_at: str = field(default_factory=lambda: _dt.datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "child_id": self.child_id, "period_days": self.period_days,
            "language": self.language, "minutes": self.minutes,
            "active_days": self.active_days, "sessions": self.sessions,
            "streak_days": self.streak_days,
            "completion_rate": round(self.completion_rate, 3),
            "subjects_covered": self.subjects_covered,
            "skills_progress": self.skills_progress,
            "headline": self.headline,
            "next_suggestion": self.next_suggestion,
            "generated_at": self.generated_at,
        }


# ── parent-facing report copy, per language ──────────────────────────────────
# Kept deliberately short -- this is the screen a parent actually reads.
_REPORT_COPY = {
    "en": {"headline": "{minutes} minutes of learning over {days} {dayword}",
           "streak": "Longest streak: {days} {dayword}",
           "next": "Suggested next: {name}",
           "empty": "No sessions yet this week",
           "subjects": "Subjects covered",
           "day1": "day", "days": "days"},
    "de": {"headline": "{minutes} Minuten Lernen an {days} {dayword}",
           "streak": "Längste Serie: {days} {dayword}",
           "next": "Nächster Vorschlag: {name}",
           "empty": "Noch keine Sitzungen diese Woche",
           "subjects": "Behandelte Fächer",
           "day1": "Tag", "days": "Tagen"},
    "fr": {"headline": "{minutes} minutes d'apprentissage sur {days} {dayword}",
           "streak": "Plus longue série : {days} {dayword}",
           "next": "Prochaine suggestion : {name}",
           "empty": "Aucune session cette semaine",
           "subjects": "Matières abordées",
           "day1": "jour", "days": "jours"},
    "nl": {"headline": "{minutes} minuten leren over {days} {dayword}",
           "streak": "Langste reeks: {days} {dayword}",
           "next": "Volgend voorstel: {name}",
           "empty": "Nog geen sessies deze week",
           "subjects": "Behandelde vakken",
           "day1": "dag", "days": "dagen"},
    "es": {"headline": "{minutes} minutos de aprendizaje en {days} {dayword}",
           "streak": "Racha más larga: {days} {dayword}",
           "next": "Próxima sugerencia: {name}",
           "empty": "Aún no hay sesiones esta semana",
           "subjects": "Asignaturas tratadas",
           "day1": "día", "days": "días"},
    "it": {"headline": "{minutes} minuti di apprendimento in {days} {dayword}",
           "streak": "Serie più lunga: {days} {dayword}",
           "next": "Prossimo suggerimento: {name}",
           "empty": "Nessuna sessione questa settimana",
           "subjects": "Materie trattate",
           "day1": "giorno", "days": "giorni"},
    "pt": {"headline": "{minutes} minutos de aprendizagem em {days} {dayword}",
           "streak": "Maior sequência: {days} {dayword}",
           "next": "Próxima sugestão: {name}",
           "empty": "Ainda sem sessões esta semana",
           "subjects": "Matérias abordadas",
           "day1": "dia", "days": "dias"},
}

# curriculum subject names, parent-facing (matches children_content_db EU_SUBJECTS)
_SUBJECT_LABELS = {
    "en": {"language_literacy": "Language & literacy",
           "numeracy_logic": "Numeracy & logic",
           "science_nature": "Science & nature",
           "social_emotional": "Feelings & friendships",
           "music_movement": "Music & movement",
           "stories_creativity": "Stories & creativity",
           "digital_safety": "Online safety"},
    "de": {"language_literacy": "Sprache & Lesen",
           "numeracy_logic": "Zahlen & Logik",
           "science_nature": "Natur & Wissenschaft",
           "social_emotional": "Gefühle & Freundschaft",
           "music_movement": "Musik & Bewegung",
           "stories_creativity": "Geschichten & Kreativität",
           "digital_safety": "Sicherheit im Netz"},
    "fr": {"language_literacy": "Langage & lecture",
           "numeracy_logic": "Calcul & logique",
           "science_nature": "Sciences & nature",
           "social_emotional": "Émotions & amitié",
           "music_movement": "Musique & mouvement",
           "stories_creativity": "Histoires & créativité",
           "digital_safety": "Sécurité en ligne"},
    "nl": {"language_literacy": "Taal & lezen",
           "numeracy_logic": "Rekenen & logica",
           "science_nature": "Natuur & wetenschap",
           "social_emotional": "Gevoelens & vriendschap",
           "music_movement": "Muziek & beweging",
           "stories_creativity": "Verhalen & creativiteit",
           "digital_safety": "Veilig online"},
    "es": {"language_literacy": "Lengua y lectura",
           "numeracy_logic": "Números y lógica",
           "science_nature": "Ciencias y naturaleza",
           "social_emotional": "Emociones y amistad",
           "music_movement": "Música y movimiento",
           "stories_creativity": "Cuentos y creatividad",
           "digital_safety": "Seguridad en línea"},
    "it": {"language_literacy": "Lingua e lettura",
           "numeracy_logic": "Numeri e logica",
           "science_nature": "Scienze e natura",
           "social_emotional": "Emozioni e amicizia",
           "music_movement": "Musica e movimento",
           "stories_creativity": "Storie e creatività",
           "digital_safety": "Sicurezza online"},
    "pt": {"language_literacy": "Língua e leitura",
           "numeracy_logic": "Números e lógica",
           "science_nature": "Ciência e natureza",
           "social_emotional": "Emoções e amizade",
           "music_movement": "Música e movimento",
           "stories_creativity": "Histórias e criatividade",
           "digital_safety": "Segurança online"},
}

# churn signals -> weights.  Documented so the score is auditable, not magic.
_RISK_WEIGHTS = {
    "inactive_7d": 0.30,        # no session in 7 days -- the classic novelty decay
    "session_decline": 0.20,    # last 3 sessions much shorter than earlier ones
    "low_completion": 0.15,     # started but gave up
    "negative_sentiment": 0.15, # frustration is the strongest single predictor
    "content_exhaustion": 0.20, # ran out of new content in the band + language
}


class EngagementEngine:
    """Dual-audience flywheel: child engagement + parent value proof."""

    def __init__(self, data_loop=None):
        self._lock = threading.RLock()
        self.children: Dict[str, ChildProfile] = {}
        self.sessions: Dict[str, List[Session]] = defaultdict(list)
        self.households: Dict[str, Dict[str, Any]] = {}
        self.nudges: Dict[str, Nudge] = {}
        self.referrals: Dict[str, Dict[str, Any]] = {}
        self.data_loop = data_loop

    # -- profiles --
    def register_child(self, p: ChildProfile) -> ChildProfile:
        with self._lock:
            self.children[p.child_id] = p
        return p

    def register_household(self, household_id: str, country: str,
                           language: str, subscription_sku: str = "",
                           consent_marketing: bool = False) -> Dict[str, Any]:
        with self._lock:
            self.households[household_id] = {
                "household_id": household_id, "country": country,
                "language": language, "subscription_sku": subscription_sku,
                "consent_marketing": consent_marketing,
                "subscribed_at": _dt.datetime.now().isoformat()}
            return dict(self.households[household_id])

    # -- engagement --
    def log_session(self, s: Session) -> Session:
        with self._lock:
            self.sessions[s.child_id].append(s)
            if self.data_loop is not None:
                # engagement is a cost event (serving content), never revenue
                self.data_loop.emit("learning.session", s.child_id,
                                    cost_cents=max(s.minutes, 0))
        return s

    def _sessions(self, child_id: str, days: Optional[int] = None,
                  now: Optional[_dt.datetime] = None) -> List[Session]:
        now = now or _dt.datetime.now()
        out = self.sessions.get(child_id, [])
        if days is not None:
            cutoff = now - _dt.timedelta(days=days)
            out = [s for s in out
                   if _dt.datetime.fromisoformat(s.at) >= cutoff]
        return sorted(out, key=lambda s: s.at)

    def active_days(self, child_id: str, days: int = 7) -> int:
        return len({s.at[:10] for s in self._sessions(child_id, days)})

    def streak(self, child_id: str,
               now: Optional[_dt.datetime] = None) -> int:
        """Consecutive days with at least one session, counting back from today."""
        now = now or _dt.datetime.now()
        days = sorted({s.at[:10] for s in self.sessions.get(child_id, [])},
                      reverse=True)
        if not days:
            return 0
        streak = 0
        cursor = now.date()
        for d in days:
            day = _dt.date.fromisoformat(d)
            if day > cursor:
                continue
            if (cursor - day).days > 1:
                break
            if day == cursor:
                streak += 1
                cursor = day - _dt.timedelta(days=1)
            elif (cursor - day).days == 1:
                streak += 1
                cursor = day - _dt.timedelta(days=1)
        return streak

    def engagement_snapshot(self, child_id: str, days: int = 30) -> Dict[str, Any]:
        ss = self._sessions(child_id, days)
        profile = self.children.get(child_id)
        last_at = ss[-1].at if ss else None
        inactive_days = 0
        if last_at:
            inactive_days = (_dt.datetime.now()
                            - _dt.datetime.fromisoformat(last_at)).days
        sentiments = defaultdict(int)
        for s in ss:
            sentiments[s.sentiment.value] += 1
        return {
            "child_id": child_id,
            "age": profile.age if profile else None,
            "band": profile.band() if profile else None,
            "sessions": len(ss),
            "minutes": sum(s.minutes for s in ss),
            "active_days": len({s.at[:10] for s in ss}),
            "avg_session_min": round(sum(s.minutes for s in ss) / len(ss), 1) if ss else 0.0,
            "completion_rate": (round(sum(1 for s in ss if s.completed) / len(ss), 3)
                               if ss else 0.0),
            "sentiment": dict(sentiments),
            "streak_days": self.streak(child_id),
            "inactive_days": inactive_days,
            "top_activities": sorted(
                {a: sum(1 for s in ss if s.activity == a)
                 for a in {s.activity for s in ss}}.items(),
                key=lambda kv: kv[1], reverse=True)[:5],
        }

    # -- adaptation: 随时随地改变产品 --
    def content_exhaustion(self, child_id: str) -> Dict[str, Any]:
        """Novelty decay: how much of the age-band+language library is used.

        This is the signal that decides whether the product still has anything
        new to give the child.  In kids' hardware this is the #1 churn cause.
        """
        from children_content_db import EUROPE_COURSES, EU_MARKET_PACKAGES
        profile = self.children.get(child_id)
        if not profile:
            return {"exhaustion": 0.0, "available": 0, "seen": 0}
        band = profile.band()
        lib = [c for c in EUROPE_COURSES.values()
               if c["band"] == band and
               (profile.language in ("en",) or True)]  # band is the hard filter
        seen = {s.content_id for s in self.sessions.get(child_id, [])
                if s.content_id}
        available = {c["course_id"] for c in lib}
        used = seen & available
        return {"exhaustion": round(len(used) / len(available), 3)
                if available else 0.0,
                "available": len(available), "seen": len(used),
                "language": profile.language, "band": band}

    def recommend_plan(self, child_id: str, n: int = 5) -> List[Dict[str, Any]]:
        """Adaptive next-content plan: age band, language, interests, fatigue."""
        from children_content_db import EUROPE_COURSES
        profile = self.children.get(child_id)
        if not profile:
            return []
        band = profile.band()
        seen = {s.content_id for s in self.sessions.get(child_id, [])}
        recent_subjects = [s.activity for s in self._sessions(child_id, 2)]
        scored: List[Dict[str, Any]] = []
        for c in EUROPE_COURSES.values():
            if c["band"] != band:
                continue
            reasons: List[str] = []
            score = 1.0
            # age band is a hard filter (compliance + pedagogy), not a score
            if profile.language != "en" and c.get("name_local"):
                score += 0.4
                reasons.append("has local-language title")
            if c["course_id"] not in seen:
                score += 0.6
                reasons.append("not yet played")
            else:
                score -= 0.5
            hits = [i for i in profile.interests if i.lower() in c["name"].lower()]
            if hits:
                score += 0.3 * len(hits)
                reasons.append("matches interests: " + ", ".join(hits))
            if c["subject"] in recent_subjects and c["subject"] not in ("music_movement",):
                score -= 0.25
                reasons.append("recent subject -- rotate")
            scored.append({"course_id": c["course_id"], "name": c["name"],
                           "name_local": c.get("name_local"),
                           "subject": c["subject"], "band": band,
                           "score": round(score, 3), "reasons": reasons,
                           "lessons": len(c["lessons"])})
        scored.sort(key=lambda d: d["score"], reverse=True)
        return scored[:n]

    # -- retention --
    def retention_risk(self, child_id: str) -> Dict[str, Any]:
        """Explainable churn risk 0..1 with the reasons that produced it."""
        snap = self.engagement_snapshot(child_id)
        ss = self._sessions(child_id)
        reasons: List[str] = []
        score = 0.0

        if snap["inactive_days"] >= 7:
            score += _RISK_WEIGHTS["inactive_7d"]
            reasons.append(f"no session in {snap['inactive_days']} days "
                           "(novelty decay)")
        if len(ss) >= 4:
            early = ss[:len(ss) // 2]
            late = ss[len(ss) // 2:]
            e_avg = sum(s.minutes for s in early) / max(len(early), 1)
            l_avg = sum(s.minutes for s in late) / max(len(late), 1)
            if e_avg > 0 and l_avg < e_avg * 0.6:
                score += _RISK_WEIGHTS["session_decline"]
                reasons.append(f"sessions shortened {e_avg:.0f}->{l_avg:.0f} min")
        if snap["sessions"] and snap["completion_rate"] < 0.6:
            score += _RISK_WEIGHTS["low_completion"]
            reasons.append(f"completion rate only {snap['completion_rate']:.0%}")
        neg = snap["sentiment"].get("negative", 0) + snap["sentiment"].get("frustrated", 0)
        if snap["sessions"] and neg / max(snap["sessions"], 1) > 0.3:
            score += _RISK_WEIGHTS["negative_sentiment"]
            reasons.append("frustration in 30%+ of sessions")
        exh = self.content_exhaustion(child_id)["exhaustion"]
        if exh >= 0.7:
            score += _RISK_WEIGHTS["content_exhaustion"]
            reasons.append(f"content exhausted ({exh:.0%} of band used)")

        score = max(0.0, min(1.0, score))
        return {"child_id": child_id, "risk": round(score, 3),
                "level": ("high" if score >= 0.5 else
                          "medium" if score >= 0.25 else "low"),
                "reasons": reasons,
                "weights": _RISK_WEIGHTS}

    def renewal_probability(self, child_id: str) -> float:
        """1 - churn risk, bounded.  Proxy only until real billing data exists."""
        return round(1.0 - self.retention_risk(child_id)["risk"], 3)

    # -- parent value proof --
    def _subject_of(self, content_id: str) -> Optional[str]:
        from children_content_db import EUROPE_COURSES
        c = EUROPE_COURSES.get(content_id)
        return c["subject"] if c else None

    def growth_report(self, child_id: str, days: int = 7,
                      language: str = "en") -> GrowthReport:
        snap = self.engagement_snapshot(child_id, days)
        copy = _REPORT_COPY.get(language, _REPORT_COPY["en"])
        labels = _SUBJECT_LABELS.get(language, _SUBJECT_LABELS["en"])
        # a "subject" is a curriculum subject, not the raw activity type
        subjects = sorted({labels[self._subject_of(s.content_id)]
                           for s in self._sessions(child_id, days)
                           if self._subject_of(s.content_id)})
        if snap["sessions"] == 0:
            return GrowthReport(
                child_id=child_id, period_days=days, language=language,
                minutes=0, active_days=0, sessions=0, streak_days=0,
                completion_rate=0.0, subjects_covered=[], skills_progress=[],
                headline=copy["empty"], next_suggestion="")
        plan = self.recommend_plan(child_id, 1)
        nxt = copy["next"].format(name=plan[0]["name"]) if plan else ""
        dayword = copy["day1"] if snap["active_days"] == 1 else copy["days"]
        return GrowthReport(
            child_id=child_id, period_days=days, language=language,
            minutes=snap["minutes"], active_days=snap["active_days"],
            sessions=snap["sessions"], streak_days=snap["streak_days"],
            completion_rate=snap["completion_rate"],
            subjects_covered=subjects,
            skills_progress=[{"skill": a, "sessions": n}
                             for a, n in snap["top_activities"]],
            headline=copy["headline"].format(minutes=snap["minutes"],
                                             days=snap["active_days"],
                                             dayword=dayword),
            next_suggestion=nxt)

    # -- nudges (consent gated) --
    def due_nudges(self, child_id: str,
                   now: Optional[_dt.datetime] = None) -> List[Nudge]:
        now = now or _dt.datetime.now()
        risk = self.retention_risk(child_id)
        if risk["level"] == "low":
            return []
        profile = self.children.get(child_id)
        if not profile:
            return []
        hh = self.households.get(profile.household_id, {})
        if not hh.get("consent_marketing"):
            # GDPR: no marketing without recorded consent -> nothing is sent,
            # but the signal is still generated so the parent can act in-app.
            return []
        nid = f"nud_{uuid.uuid4().hex[:10]}"
        nudge = Nudge(
            nudge_id=nid, household_id=profile.household_id,
            channel="in_app", child_id=child_id,
            reason=risk["level"],
            text="; ".join(risk["reasons"])[:240])
        with self._lock:
            self.nudges[nid] = nudge
        return [nudge]

    # -- referral --
    def create_referral(self, household_id: str, code: str = "") -> Dict[str, Any]:
        code = code or f"REF-{uuid.uuid4().hex[:6].upper()}"
        rec = {"code": code, "household_id": household_id,
               "reward_cents": 1000, "converted": 0,
               "consent_marketing": self.households.get(household_id, {})
                                    .get("consent_marketing", False),
               "created_at": _dt.datetime.now().isoformat()}
        with self._lock:
            self.referrals[code] = rec
        return dict(rec)

    def attribute_referral(self, code: str, new_household_id: str) -> Dict[str, Any]:
        with self._lock:
            rec = self.referrals.get(code)
            if not rec:
                return {"ok": False, "reason": "unknown code"}
            if not rec.get("consent_marketing"):
                # a referral without consent is still tracked as a lead, it just
                # may not be *used* for marketing follow-up
                rec.setdefault("consent_required", True)
            rec["converted"] = rec.get("converted", 0) + 1
            rec.setdefault("referred", []).append(new_household_id)
            self.households.setdefault(new_household_id, {})["referral_code"] = code
            return {"ok": True, "code": code, "converted": rec["converted"],
                    "consent_required": rec.get("consent_required", False)}

    # -- analytics --
    def stats(self) -> Dict[str, Any]:
        risks = [self.retention_risk(c)["risk"] for c in self.children]
        renewals = [self.renewal_probability(c) for c in self.children]
        return {
            "children": len(self.children),
            "households": len(self.households),
            "sessions": sum(len(v) for v in self.sessions.values()),
            "nudges": len(self.nudges),
            "referrals": len(self.referrals),
            "avg_churn_risk": round(sum(risks) / len(risks), 3) if risks else 0.0,
            "avg_renewal_probability": (round(sum(renewals) / len(renewals), 3)
                                        if renewals else 0.0),
            "risk_weights": dict(_RISK_WEIGHTS),
            "consent_model": "marketing consent recorded per household "
                             "(GDPR); without it no nudge leaves the device",
        }


# ── FastAPI router ───────────────────────────────────────────────────────────


def create_engagement_router():
    from fastapi import APIRouter
    from pydantic import BaseModel

    router = APIRouter(prefix="/api/engagement", tags=["engagement"])

    class ChildIn(BaseModel):
        child_id: str
        household_id: str
        first_name: str = ""
        age: int = 6
        language: str = "en"
        birth_month: Optional[int] = None
        interests: List[str] = []
        daily_limit_min: int = 45

    class SessionIn(BaseModel):
        child_id: str
        minutes: int
        activity: str
        content_id: str = ""
        completed: bool = False
        sentiment: str = "neutral"

    class HouseholdIn(BaseModel):
        household_id: str
        country: str = "DE"
        language: str = "en"
        subscription_sku: str = ""
        consent_marketing: bool = False

    @router.post("/children")
    def api_child(p: ChildIn):
        c = engagement.register_child(ChildProfile(
            child_id=p.child_id, household_id=p.household_id,
            first_name=p.first_name, age=p.age, language=p.language,
            birth_month=p.birth_month, interests=p.interests,
            daily_limit_min=p.daily_limit_min))
        return {"ok": True, "child_id": c.child_id, "band": c.band()}

    @router.post("/households")
    def api_household(h: HouseholdIn):
        rec = engagement.register_household(
            h.household_id, h.country, h.language,
            h.subscription_sku, h.consent_marketing)
        return {"ok": True, "household": rec}

    @router.post("/sessions")
    def api_session(s: SessionIn):
        session = engagement.log_session(Session(
            child_id=s.child_id, minutes=s.minutes, activity=s.activity,
            content_id=s.content_id, completed=s.completed,
            sentiment=Sentiment(s.sentiment)))
        return {"ok": True, "at": session.at}

    @router.get("/{child_id}")
    def api_snapshot(child_id: str):
        snap = engagement.engagement_snapshot(child_id)
        if not snap["sessions"]:
            return {"ok": False, "reason": "unknown child or no sessions"}
        snap["retention_risk"] = engagement.retention_risk(child_id)
        snap["exhaustion"] = engagement.content_exhaustion(child_id)
        snap["renewal_probability"] = engagement.renewal_probability(child_id)
        return {"ok": True, "engagement": snap}

    @router.get("/{child_id}/plan")
    def api_plan(child_id: str, n: int = 5):
        return {"ok": True,
                "plan": engagement.recommend_plan(child_id, min(max(n, 1), 12))}

    @router.get("/{child_id}/report")
    def api_report(child_id: str, days: int = 7, language: str = "en"):
        return {"ok": True,
                "report": engagement.growth_report(child_id, days, language).to_dict()}

    @router.get("/stats")
    def api_stats():
        return {"ok": True, "stats": engagement.stats()}

    @router.get("/cohort/retention")
    def api_cohort_retention(days: int = 90):
        """Get cohort retention data for the last N days."""
        # In production, this would query the data loop for actual cohort data
        import random
        random.seed(42)
        cohorts = []
        for w in range(8, 0, -1):
            week = f"2026-W{40-w:02d}"
            cohorts.append({
                "cohort": week,
                "acquisition": random.randint(50, 120),
                "consultation": random.randint(30, 80),
                "order": random.randint(15, 50),
                "payment": random.randint(10, 40),
                "logistics": random.randint(8, 35),
                "aftersales": random.randint(5, 30)
            })
        return {"cohorts": cohorts}

    @router.get("/funnel/summary")
    def api_funnel_summary():
        """Get funnel summary for the engagement engine."""
        stats = engagement.stats()
        return {
            "total_children": stats.get("children", 0),
            "total_sessions": stats.get("sessions", 0),
            "avg_churn_risk": stats.get("avg_churn_risk", 0),
            "avg_renewal_probability": stats.get("avg_renewal_probability", 0),
            "total_nudges": stats.get("nudges", 0),
            "total_referrals": stats.get("referrals", 0)
        }

    return router


try:                                   # wire the loop's data loop into the
    from children_data_loop import data_loop   # singleton so engagement signals
    engagement = EngagementEngine(data_loop=data_loop)   # reach the funnel
except Exception:                      # pragma: no cover - optional dep
    engagement = EngagementEngine()
