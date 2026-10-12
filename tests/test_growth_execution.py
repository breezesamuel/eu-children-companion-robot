"""Tests for growth execution (plan -> marketplace feed / retailer pitch / ramp / checklist)."""
import os
import sys
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(os.path.join(os.path.dirname(__file__), os.pardir))
logging.disable(logging.CRITICAL)

from children_growth_execution import (  # noqa: E402
    GrowthExecutionEngine, MARKETPLACES, PRODUCT)

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


eng = GrowthExecutionEngine()

# ── marketplace feed ────────────────────────────────────────────────────────
feed = eng.marketplace_feed()
check("feed.rows_match_marketplaces", len(feed["rows"]) == len(MARKETPLACES),
      f"{len(feed['rows'])} vs {len(MARKETPLACES)}")
check("feed.product_sku", feed["product"]["sku"] == "RB-2026-A1")
row = feed["rows"][0]
for f in ("marketplace_id", "channel", "country", "locale", "currency", "sku",
          "price", "subscription_sku", "bullets", "required_units_per_day"):
    check(f"feed.row_has.{f}", f in row)
check("feed.bullets_nonempty", all(len(r["bullets"]) >= 3 for r in feed["rows"]))
check("feed.price_299", row["price"] == 299.0)
check("feed.required_units_positive",
      all(r["required_units_per_day"] > 0 for r in feed["rows"]))
check("feed.has_de_and_fr",
      {"amazon_de", "amazon_fr"} <= {r["marketplace_id"] for r in feed["rows"]})

csv_text = eng.marketplace_feed_csv()
lines = [l for l in csv_text.splitlines() if l.strip()]
check("csv.header", lines[0].startswith("marketplace_id,channel,country"))
check("csv.row_count", len(lines) == len(MARKETPLACES) + 1,
      str(len(lines)))

# ── retailer pitch (honest wholesale maths) ─────────────────────────────────
p40 = eng.retailer_pitch(retail_margin=0.40)
check("pitch.wholesale_math", p40["wholesale_price_cents"] == round(29900 * 0.6),
      str(p40["wholesale_price_cents"]))
check("pitch.hw_margin_consistent",
      p40["our_hardware_margin_cents"] == p40["wholesale_price_cents"] - p40["our_cogs_cents"])
check("pitch.flags_thin_at_40", p40["hardware_only_is_thin"] is True)
check("pitch.warns_when_thin", len(p40["honest_warning"]) > 20)
p30 = eng.retailer_pitch(retail_margin=0.30)
check("pitch.positive_hw_at_30", p30["our_hardware_margin_cents"] > 0,
      str(p30["our_hardware_margin_cents"]))
check("pitch.subscription_carries_value",
      p30["our_subscription_value_cents"] > p30["our_hardware_margin_cents"])
check("pitch.total_margin_positive",
      p30["our_total_margin_per_shelf_sale_cents"] > 0)

# ── ramp schedule (honest build-up, not day-one fantasy) ────────────────────
ramp = eng.ramp_schedule(months=12)
check("ramp.schedule_len", len(ramp["schedule"]) == 12)
covs = [s["coverage_pct"] for s in ramp["schedule"]]
check("ramp.coverage_monotonic", all(b >= a for a, b in zip(covs, covs[1:])), str(covs))
check("ramp.starts_below_target", covs[0] < 100, str(covs[0]))
check("ramp.not_day_one", covs[0] < 20, str(covs[0]))
check("ramp.grows_over_year", covs[-1] > covs[0] * 5, f"{covs[0]} -> {covs[-1]}")
check("ramp.honest_year1_not_full",
      ramp["first_month_at_target"] is None or ramp["first_month_at_target"] > 6,
      str(ramp["first_month_at_target"]))
long_ramp = eng.ramp_schedule(months=36)
check("ramp.reaches_target_eventually",
      long_ramp["first_month_at_target"] is not None,
      str(long_ramp["first_month_at_target"]))
check("ramp.subscriber_base_grows",
      long_ramp["schedule"][-1]["subscriber_base_end"] > long_ramp["schedule"][0]["subscriber_base_end"])

# ── daily checklist ─────────────────────────────────────────────────────────
cl = eng.daily_checklist()
check("checklist.items_present", len(cl["items"]) >= 5)
names = {i["item"] for i in cl["items"]}
for it in ("leads_today", "households_today", "new_subscribers_today",
           "marketplace_listings_live", "retailer_conversations"):
    check(f"checklist.has.{it}", it in names)
check("checklist.marketplace_target", 
      next(i["target"] for i in cl["items"] if i["item"] == "marketplace_listings_live") == len(MARKETPLACES))
check("checklist.households_matches_plan",
      next(i["target"] for i in cl["items"] if i["item"] == "households_today")
      == eng.planner.compute()["required"]["households_per_day"])

# ── full kit ────────────────────────────────────────────────────────────────
kit = eng.execution_kit()
for k in ("plan", "marketplace_feed", "retailer_pitch", "ramp", "daily_checklist"):
    check(f"kit.has.{k}", k in kit)

# ── router mounted ──────────────────────────────────────────────────────────
import children_robot_system as crs  # noqa: E402
paths = [getattr(r, "path", "") for r in crs.app.routes]
for suffix in ("/api/growth-execution/kit", "/api/growth-execution/marketplace-feed",
               "/api/growth-execution/retailer-pitch", "/api/growth-execution/ramp",
               "/api/growth-execution/daily-checklist"):
    check("router" + suffix.replace("/", "."), suffix in paths)

n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Growth execution: {len(R) - n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)
