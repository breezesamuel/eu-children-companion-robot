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
    PENDING = "pending"          # intent created, waiting for the buyer to pay
    EXPIRED = "expired"
    PARTIALLY_REFUNDED = "partially_refunded"
    REFUNDED = "refunded"
    FAILED = "failed"


class PSPError(Exception):
    """Raised by a real PSP adapter when it cannot complete the call.

    Adapters MUST raise this instead of returning a fabricated success -- the
    gateway turns it into an explicit ``failed`` record (``mock: false``).
    """


@dataclass
class PaymentRecord:
    payment_id: str
    order_id: str
    method: str                 # card | sepa_debit | paypal | klarna | ideal | wechat | alipay | ...
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
    # async rails (PayPal redirect, WeChat/Alipay QR): the buyer completes out of
    # band, then the server verifies before the record becomes ``captured``.
    pay_url: Optional[str] = None
    qr_code: Optional[str] = None
    provider_ref: Optional[str] = None


class PSPAdapter:
    """Thin, swappable PSP interface.  Implementations MUST be credential-gated."""

    name = "base"
    #: currencies this rail can charge in
    currencies: tuple = ()

    def __init__(self):
        self.enabled = False
        self.credentials: Dict[str, str] = {}
        self.currency = CURRENCY

    def configure(self, creds: Dict[str, str]):
        self.credentials = creds
        self.enabled = bool(creds)

    def capture(self, order_id: str, method: str, amount_cents: int) -> Dict[str, Any]:
        raise NotImplementedError

    #: async rails: create a payment intent the buyer completes out of band
    def create_intent(self, order_id: str, method: str, amount_cents: int,
                      currency: str = CURRENCY, description: str = "") -> Dict[str, Any]:
        raise NotImplementedError

    #: ask the provider whether the intent was paid (never guess)
    def verify(self, provider_ref: str) -> Dict[str, Any]:
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

    def create_intent(self, order_id: str, method: str, amount_cents: int,
                      currency: str = CURRENCY, description: str = "") -> Dict[str, Any]:
        fee = int(round(amount_cents * MOCK_FEE_RATE)) + MOCK_FEE_FIXED_CENTS
        return {
            "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
            "amount_cents": int(amount_cents),
            "fee_cents": fee,
            "net_cents": int(amount_cents) - fee,
            "status": "captured",          # mock captures synchronously
            "mock": True,
            "currency": currency,
        }

    def verify(self, provider_ref: str) -> Dict[str, Any]:
        return {"paid": True, "fee_cents": 0, "mock": True}

    def refund(self, payment_id: str, amount_cents: int, reason: str = "") -> Dict[str, Any]:
        return {"payment_id": payment_id, "refunded_cents": int(amount_cents),
                "refund_reason": reason, "ok": True, "mock": True}


import urllib.request as _urlreq  # noqa: E402  (stdlib only)
import urllib.error as _urlerr  # noqa: E402
import base64 as _base64  # noqa: E402


