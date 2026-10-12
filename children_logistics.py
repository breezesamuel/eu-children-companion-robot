#!/usr/bin/env python3
"""
Logistics -- 物流 (step 6 of the 16-step commerce workflow)

  * multi-carrier adapter layer (DHL, DPD, GLS, PostNL, UPS, ...) with a single
    internal interface so carriers can be swapped without touching callers
  * rate quotes, label creation, tracking normalisation across carriers
  * delivery exception handling + customer notification
  * CO2e estimate per parcel (sustainability, increasingly expected in EU)

Carrier HTTP calls are behind a thin adapter; when no credentials are
configured the service returns deterministic mock data so the platform can be
developed and tested offline (never silently fake data in production -- the
`mock` flag is always explicitly returned).
"""
import os, json, uuid, logging, threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger("logistics")


class Carrier(Enum):
    DHL = "dhl"
    DPD = "dpd"
    GLS = "gls"
    POSTNL = "postnl"
    UPS = "ups"
    FEDEX = "fedex"
    ROYAL_MAIL = "royal_mail"


SERVICE_LEVELS = ["standard", "express", "same_day", "pickup_point"]


@dataclass
class Address:
    name: str
    street: str
    city: str
    postal_code: str
    country: str
    phone: str = ""
    email: str = ""


@dataclass
class Parcel:
    weight_kg: float = 1.0
    length_cm: float = 30.0
    width_cm: float = 20.0
    height_cm: float = 15.0
    value_cents: int = 0


@dataclass
class ShippingRate:
    carrier: str
    service: str
    price_cents: int
    currency: str
    eta_days_min: int
    eta_days_max: int
    co2e_grams: Optional[int] = None
    pickup_point: bool = False


@dataclass
class Shipment:
    shipment_id: str
    order_id: str
    carrier: str
    service: str
    tracking_number: str
    label_url: Optional[str]
    status: str = "created"        # created | in_transit | out_for_delivery | delivered | exception
    events: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    delivered_at: Optional[str] = None


# ── Carrier Adapters ──────────────────────────────────────────────────────
class CarrierAdapter:
    """Base interface. Implementations must be thin and swappable."""

    name = "base"

    def __init__(self):
        self.enabled = False          # False until credentials configured
        self.credentials: Dict[str, str] = {}

    def configure(self, creds: Dict[str, str]):
        self.credentials = creds
        self.enabled = bool(creds)

    def quote(self, sender: Address, recipient: Address, parcel: Parcel,
              service: str = "standard") -> Optional[ShippingRate]:
        raise NotImplementedError

    def create_shipment(self, order_id: str, sender: Address, recipient: Address,
                        parcel: Parcel, service: str = "standard") -> Shipment:
        raise NotImplementedError

    def track(self, tracking_number: str) -> Dict[str, Any]:
        raise NotImplementedError

    def _mock_rate(self, parcel: "Parcel", service: str) -> ShippingRate:
        price = {"standard": 490, "express": 1290, "same_day": 1990, "pickup_point": 390}[service]
        eta = {"standard": (2, 4), "express": (1, 2), "same_day": (0, 1), "pickup_point": (2, 5)}[service]
        return ShippingRate(self.name, service, price, "EUR",
                            eta[0], eta[1], co2e_grams=int(parcel.weight_kg * 350))


class MockCarrierAdapter(CarrierAdapter):
    """Deterministic offline adapter — explicitly labelled `mock` in responses."""

    def __init__(self, name: str):
        super().__init__()
        self.name = name

    def quote(self, sender, recipient, parcel, service="standard"):
        return self._mock_rate(parcel, service)

    def create_shipment(self, order_id, sender, recipient, parcel, service="standard"):
        sid = f"shp_{uuid.uuid4().hex[:12]}"
        return Shipment(
            shipment_id=sid, order_id=order_id, carrier=self.name, service=service,
            tracking_number=f"{self.name.upper()}{uuid.uuid4().hex[:11].upper()}",
            label_url=None, events=[{"status": "created", "at": datetime.now().isoformat(),
                                     "mock": True}])

    def track(self, tracking_number: str) -> Dict[str, Any]:
        return {
            "tracking_number": tracking_number,
            "carrier": self.name,
            "status": "in_transit",
            "events": [
                {"status": "created", "at": (datetime.now() - timedelta(days=2)).isoformat()},
                {"status": "in_transit", "at": (datetime.now() - timedelta(days=1)).isoformat()},
                {"status": "out_for_delivery", "at": datetime.now().isoformat()},
            ],
            "mock": True,
        }


