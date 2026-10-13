"""Tests for the Free AI Token Pool (children_free_ai.py).

Deterministic and offline: every HTTP call is stubbed, so the suite stays
green regardless of network. The pool's live behaviour (a real keyless
completion) is proven separately by runtime/free_ai_smoke.py.

Covers:
  * registry integrity (>= 50 providers, required fields, all no-card)
  * no committed secrets in the registry
  * translated, friendly error mapping (401/402/429/404/500 ...)
  * URL derivation (chat / models) and explicit overrides
  * availability, key loading (env + FREE_AI_KEYS blob), child-safety filter
  * chat() success, ordered failover, all-fail (never fabricates)
  * content extraction from OpenAI-shaped and flat responses
  * FreeCreditMeter: per-tier limits, daily cap, day rollover
  * FastAPI router: routes, /providers, /status, /credits, /chat,
    daily allowance enforcement, and the public/locked auth gate
"""
import io
import json
import os
import sys
import tempfile
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
os.chdir(ROOT)

import logging  # noqa: E402
logging.disable(logging.CRITICAL)

import children_free_ai as fa  # noqa: E402

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond)))
    print(f"[{'OK' if cond else 'XX'}] {name} {detail if not cond else ''}")


# ── env hygiene: no real keys leak into availability ──────────────────
SAVED = {}
_KEY_ENVS = set()
for p in fa.pool.registry:
    if p.get("keyEnv"):
        _KEY_ENVS.add(p["keyEnv"])
for k in list(_KEY_ENVS) + [
        "FREE_AI_KEYS", "FREE_AI_CHILD_SAFE", "FREE_AI_PUBLIC",
        "FREE_AI_ENABLED", "FREE_AI_ACCESS_KEY", "FREE_AI_REGISTRY",
        "FREE_AI_METER_PATH", "GITHUB_REPOSITORY", "LIVE_URL"]:
    SAVED[k] = os.environ.pop(k, None)


def restore_env():
    for k, v in SAVED.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


REGISTRY_PATH = os.path.join(
    ROOT, "project_source", "services", "registry", "free-ai-providers.json")

