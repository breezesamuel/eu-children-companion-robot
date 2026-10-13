#!/usr/bin/env python3
"""
Subscription Management -- dunning, upgrades/downgrades, pauses, cancellations.

This is the revenue engine for the recurring part of the business (SUB-STD-M, SUB-PRO-Y).
Handles the full lifecycle: trial → active → dunning → recovered/churned → winback.
"""
from __future__ import annotations

import datetime as _dt
import logging
import threading
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger("subscription")

# ── API models (module level for Pydantic v2) ───────────────────────────────

from pydantic import BaseModel, Field
from typing import Optional


class CreateSub(BaseModel):
    customer_id: str
    plan_id: str
    payment_method_id: Optional[str] = None


class ChangePlan(BaseModel):
    new_plan_id: str
    prorate: bool = True
    immediate: bool = False


class CancelSub(BaseModel):
    reason: str = ""
    immediate: bool = False


# ── enums ──────────────────────────────────────────────────────────────────

class SubscriptionStatus(Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"          # dunning in progress
    PAUSED = "paused"              # customer requested pause
    CANCELLED = "cancelled"        # cancelled, still has access until period_end
    EXPIRED = "expired"            # fully ended, no access


class BillingInterval(Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class DunningStage(Enum):
    STAGE_1 = 1   # Day 1  - payment failed, email sent
    STAGE_2 = 3   # Day 3  - retry, SMS + email
    STAGE_3 = 7   # Day 7  - retry, phone call if high value
    STAGE_4 = 14  # Day 14 - final retry, account suspension warning
    STAGE_5 = 30  # Day 30 - final attempt, then cancel


class ChangeType(Enum):
    UPGRADE = "upgrade"
    DOWNGRADE = "downgrade"
    PAUSE = "pause"
    RESUME = "resume"
    CANCEL = "cancel"
    REACTIVATE = "reactivate"


# ── models ──────────────────────────────────────────────────────────────────


@dataclass
class Plan:
    plan_id: str
    name: str
    interval: BillingInterval
    price_cents: int
    currency: str = "EUR"
    trial_days: int = 14
    features: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def period_days(self) -> int:
        if self.interval == BillingInterval.MONTHLY:
            return 30
        if self.interval == BillingInterval.QUARTERLY:
            return 90
        return 365

    def period_months(self) -> int:
        """Whole months a single billing period covers (1 / 3 / 12)."""
        return {BillingInterval.MONTHLY: 1,
                BillingInterval.QUARTERLY: 3,
                BillingInterval.YEARLY: 12}[self.interval]


@dataclass
class Subscription:
    subscription_id: str
    customer_id: str
    plan: Plan
    status: SubscriptionStatus = SubscriptionStatus.TRIALING
    current_period_start: str = field(default_factory=lambda: _dt.datetime.now().isoformat())
    current_period_end: str = field(default_factory=lambda: (_dt.datetime.now() + _dt.timedelta(days=14)).isoformat())
    cancelled_at: Optional[str] = None
    cancelled_reason: Optional[str] = None
    paused_at: Optional[str] = None
    pause_resumes_at: Optional[str] = None
    trial_end: Optional[str] = None
    dunning_stage: Optional[DunningStage] = None
    last_payment_attempt: Optional[str] = None
    next_retry_at: Optional[str] = None
    payment_method_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_active(self) -> bool:
        return self.status in (SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE)

    def days_until_renewal(self) -> int:
        end = _dt.datetime.fromisoformat(self.current_period_end)
        return max((end - _dt.datetime.now()).days, 0)

    def is_trial(self) -> bool:
        return self.status == SubscriptionStatus.TRIALING


@dataclass
class Invoice:
    invoice_id: str
    subscription_id: str
    customer_id: str
    amount_cents: int
    currency: str
    status: str  # draft, open, paid, void, uncollectible
    period_start: str
    period_end: str
    due_date: str
    paid_at: Optional[str] = None
    payment_intent_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DunningEvent:
    event_id: str
    subscription_id: str
    stage: DunningStage
    attempted_at: str
    success: bool
    next_retry_at: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ChangeRecord:
    change_id: str
    subscription_id: str
    type: ChangeType
    from_plan_id: Optional[str]
    to_plan_id: Optional[str]
    effective_at: str
    proration_cents: int = 0
    reason: str = ""
    created_at: str = field(default_factory=lambda: _dt.datetime.now().isoformat())


# ── plan catalog ───────────────────────────────────────────────────────────


PLANS: Dict[str, Plan] = {
    "SUB-STD-M": Plan("SUB-STD-M", "Standard Monthly", BillingInterval.MONTHLY, 2990, "EUR",
                      trial_days=14, features=["Core content", "Progress reports", "2 profiles"]),
    "SUB-STD-Y": Plan("SUB-STD-Y", "Standard Yearly", BillingInterval.YEARLY, 29900, "EUR",
                      trial_days=30, features=["Core content", "Progress reports", "4 profiles", "2 months free"]),
    "SUB-PRO-M": Plan("SUB-PRO-M", "Pro Monthly", BillingInterval.MONTHLY, 4990, "EUR",
                      trial_days=14, features=["All content", "AI tutor", "Unlimited profiles", "Priority support"]),
    "SUB-PRO-Y": Plan("SUB-PRO-Y", "Pro Yearly", BillingInterval.YEARLY, 49900, "EUR",
                      trial_days=30, features=["All content", "AI tutor", "Unlimited profiles", "Priority support", "2 months free"]),

    # ── Paywall retail catalog (site-wide subscription wall) ────────────────
    # English / USD track — the price points the operator published.
    "SUB-EN-M": Plan("SUB-EN-M", "English — monthly", BillingInterval.MONTHLY, 2990, "USD",
                     trial_days=7, features=["Full companion access", "All languages", "Parental reports"]),
    "SUB-EN-Q": Plan("SUB-EN-Q", "English — quarterly", BillingInterval.QUARTERLY, 7990, "USD",
                     trial_days=7, features=["Full companion access", "All languages", "Parental reports"]),
    "SUB-EN-Y": Plan("SUB-EN-Y", "English — yearly", BillingInterval.YEARLY, 29900, "USD",
                     trial_days=7, features=["Full companion access", "All languages", "Parental reports", "Best value"]),
    # Chinese / CNY track (settles to the Alipay account).
    "SUB-ZH-M": Plan("SUB-ZH-M", "中文 — 月付", BillingInterval.MONTHLY, 6000, "CNY",
                     trial_days=7, features=["完整陪护功能", "全部语言", "家长报告"]),
    "SUB-ZH-Q": Plan("SUB-ZH-Q", "中文 — 季付", BillingInterval.QUARTERLY, 15000, "CNY",
                     trial_days=7, features=["完整陪护功能", "全部语言", "家长报告"]),
    "SUB-ZH-Y": Plan("SUB-ZH-Y", "中文 — 年付", BillingInterval.YEARLY, 50000, "CNY",
                     trial_days=7, features=["完整陪护功能", "全部语言", "家长报告", "最划算"]),
}

# Region -> (plan_id -> currency) grouping used by the paywall modal + settlement.
REGION_PLANS: Dict[str, Dict[str, str]] = {
    "en": {"monthly": "SUB-EN-M", "quarterly": "SUB-EN-Q", "yearly": "SUB-EN-Y"},
    "zh": {"monthly": "SUB-ZH-M", "quarterly": "SUB-ZH-Q", "yearly": "SUB-ZH-Y"},
}


def plans_for_region(region: str) -> List[Plan]:
    """Return the three paywall tiers for a region ('en' or 'zh')."""
    ids = REGION_PLANS.get((region or "en").lower(), REGION_PLANS["en"])
    return [PLANS[pid] for pid in (ids["monthly"], ids["quarterly"], ids["yearly"])]


def period_months_for_plan(plan_id: str) -> int:
    """Months granted per paid period (1 / 3 / 12); 0 if the plan is unknown."""
    p = PLANS.get(plan_id)
    return p.period_months() if p else 0


# ── subscription engine ────────────────────────────────────────────────────


class SubscriptionEngine:
    """Full lifecycle subscription management with dunning & changes."""

    def __init__(self, payment_gateway=None, data_loop=None):
        self._lock = threading.RLock()
        self.subscriptions: Dict[str, Subscription] = {}
        self.invoices: Dict[str, Invoice] = {}
        self.dunning_events: Dict[str, List[DunningEvent]] = {}
        self.changes: Dict[str, List[ChangeRecord]] = {}
        self.payment_gateway = payment_gateway
        self.data_loop = data_loop

    # -- plan access --
    def get_plan(self, plan_id: str) -> Optional[Plan]:
        return PLANS.get(plan_id)

    def list_plans(self) -> List[Plan]:
        return list(PLANS.values())

    # -- subscription CRUD --
    def create_subscription(self, customer_id: str, plan_id: str,
                            payment_method_id: str = None,
                            trial_override_days: int = None) -> Subscription:
        plan = self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")

        with self._lock:
            sub = Subscription(
                subscription_id=f"sub_{uuid.uuid4().hex[:12]}",
                customer_id=customer_id,
                plan=plan,
                status=SubscriptionStatus.TRIALING if plan.trial_days > 0 else SubscriptionStatus.ACTIVE,
                payment_method_id=payment_method_id,
                trial_end=(_dt.datetime.now() + _dt.timedelta(days=trial_override_days or plan.trial_days)).isoformat() if plan.trial_days > 0 else None
            )
            if plan.trial_days == 0:
                sub.current_period_end = (_dt.datetime.now() + _dt.timedelta(days=plan.period_days())).isoformat()

            self.subscriptions[sub.subscription_id] = sub
            self._emit_event("subscription.created", {"subscription_id": sub.subscription_id, "customer_id": customer_id, "plan_id": plan_id})
            logger.info("Created subscription %s for customer %s on plan %s", sub.subscription_id, customer_id, plan_id)
            return sub

    def get_subscription(self, subscription_id: str) -> Optional[Subscription]:
        return self.subscriptions.get(subscription_id)

    def get_customer_subscriptions(self, customer_id: str) -> List[Subscription]:
        return [s for s in self.subscriptions.values() if s.customer_id == customer_id]

    # -- changes --
    def change_plan(self, subscription_id: str, new_plan_id: str,
                    prorate: bool = True, immediate: bool = False) -> ChangeRecord:
        """Upgrade/downgrade with optional proration."""
        sub = self.get_subscription(subscription_id)
        if not sub:
            raise ValueError("Subscription not found")
        new_plan = self.get_plan(new_plan_id)
        if not new_plan:
            raise ValueError("New plan not found")

        with self._lock:
            old_plan_id = sub.plan.plan_id
            change_type = ChangeType.UPGRADE if new_plan.price_cents > sub.plan.price_cents else ChangeType.DOWNGRADE

            proration_cents = 0
            if prorate and sub.is_active():
                # Calculate unused portion of current period
                days_remaining = sub.days_until_renewal()
                total_days = sub.plan.period_days()
                unused_ratio = days_remaining / max(total_days, 1)
                credit_cents = int(sub.plan.price_cents * unused_ratio)
                debit_cents = int(new_plan.price_cents * unused_ratio)
                proration_cents = debit_cents - credit_cents

            effective_at = _dt.datetime.now().isoformat() if immediate else sub.current_period_end

            change = ChangeRecord(
                change_id=f"chg_{uuid.uuid4().hex[:10]}",
                subscription_id=subscription_id,
                type=change_type,
                from_plan_id=old_plan_id,
                to_plan_id=new_plan_id,
                effective_at=effective_at,
                proration_cents=proration_cents,
                reason=f"{change_type.value} from {old_plan_id} to {new_plan_id}"
            )

            self.changes.setdefault(subscription_id, []).append(change)

            if immediate:
                sub.plan = new_plan
                # Reset period
                sub.current_period_start = _dt.datetime.now().isoformat()
                sub.current_period_end = (_dt.datetime.now() + _dt.timedelta(days=new_plan.period_days())).isoformat()

            self._emit_event("subscription.changed", {
                "subscription_id": subscription_id,
                "change_type": change_type.value,
                "from_plan": old_plan_id,
                "to_plan": new_plan_id,
                "proration_cents": proration_cents,
                "immediate": immediate
            })
            logger.info("Plan change %s for subscription %s: %s -> %s", change_type.value, subscription_id, old_plan_id, new_plan_id)
            return change

    def pause_subscription(self, subscription_id: str, resume_at: str = None) -> Subscription:
        sub = self.get_subscription(subscription_id)
        if not sub or not sub.is_active():
            raise ValueError("Cannot pause inactive subscription")

        with self._lock:
            sub.status = SubscriptionStatus.PAUSED
            sub.paused_at = _dt.datetime.now().isoformat()
            sub.pause_resumes_at = resume_at
            self._emit_event("subscription.paused", {"subscription_id": subscription_id, "resume_at": resume_at})
            logger.info("Paused subscription %s", subscription_id)
            return sub

    def resume_subscription(self, subscription_id: str) -> Subscription:
        sub = self.get_subscription(subscription_id)
        if not sub or sub.status != SubscriptionStatus.PAUSED:
            raise ValueError("Subscription not paused")

        with self._lock:
            paused_at = sub.paused_at
            sub.status = SubscriptionStatus.ACTIVE
            sub.paused_at = None
            sub.pause_resumes_at = None
            # Extend period by pause duration
            if sub.current_period_end and paused_at:
                pause_duration = (_dt.datetime.now() - _dt.datetime.fromisoformat(paused_at)).days
                sub.current_period_end = (_dt.datetime.fromisoformat(sub.current_period_end) + _dt.timedelta(days=pause_duration)).isoformat()
            self._emit_event("subscription.resumed", {"subscription_id": subscription_id})
            return sub

    def cancel_subscription(self, subscription_id: str, reason: str = "", immediate: bool = False) -> Subscription:
        sub = self.get_subscription(subscription_id)
        if not sub:
            raise ValueError("Subscription not found")

        with self._lock:
            sub.status = SubscriptionStatus.CANCELLED
            sub.cancelled_at = _dt.datetime.now().isoformat()
            sub.cancelled_reason = reason
            if immediate:
                sub.current_period_end = _dt.datetime.now().isoformat()
            self._emit_event("subscription.cancelled", {"subscription_id": subscription_id, "reason": reason, "immediate": immediate})
            return sub

    def reactivate_subscription(self, subscription_id: str) -> Subscription:
        sub = self.get_subscription(subscription_id)
        if not sub or sub.status not in (SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED):
            raise ValueError("Cannot reactivate")

        with self._lock:
            sub.status = SubscriptionStatus.ACTIVE
            sub.cancelled_at = None
            sub.cancelled_reason = None
            sub.current_period_start = _dt.datetime.now().isoformat()
            sub.current_period_end = (_dt.datetime.now() + _dt.timedelta(days=sub.plan.period_days())).isoformat()
            self._emit_event("subscription.reactivated", {"subscription_id": subscription_id})
            return sub

    # -- dunning --
    def record_payment_failure(self, subscription_id: str, error: str) -> Subscription:
        sub = self.get_subscription(subscription_id)
        if not sub:
            raise ValueError("Subscription not found")

        with self._lock:
            sub.status = SubscriptionStatus.PAST_DUE
            sub.last_payment_attempt = _dt.datetime.now().isoformat()
            sub.dunning_stage = DunningStage.STAGE_1
            sub.next_retry_at = (_dt.datetime.now() + _dt.timedelta(days=1)).isoformat()  # Day 1 retry

            event = DunningEvent(
                event_id=f"dun_{uuid.uuid4().hex[:10]}",
                subscription_id=subscription_id,
                stage=DunningStage.STAGE_1,
                attempted_at=_dt.datetime.now().isoformat(),
                success=False,
                next_retry_at=sub.next_retry_at,
                error=error
            )
            self.dunning_events.setdefault(subscription_id, []).append(event)

            self._emit_event("dunning.started", {"subscription_id": subscription_id, "stage": 1})
            self._send_dunning_notification(sub, DunningStage.STAGE_1)
            return sub

    def process_dunning_retry(self, subscription_id: str) -> DunningEvent:
        sub = self.get_subscription(subscription_id)
        if not sub or sub.status != SubscriptionStatus.PAST_DUE:
            raise ValueError("Subscription not in dunning")

        current_stage = sub.dunning_stage or DunningStage.STAGE_1
        _order = [DunningStage.STAGE_1, DunningStage.STAGE_2, DunningStage.STAGE_3,
                  DunningStage.STAGE_4, DunningStage.STAGE_5]
        idx = _order.index(current_stage)
        next_stage = _order[idx + 1] if idx + 1 < len(_order) else None

        with self._lock:
            # Attempt payment via gateway
            success = False
            error = None
            if self.payment_gateway and sub.payment_method_id:
                try:
                    # Get amount from current plan
                    amount = sub.plan.price_cents
                    result = self.payment_gateway.capture(f"dun_{subscription_id}_{_dt.datetime.now().strftime('%Y%m%d')}", "card", amount)
                    success = result.status.value == "captured"
                    if not success:
                        error = f"Payment failed: {result.status.value}"
                except Exception as e:
                    error = str(e)

            if success:
                sub.status = SubscriptionStatus.ACTIVE
                sub.dunning_stage = None
                sub.last_payment_attempt = _dt.datetime.now().isoformat()
                sub.next_retry_at = None
                event = DunningEvent(
                    event_id=f"dun_{uuid.uuid4().hex[:10]}",
                    subscription_id=subscription_id,
                    stage=current_stage,
                    attempted_at=_dt.datetime.now().isoformat(),
                    success=True
                )
                self._emit_event("dunning.recovered", {"subscription_id": subscription_id, "stage": current_stage.value})
            else:
                if next_stage:
                    sub.dunning_stage = next_stage
                    sub.next_retry_at = (_dt.datetime.now() + _dt.timedelta(days=next_stage.value)).isoformat()
                    self._send_dunning_notification(sub, next_stage)
                else:
                    # Exhausted all stages -> cancel
                    sub.status = SubscriptionStatus.CANCELLED
                    sub.cancelled_at = _dt.datetime.now().isoformat()
                    sub.cancelled_reason = "Dunning exhausted"
                    self._emit_event("dunning.exhausted", {"subscription_id": subscription_id})

                event = DunningEvent(
                    event_id=f"dun_{uuid.uuid4().hex[:10]}",
                    subscription_id=subscription_id,
                    stage=current_stage,
                    attempted_at=_dt.datetime.now().isoformat(),
                    success=False,
                    next_retry_at=sub.next_retry_at,
                    error=error
                )

            self.dunning_events.setdefault(subscription_id, []).append(event)
            return event

    def _send_dunning_notification(self, sub: Subscription, stage: DunningStage):
        """Send email/SMS based on stage. In production, integrate with notification service."""
        templates = {
            DunningStage.STAGE_1: "Payment failed for your subscription. We'll retry in 1 day. Please update your payment method.",
            DunningStage.STAGE_2: "Second payment attempt failed. We'll retry in 4 days. Please check your payment method.",
            DunningStage.STAGE_3: "Third payment attempt failed. We'll retry in 7 days. Contact support if you need help.",
            DunningStage.STAGE_4: "Final retry in 14 days. Your subscription will be cancelled if payment fails.",
            DunningStage.STAGE_5: "Final attempt failed. Your subscription has been cancelled."
        }
        logger.info("Dunning notification for sub %s stage %s: %s", sub.subscription_id, stage.value, templates.get(stage, ""))

    # -- invoicing --
    def generate_invoice(self, subscription_id: str) -> Invoice:
        sub = self.get_subscription(subscription_id)
        if not sub:
            raise ValueError("Subscription not found")

        with self._lock:
            inv = Invoice(
                invoice_id=f"inv_{uuid.uuid4().hex[:12]}",
                subscription_id=subscription_id,
                customer_id=sub.customer_id,
                amount_cents=sub.plan.price_cents,
                currency=sub.plan.currency,
                status="open",
                period_start=sub.current_period_start,
                period_end=sub.current_period_end,
                due_date=(_dt.datetime.now() + _dt.timedelta(days=7)).isoformat()
            )
            self.invoices[inv.invoice_id] = inv
            return inv

    def mark_invoice_paid(self, invoice_id: str, payment_intent_id: str) -> Invoice:
        inv = self.invoices.get(invoice_id)
        if not inv:
            raise ValueError("Invoice not found")
        inv.status = "paid"
        inv.paid_at = _dt.datetime.now().isoformat()
        inv.payment_intent_id = payment_intent_id
        return inv

    # -- analytics --
    def get_metrics(self) -> Dict[str, Any]:
        with self._lock:
            active = [s for s in self.subscriptions.values() if s.is_active()]
            trialing = [s for s in self.subscriptions.values() if s.is_trial()]
            past_due = [s for s in self.subscriptions.values() if s.status == SubscriptionStatus.PAST_DUE]
            cancelled = [s for s in self.subscriptions.values() if s.status in (SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED)]

            def _mrr_cents(p: Plan) -> float:
                if p.interval == BillingInterval.MONTHLY:
                    return p.price_cents / 30
                if p.interval == BillingInterval.QUARTERLY:
                    return p.price_cents / 90
                return p.price_cents / (365 / 12)

            mrr = sum(_mrr_cents(s.plan) for s in active)
            arr = mrr * 12

            churned_30d = len([s for s in cancelled if s.cancelled_at and (_dt.datetime.now() - _dt.datetime.fromisoformat(s.cancelled_at)).days <= 30])
            churn_rate = churned_30d / max(len(active) + churned_30d, 1)

            return {
                "total_subscriptions": len(self.subscriptions),
                "active": len(active),
                "trialing": len(trialing),
                "past_due": len(past_due),
                "cancelled_30d": churned_30d,
                "churn_rate_30d": round(churn_rate, 4),
                "mrr_cents": round(mrr),
                "arr_cents": round(arr),
                "dunning_active": len(past_due),
                "plans_distribution": {p: len([s for s in active if s.plan.plan_id == p]) for p in PLANS}
            }

    # -- events --
    def _emit_event(self, name: str, payload: Dict[str, Any]):
        if self.data_loop:
            self.data_loop.emit(name, payload.get("customer_id", "system"), payload.get("revenue_cents", 0), 0, payload)


# ── FastAPI router ─────────────────────────────────────────────────────────


def create_subscription_router():
    from fastapi import APIRouter, HTTPException, Body
    from pydantic import BaseModel

    router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

    @router.post("")
    def create_subscription(req: CreateSub = Body(...)):
        sub = subscription_engine.create_subscription(req.customer_id, req.plan_id, req.payment_method_id)
        return {"ok": True, "subscription_id": sub.subscription_id, "status": sub.status.value}

    @router.get("/plans")
    def list_plans(region: Optional[str] = None):
        if region:
            plans = plans_for_region(region)
        else:
            plans = subscription_engine.list_plans()
        return {"ok": True, "plans": [
            {"plan_id": p.plan_id, "name": p.name, "interval": p.interval.value,
             "price_cents": p.price_cents, "currency": p.currency,
             "months": p.period_months(), "trial_days": p.trial_days,
             "features": p.features}
            for p in plans]}

    @router.get("/metrics")
    def metrics():
        return {"ok": True, "metrics": subscription_engine.get_metrics()}

    @router.get("/health")
    def health():
        return {"ok": True, "status": "healthy"}

    @router.get("/dunning/{subscription_id}")
    def get_dunning(subscription_id: str):
        events = subscription_engine.dunning_events.get(subscription_id, [])
        return {"ok": True, "events": [e.__dict__ for e in events]}

    @router.get("/{subscription_id}/invoices")
    def list_invoices(subscription_id: str):
        invs = [i for i in subscription_engine.invoices.values() if i.subscription_id == subscription_id]
        return {"ok": True, "invoices": [i.__dict__ for i in invs]}

    @router.post("/{subscription_id}/change-plan")
    def change_plan(subscription_id: str, req: ChangePlan = Body(...)):
        change = subscription_engine.change_plan(subscription_id, req.new_plan_id, req.prorate, req.immediate)
        return {"ok": True, "change": change.__dict__}

    @router.post("/{subscription_id}/pause")
    def pause(subscription_id: str):
        sub = subscription_engine.pause_subscription(subscription_id)
        return {"ok": True, "status": sub.status.value}

    @router.post("/{subscription_id}/resume")
    def resume(subscription_id: str):
        sub = subscription_engine.resume_subscription(subscription_id)
        return {"ok": True, "status": sub.status.value}

    @router.post("/{subscription_id}/cancel")
    def cancel(subscription_id: str, req: CancelSub = Body(...)):
        sub = subscription_engine.cancel_subscription(subscription_id, req.reason, req.immediate)
        return {"ok": True, "status": sub.status.value}

    @router.post("/{subscription_id}/reactivate")
    def reactivate(subscription_id: str):
        sub = subscription_engine.reactivate_subscription(subscription_id)
        return {"ok": True, "status": sub.status.value}

    @router.get("/{subscription_id}")
    def get_subscription(subscription_id: str):
        sub = subscription_engine.get_subscription(subscription_id)
        if not sub:
            raise HTTPException(404, "Not found")
        return {"ok": True, "subscription": sub.__dict__}

    return router


subscription_engine = SubscriptionEngine()