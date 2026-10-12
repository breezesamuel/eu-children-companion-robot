"""Tests for the referral/affiliate closed loop."""
import sys, os, logging
from datetime import datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

import children_referral as rf

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


eng = rf.ReferralEngine()

# code lifecycle
c1 = eng.get_or_create_code("hh-1")
check("code.created", c1.code.startswith("ref_"))
c1b = eng.get_or_create_code("hh-1")
check("code.idempotent", c1b.code == c1.code)

# click attribution
ok = eng.record_click(c1.code, "hh-2")
check("click.ok", ok)
ok2 = eng.record_click(c1.code, "hh-1")  # self-referral
check("click.self_blocked", ok2 is False)

# velocity limit
for i in range(25):
    eng.record_click(c1.code, f"hh-v{i}")
check("click.velocity_limited", len([c for c in eng.clicks["hh-v24"] if c["at"].startswith(datetime.now().date().isoformat())]) <= rf.MAX_REFERRALS_PER_DAY)

# conversion
out = eng.record_conversion("hh-2", "ord-1", 29900)
check("conversion.attributed", out is not None and out["commission_cents"] > 0)
check("commission.calc", out["commission_cents"] == int(round(29900 * 0.05)))  # BRONZE 5%

# tier upgrade after GMV - need clicks first
for i in range(10):
    hh = f"hh-{i+3}"
    eng.record_click(c1.code, hh)
    eng.record_conversion(hh, f"ord-{i+2}", 30000)
stats = eng.get_referrer_stats("hh-1")
check("tier.upgraded", stats["tier"] in ("SILVER", "GOLD", "PLATINUM"))

# payout cycle
p = eng.create_payout("hh-1", period_days=30)
check("payout.created", p is not None and p.amount_cents > 0)
p2 = eng.mark_payout_paid(p.payout_id, "txn_123")
check("payout.paid", p2.status == "paid" and p2.reference == "txn_123")

# referrals list
refs = eng.list_referrals("hh-1")
check("referrals.listed", len(refs) >= 1)

# admin stats
adm = eng.stats()
check("admin.stats", adm["total_codes"] == 1 and adm["total_conversions"] >= 11)

# disable code
eng.disable_code(c1.code, "fraud")
check("code.disabled", not eng.codes[c1.code].active)

# router mounts
import children_robot_system as m
paths = [getattr(r, "path", "") for r in m.app.routes]
check("router.code", "/api/referral/code" in paths)
check("router.conversion", "/api/referral/conversion" in paths)
check("router.payout", "/api/referral/payout/create" in paths)

n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Referral: {len(R)-n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)