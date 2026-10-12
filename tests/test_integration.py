#!/usr/bin/env python3
"""
Cross-module integration tests for the European Children Companion Robot.

Unlike the unit tests (single module) and the HTTP smoke test (single endpoint),
these exercise 8 end-to-end flows that span several modules and assert that data
produced by one module is visible to another:

  F1 Auth lifecycle            auth (+ database)
  F2 Learning lifecycle        learning + education
  F3 Conversation & emotion    conversation + emotional
  F4 Content & search          content_db + search
  F5 Growth & recommendation   growth + recommend
  F6 Device & entertainment    device + entertainment
  F7 Admin / analytics / sec   admin + analytics + security + gdpr
  F8 Parental & platform       parental + subscription + notifications + i18n

Runs fully in-process through the ASGI app, so no live server is required
(CI friendly). 41 checks are executed.

Run: python tests/test_integration.py
"""

import sys, os, json, asyncio, uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])

RESULTS = []


def check(name, condition, detail=""):
    ok = bool(condition)
    RESULTS.append((name, ok))
    print(f"  {'OK  ' if ok else 'FAIL'} {name}" + ("" if ok else f"  -> {detail}"))


def _short(obj, n=140):
    try:
        return json.dumps(obj, ensure_ascii=False)[:n]
    except Exception:
        return str(obj)[:n]