class PayPalAdapter(PSPAdapter):
    """PayPal Orders v2 REST adapter (BSD-style thin client, stdlib only).

    Real money movement: create an order, hand the buyer the approval URL, then
    verify.  ``verify`` only reports ``paid`` when PayPal says the order is
    COMPLETED.  Credentials come from ``PAYPAL_CLIENT_ID`` / ``PAYPAL_CLIENT_SECRET``.
    """

    name = "paypal"
    currencies = ("USD", "EUR", "GBP", "AUD", "CAD")

    def __init__(self, api_base: Optional[str] = None):
        super().__init__()
        self.api_base = (api_base or os.getenv("PAYPAL_API_BASE")
                         or ("https://api-m.paypal.com"
                             if os.getenv("PAYPAL_ENV", "sandbox").lower() == "live"
                             else "https://api-m.sandbox.paypal.com")).rstrip("/")

    def configure(self, creds: Dict[str, str]):
        super().configure(creds)
        # empty strings must NOT count as configured
        self.enabled = bool(creds.get("client_id") and creds.get("client_secret"))

    def _token(self) -> str:
        cid = self.credentials.get("client_id", "")
        sec = self.credentials.get("client_secret", "")
        if not cid or not sec:
            raise PSPError("paypal credentials not configured")
        raw = _base64.b64encode(f"{cid}:{sec}".encode()).decode()
        req = _urlreq.Request(
            f"{self.api_base}/v1/oauth2/token",
            data=b"grant_type=client_credentials",
            headers={"Authorization": f"Basic {raw}",
                     "Content-Type": "application/x-www-form-urlencoded"})
        try:
            with _urlreq.urlopen(req, timeout=25) as resp:
                return json.loads(resp.read().decode())["access_token"]
        except Exception as exc:  # noqa: BLE001
            raise PSPError(f"paypal token failed: {exc}") from exc

    def create_intent(self, order_id: str, method: str, amount_cents: int,
                      currency: str = "USD", description: str = "") -> Dict[str, Any]:
        tok = self._token()
        body = json.dumps({
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": order_id[:120],
                "description": (description or order_id)[:127],
                "amount": {"currency_code": currency.upper(),
                           "value": f"{amount_cents / 100:.2f}"},
            }],
        }).encode()
        req = _urlreq.Request(f"{self.api_base}/v2/checkout/orders", data=body,
                              headers={"Authorization": f"Bearer {tok}",
                                       "Content-Type": "application/json"})
        try:
            with _urlreq.urlopen(req, timeout=25) as resp:
                order = json.loads(resp.read().decode())
        except Exception as exc:  # noqa: BLE001
            raise PSPError(f"paypal create order failed: {exc}") from exc
        approve = next((l["href"] for l in order.get("links", []) if l.get("rel") == "approve"), None)
        return {"provider_ref": order.get("id"), "pay_url": approve,
                "status": "pending", "mock": False, "currency": currency.upper(),
                "amount_cents": amount_cents}

    def verify(self, provider_ref: str) -> Dict[str, Any]:
        tok = self._token()
        req = _urlreq.Request(f"{self.api_base}/v2/checkout/orders/{provider_ref}",
                              headers={"Authorization": f"Bearer {tok}"})
        try:
            with _urlreq.urlopen(req, timeout=25) as resp:
                order = json.loads(resp.read().decode())
        except Exception as exc:  # noqa: BLE001
            raise PSPError(f"paypal get order failed: {exc}") from exc
        if order.get("status") != "COMPLETED":
            return {"paid": False, "status": order.get("status"), "fee_cents": 0}
        fee = 0
        try:
            creq = _urlreq.Request(f"{self.api_base}/v2/checkout/orders/{provider_ref}/capture",
                                   data=b"{}",
                                   headers={"Authorization": f"Bearer {tok}",
                                            "Content-Type": "application/json"})
            with _urlreq.urlopen(creq, timeout=25) as resp:
                cap = json.loads(resp.read().decode())
            br = (cap.get("purchase_units", [{}])[0].get("payments", {})
                  .get("captures", [{}])[0].get("seller_receivable_breakdown", {}))
            fee = int(round(float(br.get("paypal_fee", {}).get("value", "0")) * 100))
        except Exception as exc:  # noqa: BLE001 - order may already be captured
            logger.info("paypal capture note: %s", exc)
        return {"paid": True, "fee_cents": fee}

    def refund(self, payment_id: str, amount_cents: int, reason: str = "") -> Dict[str, Any]:
        raise PSPError("paypal refunds go through the capture id; not wired yet")


