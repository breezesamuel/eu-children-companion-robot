#!/usr/bin/env python3
"""
Order Routing Engine -- 订单路由 (step 5 of the 16-step commerce workflow)

Responsibilities
  * warehouse/fulfilment-centre selection (stock, distance, capacity, cost)
  * order splitting across warehouses when stock is partial
  * fraud scoring (rule-based, explainable, no black box)
  * EU VAT determination (place-of-supply: B2C digital vs physical goods)
  * shipping method recommendation
  * payment-method routing (Stripe / SEPA / Klarna...) by country + risk

Deterministic + explainable: every decision carries its reasons (consumer law).
"""
import os, json, uuid, math, logging, threading
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger("order_routing")


# ── Warehouse ────────────────────────────────────────────────────────────
@dataclass
class Warehouse:
    warehouse_id: str
    name: str
    country: str
    city: str
    lat: float
    lon: float
    capacity_per_day: int = 1000
    handles_cod: bool = False
    zones: List[str] = field(default_factory=lambda: ["EU"])

    def distance_to(self, lat: float, lon: float) -> float:
        """Haversine km."""
        R = 6371.0
        p1, p2 = math.radians(self.lat), math.radians(lat)
        dp = p2 - p1
        dl = math.radians(lon - self.lon)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        return 2 * R * math.asin(math.sqrt(a))


@dataclass
class StockLevel:
    warehouse_id: str
    sku: str
    on_hand: int = 0
    reserved: int = 0

    @property
    def available(self) -> int:
        return max(0, self.on_hand - self.reserved)


# ── Orders ───────────────────────────────────────────────────────────────
@dataclass
class OrderLine:
    sku: str
    quantity: int
    unit_price_cents: int
    vat_rate: float = 0.0


@dataclass
class Destination:
    country: str
    postal_code: str = ""
    city: str = ""
    lat: Optional[float] = None
    lon: Optional[float] = None


class FraudVerdict(Enum):
    APPROVE = "approve"
    REVIEW = "review"
    DECLINE = "decline"


@dataclass
class FraudAssessment:
    score: float                      # 0..1
    verdict: FraudVerdict
    reasons: List[str] = field(default_factory=list)
    triggered_rules: List[str] = field(default_factory=list)


@dataclass
class RouteDecision:
    decision_id: str
    order_id: str
    assignments: List[Dict[str, Any]]      # [{warehouse_id, lines:[{sku,qty}]}]
    split: bool
    fraud: FraudAssessment
    vat: Dict[str, Any]
    recommended_shipping: Dict[str, Any]
    payment_methods: List[str]
    reasons: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


# ── EU VAT place of supply ───────────────────────────────────────────────
DIGITAL_SERVICE_SKUS = ("SUB-", "DLC-", "VOICE-")


def determine_vat(skus: List[str], destination: Destination,
                  seller_country: str = "DE") -> Dict[str, Any]:
    """Place-of-supply for EU B2C.

    Physical goods -> destination rate.
    Digital services -> customer's country rate (OSS scheme).
    """
    is_digital = any(s.startswith(DIGITAL_SERVICE_SKUS) for s in skus)
    from children_pricing import VAT_RATES, DEFAULT_VAT
    rate = VAT_RATES.get(destination.country.upper(), DEFAULT_VAT)
    direction = "destination"
    if is_digital:
        direction = "oss_customer_country"
    return {
        "rate": rate,
        "direction": direction,
        "country": destination.country.upper(),
        "seller_country": seller_country,
        "reverse_charge": False,
        "note": ("OSS: digital services taxed at customer's Member State rate"
                 if is_digital else
                 "Physical goods taxed at destination Member State rate"),
    }


