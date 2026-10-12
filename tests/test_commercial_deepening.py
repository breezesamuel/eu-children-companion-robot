"""Tests for the commercial-deepening modules:
  * children_subscription   -- trial/dunning/upgrade/downgrade/cancel lifecycle
  * children_content_quality -- review -> score -> redraft closed loop
  * children_support         -- ticket -> SLA -> CSAT closed loop
"""
import sys, os, logging
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


# ═══════════════════════════════════════════════════════════════════════════
# 1. Subscription lifecycle
# ═══════════════════════════════════════════════════════════════════════════
import children_subscription as cs

check("plan.count", len(cs.PLANS) == 4)
check("plan.ids", set(cs.PLANS) == {"SUB-STD-M", "SUB-STD-Y", "SUB-PRO-M", "SUB-PRO-Y"})
check("plan.monthly_period", cs.PLANS["SUB-STD-M"].period_days() == 30)
check("plan.yearly_period", cs.PLANS["SUB-PRO-Y"].period_days() == 365)

eng = cs.SubscriptionEngine()
sub = eng.create_subscription("cust-1", "SUB-STD-M", "pm_1")
check("sub.created_trialing", sub.status == cs.SubscriptionStatus.TRIALING)
check("sub.has_trial_end", bool(sub.trial_end))
check("sub.is_active", sub.is_active())

# upgrade with proration
chg = eng.change_plan(sub.subscription_id, "SUB-PRO-M", prorate=True, immediate=True)
check("sub.upgrade_type", chg.type == cs.ChangeType.UPGRADE)
check("sub.upgrade_plan", sub.plan.plan_id == "SUB-PRO-M")
check("sub.proration_gt_zero", chg.proration_cents > 0)

# downgrade
chg2 = eng.change_plan(sub.subscription_id, "SUB-STD-M", prorate=True, immediate=True)
check("sub.downgrade_type", chg2.type == cs.ChangeType.DOWNGRADE)

# pause / resume
eng.pause_subscription(sub.subscription_id)
check("sub.paused", sub.status == cs.SubscriptionStatus.PAUSED)
eng.resume_subscription(sub.subscription_id)
check("sub.resumed", sub.status == cs.SubscriptionStatus.ACTIVE)

# dunning: failure -> retry (needs a gateway that eventually succeeds)
class _OkPSP:
    def capture(self, order_id, method, amount):
        class _R:
            status = type("S", (), {"value": "captured"})()
        return _R()
eng.payment_gateway = _OkPSP()
eng.record_payment_failure(sub.subscription_id, "card_declined")
check("sub.past_due", sub.status == cs.SubscriptionStatus.PAST_DUE)
check("sub.dunning_stage1", sub.dunning_stage == cs.DunningStage.STAGE_1)
check("sub.next_retry_set", bool(sub.next_retry_at))
ev = eng.process_dunning_retry(sub.subscription_id)
check("sub.dunning_event_recorded", len(eng.dunning_events[sub.subscription_id]) == 2)
check("sub.dunning_recovered", sub.status == cs.SubscriptionStatus.ACTIVE)
check("sub.dunning_cleared", sub.dunning_stage is None)

# cancel / reactivate
eng.cancel_subscription(sub.subscription_id, "too expensive")
check("sub.cancelled", sub.status == cs.SubscriptionStatus.CANCELLED)
eng.reactivate_subscription(sub.subscription_id)
check("sub.reactivated", sub.status == cs.SubscriptionStatus.ACTIVE)

# invoice
inv = eng.generate_invoice(sub.subscription_id)
check("sub.invoice_open", inv.status == "open")
eng.mark_invoice_paid(inv.invoice_id, "pi_123")
check("sub.invoice_paid", inv.status == "paid")

