#!/usr/bin/env python3
"""
Security & RBAC tests for the Python API.

Covers:
  * password storage / verification (wrong password is rejected)
  * token issuance, verification and rejection of malformed tokens
  * centralized RBAC gate on /api/admin/* and /api/audit/* (401 vs 403 vs 200)

Runs in-process through the ASGI app (no live server required).

Run: python tests/test_security_api.py
"""

import sys, os, json, asyncio, uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])

RESULTS = []


def check(name, condition, detail=""):
    ok = bool(condition)
    RESULTS.append((name, ok))
    print(f"  {'OK  ' if ok else 'FAIL'} {name}" + ("" if ok else f"  -> {detail}"))


def _short(obj, n=160):
    try:
        return json.dumps(obj, ensure_ascii=False)[:n]
    except Exception:
        return str(obj)[:n]


async def run():
    from httpx import ASGITransport, AsyncClient
    from children_robot_system import app

    transport = ASGITransport(app=app)
    suffix = uuid.uuid4().hex[:6]

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        async def post(path, body=None, headers=None):
            return await c.post(path, json=body or {}, headers=headers or {})

        async def get(path, headers=None):
            return await c.get(path, headers=headers or {})

        def payload(r):
            try:
                return r.json()
            except Exception:
                return {}

        async def make_user(role):
            name = f"sec_{role}_{suffix}"
            await post("/api/auth/register", {"username": name, "password": "pass123", "role": role})
            r = await post("/api/auth/login", {"username": name, "password": "pass123"})
            return name, (payload(r).get("data") or {}).get("token")

        _, admin_token = await make_user("admin")
        _, child_token = await make_user("child")

        # --- Authentication hardening -------------------------------------
        name = f"sec_pw_{suffix}"
        r = await post("/api/auth/register", {"username": name, "password": "correct-horse", "role": "child"})
        check("register succeeds", r.status_code == 200 and (payload(r).get("data") or {}).get("success"),
              _short(payload(r)))

        r = await post("/api/auth/login", {"username": name, "password": "correct-horse"})
        tok = (payload(r).get("data") or {}).get("token")
        check("correct password logs in", bool(tok), _short(payload(r)))

        r = await post("/api/auth/login", {"username": name, "password": "wrong-horse"})
        d = payload(r).get("data") or {}
        check("wrong password rejected", not d.get("success") and not d.get("token"), _short(payload(r)))

        r = await post("/api/auth/login", {"username": f"nobody_{suffix}", "password": "x"})
        d = payload(r).get("data") or {}
        check("unknown user rejected", not d.get("success"), _short(payload(r)))

        r = await post("/api/auth/register", {"username": name, "password": "correct-horse", "role": "child"})
        d = payload(r).get("data") or {}
        check("duplicate username rejected", not d.get("success"), _short(payload(r)))

        r = await c.post("/api/auth/verify", headers={"Authorization": f"Bearer {tok}"})
        check("valid token verifies", (payload(r).get("data") or {}).get("valid") is True, _short(payload(r)))

        # --- RBAC gate on /api/admin --------------------------------------
        r = await get("/api/admin/stats")
        check("admin route without token -> 401", r.status_code == 401, f"got {r.status_code}")

        r = await get("/api/admin/stats", headers={"Authorization": "Bearer not-a-real-token"})
        check("admin route with invalid token -> 401", r.status_code == 401, f"got {r.status_code}")

        r = await get("/api/admin/stats", headers={"Authorization": "Basic abc"})
        check("admin route with malformed header -> 401", r.status_code == 401, f"got {r.status_code}")

        r = await get("/api/admin/stats", headers={"Authorization": f"Bearer {child_token}"})
        check("admin route with child token -> 403", r.status_code == 403, f"got {r.status_code}")

        r = await get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        check("admin route with admin token -> 200", r.status_code == 200, f"got {r.status_code}")

        # --- RBAC gate on /api/audit --------------------------------------
        r = await get("/api/audit/log")
        check("audit route without token -> 401", r.status_code == 401, f"got {r.status_code}")

        r = await get("/api/audit/log", headers={"Authorization": f"Bearer {admin_token}"})
        check("audit route with admin token -> 200", r.status_code == 200, f"got {r.status_code}")

        # --- user listing still role-checked in-route ---------------------
        r = await get("/api/auth/users", headers={"Authorization": f"Bearer {child_token}"})
        check("user list blocked for child", r.status_code == 403 or (payload(r).get("code") == 403), _short(payload(r)))

        r = await get("/api/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
        check("user list allowed for admin", r.status_code == 200 and isinstance(payload(r).get("data"), list),
              _short(payload(r)))

        # --- /api/auth/me -------------------------------------------------
        r = await get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
        me = payload(r).get("data") or {}
        check("auth/me returns profile for valid token",
              r.status_code == 200 and (me.get("user") or {}).get("name") == name, _short(payload(r)))

        r = await get("/api/auth/me")
        check("auth/me without token -> 401", r.status_code == 401, f"got {r.status_code}")

        # --- password change ----------------------------------------------
        r = await post("/api/auth/password/change",
                       {"old_password": "correct-horse", "new_password": "new-horse-9"},
                       {"Authorization": f"Bearer {tok}"})
        check("password change with correct old password succeeds",
              (payload(r).get("data") or {}).get("success") is True, _short(payload(r)))

        r = await post("/api/auth/login", {"username": name, "password": "new-horse-9"})
        check("login with new password works",
              bool((payload(r).get("data") or {}).get("token")), _short(payload(r)))

        r = await post("/api/auth/login", {"username": name, "password": "correct-horse"})
        check("old password no longer works",
              not (payload(r).get("data") or {}).get("token"), _short(payload(r)))

        r = await post("/api/auth/password/change",
                       {"old_password": "nope", "new_password": "another-1"},
                       {"Authorization": f"Bearer {tok}"})
        check("password change with wrong old password rejected",
              not (payload(r).get("data") or {}).get("success"), _short(payload(r)))

        r = await post("/api/auth/password/change",
                       {"old_password": "new-horse-9", "new_password": "123"},
                       {"Authorization": f"Bearer {tok}"})
        check("password change with short new password rejected",
              not (payload(r).get("data") or {}).get("success"), _short(payload(r)))

        r = await post("/api/auth/password/change", {"old_password": "x", "new_password": "yyyyyy"})
        check("password change without token -> 401", r.status_code == 401, f"got {r.status_code}")

        # --- public endpoint stays open -----------------------------------
        r = await get("/health")
        check("public health endpoint remains open", r.status_code == 200, f"got {r.status_code}")

    passed = sum(1 for _, ok in RESULTS if ok)
    failed = len(RESULTS) - passed
    print(f"\n{'=' * 55}")
    print(f"Security API: {passed}/{len(RESULTS)} checks passed, {failed} failed")
    print(f"{'=' * 55}")
    return failed


if __name__ == "__main__":
    sys.exit(0 if asyncio.run(run()) == 0 else 1)
