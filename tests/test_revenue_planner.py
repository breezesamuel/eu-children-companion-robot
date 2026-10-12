"""Tests for the revenue-target planner (日需 → 每日必须量 → 实绩缺口)."""
import os
import sys
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(os.path.join(os.path.dirname(__file__), os.pardir))
logging.disable(logging.CRITICAL)

from children_revenue_planner import RevenuePlanner, Assumptions  # noqa: E402

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


p = RevenuePlanner()

# ── target translation ──────────────────────────────────────────────────────
plan = p.compute()
check("target.daily_cny_default", plan["target"]["daily_cny"] == 55556.0)
check("target.daily_eur", abs(plan["target"]["daily_eur"] - 7122.56) < 1.0,
      str(plan["target"]["daily_eur"]))
check("target.yearly_eur_millions", plan["target"]["yearly_eur"] > 2_500_000)

# ── unit economics come from the real catalogue ─────────────────────────────
ue = plan["unit_economics_cents"]
check("ue.robot_margin", ue["robot_margin"] == 11800, str(ue["robot_margin"]))
check("ue.robot_price", ue["robot_price"] == 29900)
check("ue.robot_cost", ue["robot_cost"] == 18100)
check("ue.blended_arpu", abs(ue["blended_arpu_month"] - 3590.0) < 1.0)
check("ue.sub_net_positive", ue["sub_net_month"] > 3000)
check("ue.contribution_household",
      30000 < ue["contribution_per_household_year1"] < 33000,
      str(ue["contribution_per_household_year1"]))

# ── required volumes ────────────────────────────────────────────────────────
req = plan["required"]
check("req.households_per_day_range", 20 <= req["households_per_day"] <= 26,
      str(req["households_per_day"]))
check("req.households_per_year_range",
      7000 <= req["households_per_year"] <= 9500, str(req["households_per_year"]))
check("req.steady_subs_range",
      5500 <= req["steady_state_subscribers"] <= 8000,
      str(req["steady_state_subscribers"]))
check("req.new_subs_positive", req["new_subscribers_per_month"] > 0)
check("req.leads_positive", req["leads_per_day"] > req["households_per_day"])

# ── channels sum to the required volume ─────────────────────────────────────
ch = p.channel_plan()
total = sum(r["households_per_day"] for r in ch["channels"])
check("channels.sum_matches", abs(total - ch["households_per_day_total"]) < 0.1,
      f"{total} vs {ch['households_per_day_total']}")
check("channels.count", len(ch["channels"]) == 4)
check("channels.has_marketplace",
      any(r["channel"] == "marketplace" for r in ch["channels"]))

# ── target is overridable ───────────────────────────────────────────────────
p2 = RevenuePlanner()
p2.set_target(27778.0)  # half
half = p2.compute()
check("target.halved_halves_volume",
      abs(half["required"]["households_per_day"] - plan["required"]["households_per_day"] / 2) < 1.5,
      str(half["required"]["households_per_day"]))

# ── assumptions move the target in the honest direction ─────────────────────
p3 = RevenuePlanner()
base = p3.compute()["required"]["households_per_day"]
p3.set_assumptions(monthly_churn=0.10)  # worse retention -> harder target
worse = p3.compute()["required"]["households_per_day"]
check("assump.churn_up_needs_more", worse > base, f"{worse} vs {base}")
p3.set_assumptions(monthly_churn=0.05, attach_rate=0.90)
better = p3.compute()["required"]["households_per_day"]
check("assump.attach_up_needs_less", better < base, f"{better} vs {base}")

# ── actuals and gap ─────────────────────────────────────────────────────────
p4 = RevenuePlanner()
before = p4.gap()
check("gap.empty_coverage_zero", before["coverage_pct"] == 0.0)
check("gap.empty_not_on_target", before["on_target"] is False)
p4.record_actual(712256)  # exactly one day of the target in EUR cents
g = p4.gap()
check("gap.full_coverage", g["coverage_pct"] >= 99.0, str(g["coverage_pct"]))
check("gap.on_target", g["on_target"] is True)
p4.record_actual(0)
g2 = p4.gap(window_days=2)
check("gap.window_average", 45 < g2["coverage_pct"] < 55, str(g2["coverage_pct"]))

# ── router mounted in the app ───────────────────────────────────────────────
import children_robot_system as crs  # noqa: E402

paths = [getattr(r, "path", "") for r in crs.app.routes]
for suffix in ("/api/revenue-plan/plan", "/api/revenue-plan/gap",
               "/api/revenue-plan/channels", "/api/revenue-plan/target",
               "/api/revenue-plan/actuals", "/api/revenue-plan/assumptions"):
    check(f"router{suffix.replace('/', '.')}", suffix in paths)

n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Revenue planner: {len(R) - n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)
