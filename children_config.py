#!/usr/bin/env python3
"""Centralized configuration management for all children_* modules."""

import os
from pathlib import Path
from typing import Dict, Any, Optional

_PROJECT_ROOT = Path(__file__).parent

class Settings:
    def __init__(self):
        self._values: Dict[str, Any] = {}
        self._load_from_env()
        self._set_defaults()

    def _load_from_env(self):
        for key, val in os.environ.items():
            if key.startswith("ROBOT_"):
                self._values[key[6:].lower()] = val

    def _set_defaults(self):
        defaults = {
            "port": int(os.getenv("PORT", "8888")),
            "host": os.getenv("HOST", "0.0.0.0"),
            "log_level": os.getenv("LOG_LEVEL", "INFO"),
            "db_path": str(_PROJECT_ROOT / "data"),
            "sqlite_path": str(_PROJECT_ROOT / "data" / "system.db"),
            "console_frontend_dir": str(_PROJECT_ROOT / "project_source" / "management_center" / "frontend" / "dist"),
            "static_dir": str(_PROJECT_ROOT / "project_source" / "static"),
            "cache_ttl_seconds": int(os.getenv("CACHE_TTL", "900")),
            "rate_limit_per_minute": int(os.getenv("RATE_LIMIT", "120")),
            "max_ws_connections": int(os.getenv("MAX_WS_CONNECTIONS", "1000")),
            "max_devices": int(os.getenv("MAX_DEVICES", "50")),
            "telemetry_interval_seconds": int(os.getenv("TELEMETRY_INTERVAL", "5")),
            "sync_interval_minutes": int(os.getenv("SYNC_INTERVAL", "15")),
            "enable_telemetry": os.getenv("ENABLE_TELEMETRY", "true").lower() == "true",
            "enable_auth": os.getenv("ENABLE_AUTH", "false").lower() == "true",
            "stage": os.getenv("ROBOT_STAGE", "development"),
        }
        for k, v in defaults.items():
            if k not in self._values:
                self._values[k] = v

    def get(self, key: str, default=None) -> Any:
        return self._values.get(key, default)

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_"):
            raise AttributeError(name)
        return self._values.get(name, None)

    def reload(self):
        self._values.clear()
        self._load_from_env()
        self._set_defaults()

    def to_dict(self) -> Dict[str, Any]:
        return dict(self._values)

settings = Settings()