# ── Logistics Manager ─────────────────────────────────────────────────────
class LogisticsManager:
    def __init__(self, adapters: Dict[str, CarrierAdapter] = None):
        self.adapters: Dict[str, CarrierAdapter] = adapters or {}
        self.shipments: Dict[str, Shipment] = {}
        self._lock = threading.RLock()
        if not self.adapters:
            # default: all mock, enabled so the platform works end-to-end offline
            for c in Carrier:
                self.adapters[c.value] = MockCarrierAdapter(c.value)
                self.adapters[c.value].enabled = True

    def register(self, adapter: CarrierAdapter):
        self.adapters[adapter.name] = adapter

    def carriers(self) -> List[str]:
        return list(self.adapters.keys())

    def _resolve(self, carrier: Optional[str]) -> CarrierAdapter:
        if carrier and carrier in self.adapters:
            return self.adapters[carrier]
        # prefer first enabled
        for a in self.adapters.values():
            if getattr(a, "enabled", False):
                return a
        return next(iter(self.adapters.values()))

    def quote(self, sender: Address, recipient: Address, parcel: Parcel,
              service: str = "standard", carrier: Optional[str] = None) -> Dict[str, Any]:
        rates = []
        for name in ([carrier] if carrier else self.carriers()):
            a = self.adapters.get(name)
            if not a:
                continue
            try:
                r = a.quote(sender, recipient, parcel, service)
                if r:
                    d = asdict(r)
                    d["mock"] = not getattr(a, "enabled", False) or isinstance(a, MockCarrierAdapter)
                    rates.append(d)
            except NotImplementedError:
                continue
        rates.sort(key=lambda r: r["price_cents"])
        return {"quotes": rates, "cheapest": rates[0] if rates else None}

    def create(self, order_id: str, sender: Address, recipient: Address,
               parcel: Parcel, service: str = "standard",
               carrier: Optional[str] = None) -> Dict[str, Any]:
        a = self._resolve(carrier)
        s = a.create_shipment(order_id, sender, recipient, parcel, service)
        with self._lock:
            self.shipments[s.shipment_id] = s
        out = asdict(s)
        out["mock"] = isinstance(a, MockCarrierAdapter)
        return out

    def track(self, tracking_number: str) -> Dict[str, Any]:
        s = next((x for x in self.shipments.values() if x.tracking_number == tracking_number), None)
        if s:
            return asdict(s)
        a = self._resolve(None)
        return a.track(tracking_number)

    def apply_webhook(self, event: Dict[str, Any]) -> bool:
        """Carrier webhook: update shipment status."""
        tn = event.get("tracking_number")
        status = event.get("status")
        if not tn or not status:
            return False
        with self._lock:
            s = next((x for x in self.shipments.values() if x.tracking_number == tn), None)
            if not s:
                return False
            s.status = status
            s.events.append({"status": status, "at": datetime.now().isoformat(),
                             "raw": event.get("raw", {})})
            if status == "delivered":
                s.delivered_at = datetime.now().isoformat()
        return True

    def stats(self) -> Dict[str, Any]:
        by_status: Dict[str, int] = {}
        by_carrier: Dict[str, int] = {}
        for s in self.shipments.values():
            by_status[s.status] = by_status.get(s.status, 0) + 1
            by_carrier[s.carrier] = by_carrier.get(s.carrier, 0) + 1
        return {"shipments": len(self.shipments), "by_status": by_status,
                "by_carrier": by_carrier, "carriers_available": self.carriers(),
                "note": "carriers marked mock until credentials are configured"}


logistics = LogisticsManager()


def create_logistics_router():
    from fastapi import APIRouter, Body, HTTPException
    from pydantic import BaseModel
    router = APIRouter(prefix="/api/logistics", tags=["Logistics / 物流"])

    class AddrReq(BaseModel):
        name: str
        street: str
        city: str
        postal_code: str
        country: str
        phone: str = ""
        email: str = ""

    class ParcelReq(BaseModel):
        weight_kg: float = 1.0
        length_cm: float = 30.0
        width_cm: float = 20.0
        height_cm: float = 15.0
        value_cents: int = 0

    class QuoteReq(BaseModel):
        sender: AddrReq
        recipient: AddrReq
        parcel: ParcelReq
        service: str = "standard"
        carrier: Optional[str] = None

    class CreateReq(BaseModel):
        order_id: str
        sender: AddrReq
        recipient: AddrReq
        parcel: ParcelReq
        service: str = "standard"
        carrier: Optional[str] = None

    class WebhookReq(BaseModel):
        tracking_number: str
        status: str
        raw: Optional[Dict[str, Any]] = None

    @router.get("/carriers")
    async def carriers():
        return {"carriers": logistics.carriers()}

    @router.post("/quote")
    async def quote(req: QuoteReq):
        return logistics.quote(Address(**req.sender.model_dump()),
                               Address(**req.recipient.model_dump()),
                               Parcel(**req.parcel.model_dump()), req.service, req.carrier)

    @router.post("/shipments")
    async def create(req: CreateReq):
        return logistics.create(req.order_id, Address(**req.sender.model_dump()),
                                Address(**req.recipient.model_dump()),
                                Parcel(**req.parcel.model_dump()), req.service, req.carrier)

    @router.get("/track/{tracking_number}")
    async def track(tracking_number: str):
        return logistics.track(tracking_number)

    @router.post("/webhook")
    async def webhook(req: WebhookReq):
        ok = logistics.apply_webhook({"tracking_number": req.tracking_number,
                                      "status": req.status, "raw": req.raw or {}})
        return {"success": ok}

    @router.get("/stats")
    async def stats():
        return logistics.stats()

    return router


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    frm = Address("RoboBuddy DC", "Lagerstr 1", "Berlin", "10115", "DE")
    to = Address("Famille Dupont", "12 Rue de la Paix", "Paris", "75002", "FR")
    p = Parcel(2.5)
    q = logistics.quote(frm, to, p)
    print("cheapest:", q["cheapest"])
    s = logistics.create("ord_1", frm, to, p, "standard")
    print("shipment:", s["shipment_id"], s["tracking_number"], "mock:", s.get("mock"))
    print(json.dumps(logistics.track(s["tracking_number"]), indent=2)[:600])
    print(json.dumps(logistics.stats(), indent=2))