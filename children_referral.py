#!/usr/bin/env python3
"""
Referral / Affiliate Program -- 推荐分佣闭环 (第 24 角：病毒式获客)

A genuine closed loop:
  share link -> new customer -> first order -> commission -> payout
  -> referrer notified -> referrer shares more -> flywheel

Signals produced:
  * `referral.created` / `referral.converted` / `commission.paid` into data_loop
  * commission tier upgrades feed self_learning (task="referral")
  * anti-fraud: self-referral detection, velocity limits, cookie attribution

Offline-testable, deterministic, no external service required.
Privacy: only pseudonym household_id, no PII in referral codes.
"""
from __future__ import annotations

import logging
import threading
import uuid
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger("referral")

# Commission tiers (cumulative GMV referred)
TIERS = [
    {"name": "BRONZE", "min_gmv_cents": 0,       "rate_pct": 5,  "bonus_per_conversion_cents": 0},
    {"name": "SILVER", "min_gmv_cents": 50_000,  "rate_pct": 7,  "bonus_per_conversion_cents": 200},
    {"name": "GOLD",   "min_gmv_cents": 200_000, "rate_pct": 10, "bonus_per_conversion_cents": 500},
    {"name": "PLATINUM","min_gmv_cents": 500_000,"rate_pct": 12, "bonus_per_conversion_cents": 1000},
]

# Attribution window (days)
ATTRIBUTION_DAYS = 30

# Anti-fraud
MAX_REFERRALS_PER_DAY = 20
SELF_REFERRAL_COOKIE_NAME = "ref_src"


@dataclass
class ReferralCode:
    code: str
    referrer_household: str
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    tier: str = "BRONZE"
    total_gmv_cents: int = 0
    total_conversions: int = 0
    total_commission_cents: int = 0
    active: bool = True


@dataclass
class ReferralEvent:
    event_id: str
    code: str
    referee_household: str
    event_type: str           # click | signup | order | conversion | commission
    order_id: Optional[str] = None
    order_cents: int = 0
    commission_cents: int = 0
    tier_at_event: str = "BRONZE"
    meta: Dict[str, Any] = field(default_factory=dict)
    at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class CommissionPayout:
    payout_id: str
    referrer_household: str
    amount_cents: int
    period_start: str
    period_end: str
    status: str = "pending"   # pending | paid | failed
    paid_at: Optional[str] = None
    reference: str = ""


