"""Tests for the Real Retention Engine (children_retention.py).

Deterministic: injects synthetic `learning.session` events into the
data loop with a fixed clock (2026-10-13 12:00:00), then asserts the
engine computes correct household/cohort metrics.
No network, no real time dependencies.
"""
import json
import os
import sys
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

import logging  # noqa: E402
logging.disable(logging.CRITICAL)

from children_data_loop import DataLoop, anon  # noqa: E402
from children_retention import RetentionEngine  # noqa: E402

# ── fixed clock for deterministic tests ────────────────────────────────────
_FIXED_NOW = datetime(2026, 10, 13, 12, 0, 0)


class _FixedDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return _FIXED_NOW


# Patch datetime in the retention module so it uses our fixed clock
import children_retention as _ret_module
_ret_module.datetime = _FixedDatetime

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond)))
    print(f"[{'OK' if cond else 'XX'}] {name} {detail if not cond else ''}")


# ── fresh data loop + engine ───────────────────────────────────────────────
dl = DataLoop()
eng = RetentionEngine(dl)

# ── inject synthetic sessions for two households ────────────────────────────
# All timestamps relative to _FIXED_NOW (2026-10-13 12:00:00)
# hh-1: 5 sessions over Oct 11, 12, 13 — all positive, high completion
for i, (day_offset, mins, act, cid, comp, sent) in enumerate([
    (2, 20, "language_literacy", "eu_de_phonics", True, "positive"),   # Oct 11
    (2, 25, "science_nature", "eu_sci_junior", True, "positive"),      # Oct 11
    (1, 15, "music_movement", "eu_music_early", True, "neutral"),       # Oct 12
    (0, 30, "language_literacy", "eu_de_phonics", True, "positive"),   # Oct 13
    (0, 20, "stories_creativity", "eu_story_early", True, "positive"), # Oct 13
]):
    at = (_FIXED_NOW - timedelta(days=day_offset)).replace(hour=10 + i).isoformat()
    dl.emit("learning.session", "hh-1", cost_cents=mins,
            properties={"minutes": mins, "activity": act,
                        "content_id": cid, "completed": comp,
                        "sentiment": sent}, at=at)

# hh-2: 4 sessions, declining minutes, one frustration, low completion
# Sessions on Oct 8, 9, 11, 12
for i, (day_offset, mins, act, cid, comp, sent) in enumerate([
    (5, 30, "lesson", "eu_de_phonics", True, "positive"),   # Oct 8
    (4, 30, "lesson", "eu_num_junior", True, "positive"),   # Oct 9
    (2, 5, "lesson", "eu_sci_junior", False, "frustrated"), # Oct 11
    (1, 4, "lesson", "eu_music_early", False, "negative"),  # Oct 12
]):
    at = (_FIXED_NOW - timedelta(days=day_offset)).replace(hour=10 + i).isoformat()
    dl.emit("learning.session", "hh-2", cost_cents=mins,
            properties={"minutes": mins, "activity": act,
                        "content_id": cid, "completed": comp,
                        "sentiment": sent}, at=at)

# ── also inject some commerce events (not used by retention) ─────
dl.emit("order.paid", "hh-1", revenue_cents=29900)
dl.emit("lead.created", "hh-3")

# ── test household metrics ─────────────────────────────────────────────────
hm = eng.household_metrics(30)
check("hm.count", len(hm) == 2, f"got {len(hm)}")
hm1 = next(h for h in hm if h.anon_user == anon("hh-1"))
hm2 = next(h for h in hm if h.anon_user == anon("hh-2"))

# hh-1: 5 sessions, 110 mins, 3 active days (Oct 11, 12, 13)
check("hm1.sessions", hm1.total_sessions == 5)
check("hm1.minutes", hm1.total_minutes == 110)
check("hm1.active_days", hm1.active_days == 3)
# streak: Oct 13, 12, 11 consecutive = 3
check("hm1.streak", hm1.streak_days == 3, f"got {hm1.streak_days}")
check("hm1.completion", hm1.completion_rate == 1.0)
check("hm1.risk_low", hm1.risk_level == "low", f"got {hm1.risk_level}: {hm1.risk_reasons}")
check("hm1.renewal_high", hm1.renewal_probability >= 0.95)

# hh-2: 4 sessions, 69 mins, 4 active days (Oct 8, 9, 11, 12)
check("hm2.sessions", hm2.total_sessions == 4)
check("hm2.minutes", hm2.total_minutes == 69)
check("hm2.active_days", hm2.active_days == 4)
# streak from Oct 13: Oct 12, 11 consecutive = 2 (Oct 10 missing)
check("hm2.streak", hm2.streak_days == 2, f"got {hm2.streak_days}")
check("hm2.completion_low", hm2.completion_rate < 0.6, f"got {hm2.completion_rate}")
check("hm2.risk_not_low", hm2.risk_level in ("medium", "high"), f"got {hm2.risk_level}: {hm2.risk_reasons}")
check("hm2.renewal_low", hm2.renewal_probability < 0.8)

