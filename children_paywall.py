#!/usr/bin/env python3
"""
Site-wide paywall -- 全站收费墙 (10 次免费 → 弹窗订阅 → 支付成功解锁).

The rule the operator published:

  * every visitor gets **10 free uses** of the companion;
  * on the 11th use the front-end shows a subscription modal;
  * access unlocks **only after a payment actually succeeds** (or a real
    subscription — including a trial — exists for that visitor).

This module is the single source of truth for that rule.  It is deliberately
honest: ``unlock`` refuses to grant access off an unverified payment, and mock
payments only count when ``PAYWALL_ALLOW_MOCK=1`` is explicitly set for tests.
Free-use counters persist through :mod:`state_store` (redis -> file -> memory)
so a restart never resets a visitor back to 10 free uses on a live host.

Endpoints (mounted at ``/api/paywall``):
    GET  /status?visitor_id=...           current quota + entitlement
    POST /consume {visitor_id, feature}   spend one use (or report locked)
    POST /unlock  {visitor_id, ...}       verify a payment/subscription -> unlock
    POST /grant   {visitor_id, months}    internal-only (referral rewards etc.)
    POST /revoke  {visitor_id}            internal-only
"""
from __future__ import annotations

import datetime as _dt
import logging
import os
import sys
import threading
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger("paywall")

