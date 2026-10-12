#!/usr/bin/env python3
"""
Payment Gateway -- 支付 (step 6 of the 16-step commerce workflow)

  * single internal interface for capturing a payment for a routed order
  * PSP (payment service provider) adapters are swappable: Stripe, PayPal,
    SEPA direct debit, Klarna -- same thin-adapter pattern as 物流
  * captures a gross amount, computes a processing fee, exposes net revenue
  * refunds: full or partial (right-of-withdrawal, RMA resolution)
  * reconcile(): captured vs refunded vs net -- feeds the 数据闭环 unit economics

Offline contract (same as `children_logistics`): when no PSP credentials are
configured the gateway returns deterministic mock records and every response
explicitly carries ``mock: true`` so callers/auditors can never mistake it for
real money movement.  Nothing is ever silently faked in production.
"""
import os, json, uuid, logging, threading
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger("payment")

# Default mock fee schedule (approximates a combined card acquirer rate).
MOCK_FEE_RATE = 0.029       # 2.9%
MOCK_FEE_FIXED_CENTS = 29   # + EUR 0.29 per capture
CURRENCY = "EUR"


class PaymentStatus(Enum):
    CAPTURED = "captured"
    PARTIALLY_REFUNDED = "partially_refunded"
    REFUNDED = "refunded"
    FAILED = "failed"


@dataclass
class PaymentRecord:
    payment_id: str
    order_id: str
    method: str                 # card | sepa_debit | paypal | klarna | ideal | ...
    amount_cents: int           # gross captured amount
    fee_cents: int              # processing fee withheld by the PSP
    net_cents: int              # amount - fee (what the merchant actually gets)
    currency: str = CURRENCY
    status: PaymentStatus = PaymentStatus.CAPTURED
    refunded_cents: int = 0
    psp: str = "mock"           # real value once an adapter has credentials
    mock: bool = True           # ALWAYS explicit
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    refunded_at: Optional[str] = None


class PSPAdapter:
    """Thin, swappable PSP interface.  Implementations MUST be credential-gated."""

    name = "base"

    def __init__(self):
        self.enabled = False
        self.credentials: Dict[str, str] = {}

    def configure(self, creds: Dict[str, str]):
        self.credentials = creds
        self.enabled = bool(creds)

    def capture(self, order_id: str, method: str, amount_cents: int) -> Dict[str, Any]:
        raise NotImplementedError

    def refund(self, payment_id: str, amount_cents: int, reason: str = "") -> Dict[str, Any]:
        raise NotImplementedError


class MockPSPAdapter(PSPAdapter):
    """Deterministic offline PSP -- explicitly labelled ``mock`` in records."""

    def __init__(self):
        super().__init__()
        self.name = "mock"

    def capture(self, order_id: str, method: str, amount_cents: int) -> Dict[str, Any]:
        fee = int(round(amount_cents * MOCK_FEE_RATE)) + MOCK_FEE_FIXED_CENTS
        return {
            "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
            "amount_cents": int(amount_cents),
            "fee_cents": fee,
            "net_cents": int(amount_cents) - fee,
            "authorized": True,
            "mock": True,
        }

    def refund(self, payment_id: str, amount_cents: int, reason: str = "") -> Dict[str, Any]:
        return {"payment_id": payment_id, "refunded_cents": int(amount_cents),
                "refund_reason": reason, "ok": True, "mock": True}


