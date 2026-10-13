"""Tests for the payment-rail adapters (PayPal / MoltsPay) and async confirm.

No network is used: a fake async adapter and a faulting adapter exercise the
intent → verify → confirm lifecycle, and the honest credential-gating rules
(no credentials ⇒ explicit mock; a failing provider call ⇒ explicit failure).
"""
import os
import sys
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

import children_payment as pay

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


class FakeAsync(pay.PSPAdapter):
    name = "fake_async"
    currencies = ("USD",)

    def __init__(self, paid=True):
        super().__init__()
        self.enabled = True
        self.paid = paid

    def create_intent(self, order_id, method, amount_cents, currency="USD", description=""):
        return {"provider_ref": "ref-1", "pay_url": "https://pay.example/ref-1",
                "status": "pending", "mock": False, "currency": currency,
                "amount_cents": amount_cents}

    def verify(self, provider_ref):
        return {"paid": self.paid, "fee_cents": 100}

    def refund(self, payment_id, amount_cents, reason=""):
        return {"ok": True, "mock": False}


class Faulty(pay.PSPAdapter):
    name = "faulty"

    def __init__(self):
        super().__init__()
        self.enabled = True

    def create_intent(self, *a, **k):
        raise pay.PSPError("provider down")

    def refund(self, *a, **k):
        raise pay.PSPError("nope")


# ── credential gating ───────────────────────────────────────────────────────
os.environ.pop("PAYMENT_ADAPTER", None)
check("gate.default_mock", isinstance(pay.configure_from_env(), pay.MockPSPAdapter))

os.environ["PAYMENT_ADAPTER"] = "paypal"
os.environ.pop("PAYPAL_CLIENT_ID", None)
os.environ.pop("PAYPAL_CLIENT_SECRET", None)
check("gate.paypal_without_creds_mock", isinstance(pay.configure_from_env(), pay.MockPSPAdapter))

os.environ["PAYPAL_CLIENT_ID"] = "cid"
os.environ["PAYPAL_CLIENT_SECRET"] = "sec"
_pa = pay.configure_from_env()
check("gate.paypal_with_creds", isinstance(_pa, pay.PayPalAdapter) and _pa.enabled)
check("gate.paypal_currencies", "USD" in _pa.currencies)

os.environ["PAYMENT_ADAPTER"] = "moltspay"
os.environ["MOLTSPAY_API_KEY"] = "k"
os.environ["MOLTSPAY_SECRET"] = "s"
os.environ.pop("MOLTSPAY_ORDER_URL", None)
check("gate.moltspay_needs_endpoint", isinstance(pay.configure_from_env(), pay.MockPSPAdapter))
os.environ["MOLTSPAY_ORDER_URL"] = "https://orders.example/create"
_ms = pay.configure_from_env()
check("gate.moltspay_configured", isinstance(_ms, pay.MoltspayAdapter) and _ms.enabled)
check("gate.moltspay_cny", "CNY" in _ms.currencies)

# restore a clean environment for the rest of the suite
for k in ("PAYMENT_ADAPTER", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET",
          "MOLTSPAY_API_KEY", "MOLTSPAY_SECRET", "MOLTSPAY_ORDER_URL"):
    os.environ.pop(k, None)


# ── async intent → verify → confirm ─────────────────────────────────────────
g = pay.PaymentGateway(FakeAsync(paid=True))
rec = g.create_intent("ord-1", "paypal", 2990, "USD", "Subscription")
check("intent.pending", rec.status == pay.PaymentStatus.PENDING)
check("intent.not_mock", rec.mock is False)
check("intent.pay_url", bool(rec.pay_url))
check("intent.provider_ref", rec.provider_ref == "ref-1")

done = g.confirm(rec.payment_id)
check("confirm.captured", done.status == pay.PaymentStatus.CAPTURED)
check("confirm.fee_net", done.fee_cents == 100 and done.net_cents == 2890)

g2 = pay.PaymentGateway(FakeAsync(paid=False))
r2 = g2.create_intent("ord-2", "paypal", 2990, "USD")
g2.confirm(r2.payment_id)
check("confirm.unpaid_stays_pending", r2.status == pay.PaymentStatus.PENDING)


# ── a failing provider must never look successful ───────────────────────────
g3 = pay.PaymentGateway(Faulty())
r3 = g3.create_intent("ord-3", "card", 2990, "USD")
check("faulty.failed_status", r3.status == pay.PaymentStatus.FAILED)
check("faulty.not_mock", r3.mock is False)


# ── rails() truthfulness ────────────────────────────────────────────────────
check("rails.mock", pay.payment_gateway.rails()["live"] is False)
check("rails.moltspay_wechat", pay.MoltspayAdapter().name == "moltspay")
check("rails.paypal_name", pay.PayPalAdapter().name == "paypal")

n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Payment adapters: {len(R)-n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)