# metrics
m = eng.get_metrics()
check("sub.metrics_total", m["total_subscriptions"] == 1)
check("sub.metrics_active", m["active"] == 1)
check("sub.metrics_mrr_gt0", m["mrr_cents"] > 0)
check("sub.metrics_arr_gt0", m["arr_cents"] > 0)
check("sub.metrics_dist", set(m["plans_distribution"]) == set(cs.PLANS))

# invalid plan rejected
try:
    eng.create_subscription("cust-x", "NOPE")
    check("sub.invalid_plan_rejected", False)
except ValueError:
    check("sub.invalid_plan_rejected", True)


# ═══════════════════════════════════════════════════════════════════════════
# 2. Content quality closed loop
# ═══════════════════════════════════════════════════════════════════════════
import children_content_quality as cq
cqe = cq.ContentQualityEngine()

# prior for unknown content
check("cq.prior_unknown", abs(cqe.quality_score("none") - cq.PRIOR_MEAN) < 1e-6)

# bad content -> flagged + redraft queue
for i in range(4):
    cqe.submit_review("bad", f"h{i}", 2, "de", "6-9")
check("cq.bad_smoothed_low", cqe.quality_score("bad") < cq.LOW_QUALITY_THRESHOLD)
check("cq.bad_flagged", cqe.items["bad"].flagged)
check("cq.redraft_opened", len(cqe.redraft_queue()) == 1)
check("cq.low_quality_list", cqe.low_quality()[0]["content_id"] == "bad")

# good content -> hero when enough 5-stars
for i in range(12):
    cqe.submit_review("good", f"g{i}", 5, "de", "6-9")
check("cq.good_smoothed_high", cqe.quality_score("good") >= cq.HERO_THRESHOLD)
check("cq.hero_list_has_good", cqe.hero_content()[0]["content_id"] == "good")

# rerank pushes good above bad
rank = cqe.rerank(["bad", "good"], {"bad": 1.0, "good": 1.0})
check("cq.rerank_good_first", rank[0]["content_id"] == "good")
check("cq.rerank_weight_gt1", rank[0]["quality_weight"] > 1.0)
check("cq.rerank_weight_lt1", rank[1]["quality_weight"] < 1.0)

# rating validation
try:
    cqe.submit_review("x", "h", 9)
    check("cq.invalid_rating_rejected", False)
except ValueError:
    check("cq.invalid_rating_rejected", True)

# cohort + nps + stats
cohort = cqe.cohort_sentiment("bad")
check("cq.cohort_band", cohort["by_age_band"]["6-9"]["n"] == 4)
check("cq.cohort_lang", cohort["by_language"]["de"]["avg"] == 2.0)
check("cq.nps_promoters", cqe.nps()["promoters"] == 12)
check("cq.nps_detractors", cqe.nps()["detractors"] == 4)
stats = cqe.stats()
check("cq.stats_reviews", stats["total_reviews"] == 16)
check("cq.stats_flagged", stats["low_quality_flagged"] == 1)
check("cq.stats_hero", stats["hero_content"] == 1)
check("cq.stats_queue", stats["redraft_queue_depth"] == 1)

# resolve redraft -> recovers after enough good reviews
req_id = cqe.redraft_queue()[0]["request_id"]
out = cqe.resolve_redraft(req_id, "redrafted", quality_score=4.5)
check("cq.redraft_resolved", out["status"] == "redrafted")
check("cq.redraft_none_left_queued", len(cqe.redraft_queue()) == 0)


# ═══════════════════════════════════════════════════════════════════════════
# 3. Support desk closed loop
# ═══════════════════════════════════════════════════════════════════════════
import children_support as sp
se = sp.SupportEngine()

# triage
tri = se.auto_triage("My robot won't turn on", "battery broken no sound")
check("support.triage_device_urgent", tri == {"category": "device", "priority": "urgent"})
tri2 = se.auto_triage("I was charged twice", "please refund")
check("support.triage_billing", tri2["category"] == "billing" and tri2["priority"] == "high")
tri3 = se.auto_triage("hello", "random text")
check("support.triage_default", tri3 == {"category": "other", "priority": "normal"})