# Make ``state_store`` (scripts/) and the sibling children_* modules importable
# no matter which directory the process was launched from.
_HERE = os.path.dirname(os.path.abspath(__file__))
_SCRIPTS = os.path.join(_HERE, "scripts")
for _p in (_SCRIPTS, _HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:  # 24/7-safe persistence; falls back to memory if scripts/ is absent
    from state_store import create_store  # type: ignore
except Exception:  # noqa: BLE001
    try:
        from scripts.state_store import create_store  # type: ignore
    except Exception:  # noqa: BLE001
        create_store = None  # type: ignore

DEFAULT_FREE_USES = int(os.getenv("PAYWALL_FREE_USES", "10") or 10)
DEFAULT_CURRENCY = os.getenv("PAYWALL_DEFAULT_CURRENCY", "USD")
# Where the money lands: the operator's Alipay settlement account (informational
# for the UI; the actual settlement is configured at the PSP/Moltspay merchant).
SETTLEMENT_ALIPAY_ACCOUNT = os.getenv("SETTLEMENT_ALIPAY_ACCOUNT", "")

# Pydantic API models must live at module scope for FastAPI/Pydantic v2 to
# resolve the annotations (FastAPI calls get_type_hints on the route function).
try:
    from pydantic import BaseModel as _BaseModel
except Exception:  # noqa: BLE001 - pydantic is a hard dep of the app, but be safe
    _BaseModel = object  # type: ignore

# FastAPI resolves route annotations against *module* globals (this file uses
# ``from __future__ import annotations``), so ``Request`` must be importable at
# module scope, not just inside ``create_paywall_router``.
try:
    from fastapi import Request
except Exception:  # noqa: BLE001
    Request = object  # type: ignore


class ConsumeIn(_BaseModel):  # type: ignore[misc]
    visitor_id: str
    feature: str = ""


class UnlockIn(_BaseModel):  # type: ignore[misc]
    visitor_id: str
    plan_id: str = ""
    subscription_id: Optional[str] = None
    payment_id: Optional[str] = None
    months: Optional[int] = None
    currency: Optional[str] = None


class GrantIn(_BaseModel):  # type: ignore[misc]
    visitor_id: str
    months: int
    reason: str = "internal"
    plan_id: str = ""


class SubscribeIn(_BaseModel):  # type: ignore[misc]
    visitor_id: str
    plan_id: str
    method: str = "card"
    currency: Optional[str] = None


class RevokeIn(_BaseModel):  # type: ignore[misc]
    visitor_id: str
    reason: str = "internal"


def _now() -> _dt.datetime:
    return _dt.datetime.now(_dt.timezone.utc)


def _iso(dt: _dt.datetime) -> str:
    return dt.isoformat()


@dataclass
class VisitorState:
    visitor_id: str
    used: int = 0
    limit: int = DEFAULT_FREE_USES
    currency: str = DEFAULT_CURRENCY
    first_seen: str = field(default_factory=lambda: _iso(_now()))
    last_seen: str = field(default_factory=lambda: _iso(_now()))
    unlocked_until: Optional[str] = None
    plan_id: Optional[str] = None
    subscription_id: Optional[str] = None
    payment_id: Optional[str] = None
    unlocks: List[Dict[str, Any]] = field(default_factory=list)

    def is_unlocked(self) -> bool:
        if not self.unlocked_until:
            return False
        try:
            return _dt.datetime.fromisoformat(self.unlocked_until) > _now()
        except ValueError:
            return False


class PaywallEngine:
    """Metered free quota + verified-unlock entitlement, persisted."""

    def __init__(self, store=None, free_uses: Optional[int] = None,
                 allow_mock: Optional[bool] = None):
        if store is None and create_store is not None:
            store = create_store(
                os.getenv("PAYWALL_STATE_BACKEND", "file"),
                directory=os.path.join(_HERE, "runtime", "paywall_state"))
        self.store = store
        self.free_uses = int(free_uses if free_uses is not None else DEFAULT_FREE_USES)
        self.allow_mock = (os.getenv("PAYWALL_ALLOW_MOCK", "0") not in ("0", "false", "False")
                           if allow_mock is None else allow_mock)
        self._lock = threading.RLock()

    # -- persistence ------------------------------------------------------- #
    def _key(self, visitor_id: str) -> str:
        return f"paywall:visitor:{visitor_id}"

    def _load(self, visitor_id: str) -> VisitorState:
        rec = None
        if self.store is not None:
            rec = self.store.get(self._key(visitor_id))
        if isinstance(rec, dict):
            known = {f for f in VisitorState.__dataclass_fields__} - {"visitor_id"}  # type: ignore[attr-defined]
            state = VisitorState(visitor_id=visitor_id,
                                 **{k: v for k, v in rec.items() if k in known})
            if state.limit != self.free_uses:
                state.limit = self.free_uses
            return state
        return VisitorState(visitor_id=visitor_id, limit=self.free_uses)

    def _save(self, state: VisitorState) -> None:
        if self.store is not None:
            try:
                self.store.set(self._key(state.visitor_id), asdict(state),
                               ttl=int(os.getenv("PAYWALL_STATE_TTL", str(86400 * 400))))
            except Exception as exc:  # noqa: BLE001 - never break a request on I/O
                logger.warning("paywall persist failed for %s: %s", state.visitor_id, exc)

    # -- read -------------------------------------------------------------- #
    def status(self, visitor_id: str) -> Dict[str, Any]:
        with self._lock:
            st = self._load(visitor_id)
            st.last_seen = _iso(_now())
            self._save(st)
            unlocked = st.is_unlocked()
            return {
                "ok": True,
                "visitor_id": visitor_id,
                "used": st.used,
                "limit": st.limit,
                "remaining": None if unlocked else max(st.limit - st.used, 0),
                "locked": (not unlocked) and st.used >= st.limit,
                "unlocked": unlocked,
                "unlocked_until": st.unlocked_until,
                "plan_id": st.plan_id,
                "currency": st.currency,
                "settlement_alipay": SETTLEMENT_ALIPAY_ACCOUNT,
                "plans": self._plan_catalog(st.currency),
            }

    def consume(self, visitor_id: str, feature: str = "") -> Dict[str, Any]:
        """Spend one free use. Never fabricates access when the quota is spent."""
        with self._lock:
            st = self._load(visitor_id)
            st.last_seen = _iso(_now())
            if st.is_unlocked():
                self._save(st)
                return {"ok": True, "allowed": True, "locked": False, "unlocked": True,
                        "used": st.used, "limit": st.limit, "remaining": None,
                        "feature": feature}
            if st.used >= st.limit:
                self._save(st)
                return {"ok": True, "allowed": False, "locked": True, "unlocked": False,
                        "used": st.used, "limit": st.limit, "remaining": 0,
                        "feature": feature, "subscribe_required": True,
                        "plans": self._plan_catalog(st.currency)}
            st.used += 1
            self._save(st)
            remaining = max(st.limit - st.used, 0)
            return {"ok": True, "allowed": True, "locked": remaining == 0,
                    "unlocked": False, "used": st.used, "limit": st.limit,
                    "remaining": remaining, "feature": feature,
                    "subscribe_required": remaining == 0}

    # -- writes ------------------------------------------------------------ #
    def unlock(self, visitor_id: str, *, plan_id: str = "",
               subscription_id: Optional[str] = None,
               payment_id: Optional[str] = None,
               months: Optional[int] = None,
               currency: Optional[str] = None,
               source: str = "subscription") -> Dict[str, Any]:
        """Grant access ONLY after verifying a real payment or subscription."""
        months = months if months else None
        currency = (currency or DEFAULT_CURRENCY).upper()

        if payment_id:
            ok, reason, payment = self._verify_payment(payment_id)
            if not ok:
                return {"ok": False, "error": reason, "unlocked": False,
                        "payment_id": payment_id}
            if currency == DEFAULT_CURRENCY and payment.get("currency"):
                currency = str(payment["currency"]).upper()
        else:
            ok, reason = self._verify_subscription(subscription_id)
            if not ok:
                return {"ok": False, "error": reason, "unlocked": False,
                        "subscription_id": subscription_id}

        if not months:
            months = self._months_for(plan_id) or 1

        with self._lock:
            st = self._load(visitor_id)
            base = _now()
            if st.is_unlocked():
                try:
                    base = _dt.datetime.fromisoformat(st.unlocked_until)  # type: ignore[arg-type]
                except ValueError:
                    base = _now()
            st.unlocked_until = _iso(base + _dt.timedelta(days=30 * months))
            st.plan_id = plan_id or st.plan_id
            st.currency = currency
            st.subscription_id = subscription_id or st.subscription_id
            st.payment_id = payment_id or st.payment_id
            st.unlocks.append({"at": _iso(_now()), "months": months, "plan_id": plan_id,
                               "subscription_id": subscription_id,
                               "payment_id": payment_id, "source": source})
            self._save(st)
            logger.info("paywall unlocked %s for %s month(s) (plan=%s, src=%s)",
                        visitor_id, months, plan_id, source)
            return {"ok": True, "unlocked": True, "unlocked_until": st.unlocked_until,
                    "months": months, "plan_id": st.plan_id, "currency": st.currency}

    def grant(self, visitor_id: str, months: int, reason: str = "internal",
              plan_id: str = "") -> Dict[str, Any]:
        """Internal grant (referral rewards, goodwill). Not payment-verified —
        callers must be internal/mounted behind the hidden API."""
        months = max(int(months), 0)
        if months <= 0:
            return {"ok": False, "error": "months must be > 0"}
        with self._lock:
            st = self._load(visitor_id)
            base = _now()
            if st.is_unlocked():
                try:
                    base = _dt.datetime.fromisoformat(st.unlocked_until)  # type: ignore[arg-type]
                except ValueError:
                    base = _now()
            st.unlocked_until = _iso(base + _dt.timedelta(days=30 * months))
            if plan_id:
                st.plan_id = plan_id
            st.unlocks.append({"at": _iso(_now()), "months": months,
                               "plan_id": plan_id, "source": f"grant:{reason}"})
            self._save(st)
            return {"ok": True, "unlocked": True, "unlocked_until": st.unlocked_until,
                    "months": months}

    def revoke(self, visitor_id: str, reason: str = "internal") -> Dict[str, Any]:
        with self._lock:
            st = self._load(visitor_id)
            st.unlocked_until = None
            st.unlocks.append({"at": _iso(_now()), "months": 0, "source": f"revoke:{reason}"})
            self._save(st)
            return {"ok": True, "unlocked": False}

    # -- verification helpers --------------------------------------------- #
    def _verify_payment(self, payment_id: str):
        try:
            from children_payment import payment_gateway  # local import: avoid cycle
        except Exception as exc:  # noqa: BLE001
            return False, f"payment gateway unavailable: {exc}", {}
        rec = payment_gateway.records.get(payment_id)
        if not rec:
            return False, "payment not found", {}
        if rec.status.value != "captured":
            return False, f"payment not captured (status={rec.status.value})", asdict(rec)
        if getattr(rec, "mock", True) and not self.allow_mock:
            return False, "payment is a mock record (set PAYWALL_ALLOW_MOCK=1 only for tests)", asdict(rec)
        return True, "", asdict(rec)

    def _verify_subscription(self, subscription_id: Optional[str]):
        if not subscription_id:
            return False, "no payment_id or subscription_id supplied"
        try:
            from children_subscription import subscription_engine  # local import
        except Exception as exc:  # noqa: BLE001
            return False, f"subscription engine unavailable: {exc}"
        sub = subscription_engine.get_subscription(subscription_id)
        if not sub:
            return False, "subscription not found"
        if not sub.is_active():
            return False, f"subscription not active (status={sub.status.value})"
        # Operator rule: access unlocks only once payment succeeds. A trial is
        # NOT a payment -- allow it only when explicitly opted in.
        if sub.is_trial() and os.getenv("PAYWALL_TRIAL_UNLOCKS", "0") in ("0", "false", "False"):
            return False, "trial does not unlock the wall (set PAYWALL_TRIAL_UNLOCKS=1 to change)"
        return True, ""

    def _months_for(self, plan_id: str) -> int:
        try:
            from children_subscription import period_months_for_plan
            return period_months_for_plan(plan_id)
        except Exception:  # noqa: BLE001
            return 0

    def _plan_catalog(self, currency: str) -> List[Dict[str, Any]]:
        try:
            from children_subscription import PLANS
        except Exception:  # noqa: BLE001
            return []
        cur = (currency or DEFAULT_CURRENCY).upper()
        out = []
        for p in PLANS.values():
            if p.currency.upper() != cur:
                continue
            out.append({"plan_id": p.plan_id, "name": p.name,
                        "interval": p.interval.value, "price_cents": p.price_cents,
                        "currency": p.currency, "months": p.period_months()})
        return sorted(out, key=lambda x: x["months"])


paywall = PaywallEngine()


# -- FastAPI router --------------------------------------------------------- #
def create_paywall_router():
    from fastapi import APIRouter, Request
    import secrets as _secrets

    router = APIRouter(prefix="/api/paywall", tags=["Paywall / 收费墙"])

    def _internal_ok(request: Request) -> bool:
        expected = os.getenv("AUTONOMOUS_INTERNAL_KEY", "")
        if not expected:
            return False
        supplied = request.headers.get("X-Internal-Key", "")
        return bool(supplied) and _secrets.compare_digest(supplied, expected)

    @router.post("/subscribe")
    def subscribe(req: SubscribeIn):
        """One-call checkout: create the subscription, capture one period's
        payment, then unlock.  The response always reports ``payment.mock`` so a
        caller can never mistake a dev capture for real money."""
        try:
            from children_subscription import subscription_engine, PLANS
            from children_payment import payment_gateway
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": f"engines unavailable: {exc}"}
        plan = PLANS.get(req.plan_id)
        if not plan:
            return {"ok": False, "error": "unknown plan"}
        sub = subscription_engine.create_subscription(req.visitor_id, req.plan_id)
        rec = payment_gateway.capture(f"sub_{sub.subscription_id}", req.method,
                                      plan.price_cents)
        out = paywall.unlock(req.visitor_id, plan_id=req.plan_id,
                             subscription_id=sub.subscription_id,
                             payment_id=rec.payment_id,
                             currency=req.currency or plan.currency)
        return {
            "ok": bool(out.get("ok")),
            "subscription_id": sub.subscription_id,
            "subscription_status": sub.status.value,
            "payment": {"payment_id": rec.payment_id, "mock": rec.mock,
                        "amount_cents": rec.amount_cents, "currency": rec.currency},
            "unlock": out,
        }

    @router.get("/status")
    def status(visitor_id: str):
        return paywall.status(visitor_id)

    @router.post("/consume")
    def consume(req: ConsumeIn):
        return paywall.consume(req.visitor_id, req.feature)

    @router.post("/unlock")
    def unlock(req: UnlockIn):
        return paywall.unlock(req.visitor_id, plan_id=req.plan_id,
                              subscription_id=req.subscription_id,
                              payment_id=req.payment_id, months=req.months,
                              currency=req.currency)

    @router.post("/grant")
    def grant(req: GrantIn, request: Request):
        # grants move entitlement without a payment -> internal key only
        if not _internal_ok(request):
            return {"ok": False, "error": "internal key required"}
        return paywall.grant(req.visitor_id, req.months, req.reason, req.plan_id)

    @router.post("/revoke")
    def revoke(req: RevokeIn, request: Request):
        if not _internal_ok(request):
            return {"ok": False, "error": "internal key required"}
        return paywall.revoke(req.visitor_id, req.reason)

    return router


if __name__ == "__main__":  # tiny self-demo
    logging.basicConfig(level=logging.INFO)
    p = PaywallEngine(free_uses=10, allow_mock=False)
    for i in range(11):
        r = p.consume("demo")
        print(i + 1, "allowed=", r["allowed"], "remaining=", r["remaining"])
