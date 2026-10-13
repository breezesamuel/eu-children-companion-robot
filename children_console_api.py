#!/usr/bin/env python3
"""Operator-console API (public, read-only aliases over the real services).

The React management console (``project_source/management_center/frontend``) is
the internal operator UI served at ``/console``.  Several of its dashboard pages
were written against endpoint names that never matched the canonical service
routers, so those pages issued requests that 404'd and rendered *empty*.

This module exposes thin aliases / aggregations that map the console's expected
paths onto the SAME live service data that already powers the canonical routers.
Nothing new is stored and nothing is synthesised: every value comes from the
running modules (RMA service, payment gateway, content officer, compliance
modules, the autonomous-ops loop).  When a module legitimately holds no records
the endpoint returns an honest empty/zero result.

Design notes
------------
* The router is mounted *before* the commerce routers so its static paths
  (``/api/rma/stats``, ``/api/rma/list``) win over the RMA router's catch-all
  ``GET /api/rma/{rma_id}``.
* Only one endpoint mutates anything (``POST /api/content/action``) and it just
  forwards to the existing content-officer review workflow.
* The loop status/history endpoints read the in-process autonomous-ops singleton
  (``children_autonomous_ops.get_ops``) - no internal key, no trigger surface.
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

# Review actions the console's 内容官 page can trigger.
_CONTENT_ACTIONS = {"submit", "approve", "reject", "publish"}


def _loop_history(ops, limit: int = 60) -> List[Dict[str, Any]]:
    """Best-effort read of the loop's cycle ring across every store backend."""
    store = getattr(ops, "store", None)
    if store is not None:
        try:
            hist = store.get("cycle_history")
        except Exception:
            hist = None
        if isinstance(hist, list):
            return hist[:limit]
        directory = getattr(store, "dir", None)
        if directory:
            path = os.path.join(directory, "cycle_history.jsonl")
            if os.path.isfile(path):
                rows: List[Dict[str, Any]] = []
                try:
                    with open(path, encoding="utf-8") as fh:
                        for line in fh:
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                rows.append(json.loads(line))
                            except ValueError:
                                continue
                except OSError:
                    rows = []
                rows.reverse()
                if rows:
                    return rows[:limit]
    last = getattr(ops, "last_report", None)
    if last:
        return [{
            "cycle": last.get("cycle"),
            "ok": last.get("ok"),
            "duration_ms": last.get("duration_ms"),
            "at": last.get("finished_at"),
            "phases": {k: {"status": v.get("status"),
                           "duration_ms": v.get("duration_ms")}
                       for k, v in (last.get("phases") or {}).items()},
        }]
    return []


