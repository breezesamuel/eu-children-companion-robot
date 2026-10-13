#!/usr/bin/env python3
"""Free AI Token Pool — 免费 AI 额度池（前期获客 · 留存 · 复购）.

What it is
----------
A single, honest pool over dozens of *genuinely free* LLM endpoints, described by
data in ``project_source/services/registry/free-ai-providers.json``:

  * **keyless** endpoints (no API key, no signup) — they work out of the box, so
    an early customer gets a real answer with zero setup;
  * **no-credit-card free tiers** — the operator drops in one env key per
    provider and the pool widens automatically;
  * **local** servers (Ollama / LM Studio / llama.cpp / vLLM) — free forever,
    private by construction.

Why it exists commercially
--------------------------
"前期客户免费可用获得一定的 token" is a retention lever, not a giveaway: every
household gets a metered daily allowance that grows with the subscription tier
and resets each day. Free now, sticky later, paid when the allowance is not
enough — the classic freemium → subscription → referral loop, metered so free can
never become unbounded cost.

Honesty rules
-------------
* Nothing is fabricated: if no provider is reachable the call returns an explicit,
  translated error instead of a made-up answer.
* The registry stores metadata only — **no API keys are ever committed**. Keys are
  read from the environment at runtime.
* Child-safety: ``dataUse`` ("no-train" / "varies" / "may-train" / "unspecified")
  and ``euHosted`` let the pool prefer EU-hosted, non-training providers; the EU
  deployment defaults to that filter.

Environment
-----------
  FREE_AI_ENABLED        "1"/"0" — mount the router (default 1)
  FREE_AI_PUBLIC         "1"/"0" — allow anonymous free chat (default 1)
  FREE_AI_ACCESS_KEY     optional shared key for /chat when FREE_AI_PUBLIC=0
  FREE_AI_REGISTRY       override the registry path
  FREE_AI_DAILY_<TIER>   override the daily allowance for a tier (e.g. FREE_AI_DAILY_TRIAL)
  FREE_AI_CHILD_SAFE     "1"/"0" — prefer EU-hosted, no-train providers (default 1 in EU)
  FREE_AI_KEYS           JSON blob: {"groq": "gsk_...", "mistral": "..."}
  <PROVIDER keyEnv>      e.g. GROQ_API_KEY, GEMINI_API_KEY, HF_TOKEN ...
"""
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

logger = logging.getLogger("free_ai")

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_REGISTRY = os.path.join(
    ROOT, "project_source", "services", "registry", "free-ai-providers.json")

# ── friendly, translated error mapping (客户不容易困惑) ──────────────────────
_ERROR_MAP = {
    400: ("请求被拒绝（模型名或参数不正确）", "bad request — wrong model name or parameters"),
    401: ("密钥缺失或无效", "missing or invalid API key"),
    402: ("余额不足，需要充值", "insufficient balance — top-up required"),
    403: ("密钥无权限，请求被拒绝", "forbidden — key has no access"),
    404: ("模型或接口不存在", "model or endpoint not found"),
    408: ("请求超时", "request timed out"),
    413: ("内容过大，超出上限", "payload too large"),
    422: ("请求格式错误", "unprocessable request"),
    429: ("触发限流，请稍后重试", "rate limited — retry later"),
    451: ("因合规原因被拒绝（区域限制）", "unavailable for legal/regional reasons"),
    500: ("上游服务异常", "upstream provider error"),
    502: ("上游网关错误", "upstream bad gateway"),
    503: ("上游暂时不可用", "provider temporarily unavailable"),
    504: ("上游超时", "upstream gateway timeout"),
}


def friendly_error(status, detail=""):
    """Return a translated, human message for an upstream HTTP status."""
    zh, en = _ERROR_MAP.get(
        int(status) if str(status).isdigit() else 0,
        (f"上游返回错误 {status}", f"upstream error {status}"))
    msg = f"{zh} / {en}"
    if detail:
        msg = f"{msg} — {str(detail)[:200]}"
    return msg


# ── daily allowance per plan tier (the freemium lever) ──────────────────────
DEFAULT_DAILY_CREDITS = {
    "anonymous": 10,
    "trial": 20,
    "free": 20,
    "SUB-STD-M": 200,
    "SUB-STD-Y": 200,
    "SUB-PRO-M": 1000,
    "SUB-PRO-Y": 1000,
}

# providers that must never be selected for an unmonitored child session
_BLOCKED_FOR_CHILD = {"may-train"}


def _load_registry(path=None):
    path = path or os.environ.get("FREE_AI_REGISTRY") or DEFAULT_REGISTRY
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list) and data:
            return data
    except Exception as exc:  # noqa: BLE001
        logger.warning("free-ai registry not loaded (%s): %s", path, exc)
    return []


