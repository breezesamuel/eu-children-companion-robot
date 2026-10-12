#!/usr/bin/env python3
"""
Live commerce adapters -- 真实支付 / 真实物流（凭据门控，mock 兜底）

This module is the *bridge* between the offline-testable commerce core and the
real money / real parcel networks.  Nothing here runs unless the operator
explicitly turns live mode on AND provides credentials:

    PAYMENT_LIVE_MODE=1     STRIPE_SECRET_KEY=sk_live_...   -> Stripe PSP adapter
    LOGISTICS_LIVE_MODE=1   SHIPPO_API_KEY=shippo_live_...  -> Shippo carrier

Design rules (kept deliberately boring so it can run 24/7 unattended):
  * an adapter is ``enabled`` only when its credential is present; otherwise the
    module keeps the existing Mock* adapter, so the platform NEVER stops working
  * every network call goes through an injectable ``session`` object -> the whole
    thing is unit-testable offline with a fake transport (no sockets in CI)
  * Stripe webhook signatures use the documented scheme
    (``Stripe-Signature: t=..,v1=..`` = HMAC-SHA256 over ``{t}.{payload}``)
  * Shippo webhook signing header is configurable (``SHIPPO_SIGNATURE_HEADER``)
    because it must be confirmed against the live Shippo docs at deploy time --
    we never hard-code a signature scheme we cannot verify
  * secrets are never returned by the status endpoint (only booleans)

Evidence gate: every claim about these adapters is backed by an offline test in
``tests/test_live_adapters.py`` with a fake HTTP transport, plus the real
credential presence check at boot.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("live_adapters")

try:  # requests is a normal dependency here; keep an import guard anyway
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None  # type: ignore

DEFAULT_STRIPE_FEE_PCT = 1.5          # EEA consumer cards (Stripe EU standard)
DEFAULT_STRIPE_FEE_FIXED_CENTS = 25   # €0.25
DEFAULT_WEBHOOK_TOLERANCE = 300       # seconds


# ═══════════════════════════════════════════════════════════════════════════
# Stripe PSP adapter
# ═══════════════════════════════════════════════════════════════════════════
def _stripe_cls():
    from children_payment import PSPAdapter
    return PSPAdapter


def make_stripe_adapter_class():
    PSPAdapter = _stripe_cls()

    class StripePSPAdapter(PSPAdapter):  # type: ignore[misc, valid-type]
        """Credential-gated Stripe PaymentIntents adapter (no SDK needed)."""

        name = "stripe"
        API_BASE = "https://api.stripe.com/v1"

        def __init__(self, secret_key: Optional[str] = None,
                     webhook_secret: Optional[str] = None,
                     session: Any = None, api_base: Optional[str] = None,
                     fee_pct: Optional[float] = None,
                     fee_fixed_cents: Optional[int] = None):
            super().__init__()
            self.api_base = (api_base or os.environ.get("STRIPE_API_BASE")
                             or self.API_BASE).rstrip("/")
            self.secret_key = secret_key if secret_key is not None else \
                os.environ.get("STRIPE_SECRET_KEY", "")
            self.webhook_secret = webhook_secret if webhook_secret is not None else \
                os.environ.get("STRIPE_WEBHOOK_SECRET", "")
            self.default_payment_method = os.environ.get("STRIPE_DEFAULT_PAYMENT_METHOD", "")
            self.session = session if session is not None else requests
            self.fee_pct = float(fee_pct if fee_pct is not None
                                 else os.environ.get("STRIPE_FEE_PCT", DEFAULT_STRIPE_FEE_PCT))
            self.fee_fixed_cents = int(fee_fixed_cents if fee_fixed_cents is not None
                                       else os.environ.get("STRIPE_FEE_FIXED_CENTS",
                                                           DEFAULT_STRIPE_FEE_FIXED_CENTS))
            self.configure({"secret_key": self.secret_key} if self.secret_key else {})
            self.last_error: Optional[str] = None

        # -- helpers ---------------------------------------------------------
        def _headers(self) -> Dict[str, str]:
            return {"Authorization": f"Bearer {self.secret_key}",
                    "Content-Type": "application/x-www-form-urlencoded"}

        def _fee(self, amount_cents: int) -> int:
            return int(round(amount_cents * self.fee_pct / 100.0)) + self.fee_fixed_cents

        def _resolve_payment_method(self, method: str) -> str:
            if method and method.startswith("pm_"):
                return method
            if self.default_payment_method:
                return self.default_payment_method
            # test-mode convenience tokens (never valid against live keys)
            if self.secret_key.startswith("sk_test_"):
                return {"card": "pm_card_visa",
                        "sepa_debit": "pm_card_sepa_debit"}.get(method, "pm_card_visa")
            raise RuntimeError(
                "live Stripe capture requires a payment_method token (pm_...) passed "
                "in `method` or STRIPE_DEFAULT_PAYMENT_METHOD set")

        # -- PSP interface ---------------------------------------------------
        def capture(self, order_id: str, method: str, amount_cents: int) -> Dict[str, Any]:
            if not self.enabled:
                raise RuntimeError("Stripe adapter not configured (missing STRIPE_SECRET_KEY)")
            pm = self._resolve_payment_method(method)
            data = {
                "amount": int(amount_cents),
                "currency": "eur",
                "confirm": "true",
                "payment_method": pm,
                "metadata[order_id]": order_id,
                "metadata[source]": "children-robot",
            }
            r = self.session.post(f"{self.api_base}/payment_intents", data=data,
                                  headers=self._headers(), timeout=30)
            if getattr(r, "status_code", 200) >= 400:
                self.last_error = getattr(r, "text", "")
                raise RuntimeError(f"Stripe capture failed: {self.last_error}")
            pi = r.json()
            status = pi.get("status")
            if status not in ("succeeded", "processing", "requires_capture"):
                self.last_error = str(pi.get("last_payment_error") or status)
                raise RuntimeError(f"Stripe payment not successful: {status} ({self.last_error})")
            fee = self._fee(int(amount_cents))
            return {
                "payment_id": pi.get("id", f"pi_{uuid.uuid4().hex[:12]}"),
                "amount_cents": int(amount_cents),
                "fee_cents": fee,
                "net_cents": int(amount_cents) - fee,
                "authorized": True,
                "mock": False,
                "raw_status": status,
            }

        def refund(self, payment_id: str, amount_cents: int, reason: str = "") -> Dict[str, Any]:
            if not self.enabled:
                raise RuntimeError("Stripe adapter not configured (missing STRIPE_SECRET_KEY)")
            data = {"payment_intent": payment_id, "amount": int(amount_cents)}
            if reason:
                data["metadata[reason]"] = reason[:200]
            r = self.session.post(f"{self.api_base}/refunds", data=data,
                                  headers=self._headers(), timeout=30)
            if getattr(r, "status_code", 200) >= 400:
                self.last_error = getattr(r, "text", "")
                raise RuntimeError(f"Stripe refund failed: {self.last_error}")
            ref = r.json()
            return {
                "payment_id": payment_id,
                "refund_id": ref.get("id"),
                "refunded_cents": int(ref.get("amount", amount_cents)),
                "refund_reason": reason,
                "ok": True,
                "mock": False,
            }

    return StripePSPAdapter


# ═══════════════════════════════════════════════════════════════════════════
# Shippo carrier adapter
# ═══════════════════════════════════════════════════════════════════════════
def _logistics_bits():
    from children_logistics import CarrierAdapter, Shipment, ShippingRate
    return CarrierAdapter, Shipment, ShippingRate


def make_shippo_adapter_class():
    CarrierAdapter, Shipment, ShippingRate = _logistics_bits()

    class ShippoCarrierAdapter(CarrierAdapter):  # type: ignore[misc, valid-type]
        """Credential-gated Shippo aggregator adapter (multi-carrier rates)."""

        name = "shippo"
        API_BASE = "https://api.goshippo.com"

        def __init__(self, api_key: Optional[str] = None, session: Any = None,
                     api_base: Optional[str] = None,
                     default_carrier: Optional[str] = None):
            super().__init__()
            self.api_base = (api_base or os.environ.get("SHIPPO_API_BASE")
                             or self.API_BASE).rstrip("/")
            self.api_key = api_key if api_key is not None else \
                os.environ.get("SHIPPO_API_KEY", "")
            self.webhook_secret = os.environ.get("SHIPPO_WEBHOOK_SECRET", "")
            self.default_carrier = (default_carrier
                                    or os.environ.get("SHIPPO_DEFAULT_CARRIER", "dhl")).lower()
            self.session = session if session is not None else requests
            self.configure({"api_key": self.api_key} if self.api_key else {})
            self.last_error: Optional[str] = None

        def _headers(self) -> Dict[str, str]:
            return {"Authorization": f"ShippoToken {self.api_key}",
                    "Content-Type": "application/json"}

        def _addr(self, a) -> Dict[str, str]:
            out = {"name": a.name, "street1": a.street, "city": a.city,
                   "zip": a.postal_code, "country": a.country}
            if getattr(a, "email", ""):
                out["email"] = a.email
            if getattr(a, "phone", ""):
                out["phone"] = a.phone
            return out

        def _parcel(self, p) -> Dict[str, Any]:
            return {"length": str(p.length_cm), "width": str(p.width_cm),
                    "height": str(p.height_cm), "distance_unit": "cm",
                    "weight": str(p.weight_kg), "mass_unit": "kg"}

        def _service_token(self, service: str) -> str:
            # Shippo service levels; map our generic tiers to platform tokens
            return {"standard": "shippo_standard",
                    "express": "shippo_express",
                    "same_day": "shippo_priority",
                    "pickup_point": "shippo_standard"}.get(service, "shippo_standard")

        # -- Carrier interface ----------------------------------------------
        def quote(self, sender, recipient, parcel, service: str = "standard"):
            if not self.enabled:
                return None
            body = {"address_from": self._addr(sender), "address_to": self._addr(recipient),
                    "parcels": [self._parcel(parcel)], "async": False}
            r = self.session.post(f"{self.api_base}/shipments/", json=body,
                                  headers=self._headers(), timeout=30)
            if getattr(r, "status_code", 200) >= 400:
                self.last_error = getattr(r, "text", "")
                logger.warning("Shippo quote failed: %s", self.last_error)
                return None
            rates = (r.json() or {}).get("rates", []) or []
            if not rates:
                return None
            # prefer the requested service level, else cheapest
            want = self._service_token(service)
            match = [x for x in rates if want in str(x.get("servicelevel_token", ""))
                     or want in str(x.get("servicelevel", ""))]
            pool = match or rates

            def _amt(x):
                try:
                    return float(x.get("amount", "999999"))
                except (TypeError, ValueError):
                    return 999999.0

            best = min(pool, key=_amt)
            try:
                price_cents = int(round(float(best.get("amount", 0)) * 100))
            except (TypeError, ValueError):
                price_cents = 0
            days = best.get("estimated_days") or (2, 4)
            if isinstance(days, int):
                eta = (days, days + 1)
            else:
                eta = (2, 4)
            carrier = best.get("provider") or self.default_carrier
            return ShippingRate(str(carrier).lower(), service, price_cents, "EUR",
                                eta[0], eta[1], co2e_grams=int(parcel.weight_kg * 350))

        def create_shipment(self, order_id, sender, recipient, parcel,
                            service: str = "standard"):
            if not self.enabled:
                raise RuntimeError("Shippo adapter not configured (missing SHIPPO_API_KEY)")
            body = {"address_from": self._addr(sender), "address_to": self._addr(recipient),
                    "parcels": [self._parcel(parcel)], "async": False}
            r = self.session.post(f"{self.api_base}/shipments/", json=body,
                                  headers=self._headers(), timeout=30)
            if getattr(r, "status_code", 200) >= 400:
                self.last_error = getattr(r, "text", "")
                raise RuntimeError(f"Shippo shipment failed: {self.last_error}")
            shipment = r.json() or {}
            rates = shipment.get("rates", []) or []
            if not rates:
                raise RuntimeError("Shippo returned no rates for the shipment")
            want = self._service_token(service)
            match = [x for x in rates if want in str(x.get("servicelevel_token", ""))]
            chosen = (match or rates)[0]
            tx = self.session.post(f"{self.api_base}/transactions/",
                                   json={"rate": chosen.get("object_id"),
                                         "label_file_type": "PDF",
                                         "async": False},
                                   headers=self._headers(), timeout=60)
            if getattr(tx, "status_code", 200) >= 400:
                self.last_error = getattr(tx, "text", "")
                raise RuntimeError(f"Shippo transaction failed: {self.last_error}")
            t = tx.json() or {}
            if str(t.get("status", "")).upper() not in ("SUCCESS", "QUEUED"):
                raise RuntimeError(f"Shippo label not created: {t.get('status')}")
            tracking = t.get("tracking_number") or chosen.get("tracking_number") or ""
            carrier = (chosen.get("provider") or self.default_carrier)
            return Shipment(
                shipment_id=t.get("object_id") or f"shp_{uuid.uuid4().hex[:12]}",
                order_id=order_id, carrier=str(carrier).lower(), service=service,
                tracking_number=tracking, label_url=t.get("label_url"),
                events=[{"status": "created", "at": datetime.now().isoformat(),
                         "mock": False}])

        def track(self, tracking_number: str) -> Dict[str, Any]:
            if not self.enabled:
                return {"tracking_number": tracking_number, "carrier": self.name,
                        "status": "unknown", "events": [], "mock": True}
            r = self.session.get(
                f"{self.api_base}/tracks/{self.default_carrier}/{tracking_number}",
                headers=self._headers(), timeout=30)
            if getattr(r, "status_code", 200) >= 400:
                self.last_error = getattr(r, "text", "")
                return {"tracking_number": tracking_number, "carrier": self.default_carrier,
                        "status": "unknown", "events": [], "mock": False,
                        "error": self.last_error}
            data = r.json() or {}
            return {"tracking_number": tracking_number,
                    "carrier": data.get("carrier", self.default_carrier),
                    "status": data.get("tracking_status", {}).get("status", "unknown")
                              if isinstance(data.get("tracking_status"), dict)
                              else data.get("tracking_status", "unknown"),
                    "events": data.get("tracking_history", []) or [],
                    "mock": False}

    return ShippoCarrierAdapter


# ═══════════════════════════════════════════════════════════════════════════
# Webhook signature verification
# ═══════════════════════════════════════════════════════════════════════════
def verify_stripe_signature(payload: bytes, sig_header: str, secret: str,
                            tolerance: int = DEFAULT_WEBHOOK_TOLERANCE
                            ) -> Tuple[bool, str]:
    """Verify the documented Stripe ``Stripe-Signature`` scheme.

    Header format: ``t=<unix>,v1=<hmac_sha256_hex>,...``
    Signed content: ``<t>.<raw payload>``  (HMAC-SHA256, hex).
    """
    if not secret:
        return False, "no webhook secret configured"
    if not sig_header:
        return False, "missing signature header"
    items = dict(part.split("=", 1) for part in sig_header.split(",") if "=" in part)
    ts = items.get("t")
    v1 = items.get("v1")
    if not ts or not v1:
        return False, "malformed signature header"
    try:
        if abs(time.time() - int(ts)) > tolerance:
            return False, "timestamp outside tolerance"
    except ValueError:
        return False, "bad timestamp"
    signed = f"{ts}.".encode("utf-8") + payload
    expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, v1):
        return False, "signature mismatch"
    return True, "ok"


def verify_shippo_signature(payload: bytes, sig_header: str, secret: str) -> Tuple[bool, str]:
    """Generic HMAC-SHA256 webhook verification for Shippo.

    NOTE: the exact header name is read from ``SHIPPO_SIGNATURE_HEADER`` and must
    be confirmed against the current Shippo docs before enabling live mode; we
    implement the common ``HMAC-SHA256(raw body, secret)`` scheme and never claim
    a header we cannot verify.
    """
    if not secret:
        return False, "no webhook secret configured"
    if not sig_header:
        return False, "missing signature header"
    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    got = sig_header.strip()
    if got.startswith("sha256="):
        got = got.split("=", 1)[1]
    if not hmac.compare_digest(expected, got):
        return False, "signature mismatch"
    return True, "ok"


# ═══════════════════════════════════════════════════════════════════════════
# Boot-time wiring (env-gated, idempotent, mock fallback)
# ═══════════════════════════════════════════════════════════════════════════
def _truthy(v: str) -> bool:
    return str(v or "").strip().lower() in ("1", "true", "yes", "on")


def configure_live_adapters(payment_gateway=None, logistics=None,
                            env: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Swap in live adapters when the operator opted in and credentials exist.

    Returns a *status* dict (booleans only, never secret values).  Safe to call
    many times; falls back to the existing mock adapters on any problem.
    """
    env = env if env is not None else os.environ

    def g(k, default=""):
        return env.get(k, default)

    status: Dict[str, Any] = {"payment": {}, "logistics": {}}

    # ── payments ─────────────────────────────────────────────────────────
    if payment_gateway is not None:
        live = _truthy(g("PAYMENT_LIVE_MODE")) and bool(g("STRIPE_SECRET_KEY"))
        if live:
            try:
                adapter = make_stripe_adapter_class()(secret_key=g("STRIPE_SECRET_KEY"),
                                                      webhook_secret=g("STRIPE_WEBHOOK_SECRET"))
                if adapter.enabled:
                    payment_gateway.register_psp(adapter)
                    status["payment"] = {"provider": "stripe", "live": True,
                                         "key_mode": ("test" if g("STRIPE_SECRET_KEY").startswith("sk_test_")
                                                      else "live")}
                else:
                    status["payment"] = {"provider": "mock", "live": False,
                                         "reason": "stripe key present but adapter disabled"}
            except Exception as exc:  # never let live wiring break boot
                logger.error("Stripe live wiring failed, keeping mock: %s", exc)
                status["payment"] = {"provider": "mock", "live": False, "reason": str(exc)}
        else:
            status["payment"] = {"provider": "mock", "live": False,
                                 "reason": "PAYMENT_LIVE_MODE off or STRIPE_SECRET_KEY missing"}

    # ── logistics ────────────────────────────────────────────────────────
    if logistics is not None:
        live = _truthy(g("LOGISTICS_LIVE_MODE")) and bool(g("SHIPPO_API_KEY"))
        if live:
            try:
                adapter = make_shippo_adapter_class()(
                    api_key=g("SHIPPO_API_KEY"),
                    api_base=g("SHIPPO_API_BASE", ""),
                    default_carrier=g("SHIPPO_DEFAULT_CARRIER", "dhl"))
                if adapter.enabled:
                    logistics.register(adapter)
                    status["logistics"] = {"provider": "shippo", "live": True,
                                           "carriers": logistics.carriers()}
                else:
                    status["logistics"] = {"provider": "mock", "live": False}
            except Exception as exc:
                logger.error("Shippo live wiring failed, keeping mock: %s", exc)
                status["logistics"] = {"provider": "mock", "live": False, "reason": str(exc)}
        else:
            status["logistics"] = {"provider": "mock", "live": False,
                                   "reason": "LOGISTICS_LIVE_MODE off or SHIPPO_API_KEY missing"}

    logger.info("live adapters: %s", json.dumps(status, ensure_ascii=False))
    return status


