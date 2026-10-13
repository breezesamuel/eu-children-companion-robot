"""Tests for the 24/7 cloud Live API leg.

Covers the deterministic contract that ties three pieces together:

  * `.github/workflows/live-api.yml` — the scheduled cloud runner that serves
    the app + Cloudflare quick tunnel and mirrors the endpoint.
  * `scripts/ops_cron.py` — the loop publisher that surfaces the endpoint in
    the static site (`api/live.json` + `status.json.live_api_url` + the stable
    `/live/` front door) and refuses to advertise a stale heartbeat.
  * `.github/workflows/deploy.yml` — the uptime probe that follows the
    advertised endpoint.

No network access is used: the mirror lookup only calls out when
GITHUB_REPOSITORY is set, and the stale-mirror test stubs `urlopen`.
"""
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
os.chdir(ROOT)

import logging  # noqa: E402
logging.disable(logging.CRITICAL)

import ops_cron  # noqa: E402

R = []


def check(name, cond, detail=""):
    R.append((name, bool(cond)))
    print(f"[{'OK' if cond else 'XX'}] {name} {detail if not cond else ''}")


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as fh:
        return fh.read()


cycle = {"ok": True, "cycle": 1, "phases": {"engage": {"summary": {}}}}
closure = {"closed": True, "holes": 0, "steps": []}