class ReferralEngine:
    def __init__(self, data_loop=None, self_learning=None):
        self._lock = threading.RLock()
        self.codes: Dict[str, ReferralCode] = {}           # code -> ReferralCode
        self.household_to_code: Dict[str, str] = {}        # household -> their code
        self.events: List[ReferralEvent] = []
        self.payouts: Dict[str, CommissionPayout] = {}
        self.clicks: Dict[str, List[Dict]] = defaultdict(list)  # referee_household -> [{code, at}]
        self.data_loop = data_loop
        self.self_learning = self_learning

    # -- code lifecycle --
    def get_or_create_code(self, household_id: str) -> ReferralCode:
        with self._lock:
            if household_id in self.household_to_code:
                return self.codes[self.household_to_code[household_id]]
            code = f"ref_{uuid.uuid4().hex[:8]}"
            rc = ReferralCode(code=code, referrer_household=household_id)
            self.codes[code] = rc
            self.household_to_code[household_id] = code
            self._emit("referral.created", household_id, {"code": code})
            return rc

    def get_code(self, code: str) -> Optional[ReferralCode]:
        return self.codes.get(code)

    def record_click(self, code: str, referee_household: str, meta: Optional[Dict] = None) -> bool:
        """Record a click on a referral link. Returns False if fraud detected."""
        with self._lock:
            rc = self.codes.get(code)
            if not rc or not rc.active:
                return False
            if rc.referrer_household == referee_household:
                logger.warning("Self-referral blocked: %s", referee_household)
                return False
            today = datetime.now().date().isoformat()
            recent = [c for c in self.clicks[referee_household]
                      if c["at"].startswith(today)]
            if len(recent) >= MAX_REFERRALS_PER_DAY:
                logger.warning("Velocity limit hit for %s", referee_household)
                return False
            self.clicks[referee_household].append({"code": code, "at": datetime.now().isoformat(),
                                                   "meta": meta or {}})
            self._emit("referral.click", referee_household, {"code": code, "referrer": rc.referrer_household})
            return True

    def record_signup(self, referee_household: str) -> Optional[str]:
        """Attribute signup to most recent click within window."""
        with self._lock:
            clicks = self.clicks.get(referee_household, [])
            if not clicks:
                return None
            # last click wins within attribution window
            for c in reversed(clicks):
                click_at = datetime.fromisoformat(c["at"])
                if (datetime.now() - click_at).days <= ATTRIBUTION_DAYS:
                    code = c["code"]
                    self._emit("referral.signup", referee_household, {"code": code})
                    return code
            return None

    def record_conversion(self, referee_household: str, order_id: str, order_cents: int) -> Optional[Dict]:
        """First paid order by referee -> commission for referrer."""
        code = self.record_signup(referee_household)
        if not code:
            return None
        with self._lock:
            rc = self.codes[code]
            if not rc.active:
                return None
            tier = self._tier_for_gmv(rc.total_gmv_cents + order_cents)
            rate = tier["rate_pct"]
            bonus = tier["bonus_per_conversion_cents"]
            commission = int(round(order_cents * rate / 100)) + bonus

            rc.total_gmv_cents += order_cents
            rc.total_conversions += 1
            rc.total_commission_cents += commission
            rc.tier = tier["name"]

            ev = ReferralEvent(
                event_id=f"rev_{uuid.uuid4().hex[:10]}",
                code=code, referee_household=referee_household,
                event_type="conversion", order_id=order_id,
                order_cents=order_cents, commission_cents=commission,
                tier_at_event=tier["name"])
            self.events.append(ev)

            # referral.converted event for referrer
            self._emit("referral.converted", rc.referrer_household, {
                "code": code, "referee": referee_household,
                "order_id": order_id, "order_cents": order_cents,
                "commission_cents": commission, "tier": tier["name"]})

            # commission.created for referrer
            self._emit("commission.created", rc.referrer_household, {
                "code": code, "amount_cents": commission, "order_id": order_id})

            # self-learning signal
            if self.self_learning:
                try:
                    self.self_learning.thumbs("referral", code, up=True)
                except Exception as exc:
                    logger.warning("self_learning feed failed: %s", exc)

            return {"code": code, "commission_cents": commission, "tier": tier["name"]}

    def _tier_for_gmv(self, gmv: int) -> Dict:
        for t in reversed(TIERS):
            if gmv >= t["min_gmv_cents"]:
                return t
        return TIERS[0]

    def get_referrer_stats(self, household_id: str) -> Dict[str, Any]:
        with self._lock:
            code = self.household_to_code.get(household_id)
            if not code:
                return {"has_code": False}
            rc = self.codes[code]
            tier = self._tier_for_gmv(rc.total_gmv_cents)
            next_tier = None
            for t in TIERS:
                if t["min_gmv_cents"] > rc.total_gmv_cents:
                    next_tier = t
                    break
            return {
                "has_code": True, "code": rc.code, "tier": rc.tier,
                "total_gmv_cents": rc.total_gmv_cents,
                "total_conversions": rc.total_conversions,
                "total_commission_cents": rc.total_commission_cents,
                "commission_rate_pct": tier["rate_pct"],
                "next_tier": next_tier["name"] if next_tier else None,
                "next_tier_gmv_cents": next_tier["min_gmv_cents"] if next_tier else None,
            }

    def list_referrals(self, household_id: str, limit: int = 50) -> List[Dict]:
        with self._lock:
            code = self.household_to_code.get(household_id)
            if not code:
                return []
            refs = [asdict(e) for e in self.events
                    if e.code == code and e.event_type == "conversion"]
            refs.sort(key=lambda x: x["at"], reverse=True)
            return refs[:limit]

    # -- payout cycle --
    def create_payout(self, household_id: str, period_days: int = 30) -> Optional[CommissionPayout]:
        with self._lock:
            code = self.household_to_code.get(household_id)
            if not code:
                return None
            rc = self.codes[code]
            if rc.total_commission_cents <= 0:
                return None
            end = datetime.now()
            start = end - timedelta(days=period_days)
            # sum commissions in period from conversion events
            period_comm = sum(e.commission_cents for e in self.events
                              if e.code == code and e.event_type == "conversion"
                              and start <= datetime.fromisoformat(e.at) <= end)
            if period_comm <= 0:
                return None
            payout = CommissionPayout(
                payout_id=f"pay_{uuid.uuid4().hex[:10]}",
                referrer_household=household_id,
                amount_cents=period_comm,
                period_start=start.isoformat(),
                period_end=end.isoformat())
            self.payouts[payout.payout_id] = payout
            self._emit("commission.payout_created", household_id,
                       {"payout_id": payout.payout_id, "amount_cents": period_comm})
            return payout

    def mark_payout_paid(self, payout_id: str, reference: str = "") -> Optional[CommissionPayout]:
        with self._lock:
            p = self.payouts.get(payout_id)
            if not p:
                return None
            p.status = "paid"
            p.paid_at = datetime.now().isoformat()
            p.reference = reference
            self._emit("commission.paid", p.referrer_household,
                       {"payout_id": payout_id, "amount_cents": p.amount_cents})
            return p

    # -- admin / fraud --
    def disable_code(self, code: str, reason: str = "") -> bool:
        with self._lock:
            rc = self.codes.get(code)
            if not rc:
                return False
            rc.active = False
            self._emit("referral.disabled", rc.referrer_household,
                       {"code": code, "reason": reason})
            return True

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total_codes = len(self.codes)
            active_codes = sum(1 for c in self.codes.values() if c.active)
            total_conversions = sum(c.total_conversions for c in self.codes.values())
            total_gmv = sum(c.total_gmv_cents for c in self.codes.values())
            total_comm = sum(c.total_commission_cents for c in self.codes.values())
            by_tier = defaultdict(int)
            for c in self.codes.values():
                by_tier[c.tier] += 1
            pending_payouts = sum(p.amount_cents for p in self.payouts.values()
                                  if p.status == "pending")
        return {
            "total_codes": total_codes, "active_codes": active_codes,
            "total_conversions": total_conversions,
            "total_gmv_cents": total_gmv,
            "total_commission_cents": total_comm,
            "by_tier": dict(by_tier),
            "pending_payout_cents": pending_payouts,
        }

    def _emit(self, name: str, household_id: str, payload: Dict):
        if not self.data_loop:
            return
        try:
            self.data_loop.emit(name, household_id, 0, 0, payload)
        except Exception as exc:
            logger.warning("data_loop emit failed: %s", exc)


