#!/usr/bin/env python3
"""
Pricing Engine — 定价 (step 4 of the 16-step commerce workflow)

Responsibilities
  * rule-based dynamic pricing (cost + margin floor, ceiling, tiered)
  * geographic / currency-aware EU VAT-inclusive display pricing
  * competitor price monitoring -> auto undercut / match suggestions
  * price experiment hooks (feeds 自进化)
  * full audit trail of every price decision (explainability)

All decisions are explainable and logged (DSA transparency + consumer law).
"""
import os, json, math, time, uuid, logging, threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger("pricing")

# ── EU VAT (standard rates, simplified — verify per Member State) ──────────
VAT_RATES = {
    "DE": 0.19, "FR": 0.20, "IT": 0.22, "ES": 0.21, "PL": 0.23, "NL": 0.21,
    "SE": 0.25, "DK": 0.25, "FI": 0.255, "AT": 0.20, "BE": 0.21, "PT": 0.23,
    "IE": 0.23, "CZ": 0.21, "RO": 0.19, "HU": 0.27, "SK": 0.23, "SI": 0.22,
    "BG": 0.20, "HR": 0.25, "LT": 0.21, "LV": 0.21, "EE": 0.22, "LU": 0.17,
    "MT": 0.18, "CY": 0.19, "GR": 0.24, "CH": 0.081, "NO": 0.25, "GB": 0.20,
}
DEFAULT_VAT = 0.20


class PriceReason(Enum):
    RULE_BASE = "rule_base"
    COST_FLOOR = "cost_floor"
    CEILING_CAP = "ceiling_cap"
    COMPETITOR_MATCH = "competitor_match"
    COMPETITOR_UNDERCUT = "competitor_undercut"
    EXPERIMENT = "experiment"
    MANUAL_OVERRIDE = "manual_override"


@dataclass
class CostModel:
    """Unit economics."""
    sku: str
    unit_cost_cents: int          # BOM + manufacturing
    landed_cost_cents: int        # unit_cost + freight + duty
    fulfillment_cents: int        # pick/pack/ship
    return_reserve_cents: int     # provision for RMA
    support_cost_cents: int       # amortized support
    currency: str = "EUR"

    @property
    def total_cost_cents(self) -> int:
        return (self.landed_cost_cents + self.fulfillment_cents +
                self.return_reserve_cents + self.support_cost_cents)


@dataclass
class PricingRule:
    rule_id: str
    name: str
    sku_pattern: str = "*"
    min_margin_pct: float = 0.35
    max_margin_pct: float = 0.75
    absolute_floor_cents: int = 0
    absolute_ceiling_cents: Optional[int] = None
    competitor_mode: str = "none"     # none | match | undercut
    competitor_undercut_pct: float = 0.05
    priority: int = 100
    enabled: bool = True


@dataclass
class CompetitorPrice:
    sku: str
    competitor: str
    price_cents: int
    currency: str
    url: str = ""
    observed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    in_stock: bool = True


@dataclass
class PriceDecision:
    decision_id: str
    sku: str
    final_price_cents: int
    currency: str
    vat_rate: float
    price_ex_vat_cents: int
    vat_amount_cents: int
    reason: PriceReason
    margin_pct: float
    cost_cents: int
    applied_rules: List[str] = field(default_factory=list)
    breakdown: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


# ── Engine ────────────────────────────────────────────────────────────────