saved = {k: os.environ.pop(k, None) for k in ("LIVE_URL", "GITHUB_REPOSITORY")}
try:
    # ── no endpoint advertised ─────────────────────────────────────────────
    out1 = tempfile.mkdtemp(prefix="live_none_")
    ops_cron.build_site(cycle, closure, out1)
    s1 = json.load(open(os.path.join(out1, "api", "status.json"), encoding="utf-8"))
    l1 = json.load(open(os.path.join(out1, "api", "live.json"), encoding="utf-8"))
    check("discover.none_without_env", ops_cron.discover_live_url() == "")
    check("status.live_api_url_none", s1.get("live_api_url") is None, str(s1.get("live_api_url")))
    check("live.url_none", l1.get("url") is None, str(l1.get("url")))
    check("live.has_health_path", l1.get("health_path") == "/health/live")
    lv1 = os.path.join(out1, "live", "index.html")
    check("live.frontdoor_none_exists", os.path.isfile(lv1))
    if os.path.isfile(lv1):
        with open(lv1, encoding="utf-8") as fh:
            lv1_html = fh.read()
        check("live.frontdoor_none_message",
              "No live endpoint is currently advertised" in lv1_html)
        check("live.frontdoor_none_fallback", "../api/live.json" in lv1_html)

    # ── endpoint advertised via LIVE_URL ───────────────────────────────────
    os.environ["LIVE_URL"] = "https://abc-def.trycloudflare.com/"
    out2 = tempfile.mkdtemp(prefix="live_set_")
    ops_cron.build_site(cycle, closure, out2)
    s2 = json.load(open(os.path.join(out2, "api", "status.json"), encoding="utf-8"))
    l2 = json.load(open(os.path.join(out2, "api", "live.json"), encoding="utf-8"))
    check("discover.from_env", ops_cron.discover_live_url() == "https://abc-def.trycloudflare.com")
    check("status.live_api_url_set",
          s2.get("live_api_url") == "https://abc-def.trycloudflare.com",
          str(s2.get("live_api_url")))
    check("live.url_set",
          l2.get("url") == "https://abc-def.trycloudflare.com", str(l2.get("url")))
    check("live.trailing_slash_stripped", not l2["url"].endswith("/"))
    with open(os.path.join(out2, "index.html"), encoding="utf-8") as fh:
        html = fh.read()
    check("html.shows_endpoint", "abc-def.trycloudflare.com" in html)
    check("html.links_live_json", "api/live.json" in html)
    check("html.cta_frontdoor", "href='live/'" in html)
    lv2 = os.path.join(out2, "live", "index.html")
    check("live.frontdoor_set_exists", os.path.isfile(lv2))
    if os.path.isfile(lv2):
        with open(lv2, encoding="utf-8") as fh:
            lv2_html = fh.read()
        check("live.frontdoor_hardcodes", "abc-def.trycloudflare.com" in lv2_html)
        check("live.frontdoor_fallback", "../api/live.json" in lv2_html)
        check("live.frontdoor_redirects", "window.location.replace" in lv2_html)

    # ── customer storefront ────────────────────────────────────────────────
    plan_cycle = {"ok": True, "cycle": 2, "phases": {"engage": {"status": "ok", "summary": {
        "revenue_plan": {"unit_economics_cents": {"robot_price": 29900,
                                                  "blended_arpu_month": 3590.0}}}}}}
    out4 = tempfile.mkdtemp(prefix="live_store_")
    ops_cron.build_store(plan_cycle, out4, "https://abc-def.trycloudflare.com")
    sp = os.path.join(out4, "store", "index.html")
    check("store.exists", os.path.isfile(sp))
    if os.path.isfile(sp):
        with open(sp, encoding="utf-8") as fh:
            store_html = fh.read()
        check("store.robot_price", "299.00" in store_html)
        check("store.plan_std", "29.90" in store_html)
        check("store.plan_pro", "49.90" in store_html)
        check("store.cta_live", "../live/" in store_html)
        check("store.eu_compliance", "GDPR" in store_html and "EU AI Act" in store_html)
        check("store.languages", "Deutsch" in store_html and "Español" in store_html)
        check("store.no_fake_traction", "reviews" not in store_html.lower()
              and "rating" not in store_html.lower())
    check("dashboard.links_store", "href='store/'" in html)

    # ── a stale mirror is never advertised as live ─────────────────────────
    os.environ.pop("LIVE_URL", None)
    os.environ["GITHUB_REPOSITORY"] = "breezesamuel/eu-children-companion-robot"
    import urllib.request as _u
    import datetime as _d
    real_urlopen = _u.urlopen

    class _Resp:
        def __init__(self, payload):
            self._p = payload
        def read(self):
            return self._p
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False

    def _fake(payload):
        def _opener(req, *a, **k):
            return _Resp(json.dumps(payload).encode())
        return _opener

    fresh = _d.datetime.now(_d.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    old = (_d.datetime.now(_d.timezone.utc) - _d.timedelta(hours=3)).strftime(
        "%Y-%m-%dT%H:%M:%SZ")
    try:
        _u.urlopen = _fake({"url": "https://live.example.com", "updated_at": fresh})
        m1 = ops_cron.discover_live()
        check("mirror.fresh_url", m1.get("url") == "https://live.example.com", str(m1))
        check("mirror.fresh_not_stale", m1.get("stale") is False)
        check("mirror.fresh_advertised",
              ops_cron.discover_live_url() == "https://live.example.com")
        _u.urlopen = _fake({"url": "https://live.example.com", "updated_at": old})
        m2 = ops_cron.discover_live()
        check("mirror.stale_flagged", m2.get("stale") is True, str(m2))
        check("mirror.stale_not_advertised", ops_cron.discover_live_url() == "")
        out3 = tempfile.mkdtemp(prefix="live_stale_")
        ops_cron.build_site(cycle, closure, out3)
        s3 = json.load(open(os.path.join(out3, "api", "status.json"), encoding="utf-8"))
        l3 = json.load(open(os.path.join(out3, "api", "live.json"), encoding="utf-8"))
        check("stale.status_flag", s3.get("live_api_stale") is True)
        check("stale.status_url_none", s3.get("live_api_url") is None)
        check("stale.live_json_stale", l3.get("stale") is True)
        with open(os.path.join(out3, "index.html"), encoding="utf-8") as fh:
            h3 = fh.read()
        check("stale.page_warns", "heartbeat is stale" in h3)
    finally:
        _u.urlopen = real_urlopen
finally:
    for k, v in saved.items():
        if v is not None:
            os.environ[k] = v
        else:
            os.environ.pop(k, None)

# ── workflow wiring ────────────────────────────────────────────────────────
live_wf = read(".github/workflows/live-api.yml")
check("wf.live_api.exists", "Live API (24-7 public)" in live_wf)
check("wf.live_api.scheduled", "cron:" in live_wf)
check("wf.live_api.uses_runner", "scripts/live_runner.py" in live_wf)
check("wf.live_api.mirrors_status", "live-status" in live_wf)
check("wf.live_api.verifies_health", "/health/live" in live_wf)
check("wf.live_api.writes_capable", "contents: write" in live_wf)
check("wf.live_api.frequent_cron", "*/30 * * * *" in live_wf)
check("wf.live_api.self_healing", "cancel-in-progress: false" in live_wf)
check("wf.live_api.pip_cache", "cache: pip" in live_wf)
check("wf.live_api.per_event_group", "github.event_name" in live_wf)

loop_wf = read(".github/workflows/autonomous-loop.yml")
check("wf.loop.passes_live_url", "LIVE_URL: ${{ vars.LIVE_URL }}" in loop_wf)

check("wf.live_api.admin_secret", "ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}" in live_wf)

deploy_wf = read(".github/workflows/deploy.yml")
check("wf.deploy.probes_live", "api/live.json" in deploy_wf)
check("wf.deploy.probe_nonblocking", "continue-on-error: true" in deploy_wf)

ok = sum(1 for _, v in R if v)
print(f"\n{'='*60}\nLive API: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v in R:
    if not v:
        print("  FAILED:", n)
sys.exit(0 if ok == len(R) else 1)
