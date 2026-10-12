#!/usr/bin/env python3
"""In-memory caching layer with Redis-ready interface."""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable
import threading
import time
import logging
from collections import OrderedDict

logger = logging.getLogger("cache")

class MemoryCache:
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self._store: Dict[str, Any] = {}
        self._ttl: Dict[str, float] = {}
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.Lock()
        self._stats = {"hits": 0, "misses": 0, "sets": 0, "evictions": 0}
        self._access_order: OrderedDict = OrderedDict()

    def get(self, key: str, default=None) -> Any:
        with self._lock:
            now = time.time()
            if key in self._store:
                if now < self._ttl.get(key, now):
                    self._stats["hits"] += 1
                    self._access_order.move_to_end(key)
                    return self._store[key]
                else:
                    self._evict(key)
            self._stats["misses"] += 1
            return default

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        with self._lock:
            if len(self._store) >= self._max_size and key not in self._store:
                self._evict_lru()
            self._store[key] = value
            self._ttl[key] = time.time() + (ttl if ttl is not None else self._default_ttl)
            self._access_order[key] = True
            self._stats["sets"] += 1

    def delete(self, key: str):
        with self._lock:
            self._evict(key)

    def clear(self):
        with self._lock:
            self._store.clear()
            self._ttl.clear()
            self._access_order.clear()

    def exists(self, key: str) -> bool:
        return self.get(key, self) is not self

    def get_or_set(self, key: str, factory: Callable, ttl: Optional[int] = None) -> Any:
        existing = self.get(key)
        if existing is not None:
            return existing
        value = factory()
        self.set(key, value, ttl)
        return value

    def stats(self) -> Dict:
        hit_rate = self._stats["hits"] / max(1, self._stats["hits"] + self._stats["misses"])
        return {
            **self._stats,
            "size": len(self._store),
            "max_size": self._max_size,
            "hit_rate": round(hit_rate, 3),
        }

    def _evict(self, key: str):
        self._store.pop(key, None)
        self._ttl.pop(key, None)
        self._access_order.pop(key, None)

    def _evict_lru(self):
        if self._access_order:
            oldest = next(iter(self._access_order))
            self._evict(oldest)
            self._stats["evictions"] += 1

cache = MemoryCache()
redis_cache = None

def get_redis_cache():
    global redis_cache
    if redis_cache is None:
        try:
            import redis as _redis
            from children_config import settings
            redis_cache = _redis.Redis(
                host=settings.get("redis_host", "localhost"),
                port=settings.get("redis_port", 6379),
                password=settings.get("redis_password", None),
                decode_responses=True,
                socket_connect_timeout=2,
            )
            redis_cache.ping()
            logger.info("Redis connected")
        except Exception:
            logger.info("Redis unavailable, using memory cache")
            redis_cache = None
    return redis_cache
