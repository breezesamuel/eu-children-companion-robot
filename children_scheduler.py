#!/usr/bin/env python3
"""Background task scheduler for periodic cleanup, backups, and report generation."""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Callable, Any
from collections import defaultdict

logger = logging.getLogger("scheduler")

class TaskScheduler:
    def __init__(self):
        self._tasks: Dict[str, Dict] = {}
        self._running = False
        self._loop = None

    def register(self, name: str, func: Callable, interval_seconds: int,
                 description: str = "") -> str:
        self._tasks[name] = {
            "func": func,
            "interval": interval_seconds,
            "description": description,
            "last_run": None,
            "last_duration": None,
            "total_runs": 0,
            "total_errors": 0,
            "enabled": True,
        }
        return name

    def unregister(self, name: str):
        self._tasks.pop(name, None)

    async def _run_task(self, name: str, config: Dict):
        start = time.perf_counter()
        try:
            result = config["func"]()
            if asyncio.iscoroutine(result):
                result = await result
            config["last_duration"] = (time.perf_counter() - start) * 1000
            config["total_runs"] += 1
            config["last_run"] = datetime.now().isoformat()
            logger.info(f"Task '{name}' completed in {config['last_duration']:.0f}ms")
        except Exception as e:
            config["total_errors"] += 1
            logger.error(f"Task '{name}' failed: {e}")

    async def start(self):
        if self._running:
            return
        self._running = True
        self._loop = asyncio.get_event_loop()
        logger.info(f"Scheduler started with {len(self._tasks)} tasks")

        while self._running:
            now = time.time()
            for name, config in list(self._tasks.items()):
                if not config.get("enabled", True):
                    continue
                last = config.get("_last_check", 0)
                if now - last >= config["interval"]:
                    config["_last_check"] = now
                    asyncio.create_task(self._run_task(name, config))
            await asyncio.sleep(1)

    def stop(self):
        self._running = False
        logger.info("Scheduler stopped")

    def status(self) -> List[Dict]:
        return [
            {
                "name": name,
                "description": cfg.get("description", ""),
                "interval_seconds": cfg["interval"],
                "enabled": cfg.get("enabled", True),
                "last_run": cfg.get("last_run"),
                "last_duration_ms": cfg.get("last_duration"),
                "total_runs": cfg.get("total_runs", 0),
                "total_errors": cfg.get("total_errors", 0),
            }
            for name, cfg in self._tasks.items()
        ]

    def set_enabled(self, name: str, enabled: bool) -> bool:
        if name in self._tasks:
            self._tasks[name]["enabled"] = enabled
            return True
        return False

    def run_once(self, name: str):
        config = self._tasks.get(name)
        if config:
            asyncio.create_task(self._run_task(name, config))

# Predefined tasks
scheduler = TaskScheduler()

def _cleanup_old_data():
    from children_persistence import cleanup_backups
    cleanup_backups(max_per_file=10)
    return {"cleaned": True}

def _backup_database():
    from children_persistence import save_json, load_json, DATA_DIR
    from datetime import datetime
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    for fn in ["sync.json", "conversations.json", "emotional_history.json"]:
        data = load_json(fn)
        if data:
            save_json(f"backup_{ts}_{fn}", data, backup=False)
    return {"backup": ts}

def _generate_daily_report():
    from children_database import database
    stats = database.get_stats()
    return {"stats": stats, "generated_at": datetime.now().isoformat()}

# Register default tasks
scheduler.register("cleanup_backups", _cleanup_old_data, 86400, "Remove old backups (daily)")
scheduler.register("backup_database", _backup_database, 43200, "Backup JSON data (12h)")
scheduler.register("daily_report", _generate_daily_report, 86400, "Generate daily stats report (daily)")