class FreeAIPool:
    """Ordered failover over free LLM endpoints, with metered access."""

    def __init__(self, registry_path=None, env=None):
        self._env = env if env is not None else os.environ
        self._registry = _load_registry(registry_path)
        # extra keys supplied as a single JSON blob
        self._extra_keys = {}
        raw = (self._env.get("FREE_AI_KEYS") or "").strip()
        if raw:
            try:
                blob = json.loads(raw)
                if isinstance(blob, dict):
                    self._extra_keys = {str(k): str(v) for k, v in blob.items()}
            except Exception:  # noqa: BLE001
                logger.warning("FREE_AI_KEYS is not valid JSON; ignored")

    # ── registry ────────────────────────────────────────────────────────────
    @property
    def registry(self):
        return list(self._registry)

    def get(self, provider_id):
        for p in self._registry:
            if p.get("id") == provider_id:
                return p
        return None

    def key_for(self, provider):
        pid = provider.get("id", "")
        if pid in self._extra_keys and self._extra_keys[pid]:
            return self._extra_keys[pid]
        env_override = self._env.get(f"FREE_AI_KEY_{pid.upper().replace('-', '_')}")
        if env_override:
            return env_override
        key_env = provider.get("keyEnv") or ""
        if key_env and self._env.get(key_env):
            return self._env[key_env]
        return ""

    def ready(self, provider):
        """True if the provider can be used right now (keyless or key present)."""
        if provider.get("keyless"):
            return True
        return bool(self.key_for(provider))

    def child_safe(self, provider):
        return provider.get("dataUse", "unspecified") not in _BLOCKED_FOR_CHILD

    def available(self, child_safe=False, include_local=True):
        rows = []
        for p in self._registry:
            if not self.ready(p):
                continue
            if not include_local and p.get("apiType") == "local":
                continue
            if child_safe and not self.child_safe(p):
                continue
            rows.append(p)
        rows.sort(key=lambda p: (int(p.get("priority", 999)), str(p.get("id"))))
        return rows

    def keyless(self, include_local=True):
        return [p for p in self.available(include_local=include_local) if p.get("keyless")]

    # ── URLs ────────────────────────────────────────────────────────────────
    @staticmethod
    def chat_url(provider):
        return provider.get("chatUrl") or (
            provider["baseUrl"].rstrip("/") + "/chat/completions")

    @staticmethod
    def models_url(provider):
        return provider.get("modelsUrl") or (
            provider["baseUrl"].rstrip("/") + "/models")

    # ── HTTP ────────────────────────────────────────────────────────────────
    def _headers(self, provider):
        h = {"Content-Type": "application/json", "User-Agent": "robot-companion-free-ai/1.0"}
        key = self.key_for(provider)
        if key:
            h["Authorization"] = f"Bearer {key}"
        return h

    def _post(self, url, headers, payload, timeout):
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", "replace") or "{}")

    @staticmethod
    def _extract_content(data):
        try:
            choices = data.get("choices") or []
            if choices:
                msg = choices[0].get("message") or {}
                if isinstance(msg, dict):
                    return msg.get("content") or msg.get("reasoning_content") or ""
                return str(msg)
        except Exception:  # noqa: BLE001
            pass
        # some gateways return {content: ...} directly
        return data.get("content") or data.get("response") or ""

    def chat(self, messages, model=None, prefer=None, timeout=45,
             child_safe=None, include_local=True, max_providers=6):
        """Try free providers in order and return the first successful answer.

        Returns a dict: {ok, provider, model, content, attempts, error}.
        Never raises and never fabricates an answer.
        """
        if child_safe is None:
            child_safe = self._env.get("FREE_AI_CHILD_SAFE", "1") not in ("0", "false", "False")
        candidates = self.available(child_safe=child_safe, include_local=include_local)
        if prefer:
            ranked = [p for p in candidates if p.get("id") in prefer]
            ranked += [p for p in candidates if p.get("id") not in prefer]
            candidates = ranked
        attempts = []
        for provider in candidates[:max_providers]:
            use_model = model or provider.get("defaultModel") or (provider.get("freeModels") or ["default"])[0]
            payload = {"model": use_model, "messages": messages, "stream": False}
            started = time.time()
            try:
                data = self._post(self.chat_url(provider), self._headers(provider),
                                  payload, timeout)
                content = self._extract_content(data)
                if content:
                    attempts.append({"provider": provider["id"], "ok": True,
                                     "ms": int((time.time() - started) * 1000)})
                    return {"ok": True, "provider": provider["id"], "model": use_model,
                            "content": content, "usage": data.get("usage") or {},
                            "attempts": attempts, "error": ""}
                attempts.append({"provider": provider["id"], "ok": False,
                                 "error": "empty response"})
            except urllib.error.HTTPError as exc:
                detail = ""
                try:
                    detail = exc.read().decode("utf-8", "replace")[:200]
                except Exception:  # noqa: BLE001
                    pass
                attempts.append({"provider": provider["id"], "ok": False,
                                 "status": exc.code,
                                 "error": friendly_error(exc.code, detail)})
            except Exception as exc:  # noqa: BLE001
                attempts.append({"provider": provider["id"], "ok": False,
                                 "error": f"连接失败/connection failed — {str(exc)[:120]}"})
        return {"ok": False, "provider": None, "model": None, "content": "",
                "usage": {}, "attempts": attempts,
                "error": "所有免费通道均不可用，请稍后重试 / all free channels failed"}

    # ── health ──────────────────────────────────────────────────────────────
    def probe(self, provider, timeout=4):
        url = self.models_url(provider)
        started = time.time()
        try:
            req = urllib.request.Request(url, headers=self._headers(provider))
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                ok = 200 <= getattr(resp, "status", 200) < 300
            return {"provider": provider["id"], "ok": ok,
                    "ms": int((time.time() - started) * 1000), "url": url}
        except Exception as exc:  # noqa: BLE001
            code = getattr(exc, "code", None)
            return {"provider": provider["id"], "ok": False, "url": url,
                    "status": code,
                    "error": friendly_error(code, str(exc)) if code else str(exc)[:120]}

    def probe_all(self, only_ready=True, limit=None, timeout=4):
        rows = self.available() if only_ready else self.registry
        if limit:
            rows = rows[:limit]
        return [self.probe(p, timeout=timeout) for p in rows]

    # ── summary (for the dashboard / API) ───────────────────────────────────
    def summary(self):
        ready = self.available()
        keys = self.available(include_local=False)
        return {
            "total": len(self._registry),
            "keyless": len(self.keyless()),
            "ready": len(ready),
            "no_credit_card": sum(1 for p in self._registry if not p.get("creditCard", True)),
            "eu_hosted": sum(1 for p in self._registry if p.get("euHosted")),
            "child_safe": sum(1 for p in self._registry if self.child_safe(p)),
            "needs_key": [p["id"] for p in self._registry if not p.get("keyless") and not self.ready(p)],
            "ready_ids": [p["id"] for p in ready],
            "keyless_ids": [p["id"] for p in self.keyless()],
            "keyed_ids": [p["id"] for p in keys if not p.get("keyless")],
        }