# ── Fraud rules (explainable) ────────────────────────────────────────────
class FraudScorer:
    def __init__(self):
        self.rules = [
            ("high_order_value", self._high_value),
            ("billing_shipping_mismatch", self._billing_shipping_mismatch),
            ("velocity", self._velocity),
            ("new_account_high_value", self._new_account_high_value),
            ("geo_anomaly", self._geo_anomaly),
            ("proxy_or_vpn", self._proxy_or_vpn),
        ]
        self._velocity_store: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def _high_value(self, ctx) -> Optional[Tuple[float, str]]:
        if ctx["total_cents"] > 50000:      # > EUR 500
            return 0.35, f"order value EUR {ctx['total_cents']/100:.0f} > 500"
        if ctx["total_cents"] > 200000:     # > EUR 2000
            return 0.20, "order value > EUR 2000"
        return None

    def _billing_shipping_mismatch(self, ctx) -> Optional[Tuple[float, str]]:
        if (ctx.get("billing_country") and ctx.get("shipping_country")
                and ctx["billing_country"] != ctx["shipping_country"]):
            return 0.20, f"billing {ctx['billing_country']} != shipping {ctx['shipping_country']}"
        return None

    def _velocity(self, ctx) -> Optional[Tuple[float, str]]:
        now = datetime.now().timestamp()
        with self._lock:
            hits = self._velocity_store.setdefault(ctx.get("customer_key", "anon"), [])
            hits[:] = [t for t in hits if now - t < 3600]
            hits.append(now)
            if len(hits) >= 5:
                return 0.30, f"{len(hits)} orders in the last hour"
            if len(hits) >= 3:
                return 0.15, f"{len(hits)} orders in the last hour"
        return None

    def _new_account_high_value(self, ctx) -> Optional[Tuple[float, str]]:
        if ctx.get("account_age_hours", 9999) < 24 and ctx["total_cents"] > 30000:
            return 0.25, "account < 24h old and order > EUR 300"
        return None

    def _geo_anomaly(self, ctx) -> Optional[Tuple[float, str]]:
        ip_country = ctx.get("ip_country")
        ship_country = ctx.get("shipping_country")
        if ip_country and ship_country and ip_country.upper() != ship_country.upper():
            return 0.15, f"IP country {ip_country} != shipping {ship_country}"
        return None

    def _proxy_or_vpn(self, ctx) -> Optional[Tuple[float, str]]:
        if ctx.get("is_proxy") or ctx.get("is_vpn"):
            return 0.10, "proxy/VPN detected"
        return None

    def assess(self, ctx: Dict[str, Any]) -> FraudAssessment:
        score, reasons, triggered = 0.45, [], []   # base prior
        for name, fn in self.rules:
            r = fn(ctx)
            if r:
                score += r[0]
                reasons.append(r[1])
                triggered.append(name)
        score = max(0.0, min(1.0, score))
        verdict = (FraudVerdict.DECLINE if score >= 0.80
                   else FraudVerdict.REVIEW if score >= 0.60
                   else FraudVerdict.APPROVE)
        return FraudAssessment(round(score, 3), verdict, reasons, triggered)


# ── Payment method routing by country ────────────────────────────────────
PAYMENT_METHODS_BY_COUNTRY = {
    "DE": ["card", "sepa_debit", "paypal", "klarna"],
    "NL": ["ideal", "card", "paypal", "klarna"],
    "AT": ["card", "sofort", "paypal", "klarna"],
    "BE": ["bancontact", "card", "paypal", "klarna"],
    "IT": ["card", "mybank", "paypal", "klarna"],
    "ES": ["card", "paypal", "klarna"],
    "PL": ["blik", "p24", "card", "paypal"],
    "FR": ["card", "paypal", "klarna"],
    "SE": ["swish", "card", "klarna"],
    "DK": ["mobilepay", "card", "klarna"],
    "FI": ["mobilepay", "card", "klarna"],
    "DEFAULT": ["card", "paypal"],
}


def payment_methods_for(country: str, risk: FraudVerdict) -> List[str]:
    methods = list(PAYMENT_METHODS_BY_COUNTRY.get(country.upper(),
                                                  PAYMENT_METHODS_BY_COUNTRY["DEFAULT"]))
    if risk in (FraudVerdict.REVIEW, FraudVerdict.DECLINE):
        methods = [m for m in methods if m in ("card", "paypal", "sepa_debit")] or ["card"]
    return methods