# ═══════════════════════════════════════════════════════════════════════════
# Router (signature-verified webhooks + status)
# ═══════════════════════════════════════════════════════════════════════════
def create_live_adapters_router():
    from fastapi import APIRouter, Request, HTTPException

    router = APIRouter(prefix="/api/live", tags=["Live adapters / 真实适配器"])

    @router.get("/status")
    async def status():
        from children_payment import payment_gateway as _pg
        from children_logistics import logistics as _lg, MockCarrierAdapter
        psp = _pg.psp
        live_carriers = [n for n, a in _lg.adapters.items()
                         if not isinstance(a, MockCarrierAdapter)]
        return {
            "ok": True,
            "payment": {"psp": psp.name, "mock": psp.name == "mock",
                        "enabled": bool(getattr(psp, "enabled", False))},
            "logistics": {"carriers": _lg.carriers(),
                          "live_carriers": live_carriers},
            "env_gates": {
                "PAYMENT_LIVE_MODE": _truthy(os.environ.get("PAYMENT_LIVE_MODE", "")),
                "LOGISTICS_LIVE_MODE": _truthy(os.environ.get("LOGISTICS_LIVE_MODE", "")),
                "STRIPE_SECRET_KEY_present": bool(os.environ.get("STRIPE_SECRET_KEY")),
                "SHIPPO_API_KEY_present": bool(os.environ.get("SHIPPO_API_KEY")),
            },
        }

    @router.post("/stripe/webhook")
    async def stripe_webhook(request: Request):
        raw = await request.body()
        sig = request.headers.get("stripe-signature", "")
        secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        ok, why = verify_stripe_signature(raw, sig, secret)
        if not ok:
            raise HTTPException(400, f"signature rejected: {why}")
        try:
            event = json.loads(raw.decode("utf-8"))
        except Exception:
            raise HTTPException(400, "invalid json")
        etype = event.get("type", "")
        obj = (event.get("data") or {}).get("object") or {}
        handled = {
            "payment_intent.succeeded": lambda: {"payment_id": obj.get("id"),
                                                 "status": "captured"},
            "payment_intent.payment_failed": lambda: {"payment_id": obj.get("id"),
                                                      "status": "failed"},
            "charge.refunded": lambda: {"refund_id": obj.get("id"),
                                        "amount": obj.get("amount_refunded")},
        }.get(etype, lambda: None)()
        return {"ok": True, "type": etype, "handled": handled is not None,
                "detail": handled or {}}

    @router.post("/shippo/webhook")
    async def shippo_webhook(request: Request):
        raw = await request.body()
        header_name = os.environ.get("SHIPPO_SIGNATURE_HEADER", "x-shippo-signature")
        sig = request.headers.get(header_name, "") or request.headers.get("x-shippo-signature", "")
        secret = os.environ.get("SHIPPO_WEBHOOK_SECRET", "")
        ok, why = verify_shippo_signature(raw, sig, secret)
        if not ok:
            raise HTTPException(400, f"signature rejected: {why}")
        try:
            event = json.loads(raw.decode("utf-8"))
        except Exception:
            raise HTTPException(400, "invalid json")
        tracking = event.get("tracking_number") or event.get("tracking")
        status = event.get("tracking_status") or event.get("status") or "in_transit"
        from children_logistics import logistics as _lg
        applied = _lg.apply_webhook({"tracking_number": tracking, "status": status,
                                     "raw": event}) if tracking else False
        return {"ok": True, "type": event.get("event", "track_updated"),
                "applied": applied}

    return router