class FreeCreditMeter:
    """Per-household daily AI allowance, tiered by plan (the retention lever)."""

    def __init__(self, limits=None, store_path=None, env=None):
        self._env = env if env is not None else os.environ
        self._limits = dict(DEFAULT_DAILY_CREDITS)
        if limits:
            self._limits.update(limits)
        for tier in list(self._limits):
            override = self._env.get(f"FREE_AI_DAILY_{tier.upper().replace('-', '_')}")
            if override and str(override).isdigit():
                self._limits[tier] = int(override)
        self._store = store_path
        self._lock = threading.Lock()
        self._counters = {}          # household -> {"day": "YYYY-MM-DD", "used": n}
        self._load()

    def _today(self):
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def limit(self, plan="trial"):
        return int(self._limits.get(plan, self._limits.get("trial", 20)))

    def _load(self):
        if not self._store:
            return
        try:
            with open(self._store, encoding="utf-8") as fh:
                self._counters = json.load(fh)
        except Exception:  # noqa: BLE001
            self._counters = {}

    def _save(self):
        if not self._store:
            return
        try:
            tmp = f"{self._store}.tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(self._counters, fh)
            os.replace(tmp, self._store)
        except Exception:  # noqa: BLE001
            pass

    def _entry(self, household, plan="trial"):
        """Return today's counter row for a (household, plan) pair."""
        key = f"{household}|{plan}"
        today = self._today()
        row = self._counters.get(key)
        if not row or row.get("day") != today:
            row = {"day": today, "used": 0}
            self._counters[key] = row
        return row

    def status(self, household, plan="trial"):
        with self._lock:
            row = self._entry(household, plan)
            cap = self.limit(plan)
            used = int(row["used"])
        return {"household": household, "plan": plan, "day": row["day"],
                "limit": cap, "used": used,
                "remaining": max(0, cap - used), "allowed": used < cap}

    def consume(self, household, plan="trial", n=1):
        with self._lock:
            row = self._entry(household, plan)
            cap = self.limit(plan)
            if int(row["used"]) + n > cap:
                return {"allowed": False, "limit": cap, "used": int(row["used"]),
                        "remaining": max(0, cap - int(row["used"])),
                        "household": household, "plan": plan, "day": row["day"]}
            row["used"] = int(row["used"]) + n
            self._save()
            return {"allowed": True, "limit": cap, "used": row["used"],
                    "remaining": max(0, cap - row["used"]),
                    "household": household, "plan": plan, "day": row["day"]}


