"""Tests for the autonomous-loop state store (scripts/state_store.py) and its
integration into the orchestrator (AutonomousOps persistence).

Covers: the three backends (memory / file / redis-without-server), the
degradation contract (unreachable redis -> file), durability across store
instances, and cycle-number resume across restarts.
"""
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir, "scripts"))
os.chdir(os.path.join(os.path.dirname(__file__), os.pardir))

import logging
logging.disable(logging.CRITICAL)

from state_store import MemoryStore, FileStore, RedisStore, create_store  # noqa: E402
from autonomous_ops import AutonomousOps                                # noqa: E402

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond)))
    print(f"[{'OK' if cond else 'XX'}] {name} {detail if not cond else ''}")


# ── memory backend ────────────────────────────────────────────────────────────
m = MemoryStore()
check("memory.backend_label", m.backend == "memory")
m.set("cycle_count", 3)
check("memory.get_roundtrip", m.get("cycle_count") == 3)
check("memory.get_default", m.get("nope", -1) == -1)
m.push("ring", {"cycle": 0})
m.push("ring", {"cycle": 1})
m.push("ring", {"cycle": 2})
check("memory.push_newest_first", m.get("ring")[0]["cycle"] == 2)
check("memory.keys", set(["cycle_count", "ring"]) <= set(m.keys()))
big = MemoryStore()
for i in range(RING_OVER := 2005):
    big.push("h", {"i": i})
check("memory.ring_capped", len(big.get("h")) == 2000)
check("memory.ring_newest_kept", big.get("h")[0]["i"] == 2004)

# ── file backend: durability across instances ─────────────────────────────────
tmpdir = tempfile.mkdtemp(prefix="sop_state_")
# Keep any *ambient* default state dir out of this run: the live server and the
# local ops loop persist cycle counts under AUTONOMOUS_STATE_DIR, which would
# otherwise leak into the resume checks below.
os.environ["AUTONOMOUS_STATE_DIR"] = os.path.join(tmpdir, "default")
f1 = FileStore(directory=tmpdir)
f1.set("cycle_count", 7)
f1.set("last_report", {"cycle": 6, "ok": True})
f1.push("cycle_history", {"cycle": 6, "ok": True})
f2 = FileStore(directory=tmpdir)                       # simulate process restart
check("file.meta_survives_reopen", f2.get("cycle_count") == 7)
check("file.scalar_survives", f2.get("last_report")["ok"] is True)
hist = os.path.join(tmpdir, "cycle_history.jsonl")
check("file.ring_is_jsonl", os.path.exists(hist))
with open(hist, encoding="utf-8") as fh:
    check("file.ring_line_parse", json.loads(fh.readline())["cycle"] == 6)
check("file.keys_include_ring", "cycle_history" in f2.keys())

# ── redis backend, no server: graceful degrade ────────────────────────────────
r = RedisStore(url="redis://127.0.0.1:1/0")            # nothing listens on :1
check("redis.unreachable_available_false", r.available is False)
check("redis.unreachable_get_default", r.get("x", "dft") == "dft")
check("redis.unreachable_set_noop", r.set("x", 1) is None)
fallback = create_store("redis", directory=tmpdir)     # must fall back to file
check("degrade.redis_to_file", fallback.backend == "file")
mem = create_store("memory")
check("factory.explicit_memory", mem.backend == "memory")

# ── orchestrator integration ──────────────────────────────────────────────────
op1 = AutonomousOps(hunter_offline=True, store=MemoryStore())
rep = op1.run_cycle()
check("cycle.persistence_reported", rep.get("persistence", {}).get("backend") == "memory")
check("cycle.store_cycle_count", op1.store.get("cycle_count") == 1)
check("cycle.store_last_cycle", op1.store.get("last_cycle") == 0)

# resume across a "restart" that reuses the same durable store
op2 = AutonomousOps(hunter_offline=True, store=op1.store)
check("ops.resume_next_cycle_number", op2.cycle_count == 1)
rep2 = op2.run_cycle()
check("ops.resumed_cycle_number", rep2["cycle"] == 1)

# durability through the file backend end-to-end
dfile = os.path.join(tmpdir, "e2e")
op3 = AutonomousOps(hunter_offline=True, store=FileStore(directory=dfile),
                    state_backend="file")
op3.run_cycle()
op4 = AutonomousOps(hunter_offline=True, store=FileStore(directory=dfile))
check("ops.file_resume", op4.cycle_count == 1, str(op4.cycle_count))
op4.run_cycle()
check("ops.file_ring_recorded", op4.store.keys() and "cycle_history" in op4.store.keys())

ok = sum(1 for _, v in R if v)
print(f"\n{'='*60}\nState store: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v in R:
    if not v:
        print("  FAILED:", n)
sys.exit(0 if ok == len(R) else 1)