"""End-to-end test for the autonomous ops loop (SOP hunter -> 11 phase cycle).

Runs fully offline: the GitHub hunter uses its bundled fixture, so this test
never touches the network and is safe in CI.
"""
import sys, os, json, logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
sys.path.insert(0, os.path.join(sys.path[0], "scripts"))
logging.disable(logging.CRITICAL)

from sop_license_gate import classify, is_allowed, normalise
import github_hunter as gh
from autonomous_ops import AutonomousOps, PHASES

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


# ── 1. license gate (the hard gate) ──────────────────────────────────────────
check("gate.allow_mit", classify("MIT").allowed)
check("gate.allow_apache", classify("Apache-2.0").allowed)
check("gate.allow_bsd3", classify("BSD-3-Clause").allowed)
check("gate.allow_isc", classify("ISC").allowed)
check("gate.deny_gpl", not classify("GPL-3.0").allowed)
check("gate.deny_agpl", not classify("AGPL-3.0").allowed)
check("gate.deny_sspl", not classify("SSPL-1.0").allowed)
check("gate.deny_bsl", not classify("BSL-1.1").allowed)
check("gate.deny_mpl", not classify("MPL-2.0").allowed)
check("gate.unknown_is_deny", not classify(None).allowed)
check("gate.empty_is_deny", not classify("").allowed)
check("gate.noassertion_is_deny", not classify("NOASSERTION").allowed)
check("gate.garbage_is_deny", not classify("some random words").allowed)
check("gate.dict_form", classify({"spdx_id": "MIT"}).allowed)
check("gate.dict_type_form", classify({"type": "Apache-2.0"}).allowed)
# license *body* fingerprinting (wheel LICENSE file case)
check("gate.body_mit",
      classify("Permission is hereby granted, free of charge, to any person...").allowed)
check("gate.body_agpl",
      not classify("GNU AFFERO GENERAL PUBLIC LICENSE Version 3").allowed)
check("gate.body_gpl3",
      not classify("GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007").allowed)
# SPDX expressions: OR = may pick any (dual-licence), AND = need all
check("gate.spdx_or_allows_permissive_choice",
      classify("MIT OR GPL-3.0").allowed)          # dual-licensed -> use MIT
check("gate.spdx_or_all_denied",
      not classify("GPL-3.0 OR AGPL-3.0").allowed)
check("gate.spdx_and_requires_all",
      not classify("MIT AND GPL-3.0").allowed)
check("gate.spdx_and_all_permissive",
      classify("BSD-3-Clause AND MIT AND Zlib AND CC0-1.0").allowed)
check("gate.alias_mit_license", classify("MIT License").allowed)
check("gate.mit0_allowed", classify("MIT-0").allowed)
check("gate.apache_software_license_alias",
      classify("Apache Software License").allowed)
check("gate.zlib_allowed", classify("Zlib").allowed)
check("gate.trailing_punct", classify("MIT)").allowed)
check("gate.normalise_apache_alias", normalise("Apache 2.0") == "APACHE-2.0")


# ── 2. hunter: five dimension screen ─────────────────────────────────────────
mit_repo = {"full_name": "acme/x", "html_url": "u", "description": "d",
            "stargazers_count": 1000, "forks_count": 100, "language": "Python",
            "archived": False, "pushed_at": "2099-01-01T00:00:00Z",
            "license": {"spdx_id": "MIT"}}
s = gh.screen_repo(mit_repo)
check("hunter.mit_repo_passes", s.verdict == "PASS", str(s.dimensions))
check("hunter.score_perfect", s.score == 1.0, str(s.score))

agpl_repo = dict(mit_repo, license={"spdx_id": "AGPL-3.0"})
check("hunter.agpl_denied", gh.screen_repo(agpl_repo).verdict == "DENY")

unknown_repo = dict(mit_repo, license=None)
check("hunter.unknown_license_denied",
      gh.screen_repo(unknown_repo).verdict == "DENY")

stale_repo = dict(mit_repo, pushed_at="2019-01-01T00:00:00Z")
check("hunter.stale_denied", gh.screen_repo(stale_repo).verdict == "DENY")

weak_repo = dict(mit_repo, stargazers_count=3, forks_count=0)
check("hunter.weak_community_denied", gh.screen_repo(weak_repo).verdict == "DENY")

archived_repo = dict(mit_repo, archived=True)
check("hunter.archived_denied", gh.screen_repo(archived_repo).verdict == "DENY")

bad_lang = dict(mit_repo, language="COBOL")
check("hunter.bad_language_denied", gh.screen_repo(bad_lang).verdict == "DENY")

# offline hunt returns screened fixture, sorted PASS first
hunt = gh.hunt(["x"], 10, offline=True)
check("hunter.offline_runs", len(hunt) >= 1)
check("hunter.offline_sorted_pass_first",
      all(hunt[i].verdict == "PASS" or hunt[i - 1].verdict != "PASS"
          for i in range(1, len(hunt))) or hunt[0].verdict == "PASS")

# 5 dimensions always reported
check("hunter.five_dimensions", all(
    set(r.dimensions) == {"license", "activity", "community", "stack", "maturity"}
    for r in hunt))


# ── 3. full autonomous cycle ─────────────────────────────────────────────────
ops = AutonomousOps(hunter_offline=True)
rep = ops.run_cycle()
check("cycle.returns_report", isinstance(rep, dict))
check("cycle.all_phases_present", set(rep["phases"]) >= set(PHASES),
      str(set(PHASES) - set(rep["phases"])))
check("cycle.all_phases_ok", rep["ok"] is True,
      json.dumps({k: v.get("error") for k, v in rep["phases"].items()
                  if v["status"] != "ok"}, ensure_ascii=False))

