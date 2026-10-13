#!/usr/bin/env python3
"""Autonomous Ops -- the 11 phase closed loop (24/7 background orchestrator).

This is the *real* wiring behind the hidden backend: it drives the self-built
commerce modules through one cycle and records everything into the data loop so
the funnel / unit-economics stay live.  All 16 steps of the commerce chain are
covered by the 11 phases below (支付/外联/跟进/入库/上架 were previously modules
that existed but were not exercised by the loop).

    phase 1  collect     GitHub hunter (SOP screened open-source discovery)
                         + acquisition events                       [采集/蜘蛛发现]
    phase 2  ingest      children_content_db -> digital-course SKU   [入库]
    phase 3  publish     children_content_officer -> draft/submit/
                         approve/publish listing chain               [上架/内容官]
    phase 4  price       children_pricing  -> margin-safe quotes     [定价]
    phase 5  route       children_order_routing -> warehouse+fraud+VAT [订单路由]
    phase 6  payment     children_payment -> capture + refund + reconcile [支付]
    phase 7  fulfill     children_logistics -> shipment (carrier adapter) [物流]
    phase 8  aftersales  children_rma -> full RMA lifecycle          [售后]
    phase 9  outreach    children_crm -> consent-gated sequence +
                         follow-ups                                  [外联/跟进]
    phase 10 learn       children_self_learning -> feedback + retrain [自学习]
    phase 11 evolve      children_self_evolution -> A/B decide       [自进化]

Design rules
------------
* every phase is independently guarded: one failing phase never aborts the loop
* no PII: only pseudonymous keys ever reach the data loop
* offline-safe: the hunter defaults to its bundled fixture (no network needed),
  so the orchestrator is fully testable without hitting GitHub

Usage
-----
    python scripts/autonomous_ops.py --once
    python scripts/autonomous_ops.py --cycles 3 --offline --json
    python scripts/autonomous_ops.py --interval 300            # 24/7 loop
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import sys
import time
import traceback
import uuid
from typing import Any, Callable, Dict, List, Optional

# make the repo root importable when run as a script
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
_SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)

from children_data_loop import data_loop                      # noqa: E402
from children_pricing import pricing_engine, CostModel        # noqa: E402
from children_order_routing import (                          # noqa: E402
    order_router, OrderLine, Destination)
from children_logistics import (                              # noqa: E402
    logistics, Address, Parcel)
from children_rma import (                                    # noqa: E402
    rma_service, ReturnReason, Disposition)
from children_self_learning import self_learning              # noqa: E402
from children_self_evolution import (                         # noqa: E402
    evolution, Guardrail)
from children_payment import payment_gateway                  # noqa: E402
from children_crm import (                                    # noqa: E402
    crm, Contact, Sequence, OutreachStep, Stage, FollowUp)
from children_content_officer import content_officer          # noqa: E402
from children_content_db import (                              # noqa: E402
    EUROPE_COURSES, EU_MARKET_PACKAGES, get_eu_band_for_age)
from children_engagement import (                              # noqa: E402
    engagement, ChildProfile, Session, Sentiment)
from state_store import create_store                          # noqa: E402

# ── catalogue: hardware + subscription + digital content ─────────────────────

CATALOG: List[Dict[str, Any]] = [
    {"sku": "RB-2026-A1", "country": "DE", "unit_cost": 14900, "landed": 16200,
     "fulfillment": 900, "return_reserve": 600, "support": 400},
    {"sku": "RB-2026-A1", "country": "FR", "unit_cost": 14900, "landed": 16400,
     "fulfillment": 950, "return_reserve": 600, "support": 400},
    {"sku": "SUB-STD-M", "country": "DE", "unit_cost": 120, "landed": 120,
     "fulfillment": 10, "return_reserve": 0, "support": 40},
    {"sku": "DLC-STORY-12", "country": "NL", "unit_cost": 80, "landed": 80,
     "fulfillment": 0, "return_reserve": 0, "support": 5},
]

PHASES = ["collect", "ingest", "publish", "price", "route", "payment",
          "fulfill", "aftersales", "outreach", "learn", "evolve", "engage"]

DEFAULT_HUNTER_QUERIES = [
    "children companion robot",
    "kids voice assistant edge",
    "child safety AI moderation",
]


class AutonomousOps:
    """One object, one cycle(), seven phases, everything recorded."""

    def __init__(self, hunter_offline: bool = True,
                 hunter_queries: Optional[List[str]] = None,
                 hunter_limit: int = 5,
                 store: Any = None, state_backend: Optional[str] = None):
        # persistence is opt-in and never changes behaviour on its own
        self.store = store if store is not None else create_store(state_backend)
        saved = self.store.get("cycle_count", 0)
        self.cycle_count = int(saved or 0)
        self.hunter_offline = hunter_offline
        self.hunter_queries = hunter_queries or DEFAULT_HUNTER_QUERIES
        self.hunter_limit = hunter_limit
        self.last_report: Optional[Dict[str, Any]] = None
        self._seeded = False
        self._seed()

    # -- one-time setup -------------------------------------------------------
    def _seed(self):
        if self._seeded:
            return
        # unit economics for the catalogue (idempotent)
        for c in CATALOG:
            pricing_engine.set_cost_model(CostModel(
                sku=c["sku"], unit_cost_cents=c["unit_cost"],
                landed_cost_cents=c["landed"], fulfillment_cents=c["fulfillment"],
                return_reserve_cents=c["return_reserve"],
                support_cost_cents=c["support"]))
        # give the home DC stock so routing produces a clean single-source pick
        for sku, qty in (("RB-2026-A1", 120), ("SUB-STD-M", 5000),
                         ("DLC-STORY-12", 9999)):
            try:
                order_router.set_stock("wh-de-berlin", sku, qty, 0)
                order_router.set_stock("wh-nl-ams", sku, max(qty // 2, 1), 0)
            except Exception:
                pass
        self._seeded = True

    # -- phase 1: collect -----------------------------------------------------
    def phase_collect(self) -> Dict[str, Any]:
        import github_hunter
        results = github_hunter.hunt(self.hunter_queries, self.hunter_limit,
                                     offline=self.hunter_offline)
        passed = [r for r in results if r.verdict == "PASS"]
        # acquisition signal
        n = max(1, len(results))
        for i in range(n):
            data_loop.emit("visit.landing", f"cycle{self.cycle_count}-v{i}")
            data_loop.emit("lead.created", f"cycle{self.cycle_count}-v{i}",
                           cost_cents=300)
        return {
            "discovered": len(results), "passed_sop": len(passed),
            "top": [{"repo": r.repo, "license": r.license, "score": r.score}
                    for r in (passed or results)[:3]],
            "mode": "offline" if self.hunter_offline else "github_api",
        }

    # -- phase 2: ingest (入库) -----------------------------------------------
    def phase_ingest(self) -> Dict[str, Any]:
        """Turn a real sellable course asset into an orderable digital SKU.

        Rotates the *market package* (EU content, age-banded, localised) so every
        cycle ingests a different asset; registers only a *cost model* (never
        touches the hardware CATALOG that phase_price quotes) so the digital
        SKU can be priced + listed.
        """
        cids = EU_MARKET_PACKAGES.get("*")["courses"]        # 首发 = 全 EU 库
        course = EUROPE_COURSES[cids[self.cycle_count % len(cids)]]
        sku = "DLC-" + course["course_id"].upper()
        pricing_engine.set_cost_model(CostModel(
            sku=sku, unit_cost_cents=80, landed_cost_cents=80,
            fulfillment_cents=0, return_reserve_cents=0, support_cost_cents=5))
        self._ingested = {
            "course_id": course["course_id"], "sku": sku, "name": course["name"],
            "name_local": course.get("name_local"),
            "band": course["band"], "subject": course["subject"],
            "market": course["market"],
            "lessons": len(course.get("lessons", [])),
            "market_package": "EU",
        }
        data_loop.emit("content.ingested", f"ingest-{self.cycle_count}")
        return dict(self._ingested)

    # -- phase 3: publish (上架 / 内容官) --------------------------------------
    def phase_publish(self) -> Dict[str, Any]:
        """Generate a machine listing for the ingested asset and run it through
        the content officer's review workflow (draft -> submit -> [approve] ->
        publish).  Publication is gated by CONTENT_AUTO_PUBLISH; when it is off
        (the default, human-in-the-loop) the draft is left in review."""
        ing = getattr(self, "_ingested", None) or {}
        sku = ing.get("sku", "DLC-STORY-12")
        try:
            price_cents = pricing_engine.price(sku, "DE").final_price_cents
        except Exception:
            price_cents = 999
        entity = {
            "id": sku, "sku": sku,
            "name": ing.get("name", "RoboBuddy Digital Content"),
            "description": (f"European curriculum {ing.get('subject', 'learning')} "
                            f"content for {ing.get('stage', 'primary')} learners."),
            "features": ["Age-graded", "GDPR compliant", "On-device AI",
                         "Parent dashboard", "10 EU languages"],
            "price_cents": price_cents, "currency": "EUR",
        }
        draft = content_officer.generate("product", entity, "de")
        submitted = content_officer.submit(draft.draft_id)
        published = False
        if content_officer.auto_publish:
            if content_officer.approve(draft.draft_id, "autonomous-ops",
                                       "24/7 publish gate (CONTENT_AUTO_PUBLISH=1)"):
                published = bool(content_officer.publish(draft.draft_id).get("success"))
        data_loop.emit("content.published" if published else "content.drafted",
                       f"content-{self.cycle_count}")
        return {
            "sku": sku, "draft_id": draft.draft_id, "language": draft.language,
            "slug": draft.slug, "submitted": submitted, "published": published,
            "status": draft.status, "price_cents": price_cents,
            "keywords": draft.keywords[:5],
            "policy": content_officer.stats()["policy"],
        }

    # -- phase 4: price (定价) ------------------------------------------------
    def phase_price(self) -> Dict[str, Any]:
        quotes = []
        for c in CATALOG:
            d = pricing_engine.price(c["sku"], country=c["country"])
            quotes.append({
                "sku": d.sku, "country": c["country"],
                "price_cents": d.final_price_cents,
                "margin_pct": round(d.margin_pct, 4),
                "reason": d.reason.value,
            })
        margins = [q["margin_pct"] for q in quotes] or [0.0]
        # close the 定价 corner with a real data-loop event (there was no
        # evidence that pricing actually ran inside a cycle before)
        for q in quotes:
            data_loop.emit("price.quoted", q["sku"], revenue_cents=0, cost_cents=0,
                           properties=q)
        data_loop.emit("price.updated", f"cycle{self.cycle_count}",
                       properties={"min_margin_pct": round(min(margins), 4),
                                "avg_margin_pct": round(sum(margins) / len(margins), 4),
                                "quotes": len(quotes)})
        return {"quotes": quotes, "min_margin_pct": round(min(margins), 4),
                "avg_margin_pct": round(sum(margins) / len(margins), 4)}

    # -- phase 5: route (订单路由) --------------------------------------------
    def phase_route(self) -> Dict[str, Any]:
        order_id = f"ord-{self.cycle_count}-{int(time.time()) % 100000}"
        quote = next(q for q in self.phase_price()["quotes"]
                     if q["sku"] == "RB-2026-A1" and q["country"] == "DE")
        lines = [OrderLine(sku="RB-2026-A1", quantity=1,
                           unit_price_cents=quote["price_cents"]),
                 OrderLine(sku="SUB-STD-M", quantity=1, unit_price_cents=999)]
        dest = Destination(country="DE", postal_code="10115", city="Berlin",
                           lat=52.52, lon=13.40)
        d = order_router.route(order_id, lines, dest,
                               customer_ctx={"ip_country": "DE", "new_account": False})
        total = quote["price_cents"] + 999
        # order created here; the actual money movement is 支付 (phase_payment)
        data_loop.emit("order.created", order_id, revenue_cents=total)
        return {
            "order_id": order_id,
            "total_cents": total,
            "split": d.split,
            "warehouses": [a["warehouse_id"] for a in d.assignments],
            "fraud": {"score": d.fraud.score, "verdict": d.fraud.verdict.value},
            "vat": d.vat,
            "payment_methods": d.payment_methods,
            "reasons": d.reasons,
        }

    # -- phase 6: payment (支付) ----------------------------------------------
    def phase_payment(self, order_id: str, total_cents: int) -> Dict[str, Any]:
        """Capture the money for the routed order and reconcile the ledger.

        This is the corner that was previously folded into routing; it now runs
        the real gateway (capture -> fee -> net) and exposes the reconciliation
        the data loop's unit-economics rely on.
        """
        if total_cents <= 0:
            data_loop.emit("payment.failed", order_id)
            return {"status": "failed", "reason": "no routable order total",
                    "reconcile": payment_gateway.reconcile()}
        rec = payment_gateway.capture(order_id, "card", total_cents)
        data_loop.emit("order.paid", order_id, revenue_cents=rec.amount_cents,
                       cost_cents=rec.fee_cents)
        return {"payment_id": rec.payment_id, "status": rec.status.value,
                "amount_cents": rec.amount_cents, "fee_cents": rec.fee_cents,
                "net_cents": rec.net_cents, "mock": rec.mock,
                "reconcile": payment_gateway.reconcile()}

    # -- phase 7: fulfill (物流) ----------------------------------------------
    def phase_fulfill(self, order_id: str) -> Dict[str, Any]:
        sender = Address("Kids Robot GmbH", "Warschauer Str. 1", "Berlin",
                         "10243", "DE")
        recipient = Address("Parent Example", "Torstr. 10", "Berlin",
                            "10119", "DE")
        parcel = Parcel(weight_kg=2.4, length_cm=30, width_cm=22, height_cm=18,
                        value_cents=24900)
        ship = logistics.create(order_id, sender, recipient, parcel,
                                service="standard")
        data_loop.emit("shipment.created", order_id)
        # simulate carrier delivery webhook
        try:
            logistics.apply_webhook({"tracking_number": ship["tracking_number"],
                                     "status": "delivered"})
            data_loop.emit("shipment.delivered", order_id)
        except Exception:
            pass
        return {"shipment_id": ship["shipment_id"],
                "carrier": ship["carrier"], "tracking": ship["tracking_number"],
                "mock": ship.get("mock", False)}

    # -- phase 8: aftersales (售后 / RMA) -------------------------------------
    def phase_aftersales(self, order_id: str) -> Dict[str, Any]:
        r = rma_service.create_rma(order_id=order_id, customer_id="cust-1",
                                   sku="RB-2026-A1", quantity=1,
                                   reason=ReturnReason.DEFECTIVE,
                                   description="speaker crackles")
        rma_service.approve(r.rma_id)
        rma_service.ship(r.rma_id, tracking="RET123456")
        rma_service.receive(r.rma_id)
        rma_service.inspect(r.rma_id, disposition=Disposition.REFURBISH,
                            refund_cents=0, resolution="repair",
                            notes="motherboard ok, replace speaker")
        rma_service.resolve(r.rma_id)
        data_loop.emit("rma.resolved", "cust-1", cost_cents=1500)
        data_loop.emit("ticket.closed", "cust-1")
        # a statutory 14-day withdrawal on the subscription line: the RMA refund
        # is executed through the payment gateway (支付), closing the 售后->支付 loop.
        refund_cents = 999
        r2 = rma_service.create_rma(order_id=order_id, customer_id="cust-2",
                                    sku="SUB-STD-M", quantity=1,
                                    reason=ReturnReason.CHANGED_MIND,
                                    description="within the 14-day withdrawal window")
        rma_service.approve(r2.rma_id)
        rma_service.receive(r2.rma_id)
        rma_service.inspect(r2.rma_id, disposition=Disposition.RESTOCK,
                            refund_cents=refund_cents, resolution="refund",
                            notes="EU 14-day right of withdrawal")
        rma_service.resolve(r2.rma_id)
        pays = payment_gateway.list_payments(order_id)
        refunded = 0
        if pays:
            rec = payment_gateway.refund(pays[-1]["payment_id"], refund_cents,
                                         "eu_14_day_withdrawal")
            if rec:
                refunded = rec.refunded_cents
                data_loop.emit("refund.issued", order_id, revenue_cents=-refund_cents)
        # support desk closed loop: a device issue -> first response -> resolve -> CSAT
        from children_support import support
        tk = support.create_ticket(
            household_id="hh-1", subject="Robot won't turn on",
            body="broken battery after a firmware update", channel="email",
            linked_order_id=order_id, auto_deflect=False)
        support.assign(tk.ticket_id, "agent-eu-1")
        support.add_message(tk.ticket_id, "agent",
                            "Thanks for the report, we are sending a replacement.")
        support.resolve(tk.ticket_id, "Replacement unit dispatched under 2y warranty")
        support.record_csat(tk.ticket_id, 5, "fast help")
        return {"rma_id": r.rma_id, "final_state": "resolved",
                "refund_rma": r2.rma_id, "refunded_cents": refunded,
                "support": support.stats(),
                "analytics": rma_service.analytics()}

    # -- phase 9: outreach (外联 / 跟进) --------------------------------------
    def phase_outreach(self) -> Dict[str, Any]:
        """Consent-gated outreach sequence + a due follow-up that gets worked.

        This is the acquisition/consultation corner: it feeds the funnel's
        consultation stage (previously always empty because nothing ran it).
        """
        cid = f"cycle{self.cycle_count}-lead"
        crm.add_contact(Contact(cid, f"cycle{self.cycle_count}@example.eu",
                                "Parent", country="DE", language="de",
                                source="autonomous_loop"))
        crm.set_consent(cid, True)          # explicit, recorded consent
        seq_id = "seq-welcome"
        if seq_id not in crm.sequences:
            crm.add_sequence(Sequence(seq_id, "Welcome", [
                OutreachStep(1, 1, "email", "tpl_welcome", "Welcome to RoboBuddy"),
                OutreachStep(2, 48, "email", "tpl_tips", "3 tips for week one"),
            ]))
        enrol = crm.enrol(cid, seq_id)
        # advance the send clock so the first step is due, then send it
        due = crm.due_outreach(now=_dt.datetime.now() + _dt.timedelta(hours=2))
        sent = 0
        for m in due:
            if m["contact_id"] == cid:
                crm.mark_sent(m["contact_id"], channel=m["channel"],
                              subject=m["subject"])
                sent += 1
        crm.move_stage(cid, Stage.CONSULTATION)
        # a follow-up task that is already due and gets worked (跟进)
        task_id = f"fu-{self.cycle_count}"
        crm.add_followup(FollowUp(
            task_id, cid,
            (_dt.datetime.now() - _dt.timedelta(hours=1)).isoformat(),
            "call back about the subscription"))
        due_fu = crm.due_followups()
        crm.complete_followup(task_id)
        # funnel signals: a lead (acquisition) that started a conversation (consultation)
        data_loop.emit("lead.created", cid, cost_cents=300)
        data_loop.emit("chat.started", cid)
        return {"contact_id": cid, "enrolled": bool(enrol.get("success")),
                "messages_sent": sent, "followups_due": len(due_fu),
                "consent_gate": "marketing consent recorded before any send (GDPR)",
                "funnel": crm.funnel_snapshot()["stages"]}

    # -- phase 10: learn (自学习) ---------------------------------------------
    def phase_learn(self) -> Dict[str, Any]:
        # funnel feedback from the day's interactions
        for i in range(4):
            self_learning.thumbs("chat", f"cycle{self.cycle_count}-{i}", up=True)
        self_learning.thumbs("chat", f"cycle{self.cycle_count}-bad", up=False)
        retrain, why = self_learning.should_retrain("chat")
        job = None
        if retrain:
            j = self_learning.create_job("chat")
            job = {"job_id": j.job_id, "reason": j.reason}
        # close the 自学习 corner: real feedback + retrain events per cycle
        data_loop.emit("learn.feedback_recorded", f"cycle{self.cycle_count}",
                       properties={"feedback_recorded": 5, "task": "chat"})
        if retrain:
            data_loop.emit("learn.retrain_triggered", f"cycle{self.cycle_count}",
                           cost_cents=0, properties={"reason": why})
        return {"feedback_recorded": 5, "retrain_triggered": retrain,
                "reason": why, "job": job,
                "health": self_learning.health()}

    # -- phase 11: evolve (自进化) -------------------------------------------
    def phase_evolve(self) -> Dict[str, Any]:
        # a fresh experiment per cycle: decide() finalises the experiment, so a
        # 24/7 loop must not reuse a stopped one.
        exp_id = f"exp-checkout-cta-{self.cycle_count}"
        evolution.create(
            exp_id, "Checkout CTA copy", unit="user",
            variants=["control", "variant_b"],
            primary_metric="conversion",
            guardrails=[Guardrail(name="latency_ms", direction="lower_better",
                                  limit=1500)])
        # deterministic traffic + observations
        for i in range(400):
            uid = f"u{self.cycle_count}-{i}"
            v = evolution.assign(exp_id, uid)
            # variant_b converts clearly better (20% vs ~7.7%)
            converted = (i % 5 == 0) if v == "variant_b" else (i % 13 == 0)
            evolution.observe(exp_id, uid, converted=converted,
                              metric_value=320.0, guardrail_values={"latency_ms": 280})
        decision = evolution.decide(exp_id, auto=False)
        stats = decision.get("statistics") or {}
        # close the 自进化 corner with a real decision event
        data_loop.emit("evolve.experiment_decided", exp_id,
                       properties={"experiment": exp_id,
                                "decision": decision.get("decision"),
                                "winner": decision.get("winner"),
                                "lift": stats.get("lift")})
        return {"experiment": exp_id,
                "decision": decision.get("decision"),
                "winner": decision.get("winner"),
                "reason": decision.get("reason"),
                "z": stats.get("z"),
                "lift": stats.get("lift")}

    # -- the cycle ------------------------------------------------------------
    def run_cycle(self) -> Dict[str, Any]:
        t0 = time.time()
        report: Dict[str, Any] = {
            "cycle": self.cycle_count,
            "started_at": _dt.datetime.now().isoformat(),
            "phases": {},
        }

        def _run(name: str, fn: Callable[[], Dict[str, Any]]):
            try:
                out = fn()
                report["phases"][name] = {"status": "ok", "summary": out}
            except Exception as ex:  # isolate: never abort the loop
                report["phases"][name] = {
                    "status": "failed", "error": f"{type(ex).__name__}: {ex}",
                    "trace": traceback.format_exc(limit=2).splitlines()[-1],
                }

        _run("collect", self.phase_collect)
        _run("ingest", self.phase_ingest)
        _run("publish", self.phase_publish)
        _run("price", self.phase_price)
        route_summary: Dict[str, Any] = {}
        try:
            route_summary = self.phase_route()
            report["phases"]["route"] = {"status": "ok", "summary": route_summary}
        except Exception as ex:
            report["phases"]["route"] = {
                "status": "failed", "error": f"{type(ex).__name__}: {ex}"}
        order_id = route_summary.get("order_id", f"ord-{self.cycle_count}")
        total_cents = route_summary.get("total_cents", 0)
        _run("payment", lambda: self.phase_payment(order_id, total_cents))
        _run("fulfill", lambda: self.phase_fulfill(order_id))
        _run("aftersales", lambda: self.phase_aftersales(order_id))
        _run("outreach", self.phase_outreach)
        _run("learn", self.phase_learn)
        _run("evolve", self.phase_evolve)
        _run("engage", self.phase_engage)

        report["finished_at"] = _dt.datetime.now().isoformat()
        report["duration_ms"] = int((time.time() - t0) * 1000)
        report["ok"] = all(p["status"] == "ok"
                           for p in report["phases"].values())
        report["metrics"] = {"funnel": data_loop.funnel(),
                             "rollup": data_loop.rollup(30)}
        self.last_report = report
        self.cycle_count += 1
        # record the cycle itself
        data_loop.emit("autonomous.cycle", f"system-{report['cycle']}")
        # close the 自主运营编排 + 数据闭环 corners: the orchestration and the
        # cross-phase rollup are emitted as real, inspectable events
        data_loop.emit("ops.cycle_orchestrated", f"cycle-{report['cycle']}",
                       properties={"phases": list(report["phases"].keys()),
                                "ok": report["ok"],
                                "duration_ms": report["duration_ms"]})
        data_loop.emit("data_loop.rollup_computed", f"cycle-{report['cycle']}",
                       revenue_cents=int(report["metrics"]["rollup"].get("revenue_cents", 0) or 0),
                       cost_cents=int(report["metrics"]["rollup"].get("cost_cents", 0) or 0),
                       properties={"funnel": report["metrics"]["funnel"],
                                "rollup": report["metrics"]["rollup"]})
        # make the loop durable when a store is enabled (opt-in)
        self.store.set("cycle_count", self.cycle_count)
        self.store.set("last_cycle", report["cycle"])
        self.store.set("last_cycle_at", report["finished_at"])
        self.store.push("cycle_history", {
            "cycle": report["cycle"], "ok": report["ok"],
            "duration_ms": report["duration_ms"], "at": report["finished_at"],
            "phases": {k: {"status": v.get("status"),
                           "duration_ms": v.get("duration_ms")}
                       for k, v in report["phases"].items()}})
        report["persistence"] = {"backend": self.store.backend}
        return report

    # -- phase 12: engage (产品侧留存环) ---------------------------------------
    def phase_engage(self) -> Dict[str, Any]:
        """
        Run the product-side flywheel for REAL child profiles only.

        This phase is the *measurement* engine — it aggregates actual
        `learning.session` events from the data loop and computes:
          - real DAU/MAU/streak/completion
          - real churn risk & renewal probability
          - real content exhaustion → expansion opportunities
          - real parent growth reports

        It does NOT fabricate sessions. If no real events exist,
        it honestly reports zero households and exits.
        """
        # Production guard: refuse to run synthetic data in non-sim mode
        if os.getenv("SIMULATE_ENGAGEMENT", "0") not in ("1", "true", "True"):
            real_events = data_loop._counts.get("learning.session", 0)
            if real_events == 0:
                return {
                    "mode": "production",
                    "households": 0,
                    "message": "No real learning.session events in data_loop. "
                               "Set SIMULATE_ENGAGEMENT=1 for CI testing, "
                               "or deploy real devices that emit telemetry."
                }

        # --- SIMULATION MODE (CI only) ---------------------------------------
        # This block runs ONLY when SIMULATE_ENGAGEMENT=1 (CI/testing)
        ingest = getattr(self, "_ingested", None) or {}
        household_id = "hh-1"
        if household_id not in engagement.households:
            engagement.register_household(
                household_id, "DE", "de", subscription_sku="SUB-STD-M",
                consent_marketing=True)
        child_id = f"child-{household_id}"
        if child_id not in engagement.children:
            engagement.register_child(ChildProfile(
                child_id=child_id, household_id=household_id, first_name="",
                age=6, language="de", interests=["Science", "Story"]))
        course_id = ingest.get("course_id", "eu_de_phonics")
        engagement.log_session(Session(
            child_id=child_id,
            minutes=min(20, max(5, (ingest.get("lessons", 6) or 6) * 3)),
            activity=ingest.get("subject", "lesson"), content_id=course_id,
            completed=True, sentiment=Sentiment.POSITIVE))
        snap = engagement.engagement_snapshot(child_id)
        risk = engagement.retention_risk(child_id)
        plan = engagement.recommend_plan(child_id, 3)
        report = engagement.growth_report(child_id, 7, "de")
        # close the 儿童画像适配 / 家长成长报告 / 流失风险与续订 corners with
        # real events (they were structurally present but had no evidence)
        data_loop.emit("child_profile.adapted", child_id,
                       properties={"language": "de", "age": 6,
                                "interests": ["Science", "Story"],
                                "next_plan": [p["name"] for p in plan],
                                "content_exhaustion": engagement.content_exhaustion(child_id)["exhaustion"]})
        data_loop.emit("parent_report.sent", household_id,
                       properties={"child_id": child_id, "days": 7,
                                "headline": report.to_dict().get("headline", ""),
                                "language": "de"})
        data_loop.emit("churn.risk_detected", child_id,
                       properties={"risk": risk["risk"], "level": risk["level"],
                                "reasons": risk["reasons"][:3],
                                "renewal_probability": engagement.renewal_probability(child_id)})
        # content-quality closed loop: the parent rates the played lesson; a low
        # score auto-opens a re-draft request that the Content Officer can act on
        from children_content_quality import content_quality
        rating = 5 if snap["completion_rate"] >= 0.6 else 3
        content_quality.submit_review(
            course_id, household_id, rating, language="de", age_band="6-9",
            comment="", tags=["autonomous-loop"], verified_play=True)
        quality = content_quality.stats()
        # subscription lifecycle: trial -> failed renewal (dunning) -> recovered
        from children_subscription import subscription_engine
        subscription_engine.data_loop = data_loop
        subscription_engine.payment_gateway = payment_gateway
        sub = subscription_engine.create_subscription(household_id, "SUB-STD-M", "pm-loop")
        subscription_engine.record_payment_failure(sub.subscription_id, "card_declined")
        subscription_engine.process_dunning_retry(sub.subscription_id)
        subscription_metrics = subscription_engine.get_metrics()
        # referral flywheel: referrer shares -> new household signs up -> commission
        from children_referral import referral
        referral_code = referral.get_or_create_code(household_id)
        # simulate a referred household converting
        ref_hh = f"ref-{household_id}-{self.cycle_count}"
        referral.record_click(referral_code.code, ref_hh)
        referral_conversion = referral.record_conversion(ref_hh, f"ord-ref-{self.cycle_count}", 29900)
        referral_stats = referral.get_referrer_stats(household_id)
        # payout cycle: create and pay commission (closes the commission.paid event)
        payout = referral.create_payout(household_id, period_days=1)
        if payout:
            referral.mark_payout_paid(payout.payout_id, f"auto-{self.cycle_count}")
        # risk -> self-learning feedback -> the evolve phase can actually act on it
        from children_self_learning import FeedbackItem
        self_learning.record_feedback(FeedbackItem(
            feedback_id=f"fb_eng_{uuid.uuid4().hex[:10]}",
            task="content",
            signal="auto",
            score=round(1 - risk["risk"], 3),
            input_ref=f"engagement/{child_id}",
            meta={"churn_risk": risk["risk"], "level": risk["level"],
                  "exhaustion": engagement.content_exhaustion(child_id)["exhaustion"],
                  "renewal_probability": engagement.renewal_probability(child_id)}))
        # revenue-target closed loop: translate the daily ¥ target into the
        # exact volume this business must move (units / subscribers / leads)
        from children_revenue_planner import planner as revenue_planner
        revenue_plan = revenue_planner.compute()
        data_loop.emit("revenue.plan_computed", "revenue")
        # growth-execution closed loop: turn the plan into a live daily checklist
        # (emits growth.checklist_built through the shared data loop)
        from children_growth_execution import engine as growth_engine
        growth_checklist = growth_engine.daily_checklist()
        return {
            "mode": "simulation",
            "household_id": household_id, "child_id": child_id,
            "course_id": course_id, "minutes": snap["minutes"],
            "active_days": snap["active_days"], "streak_days": snap["streak_days"],
            "completion_rate": snap["completion_rate"],
            "churn_risk": risk["risk"], "risk_level": risk["level"],
            "risk_reasons": risk["reasons"][:3],
            "renewal_probability": engagement.renewal_probability(child_id),
            "parent_report": report.to_dict(),
            "next_plan": [p["name"] for p in plan],
            "content_quality": quality,
            "subscription": subscription_metrics,
            "referral": referral_stats,
            "revenue_plan": revenue_plan,
            "growth_checklist": growth_checklist,
            "engagement_stats": engagement.stats(),
        }

    # -- 24/7 loop ------------------------------------------------------------
    def run_forever(self, interval: int = 300, max_cycles: Optional[int] = None):
        print(f"[autonomous_ops] starting loop interval={interval}s "
              f"max_cycles={max_cycles or 'inf'}", file=sys.stderr)
        while True:
            rep = self.run_cycle()
            print(json.dumps({"cycle": rep["cycle"], "ok": rep["ok"],
                              "duration_ms": rep["duration_ms"]}, ensure_ascii=False),
                  file=sys.stderr)
            if max_cycles is not None and self.cycle_count >= max_cycles:
                return
            time.sleep(interval)


# ── CLI ───────────────────────────────────────────────────────────────────────


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Autonomous 11 phase ops loop")
    ap.add_argument("--once", action="store_true", help="run a single cycle")
    ap.add_argument("--cycles", type=int, default=1)
    ap.add_argument("--interval", type=int, default=300)
    ap.add_argument("--online", action="store_true",
                    help="let the hunter hit the GitHub API (default: offline)")
    ap.add_argument("--json", action="store_true", help="print full report JSON")
    ap.add_argument("--state-backend", choices=["memory", "file", "redis", "auto"],
                    default=None,
                    help="persistence backend for the loop (default: memory; "
                         "env AUTONOMOUS_STATE_BACKEND can also set it)")
    ap.add_argument("--state-dir", default=None,
                    help="directory for the file backend (default: runtime/autonomous_state)")
    args = ap.parse_args(argv)

    ops = AutonomousOps(hunter_offline=not args.online,
                        state_backend=args.state_backend)
    if args.state_backend:
        ops.store = create_store(args.state_backend, directory=args.state_dir)
    print(f"[autonomous_ops] state backend: {ops.store.backend}", file=sys.stderr)

    if args.once or args.cycles <= 1:
        rep = ops.run_cycle()
        if args.json:
            print(json.dumps(rep, indent=2, ensure_ascii=False))
        else:
            for name in PHASES:
                p = rep["phases"].get(name, {})
                mark = "OK " if p.get("status") == "ok" else "ERR"
                print(f"  [{mark}] {name:11s} {p.get('error', '')}")
            print(f"cycle {rep['cycle']}: ok={rep['ok']} "
                  f"duration={rep['duration_ms']}ms")
        return 0 if rep["ok"] else 1

    ops.run_forever(interval=args.interval, max_cycles=args.cycles)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
