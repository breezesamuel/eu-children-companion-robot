"""Tests for the site-wide paywall + referral free-usage rewards.

Covers the operator-published rule: 10 free uses, then a subscription is
required; unlock only off a *verified* payment or a real subscription; and the
invite-N-pay-M reward tiers for both the USD and CNY tracks.
"""
import os
import sys
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

import children_paywall as pw
import children_subscription as sub
import children_referral as rf
import children_payment as pay

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


# ── pricing catalog ─────────────────────────────────────────────────────────
check("plan.en.monthly", sub.PLANS["SUB-EN-M"].price_cents == 2990
      and sub.PLANS["SUB-EN-M"].currency == "USD")
check("plan.en.quarter", sub.PLANS["SUB-EN-Q"].price_cents == 7990
      and sub.PLANS["SUB-EN-Q"].period_months() == 3)
check("plan.en.yearly", sub.PLANS["SUB-EN-Y"].price_cents == 29900
      and sub.PLANS["SUB-EN-Y"].period_months() == 12)
check("plan.zh.monthly", sub.PLANS["SUB-ZH-M"].price_cents == 6000
      and sub.PLANS["SUB-ZH-M"].currency == "CNY")
check("plan.zh.quarter", sub.PLANS["SUB-ZH-Q"].price_cents == 15000)
check("plan.zh.yearly", sub.PLANS["SUB-ZH-Y"].price_cents == 50000)

for region in ("en", "zh"):
    tiers = sub.plans_for_region(region)
    check(f"plans_for_region.{region}", len(tiers) == 3
          and [t.period_months() for t in tiers] == [1, 3, 12])

# quarterly plan must not break MRR aggregation
_qsub = sub.subscription_engine.create_subscription("mrr-cust", "SUB-EN-Q")
_metrics = sub.subscription_engine.get_metrics()
check("metrics.quarterly_ok", _metrics["mrr_cents"] > 0 and _metrics["total_subscriptions"] >= 1)


# ── paywall free quota ──────────────────────────────────────────────────────
def fresh_engine(free=10, allow_mock=False):
    store = None
    try:
        from state_store import MemoryStore  # type: ignore
        store = MemoryStore()
    except Exception:  # noqa: BLE001
        try:
            from scripts.state_store import MemoryStore  # type: ignore
            store = MemoryStore()
        except Exception:  # noqa: BLE001
            store = None
    return pw.PaywallEngine(store=store, free_uses=free, allow_mock=allow_mock)


pe = fresh_engine()
allowed = [pe.consume("v1")["allowed"] for _ in range(10)]
check("free.first10_allowed", all(allowed) and len(allowed) == 10)

r11 = pe.consume("v1")
check("free.11th_locked", r11["allowed"] is False and r11["locked"] is True)
check("free.11th_plans", isinstance(r11.get("plans"), list) and len(r11["plans"]) >= 1)

st = pe.status("v1")
check("status.remaining0", st["remaining"] == 0 and st["locked"] is True and st["used"] == 10)
check("status.settlement_field", "settlement_alipay" in st)

# a different visitor still has a full quota
check("quota.per_visitor", pe.status("v2")["remaining"] == 10)

# ── unlock requires verification ────────────────────────────────────────────
bad = pe.unlock("v1", subscription_id="does-not-exist")
check("unlock.unknown_sub_rejected", bad["ok"] is False)

mock_rec = pay.payment_gateway.capture("ord-pw", "card", 2990)
strict = fresh_engine(allow_mock=False)
rejected = strict.unlock("v1", plan_id="SUB-EN-M", payment_id=mock_rec.payment_id)
check("unlock.mock_rejected", rejected["ok"] is False and "mock" in rejected.get("error", ""))

lenient = fresh_engine(allow_mock=True)
accepted = lenient.unlock("v1", plan_id="SUB-EN-M", payment_id=mock_rec.payment_id)
check("unlock.mock_allowed_when_flagged", accepted["ok"] is True and accepted["months"] == 1)
check("unlock.unlocks_quota", lenient.status("v1")["unlocked"] is True)

# operator rule: a trial subscription is NOT a payment -> no unlock ...
s = sub.subscription_engine.create_subscription("pw-cust", "SUB-EN-Y")
trial_try = pe.unlock("v3", plan_id="SUB-EN-Y", subscription_id=s.subscription_id)
check("unlock.trial_rejected", trial_try["ok"] is False and "trial" in trial_try.get("error", ""))