def create_console_api_router():
    """Build the FastAPI router with the console's real-data aliases."""
    from fastapi import APIRouter, Body, HTTPException, Query

    router = APIRouter(tags=["console (operator UI, real data)"])

    # ── autonomous loop (public read-only view of the in-process loop) ───────
    @router.get("/api/console/loop/status")
    async def console_loop_status():
        from children_autonomous_ops import get_ops
        ops = get_ops()
        last = ops.last_report
        phases: Dict[str, Any] = {}
        ok = False
        cycle = None
        duration_ms = None
        finished_at = None
        if last:
            ok = bool(last.get("ok"))
            cycle = last.get("cycle")
            duration_ms = last.get("duration_ms")
            finished_at = last.get("finished_at")
            phases = {k: {"status": v.get("status"),
                          "duration_ms": v.get("duration_ms"),
                          "error": v.get("error")}
                      for k, v in (last.get("phases") or {}).items()}
        return {
            "status": "ok",
            "ok": ok,
            "cycle": cycle,
            "cycles": getattr(ops, "cycle_count", 0),
            "duration_ms": duration_ms,
            "finished_at": finished_at,
            "phases": phases,
            "persistence": {"backend": getattr(ops.store, "backend", "memory")},
        }

    @router.get("/api/console/loop/history")
    async def console_loop_history(limit: int = Query(60, ge=1, le=200)):
        from children_autonomous_ops import get_ops
        rows = _loop_history(get_ops(), limit)
        for row in rows:                       # normalise timestamp for the UI
            row.setdefault("finished_at", row.get("at"))
        return {"history": rows, "count": len(rows)}

    # ── RMA (售后) ───────────────────────────────────────────────────────────
    @router.get("/api/rma/list")
    async def rma_list():
        from dataclasses import asdict
        from children_rma import rma_service
        rows = []
        for r in rma_service.rmas.values():
            d = asdict(r)
            rows.append({
                "rma_id": d.get("rma_id"),
                "order_id": d.get("order_id"),
                "sku": d.get("line_sku"),
                "quantity": d.get("quantity"),
                "reason": (r.reason.value if hasattr(r.reason, "value") else r.reason),
                "status": (r.state.value if hasattr(r.state, "value") else r.state),
                "refund_cents": d.get("refund_cents", 0),
                "created_at": d.get("created_at"),
            })
        return {"rmas": rows}

    @router.get("/api/rma/stats")
    async def rma_stats():
        from children_rma import rma_service
        an = rma_service.analytics()
        by_state: Dict[str, int] = an.get("by_state", {})
        pending = sum(by_state.get(s, 0) for s in (
            "requested", "approved", "in_transit", "received", "inspected"))
        resolved = by_state.get("resolved", 0) + by_state.get("closed", 0)

        # average open->resolved age, computed only from records that carry both
        # timestamps (never invented).
        ages: List[float] = []
        from datetime import datetime
        for r in rma_service.rmas.values():
            if (r.state.value if hasattr(r.state, "value") else r.state) in ("resolved", "closed"):
                try:
                    a = datetime.fromisoformat(str(r.created_at))
                    b = datetime.fromisoformat(str(r.updated_at))
                    ages.append((b - a).total_seconds() / 86400.0)
                except Exception:
                    pass
        avg = round(sum(ages) / len(ages), 2) if ages else 0.0
        return {
            "total_rmas": an.get("total", 0),
            "pending_count": pending,
            "resolved_count": resolved,
            "total_refunded_cents": an.get("total_refunded_cents", 0),
            "avg_cycle_days": avg,
            "by_status": by_state,
            "by_reason": an.get("by_reason", {}),
            "defect_rate": an.get("defect_rate", 0.0),
        }

    # ── payments ─────────────────────────────────────────────────────────────
    @router.get("/api/payments/list")
    async def payments_list(order_id: Optional[str] = None):
        from children_payment import payment_gateway
        return {"payments": payment_gateway.list_payments(order_id)}

    # ── content officer (内容官) ─────────────────────────────────────────────
    @router.get("/api/content/drafts")
    async def content_drafts():
        from dataclasses import asdict
        from children_content_officer import content_officer
        rows = []
        for d in content_officer.drafts.values():
            rec = asdict(d)
            rec["lang"] = rec.get("language")
            rows.append(rec)
        return {"drafts": rows}

    @router.get("/api/content/stats")
    async def content_stats():
        from children_content_officer import content_officer
        s = content_officer.stats()
        bs = s.get("by_status", {})
        return {"stats": {
            "total_drafts": s.get("drafts", 0),
            "submitted": bs.get("in_review", 0) + bs.get("submitted", 0),
            "approved": bs.get("approved", 0),
            "published": bs.get("published", 0),
            "rejected": bs.get("rejected", 0),
            "languages_covered": len(s.get("by_language", {})),
            "by_status": bs,
            "by_language": s.get("by_language", {}),
        }}

    @router.post("/api/content/action")
    async def content_action(payload: Dict[str, Any] = Body(...)):
        from children_content_officer import content_officer
        draft_id = str(payload.get("draft_id") or "")
        action = str(payload.get("action") or "").lower()
        if action not in _CONTENT_ACTIONS:
            raise HTTPException(400, f"unknown action; valid: {sorted(_CONTENT_ACTIONS)}")
        if action == "submit":
            ok = content_officer.submit(draft_id)
        elif action == "approve":
            ok = content_officer.approve(draft_id, "console", "")
        elif action == "reject":
            ok = content_officer.reject(draft_id, "console", str(payload.get("note") or ""))
        else:
            res = content_officer.publish(draft_id)
            ok = bool(res.get("success")) if isinstance(res, dict) else bool(res)
        if not ok:
            raise HTTPException(409, "action not allowed from current state")
        return {"success": True}

    # ── compliance (real control activation + live counters) ─────────────────
    @router.get("/api/compliance/coppa")
    async def compliance_coppa():
        try:
            import children_coppa as coppa
            consents = list(getattr(coppa, "_CONSENT_RECORDS", {}).values())
            vpcs = list(getattr(coppa, "_VPC_REQUESTS", {}).values())
            verified = [c for c in consents if getattr(c, "verified", True)]
            children = {getattr(c, "child_user_id", None) for c in consents}
            children.discard(None)
            verified_children = {getattr(c, "child_user_id", None) for c in verified}
            verified_children.discard(None)
            rate = (round(len(verified_children) / len(children) * 100, 1)
                    if children else 0.0)
            return {
                "status": "enabled",
                "assessment": "control_active",
                "verification_method": "verifiable_parental_consent",
                "verification_provider": "internal VPC (email + delay / card)",
                "verified_children": len(verified_children),
                "consent_records": len(consents),
                "vpc_requests": len(vpcs),
                "parental_consent_rate": rate,
                "data_minimization": "collect-on-consent, 3y post-deletion retention",
                "retention_years": getattr(coppa, "CONSENT_RECORD_RETENTION_YEARS", 3),
                "note": "activation state of the COPPA control in this build",
            }
        except Exception as exc:  # pragma: no cover - defensive
            return {"status": "not_configured", "error": str(exc)}

    @router.get("/api/compliance/gdpr")
    async def compliance_gdpr():
        try:
            from children_gdpr_sharing import list_processing_records
            records = list_processing_records()
            return {
                "status": "enabled",
                "assessment": "control_active",
                "retention_days": int(os.environ.get("DATA_RETENTION_DAYS", "1095")),
                "dpia_done": os.environ.get("DPIA_DONE", "").lower() in ("1", "true", "yes"),
                "dpo_name": os.environ.get("DPO_NAME") or None,
                "international_transfer": os.environ.get("INTL_TRANSFER") or "none",
                "processing_records": len(records),
                "requests_handled": int(os.environ.get("DSR_HANDLED", "0")),
                "privacy_policy_url": os.environ.get("PRIVACY_POLICY_URL") or None,
                "breaches": int(os.environ.get("GDPR_BREACHES", "0")),
                "note": "activation state of the GDPR controls in this build",
            }
        except Exception as exc:  # pragma: no cover - defensive
            return {"status": "not_configured", "error": str(exc)}

    @router.get("/api/compliance/dsa")
    async def compliance_dsa(period_days: int = Query(90, ge=1, le=365)):
        try:
            from dataclasses import asdict
            import children_dsa as dsa
            rep = dsa.generate_transparency_report(period_days)
            out = asdict(rep) if hasattr(rep, "__dataclass_fields__") else dict(rep)
            out.setdefault("status", "enabled")
            out.setdefault("assessment", "control_active")
            return out
        except Exception as exc:  # pragma: no cover - defensive
            return {"status": "not_configured", "error": str(exc)}

    # ── v1 reports (real aggregates surfaced to the Reports page) ────────────
    @router.get("/api/v1/analytics/subjects")
    async def analytics_subjects():
        from children_data_loop import data_loop
        try:
            roll = data_loop.rollup(30)
            funnel = data_loop.funnel()
        except Exception:
            roll, funnel = {}, {}
        return {"success": True, "rollup": roll, "funnel": funnel, "source": "data_loop"}

    @router.get("/api/v1/learning/records")
    async def learning_records(limit: int = Query(200, ge=1, le=2000)):
        from children_data_loop import data_loop
        try:
            events = data_loop.recent("learning.session", limit)
        except Exception:
            events = []
        return {"success": True, "records": events, "count": len(events),
                "source": "data_loop"}

    return router


__all__ = ["create_console_api_router"]
