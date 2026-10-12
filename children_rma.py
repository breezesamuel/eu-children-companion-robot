#!/usr/bin/env python3
"""
RMA & Warranty -- 售后 (steps 7 and 16 of the 16-step commerce workflow)

  * return authorization lifecycle (requested -> approved -> shipped -> received
    -> inspected -> refunded/replaced/restocked)
  * warranty registration + claim evaluation (legal guarantee 2y in EU,
    commercial extended warranty)
  * repair / refurbish / recycle disposition
  * refund and replacement issuance (ties into payments + orders)
  * root-cause analytics feeding 自学习
"""
import os, json, uuid, logging, threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger("rma")


class RMAState(Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_TRANSIT = "in_transit"
    RECEIVED = "received"
    INSPECTED = "inspected"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ReturnReason(Enum):
    DEFECTIVE = "defective"
    DAMAGED_IN_TRANSIT = "damaged_in_transit"
    NOT_AS_DESCRIBED = "not_as_described"
    CHANGED_MIND = "changed_mind"
    WRONG_ITEM = "wrong_item"
    GIFT = "gift"


class Disposition(Enum):
    RESTOCK = "restock"
    REPAIR = "repair"
    REFURBISH = "refurbish"
    RECYCLE = "recycle"
    SCRAP = "scrap"


# EU statutory right of withdrawal: 14 days, no reason needed
WITHDRAWAL_DAYS = 14
LEGAL_GUARANTEE_MONTHS = 24      # Directive (EU) 2019/771


@dataclass
class WarrantyRecord:
    warranty_id: str
    serial_number: str
    sku: str
    customer_id: str
    purchase_date: str
    warranty_type: str = "legal"        # legal | extended
    expires_at: str = ""

    def is_active(self, at: datetime = None) -> bool:
        at = at or datetime.now()
        return datetime.fromisoformat(self.expires_at) >= at


@dataclass
class RMARequest:
    rma_id: str
    order_id: str
    customer_id: str
    line_sku: str
    quantity: int
    reason: ReturnReason
    description: str = ""
    state: RMAState = RMAState.REQUESTED
    precedent: str = "eu_14_day"        # eu_14_day | legal_guarantee | commercial
    approved_at: Optional[str] = None
    rejected_reason: Optional[str] = None
    tracking_number: Optional[str] = None
    received_at: Optional[str] = None
    inspection: Dict[str, Any] = field(default_factory=dict)
    disposition: Optional[Disposition] = None
    resolution: Optional[str] = None      # refund | replacement | repair | credit
    refund_cents: int = 0
    restocking_fee_cents: int = 0
    events: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


class RMAService:
    def __init__(self):
        self.rmas: Dict[str, RMARequest] = {}
        self.warranties: Dict[str, WarrantyRecord] = {}
        self._lock = threading.RLock()

    def _event(self, r: RMARequest, action: str, detail: str = ""):
        r.events.append({"action": action, "detail": detail,
                         "at": datetime.now().isoformat()})
        r.updated_at = datetime.now().isoformat()

    # -- warranty --
    def register_warranty(self, serial: str, sku: str, customer_id: str,
                          purchase_date: str, warranty_type: str = "legal",
                          extra_months: int = 0) -> WarrantyRecord:
        months = LEGAL_GUARANTEE_MONTHS if warranty_type == "legal" else extra_months or 12
        exp = datetime.fromisoformat(purchase_date) + timedelta(days=months * 30)
        w = WarrantyRecord(warranty_id=f"wty_{uuid.uuid4().hex[:10]}",
                           serial_number=serial, sku=sku, customer_id=customer_id,
                           purchase_date=purchase_date, warranty_type=warranty_type,
                           expires_at=exp.isoformat())
        with self._lock:
            self.warranties[serial] = w
        return w

    def check_warranty(self, serial: str) -> Dict[str, Any]:
        w = self.warranties.get(serial)
        if not w:
            return {"found": False}
        return {"found": True, "warranty": asdict(w),
                "active": w.is_active(),
                "expires_in_days": (datetime.fromisoformat(w.expires_at) - datetime.now()).days}

    # -- rma lifecycle --
    def create_rma(self, order_id: str, customer_id: str, sku: str, quantity: int,
                   reason: ReturnReason, description: str = "",
                   order_date: str = None, precedent: str = "eu_14_day") -> RMARequest:
        r = RMARequest(rma_id=f"rma_{uuid.uuid4().hex[:10]}", order_id=order_id,
                       customer_id=customer_id, line_sku=sku, quantity=quantity,
                       reason=reason, description=description, precedent=precedent)
        self._event(r, "requested", f"reason={reason.value}")
        with self._lock:
            self.rmas[r.rma_id] = r
        return r

    def can_return_without_reason(self, order_date: str, now: datetime = None) -> bool:
        now = now or datetime.now()
        return (now - datetime.fromisoformat(order_date)).days <= WITHDRAWAL_DAYS

    def approve(self, rma_id: str, restocking_fee_cents: int = 0) -> bool:
        r = self.rmas.get(rma_id)
        if not r or r.state != RMAState.REQUESTED:
            return False
        # policy: free return within withdrawal window; fee afterwards unless defective
        r.restocking_fee_cents = restocking_fee_cents
        if r.reason in (ReturnReason.DEFECTIVE, ReturnReason.DAMAGED_IN_TRANSIT,
                        ReturnReason.WRONG_ITEM):
            r.restocking_fee_cents = 0
        r.state = RMAState.APPROVED
        r.approved_at = datetime.now().isoformat()
        self._event(r, "approved", f"restocking_fee={r.restocking_fee_cents}")
        return True

    def reject(self, rma_id: str, why: str) -> bool:
        r = self.rmas.get(rma_id)
        if not r or r.state != RMAState.REQUESTED:
            return False
        r.state = RMAState.REJECTED
        r.rejected_reason = why
        self._event(r, "rejected", why)
        return True

    def ship(self, rma_id: str, tracking: str) -> bool:
        r = self.rmas.get(rma_id)
        if not r:
            return False
        r.tracking_number = tracking
        r.state = RMAState.IN_TRANSIT
        self._event(r, "shipped", tracking)
        return True

    def receive(self, rma_id: str) -> bool:
        r = self.rmas.get(rma_id)
        if not r:
            return False
        r.state = RMAState.RECEIVED
        r.received_at = datetime.now().isoformat()
        self._event(r, "received")
        return True

    def inspect(self, rma_id: str, disposition: Disposition,
                refund_cents: int = 0, resolution: str = "refund",
                notes: str = "") -> bool:
        r = self.rmas.get(rma_id)
        if not r:
            return False
        r.state = RMAState.INSPECTED
        r.disposition = disposition
        r.refund_cents = refund_cents
        r.resolution = resolution
        r.inspection = {"notes": notes, "at": datetime.now().isoformat(),
                        "inspector": "auto"}
        self._event(r, "inspected", f"disposition={disposition.value}, refund={refund_cents}")
        return True

    def resolve(self, rma_id: str) -> bool:
        r = self.rmas.get(rma_id)
        if not r or r.state != RMAState.INSPECTED:
            return False
        r.state = RMAState.RESOLVED
        self._event(r, "resolved", str(r.resolution))
        return True

    # -- analytics --
    def analytics(self) -> Dict[str, Any]:
        by_reason: Dict[str, int] = {}
        by_state: Dict[str, int] = {}
        by_disposition: Dict[str, int] = {}
        refunded = 0
        for r in self.rmas.values():
            by_reason[r.reason.value] = by_reason.get(r.reason.value, 0) + 1
            by_state[r.state.value] = by_state.get(r.state.value, 0) + 1
            if r.disposition:
                by_disposition[r.disposition.value] = by_disposition.get(r.disposition.value, 0) + 1
            refunded += r.refund_cents
        total = len(self.rmas)
        return {
            "total": total,
            "by_reason": by_reason, "by_state": by_state, "by_disposition": by_disposition,
            "total_refunded_cents": refunded,
            "defect_rate": round(by_reason.get("defective", 0) / total, 4) if total else 0.0,
            # feed to 自学习: which SKUs fail most
            "defect_hotspots": self._hotspots(),
        }

    def _hotspots(self) -> List[Dict[str, Any]]:
        agg: Dict[str, Dict[str, int]] = {}
        for r in self.rmas.values():
            if r.reason in (ReturnReason.DEFECTIVE, ReturnReason.DAMAGED_IN_TRANSIT):
                a = agg.setdefault(r.line_sku, {"count": 0, "units": 0})
                a["count"] += 1
                a["units"] += r.quantity
        return [{"sku": k, **v} for k, v in sorted(agg.items(), key=lambda x: -x[1]["count"])]


rma_service = RMAService()


def create_rma_router():
    from fastapi import APIRouter, HTTPException, Body
    from pydantic import BaseModel
    router = APIRouter(prefix="/api/rma", tags=["RMA & Warranty / 售后"])

    class WtyReq(BaseModel):
        serial_number: str
        sku: str
        customer_id: str
        purchase_date: str
        warranty_type: str = "legal"
        extra_months: int = 0

    class RMAReq(BaseModel):
        order_id: str
        customer_id: str
        sku: str
        quantity: int = 1
        reason: str
        description: str = ""
        order_date: Optional[str] = None
        precedent: str = "eu_14_day"

    class InspectReq(BaseModel):
        disposition: str
        refund_cents: int = 0
        resolution: str = "refund"
        notes: str = ""

    @router.post("/warranty")
    async def register_warranty(req: WtyReq):
        w = rma_service.register_warranty(req.serial_number, req.sku, req.customer_id,
                                          req.purchase_date, req.warranty_type, req.extra_months)
        return {"success": True, "warranty": asdict(w)}

    @router.get("/warranty/{serial}")
    async def check_warranty(serial: str):
        return rma_service.check_warranty(serial)

    @router.post("/")
    async def create_rma(req: RMAReq):
        try:
            reason = ReturnReason(req.reason)
        except ValueError:
            raise HTTPException(400, f"invalid reason. valid: {[r.value for r in ReturnReason]}")
        free = (rma_service.can_return_without_reason(req.order_date)
                if req.order_date else True)
        r = rma_service.create_rma(req.order_id, req.customer_id, req.sku, req.quantity,
                                   reason, req.description, req.order_date, req.precedent)
        return {"success": True, "rma": asdict(r), "free_return_window": free}

    @router.get("/")
    async def list_rmas():
        return {"rmas": [asdict(r) for r in rma_service.rmas.values()]}

    @router.get("/{rma_id}")
    async def get_rma(rma_id: str):
        r = rma_service.rmas.get(rma_id)
        if not r:
            raise HTTPException(404, "rma not found")
        return {"rma": asdict(r)}

    @router.post("/{rma_id}/approve")
    async def approve(rma_id: str, restocking_fee_cents: int = Body(0, embed=True)):
        if not rma_service.approve(rma_id, restocking_fee_cents):
            raise HTTPException(409, "cannot approve from current state")
        return {"success": True}

    @router.post("/{rma_id}/reject")
    async def reject(rma_id: str, why: str = Body(..., embed=True)):
        if not rma_service.reject(rma_id, why):
            raise HTTPException(409, "cannot reject from current state")
        return {"success": True}

    @router.post("/{rma_id}/ship")
    async def ship(rma_id: str, tracking: str = Body(..., embed=True)):
        if not rma_service.ship(rma_id, tracking):
            raise HTTPException(409, "cannot ship from current state")
        return {"success": True}

    @router.post("/{rma_id}/receive")
    async def receive(rma_id: str):
        if not rma_service.receive(rma_id):
            raise HTTPException(409, "cannot receive from current state")
        return {"success": True}

    @router.post("/{rma_id}/inspect")
    async def inspect(rma_id: str, req: InspectReq):
        try:
            d = Disposition(req.disposition)
        except ValueError:
            raise HTTPException(400, f"invalid disposition. valid: {[x.value for x in Disposition]}")
        if not rma_service.inspect(rma_id, d, req.refund_cents, req.resolution, req.notes):
            raise HTTPException(409, "cannot inspect from current state")
        return {"success": True}

    @router.post("/{rma_id}/resolve")
    async def resolve(rma_id: str):
        if not rma_service.resolve(rma_id):
            raise HTTPException(409, "cannot resolve from current state")
        return {"success": True}

    @router.get("/analytics/summary")
    async def analytics():
        return rma_service.analytics()

    return router


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    w = rma_service.register_warranty("SN1", "RB-2026-A1", "cust1", "2026-01-01")
    print("warranty active:", w.is_active())
    r = rma_service.create_rma("ord1", "cust1", "RB-2026-A1", 1,
                               ReturnReason.DEFECTIVE, "screen flicker", "2026-10-01")
    print("free return window:", rma_service.can_return_without_reason("2026-10-01"))
    rma_service.approve(r.rma_id)
    rma_service.ship(r.rma_id, "DHL123")
    rma_service.receive(r.rma_id)
    rma_service.inspect(r.rma_id, Disposition.REPLACE_UNIT if False else Disposition.RESTOCK,
                        24900, "refund")
    rma_service.resolve(r.rma_id)
    print(json.dumps(rma_service.analytics(), indent=2))