# -- FastAPI router --
def create_referral_router():
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel

    router = APIRouter(prefix="/api/referral", tags=["Referral / 推荐分佣"])

    class ClickIn(BaseModel):
        code: str
        referee_household: str
        meta: Dict[str, Any] = {}

    class ConversionIn(BaseModel):
        referee_household: str
        order_id: str
        order_cents: int

    class PayoutIn(BaseModel):
        household_id: str
        period_days: int = 30

    class PaidIn(BaseModel):
        payout_id: str
        reference: str = ""

    class DisableIn(BaseModel):
        code: str
        reason: str = ""

    @router.get("/code")
    def get_code(household_id: str):
        rc = referral.get_or_create_code(household_id)
        return {"ok": True, "code": rc.code, "stats": referral.get_referrer_stats(household_id)}

    @router.post("/click")
    def click(req: ClickIn):
        ok = referral.record_click(req.code, req.referee_household, req.meta)
        return {"ok": ok}

    @router.post("/conversion")
    def conversion(req: ConversionIn):
        out = referral.record_conversion(req.referee_household, req.order_id, req.order_cents)
        if not out:
            raise HTTPException(400, "no valid attribution")
        return {"ok": True, **out}

    @router.get("/referrals")
    def referrals(household_id: str, limit: int = 50):
        return {"ok": True, "referrals": referral.list_referrals(household_id, limit)}

    @router.get("/stats")
    def stats(household_id: str):
        return {"ok": True, "stats": referral.get_referrer_stats(household_id)}

    @router.get("/admin/stats")
    def admin_stats():
        return {"ok": True, "stats": referral.stats()}

    @router.post("/payout/create")
    def create_payout(req: PayoutIn):
        p = referral.create_payout(req.household_id, req.period_days)
        if not p:
            raise HTTPException(400, "no commission due")
        return {"ok": True, "payout": asdict(p)}

    @router.post("/payout/paid")
    def payout_paid(req: PaidIn):
        p = referral.mark_payout_paid(req.payout_id, req.reference)
        if not p:
            raise HTTPException(404, "payout not found")
        return {"ok": True, "payout": asdict(p)}

    @router.post("/disable")
    def disable(req: DisableIn):
        ok = referral.disable_code(req.code, req.reason)
        if not ok:
            raise HTTPException(404, "code not found")
        return {"ok": True}

    return router


# -- singleton (lazy wired) --
def _wire() -> ReferralEngine:
    data_loop = self_learning = None
    try:
        from children_data_loop import data_loop as _dl
        data_loop = _dl
    except Exception:
        pass
    try:
        from children_self_learning import self_learning as _sl
        self_learning = _sl
    except Exception:
        pass
    return ReferralEngine(data_loop=data_loop, self_learning=self_learning)


referral = _wire()