class MoltspayAdapter(PSPAdapter):
    """MoltsPay fiat rails -- WeChat Pay + Alipay, settling in CNY.

    MoltsPay is a **provider-side** x402 payment server: the merchant runs it with
    a ``moltspay.services.json`` manifest plus their WeChat/Alipay merchant keys,
    and it settles CNY into the configured Alipay account.  This adapter speaks to
    that server's REST helper endpoints (``MOLTSPAY_ORDER_URL`` / ``MOLTSPAY_STATUS_URL``),
    authenticated with ``MOLTSPAY_API_KEY``/``MOLTSPAY_SECRET``.

    Honesty contract: with no order URL configured the adapter is *disabled* and
    the gateway falls back to an explicitly ``mock`` record.  With a URL set but a
    failing call it raises :class:`PSPError` -- it never invents a ``paid`` result.
    """

    name = "moltspay"
    currencies = ("CNY",)

    def __init__(self):
        super().__init__()
        self.order_url = os.getenv("MOLTSPAY_ORDER_URL", "").strip()
        self.status_url = os.getenv("MOLTSPAY_STATUS_URL", "").strip()

    def configure(self, creds: Dict[str, str]):
        super().configure(creds)
        # a key alone is not enough -- we also need the server endpoint
        self.enabled = bool(creds.get("api_key") and self.order_url)

    def create_intent(self, order_id: str, method: str, amount_cents: int,
                      currency: str = "CNY", description: str = "") -> Dict[str, Any]:
        if not self.order_url:
            raise PSPError("MOLTSPAY_ORDER_URL not configured")
        body = json.dumps({
            "apiKey": self.credentials.get("api_key", ""),
            "reference": order_id,
            "channel": method,                      # wechat | alipay
            "amount_cny": round(amount_cents / 100.0, 2),
            "currency": currency.upper(),
            "subject": (description or order_id)[:120],
            "settle_to": os.getenv("SETTLEMENT_ALIPAY_ACCOUNT", ""),
        }).encode()
        req = _urlreq.Request(self.order_url, data=body, headers={
            "Content-Type": "application/json",
            "X-Api-Key": self.credentials.get("api_key", ""),
            "X-Api-Secret": self.credentials.get("secret", ""),
        })
        try:
            with _urlreq.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode())
        except Exception as exc:  # noqa: BLE001
            raise PSPError(f"moltspay create order failed: {exc}") from exc
        ref = data.get("order_no") or data.get("trade_no") or data.get("id")
        pay_url = data.get("pay_url") or data.get("code_url") or data.get("qr_url")
        if not ref and not pay_url:
            raise PSPError(f"moltspay returned no order reference: {str(data)[:200]}")
        return {"provider_ref": ref, "pay_url": pay_url, "qr_code": data.get("qr_code"),
                "status": "pending", "mock": False, "currency": currency.upper(),
                "amount_cents": amount_cents}

    def verify(self, provider_ref: str) -> Dict[str, Any]:
        if not self.status_url:
            raise PSPError("MOLTSPAY_STATUS_URL not configured")
        url = self.status_url.replace("{ref}", str(provider_ref or ""))
        req = _urlreq.Request(url, headers={
            "X-Api-Key": self.credentials.get("api_key", ""),
            "X-Api-Secret": self.credentials.get("secret", ""),
        })
        try:
            with _urlreq.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode())
        except Exception as exc:  # noqa: BLE001
            raise PSPError(f"moltspay status failed: {exc}") from exc
        state = str(data.get("status") or data.get("trade_state") or "").lower()
        paid = state in ("paid", "success", "trade_success", "completed") \
            or bool(data.get("paid"))
        return {"paid": paid, "status": state, "fee_cents": int(data.get("fee_cents", 0) or 0)}

    def refund(self, payment_id: str, amount_cents: int, reason: str = "") -> Dict[str, Any]:
        raise PSPError("moltspay refunds are handled in the merchant console")


def configure_from_env() -> PSPAdapter:
    """Pick the PSP from ``PAYMENT_ADAPTER`` (default: explicit mock)."""
    which = os.getenv("PAYMENT_ADAPTER", "").strip().lower()
    if which == "paypal":
        a = PayPalAdapter()
        a.configure({"client_id": os.getenv("PAYPAL_CLIENT_ID", ""),
                     "client_secret": os.getenv("PAYPAL_CLIENT_SECRET", "")})
        return a if a.enabled else MockPSPAdapter()
    if which in ("moltspay", "wechat", "alipay"):
        a = MoltspayAdapter()
        a.configure({"api_key": os.getenv("MOLTSPAY_API_KEY", ""),
                     "secret": os.getenv("MOLTSPAY_SECRET", "")})
        # when the endpoint is missing the rail is simply not live -> audit says mock
        return a if a.enabled else MockPSPAdapter()
    return MockPSPAdapter()


