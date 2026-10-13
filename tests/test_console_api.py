#!/usr/bin/env python3
"""Tests for the operator-console API (children_console_api.py).

The React console's dashboard pages used to call endpoint names that never
existed, so those pages rendered empty.  These endpoints now alias the real
services.  This suite proves:

  * every console alias answers 200 (no more dead pages)
  * the payloads carry the field names the pages read
  * empty services return honest zero/empty values (never fabricated)
  * POST /api/content/action rejects unknown actions and forwards real ones
  * the frontend pages reference the endpoints that actually exist

Run: python tests/test_console_api.py
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond)))
    print(f"[{'OK' if cond else 'XX'}] {name} {detail if not cond else ''}")


async def run():
    from httpx import ASGITransport, AsyncClient
    from children_robot_system import app
    from children_content_db import get_all_content
    from children_search import search_engine
    search_engine.reindex(get_all_content())

    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")

    # ── every alias answers 200 ────────────────────────────────────────────
    for path in [
        "/api/rma/stats", "/api/rma/list", "/api/payments/list",
        "/api/content/stats", "/api/content/drafts",
        "/api/compliance/coppa", "/api/compliance/gdpr", "/api/compliance/dsa",
        "/api/console/loop/status", "/api/console/loop/history",
        "/api/v1/learning/records", "/api/v1/analytics/subjects",
    ]:
        r = await client.get(path)
        check(f"200 {path}", r.status_code == 200, f"HTTP {r.status_code}")

    # ── RMA shape + honest empty ───────────────────────────────────────────
    j = (await client.get("/api/rma/stats")).json()
    check("rma.stats_keys", {"total_rmas", "pending_count", "resolved_count",
                             "total_refunded_cents", "avg_cycle_days",
                             "by_status"} <= set(j))
    check("rma.empty_zero", j["total_rmas"] == 0 and j["total_refunded_cents"] == 0)
    jl = (await client.get("/api/rma/list")).json()
    check("rma.list_key", isinstance(jl.get("rmas"), list))

    # ── payments ───────────────────────────────────────────────────────────
    jp = (await client.get("/api/payments/list")).json()
    check("payments.list_key", isinstance(jp.get("payments"), list))

    # ── content officer ────────────────────────────────────────────────────
    js = (await client.get("/api/content/stats")).json()["stats"]
    check("content.stats_keys", {"total_drafts", "submitted", "approved",
                                 "published", "rejected", "languages_covered"} <= set(js))
    jd = (await client.get("/api/content/drafts")).json()
    check("content.drafts_key", isinstance(jd.get("drafts"), list))

    # real draft flow: generate -> submit (via action) -> appears in stats
    gen = await client.post("/api/content-officer/generate",
                            json={"entity_type": "page", "language": "en",
                                  "entity": {"title": "Console Alias Test",
                                             "summary": "s", "body": "b",
                                             "bullets": [], "keywords": []}})
    check("content.generate_200", gen.status_code == 200)
    drafts = (await client.get("/api/content/drafts")).json()["drafts"]
    check("content.drafts_have_lang", all("lang" in d for d in drafts))
    if drafts:
        did = drafts[0]["draft_id"]
        ra = await client.post("/api/content/action",
                               json={"draft_id": did, "action": "submit"})
        check("content.action_submit", ra.status_code == 200 and ra.json()["success"])
        st = (await client.get("/api/content/stats")).json()["stats"]
        check("content.submitted_counted", st["submitted"] >= 1)
    ra_bad = await client.post("/api/content/action",
                               json={"draft_id": "nope", "action": "explode"})
    check("content.action_rejects_unknown", ra_bad.status_code == 400)

    # ── compliance: real control state, honest ─────────────────────────────
    jc = (await client.get("/api/compliance/coppa")).json()
    check("coppa.status", jc.get("status") in ("enabled", "not_configured"))
    jg = (await client.get("/api/compliance/gdpr")).json()
    check("gdpr.status", jg.get("status") in ("enabled", "not_configured"))
    jdsa = (await client.get("/api/compliance/dsa")).json()
    check("dsa.report_id", bool(jdsa.get("report_id")) or jdsa.get("status") == "not_configured")

    # ── loop status/history: honest no-fabrication when no cycle ran ───────
    ls = (await client.get("/api/console/loop/status")).json()
    check("loop.status_keys", {"ok", "phases", "persistence"} <= set(ls))
    check("loop.ok_bool", isinstance(ls["ok"], bool))
    check("loop.no_fabrication", ls.get("cycles", 0) > 0 or ls["ok"] is False)
    lh = (await client.get("/api/console/loop/history")).json()
    check("loop.history_key", isinstance(lh.get("history"), list))

    await client.aclose()


# ── static: frontend pages point at endpoints that exist ─────────────────────
def static_frontend():
    base = os.path.join("project_source", "management_center", "frontend", "src", "pages")
    if not os.path.isdir(base):
        check("frontend.pages_present", False, "pages dir missing")
        return
    loopsrc = ""
    with open(os.path.join(base, "LoopDashboard.jsx"), encoding="utf-8") as fh:
        loopsrc = fh.read()
    check("loop.frontend_uses_console_api",
          "/api/console/loop/status" in loopsrc and "/api/console/loop/history" in loopsrc)
    check("loop.frontend_no_hidden_api", "/api/autonomous/status" not in loopsrc)


def main():
    asyncio.run(run())
    static_frontend()
    ok = sum(1 for _, v in R if v)
    print(f"\n{'=' * 60}\nConsole API: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
    for n, v in R:
        if not v:
            print("  FAILED:", n)
    sys.exit(0 if ok == len(R) else 1)


if __name__ == "__main__":
    main()
