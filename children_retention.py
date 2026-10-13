#!/usr/bin/env python3
"""
Real Retention Engine — 真实留存引擎.

Queries the data loop for actual `learning.session` events and computes
cohort metrics (DAU/MAU, streaks, completion, churn risk) that the
closure audit can verify against live evidence — replacing the synthetic
`phase_engage` numbers with real aggregation.

No fabricated numbers: if no events exist, metrics are zero/null and the
dashboard shows "no data yet" instead of faking 100% retention.
"""
from __future__ import annotations

import json
import logging
import os
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger("retention")

try:
    from children_data_loop import data_loop
except Exception:
    data_loop = None

# ── models ──────────────────────────────────────────────────────────────────

@dataclass
class SessionEvent:
    """A single learning session extracted from a data-loop event."""
    anon_user: str          # pseudonymous household/child key
    at: datetime
    minutes: int
    activity: str
    content_id: str
    completed: bool
    sentiment: str          # positive|neutral|negative|frustrated
    properties: Dict[str, Any]


@dataclass
class HouseholdMetrics:
    """Aggregated metrics for one household over a window."""
    anon_user: str
    first_seen: datetime
    last_seen: datetime
    total_sessions: int
    total_minutes: int
    active_days: int
    streak_days: int
    completion_rate: float
    avg_session_min: float
    sentiment_dist: Dict[str, int]
    content_exhaustion: float
    churn_risk: float
    risk_level: str
    risk_reasons: List[str]
    renewal_probability: float


@dataclass
class CohortMetrics:
    """Aggregated metrics for a cohort (e.g., all households, or by country/plan)."""
    name: str
    size: int
    dau: int
    mau: int
    avg_streak: float
    avg_completion: float
    avg_minutes_per_user: float
    churn_distribution: Dict[str, int]  # low/medium/high counts
    renewal_probability_avg: float
    revenue_cents: int


# ── risk weights (mirror children_engagement._RISK_WEIGHTS) ─────────────────
_RISK_WEIGHTS = {
    "inactive_7d": 0.30,
    "session_decline": 0.20,
    "low_completion": 0.15,
    "negative_sentiment": 0.15,
    "content_exhaustion": 0.20,
}


