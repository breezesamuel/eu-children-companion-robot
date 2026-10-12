"""Tests for the credential-gated live commerce adapters (Stripe PSP + Shippo).

Everything runs offline: network calls go through an injected fake session, so we
prove the real request/response *contract* without touching the internet.
"""
import sys, os, time, json, hmac, hashlib, logging
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

import children_live_adapters as la

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


class FakeResp:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.text = json.dumps(payload)

    def json(self):
        return self._payload


class FakeSession:
    """Records calls and returns canned responses keyed by URL fragment."""
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def _match(self, url):
        for frag, payload in self.routes.items():
            if frag in url:
                return payload
        return {"detail": "no route"}, 404

    def post(self, url, data=None, json=None, headers=None, timeout=None):
        self.calls.append(("POST", url, data or json))
        payload, code = self._match(url)
        return FakeResp(payload, code)

    def get(self, url, headers=None, timeout=None):
        self.calls.append(("GET", url, None))
        payload, code = self._match(url)
        return FakeResp(payload, code)


# ═══════════════════════════════════════════════════════════════════════════
# 1. Stripe PSP adapter
# ═══════════════════════════════════════════════════════════════════════════
StripePSPAdapter = la.make_stripe_adapter_class()

# disabled without a key
ad_off = StripePSPAdapter(secret_key="")
check("stripe.disabled_without_key", ad_off.enabled is False)
try:
    ad_off.capture("o1", "card", 1000)
    check("stripe.capture_raises_when_off", False)
except RuntimeError:
    check("stripe.capture_raises_when_off", True)

# test-mode capture with a fake transport
fake = FakeSession({"payment_intents": ({"id": "pi_123", "status": "succeeded"}, 200)})
ad = StripePSPAdapter(secret_key="sk_test_abc", session=fake)
check("stripe.enabled_with_key", ad.enabled is True)
out = ad.capture("ord-1", "card", 2990)
check("stripe.capture_id", out["payment_id"] == "pi_123")
check("stripe.capture_not_mock", out["mock"] is False)
check("stripe.capture_amount", out["amount_cents"] == 2990)
check("stripe.capture_fee", out["fee_cents"] == int(round(2990 * 0.015)) + 25)
check("stripe.capture_net", out["net_cents"] == 2990 - out["fee_cents"])
check("stripe.capture_pm_token", fake.calls[-1][2]["payment_method"] == "pm_card_visa")
check("stripe.capture_currency", fake.calls[-1][2]["currency"] == "eur")

# refund
fake2 = FakeSession({"refunds": ({"id": "re_1", "amount": 500}, 200)})
ad2 = StripePSPAdapter(secret_key="sk_test_abc", session=fake2)
out = ad2.refund("pi_123", 500, "eu_14_day")
check("stripe.refund_amount", out["refunded_cents"] == 500)
check("stripe.refund_not_mock", out["mock"] is False)
check("stripe.refund_id", out["refund_id"] == "re_1")

# failure path: payment not succeeded -> raises
fake3 = FakeSession({"payment_intents": ({"id": "pi_x", "status": "requires_payment_method",
                                        "last_payment_error": {"code": "card_declined"}}, 200)})
ad3 = StripePSPAdapter(secret_key="sk_test_abc", session=fake3)
try:
    ad3.capture("o2", "card", 1000)
    check("stripe.capture_decline_raises", False)
except RuntimeError as e:
    check("stripe.capture_decline_raises", "not successful" in str(e))

# live key + no pm -> explicit error (never silently use test tokens on live)
ad_live = StripePSPAdapter(secret_key="sk_live_x", session=FakeSession({}))
try:
    ad_live.capture("o3", "card", 1000)
    check("stripe.live_needs_pm_token", False)
except RuntimeError as e:
    check("stripe.live_needs_pm_token", "payment_method token" in str(e))

# explicit pm token passes through
fake4 = FakeSession({"payment_intents": ({"id": "pi_live", "status": "succeeded"}, 200)})
ad_live2 = StripePSPAdapter(secret_key="sk_live_x", session=fake4)
ad_live2.capture("o4", "pm_card_mastercard", 1000)
check("stripe.explicit_pm_passthrough", fake4.calls[-1][2]["payment_method"] == "pm_card_mastercard")


# ═══════════════════════════════════════════════════════════════════════════
# 2. Stripe webhook signature
# ═══════════════════════════════════════════════════════════════════════════
secret = "whsec_test"
payload = json.dumps({"type": "payment_intent.succeeded",
                      "data": {"object": {"id": "pi_1"}}}).encode()