class PaymentGateway:
    def __init__(self, adapter: Optional[PSPAdapter] = None):
        self.psp: PSPAdapter = adapter or MockPSPAdapter()
        self.records: Dict[str, PaymentRecord] = {}
        self._lock = threading.RLock()

    def register_psp(self, adapter: PSPAdapter):
        """Swap the PSP (e.g. a Stripe adapter once credentials exist)."""
        self.psp = adapter

    def _store(self, rec: PaymentRecord) -> PaymentRecord:
        with self._lock:
            self.records[rec.payment_id] = rec
        return rec

    def create_intent(self, order_id: str, method: str, amount_cents: int,
                      currency: Optional[str] = None,
                      description: str = "") -> PaymentRecord:
        """Create a payment (synchronous rails capture at once; async rails return
        a ``pending`` record with a pay_url/qr to be verified later)."""
        currency = (currency or getattr(self.psp, "currency", CURRENCY) or CURRENCY).upper()
        if amount_cents <= 0:
            return self._store(PaymentRecord(
                payment_id=f"pay_{uuid.uuid4().hex[:12]}", order_id=order_id,
                method=method, amount_cents=0, fee_cents=0, net_cents=0,
                currency=currency, status=PaymentStatus.FAILED, mock=True))
        try:
            out = self.psp.create_intent(order_id, method, amount_cents, currency, description)
        except NotImplementedError:
            out = self.psp.capture(order_id, method, amount_cents)
        except PSPError as exc:
            logger.warning("psp %s create_intent failed: %s", self.psp.name, exc)
            return self._store(PaymentRecord(
                payment_id=f"pay_{uuid.uuid4().hex[:12]}", order_id=order_id,
                method=method, amount_cents=amount_cents, fee_cents=0,
                net_cents=amount_cents, currency=currency,
                status=PaymentStatus.FAILED, psp=self.psp.name, mock=False))
        status = (PaymentStatus.CAPTURED if out.get("status") == "captured"
                  else PaymentStatus.PENDING)
        rec = PaymentRecord(
            payment_id=out.get("payment_id") or f"pay_{uuid.uuid4().hex[:12]}",
            order_id=order_id, method=method,
            amount_cents=out.get("amount_cents", amount_cents),
            fee_cents=out.get("fee_cents", 0),
            net_cents=out.get("net_cents", amount_cents),
            currency=out.get("currency", currency), status=status,
            psp=self.psp.name, mock=bool(out.get("mock", not getattr(self.psp, "enabled", False))),
            pay_url=out.get("pay_url"), qr_code=out.get("qr_code"),
            provider_ref=out.get("provider_ref"))
        self._store(rec)
        logger.info("payment %s %s for order %s (%d cents)",
                    rec.payment_id, rec.status.value, order_id, rec.amount_cents)
        return rec

    def capture(self, order_id: str, method: str, amount_cents: int,
                currency: Optional[str] = None) -> PaymentRecord:
        return self.create_intent(order_id, method, amount_cents, currency)

    def confirm(self, payment_id: str, provider_ref: Optional[str] = None) -> Optional[PaymentRecord]:
        """Ask the PSP whether a pending intent was actually paid, then settle."""
        with self._lock:
            rec = self.records.get(payment_id)
        if not rec:
            return None
        if rec.mock or rec.status == PaymentStatus.CAPTURED:
            if rec.mock and rec.status != PaymentStatus.CAPTURED:
                rec.status = PaymentStatus.CAPTURED
            return rec
        try:
            out = self.psp.verify(provider_ref or rec.provider_ref or "")
        except PSPError as exc:
            logger.warning("psp %s verify failed for %s: %s", self.psp.name, payment_id, exc)
            return rec
        if out.get("paid"):
            fee = int(out.get("fee_cents", 0) or 0)
            rec.status = PaymentStatus.CAPTURED
            rec.fee_cents = fee
            rec.net_cents = rec.amount_cents - fee
            logger.info("payment %s confirmed captured via %s", payment_id, self.psp.name)
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

    def rails(self) -> Dict[str, Any]:
        """Truthful payment-rail status for the storefront (never overclaims)."""
        live = not isinstance(self.psp, MockPSPAdapter) and getattr(self.psp, "enabled", False)
        return {
            "active_psp": self.psp.name,
            "live": bool(live),
            "mock": not bool(live),
            "currencies": list(getattr(self.psp, "currencies", ()) or []),
            "wechat": {"available": live and self.psp.name == "moltspay",
                       "settles_to_alipay": bool(os.getenv("SETTLEMENT_ALIPAY_ACCOUNT"))},
            "alipay": {"available": live and self.psp.name == "moltspay",
                       "settles_to_alipay": bool(os.getenv("SETTLEMENT_ALIPAY_ACCOUNT"))},
            "paypal": {"available": self.psp.name == "paypal" and bool(live)},
            "notes": ("mock rail: no real money moves. Set PAYMENT_ADAPTER + credentials "
                      "to go live." if not live else ""),
        }


payment_gateway = PaymentGateway()
# opt-in: a real PSP only when PAYMENT_ADAPTER + credentials are configured
try:
    payment_gateway.register_psp(configure_from_env())
except Exception as _exc:  # noqa: BLE001 - never break import on a bad PSP config
    logger.warning("psp autoconfigure skipped: %s", _exc)


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

    class IntentReq(BaseModel):
        order_id: str
        method: str = "paypal"
        amount_cents: int
        currency: Optional[str] = None
        description: str = ""

    @router.get("/methods")
    async def methods():
        return {"ok": True, **payment_gateway.rails()}

    @router.post("/capture")
    async def capture(req: CaptureReq):
        return asdict(payment_gateway.capture(req.order_id, req.method, req.amount_cents))

    @router.post("/intent")
    async def intent(req: IntentReq):
        return asdict(payment_gateway.create_intent(
            req.order_id, req.method, req.amount_cents, req.currency, req.description))

    @router.post("/{payment_id}/confirm")
    async def confirm(payment_id: str):
        r = payment_gateway.confirm(payment_id)
        if not r:
            raise HTTPException(404, "payment not found")
        return asdict(r)

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