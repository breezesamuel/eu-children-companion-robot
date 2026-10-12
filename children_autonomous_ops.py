#!/usr/bin/env python3
"""Hidden autonomous-ops backend.

Exposes the 11 phase autonomous loop over HTTP, but only when explicitly enabled
and only to callers holding the internal key.  This router is deliberately
``include_in_schema=False`` so it never shows up in ``/openapi.json`` or the
interactive docs -- the frontend must never see it.

Activation (both required):
    ENABLE_HIDDEN_API=true
    AUTONOMOUS_INTERNAL_KEY=<256-bit random string>

Auth: every request must carry ``X-Internal-Key: <the key>``.  Comparison is
constant time.  When the key is unset the router is not mounted at all.

Environment:
    HUNTER_ONLINE=1        let phase 1 hit the GitHub API (default: offline)
    AUTONOMOUS_AUTOSTART=1  also start the 24/7 background loop on startup
    AUTONOMOUS_INTERVAL    loop interval seconds (default 300)
    AUTONOMOUS_STATE_BACKEND  memory|file|redis (default memory) -- durable
                                  loop state survives restarts (see
                                  scripts/state_store.py + docker-compose.yml)
    REDIS_URL              connection URL for the redis backend (e.g.
                                  redis://redis:6379/0 inside docker-compose)
"""
from __future__ import annotations

import asyncio
import logging
import os
import secrets
import sys
from typing import Any, Dict, Optional

logger = logging.getLogger("autonomous_ops.api")

_ROOT = os.path.dirname(os.path.abspath(__file__))
_SCRIPTS = os.path.join(_ROOT, "scripts")
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)

_ops = None                       # lazy singleton
_background_task: Optional[asyncio.Task] = None


def hidden_api_enabled() -> bool:
    return os.environ.get("ENABLE_HIDDEN_API", "").lower() in ("1", "true", "yes", "on")


def internal_key() -> str:
    return os.environ.get("AUTONOMOUS_INTERNAL_KEY", "")


def get_ops():
    """Lazy singleton around the real orchestrator."""
    global _ops
    if _ops is None:
        from autonomous_ops import AutonomousOps  # noqa: E402
        _ops = AutonomousOps(
            hunter_offline=os.environ.get("HUNTER_ONLINE", "") != "1")
    return _ops


def create_autonomous_ops_router():
    from fastapi import APIRouter, Header, HTTPException

    # include_in_schema=False -> invisible to /openapi.json and /docs
    router = APIRouter(prefix="/api/autonomous", tags=["_internal"],
                       include_in_schema=False)

    def _auth(x_internal_key: Optional[str]):
        expected = internal_key()
        if not expected:
            # not configured -> pretend the endpoint does not exist
            raise HTTPException(status_code=404, detail="Not Found")
        if not x_internal_key or not secrets.compare_digest(x_internal_key, expected):
            raise HTTPException(status_code=401, detail="unauthorized")

    @router.get("/status")
    async def status(x_internal_key: Optional[str] = Header(default=None,
                                                            alias="X-Internal-Key")):
        _auth(x_internal_key)
        ops = get_ops()
        last = ops.last_report
        return {
            "status": "ok",
            "cycles": ops.cycle_count,
            "hunter_mode": "offline" if ops.hunter_offline else "github_api",
            "persistence": {"backend": ops.store.backend},
            "last_cycle": None if not last else {
                "cycle": last["cycle"],
                "ok": last["ok"],
                "duration_ms": last["duration_ms"],
                "phases": {k: v["status"] for k, v in last["phases"].items()},
            },
        }

    @router.post("/cycle")
    async def run_cycle(x_internal_key: Optional[str] = Header(default=None,
                                                               alias="X-Internal-Key")):
        _auth(x_internal_key)
        rep = get_ops().run_cycle()
        return rep

    return router


def mount_autonomous_ops(app) -> bool:
    """Mount the hidden router if enabled. Returns True when mounted."""
    if not hidden_api_enabled():
        return False
    if not internal_key():
        logger.warning("ENABLE_HIDDEN_API set but AUTONOMOUS_INTERNAL_KEY missing; "
                       "hidden autonomous API NOT mounted")
        return False
    app.include_router(create_autonomous_ops_router())
    logger.info("hidden autonomous-ops API mounted at /api/autonomous (not in OpenAPI)")
    return True


async def start_background_loop() -> bool:
    """Start the 24/7 loop as a background asyncio task (idempotent)."""
    global _background_task
    if os.environ.get("AUTONOMOUS_AUTOSTART", "").lower() not in ("1", "true", "yes", "on"):
        return False
    if _background_task and not _background_task.done():
        return False
    interval = int(os.environ.get("AUTONOMOUS_INTERVAL", "300"))
    ops = get_ops()

    async def _loop():
        while True:
            try:
                await asyncio.to_thread(ops.run_cycle)
            except Exception as e:  # never let the loop die
                logger.error("autonomous cycle failed: %s", e)
            await asyncio.sleep(interval)

    _background_task = asyncio.create_task(_loop())
    logger.info("autonomous background loop started (interval=%ss)", interval)
    return True


async def stop_background_loop():
    global _background_task
    if _background_task and not _background_task.done():
        _background_task.cancel()
        try:
            await _background_task
        except asyncio.CancelledError:
            pass
    _background_task = None


__all__ = [
    "create_autonomous_ops_router", "mount_autonomous_ops",
    "start_background_loop", "stop_background_loop",
    "hidden_api_enabled", "internal_key", "get_ops",
]