# KB deflection on create
t_def = se.create_ticket("hh-1", "How do I pair the robot?", "bluetooth pairing")
check("support.auto_deflected", t_def.auto_deflected and t_def.status == "resolved")
check("support.deflection_answer", bool(t_def.resolution))

# full lifecycle (no auto-deflect)
t = se.create_ticket("hh-2", "Robot won't turn on", "broken battery",
                     channel="email", auto_deflect=False)
check("support.created_new", t.status == "new" and t.category == "device")
check("support.sla_due_set", bool(t.sla_first_response_due) and bool(t.sla_resolve_due))
check("support.assign", se.assign(t.ticket_id, "agent-1").assignee == "agent-1")
se.add_message(t.ticket_id, "agent", "we're on it")
check("support.first_response_set", bool(t.first_response_at))
se.escalate(t.ticket_id, "customer upset")
check("support.escalated", t.escalation_level == 1 and t.priority == "high")
se.resolve(t.ticket_id, "replacement sent")
check("support.resolved", t.status == "resolved" and bool(t.resolved_at))
se.record_csat(t.ticket_id, 5, "great")
check("support.csat_saved", t.csat_score == 5)
se.close(t.ticket_id)
check("support.closed", t.status == "closed")

# reopen
se.reopen(t.ticket_id, "still broken")
check("support.reopened", t.status == "open" and t.resolved_at is None)

# SLA + stats
sla = se.sla_report()
check("support.sla_tickets", sla["tickets"] == 2)
check("support.sla_fr_pct", 0 <= sla["first_response_sla_pct"] <= 100)
check("support.sla_res_pct", 0 <= sla["resolution_sla_pct"] <= 100)
st = se.stats()
check("support.stats_total", st["total_tickets"] == 2)
check("support.stats_deflection", st["auto_deflection_rate"] > 0)
check("support.stats_csat", st["csat_avg"] == 5.0)
check("support.stats_backlog", st["open_backlog"] >= 1)

# csat validation via route
from fastapi import FastAPI
from fastapi.testclient import TestClient
app = FastAPI(); app.include_router(sp.create_support_router())
cli = TestClient(app)
r = cli.post("/api/support/tickets", json={"household_id": "hh-3", "subject": "refund please",
                                           "body": "double charge", "auto_deflect": False})
check("support.http_create", r.status_code == 200 and r.json()["ticket"]["category"] == "billing")
tid = r.json()["ticket"]["ticket_id"]
check("support.http_stats", cli.get("/api/support/stats").status_code == 200)
check("support.http_sla", cli.get("/api/support/sla").status_code == 200)
check("support.http_kb", cli.get("/api/support/kb?q=pair").status_code == 200)
check("support.http_overdue", cli.get("/api/support/overdue").status_code == 200)
r = cli.post("/api/support/deflect", json={"query": "how to factory reset"})
check("support.http_deflect", r.status_code == 200 and r.json()["deflected"] is True)
check("support.http_get", cli.get(f"/api/support/tickets/{tid}").status_code == 200)
check("support.http_csat_bad", cli.post(f"/api/support/tickets/{tid}/csat",
                                        json={"score": 9}).status_code == 422)
check("support.http_resolve", cli.post(f"/api/support/tickets/{tid}/resolve",
                                       json={"resolution": "done"}).status_code == 200)


# ═══════════════════════════════════════════════════════════════════════════
# 4. Router mounts on the real app + loop integration
# ═══════════════════════════════════════════════════════════════════════════
import children_robot_system as m
paths = [getattr(r, "path", "") for r in m.app.routes]
check("router.subscriptions", "/api/subscriptions/metrics" in paths)
check("router.content_quality", "/api/content-quality/stats" in paths)
check("router.support", "/api/support/stats" in paths)


n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Commercial deepening: {len(R)-n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)
