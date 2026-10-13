"""Tests for bootstrap-credential hardening.

The app seeds three accounts at startup (admin/parent1/child1). Those must use
a well-known development default only *outside* production; on a production
host the seed must be an explicit env override or a random per-instance secret,
so a publicly reachable deployment never ships `admin/admin123`.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

import logging  # noqa: E402
logging.disable(logging.CRITICAL)

from children_robot_system import _bootstrap_password  # noqa: E402

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond)))
    print(f"[{'OK' if cond else 'XX'}] {name} {detail if not cond else ''}")


# ── non-production keeps the dev default ────────────────────────────────────
check("dev.default", _bootstrap_password("ADMIN_PASSWORD", "admin123", {}) == "admin123")
check("dev.test_stage",
      _bootstrap_password("ADMIN_PASSWORD", "admin123", {"ROBOT_STAGE": "test"}) == "admin123")

# ── explicit override always wins ──────────────────────────────────────────
check("override.dev",
      _bootstrap_password("ADMIN_PASSWORD", "admin123",
                          {"ADMIN_PASSWORD": "s3cret!"}) == "s3cret!")
check("override.prod",
      _bootstrap_password("ADMIN_PASSWORD", "admin123",
                          {"ROBOT_STAGE": "production", "ADMIN_PASSWORD": "s3cret!"}) == "s3cret!")
check("override.trims",
      _bootstrap_password("PARENT_PASSWORD", "parent123",
                          {"PARENT_PASSWORD": "  spaced  "}) == "spaced")

# ── production without override → random, never the dev default ─────────────
p1 = _bootstrap_password("ADMIN_PASSWORD", "admin123", {"ROBOT_STAGE": "production"})
p2 = _bootstrap_password("ADMIN_PASSWORD", "admin123", {"ROBOT_STAGE": "production"})
check("prod.not_default", p1 != "admin123", repr(p1))
check("prod.not_empty", bool(p1.strip()))
check("prod.long_enough", len(p1) >= 20, str(len(p1)))
check("prod.random_per_call", p1 != p2, f"{p1!r} vs {p2!r}")
check("prod.case_insensitive",
      _bootstrap_password("ADMIN_PASSWORD", "admin123",
                          {"ROBOT_STAGE": "PRODUCTION"}) != "admin123")
check("prod.other_keys",
      _bootstrap_password("CHILD_PASSWORD", "child123",
                          {"ROBOT_STAGE": "production"}) != "child123")

# ── startup wiring actually uses the helper ────────────────────────────────
with open(os.path.join(ROOT, "children_robot_system.py"), encoding="utf-8") as fh:
    src = fh.read()
check("wiring.uses_helper", "_bootstrap_password(_env_key, _dev)" in src)
check("wiring.has_admin_env", '"ADMIN_PASSWORD"' in src)
check("wiring.prod_notice", "seeded a random admin credential" in src)

ok = sum(1 for _, v in R if v)
print(f"\n{'='*60}\nBootstrap credentials: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v in R:
    if not v:
        print("  FAILED:", n)
sys.exit(0 if ok == len(R) else 1)