class PricingEngine:
    def __init__(self):
        self._rules: List[PricingRule] = []
        self._costs: Dict[str, CostModel] = {}
        self._competitor: Dict[str, List[CompetitorPrice]] = {}
        self._history: List[PriceDecision] = []
        self._overrides: Dict[str, int] = {}
        self._lock = threading.RLock()
        self._add_default_rules()

    def _add_default_rules(self):
        self.add_rule(PricingRule(
            rule_id="r-default", name="Default margin band",
            sku_pattern="*", min_margin_pct=0.35, max_margin_pct=0.75, priority=1000))
        self.add_rule(PricingRule(
            rule_id="r-hardware", name="Hardware (physical device)",
            sku_pattern="RB-*", min_margin_pct=0.30, max_margin_pct=0.60,
            competitor_mode="undercut", competitor_undercut_pct=0.05, priority=10))
        self.add_rule(PricingRule(
            rule_id="r-subscription", name="Subscription (SaaS-like, low cost)",
            sku_pattern="SUB-*", min_margin_pct=0.80, max_margin_pct=0.95, priority=20))
        self.add_rule(PricingRule(
            rule_id="r-accessory", name="Accessories",
            sku_pattern="ACC-*", min_margin_pct=0.45, max_margin_pct=0.70,
            competitor_mode="match", priority=30))

    # -- config --
    def add_rule(self, rule: PricingRule) -> str:
        with self._lock:
            self._rules.append(rule)
            self._rules.sort(key=lambda r: (r.priority, r.rule_id))
        return rule.rule_id

    def set_cost_model(self, cost: CostModel):
        with self._lock:
            self._costs[cost.sku] = cost

    def record_competitor_price(self, p: CompetitorPrice):
        with self._lock:
            self._competitor.setdefault(p.sku, []).append(p)
            # keep last 30 observations
            self._competitor[p.sku] = self._competitor[p.sku][-30:]

    def set_override(self, sku: str, price_cents: int):
        with self._lock:
            self._overrides[sku] = int(price_cents)

    def clear_override(self, sku: str):
        with self._lock:
            self._overrides.pop(sku, None)

    # -- matching --
    def _matching_rules(self, sku: str) -> List[PricingRule]:
        import fnmatch
        out = []
        for r in self._rules:
            if not r.enabled:
                continue
            if r.sku_pattern == "*" or fnmatch.fnmatch(sku, r.sku_pattern):
                out.append(r)
        return out

    def latest_competitor_price(self, sku: str) -> Optional[CompetitorPrice]:
        obs = [p for p in self._competitor.get(sku, []) if p.in_stock]
        if not obs:
            return None
        return sorted(obs, key=lambda p: p.observed_at, reverse=True)[0]

    # -- core --
    def price(self, sku: str, country: str = "DE", currency: str = "EUR",
              experiment_variant: Optional[str] = None) -> PriceDecision:
        with self._lock:
            applied: List[str] = []
            breakdown: Dict[str, Any] = {}

            cost = self._costs.get(sku)
            cost_cents = cost.total_cost_cents if cost else 0
            breakdown["cost_cents"] = cost_cents

            # 1. manual override wins outright (still audited)
            if sku in self._overrides:
                base = self._overrides[sku]
                reason = PriceReason.MANUAL_OVERRIDE
                applied.append("override")
                breakdown["override_cents"] = base
            else:
                rules = self._matching_rules(sku)
                rule = rules[0] if rules else PricingRule(rule_id="r-fallback", name="fallback")
                applied.append(rule.rule_id)

                # base price = cost / (1 - target_margin) using mid-band margin
                target_margin = (rule.min_margin_pct + rule.max_margin_pct) / 2
                if cost_cents > 0:
                    base = int(round(cost_cents / (1 - target_margin)))
                else:
                    base = 0
                breakdown["target_margin_pct"] = target_margin

                # margin floor / ceiling
                if cost_cents > 0:
                    floor = int(round(cost_cents / (1 - rule.max_margin_pct)))
                    ceil = int(round(cost_cents / (1 - rule.min_margin_pct)))
                    if base < floor:
                        base = floor
                        reason = PriceReason.COST_FLOOR
                        breakdown["floor_applied_cents"] = floor
                    else:
                        reason = PriceReason.RULE_BASE
                    if base > ceil:
                        base = ceil
                        breakdown["ceiling_applied_cents"] = ceil
                else:
                    reason = PriceReason.RULE_BASE

                if rule.absolute_floor_cents and base < rule.absolute_floor_cents:
                    base = rule.absolute_floor_cents
                    breakdown["absolute_floor_applied"] = True
                if rule.absolute_ceiling_cents and base > rule.absolute_ceiling_cents:
                    base = rule.absolute_ceiling_cents
                    breakdown["absolute_ceiling_applied"] = True

                # competitor response
                comp = self.latest_competitor_price(sku)
                if comp and rule.competitor_mode in ("match", "undercut"):
                    breakdown["competitor"] = {
                        "name": comp.competitor, "price_cents": comp.price_cents,
                        "observed_at": comp.observed_at}
                    if rule.competitor_mode == "match":
                        base = comp.price_cents
                        reason = PriceReason.COMPETITOR_MATCH
                    else:
                        cut = int(round(comp.price_cents * (1 - rule.competitor_undercut_pct)))
                        base = min(base, cut)
                        reason = PriceReason.COMPETITOR_UNDERCUT
                        breakdown["undercut_pct"] = rule.competitor_undercut_pct

                # HARD FLOOR: never sell below the margin floor for the rule.
                # (A competitor match/undercut may propose a lower price; we
                # follow it only down to the floor, never below.)
                if cost_cents > 0:
                    margin_floor = int(round(cost_cents / (1 - rule.max_margin_pct)))
                    if base < margin_floor:
                        breakdown["competitor_rejected_below_margin_floor"] = True
                        breakdown["margin_floor_cents"] = margin_floor
                        base = margin_floor
                        reason = PriceReason.COST_FLOOR

            # experiment hook (自进化 will drive this)
            if experiment_variant:
                adj = self._variant_adjustment(sku, experiment_variant)
                if adj:
                    base = int(round(base * (1 + adj)))
                    reason = PriceReason.EXPERIMENT
                    applied.append(f"experiment:{experiment_variant}")
                    breakdown["experiment_adjustment"] = adj

            base = max(0, int(base))

            # VAT: price shown to consumer is gross; derive net for accounting
            vat = VAT_RATES.get(country.upper(), DEFAULT_VAT)
            price_ex_vat = int(round(base / (1 + vat)))
            vat_amount = base - price_ex_vat

            margin_pct = ((base - cost_cents) / base) if base else 0.0

            dec = PriceDecision(
                decision_id=f"pd_{uuid.uuid4().hex[:12]}",
                sku=sku, final_price_cents=base, currency=currency,
                vat_rate=vat, price_ex_vat_cents=price_ex_vat,
                vat_amount_cents=vat_amount, reason=reason,
                margin_pct=round(margin_pct, 4), cost_cents=cost_cents,
                applied_rules=applied, breakdown=breakdown)
            self._history.append(dec)
            if len(self._history) > 5000:
                self._history = self._history[-2500:]
            return dec

    def _variant_adjustment(self, sku: str, variant: str) -> float:
        """Deterministic experiment adjustment; 自进化 module owns the real weights."""
        table = {"control": 0.0, "minus5": -0.05, "plus5": 0.05, "plus10": 0.10, "minus10": -0.10}
        return table.get(variant, 0.0)

    # -- reporting --
    def history(self, sku: str = None, limit: int = 100) -> List[Dict]:
        rows = self._history if sku is None else [d for d in self._history if d.sku == sku]
        return [asdict(d) for d in rows[-limit:]]

    def margin_report(self) -> List[Dict]:
        out = []
        for sku, c in self._costs.items():
            dec = self.price(sku)
            out.append({
                "sku": sku, "cost_cents": c.total_cost_cents,
                "price_cents": dec.final_price_cents,
                "margin_pct": dec.margin_pct,
                "reason": dec.reason.value})
        return sorted(out, key=lambda r: r["margin_pct"])


