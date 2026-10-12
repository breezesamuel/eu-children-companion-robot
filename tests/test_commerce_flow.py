"""End-to-end smoke test for the 16-step commerce workflow modules."""
import sys, json, io, logging
sys.path.insert(0, '.')
logging.disable(logging.CRITICAL)

from children_pricing import PricingEngine, CostModel, CompetitorPrice
from children_order_routing import OrderRouter, OrderLine, Destination
from children_logistics import LogisticsManager, Address, Parcel
from children_rma import RMAService, ReturnReason, Disposition
from children_crm import CRM, Contact, Sequence, OutreachStep, Stage
from children_data_loop import DataLoop
from children_self_learning import SelfLearningEngine
from children_self_evolution import EvolutionEngine, Guardrail
from children_content_officer import ContentOfficer
from children_payment import PaymentGateway, MockPSPAdapter

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")

# 4 定价
e = PricingEngine()
e.set_cost_model(CostModel("RB-A1", 9000, 11500, 1200, 900, 400))
e.record_competitor_price(CompetitorPrice("RB-A1", "Miko", 19900, "EUR"))
d = e.price("RB-A1", "DE")
check("pricing.decision_has_id", bool(d.decision_id))
check("pricing.vat_de_19", abs(d.vat_rate - 0.19) < 1e-9, f"got {d.vat_rate}")
# Miko at EUR 199 -> undercut 5% = 189.05, but cost floor for 30% max margin = 257.14
# so the engine must REJECT the competitor price and hold the margin floor.
check("pricing.competitor_undercut_or_floor", d.reason.value in ("competitor_undercut", "cost_floor"),
      d.reason.value)
check("pricing.floor_rejected_competitor",
      d.breakdown.get("competitor_rejected_below_margin_floor") is True, str(d.breakdown))
check("pricing.explained", len(d.applied_rules) >= 1 and bool(d.breakdown))
check("pricing.margin_positive", d.margin_pct > 0.29, f"{d.margin_pct}")

# 5 订单路由
ro = OrderRouter()
ro.set_stock("wh-nl-ams", "RB-A1", 2); ro.set_stock("wh-nl-ams", "ACC-1", 50)
ro.set_stock("wh-fr-paris", "RB-A1", 10); ro.set_stock("wh-fr-paris", "ACC-1", 5)
d1 = ro.route("o1", [OrderLine("RB-A1", 6, 24900), OrderLine("ACC-1", 10, 1900)],
              Destination("FR", "75001", "Paris", 48.86, 2.35))
check("routing.split_when_partial", d1.split is True)
check("routing.assignments_sum_units", sum(l["quantity"] for a in d1.assignments for l in a["lines"]) == 16,
      str(d1.assignments))
d2 = ro.route("o2", [OrderLine("RB-A1", 1, 24900)],
              Destination("NL", "1011", "Amsterdam", 52.37, 4.90))
check("routing.no_split_when_single_wh", d2.split is False)
f = ro.fraud.assess({"total_cents": 250000, "customer_key": "c1"})
check("fraud.verdict_generated", f.verdict.value in ("approve", "review", "decline"), f.verdict.value)
check("fraud.reasons_present", isinstance(f.reasons, list))
check("vat.destination_fr", d1.vat["country"] == "FR")

# 6 支付
pg = PaymentGateway()
pay = pg.capture("o1", "card", 24900)
check("payment.captured", pay.status.value == "captured", pay.status.value)
check("payment.fee_withheld",
      pay.fee_cents > 0 and pay.net_cents == pay.amount_cents - pay.fee_cents)
check("payment.mock_explicit", pay.mock is True)
# zero/negative amount -> failed, never a silent success
check("payment.rejects_zero", pg.capture("o2", "card", 0).status.value == "failed")
pg.refund(pay.payment_id, 9900, "partial_withdrawal")
check("payment.partial_refund",
      pg.records[pay.payment_id].status.value == "partially_refunded")
pg.refund(pay.payment_id, 999999, "rest")   # capped at the remaining balance
check("payment.refund_capped",
      pg.records[pay.payment_id].status.value == "refunded")
rec = pg.reconcile()
check("payment.reconcile_net",
      rec["captured_cents"] == 24900 and rec["refunded_cents"] == 24900, str(rec))
check("payment.psp_swappable", isinstance(pg.psp, MockPSPAdapter))

# 7 物流
lm = LogisticsManager()
frm = Address("DC", "Str 1", "Berlin", "10115", "DE")
to = Address("Client", "Av 2", "Paris", "75001", "FR")
q = lm.quote(frm, to, Parcel(2.5))
check("logistics.cheapest_selected", q["cheapest"] is not None)
sh = lm.create("o1", frm, to, Parcel(2.0))
check("logistics.shipment_created", bool(sh["tracking_number"]))
ok = lm.apply_webhook({"tracking_number": sh["tracking_number"], "status": "delivered"})
check("logistics.webhook_delivered", ok and lm.shipments[sh["shipment_id"]].status == "delivered")