ts = str(int(time.time()))
sig = hmac.new(secret.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
ok, why = la.verify_stripe_signature(payload, f"t={ts},v1={sig}", secret)
check("stripe.sig_valid", ok is True)
ok2, why2 = la.verify_stripe_signature(payload, f"t={ts},v1=deadbeef", secret)
check("stripe.sig_invalid", ok2 is False)
old_ts = str(int(time.time()) - 10_000)
sig_old = hmac.new(secret.encode(), f"{old_ts}.".encode() + payload, hashlib.sha256).hexdigest()
ok3, why3 = la.verify_stripe_signature(payload, f"t={old_ts},v1={sig_old}", secret)
check("stripe.sig_expired", ok3 is False and "tolerance" in why3)
ok4, _ = la.verify_stripe_signature(payload, f"t={ts},v1={sig}", "")
check("stripe.sig_no_secret_rejected", ok4 is False)
ok5, _ = la.verify_stripe_signature(payload, "garbage", secret)
check("stripe.sig_malformed_rejected", ok5 is False)


# ═══════════════════════════════════════════════════════════════════════════
# 3. Shippo carrier adapter
# ═══════════════════════════════════════════════════════════════════════════
from children_logistics import Address, Parcel
ShippoCarrierAdapter = la.make_shippo_adapter_class()

sh_off = ShippoCarrierAdapter(api_key="")
check("shippo.disabled_without_key", sh_off.enabled is False)
sender = Address("DC", "Lagerstr 1", "Berlin", "10115", "DE", phone="+49")
rcpt = Address("Famille", "12 Rue de la Paix", "Paris", "75002", "FR")
parcel = Parcel(weight_kg=1.2)
check("shippo.quote_none_when_off", sh_off.quote(sender, rcpt, parcel) is None)

sh_fake = FakeSession({"shipments": ({"rates": [
    {"object_id": "rate_a", "provider": "DHL", "servicelevel_token": "shippo_standard",
     "amount": "4.90", "estimated_days": 3},
    {"object_id": "rate_b", "provider": "UPS", "servicelevel_token": "shippo_express",
     "amount": "12.90", "estimated_days": 1},
]}, 200)})
sh = ShippoCarrierAdapter(api_key="shippo_test_abc", session=sh_fake, default_carrier="dhl")
check("shippo.enabled_with_key", sh.enabled is True)
rate = sh.quote(sender, rcpt, parcel, "standard")
check("shippo.quote_rate", rate is not None and rate.price_cents == 490)
check("shippo.quote_carrier", rate.carrier == "dhl")
check("shippo.quote_currency", rate.currency == "EUR")
check("shippo.quote_co2", rate.co2e_grams == int(1.2 * 350))

# express picks the express rate
rate_x = sh.quote(sender, rcpt, parcel, "express")
check("shippo.quote_express_rate", rate_x.price_cents == 1290)

# create shipment
sh_fake2 = FakeSession({
    "shipments": ({"rates": [{"object_id": "rate_a", "provider": "DHL",
                             "servicelevel_token": "shippo_standard", "amount": "4.90"}]}, 200),
    "transactions": ({"object_id": "tx_1", "status": "SUCCESS",
                     "tracking_number": "DHL999888777", "label_url": "https://label/x.pdf"}, 200),
})
sh2 = ShippoCarrierAdapter(api_key="shippo_test_abc", session=sh_fake2)
ship = sh2.create_shipment("ord-9", sender, rcpt, parcel, "standard")
check("shippo.shipment_tracking", ship.tracking_number == "DHL999888777")
check("shippo.shipment_label", ship.label_url == "https://label/x.pdf")
check("shippo.shipment_carrier", ship.carrier == "dhl")
check("shippo.shipment_not_mock", ship.events[0]["mock"] is False)

# track
sh_fake3 = FakeSession({"tracks": ({"carrier": "dhl",
                                   "tracking_status": {"status": "DELIVERED"},
                                   "tracking_history": [{"status": "DELIVERED"}]}, 200)})
sh3 = ShippoCarrierAdapter(api_key="shippo_test_abc", session=sh_fake3, default_carrier="dhl")
trk = sh3.track("DHL999888777")
check("shippo.track_status", trk["status"] == "DELIVERED")
check("shippo.track_not_mock", trk["mock"] is False)


# ═══════════════════════════════════════════════════════════════════════════
# 4. Shippo webhook signature
# ═══════════════════════════════════════════════════════════════════════════
body = b'{"tracking_number":"T1","status":"in_transit"}'
ssec = "shippo_whsec"
ssig = hmac.new(ssec.encode(), body, hashlib.sha256).hexdigest()
ok, _ = la.verify_shippo_signature(body, ssig, ssec)
check("shippo.sig_valid", ok is True)
ok, _ = la.verify_shippo_signature(body, "sha256=" + ssig, ssec)
check("shippo.sig_prefixed_valid", ok is True)
ok, _ = la.verify_shippo_signature(body, "bad", ssec)
check("shippo.sig_invalid", ok is False)
ok, _ = la.verify_shippo_signature(body, ssig, "")
check("shippo.sig_no_secret_rejected", ok is False)


# ═══════════════════════════════════════════════════════════════════════════
# 5. configure_live_adapters: env-gated, mock fallback, no boot failure
# ═══════════════════════════════════════════════════════════════════════════
from children_payment import PaymentGateway, MockPSPAdapter
from children_logistics import LogisticsManager, MockCarrierAdapter

# (a) everything off -> stays mock
pg = PaymentGateway()
lg = LogisticsManager()
st = la.configure_live_adapters(pg, lg, env={})
check("cfg.payment_mock", st["payment"]["provider"] == "mock" and isinstance(pg.psp, MockPSPAdapter))
check("cfg.logistics_mock", st["logistics"]["provider"] == "mock")
check("cfg.no_live_carriers", all(isinstance(a, MockCarrierAdapter) for a in lg.adapters.values()))

# (b) payment live on with key -> stripe registered (no network at construction)
pg2 = PaymentGateway()
st2 = la.configure_live_adapters(pg2, None, env={"PAYMENT_LIVE_MODE": "1",
                                                 "STRIPE_SECRET_KEY": "sk_test_x"})
check("cfg.payment_live", st2["payment"]["provider"] == "stripe" and pg2.psp.name == "stripe")
check("cfg.payment_key_mode", st2["payment"]["key_mode"] == "test")

# (c) live flag on but NO key -> mock (graceful)
pg3 = PaymentGateway()
st3 = la.configure_live_adapters(pg3, None, env={"PAYMENT_LIVE_MODE": "1"})
check("cfg.payment_live_no_key_mock", st3["payment"]["provider"] == "mock"
      and isinstance(pg3.psp, MockPSPAdapter))

# (d) logistics live on with key -> shippo registered alongside mocks
lg4 = LogisticsManager()
st4 = la.configure_live_adapters(None, lg4, env={"LOGISTICS_LIVE_MODE": "1",
                                                 "SHIPPO_API_KEY": "shippo_test_x"})
check("cfg.logistics_live", st4["logistics"]["provider"] == "shippo")
check("cfg.shippo_registered", "shippo" in lg4.carriers())
check("cfg.mocks_kept", any(isinstance(a, MockCarrierAdapter) for a in lg4.adapters.values()))

# (e) never raises on bad env
try:
    la.configure_live_adapters(PaymentGateway(), LogisticsManager(),
                               env={"PAYMENT_LIVE_MODE": "1", "STRIPE_SECRET_KEY": "\x00bad"})
    check("cfg.never_raises", True)
except Exception as e:
    check("cfg.never_raises", False, repr(e))


# ═══════════════════════════════════════════════════════════════════════════
# 6. Router mounts + status shape
# ═══════════════════════════════════════════════════════════════════════════
import children_robot_system as m
paths = [getattr(r, "path", "") for r in m.app.routes]
check("router.stripe_webhook", "/api/live/stripe/webhook" in paths)
check("router.shippo_webhook", "/api/live/shippo/webhook" in paths)
check("router.live_status", "/api/live/status" in paths)

from fastapi import FastAPI
from fastapi.testclient import TestClient
app = FastAPI(); app.include_router(la.create_live_adapters_router())
cli = TestClient(app)
r = cli.get("/api/live/status")
check("http.status_200", r.status_code == 200)
# ensure no actual secret values leaked (keys like STRIPE_SECRET_KEY_present are fine)
rtext = r.text.lower()
check("http.status_no_secret_leak", "sk_live_" not in rtext and "shippo_live_" not in rtext
      and "sk_test_" not in rtext and "whsec_" not in rtext)


n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Live adapters: {len(R)-n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)