# ── Router ───────────────────────────────────────────────────────────────
class OrderRouter:
    def __init__(self, warehouses: List[Warehouse] = None):
        self.warehouses: Dict[str, Warehouse] = {w.warehouse_id: w for w in (warehouses or [])}
        self.stock: Dict[Tuple[str, str], StockLevel] = {}
        self.fraud = FraudScorer()
        self._lock = threading.RLock()
        if not self.warehouses:
            self._seed_eu_warehouses()

    def _seed_eu_warehouses(self):
        seeds = [
            Warehouse("wh-de-berlin", "Berlin DC", "DE", "Berlin", 52.52, 13.40, 3000),
            Warehouse("wh-nl-ams", "Amsterdam DC", "NL", "Amsterdam", 52.37, 4.90, 2500),
            Warehouse("wh-fr-paris", "Paris DC", "FR", "Paris", 48.86, 2.35, 2000),
            Warehouse("wh-pl-waw", "Warsaw DC", "PL", "Warsaw", 52.23, 21.01, 1500),
            Warehouse("wh-es-mad", "Madrid DC", "ES", "Madrid", 40.42, -3.70, 1500),
            Warehouse("wh-it-mil", "Milan DC", "IT", "Milan", 45.46, 9.19, 1500),
        ]
        self.warehouses = {w.warehouse_id: w for w in seeds}

    def add_warehouse(self, w: Warehouse):
        with self._lock:
            self.warehouses[w.warehouse_id] = w

    def set_stock(self, warehouse_id: str, sku: str, on_hand: int, reserved: int = 0):
        with self._lock:
            self.stock[(warehouse_id, sku)] = StockLevel(warehouse_id, sku, on_hand, reserved)

    def available(self, warehouse_id: str, sku: str) -> int:
        sl = self.stock.get((warehouse_id, sku))
        return sl.available if sl else 0

    # -- selection --
    def _score_warehouse(self, w: Warehouse, dest: Destination) -> float:
        dist = w.distance_to(dest.lat, dest.lon) if dest.lat is not None else 800.0
        return dist

    def route(self, order_id: str, lines: List[OrderLine], dest: Destination,
              customer_ctx: Dict[str, Any] = None) -> RouteDecision:
        ctx = dict(customer_ctx or {})
        ctx.setdefault("total_cents", sum(l.quantity * l.unit_price_cents for l in lines))
        ctx.setdefault("shipping_country", dest.country)

        reasons: List[str] = []
        need: Dict[str, int] = {}
        for l in lines:
            need[l.sku] = need.get(l.sku, 0) + l.quantity

        # 1. candidate warehouses that can cover the FULL order (no split) first
        full = []
        for w in self.warehouses.values():
            if all(self.available(w.warehouse_id, sku) >= qty for sku, qty in need.items()):
                full.append(w)
        split = not full
        assignments: List[Dict[str, Any]] = []
        used: Dict[str, int] = {}

        if full:
            best = sorted(full, key=lambda w: self._score_warehouse(w, dest))[0]
            for w in full:
                if self._score_warehouse(w, dest) == self._score_warehouse(best, dest):
                    best = w
                    break
            assignments.append({
                "warehouse_id": best.warehouse_id, "name": best.name,
                "lines": [{"sku": s, "quantity": q} for s, q in need.items()],
                "distance_km": round(self._score_warehouse(best, dest), 1)})
            reasons.append(f"single-source from {best.warehouse_id} (nearest with full stock)")
        else:
            # 2. greedy split: nearest warehouse first, residual to next
            reasons.append("stock split across warehouses")
            dest_latlon = (dest.lat, dest.lon) if dest.lat is not None else (50.0, 9.0)
            ordered = sorted(self.warehouses.values(),
                            key=lambda w: self._score_warehouse(w, dest))
            for w in ordered:
                lines_out = []
                for sku, qty in need.items():
                    remaining = qty - used.get(sku, 0)
                    if remaining <= 0:
                        continue
                    take = min(remaining, self.available(w.warehouse_id, sku))
                    if take > 0:
                        lines_out.append({"sku": sku, "quantity": take})
                        used[sku] = used.get(sku, 0) + take
                if lines_out:
                    assignments.append({
                        "warehouse_id": w.warehouse_id, "name": w.name,
                        "lines": lines_out,
                        "distance_km": round(self._score_warehouse(w, dest), 1)})
            for sku, qty in need.items():
                if used.get(sku, 0) < qty:
                    reasons.append(
                        f"BACKORDER: {sku} short by {qty - used.get(sku, 0)} unit(s)")

        # 3. fraud
        fraud = self.fraud.assess(ctx)

        # 4. VAT
        vat = determine_vat(list(need.keys()), dest)

        # 5. shipping recommendation
        if split:
            shipping = {"method": "multi_dc_consolidated", "eta_days": "3-7",
                        "note": "shipments from multiple DCs; consolidated tracking"}
        else:
            d_km = assignments[0]["distance_km"] if assignments else 900
            if d_km < 400:
                shipping = {"method": "standard", "eta_days": "2-3"}
            elif d_km < 900:
                shipping = {"method": "standard", "eta_days": "3-5"}
            else:
                shipping = {"method": "express", "eta_days": "5-8"}

        # 6. payment routing
        methods = payment_methods_for(dest.country, fraud.verdict)
        if fraud.verdict == FraudVerdict.DECLINE:
            methods = ["card_3ds"]
            reasons.append("fraud DECLINE -> restrict to card with 3DS")

        return RouteDecision(
            decision_id=f"rd_{uuid.uuid4().hex[:12]}",
            order_id=order_id, assignments=assignments, split=split,
            fraud=fraud, vat=vat, recommended_shipping=shipping,
            payment_methods=methods, reasons=reasons)