pricing_engine = PricingEngine()


# ── FastAPI router ───────────────────────────────────────────────────────
def create_pricing_router():
    from fastapi import APIRouter, HTTPException, Body
    from pydantic import BaseModel
    router = APIRouter(prefix="/api/pricing", tags=["Pricing / 定价"])

    class CostReq(BaseModel):
        sku: str
        unit_cost_cents: int
        landed_cost_cents: int
        fulfillment_cents: int
        return_reserve_cents: int
        support_cost_cents: int
        currency: str = "EUR"

    class RuleReq(BaseModel):
        rule_id: str
        name: str
        sku_pattern: str = "*"
        min_margin_pct: float = 0.35
        max_margin_pct: float = 0.75
        absolute_floor_cents: int = 0
        absolute_ceiling_cents: Optional[int] = None
        competitor_mode: str = "none"
        competitor_undercut_pct: float = 0.05
        priority: int = 100

    class CompReq(BaseModel):
        sku: str
        competitor: str
        price_cents: int
        currency: str = "EUR"
        url: str = ""
        in_stock: bool = True

    @router.get("/rules")
    async def list_rules():
        return {"rules": [asdict(r) for r in pricing_engine._rules]}

    @router.post("/rules")
    async def add_rule(req: RuleReq):
        rid = pricing_engine.add_rule(PricingRule(**req.model_dump()))
        return {"success": True, "rule_id": rid}

    @router.post("/costs")
    async def set_cost(req: CostReq):
        pricing_engine.set_cost_model(CostModel(**req.model_dump()))
        return {"success": True}

    @router.get("/costs")
    async def list_costs():
        return {"costs": [asdict(c) for c in pricing_engine._costs.values()]}

    @router.post("/competitors")
    async def record_competitor(req: CompReq):
        pricing_engine.record_competitor_price(CompetitorPrice(**req.model_dump()))
        return {"success": True}

    @router.get("/competitors/{sku}")
    async def competitor_prices(sku: str):
        return {"observations": [asdict(p) for p in pricing_engine._competitor.get(sku, [])]}

    @router.get("/quote/{sku}")
    async def quote(sku: str, country: str = "DE", variant: Optional[str] = None):
        return asdict(pricing_engine.price(sku, country, experiment_variant=variant))

    @router.post("/override/{sku}")
    async def set_override(sku: str, price_cents: int = Body(..., embed=True)):
        pricing_engine.set_override(sku, price_cents)
        return {"success": True}

    @router.delete("/override/{sku}")
    async def clear_override(sku: str):
        pricing_engine.clear_override(sku)
        return {"success": True}

    @router.get("/history")
    async def history(sku: Optional[str] = None, limit: int = 100):
        return {"decisions": pricing_engine.history(sku, limit)}

    @router.get("/margin-report")
    async def margin_report():
        return {"skus": pricing_engine.margin_report()}

    return router


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    e = PricingEngine()
    e.set_cost_model(CostModel("RB-2026-A1", 9000, 11500, 1200, 900, 400))
    e.set_cost_model(CostModel("SUB-PRO-YR", 0, 0, 200, 0, 600, "EUR"))
    e.record_competitor_price(CompetitorPrice("RB-2026-A1", "Miko", 19900, "EUR"))
    for sku in ("RB-2026-A1", "SUB-PRO-YR"):
        d = e.price(sku, "DE")
        print(f"{sku}: EUR {d.final_price_cents/100:.2f} (margin {d.margin_pct*100:.1f}%) reason={d.reason.value}")