async def run():
    from httpx import ASGITransport, AsyncClient
    from children_robot_system import app
    from children_content_db import get_all_content
    from children_search import search_engine

    # Make sure the search index reflects the content database.
    search_engine.reindex(get_all_content())

    transport = ASGITransport(app=app)
    uid = f"integ_{uuid.uuid4().hex[:8]}"

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        async def get(path):
            return await c.get(path)

        async def post(path, body=None):
            return await c.post(path, json=body or {})

        def payload(r):
            try:
                return r.json()
            except Exception:
                return {}

        def data(r):
            return payload(r).get("data")

        # ------------------------------------------------------------------
        # F1 - Auth lifecycle
        # ------------------------------------------------------------------
        r = await post("/api/auth/register", {"username": uid, "password": "pass123", "role": "child"})
        d = data(r) or {}
        check("F1 register new account", r.status_code == 200 and d.get("success"), _short(payload(r)))

        r = await post("/api/auth/login", {"username": uid, "password": "pass123"})
        d = data(r) or {}
        token = d.get("token")
        check("F1 login issues token", r.status_code == 200 and bool(token), _short(payload(r)))

        # verify reads the Authorization header, so pass it explicitly
        r = await c.post("/api/auth/verify", headers={"Authorization": f"Bearer {token}"})
        d = data(r) or {}
        check("F1 issued token verifies", r.status_code == 200 and d.get("valid") is True, _short(payload(r)))

        # An admin token is required to list users (RBAC), so register one.
        admin_uid = f"integ_admin_{uuid.uuid4().hex[:6]}"
        await post("/api/auth/register", {"username": admin_uid, "password": "pass123", "role": "admin"})
        r = await post("/api/auth/login", {"username": admin_uid, "password": "pass123"})
        admin_token = (data(r) or {}).get("token")
        r = await c.get("/api/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
        check("F1 registered user is persisted", r.status_code == 200 and uid in _short(payload(r), 100000),
              _short(payload(r)))

        r = await post("/api/auth/login", {"username": uid, "password": "definitely-wrong"})
        d = data(r) or {}
        check("F1 wrong password rejected", not d.get("success") and not d.get("token"), _short(payload(r)))

        r = await post("/api/auth/register", {"username": uid, "password": "pass123", "role": "child"})
        d = data(r) or {}
        check("F1 duplicate registration rejected", not d.get("success"), _short(payload(r)))

        # ------------------------------------------------------------------
        # F2 - Learning lifecycle (learning + education)
        # ------------------------------------------------------------------
        r = await post("/api/learning/enroll", {"user_id": uid, "course_id": "math_g1"})
        d = data(r) or {}
        check("F2 enrol in course", r.status_code == 200 and d.get("success"), _short(payload(r)))

        r = await get("/api/learning/courses")
        d = data(r)
        check("F2 course catalogue available", isinstance(d, (list, dict)) and len(d) > 0, _short(payload(r)))

        r = await get(f"/api/learning/report/{uid}")
        d = data(r) or {}
        check("F2 learning report built", r.status_code == 200 and d.get("user_id") == uid, _short(payload(r)))

        r = await get("/api/education/quiz/math_basics")
        d = data(r) or {}
        check("F2 quiz generated for skill", r.status_code == 200 and len(d.get("questions", [])) > 0,
              _short(payload(r)))

        r = await get(f"/api/education/progress/{uid}")
        d = data(r) or {}
        check("F2 education progress tracked", r.status_code == 200 and "completed_skills" in d, _short(payload(r)))

        # ------------------------------------------------------------------
        # F3 - Conversation & emotion (conversation + emotional)
        # ------------------------------------------------------------------
        r = await post("/api/conversation/chat", {"user_id": uid, "message": "Hello robot, how are you?"})
        d = data(r) or {}
        session_id = d.get("session_id")
        check("F3 chat produces a reply", r.status_code == 200 and bool(d.get("response")), _short(payload(r)))

        check("F3 chat classifies intent", bool(d.get("intent")), _short(payload(r)))

        r = await get(f"/api/conversation/history/{session_id}")
        check("F3 conversation history retrievable", r.status_code == 200, _short(payload(r)))

        r = await post("/api/emotional/analyze", {"user_id": uid, "text": "I am so happy today"})
        d = data(r) or {}
        check("F3 emotion detected as happy", r.status_code == 200 and d.get("emotion") == "happy", _short(payload(r)))

        r = await post("/api/emotional/companion", {"user_id": uid, "emotion": "sad", "text": "I feel sad"})
        d = data(r) or {}
        check("F3 companion response generated", r.status_code == 200 and bool(d.get("response")), _short(payload(r)))

        # ------------------------------------------------------------------
        # F4 - Content & search (content_db + search)
        # ------------------------------------------------------------------
        r = await get("/api/stages")
        d = data(r)
        check("F4 three education stages", r.status_code == 200 and isinstance(d, list) and len(d) == 3,
              _short(payload(r)))

        r = await get("/api/stages/primary/courses")
        d = data(r) or {}
        items = d.get("items", d) if isinstance(d, dict) else d
        check("F4 primary stage has courses", r.status_code == 200 and len(items) > 0, _short(payload(r)))

        r = await get("/api/stages/primary/quiz")
        d = data(r) or {}
        check("F4 stage quiz bank available", r.status_code == 200 and len(d.get("items", [])) > 0, _short(payload(r)))

        r = await post("/api/search/reindex")
        d = data(r) or {}
        check("F4 search index rebuilds", r.status_code == 200 and d.get("status") == "reindexed", _short(payload(r)))

        r = await get("/api/search?q=math")
        d = data(r) or {}
        check("F4 search returns result envelope", r.status_code == 200 and "total" in d, _short(payload(r)))

        r = await get("/api/search/suggest?q=ma")
        d = data(r) or {}
        check("F4 search suggestions returned", r.status_code == 200 and isinstance(d.get("suggestions"), list),
              _short(payload(r)))

        # ------------------------------------------------------------------
        # F5 - Growth & recommendation (growth + recommend)
        # ------------------------------------------------------------------
        r = await get(f"/api/growth/timeline/{uid}")
        d = data(r)
        check("F5 growth timeline listed", r.status_code == 200 and isinstance(d, list), _short(payload(r)))

        r = await get(f"/api/growth/goals/{uid}")
        d = data(r)
        check("F5 next goals suggested", r.status_code == 200 and isinstance(d, list), _short(payload(r)))

        r = await get("/api/growth/leaderboard")
        check("F5 leaderboard available", r.status_code == 200, _short(payload(r)))

        r = await post("/api/recommend/build-profile", {"user_id": uid})
        d = data(r) or {}
        check("F5 recommendation profile built", r.status_code == 200 and "stage" in d, _short(payload(r)))

        r = await get(f"/api/recommend/all/{uid}")
        d = data(r) or {}
        check("F5 cross-module recommendations", r.status_code == 200 and "courses" in d, _short(payload(r)))

        # ------------------------------------------------------------------
        # F6 - Device & entertainment (device + entertainment)
        # ------------------------------------------------------------------
        r = await get("/api/device/robot_001/status")
        d = data(r) or {}
        check("F6 device status readable", r.status_code == 200 and d.get("device_id") == "robot_001",
              _short(payload(r)))

        r = await post("/api/device/robot_001/control", {"command": "get_status"})
        d = data(r) or {}
        check("F6 device command accepted", r.status_code == 200 and d.get("success") is True, _short(payload(r)))

        r = await get("/api/entertainment/skills")
        d = data(r) or {}
        check("F6 entertainment catalogue", r.status_code == 200 and len(d.get("items", [])) > 0, _short(payload(r)))

        r = await get("/api/entertainment/search?query=story")
        check("F6 entertainment search works", r.status_code == 200, _short(payload(r)))

        r = await get(f"/api/entertainment/recommendations/{uid}")
        d = data(r)
        check("F6 entertainment recommendations", r.status_code == 200 and isinstance(d, list) and len(d) > 0,
              _short(payload(r)))

        # ------------------------------------------------------------------
        # F7 - Admin / analytics / security / gdpr
        # ------------------------------------------------------------------
        admin_h = {"Authorization": f"Bearer {admin_token}"}
        r = await c.get("/api/admin/stats", headers=admin_h)
        d = data(r) or {}
        check("F7 admin dashboard stats", r.status_code == 200 and "total_users" in d, _short(payload(r)))

        r = await c.get("/api/admin/system-health", headers=admin_h)
        d = data(r) or {}
        check("F7 system health reported", r.status_code == 200 and d.get("status") == "healthy", _short(payload(r)))

        r = await post("/api/analytics/snapshot")
        d = data(r)
        check("F7 analytics snapshot built", r.status_code == 200 and isinstance(d, dict), _short(payload(r)))

        r = await get("/api/security/compliance")
        d = data(r) or {}
        check("F7 compliance report", r.status_code == 200 and "compliance_frameworks" in d, _short(payload(r)))

        r = await get(f"/api/gdpr/data/{uid}")
        d = data(r) or {}
        check("F7 gdpr data bundle", r.status_code == 200 and d.get("user_id") == uid, _short(payload(r)))

        # ------------------------------------------------------------------
        # F8 - Parental & platform (parental + subscription + notifications + i18n)
        # ------------------------------------------------------------------
        r = await get(f"/api/parental/dashboard/{uid}")
        d = data(r) or {}
        check("F8 parental dashboard", r.status_code == 200 and "screen_time" in d, _short(payload(r)))

        r = await get("/api/subscription/plans")
        d = data(r) or {}
        check("F8 subscription plans listed", r.status_code == 200 and len(d) > 0, _short(payload(r)))

        r = await get("/api/notifications/stats")
        d = data(r) or {}
        check("F8 notification stats", r.status_code == 200 and "total" in d, _short(payload(r)))

        r = await get("/api/notifications/templates")
        d = data(r) or {}
        check("F8 notification templates", r.status_code == 200 and "welcome" in d, _short(payload(r)))

    passed = sum(1 for _, ok in RESULTS if ok)
    failed = len(RESULTS) - passed
    print(f"\n{'=' * 55}")
    print(f"Integration: {passed}/{len(RESULTS)} checks passed, {failed} failed")
    print(f"{'=' * 55}")
    return failed


if __name__ == "__main__":
    sys.exit(0 if asyncio.run(run()) == 0 else 1)
