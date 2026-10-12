#!/usr/bin/env python3
"""
End-to-end HTTP + WebSocket tests via ASGI TestClient.
Run: python tests/test_e2e_http.py
"""

import sys, os, json, asyncio
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])

async def run():
    from httpx import ASGITransport, AsyncClient
    from children_robot_system import app
    from children_content_db import get_all_content
    from children_search import search_engine
    search_engine.reindex(get_all_content())

    transport = ASGITransport(app=app)
    ok = 0; fail = 0

    def check(name, status, expected=200):
        nonlocal ok, fail
        if status == expected:
            ok += 1; print(f"  OK  {name}")
        else:
            fail += 1; print(f"  FAIL {name}: HTTP {status}")

    endpoints = [
        ("GET", "/health", None),
        ("GET", "/api/health/detailed", None),
        ("GET", "/api/ping", None),
        ("GET", "/api/info", None),
        ("GET", "/api/stages", None),
        ("GET", "/api/stages/summary", None),
        # Auth
        ("POST", "/api/auth/register", {"username":"e2e_test","password":"pass","role":"child"}),
        ("POST", "/api/auth/login", {"username":"e2e_test","password":"pass"}),
        ("GET", "/api/auth/users", None),
        # Education
        ("GET", "/api/education/skills", None),
        ("GET", "/api/education/skills/category/language", None),
        ("GET", "/api/stages/kindergarten/courses", None),
        ("GET", "/api/stages/primary/courses", None),
        ("GET", "/api/stages/middle_school/courses", None),
        ("GET", "/api/stages/kindergarten/quiz", None),
        # Learning
        ("GET", "/api/learning/courses", None),
        ("POST", "/api/learning/enroll", {"user_id":"e2e_test","course_id":"math_g1"}),
        ("GET", "/api/learning/report/e2e_test", None),
        # Emotional
        ("POST", "/api/emotional/analyze", {"user_id":"e2e_test","text":"happy"}),
        # Conversation
        ("POST", "/api/conversation/chat", {"user_id":"e2e_test","message":"Hi"}),
        ("GET", "/api/conversation/history/e2e_test", None),
        # Growth
        ("GET", "/api/growth/timeline/e2e_test", None),
        ("GET", "/api/growth/goals/e2e_test", None),
        ("GET", "/api/growth/leaderboard", None),
        ("GET", "/api/growth/achievements/e2e_test", None),
        # Device
        ("GET", "/api/device/robot_c2/status", None),
        # Security
        ("GET", "/api/security/compliance", None),
        ("GET", "/api/security/compliance/GDPR", None),
        # Admin
        ("GET", "/api/admin/stats", None),
        ("GET", "/api/admin/devices", None),
        ("GET", "/api/admin/users", None),
        ("GET", "/api/admin/system-health", None),
        # Sync
        ("GET", "/api/sync/conflicts", None),
        # Recommend
        ("GET", "/api/recommend/courses/e2e_test", None),
        ("GET", "/api/recommend/activities/e2e_test", None),
        ("GET", "/api/recommend/quizzes/e2e_test", None),
        # Analytics
        ("POST", "/api/analytics/snapshot", None),
        ("GET", "/api/analytics/system-health", None),
        # Notifications
        ("GET", "/api/notifications/stats", None),
        ("GET", "/api/notifications/e2e_test", None),
        # Parental
        ("GET", "/api/parental/dashboard/e2e_test", None),
        # Search
        ("GET", "/api/search?q=math", None),
        ("GET", "/api/search/suggest?q=ma", None),
        ("POST", "/api/search/reindex", None),
        # Metrics
        ("GET", "/metrics", None),
        ("GET", "/api/metrics/snapshot", None),
        # API docs
        ("GET", "/api/docs/openapi.json", None),
        ("GET", "/api/docs/swagger", None),
        # Audit
        ("GET", "/api/audit/log", None),
        # i18n
        ("GET", "/api/i18n/locales", None),
        ("GET", "/api/i18n/translate/welcome?locale=en", None),
        # Sessions
        ("POST", "/api/sessions/create", {"user_id":"e2e_test","role":"child"}),
        ("GET", "/api/sessions/stats", None),
        # Scheduler
        ("GET", "/api/scheduler/status", None),
        # Webhooks
        ("POST", "/api/webhooks/register", {"url":"http://e2e.test","events":["t"],"secret":"s"}),
        ("GET", "/api/webhooks/list", None),
        # Entertainment
        ("GET", "/api/entertainment/skills", None),
        ("GET", "/api/entertainment/search?query=song", None),
        # Edge AI
        ("GET", "/api/edge-ai/models", None),
        # LangChain
        ("GET", "/api/langchain/models", None),
        # LangGraph
        ("GET", "/api/langgraph/workflows", None),
        # Files
        ("GET", "/api/files/stats", None),
        # WebSocket stats
        ("GET", "/api/ws/stats", None),
        # Preview
        ("GET", "/api/preview/content/courses", None),
        ("GET", "/api/preview/content/quizzes", None),
        ("GET", "/api/preview/content/summary", None),
        # Notification templates
        ("GET", "/api/notifications/templates", None),
        ("POST", "/api/notifications/preview", {"template":"welcome","locale":"en","params":{"name":"Test"}}),
        # Subscription
        ("GET", "/api/subscription/plans", None),
        ("POST", "/api/subscription/create", {"user_id":"e2e_test","plan":"premium"}),
        ("GET", "/api/subscription/status/e2e_test", None),
        # Payment
        ("POST", "/api/payment/simulate", {"user_id":"e2e_test","amount":9.99,"currency":"EUR","method":"card"}),
        ("GET", "/api/payment/history/e2e_test", None),
        # GDPR
        ("GET", "/api/gdpr/data/e2e_test", None),
        ("GET", "/api/gdpr/export/e2e_test", None),
        # SEO
        ("GET", "/robots.txt", None),
        ("GET", "/sitemap.xml", None),
    ]

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register + login an admin so RBAC-protected endpoints can be reached.
        await client.post("/api/auth/register",
                          json={"username": "e2e_admin", "password": "pass123", "role": "admin"})
        r = await client.post("/api/auth/login", json={"username": "e2e_admin", "password": "pass123"})
        admin_token = (r.json().get("data") or {}).get("token") or ""

        def auth_headers(path):
            if path.startswith("/api/admin") or path.startswith("/api/audit"):
                return {"Authorization": f"Bearer {admin_token}"}
            return {}

        for method, path, data in endpoints:
            if method == "GET":
                r = await client.get(path, headers=auth_headers(path))
                check(f"{method} {path}", r.status_code)
            else:
                r = await client.post(path, json=data or {}, headers=auth_headers(path))
                check(f"{method} {path}", r.status_code)

        # --- New coverage: auth/me, device mgmt, conversation sessions ---
        authed = {"Authorization": f"Bearer {admin_token}"}

        r = await client.get("/api/auth/me", headers=authed)
        check("GET /api/auth/me", r.status_code)

        r = await client.get("/api/device", headers=authed)
        check("GET /api/device", r.status_code)

        r = await client.post("/api/device/register",
                              json={"device_id": "e2e_dev_1", "name": "E2E Bot", "type": "robot"},
                              headers=authed)
        check("POST /api/device/register", r.status_code)

        r = await client.get("/api/device/e2e_dev_1/status", headers=authed)
        check("GET /api/device/{id}/status", r.status_code)

        r = await client.delete("/api/device/e2e_dev_1", headers=authed)
        check("DELETE /api/device/{id}", r.status_code)

        r = await client.get("/api/conversation/sessions/e2e_test", headers=authed)
        check("GET /api/conversation/sessions/{user_id}", r.status_code)
        sessions = ((r.json().get("data") or {}).get("sessions") or [])
        if sessions:
            sid = sessions[0]["session_id"]
            r = await client.delete(f"/api/conversation/session/{sid}", headers=authed)
            check("DELETE /api/conversation/session/{id}", r.status_code)
        else:
            fail += 1
            print("  FAIL could not list a conversation session to delete")

        # --- WebSocket test via starlette TestClient
        try:
            from starlette.testclient import TestClient as _WSTestClient
            _ws_client = _WSTestClient(app)
            with _ws_client.websocket_connect("/ws?client_id=e2e_ws_test") as ws:
                ws.send_json({"type": "ping"})
                pong = ws.receive_json()
                if pong.get("type") == "pong":
                    ok += 1; print(f"  OK  WS /ws ping-pong")
                else:
                    fail += 1; print(f"  FAIL WS /ws ping-pong: {pong}")
                ws.send_json({"type": "subscribe", "topic": "test"})
                sub = ws.receive_json()
                if sub.get("type") == "subscribed":
                    ok += 1; print(f"  OK  WS /ws subscribe")
                else:
                    fail += 1; print(f"  FAIL WS /ws subscribe: {sub}")
        except Exception as e:
            fail += 2; print(f"  SKIP WS /ws: {e} (httpx ws not available)")

        try:
            from starlette.testclient import TestClient as _WSTestClient2
            _ws_client2 = _WSTestClient2(app)
            with _ws_client2.websocket_connect("/ws/device/test_device_001") as ws:
                ws.send_json({"type": "ping"})
                pong = ws.receive_json()
                if pong.get("type") == "pong":
                    ok += 1; print(f"  OK  WS /ws/device ping-pong")
                else:
                    fail += 1; print(f"  FAIL WS /ws/device ping-pong: {pong}")
                ws.send_json({"type": "telemetry", "data": {"battery": 85}})
                ok += 1; print(f"  OK  WS /ws/device telemetry")
        except Exception as e:
            fail += 2; print(f"  SKIP WS /ws/device: {e} (httpx ws not available)")

        total = ok + fail
        print(f"\n{'='*50}")
        print(f"HTTP E2E: {ok}/{total} passed, {fail}/{total} failed")
        print(f"{'='*50}")
        return fail

if __name__ == "__main__":
    sys.exit(0 if asyncio.run(run()) == 0 else 1)
