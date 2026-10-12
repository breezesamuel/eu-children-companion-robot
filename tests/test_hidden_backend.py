"""Test the hidden autonomous-ops backend: env gating, internal-key auth, and
invisibility from the OpenAPI schema.

Uses a minimal FastAPI app so it is fast and does not boot the whole product.
"""
import os
import sys
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

from fastapi import FastAPI
from fastapi.testclient import TestClient

import children_autonomous_ops as hidden

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


KEY = "unit-test-internal-key-1234567890"

# ── 1. disabled -> not mounted at all ────────────────────────────────────────
os.environ.pop("ENABLE_HIDDEN_API", None)
os.environ["AUTONOMOUS_INTERNAL_KEY"] = KEY
app_off = FastAPI()
mounted_off = hidden.mount_autonomous_ops(app_off)
check("hidden.disabled_not_mounted", mounted_off is False)
c_off = TestClient(app_off)
check("hidden.disabled_status_404", c_off.get("/api/autonomous/status").status_code == 404)

# missing key while enabled -> still not mounted
os.environ["ENABLE_HIDDEN_API"] = "true"
os.environ["AUTONOMOUS_INTERNAL_KEY"] = ""
app_nokey = FastAPI()
check("hidden.enabled_without_key_not_mounted",
      hidden.mount_autonomous_ops(app_nokey) is False)

# ── 2. enabled + key -> mounted, key required ────────────────────────────────
os.environ["ENABLE_HIDDEN_API"] = "true"
os.environ["AUTONOMOUS_INTERNAL_KEY"] = KEY
app = FastAPI()
mounted = hidden.mount_autonomous_ops(app)
check("hidden.enabled_mounted", mounted is True)

c = TestClient(app)

r = c.get("/api/autonomous/status")
check("hidden.status_requires_key", r.status_code == 401, str(r.status_code))

r = c.get("/api/autonomous/status", headers={"X-Internal-Key": "wrong"})
check("hidden.wrong_key_401", r.status_code == 401, str(r.status_code))

r = c.get("/api/autonomous/status", headers={"X-Internal-Key": KEY})
check("hidden.status_ok", r.status_code == 200 and r.json().get("status") == "ok",
      r.text[:120])

r = c.post("/api/autonomous/cycle")
check("hidden.cycle_requires_key", r.status_code == 401, str(r.status_code))

# cycle with key: run one real (offline) cycle through HTTP
os.environ["HUNTER_ONLINE"] = "0"
r = c.post("/api/autonomous/cycle", headers={"X-Internal-Key": KEY})
check("hidden.cycle_ok", r.status_code == 200, r.text[:160])
body = r.json() if r.status_code == 200 else {}
check("hidden.cycle_has_phases", bool(body.get("phases")), str(list(body)[:5]))
check("hidden.cycle_all_phases_ok",
      all(p["status"] == "ok" for p in body.get("phases", {}).values()),
      str({k: v.get("error") for k, v in body.get("phases", {}).items()
           if v["status"] != "ok"}))
check("hidden.cycle_ok_flag", body.get("ok") is True)

# status now reflects cycles
r = c.get("/api/autonomous/status", headers={"X-Internal-Key": KEY})
check("hidden.status_counts_cycles", r.json().get("cycles", 0) >= 1)

# ── 3. invisibility from OpenAPI ─────────────────────────────────────────────
schema = c.get("/openapi.json").json()
paths = " ".join(schema.get("paths", {}).keys())
check("hidden.not_in_openapi", "/api/autonomous" not in paths, paths[:200])
check("hidden.not_in_schema_tags",
      all(not p.startswith("/api/autonomous")
          for p in schema.get("paths", {})))

# key comparison is constant-time (secrets.compare_digest) -- verify length-diff safe
r = c.get("/api/autonomous/status", headers={"X-Internal-Key": KEY + "x"})
check("hidden.near_miss_key_401", r.status_code == 401)

ok = sum(1 for _, v, _ in R if v)
print(f"\n{'='*60}\nHidden backend: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v, d in R:
    if not v:
        print("  FAILED:", n, d)
sys.exit(0 if ok == len(R) else 1)