try:
    # ── registry integrity ──────────────────────────────────────────────
    with open(REGISTRY_PATH, encoding="utf-8") as fh:
        raw = fh.read()
    registry = json.loads(raw)
    check("registry.loads", isinstance(registry, list))
    check("registry.50_plus", len(registry) >= 50, f"only {len(registry)}")
    ids = [p.get("id") for p in registry]
    check("registry.unique_ids", len(ids) == len(set(ids)))
    check("registry.nonempty_ids", all(ids))

    required = {"id", "name", "baseUrl", "apiType", "keyless",
                "creditCard", "priority", "status"}
    missing = [p.get("id") for p in registry
               if not required.issubset(set(p.keys()))]
    check("registry.required_fields", not missing, str(missing[:5]))

    check("registry.all_no_card",
          all(p.get("creditCard") is False for p in registry))

    keyless_nonlocal = [p for p in registry
                        if p.get("keyless") and p.get("apiType") != "local"]
    check("registry.keyless_nonlocal_5plus",
          len(keyless_nonlocal) >= 5, f"only {len(keyless_nonlocal)}")

    # no committed secrets
    secret_pats = ["sk-", "ghp_", "gho_", "AIza", "xoxb-", "AKIA",
                   "Bearer ey", "api_key="]
    leaks = [pat for pat in secret_pats if pat in raw]
    check("registry.no_committed_secrets", not leaks, str(leaks))

    # ── friendly error mapping ──────────────────────────────────────────
    for code in (401, 402, 429, 404, 500):
        msg = fa.friendly_error(code)
        check(f"error.map_{code}", "/" in msg and len(msg) > 3)
    check("error.map_402_zh", "余额" in fa.friendly_error(402))
    check("error.map_429_zh", "限流" in fa.friendly_error(429))
    check("error.map_401_zh", "密钥" in fa.friendly_error(401))
    check("error.map_500_zh", "异常" in fa.friendly_error(500))
    check("error.map_unknown", fa.friendly_error(999).startswith("上游返回错误"))

    # ── URL derivation ──────────────────────────────────────────────────
    p = fa.pool.get("groq")
    check("url.chat_derived",
          fa.FreeAIPool.chat_url(p) == "https://api.groq.com/openai/v1/chat/completions")
    check("url.models_derived",
          fa.FreeAIPool.models_url(p) == "https://api.groq.com/openai/v1/models")
    pol = fa.pool.get("pollinations")
    check("url.chat_override",
          fa.FreeAIPool.chat_url(pol) == "https://text.pollinations.ai/openai")

    # ── availability & key loading ──────────────────────────────────────
    fresh = fa.FreeAIPool(env={})
    avail = fresh.available()
    check("avail.keyless_only_when_no_keys",
          all(p.get("keyless") for p in avail))
    check("avail.sorted_by_priority",
          [int(p["priority"]) for p in avail]
          == sorted(int(p["priority"]) for p in avail))
    check("avail.includes_pollinations",
          any(p["id"] == "pollinations" for p in avail))

    # a keyed provider becomes ready when its env key is present
    env_with = dict(os.environ)
    env_with["GROQ_API_KEY"] = "gsk_test_123"
    keyed = fa.FreeAIPool(env=env_with)
    check("avail.env_key_ready", keyed.ready(fa.pool.get("groq")))
    check("avail.keyed_provider_listed",
          any(p["id"] == "groq" for p in keyed.available()))

    # FREE_AI_KEYS blob override
    blob_env = dict(os.environ)
    blob_env["FREE_AI_KEYS"] = json.dumps({"mistral": "mist_test_abc"})
    blobbed = fa.FreeAIPool(env=blob_env)
    check("avail.blob_key_ready", blobbed.ready(fa.pool.get("mistral")))

    # child-safety filter excludes may-train providers
    safe = fresh.available(child_safe=True)
    check("avail.child_safe_excludes_may_train",
          all(fresh.child_safe(p) for p in safe))
    check("avail.child_safe_subset", len(safe) <= len(fresh.available()))

    # ── content extraction ──────────────────────────────────────────────
    openai_shaped = {"choices": [{"message": {"role": "assistant",
                                              "content": "hi there"}}]}
    check("extract.openai_shaped",
          fa.FreeAIPool._extract_content(openai_shaped) == "hi there")
    flat = {"content": "direct answer"}
    check("extract.flat_content",
          fa.FreeAIPool._extract_content(flat) == "direct answer")
    empty = {}
    check("extract.empty", fa.FreeAIPool._extract_content(empty) == "")

    # ── chat(): success via stubbed HTTP ────────────────────────────────
    tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False,
                                       encoding="utf-8")
    json.dump([
        {"id": "fake-a", "name": "Fake A", "baseUrl": "https://a.example/v1",
         "apiType": "openai-compatible", "keyless": True, "keyOptional": False,
         "keyEnv": "", "keyUrl": "", "defaultModel": "m-a",
         "freeModels": ["m-a"], "freeTier": "t", "creditCard": False,
         "signup": False, "regions": ["global"], "modalities": ["text"],
         "dataUse": "no-train", "euHosted": False, "priority": 1,
         "status": "listed"},
        {"id": "fake-b", "name": "Fake B", "baseUrl": "https://b.example/v1",
         "apiType": "openai-compatible", "keyless": True, "keyOptional": False,
         "keyEnv": "", "keyUrl": "", "defaultModel": "m-b",
         "freeModels": ["m-b"], "freeTier": "t", "creditCard": False,
         "signup": False, "regions": ["global"], "modalities": ["text"],
         "dataUse": "no-train", "euHosted": False, "priority": 2,
         "status": "listed"},
    ], tmp)
    tmp.close()

    stub_pool = fa.FreeAIPool(registry_path=tmp.name, env={})

    def _ok_post(url, headers, payload, timeout):
        return {"choices": [{"message": {"content": "stub answer"}}],
                "usage": {"total_tokens": 5}}

    stub_pool._post = _ok_post
    res = stub_pool.chat([{"role": "user", "content": "q"}], max_providers=2)
    check("chat.success", res["ok"] is True)
    check("chat.success_provider", res["provider"] == "fake-a")
    check("chat.success_content", res["content"] == "stub answer")
    check("chat.success_attempts", len(res["attempts"]) == 1)

    # ── chat(): ordered failover (429 then success) ────────────────────
    calls = {"n": 0}

    def _flaky_post(url, headers, payload, timeout):
        calls["n"] += 1
        if calls["n"] == 1:
            raise urllib.error.HTTPError(url, 429, "Too Many Requests",
                                         {}, io.BytesIO(b"slow down"))
        return {"choices": [{"message": {"content": "after retry"}}]}

    stub_pool._post = _flaky_post
    res2 = stub_pool.chat([{"role": "user", "content": "q"}], max_providers=2)
    check("chat.failover_ok", res2["ok"] is True)
    check("chat.failover_provider", res2["provider"] == "fake-b")
    check("chat.failover_two_attempts", len(res2["attempts"]) == 2)
    check("chat.failover_429_recorded",
          res2["attempts"][0].get("status") == 429)
    check("chat.failover_translated",
          "限流" in (res2["attempts"][0].get("error") or ""))

    # ── chat(): all providers fail -> never fabricates ──────────────────
    def _dead_post(url, headers, payload, timeout):
        raise urllib.error.HTTPError(url, 503, "down", {}, io.BytesIO(b""))

    stub_pool._post = _dead_post
    res3 = stub_pool.chat([{"role": "user", "content": "q"}], max_providers=2)
    check("chat.allfail_not_ok", res3["ok"] is False)
    check("chat.allfail_no_content", res3.get("content") == "")
    check("chat.allfail_error_present", bool(res3.get("error")))
    check("chat.allfail_attempts", len(res3["attempts"]) == 2)

    # ── FreeCreditMeter ────────────────────────────────────────────────
    m = fa.FreeCreditMeter(env={})
    check("meter.trial_limit", m.limit("trial") == 20)
    check("meter.pro_limit", m.limit("SUB-PRO-M") == 1000)
    check("meter.unknown_plan_falls_back", m.limit("nope") == 20)
    g1 = m.consume("hh-1", "trial")
    check("meter.first_consume", g1["allowed"] is True and g1["used"] == 1)
    for _ in range(19):
        m.consume("hh-1", "trial")
    st = m.status("hh-1", "trial")
    check("meter.cap_reached", st["used"] == 20 and st["remaining"] == 0)
    check("meter.not_allowed_after_cap", st["allowed"] is False)
    g2 = m.consume("hh-1", "trial")
    check("meter.consume_denied_at_cap", g2["allowed"] is False)
    # day rollover resets
    m._today = lambda: "2026-01-02"
    st2 = m.status("hh-1", "trial")
    check("meter.rollover_resets", st2["used"] == 0 and st2["allowed"] is True)
    # tier isolation
    m._today = lambda: "2026-01-02"
    m.consume("hh-1", "SUB-PRO-M")
    check("meter.tier_isolation", m.status("hh-1", "trial")["used"] == 0)

    # ── recommend_model ─────────────────────────────────────────────────
    rec = fa.recommend_model("chat", child_safe=True)
    check("recommend.has_provider", bool(rec.get("provider")))
    check("recommend.has_model", bool(rec.get("model")))
    check("recommend.from_available",
          rec.get("provider") in [p["id"] for p in fresh.available(child_safe=True)])

    # ── static site integration (ops_cron.build_site) ──────────
    import ops_cron  # noqa: E402

    site_dir = tempfile.mkdtemp(prefix="fai_site_")
    ops_cron.build_site({"ok": True, "cycle": 1, "phases": {}},
                        {"closed": True, "holes": 0, "steps": []},
                        site_dir)
    fa_json_path = os.path.join(site_dir, "api", "free-ai-status.json")
    check("site.free_ai_status_json", os.path.isfile(fa_json_path))
    if os.path.isfile(fa_json_path):
        with open(fa_json_path, encoding="utf-8") as fh:
            fa_json = json.load(fh)
        check("site.free_ai_status_total", fa_json.get("total") == len(registry))
        check("site.free_ai_status_keyless",
              fa_json.get("keyless", 0) >= 5)
    with open(os.path.join(site_dir, "index.html"), encoding="utf-8") as fh:
        idx = fh.read()
    check("site.free_ai_card", "Free AI token pool" in idx)
    check("site.free_ai_allowance_copy", "free daily AI allowance" in idx)
    check("site.free_ai_api_link", "free-ai-status.json" in idx)

    # ── router ──────────────────────────────────────────────────────────
    router = fa.create_free_ai_router(pool_=fresh, meter_=m)
    paths = sorted({getattr(r, "path", "") for r in router.routes})
    check("router.providers_route", "/api/free-ai/providers" in paths)
    check("router.status_route", "/api/free-ai/status" in paths)
    check("router.credits_route",
          "/api/free-ai/credits/{household_id}" in paths)
    check("router.chat_route", "/api/free-ai/chat" in paths)

    from fastapi.testclient import TestClient  # noqa: E402
    from fastapi import FastAPI  # noqa: E402

    client_app = FastAPI()
    client_app.include_router(router)
    client = TestClient(client_app)

    r1 = client.get("/api/free-ai/providers")
    check("api.providers_200", r1.status_code == 200)
    j1 = r1.json()
    check("api.providers_count", j1.get("count") == len(registry))
    check("api.providers_no_secrets",
          "Authorization" not in json.dumps(j1))

    r2 = client.get("/api/free-ai/status")
    check("api.status_200", r2.status_code == 200)
    j2 = r2.json()
    check("api.status_total", j2.get("total") == len(registry))
    check("api.status_has_daily_allowance", "daily_allowance" in j2)

    r3 = client.get("/api/free-ai/credits/hh-1?plan=trial")
    check("api.credits_200", r3.status_code == 200)
    check("api.credits_shape",
          "remaining" in r3.json() and "limit" in r3.json())

    # chat with a stubbed pool so no network is used
    chat_pool = fa.FreeAIPool(registry_path=tmp.name, env={})
    chat_pool._post = _ok_post
    chat_meter = fa.FreeCreditMeter(env={})
    chat_router = fa.create_free_ai_router(pool_=chat_pool, meter_=chat_meter)
    chat_app = FastAPI()
    chat_app.include_router(chat_router)
    chat_client = TestClient(chat_app)

    r4 = chat_client.post("/api/free-ai/chat",
                           json={"messages": [{"role": "user",
                                               "content": "hello"}]})
    check("api.chat_200", r4.status_code == 200)
    j4 = r4.json()
    check("api.chat_ok", j4.get("ok") is True)
    check("api.chat_content", j4.get("content") == "stub answer")
    check("api.chat_credits_deducted",
          (j4.get("credits") or {}).get("used") == 1)

    # daily allowance enforced
    tiny = fa.FreeCreditMeter(limits={"anonymous": 1}, env={})
    tiny_router = fa.create_free_ai_router(pool_=chat_pool, meter_=tiny)
    tiny_app = FastAPI()
    tiny_app.include_router(tiny_router)
    tiny_client = TestClient(tiny_app)
    tiny_client.post("/api/free-ai/chat",
                     json={"messages": [{"role": "user", "content": "x"}]})
    r5 = tiny_client.post("/api/free-ai/chat",
                          json={"messages": [{"role": "user", "content": "y"}]})
    check("api.chat_daily_limit",
          r5.json().get("ok") is False and "额度" in r5.json().get("error", ""))

    # failed chat does not burn the allowance
    dead_pool = fa.FreeAIPool(registry_path=tmp.name, env={})
    dead_pool._post = _dead_post
    dead_meter = fa.FreeCreditMeter(env={})
    dead_router = fa.create_free_ai_router(pool_=dead_pool, meter_=dead_meter)
    dead_app = FastAPI()
    dead_app.include_router(dead_router)
    dead_client = TestClient(dead_app)
    dead_client.post("/api/free-ai/chat",
                     json={"messages": [{"role": "user", "content": "x"}]})
    check("api.chat_fail_refunds",
          dead_meter.status("anon:testclient", "anonymous")["used"] == 0)

    # locked mode: FREE_AI_PUBLIC=0 requires the access key
    os.environ["FREE_AI_PUBLIC"] = "0"
    os.environ["FREE_AI_ACCESS_KEY"] = "secret123"
    locked_router = fa.create_free_ai_router(pool_=chat_pool, meter_=chat_meter)
    locked_app = FastAPI()
    locked_app.include_router(locked_router)
    locked_client = TestClient(locked_app)
    r6 = locked_client.get("/api/free-ai/credits/hh-1")
    check("api.locked_denies", r6.json().get("ok") is False)
    r7 = locked_client.get("/api/free-ai/credits/hh-1",
                           headers={"x-free-ai-key": "secret123"})
    check("api.locked_allows_with_key", r7.json().get("ok") is True)
    r8 = locked_client.post("/api/free-ai/chat",
                            json={"messages": [{"role": "user",
                                                "content": "x"}]})
    check("api.locked_chat_denied", r8.json().get("ok") is False)

finally:
    restore_env()
    try:
        os.unlink(tmp.name)
    except OSError:
        pass

ok = sum(1 for _, v in R if v)
print(f"\n{'=' * 60}\nFree AI: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v in R:
    if not v:
        print("  FAILED:", n)
sys.exit(0 if ok == len(R) else 1)