# 8 售后 / RMA
rs = RMAService()
rs.register_warranty("SN1", "RB-A1", "c1", "2026-01-01")
r = rs.create_rma("o1", "c1", "RB-A1", 1, ReturnReason.DEFECTIVE, "screen", "2026-10-01")
rs.approve(r.rma_id); rs.ship(r.rma_id, "TRK1"); rs.receive(r.rma_id)
rs.inspect(r.rma_id, Disposition.RESTOCK, 24900, "refund"); rs.resolve(r.rma_id)
check("rma.lifecycle_complete", rs.rmas[r.rma_id].state.value == "resolved")
check("rma.warranty_active", rs.check_warranty("SN1")["active"] is True)
check("rma.free_return_14d", rs.can_return_without_reason("2026-10-01") is True)
check("rma.no_restock_fee_on_defect", rs.rmas[r.rma_id].restocking_fee_cents == 0)

# 9/10 外联 / 跟进
c = CRM()
c.add_contact(Contact("c1", "a@x.com", "Ann", consent_marketing=True))
c.add_contact(Contact("c2", "b@x.com", "Bob", consent_marketing=False))
c.add_sequence(Sequence("s1", "Welcome", [OutreachStep(1, 1, "email", "tpl", "Hi"),
                                          OutreachStep(2, 48, "email", "tpl2", "Tips")]))
c.enrol("c1", "s1")
blocked = c.enrol("c2", "s1")
check("crm.consent_gate_blocks", blocked.get("success") is False, str(blocked))
c.move_stage("c1", Stage.ORDER)
check("crm.stage_moved", c.funnel_snapshot()["stages"]["order"] == 1)
c.add_followup.__self__ if False else c.add_followup(
    __import__("children_crm").FollowUp("t1", "c1", "2026-01-01T00:00:00", "call back"))
check("crm.followup_due", len(c.due_followups()) == 1)

# 11 数据闭环
dl = DataLoop()
for i in range(20): dl.emit("lead.created", f"u{i}", cost_cents=300)
for i in range(8): dl.emit("chat.started", f"u{i}")
for i in range(3): dl.emit("order.paid", f"u{i}", revenue_cents=24900, cost_cents=15000)
check("dataloop.funnel_has_6_stages", len(dl.funnel()["stages"]) == 6)
ru = dl.rollup(30)
check("dataloop.revenue", ru["revenue_cents"] == 74700, str(ru["revenue_cents"]))
check("dataloop.conversion", ru["conversion"] if False else "acquisition->consultation" in dl.funnel()["conversion"])
check("dataloop.pseudonymous", all(len(e.anon_user_key) == 24 for e in list(dl._events)[:5]))

# 13 自学习
sl = SelfLearningEngine()
for i in range(12): sl.thumbs("chat", f"q{i}", up=(i % 4 != 0))
sl.build_dataset("chat")
res = sl.evaluate("chat", "cand1", {"helpfulness": 0.83})
check("selflearning.gate_evaluates", len(res) == 1 and res[0].baseline is not None)
job = sl.create_job("chat")
out = sl.complete_job(job.job_id, {"helpfulness": 0.88})
check("selflearning.promotes_better", out["status"] == "promoted", out["status"])

# 14 自进化
ev = EvolutionEngine()
ev.create("x1", "t", "s", ["control", "v1"], "conversion", "higher_better",
          [Guardrail("error_rate", "lower_better", 0.05)])
import random; random.seed(3)
for i in range(300):
    u = f"s{i}"; v = ev.assign("x1", u)
    ev.observe("x1", u, converted=(random.random() < (0.10 if v == "control" else 0.13)),
               guardrail_values={"error_rate": 0.001})
dec = ev.decide("x1", auto=True)
check("evolution.decided", dec["decision"] in ("promoted", "rolled_back", "inconclusive"), dec["decision"])
check("evolution.decision_logged", len(ev.report("x1")) >= 1)
check("evolution.explained", "explanation" in ev.report("x1")[0])

# 15 内容官
co = ContentOfficer(auto_publish=False)
ent = {"id": "RB-A1", "sku": "RB-A1", "name": "RoboBuddy",
       "description": "AI companion for kids.",
       "features": ["On-device AI", "GDPR"], "price_cents": 24900}
dr = co.generate("product", ent, "de")
check("content.german_template", "entdecken" in dr.title.lower() or "RoboBuddy" in dr.title, dr.title)
check("content.schema_org", dr.schema_org.get("@type") == "Product")
check("content.slug", bool(dr.slug))
check("content.publish_blocked", co.publish(dr.draft_id).get("success") is False)
co.submit(dr.draft_id); co.approve(dr.draft_id, "ed@x.com")
check("content.publish_after_approval", co.publish(dr.draft_id).get("success") is True)

ok = sum(1 for _, v, _ in R if v)
print(f"\n{'='*60}\nPASS {ok}/{len(R)}")
for n, v, d in R:
    if not v: print("  FAILED:", n, d)
sys.exit(0 if ok == len(R) else 1)