order_router = OrderRouter()


def create_order_routing_router():
    from fastapi import APIRouter, HTTPException, Body
    from pydantic import BaseModel
    router = APIRouter(prefix="/api/order-routing", tags=["Order Routing / 订单路由"])

    class LineReq(BaseModel):
        sku: str
        quantity: int
        unit_price_cents: int
        vat_rate: float = 0.0

    class DestReq(BaseModel):
        country: str
        postal_code: str = ""
        city: str = ""
        lat: Optional[float] = None
        lon: Optional[float] = None

    class RouteReq(BaseModel):
        order_id: str
        lines: List[LineReq]
        destination: DestReq
        customer: Optional[Dict[str, Any]] = None

    @router.get("/warehouses")
    async def list_warehouses():
        return {"warehouses": [asdict(w) for w in order_router.warehouses.values()]}

    @router.post("/stock")
    async def set_stock(warehouse_id: str = Body(...), sku: str = Body(...),
                        on_hand: int = Body(...), reserved: int = Body(0)):
        order_router.set_stock(warehouse_id, sku, on_hand, reserved)
        return {"success": True}

    @router.get("/stock")
    async def get_stock():
        return {"stock": [asdict(v) for v in order_router.stock.values()]}

    @router.post("/route")
    async def route(req: RouteReq):
        d = order_router.route(
            req.order_id,
            [OrderLine(**l.model_dump()) for l in req.lines],
            Destination(**req.destination.model_dump()),
            req.customer)
        return {
            "decision_id": d.decision_id, "order_id": d.order_id,
            "assignments": d.assignments, "split": d.split,
            "fraud": {"score": d.fraud.score, "verdict": d.fraud.verdict.value,
                      "reasons": d.fraud.reasons, "triggered_rules": d.fraud.triggered_rules},
            "vat": d.vat, "recommended_shipping": d.recommended_shipping,
            "payment_methods": d.payment_methods, "reasons": d.reasons,
        }

    @router.post("/fraud/check")
    async def fraud_check(ctx: Dict[str, Any] = Body(...)):
        f = order_router.fraud.assess(ctx)
        return {"score": f.score, "verdict": f.verdict.value, "reasons": f.reasons,
                "triggered_rules": f.triggered_rules}

    return router


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    r = OrderRouter()
    r.set_stock("wh-de-berlin", "RB-2026-A1", 50)
    r.set_stock("wh-nl-ams", "RB-2026-A1", 12)
    r.set_stock("wh-nl-ams", "ACC-CASE", 100)
    r.set_stock("wh-fr-paris", "ACC-CASE", 40)
    d = r.route("ord_1", [OrderLine("RB-2026-A1", 3, 24900), OrderLine("ACC-CASE", 2, 1900)],
                Destination("FR", "75001", "Paris", 48.86, 2.35))
    print(json.dumps({
        "assignments": d.assignments, "split": d.split,
        "fraud": {"score": d.fraud.score, "verdict": d.fraud.verdict.value},
        "vat": d.vat, "shipping": d.recommended_shipping,
        "payment": d.payment_methods}, indent=2, ensure_ascii=False))