# ── core engine ─────────────────────────────────────────────────────────────
class RetentionEngine:
    """Reads data-loop events, builds real household/cohort metrics."""

    def __init__(self, data_loop_instance=None):
        self._dl = data_loop_instance or data_loop
        self._lock = threading.RLock()
        self._cache: Dict[str, Any] = {}
        self._cache_ts: float = 0

    # -- event extraction --
    def _extract_sessions(self, days: int = 30) -> List[SessionEvent]:
        """Pull all `learning.session` events from the data loop."""
        if not self._dl:
            return []
        with self._dl._lock:
            events = list(self._dl._events)

        cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        out: List[SessionEvent] = []
        for ev in events:
            if ev.name != "learning.session":
                continue
            if ev.at[:10] < cutoff:
                continue
            props = ev.properties or {}
            # sentiment may be encoded as string or enum value
            sentiment = str(props.get("sentiment", "neutral")).lower()
            if sentiment not in ("positive", "neutral", "negative", "frustrated"):
                sentiment = "neutral"
            out.append(SessionEvent(
                anon_user=ev.anon_user_key,
                at=datetime.fromisoformat(ev.at),
                minutes=int(props.get("minutes", 0) or 0),
                activity=str(props.get("activity", "lesson")),
                content_id=str(props.get("content_id", "")),
                completed=bool(props.get("completed", False)),
                sentiment=sentiment,
                properties=props))
        out.sort(key=lambda s: s.at)
        return out

    # -- household aggregation --
    def _aggregate_household(self, sessions: List[SessionEvent], now: Optional[datetime] = None) -> HouseholdMetrics:
        now = now or datetime.now()
        if not sessions:
            return HouseholdMetrics(
                anon_user="", first_seen=now, last_seen=now,
                total_sessions=0, total_minutes=0, active_days=0,
                streak_days=0, completion_rate=0.0, avg_session_min=0.0,
                sentiment_dist={}, content_exhaustion=0.0,
                churn_risk=0.0, risk_level="unknown", risk_reasons=[],
                renewal_probability=1.0)

        first_seen = sessions[0].at
        last_seen = sessions[-1].at
        total_sessions = len(sessions)
        total_minutes = sum(s.minutes for s in sessions)
        active_days = len({s.at.date() for s in sessions})
        completed = sum(1 for s in sessions if s.completed)
        completion_rate = completed / total_sessions if total_sessions else 0.0
        avg_session_min = total_minutes / total_sessions if total_sessions else 0.0

        # streak: consecutive days with at least one session, counting back from today
        # If today has no session, start from yesterday; break on first gap
        session_days = {s.at.date() for s in sessions}
        streak = 0
        cursor = now.date()
        # If today has no session, we start checking from yesterday
        if cursor not in session_days:
            cursor = cursor - timedelta(days=1)
        while cursor in session_days:
            streak += 1
            cursor = cursor - timedelta(days=1)

        # sentiment distribution
        sent_dist: Dict[str, int] = defaultdict(int)
        for s in sessions:
            sent_dist[s.sentiment] += 1

        # content exhaustion (unique content_ids / estimated library)
        # We approximate library size by total unique content_ids seen across all households
        # in the same band/language — for now use a conservative floor.
        unique_content = len({s.content_id for s in sessions if s.content_id})
        library_estimate = max(unique_content * 3, 20)  # conservative: assume 3x unseen
        exhaustion = min(1.0, unique_content / library_estimate)

        # churn risk (mirrors EngagementEngine.retention_risk)
        reasons: List[str] = []
        score = 0.0

        inactive_days = (now.date() - last_seen.date()).days
        if inactive_days >= 7:
            score += _RISK_WEIGHTS["inactive_7d"]
            reasons.append(f"no session in {inactive_days} days (novelty decay)")

        if total_sessions >= 4:
            early = sessions[:total_sessions // 2]
            late = sessions[total_sessions // 2:]
            e_avg = sum(s.minutes for s in early) / max(len(early), 1)
            l_avg = sum(s.minutes for s in late) / max(len(late), 1)
            if e_avg > 0 and l_avg < e_avg * 0.6:
                score += _RISK_WEIGHTS["session_decline"]
                reasons.append(f"sessions shortened {e_avg:.0f}->{l_avg:.0f} min")

        if completion_rate < 0.6:
            score += _RISK_WEIGHTS["low_completion"]
            reasons.append(f"completion rate only {completion_rate:.0%}")

        neg = sent_dist.get("negative", 0) + sent_dist.get("frustrated", 0)
        if total_sessions and neg / max(total_sessions, 1) > 0.3:
            score += _RISK_WEIGHTS["negative_sentiment"]
            reasons.append("frustration in 30%+ of sessions")

        if exhaustion >= 0.7:
            score += _RISK_WEIGHTS["content_exhaustion"]
            reasons.append(f"content exhausted ({exhaustion:.0%} of band used)")

        score = max(0.0, min(1.0, score))
        level = "high" if score >= 0.5 else "medium" if score >= 0.25 else "low"
        renewal = round(1.0 - score, 3)

        return HouseholdMetrics(
            anon_user=sessions[0].anon_user,
            first_seen=first_seen, last_seen=last_seen,
            total_sessions=total_sessions, total_minutes=total_minutes,
            active_days=active_days, streak_days=streak,
            completion_rate=round(completion_rate, 3),
            avg_session_min=round(avg_session_min, 1),
            sentiment_dist=dict(sent_dist),
            content_exhaustion=round(exhaustion, 3),
            churn_risk=round(score, 3), risk_level=level,
            risk_reasons=reasons, renewal_probability=renewal)

    # -- public API --
    def household_metrics(self, days: int = 30) -> List[HouseholdMetrics]:
        """Metrics for every household with activity in the window."""
        sessions = self._extract_sessions(days)
        by_user: Dict[str, List[SessionEvent]] = defaultdict(list)
        for s in sessions:
            by_user[s.anon_user].append(s)

        now = datetime.now()
        out = []
        for user, sess in by_user.items():
            out.append(self._aggregate_household(sess, now=now))
        out.sort(key=lambda h: h.churn_risk, reverse=True)
        return out

    def cohort_metrics(self, days: int = 30, cohort_key: str = "all") -> CohortMetrics:
        """Aggregate cohort metrics."""
        hm = self.household_metrics(days)
        if not hm:
            return CohortMetrics(
                name=cohort_key, size=0, dau=0, mau=0,
                avg_streak=0.0, avg_completion=0.0,
                avg_minutes_per_user=0.0,
                churn_distribution={"low": 0, "medium": 0, "high": 0},
                renewal_probability_avg=1.0, revenue_cents=0)

        now = datetime.now()
        today_str = now.date().strftime("%Y-%m-%d")
        week_ago_str = (now.date() - timedelta(days=6)).strftime("%Y-%m-%d")

        dau = sum(1 for h in hm if h.last_seen.strftime("%Y-%m-%d") >= today_str)
        mau = sum(1 for h in hm if h.last_seen.strftime("%Y-%m-%d") >= week_ago_str)

        churn_dist = {"low": 0, "medium": 0, "high": 0}
        for h in hm:
            churn_dist[h.risk_level] = churn_dist.get(h.risk_level, 0) + 1

        return CohortMetrics(
            name=cohort_key,
            size=len(hm),
            dau=dau,
            mau=mau,
            avg_streak=round(sum(h.streak_days for h in hm) / len(hm), 1),
            avg_completion=round(sum(h.completion_rate for h in hm) / len(hm), 3),
            avg_minutes_per_user=round(sum(h.total_minutes for h in hm) / len(hm), 1),
            churn_distribution=churn_dist,
            renewal_probability_avg=round(sum(h.renewal_probability for h in hm) / len(hm), 3),
            revenue_cents=0)  # filled by caller if Stripe live

    def expansion_opportunities(self, days: int = 30, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Households with high content_exhaustion — ready for upsell/new content."""
        hm = self.household_metrics(days)
        opps = [h for h in hm if h.content_exhaustion >= threshold]
        opps.sort(key=lambda h: h.content_exhaustion, reverse=True)
        return [{
            "anon_user": h.anon_user,
            "exhaustion": h.content_exhaustion,
            "band_exhausted": h.content_exhaustion >= 0.9,
            "minutes_30d": h.total_minutes,
            "active_days": h.active_days,
            "streak": h.streak_days,
            "risk_level": h.risk_level,
            "renewal_prob": h.renewal_probability,
        } for h in opps]

    def summary(self, days: int = 30) -> Dict[str, Any]:
        """One-shot summary for the ops dashboard / API."""
        hm = self.household_metrics(days)
        if not hm:
            return {
                "window_days": days,
                "households": 0, "dau": 0, "mau": 0,
                "avg_streak": 0.0, "avg_completion": 0.0,
                "avg_minutes": 0.0,
                "churn_low": 0, "churn_medium": 0, "churn_high": 0,
                "renewal_prob_avg": 1.0,
                "expansion_opportunities": 0,
                "data_source": "data_loop (no learning.session events)",
                "note": "No learning.session events in data loop yet. Wire device telemetry to data_loop.emit('learning.session', ...)."
            }

        now = datetime.now()
        today_str = now.date().strftime("%Y-%m-%d")
        week_ago_str = (now.date() - timedelta(days=6)).strftime("%Y-%m-%d")

        dau = sum(1 for h in hm if h.last_seen.strftime("%Y-%m-%d") >= today_str)
        mau = sum(1 for h in hm if h.last_seen.strftime("%Y-%m-%d") >= week_ago_str)

        churn = {"low": 0, "medium": 0, "high": 0}
        for h in hm:
            churn[h.risk_level] = churn.get(h.risk_level, 0) + 1

        return {
            "window_days": days,
            "households": len(hm),
            "dau": dau,
            "mau": mau,
            "avg_streak": round(sum(h.streak_days for h in hm) / len(hm), 1),
            "avg_completion": round(sum(h.completion_rate for h in hm) / len(hm), 3),
            "avg_minutes": round(sum(h.total_minutes for h in hm) / len(hm), 1),
            "churn_low": churn["low"],
            "churn_medium": churn["medium"],
            "churn_high": churn["high"],
            "renewal_prob_avg": round(sum(h.renewal_probability for h in hm) / len(hm), 3),
            "expansion_opportunities": len([h for h in hm if h.content_exhaustion >= 0.7]),
            "data_source": "data_loop (learning.session events)",
            "top_risk_households": [
                {"anon_user": h.anon_user[:12] + "...", "risk": h.churn_risk,
                 "level": h.risk_level, "reasons": h.risk_reasons[:2]}
                for h in hm[:5]
            ],
            "expansion_ready": [
                {"anon_user": h.anon_user[:12] + "...", "exhaustion": h.content_exhaustion}
                for h in sorted(hm, key=lambda x: x.content_exhaustion, reverse=True)[:5]
            ]
        }


# ── singleton & router ──────────────────────────────────────────────────────
engine = RetentionEngine()


def create_retention_router():
    from fastapi import APIRouter
    router = APIRouter(prefix="/api/retention", tags=["Retention / 真实留存"])

    @router.get("/summary")
    def summary(days: int = 30):
        return {"ok": True, **engine.summary(days)}

    @router.get("/households")
    def households(days: int = 30, limit: int = 100):
        hm = engine.household_metrics(days)[:limit]
        return {"ok": True, "count": len(hm), "households": [
            {"anon_user": h.anon_user, "streak": h.streak_days,
             "completion": h.completion_rate, "minutes": h.total_minutes,
             "active_days": h.active_days, "exhaustion": h.content_exhaustion,
             "risk": h.churn_risk, "level": h.risk_level,
             "reasons": h.risk_reasons, "renewal": h.renewal_probability}
            for h in hm
        ]}

    @router.get("/cohort")
    def cohort(days: int = 30):
        cm = engine.cohort_metrics(days)
        return {"ok": True, **cm.__dict__}

    @router.get("/expansion")
    def expansion(days: int = 30, threshold: float = 0.7):
        return {"ok": True, "opportunities": engine.expansion_opportunities(days, threshold)}

    return router