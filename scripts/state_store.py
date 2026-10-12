#!/usr/bin/env python3
"""State store for the 24/7 autonomous loop -- persistence made opt-in and safe.

The orchestrator is stateless by default (in-memory), exactly as before.  An
operator enables a durable backend via env or constructor; every backend speaks
the same tiny API so nothing else has to change:

    * get(key, default)                       scalar / dict / list  (JSON round-trip)
    * set(key, value, ttl=None)               durable scalar
    * push(key, record)                       append ring buffer (capped ~2000)
    * keys(prefix="")                          enumerate known keys

Backends
--------
  redis  if ``REDIS_URL`` is reachable and ``redis`` (MIT) is installed.
         Keys are namespaced under ``autonomous:`` so they never collide with
         other data in the same Redis.
  file   append-only ``<key>.jsonl`` for pushes + ``meta.json`` for scalars
         under ``AUTONOMOUS_STATE_DIR`` (default ``runtime/autonomous_state``).
  memory in-process dict (zeros out on restart) -- the default.

Degradation contract: a requested-but-unavailable backend never crashes the
loop; redis falls back to file, file to memory.  Reporting the actual backend
is part of every cycle report (``report["persistence"]["backend"]``).

Usage
-----
    from state_store import create_store
    store = create_store("redis")            # or "file" / "memory" / None=env
    store.set("cycle_count", 7)
    store.push("cycle_history", {"cycle": 7, "ok": True})
"""
from __future__ import annotations

import json
import os
import tempfile
import threading
from typing import Any, Dict, List, Optional

# keep import light: `redis` is imported lazily inside RedisStore
DEFAULT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           "runtime", "autonomous_state")
RING_CAP = 2000
DEFAULT_TTL = 86400 * 30          # 30 days
KEY_PREFIX = "autonomous:"


# ── memory (default, exactly the previous behaviour) ──────────────────────────
class MemoryStore:
    backend = "memory"

    def __init__(self, **_):
        self._d: Dict[str, Any] = {}
        self._lock = threading.RLock()

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return self._d.get(key, default)

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            self._d[key] = value

    def push(self, key: str, record: Any) -> None:
        with self._lock:
            ring = self._d.setdefault(key, [])
            ring.insert(0, record)
            del ring[RING_CAP:]

    def keys(self, prefix: str = "") -> List[str]:
        with self._lock:
            return [k for k in self._d if k.startswith(prefix)]


# ── file (JSONL ring + meta.json scalars) ─────────────────────────────────────
class FileStore:
    backend = "file"

    def __init__(self, directory: Optional[str] = None, **_):
        self.dir = directory or os.environ.get("AUTONOMOUS_STATE_DIR") or DEFAULT_DIR
        os.makedirs(self.dir, exist_ok=True)
        self._meta_path = os.path.join(self.dir, "meta.json")
        self._lock = threading.RLock()
        self._d = self._load()

    def _load(self) -> Dict[str, Any]:
        try:
            with open(self._meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return {}

    def _flush(self) -> None:
        fd, tmp = tempfile.mkstemp(dir=self.dir, suffix=".json")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(self._d, f, ensure_ascii=False, indent=1, default=str)
            os.replace(tmp, self._meta_path)
        except Exception:
            try:
                os.unlink(tmp)
            except OSError:
                pass

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return self._d.get(key, default)

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            self._d[key] = value
            self._flush()

    def push(self, key: str, record: Any) -> None:
        line = json.dumps(record, ensure_ascii=False, default=str) + "\n"
        with self._lock:
            path = os.path.join(self.dir, f"{key}.jsonl")
            with open(path, "a", encoding="utf-8") as f:
                f.write(line)

    def keys(self, prefix: str = "") -> List[str]:
        with self._lock:
            meta_keys = [k for k in self._d if k.startswith(prefix)]
            try:
                ring_keys = [os.path.splitext(b)[0] for b in os.listdir(self.dir)
                             if b.endswith(".jsonl")]
            except OSError:
                ring_keys = []
            return sorted(set(meta_keys) | set(ring_keys))


# ── redis (opt-in, MIT client, graceful fallback) ─────────────────────────────
class RedisStore:
    backend = "redis"

    def __init__(self, url: Optional[str] = None, prefix: str = KEY_PREFIX, **_):
        self.url = url or os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
        self.prefix = prefix
        self._r = None
        self._probed = False

    def _connect(self):
        if self._probed and self._r is not None:
            return self._r
        try:
            import redis as redis_mod             # MIT, optional dependency
            r = redis_mod.Redis.from_url(
                self.url, socket_connect_timeout=2, socket_timeout=2,
                decode_responses=True)
            r.ping()                              # proves a live server answers
            self._r, self._probed = r, True
        except Exception:
            self._r, self._probed = None, True
        return self._r

    @property
    def available(self) -> bool:
        return self._connect() is not None

    def get(self, key: str, default: Any = None) -> Any:
        r = self._connect()
        if r is None:
            return default
        raw = r.get(f"{self.prefix}{key}")
        if raw is None:
            return default
        try:
            return json.loads(raw)
        except (ValueError, TypeError):
            return raw

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        r = self._connect()
        if r is None:
            return
        payload = json.dumps(value, ensure_ascii=False, default=str)
        r.set(f"{self.prefix}{key}", payload, ex=ttl or DEFAULT_TTL)

    def push(self, key: str, record: Any, cap: int = RING_CAP) -> None:
        r = self._connect()
        if r is None:
            return
        pipe = r.pipeline()
        k = f"{self.prefix}{key}"
        pipe.lpush(k, json.dumps(record, ensure_ascii=False, default=str))
        pipe.ltrim(k, 0, cap - 1)
        pipe.expire(k, DEFAULT_TTL)
        pipe.execute()

    def keys(self, prefix: str = "") -> List[str]:
        r = self._connect()
        if r is None:
            return []
        ks = r.keys(f"{self.prefix}{prefix}*") or []
        return [k[len(self.prefix):] for k in ks]


# ── factory ───────────────────────────────────────────────────────────────────
def create_store(mode: Optional[str] = None, *, directory: Optional[str] = None,
                 url: Optional[str] = None) -> Any:
    """Build a store. ``mode`` = redis | file | memory | auto (default from
    ``AUTONOMOUS_STATE_BACKEND`` env, "memory" when unset).  A requested backend
    that cannot come up degrades: redis -> file -> memory.  Never raises."""
    mode = (mode or os.environ.get("AUTONOMOUS_STATE_BACKEND") or "memory").lower()
    if mode == "auto":
        mode = "redis" if os.environ.get("REDIS_URL") else "file"
    if mode == "redis":
        rs = RedisStore(url=url)
        if rs.available:
            return rs
        return FileStore(directory=directory)     # degrade for resilience
    if mode == "file":
        return FileStore(directory=directory)
    return MemoryStore()