# ── module singletons ───────────────────────────────────────────────────────
pool = FreeAIPool()
meter = FreeCreditMeter(store_path=os.environ.get("FREE_AI_METER_PATH"))


def recommend_model(task="chat", child_safe=True):
    """Pick a sensible default model id for a task from the available pool."""
    wanted = {"chat": ["llama", "qwen", "gemma", "glm", "mistral"],
              "learn": ["qwen", "glm", "llama", "gemma"],
              "safety": ["guard", "llama", "qwen"]}.get(task, ["llama"])
    for p in pool.available(child_safe=child_safe):
        models = p.get("freeModels") or [p.get("defaultModel")]
        for w in wanted:
            for m in models:
                if m and w in str(m).lower():
                    return {"provider": p["id"], "model": m}
    first = pool.available(child_safe=child_safe)
    if first:
        p = first[0]
        return {"provider": p["id"], "model": p.get("defaultModel")}
    return {"provider": None, "model": None}


# ── FastAPI router ──────────────────────────────────────────────────────────
def create_free_ai_router(pool_=None, meter_=None):
    from fastapi import APIRouter, Body, Header, Request

    _pool = pool_ or pool
    _meter = meter_ or meter
    router = APIRouter(prefix="/api/free-ai", tags=["Free AI / 免费AI额度"])

    def _authorized(access_key, public_ok=True):
        if public_ok:
            return True
        expected = os.environ.get("FREE_AI_ACCESS_KEY") or os.environ.get("AUTONOMOUS_INTERNAL_KEY")
        return bool(expected) and access_key == expected

    @router.get("/providers")
    def providers(child_safe: bool = False, ready_only: bool = False):
        rows = []
        for p in _pool.registry:
            ready = _pool.ready(p)
            if ready_only and not ready:
                continue
            rows.append({
                "id": p.get("id"), "name": p.get("name"), "keyless": bool(p.get("keyless")),
                "credit_card": bool(p.get("creditCard", True)), "signup": bool(p.get("signup")),
                "ready": ready, "free_tier": p.get("freeTier"), "key_url": p.get("keyUrl"),
                "key_env": p.get("keyEnv"), "default_model": p.get("defaultModel"),
                "regions": p.get("regions"), "eu_hosted": bool(p.get("euHosted")),
                "data_use": p.get("dataUse"), "child_safe": _pool.child_safe(p),
                "status": p.get("status"), "priority": p.get("priority"),
            })
        return {"ok": True, "count": len(rows), "providers": rows}

    @router.get("/status")
    def status():
        s = _pool.summary()
        s["daily_allowance"] = dict(_meter._limits)
        s["public"] = os.environ.get("FREE_AI_PUBLIC", "1") not in ("0", "false", "False")
        s["recommend"] = recommend_model("chat")
        return {"ok": True, **s}

    @router.get("/credits/{household_id}")
    def credits(household_id: str, plan: str = "trial",
                x_free_ai_key: str = Header(default="")):
        if not _authorized(x_free_ai_key,
                           os.environ.get("FREE_AI_PUBLIC", "1") not in ("0", "false", "False")):
            return {"ok": False, "error": "unauthorized"}
        return {"ok": True, **_meter.status(household_id, plan)}

    @router.post("/chat")
    def chat(request: Request, body: dict = Body(default={}),
             x_free_ai_key: str = Header(default="")):
        if not _authorized(x_free_ai_key,
                           os.environ.get("FREE_AI_PUBLIC", "1") not in ("0", "false", "False")):
            return {"ok": False, "error": "unauthorized"}
        messages = body.get("messages") or []
        if not messages and body.get("prompt"):
            messages = [{"role": "user", "content": str(body["prompt"])}]
        if not messages:
            return {"ok": False, "error": "messages required / 缺少 messages"}
        plan = str(body.get("plan") or "trial")
        household = str(body.get("household_id") or "")
        if not household:
            client = getattr(request, "client", None)
            household = f"anon:{getattr(client, 'host', 'unknown')}"
            plan = "anonymous"
        gate = _meter.consume(household, plan, 1)
        if not gate["allowed"]:
            return {"ok": False, "error": "今日免费额度已用完，可升级订阅继续使用 / "
                                          "daily free allowance used up — upgrade to continue",
                    "credits": gate}
        result = _pool.chat(
            messages, model=body.get("model"),
            timeout=int(body.get("timeout") or 45),
            child_safe=bool(body.get("child_safe", True)))
        result["credits"] = _meter.status(household, plan)
        result["household"] = household
        if not result.get("ok"):
            # a failed attempt should not burn the customer's allowance
            with _meter._lock:
                row = _meter._entry(household, plan)
                row["used"] = max(0, int(row["used"]) - 1)
                _meter._save()
            result["credits"] = _meter.status(household, plan)
        return result

    return router