# ... unless the operator explicitly opts trials in
os.environ["PAYWALL_TRIAL_UNLOCKS"] = "1"
good = pe.unlock("v3", plan_id="SUB-EN-Y", subscription_id=s.subscription_id)
os.environ.pop("PAYWALL_TRIAL_UNLOCKS", None)
check("unlock.trial_optin_ok", good["ok"] is True and good["months"] == 12)
check("unlock.unlocked_after_sub", pe.status("v3")["unlocked"] is True)
# now unlimited even past 10
check("unlock.consume_unlimited", pe.consume("v3")["allowed"] is True)

# internal grant
g = pe.grant("v4", 3, reason="test")
check("grant.works", g["ok"] is True and pe.status("v4")["unlocked"] is True)
check("grant.zero_rejected", pe.grant("v5", 0)["ok"] is False)


# ── referral free-usage rewards ─────────────────────────────────────────────
eng = rf.ReferralEngine()
eng.get_or_create_code("ref-A")
# 3 referees, each pays a USD quarter (7990) -> tiers 1 and 2 earned
for i in range(3):
    hh = f"buyer-A{i}"
    eng.record_click(eng.household_to_code["ref-A"], hh)
    eng.record_referral_payment(hh, f"ord-A{i}", 7990, "USD")

ev = eng.evaluate_rewards("ref-A", "USD")
ids = {e["id"] for e in ev["earned"]}
check("rewards.usd.earned_1_3", "usd-invite-1" in ids and "usd-invite-3" in ids)
check("rewards.usd.claimable_months", ev["claimable_months"] == 1 + 3)

claimed = eng.claim_rewards("ref-A", "USD", visitor_id="visitor-A")
check("rewards.claim.grants4", claimed["granted_months"] == 4)
again = eng.claim_rewards("ref-A", "USD", visitor_id="visitor-A")
check("rewards.claim.idempotent", again["granted_months"] == 0)

# CNY track: 10 buyers paying the 500-yuan yearly -> full-year reward
eng2 = rf.ReferralEngine()
eng2.get_or_create_code("ref-Z")
for i in range(10):
    hh = f"buyer-Z{i}"
    eng2.record_click(eng2.household_to_code["ref-Z"], hh)
    eng2.record_referral_payment(hh, f"ord-Z{i}", 50000, "CNY")
evz = eng2.evaluate_rewards("ref-Z", "CNY")
idsz = {e["id"] for e in evz["earned"]}
check("rewards.cny.year", "cny-invite-10" in idsz)
check("rewards.cny.months", evz["claimable_months"] == 1 + 3 + 12)


# ── router wiring ───────────────────────────────────────────────────────────
import children_robot_system as m
paths = [getattr(r, "path", "") for r in m.app.routes]
check("router.paywall.status", "/api/paywall/status" in paths)
check("router.paywall.consume", "/api/paywall/consume" in paths)
check("router.paywall.unlock", "/api/paywall/unlock" in paths)
check("router.subs.plans", "/api/subscriptions/plans" in paths)
check("router.referral.rewards", "/api/referral/rewards" in paths)
check("router.referral.claim", "/api/referral/rewards/claim" in paths)

# ── full HTTP checkout path (router + engines) ──────────────────────────────
from fastapi.testclient import TestClient  # noqa: E402
pw.paywall.allow_mock = True  # dev/CI capture is a mock, unlock must be allowed
client = TestClient(m.app)
resp = client.post("/api/paywall/subscribe",
                   json={"visitor_id": "router-vis", "plan_id": "SUB-EN-M"})
body = resp.json()
check("http.subscribe.ok", resp.status_code == 200 and body["ok"] is True)
check("http.subscribe.mock_flag", isinstance(body["payment"]["mock"], bool))
check("http.subscribe.unlocked", body["unlock"]["unlocked"] is True)
st2 = client.get("/api/paywall/status", params={"visitor_id": "router-vis"}).json()
check("http.status.unlocked", st2["unlocked"] is True)
cons = client.post("/api/paywall/consume",
                   json={"visitor_id": f"router-fresh-{os.getpid()}-{id(R)}"}).json()
check("http.consume.fresh_allowed", cons["allowed"] is True and cons["remaining"] == 9)
grant_denied = client.post("/api/paywall/grant",
                           json={"visitor_id": "router-vis", "months": 1}).json()
check("http.grant.needs_internal_key", grant_denied["ok"] is False)

n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Paywall: {len(R)-n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)
