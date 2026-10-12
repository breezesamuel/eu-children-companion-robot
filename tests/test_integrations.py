"""Tests for the evidence integration channels: GitHub Issues, WeCom, DingTalk."""
import sys, os, json, logging
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])
logging.disable(logging.CRITICAL)

import children_integrations as ci

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


# ── 0. ensure clean env for config loading ───────────────────────────────────
for k in ("GITHUB_TOKEN", "GITHUB_REPO", "WECOM_WEBHOOK_URL", "WECOM_WEBHOOK_SECRET",
          "DINGTALK_WEBHOOK_URL", "DINGTALK_WEBHOOK_SECRET"):
    if k in os.environ:
        del os.environ[k]

# now import fresh config
ci.reload_config()


# ── 1. config loading ────────────────────────────────────────────────────────
cfg = ci.CONFIG
check("config.github_token", cfg.github_token == "")
check("config.wecom_url", cfg.wecom_webhook_url == "")
check("config.dingtalk_url", cfg.dingtalk_webhook_url == "")

# with env - reload after setting
os.environ["GITHUB_TOKEN"] = "test"
os.environ["GITHUB_REPO"] = "org/repo"
os.environ["WECOM_WEBHOOK_URL"] = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc"
os.environ["DINGTALK_WEBHOOK_URL"] = "https://oapi.dingtalk.com/robot/send?access_token=xyz"
cfg2 = ci.reload_config()
check("config.env_github", cfg2.github_token == "test")
check("config.env_repo", cfg2.github_repo == "org/repo")
check("config.env_wecom", cfg2.wecom_webhook_url == "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc")
check("config.env_dingtalk", cfg2.dingtalk_webhook_url == "https://oapi.dingtalk.com/robot/send?access_token=xyz")


# ── 2. signatures ────────────────────────────────────────────────────────────
ts = "1234567890"
wecom_sig = ci._sign_wecom("secret", ts)
dingtalk_sig = ci._sign_dingtalk("secret", ts)
check("sign.wecom_deterministic", ci._sign_wecom("secret", ts) == wecom_sig)
check("sign.dingtalk_deterministic", ci._sign_dingtalk("secret", ts) == dingtalk_sig)
check("sign.wecom_changes_with_secret", ci._sign_wecom("other", ts) != wecom_sig)
check("sign.dingtalk_changes_with_secret", ci._sign_dingtalk("other", ts) != dingtalk_sig)
check("sign.wecom_changes_with_ts", ci._sign_wecom("secret", "1234567891") != wecom_sig)
check("sign.dingtalk_changes_with_ts", ci._sign_dingtalk("secret", "1234567891") != dingtalk_sig)


# ── 3. hub enabled flags ─────────────────────────────────────────────────────
# clean env again
for k in ("GITHUB_TOKEN", "GITHUB_REPO", "WECOM_WEBHOOK_URL", "DINGTALK_WEBHOOK_URL"):
    if k in os.environ:
        del os.environ[k]
ci.reload_config()

h = ci.hub
check("hub.disabled_by_default", all(v is False for v in h._enabled.values()))

os.environ["GITHUB_TOKEN"] = "ghp_xxx"
os.environ["GITHUB_REPO"] = "test/repo"
os.environ["WECOM_WEBHOOK_URL"] = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test"
os.environ["DINGTALK_WEBHOOK_URL"] = "https://oapi.dingtalk.com/robot/send?access_token=test"
ci.reload_config()
check("hub.github_enabled", ci.hub._enabled["github"])
check("hub.wecom_enabled", ci.hub._enabled["wecom"])
check("hub.dingtalk_enabled", ci.hub._enabled["dingtalk"])
check("hub.status", ci.hub.status()["enabled"]["github"] and ci.hub.status()["github_repo"] == "test/repo")


# ── 4. payload construction (offline) ────────────────────────────────────────
# Clean env, reload
for k in ("GITHUB_TOKEN", "GITHUB_REPO", "WECOM_WEBHOOK_URL", "DINGTALK_WEBHOOK_URL"):
    if k in os.environ:
        del os.environ[k]
ci.reload_config()

os.environ["GITHUB_TOKEN"] = "ghp_xxx"
os.environ["GITHUB_REPO"] = "test/repo"
os.environ["WECOM_WEBHOOK_URL"] = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test"
os.environ["DINGTALK_WEBHOOK_URL"] = "https://oapi.dingtalk.com/robot/send?access_token=test"
ci.reload_config()

captured = {"github": None, "wecom": None, "dingtalk": None}
orig_post = ci._post

def capture_post(url, payload, headers=None, timeout=10):
    if "github.com" in url:
        captured["github"] = payload
    elif "qyapi.weixin.qq.com" in url:
        captured["wecom"] = payload
    elif "oapi.dingtalk.com" in url:
        captured["dingtalk"] = payload
    return {"ok": True, "status": 200, "body": {"errcode": 0}}

ci._post = capture_post
try:
    ci.hub.post_evidence("Test Title", "Test Body\nLine 2", labels=["evidence", "auto"],
                      channels=["github", "wecom", "dingtalk"])
finally:
    ci._post = orig_post

check("github.payload_title", captured["github"]["title"] == "Test Title")
check("github.payload_body", "Test Body" in captured["github"]["body"])
check("github.payload_labels", set(captured["github"]["labels"]) >= {"evidence", "auto"})
check("wecom.payload_msgtype", captured["wecom"]["msgtype"] == "markdown")
check("wecom.payload_content", "Test Title" in captured["wecom"]["markdown"]["content"])
check("wecom.payload_md_body", "Test Body" in captured["wecom"]["markdown"]["content"])
check("dingtalk.payload_msgtype", captured["dingtalk"]["msgtype"] == "markdown")
check("dingtalk.payload_title", captured["dingtalk"]["markdown"]["title"] == "Test Title")
check("dingtalk.payload_text", "Test Body" in captured["dingtalk"]["markdown"]["text"])


