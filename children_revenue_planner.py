#!/usr/bin/env python3
"""
Revenue Target Planner — 把"日需多少钱"翻译成"每天必须卖出多少、续费多少"。

This is the instrument that answers the only question that matters:
  "日需 ¥55,556 —— 那到底需要多少台机器、多少个订阅、每天多少个客户？"

It is NOT a vanity dashboard. It encodes the *real* unit economics that already
exist in this codebase and computes, from them, the exact operating target:

  * hardware cost/price      -> scripts/autonomous_ops.py CATALOG (RB-2026-A1)
  * subscription prices      -> children_subscription.py PLANS
  * payment fees, churn, FX  -> explicit, overridable assumptions

Given a daily revenue target it returns:
  - required households/day and /year (hardware + attached subscription)
  - steady-state paying subscribers required
  - required new subscribers/month at the current churn
  - required leads/day at the current lead→customer rate
  - a per-channel split that sums to the target

It also records daily actuals and reports the live gap vs target, so the number
is *managed every day* instead of hoped for. Honest by construction: if the
inputs say you need 23 units/day, it says 23 — it never rounds a wish up.

Events emitted to the data loop (when wired):
  revenue.plan_computed · revenue.target_set · revenue.actual_recorded ·
  revenue.gap_reported
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger("revenue_planner")

DAYS_PER_MONTH = 30.4375

# ── real catalogue economics (cents, EUR) ────────────────────────────────────
# Source of truth: scripts/autonomous_ops.py CATALOG["RB-2026-A1"] (DE).
ROBOT_SKU = "RB-2026-A1"
ROBOT_PRICE_CENTS = 29900      # retail incl. VAT display
ROBOT_COST_CENTS = 18100       # landed 16200 + fulfil 900 + return 600 + support 400

# Source of truth: children_subscription.py PLANS (monthly price, EUR cents)
PLAN_PRICES_CENTS = {"SUB-STD-M": 2990, "SUB-PRO-M": 4990}
PLAN_VARIABLE_COST_CENTS = 170      # content/streaming/infra per active sub / month

# default plan mix sold
DEFAULT_PLAN_MIX = {"SUB-STD-M": 0.70, "SUB-PRO-M": 0.30}

DEFAULT_FX_CNY_PER_EUR = 7.8
DEFAULT_DAILY_TARGET_CNY = 55556.0


@dataclass
class Assumptions:
    daily_target_cny: float = DEFAULT_DAILY_TARGET_CNY
    fx_cny_per_eur: float = DEFAULT_FX_CNY_PER_EUR
    robot_price_cents: int = ROBOT_PRICE_CENTS
    robot_cost_cents: int = ROBOT_COST_CENTS
    attach_rate: float = 0.65          # share of buyers who subscribe
    monthly_churn: float = 0.05        # subscription churn / month
    payment_fee_pct: float = 0.029     # PSP percentage fee
    payment_fee_fixed_cents: int = 25  # PSP fixed fee per charge
    plan_mix: Dict[str, float] = field(default_factory=lambda: dict(DEFAULT_PLAN_MIX))
    lead_to_customer_rate: float = 0.03   # qualified lead -> paying household
    # channel split of *new households* (must sum to <= 1; remainder = paid)
    channel_mix: Dict[str, float] = field(default_factory=lambda: {
        "marketplace": 0.40,     # Amazon.de/fr/nl, bol.com — own traffic
        "retail_distributor": 0.30,  # toy/electronics chains, shelf placement
        "referral_organic": 0.20,    # word of mouth + affiliate flywheel
        "paid_social": 0.10,         # rest
    })


class RevenuePlanner:
    def __init__(self, assumptions: Optional[Assumptions] = None,
                 data_loop=None):
        self._lock = threading.RLock()
        self.a = assumptions or Assumptions()
        self.data_loop = data_loop
        self.actuals: List[Dict[str, Any]] = []
        self._emit("revenue.plan_computed", self.compute())

    # ── core model ─────────────────────────────────────────────────────────
    def _blended_arpu_cents(self) -> float:
        total = sum(self.a.plan_mix.values()) or 1.0
        return sum(PLAN_PRICES_CENTS.get(k, 0) * w for k, w in self.a.plan_mix.items()) / total

    def _sub_net_cents_per_month(self) -> float:
        arpu = self._blended_arpu_cents()
        fee = arpu * self.a.payment_fee_pct + self.a.payment_fee_fixed_cents
        return arpu - fee - PLAN_VARIABLE_COST_CENTS

    def _expected_months_year1(self) -> float:
        c = min(max(self.a.monthly_churn, 1e-6), 0.99)
        return (1 - (1 - c) ** 12) / c

    def _hardware_margin_cents(self) -> int:
        return self.a.robot_price_cents - self.a.robot_cost_cents

    def contribution_per_household_year1_cents(self) -> float:
        hardware = self._hardware_margin_cents()
        sub = self.a.attach_rate * self._expected_months_year1() * self._sub_net_cents_per_month()
        return hardware + sub

    def compute(self) -> Dict[str, Any]:
        """Full operating plan derived from the assumptions."""
        target_eur_day = self.a.daily_target_cny / self.a.fx_cny_per_eur
        target_eur_day_cents = target_eur_day * 100
        target_eur_year_cents = target_eur_day_cents * 365

        per_hh = self.contribution_per_household_year1_cents()
        required_hh_year = target_eur_year_cents / per_hh if per_hh > 0 else float("inf")
        required_hh_day = required_hh_year / 365.0

        # steady state: enough recurring margin alone to cover the daily target
        net_month = self._sub_net_cents_per_month()
        subs_needed = target_eur_day_cents / (net_month / DAYS_PER_MONTH) if net_month > 0 else float("inf")
        new_subs_month = subs_needed * self.a.monthly_churn

        leads_day = required_hh_day / self.a.lead_to_customer_rate if self.a.lead_to_customer_rate else float("inf")

        return {
            "target": {
                "daily_cny": round(self.a.daily_target_cny, 2),
                "daily_eur": round(target_eur_day, 2),
                "monthly_eur": round(target_eur_day * DAYS_PER_MONTH, 2),
                "yearly_eur": round(target_eur_day * 365, 2),
                "fx_cny_per_eur": self.a.fx_cny_per_eur,
            },
            "unit_economics_cents": {
                "robot_price": self.a.robot_price_cents,
                "robot_cost": self.a.robot_cost_cents,
                "robot_margin": self._hardware_margin_cents(),
                "blended_arpu_month": round(self._blended_arpu_cents(), 1),
                "sub_net_month": round(net_month, 1),
                "expected_months_year1": round(self._expected_months_year1(), 2),
                "contribution_per_household_year1": round(per_hh, 1),
            },
            "required": {
                "households_per_day": round(required_hh_day, 1),
                "households_per_month": round(required_hh_day * DAYS_PER_MONTH, 0),
                "households_per_year": round(required_hh_year, 0),
                "steady_state_subscribers": round(subs_needed, 0),
                "new_subscribers_per_month": round(new_subs_month, 0),
                "leads_per_day": round(leads_day, 0),
            },
            "assumptions": asdict(self.a),
        }

    # ── channels ───────────────────────────────────────────────────────────
    def channel_plan(self) -> Dict[str, Any]:
        plan = self.compute()
        hh_day = plan["required"]["households_per_day"]
        rows = []
        for name, share in self.a.channel_mix.items():
            rows.append({
                "channel": name,
                "share": round(share, 3),
                "households_per_day": round(hh_day * share, 2),
                "leads_per_day": round(hh_day * share / self.a.lead_to_customer_rate, 0),
            })
        return {
            "households_per_day_total": hh_day,
            "lead_to_customer_rate": self.a.lead_to_customer_rate,
            "channels": rows,
            "note": "allocate real budget/traffic to these channels; the loop reports actuals daily",
        }

    # ── actuals / gap ──────────────────────────────────────────────────────
    def record_actual(self, revenue_cents: int, households: int = 0,
                      new_subscribers: int = 0, date: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            rec = {
                "date": date or datetime.now().strftime("%Y-%m-%d"),
                "revenue_cents": int(revenue_cents),
                "households": int(households),
                "new_subscribers": int(new_subscribers),
            }
            self.actuals.append(rec)
        self._emit("revenue.actual_recorded", rec)
        return rec

    def gap(self, window_days: int = 7) -> Dict[str, Any]:
        plan = self.compute()
        target_day_cents = plan["target"]["daily_eur"] * 100
        recent = self.actuals[-window_days:]
        if recent:
            days = len(recent)
            actual_avg = sum(r["revenue_cents"] for r in recent) / days
            hh_avg = sum(r["households"] for r in recent) / days
        else:
            actual_avg = 0.0
            hh_avg = 0.0
        run_rate_year = actual_avg * 365
        target_year_cents = target_day_cents * 365
        cover = (actual_avg / target_day_cents) if target_day_cents else 0.0
        out = {
            "window_days": len(recent),
            "target_per_day_eur": round(target_day_cents / 100, 2),
            "actual_per_day_eur": round(actual_avg / 100, 2),
            "coverage_pct": round(cover * 100, 1),
            "gap_per_day_eur": round((target_day_cents - actual_avg) / 100, 2),
            "run_rate_year_eur": round(run_rate_year / 100, 2),
            "target_year_eur": round(target_year_cents / 100, 2),
            "actual_households_per_day": round(hh_avg, 2),
            "required_households_per_day": plan["required"]["households_per_day"],
            "on_target": actual_avg >= target_day_cents,
        }
        self._emit("revenue.gap_reported", out)
        return out

    def snapshot(self) -> Dict[str, Any]:
        return {"plan": self.compute(), "gap": self.gap()}

    # ── admin ──────────────────────────────────────────────────────────────
    def set_target(self, daily_target_cny: float) -> Dict[str, Any]:
        self.a.daily_target_cny = float(daily_target_cny)
        out = self.compute()
        self._emit("revenue.target_set", {"daily_target_cny": daily_target_cny})
        return out

    def set_assumptions(self, **kwargs) -> Dict[str, Any]:
        for k, v in kwargs.items():
            if hasattr(self.a, k) and v is not None:
                setattr(self.a, k, v)
        out = self.compute()
        self._emit("revenue.plan_computed", out)
        return out

    # ── emit ───────────────────────────────────────────────────────────────
    def _emit(self, name: str, payload: Dict):
        if not self.data_loop:
            return
        try:
            self.data_loop.emit(name, "revenue", 0, 0, payload)
        except Exception as exc:  # pragma: no cover
            logger.warning("data_loop emit failed: %s", exc)


# ── FastAPI router ──────────────────────────────────────────────────────────
def create_revenue_planner_router():
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel

    router = APIRouter(prefix="/api/revenue-plan", tags=["Revenue Target / 营收目标"])

    class TargetIn(BaseModel):
        daily_target_cny: float

    class ActualIn(BaseModel):
        revenue_cents: int
        households: int = 0
        new_subscribers: int = 0
        date: Optional[str] = None

    class AssumptionsIn(BaseModel):
        attach_rate: Optional[float] = None
        monthly_churn: Optional[float] = None
        fx_cny_per_eur: Optional[float] = None
        lead_to_customer_rate: Optional[float] = None
        robot_price_cents: Optional[int] = None
        robot_cost_cents: Optional[int] = None

    @router.get("/plan")
    def get_plan():
        return {"ok": True, **planner.compute()}

    @router.get("/channels")
    def get_channels():
        return {"ok": True, **planner.channel_plan()}

    @router.get("/gap")
    def get_gap():
        return {"ok": True, **planner.gap()}

    @router.get("/snapshot")
    def get_snapshot():
        return {"ok": True, **planner.snapshot()}

    @router.post("/target")
    def set_target(req: TargetIn):
        return {"ok": True, **planner.set_target(req.daily_target_cny)}

    @router.post("/assumptions")
    def set_assumptions(req: AssumptionsIn):
        return {"ok": True, **planner.set_assumptions(**req.model_dump())}

    @router.post("/actuals")
    def record_actual(req: ActualIn):
        rec = planner.record_actual(req.revenue_cents, req.households,
                                    req.new_subscribers, req.date)
        return {"ok": True, "recorded": rec, "gap": planner.gap()}

    return router


# ── singleton (lazy wired to the data loop) ─────────────────────────────────
def _wire() -> RevenuePlanner:
    data_loop = None
    try:
        from children_data_loop import data_loop as _dl
        data_loop = _dl
    except Exception:
        pass
    return RevenuePlanner(data_loop=data_loop)


planner = _wire()