# ── test cohort metrics ────────────────────────────────────────────────────
cm = eng.cohort_metrics(30)
check("cm.size", cm.size == 2)
# DAU: sessions on Oct 13 (day 0) -> hh1 has 2, hh2 has 0 -> DAU=1
check("cm.dau", cm.dau == 1, f"got {cm.dau}")
# MAU: sessions in last 7 days (Oct 7-13) -> both have sessions -> MAU=2
check("cm.mau", cm.mau == 2, f"got {cm.mau}")
# avg_completion = (1.0 + 0.5) / 2 = 0.75
check("cm.avg_completion", round(cm.avg_completion, 3) == 0.75, f"got {cm.avg_completion}")
# churn: hh1=low, hh2=high -> low=1, high=1
check("cm.churn_dist", cm.churn_distribution.get("low", 0) == 1 and cm.churn_distribution.get("high", 0) == 1)
check("cm.renewal_avg", cm.renewal_probability_avg < 0.9 and cm.renewal_probability_avg > 0.7)

# ── test summary ───────────────────────────────────────────────────────────
s = eng.summary(30)
check("summary.households", s["households"] == 2)
check("summary.dau", s["dau"] == 1)
check("summary.mau", s["mau"] == 2)
check("summary.data_source", "data_loop" in s["data_source"])
check("summary.has_top_risk", len(s["top_risk_households"]) == 2)
check("summary.expansion", s["expansion_opportunities"] == 0)  # exhaustion < 0.7

# ── test expansion opportunities (exhaustion threshold) ─────
# inject more unique content for hh-1 to push exhaustion
for i in range(15):
    dl.emit("learning.session", "hh-1", cost_cents=10,
            properties={"minutes": 10, "activity": "lesson",
                        "content_id": f"new_content_{i}", "completed": True,
                        "sentiment": "positive"},
            at=(_FIXED_NOW - timedelta(days=10)).isoformat())

hm2 = eng.household_metrics(30)
hm1_new = next(h for h in hm2 if h.anon_user == anon("hh-1"))
# unique content = 5 original + 15 new = 20; library = max(20*3, 20) = 60; exhaustion = 20/60 = 0.33
check("expansion.empty_at_low", len(eng.expansion_opportunities(30, 0.7)) == 0)

# ── test router (fresh engine for isolation) ──────────────────────────────
from fastapi.testclient import TestClient  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from children_retention import create_retention_router, RetentionEngine  # noqa: E402
import children_retention as _ret_module

# fresh data loop + engine for API tests
api_dl = DataLoop()
api_eng = RetentionEngine(api_dl)
# inject same test data
for i, (day_offset, mins, act, cid, comp, sent) in enumerate([
    (2, 20, "language_literacy", "eu_de_phonics", True, "positive"),
    (2, 25, "science_nature", "eu_sci_junior", True, "positive"),
    (1, 15, "music_movement", "eu_music_early", True, "neutral"),
    (0, 30, "language_literacy", "eu_de_phonics", True, "positive"),
    (0, 20, "stories_creativity", "eu_story_early", True, "positive"),
]):
    at = (_FIXED_NOW - timedelta(days=day_offset)).replace(hour=10 + i).isoformat()
    api_dl.emit("learning.session", "hh-1", cost_cents=mins,
                properties={"minutes": mins, "activity": act,
                            "content_id": cid, "completed": comp,
                            "sentiment": sent}, at=at)
for i, (day_offset, mins, act, cid, comp, sent) in enumerate([
    (5, 30, "lesson", "eu_de_phonics", True, "positive"),
    (4, 30, "lesson", "eu_num_junior", True, "positive"),
    (2, 5, "lesson", "eu_sci_junior", False, "frustrated"),
    (1, 4, "lesson", "eu_music_early", False, "negative"),
]):
    at = (_FIXED_NOW - timedelta(days=day_offset)).replace(hour=10 + i).isoformat()
    api_dl.emit("learning.session", "hh-2", cost_cents=mins,
                properties={"minutes": mins, "activity": act,
                            "content_id": cid, "completed": comp,
                            "sentiment": sent}, at=at)

# patch the module's engine before creating router
_ret_module.engine = api_eng

app = FastAPI()
app.include_router(create_retention_router())
client = TestClient(app)

r1 = client.get("/api/retention/summary?days=30")
check("api.summary_200", r1.status_code == 200)
j1 = r1.json()
check("api.summary_ok", j1.get("ok") is True)
check("api.summary_households", j1.get("households") == 2)

r2 = client.get("/api/retention/households?days=30&limit=10")
check("api.households_200", r2.status_code == 200)
j2 = r2.json()
check("api.households_count", j2.get("count") == 2)

r3 = client.get("/api/retention/cohort?days=30")
check("api.cohort_200", r3.status_code == 200)
j3 = r3.json()
check("api.cohort_size", j3.get("size") == 2)

r4 = client.get("/api/retention/expansion?days=30&threshold=0.7")
check("api.expansion_200", r4.status_code == 200)
j4 = r4.json()
check("api.expansion_ok", j4.get("ok") is True)

# ── empty data loop ────────────────────────────────────────────────────────
empty_dl = DataLoop()
empty_eng = RetentionEngine(empty_dl)
s_empty = empty_eng.summary(30)
check("empty.households_zero", s_empty["households"] == 0)
check("empty.dau_zero", s_empty["dau"] == 0)
check("empty.note_present", "no learning.session events" in (s_empty.get("note") or "").lower())

ok = sum(1 for _, v in R if v)
print(f"\n{'=' * 60}\nRetention: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v in R:
    if not v:
        print("  FAILED:", n)
sys.exit(0 if ok == len(R) else 1)