# phase content
c = rep["phases"]["collect"]["summary"]
check("cycle.collect_scanned", c["discovered"] >= 1)
check("cycle.collect_mode_offline", c["mode"] == "offline")
p = rep["phases"]["price"]["summary"]
check("cycle.price_quotes", len(p["quotes"]) == 4)
check("cycle.price_margin_positive", p["min_margin_pct"] > 0)
r = rep["phases"]["route"]["summary"]
check("cycle.route_assigned", len(r["warehouses"]) >= 1)
check("cycle.route_fraud_verdict", r["fraud"]["verdict"] in ("approve", "review", "decline"))
check("cycle.route_vat", r["vat"]["rate"] > 0)
f = rep["phases"]["fulfill"]["summary"]
check("cycle.fulfill_tracking", bool(f["tracking"]))
a = rep["phases"]["aftersales"]["summary"]
check("cycle.rma_resolved", a["final_state"] == "resolved")
check("cycle.rma_analytics", a["analytics"]["total"] >= 1)
l = rep["phases"]["learn"]["summary"]
check("cycle.learn_feedback", l["feedback_recorded"] == 5)
e = rep["phases"]["evolve"]["summary"]
check("cycle.evolve_decided", e["decision"] in
      ("promoted", "recommend_promotion", "inconclusive", "rolled_back"),
      str(e["decision"]))

# newly-wired corners: 入库 / 上架·内容官 / 支付 / 外联·跟进
ing = rep["phases"]["ingest"]["summary"]
check("cycle.ingest_registered", bool(ing["sku"]) and ing["lessons"] >= 1, str(ing))
pub = rep["phases"]["publish"]["summary"]
check("cycle.publish_draft", bool(pub["draft_id"]))
check("cycle.publish_submitted", pub["submitted"] is True)
check("cycle.publish_terminal", pub["status"] in ("in_review", "published"))
check("cycle.publish_priced", pub["price_cents"] > 0)
pay = rep["phases"]["payment"]["summary"]
check("cycle.payment_captured", pay["status"] == "captured", str(pay))
check("cycle.payment_net_positive", pay["net_cents"] > 0)
check("cycle.payment_mock_explicit", pay["mock"] is True)
check("cycle.payment_reconcile",
      pay["reconcile"]["captured_cents"] >= pay["amount_cents"])
out = rep["phases"]["outreach"]["summary"]
check("cycle.outreach_consent_enrolled", out["enrolled"] is True)
check("cycle.outreach_sent", out["messages_sent"] >= 1)
check("cycle.outreach_followup", out["followups_due"] >= 1)
check("cycle.refund_issued",
      rep["phases"]["aftersales"]["summary"]["refunded_cents"] == 999)

# the product-side retention flywheel: 有人用 / 会复购 的循环
eng = rep["phases"]["engage"]["summary"]
check("cycle.engage_ran", eng["minutes"] >= 0)
check("cycle.engage_parent_report", eng["parent_report"]["headline"] != "")
check("cycle.engage_risk_bounded", 0.0 <= eng["churn_risk"] <= 1.0)
check("cycle.engage_renewal_probability",
      0.0 <= eng["renewal_probability"] <= 1.0)
check("cycle.engage_plan_adaptive", len(eng["next_plan"]) >= 1,
      str(eng["next_plan"]))
check("cycle.engage_report_subjects",
      len(eng["parent_report"]["subjects_covered"]) >= 1)
check("cycle.ingest_sells_eu_content",
      rep["phases"]["ingest"]["summary"]["market_package"] == "EU" and
      rep["phases"]["ingest"]["summary"]["lessons"] >= 5)
check("cycle.publish_lists_eu_content",
      rep["phases"]["publish"]["summary"]["price_cents"] > 0)

# metrics wired into the loop
fun = rep["metrics"]["funnel"]["stages"]
check("cycle.funnel_acquisition", fun["acquisition"] >= 1)
check("cycle.funnel_consultation", fun["consultation"] >= 1)
check("cycle.funnel_payment", fun["payment"] >= 1)
check("cycle.funnel_logistics", fun["logistics"] >= 1)
check("cycle.funnel_aftersales", fun["aftersales"] >= 1)
check("cycle.funnel_all_six_stages", all(v >= 1 for v in fun.values()), str(fun))
rol = rep["metrics"]["rollup"]
check("cycle.rollup_revenue", rol["revenue_cents"] > 0)
check("cycle.rollup_orders", rol["orders"] >= 1)
check("cycle.rollup_ltv_over_cac", rol["ltv_over_cac"] is not None)


# ── 4. resilience: a broken phase is isolated, loop still completes ──────────
def boom():
    raise RuntimeError("injected failure")

ops2 = AutonomousOps(hunter_offline=True)
ops2.phase_price = boom  # monkeypatch one phase to fail
rep2 = ops2.run_cycle()
check("resilience.broken_phase_fails_gracefully",
      rep2["phases"]["price"]["status"] == "failed")
check("resilience.broken_phase_records_error",
      "injected failure" in rep2["phases"]["price"]["error"])
check("resilience.other_phases_still_run",
      rep2["phases"]["collect"]["status"] == "ok" and
      rep2["phases"]["learn"]["status"] == "ok")
check("resilience.overall_marked_not_ok", rep2["ok"] is False)


# ── 5. consecutive cycles stay green (24/7 stability) ────────────────────────
ops3 = AutonomousOps(hunter_offline=True)
oks = [ops3.run_cycle()["ok"] for _ in range(3)]
check("stability.three_cycles_green", all(oks), str(oks))


ok = sum(1 for _, v, _ in R if v)
print(f"\n{'='*60}\nAutonomous flow: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v, d in R:
    if not v:
        print("  FAILED:", n, d)
sys.exit(0 if ok == len(R) else 1)