class PaymentGateway:
    def __init__(self, adapter: Optional[PSPAdapter] = None):
        self.psp: PSPAdapter = adapter or MockPSPAdapter()
        self.records: Dict[str, PaymentRecord] = {}
        self._lock = threading.RLock()

    def register_psp(self, adapter: PSPAdapter):
        """Swap the PSP (e.g. a Stripe adapter once credentials exist)."""
        self.psp = adapter

    def capture(self, order_id: str, method: str, amount_cents: int) -> PaymentRecord:
        if amount_cents <= 0:
            rec = PaymentRecord(
                payment_id=f"pay_{uuid.uuid4().hex[:12]}", order_id=order_id,
                method=method, amount_cents=0, fee_cents=0, net_cents=0,
                status=PaymentStatus.FAILED, mock=True)
            with self._lock:
                self.records[rec.payment_id] = rec
            return rec
        out = self.psp.capture(order_id, method, amount_cents)
        rec = PaymentRecord(
            payment_id=out["payment_id"], order_id=order_id, method=method,
            amount_cents=out["amount_cents"], fee_cents=out["fee_cents"],
            net_cents=out["net_cents"], psp=self.psp.name,
            mock=bool(out.get("mock", getattr(self.psp, "enabled", False) is False)))
        with self._lock:
            self.records[rec.payment_id] = rec
        logger.info("payment %s captured for order %s (%d cents, net %d)",
                    rec.payment_id, order_id, rec.amount_cents, rec.net_cents)
        return rec

    def refund(self, payment_id: str, amount_cents: int, reason: str = "") -> Optional[PaymentRecord]:
        with self._lock:
            rec = self.records.get(payment_id)
            if not rec:
                return None
            max_refund = rec.amount_cents - rec.refunded_cents
            amount = min(int(amount_cents), max_refund)
            if amount <= 0:
                return rec
            out = self.psp.refund(payment_id, amount, reason)
            rec.refunded_cents += out["refunded_cents"]
            rec.refunded_at = datetime.now().isoformat()
            rec.status = (PaymentStatus.REFUNDED
                          if rec.refunded_cents >= rec.amount_cents
                          else PaymentStatus.PARTIALLY_REFUNDED)
            logger.info("refund %d cents on %s (%s)", amount, payment_id, reason)
            return rec

    # -- reporting / reconciliation --
    def reconcile(self) -> Dict[str, Any]:
        """Captured vs refunded vs net -- the 对账 corner of the data loop."""
        with self._lock:
            captured = sum(r.amount_cents for r in self.records.values())
            fees = sum(r.fee_cents for r in self.records.values())
            refunded = sum(r.refunded_cents for r in self.records.values())
            by_status: Dict[str, int] = {}
            for r in self.records.values():
                by_status[r.status.value] = by_status.get(r.status.value, 0) + 1
        return {
            "payments": len(self.records),
            "captured_cents": captured,
            "fees_cents": fees,
            "refunded_cents": refunded,
            "net_cents": captured - fees - refunded,
            "by_status": by_status,
            "psp": self.psp.name,
            "mock": isinstance(self.psp, MockPSPAdapter),
        }

    def list_payments(self, order_id: Optional[str] = None) -> List[Dict[str, Any]]:
        rows = self.records.values() if order_id is None else \
            [r for r in self.records.values() if r.order_id == order_id]
        return [asdict(r) for r in sorted(rows, key=lambda r: r.created_at)]


payment_gateway = PaymentGateway()


def create_payment_router():
    from fastapi import APIRouter, Body, HTTPException
    from pydantic import BaseModel
    router = APIRouter(prefix="/api/payments", tags=["Payments / 支付"])

    class CaptureReq(BaseModel):
        order_id: str
        method: str = "card"
        amount_cents: int

    class RefundReq(BaseModel):
        amount_cents: int
        reason: str = ""

    @router.post("/capture")
    async def capture(req: CaptureReq):
        return asdict(payment_gateway.capture(req.order_id, req.method, req.amount_cents))

    @router.post("/{payment_id}/refund")
    async def refund(payment_id: str, req: RefundReq):
        r = payment_gateway.refund(payment_id, req.amount_cents, req.reason)
        if not r:
            raise HTTPException(404, "payment not found")
        return asdict(r)

    @router.get("")
    async def list_payments(order_id: Optional[str] = None):
        return {"payments": payment_gateway.list_payments(order_id)}

    @router.get("/reconcile")
    async def reconcile():
        return payment_gateway.reconcile()

    return router


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    p1 = payment_gateway.capture("ord_1", "card", 25900)
    print("capture:", p1.payment_id, "net", p1.net_cents, "mock", p1.mock)
    p2 = payment_gateway.refund(p1.payment_id, 1990, "eu_withdrawal")
    print("refund ->", p2.status.value, p2.refunded_cents)
    print(json.dumps(payment_gateway.reconcile(), indent=2))