# ── 5. specialized evidence types ────────────────────────────────────────────
captured2 = {"github": None, "wecom": None, "dingtalk": None}
def capture_post2(url, payload, headers=None, timeout=10):
    if "github.com" in url:
        captured2["github"] = payload
    elif "qyapi.weixin.qq.com" in url:
        captured2["wecom"] = payload
    elif "oapi.dingtalk.com" in url:
        captured2["dingtalk"] = payload
    return {"ok": True, "status": 200, "body": {"errcode": 0}}

ci._post = capture_post2
try:
    ci.hub.post_conversion("ORD-12345", 29900, "customer@example.com", "organic")
finally:
    ci._post = orig_post

check("conversion.title", "Conversion" in captured2["github"]["title"])
check("conversion.body_amount", "299.00" in captured2["github"]["body"])
check("conversion.body_order", "ORD-12345" in captured2["github"]["body"])
check("conversion.labels", set(captured2["github"]["labels"]) >= {"conversion", "revenue"})


# ── 6. incident / experiment ─────────────────────────────────────────────────
captured3 = {"github": None, "wecom": None, "dingtalk": None}
def capture_post3(url, payload, headers=None, timeout=10):
    if "github.com" in url:
        captured3["github"] = payload
    elif "qyapi.weixin.qq.com" in url:
        captured3["wecom"] = payload
    elif "oapi.dingtalk.com" in url:
        captured3["dingtalk"] = payload
    return {"ok": True, "status": 200, "body": {"errcode": 0}}

ci._post = capture_post3
try:
    ci.hub.post_incident("critical", "Payment gateway down", "Stripe returned 500", "https://runbook/payment")
finally:
    ci._post = orig_post

check("incident.title_severity", "critical" in captured3["github"]["title"].lower())
check("incident.body_details", "Stripe returned 500" in captured3["github"]["body"])
check("incident.runbook_link", "runbook" in captured3["github"]["body"])
check("incident.labels", set(captured3["github"]["labels"]) >= {"incident", "critical"})

captured4 = {"github": None, "wecom": None, "dingtalk": None}
def capture_post4(url, payload, headers=None, timeout=10):
    if "github.com" in url:
        captured4["github"] = payload
    elif "qyapi.weixin.qq.com" in url:
        captured4["wecom"] = payload
    elif "oapi.dingtalk.com" in url:
        captured4["dingtalk"] = payload
    return {"ok": True, "status": 200, "body": {"errcode": 0}}

ci._post = capture_post4
try:
    ci.hub.post_experiment("checkout_flow", "variant_b", "conversion_rate", 0.142, True)
finally:
    ci._post = orig_post

check("experiment.title", "Experiment" in captured4["github"]["title"])
check("experiment.body_variant", "variant_b" in captured4["github"]["body"])
check("experiment.body_winner", "Yes" in captured4["github"]["body"])
check("experiment.labels", set(captured4["github"]["labels"]) >= {"experiment", "ab-test"})


# ── 7. WeCom / DingTalk helper objects ───────────────────────────────────────
wecom = ci.WeComIntegration("https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test", "secret123")
check("wecom.build_url_has_ts_sign", "timestamp=" in wecom._build_url() and "sign=" in wecom._build_url())
check("wecom.verify_signature", wecom.verify_signature("1234567890", ci._sign_wecom("secret123", "1234567890")))
check("wecom.reject_bad_sign", not wecom.verify_signature("1234567890", "bad"))

dingtalk = ci.DingTalkIntegration("https://oapi.dingtalk.com/robot/send?access_token=test", "secret456")
check("dingtalk.build_url_has_ts_sign", "timestamp=" in dingtalk._build_url() and "sign=" in dingtalk._build_url())
check("dingtalk.verify_signature", dingtalk.verify_signature("1234567890", ci._sign_dingtalk("secret456", "1234567890")))
check("dingtalk.reject_bad_sign", not dingtalk.verify_signature("1234567890", "bad"))

# GitHub integration object
gh = ci.GitHubIntegration("token123", "owner/repo")
check("github.instantiated", gh.token == "token123" and gh.repo == "owner/repo")


# ── 8. FastAPI router mount check ────────────────────────────────────────────
import children_robot_system as m
from starlette.testclient import TestClient
# Use TestClient to verify routes actually serve (handles _IncludedRouter flattening)
with TestClient(m.app) as c:
    def has_route(path, method="GET"):
        r = c.request(method, path)
        return r.status_code != 404
    check("router.status", has_route("/api/integrations/status"))
    check("router.evidence", has_route("/api/integrations/evidence", "POST"))
    check("router.conversion", has_route("/api/integrations/conversion", "POST"))
    check("router.incident", has_route("/api/integrations/incident", "POST"))
    check("router.experiment", has_route("/api/integrations/experiment", "POST"))
    check("router.wecom_cb", has_route("/api/integrations/wecom/callback", "POST"))
    check("router.dingtalk_cb", has_route("/api/integrations/dingtalk/callback", "POST"))


n_fail = sum(1 for _, ok, _ in R if not ok)
print("\n" + "=" * 60)
print(f"Integrations: {len(R)-n_fail}/{len(R)} checks passed, {n_fail} failed")
print("=" * 60)
sys.exit(1 if n_fail else 0)