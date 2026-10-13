#!/usr/bin/env python3
"""Cloud-side 24/7 ops runner + static publisher.

Runs one full autonomous ops cycle and the closure audit, then renders a
self-contained static site (dashboard + JSON API) that can be published to
GitHub Pages. Only the standard library is required for the publisher itself;
the loop it drives needs fastapi/pydantic/httpx (see requirements-ci.txt).

This is the piece that keeps the commercial loop running in the cloud even
when the local machine is switched off.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import html
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _utf8_env(extra: dict | None = None) -> dict:
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    env.setdefault("ROBOT_STAGE", "production")
    env.setdefault("DEPLOYMENT_REGION", "EU")
    env.setdefault("AUTONOMOUS_STATE_BACKEND", "file")
    if extra:
        env.update(extra)
    return env


def _run_json(args: list[str], env: dict, timeout: int = 900) -> tuple[dict | None, str]:
    """Run a script and parse the first JSON object printed on stdout."""
    try:
        p = subprocess.run(args, cwd=ROOT, capture_output=True, env=env, timeout=timeout)
    except Exception as exc:  # noqa: BLE001
        return None, f"exec failed: {exc}"
    out = (p.stdout or b"").decode("utf-8", "replace")
    err = (p.stderr or b"").decode("utf-8", "replace")
    obj = None
    # JSON is emitted starting at column 0; try each line-start brace.
    idx = 0
    while True:
        i = out.find("{", idx)
        if i < 0:
            break
        try:
            obj = json.loads(out[i:])
            break
        except Exception:  # noqa: BLE001
            idx = i + 1
    if obj is None:
        return None, (err or out)[-800:]
    return obj, ""


# --------------------------------------------------------------------------- #
# rendering helpers
# --------------------------------------------------------------------------- #
def esc(v) -> str:
    return html.escape(str(v), quote=True)


def discover_live(stale_after_s: int = 2700) -> dict:
    """Resolve the current public endpoint and its freshness.

    Order: LIVE_URL env (repo variable) -> the `live-status` branch mirror
    published by the Live API workflow. The mirror lookup only happens in a CI
    context (GITHUB_REPOSITORY set) and is fully graceful: any failure yields
    no URL rather than a guessed one. A mirror whose heartbeat is older than
    `stale_after_s` is reported stale so a dead endpoint is never advertised as
    live.
    """
    url = (os.environ.get("LIVE_URL") or "").strip().rstrip("/")
    if url:
        return {"url": url, "updated_at": None, "stale": False, "source": "repo-variable"}
    repo = (os.environ.get("GITHUB_REPOSITORY") or "").strip()
    if not repo:
        return {"url": None, "updated_at": None, "stale": False, "source": "none"}
    import urllib.request
    import datetime as _d
    try:
        req = urllib.request.Request(
            f"https://raw.githubusercontent.com/{repo}/live-status/live.json",
            headers={"User-Agent": "ops-cron"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8", "ignore") or "{}")
        u = (data.get("url") or "").strip().rstrip("/") or None
        upd = data.get("updated_at")
        stale = False
        if upd:
            try:
                t = _d.datetime.strptime(upd, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=_d.timezone.utc)
                stale = (_d.datetime.now(_d.timezone.utc) - t).total_seconds() > stale_after_s
            except Exception:  # noqa: BLE001
                stale = False
        return {"url": u, "updated_at": upd, "stale": stale, "source": "live-status-mirror"}
    except Exception:  # noqa: BLE001
        return {"url": None, "updated_at": None, "stale": False, "source": "unreachable"}


def discover_live_url() -> str:
    """Return the current public endpoint, or "" if none/known-stale."""
    info = discover_live()
    if info.get("stale"):
        return ""
    return info.get("url") or ""


def money_eur(cents) -> str:
    try:
        return "€" + f"{int(cents) / 100:,.2f}"
    except Exception:  # noqa: BLE001
        return str(cents)


def kv_table(d: dict, skip: tuple = ()) -> str:
    rows = []
    for k, v in d.items():
        if k in skip:
            continue
        if isinstance(v, (dict, list)):
            continue
        rows.append(f"<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>")
    return "<table class='kv'>" + "".join(rows) + "</table>"


def card(title: str, body: str, sub: str = "") -> str:
    s = f"<div class='sub'>{esc(sub)}</div>" if sub else ""
    return f"<section class='card'><h2>{esc(title)}</h2>{s}{body}</section>"


def badge(ok: bool, yes: str = "OK", no: str = "FAIL") -> str:
    cls = "ok" if ok else "bad"
    return f"<span class='badge {cls}'>{esc(yes if ok else no)}</span>"


# --------------------------------------------------------------------------- #
# customer-facing storefront
# --------------------------------------------------------------------------- #
SUPPORTED_LANGUAGES = ("en", "de", "fr", "nl", "es", "it")
LANGUAGE_NAMES = {"en": "English", "de": "Deutsch", "fr": "Français",
                  "nl": "Nederlands", "es": "Español", "it": "Italiano"}

_PLAN_LABELS = {"SUB-STD-M": "Standard — monthly", "SUB-STD-Y": "Standard — yearly",
                "SUB-PRO-M": "Pro — monthly", "SUB-PRO-Y": "Pro — yearly"}

# `@@TOKEN@@` template so the CSS braces need no escaping.
_STORE_TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="EU Children Companion Robot — a companion that reads, plays and learns with your child, with data staying in the EU.">
<title>EU Children Companion Robot — bring it home</title>
<style>
:root{--bg:#0b1020;--card:#151b33;--fg:#e8ecff;--mut:#9aa6d0;--ok:#39d98a;--acc:#6c8cff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,Segoe UI,Roboto,sans-serif}
.wrap{max-width:960px;margin:0 auto;padding:32px 22px 64px}
h1{font-size:30px;margin:0 0 6px}
h2{font-size:19px;margin:0 0 6px}
.lede{color:var(--mut);font-size:18px;margin:0 0 22px}
.card{background:var(--card);border:1px solid #26304f;border-radius:14px;padding:20px 22px;margin:14px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
ul{margin:8px 0 0;padding-left:18px}
li{margin:4px 0}
.price{font-size:26px;font-weight:800}
.mut{color:var(--mut)}
.cta{display:inline-block;background:var(--acc);color:#0b1020;font-weight:800;padding:12px 20px;border-radius:12px;text-decoration:none;margin-top:8px}
.badge{display:inline-block;background:#0f2a1f;color:var(--ok);border-radius:999px;padding:2px 10px;font-size:12px;margin-left:6px;vertical-align:middle}
footer{color:var(--mut);font-size:13px;margin-top:28px}
a{color:var(--acc)}
</style></head><body><div class="wrap">
<h1>EU Children Companion Robot <span class="badge">region EU</span></h1>
<p class="lede">A companion that reads, plays and learns with your child — on your terms,
in your language, with the data staying in the EU.</p>
<div class="grid">
  <div class="card">
    <div class="price">@@ROBOT@@</div>
    <div>one-off, incl. VAT display</div>
    <div class="mut">Companion robot · setup in minutes</div>
  </div>
  <div class="card">
    <div class="price">@@PLANS_HEAD@@</div>
    <div>subscription per month</div>
    <div class="mut">Content, updates and parental reports</div>
  </div>
  <div class="card">
    <div class="price">@@LANGS@@</div>
    <div>languages</div>
    <div class="mut">@@LANG_LIST@@</div>
  </div>
</div>
<div class="card">
  <h2>Plans</h2>
  <ul>@@PLAN_ROWS@@</ul>
</div>
<div class="card">
  <h2>Built for EU families</h2>
  <ul>
    <li>Data processed and stored in the EU — GDPR by design.</li>
    <li>Free daily AI credits included — the companion answers from
        day one, no API key or setup needed.</li>
    <li>No advertising to children; no profiling for ads.</li>
    <li>Parental controls and consent management built in.</li>
    <li>Emotion recognition stays off in the EU deployment (EU AI Act aligned).</li>
    <li>Right to erasure and data export honoured from the family console.</li>
  </ul>
</div>
<div class="card">
  <h2>Try it now</h2>
  <p class="mut">The live console runs in the cloud, 24/7, and opens the
  current endpoint automatically.</p>
  <a class="cta" href="@@LIVE@@">Open the live console →</a>
  <a class="cta" href="../api/status.json" style="background:#26304f;color:#e8ecff;margin-left:8px">System status</a>
</div>
<footer>
  Prices and plans are generated from this project's own unit-economics data (@@STAMP@@).<br>
  Hardware ships with a subscription; nothing else is required to try the live console.
</footer>
</div></body></html>
"""


def _plan_prices_cents() -> dict:
    """Monthly plan prices (EU cents) from the single source of truth, or {}.

    `children_revenue_planner` is stdlib-only, so importing it here is cheap and
    safe; any failure degrades to no plan table rather than a wrong price.
    """
    for base in (ROOT, os.path.join(ROOT, "scripts")):
        if base not in sys.path:
            sys.path.insert(0, base)
    try:
        import children_revenue_planner as _rp  # noqa: WPS433
        return dict(getattr(_rp, "PLAN_PRICES_CENTS", {}) or {})
    except Exception:  # noqa: BLE001
        return {}


def eur_price(cents) -> str:
    """Format integer cents as a euro price, e.g. 29900 -> \"299.00 €\"."""
    try:
        return f"{int(cents) / 100:.2f} €"
    except Exception:  # noqa: BLE001
        return ""


def build_store(cycle: dict | None, out_dir: str, live_url: str = "") -> None:
    """Render the customer-facing storefront at `store/index.html`.

    Every number is derived from the loop's own plan output (the revenue plan's
    unit economics + the plan price table) — the page never invents traction,
    reviews or ratings. The primary call to action is the stable `/live/` front
    door, which forwards to the current cloud endpoint.
    """
    eng = (((cycle or {}).get("phases") or {}).get("engage") or {}).get("summary") or {}
    ue = ((eng.get("revenue_plan") or {}).get("unit_economics_cents")) or {}
    robot = ue.get("robot_price")
    blended = ue.get("blended_arpu_month")
    plans = _plan_prices_cents()

    rows = []
    for sku, price in sorted(plans.items()):
        rows.append(f"<li><b>{esc(_PLAN_LABELS.get(sku, sku))}</b> — "
                    f"{esc(eur_price(price))}/month</li>")
    if not rows and blended:
        rows.append(f"<li><b>Subscription</b> — about {esc(eur_price(blended))}/month</li>")
    plan_rows = "".join(rows) or "<li>Plan pricing publishes with the next loop cycle.</li>"

    if plans:
        plans_head = "from " + eur_price(min(plans.values()))
    elif blended:
        plans_head = "≈ " + eur_price(blended)
    else:
        plans_head = "subscription"

    stamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lang_list = " · ".join(LANGUAGE_NAMES.get(code, code) for code in SUPPORTED_LANGUAGES)
    tmpl = _STORE_TEMPLATE
    page = (tmpl
            .replace("@@ROBOT@@", esc(eur_price(robot)) or "see live console")
            .replace("@@PLANS_HEAD@@", esc(plans_head))
            .replace("@@LANGS@@", str(len(SUPPORTED_LANGUAGES)))
            .replace("@@LANG_LIST@@", esc(lang_list))
            .replace("@@PLAN_ROWS@@", plan_rows)
            .replace("@@LIVE@@", "../live/")
            .replace("@@STAMP@@", esc(stamp)))
    store_dir = os.path.join(out_dir, "store")
    os.makedirs(store_dir, exist_ok=True)
    with open(os.path.join(store_dir, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(page)


# --------------------------------------------------------------------------- #
def build_site(cycle: dict | None, closure: dict | None, out_dir: str,
               notes: str = "") -> None:
    os.makedirs(out_dir, exist_ok=True)
    api_dir = os.path.join(out_dir, "api")
    os.makedirs(api_dir, exist_ok=True)

    now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    live_info = discover_live()
    live_stale = bool(live_info.get("stale"))
    live_url = "" if live_stale else (live_info.get("url") or "")
    status = {
        "generated_at": now,
        "cycle_ok": bool(cycle and cycle.get("ok")),
        "closure_ok": bool(closure and closure.get("closed")),
        "holes": (closure or {}).get("holes"),
        "live_api_url": live_url or None,
        "live_api_stale": live_stale,
        "notes": notes,
    }

    def dump(name: str, obj) -> None:
        with open(os.path.join(api_dir, name), "w", encoding="utf-8") as fh:
            json.dump(obj if obj is not None else {}, fh, ensure_ascii=False, indent=2)

    dump("status.json", status)
    dump("cycle.json", cycle)
    dump("closure.json", closure)
    dump("live.json", {"url": live_url or None, "generated_at": now,
                       "health_path": "/health/live", "stale": live_stale,
                       "source": live_info.get("source"),
                       "mirror_updated_at": live_info.get("updated_at")})
    if cycle:
        eng = (((cycle.get("phases") or {}).get("engage") or {}).get("summary") or {})
        dump("revenue-plan.json", eng.get("revenue_plan"))
        dump("growth-kit.json", eng.get("growth_checklist"))
        dump("subscription.json", eng.get("subscription"))
        dump("referral.json", eng.get("referral"))

    cards: list[str] = []

    # --- system status ----------------------------------------------------- #
    body = (
        "<div class='row'>"
        f"<div><div class='lbl'>Cycle</div><div class='big'>{esc((cycle or {}).get('cycle', '?'))}</div></div>"
        f"<div><div class='lbl'>Cycle ok</div><div class='big'>{badge(bool(cycle and cycle.get('ok')))}</div></div>"
        f"<div><div class='lbl'>Corners closed</div><div class='big'>{badge(bool(closure and closure.get('closed')))}</div></div>"
        f"<div><div class='lbl'>Holes</div><div class='big'>{esc((closure or {}).get('holes', '?'))}</div></div>"
        "</div>"
    )
    cards.append(card("System status", body, f"generated {now} · region EU"))

    # --- phases ------------------------------------------------------------ #
    phases = (cycle or {}).get("phases") or {}
    if phases:
        rows = []
        for name, info in phases.items():
            st = (info or {}).get("status", "?")
            cls = "ok" if st == "ok" else "bad"
            rows.append(f"<tr><td>{esc(name)}</td><td><span class='badge {cls}'>{esc(st)}</span></td></tr>")
        cards.append(card("Autonomous loop phases", "<table class='kv'>" + "".join(rows) + "</table>",
                          f"{len(phases)} phases"))

    # --- revenue plan ------------------------------------------------------ #
    eng = (((cycle or {}).get("phases") or {}).get("engage") or {}).get("summary") or {}
    rp = eng.get("revenue_plan") or {}
    if rp:
        target = rp.get("target") or {}
        req = rp.get("required") or rp.get("requirements") or {}
        body = ""
        if target:
            body += "<div class='row'>" + "".join(
                f"<div><div class='lbl'>{esc(k)}</div><div class='big'>{esc(v)}</div></div>"
                for k, v in list(target.items())[:6]) + "</div>"
        body += kv_table(req)
        cards.append(card("Revenue target plan", body, "corner 25"))

    # --- growth checklist -------------------------------------------------- #
    gc = eng.get("growth_checklist") or {}
    if gc:
        body = kv_table(gc, skip=("items", "checklist", "tasks"))
        items = gc.get("items") or gc.get("checklist") or gc.get("tasks")
        if isinstance(items, list):
            lis = []
            for it in items[:40]:
                if isinstance(it, dict):
                    done = it.get("done") or it.get("complete")
                    txt = it.get("task") or it.get("title") or it.get("name") or json.dumps(it, ensure_ascii=False)[:120]
                    lis.append(f"<li>{badge(bool(done), '✓', '·')} {esc(txt)}</li>")
                else:
                    lis.append(f"<li>{esc(it)}</li>")
            body += "<ul class='tasks'>" + "".join(lis) + "</ul>"
        cards.append(card("Growth execution checklist", body, "corner 26"))

    # --- funnel + rollup --------------------------------------------------- #
    metrics = (cycle or {}).get("metrics") or {}
    funnel = metrics.get("funnel") or {}
    stages = funnel.get("stages") or {}
    rollup = metrics.get("rollup") or {}
    if stages or rollup:
        body = ""
        if stages:
            body += "<div class='row'>" + "".join(
                f"<div><div class='lbl'>{esc(k)}</div><div class='big'>{esc(v)}</div></div>"
                for k, v in stages.items()) + "</div>"
        if rollup:
            body += kv_table(rollup, skip=("event_counts",))
        cards.append(card("Commercial funnel & 30-day rollup", body, "acquisition → aftersales"))

    # --- subscription / referral ------------------------------------------ #
    sub = eng.get("subscription") or {}
    ref = eng.get("referral") or {}
    if sub or ref:
        body = ""
        if sub:
            body += "<h3>Subscription</h3>" + kv_table(sub)
        if ref:
            body += "<h3>Referral</h3>" + kv_table(ref)
        cards.append(card("Retention flywheel", body, "engagement → subscription → referral"))

    # --- closure corners --------------------------------------------------- #
    steps = (closure or {}).get("steps") or []
    if steps:
        rows = []
        for s in steps:
            cls = "ok" if s.get("closed") else "bad"
            rows.append(
                "<tr>"
                f"<td>{esc(s.get('n'))}</td>"
                f"<td>{esc(s.get('name'))}</td>"
                f"<td>{esc(s.get('module'))}</td>"
                f"<td><span class='badge {cls}'>{'closed' if s.get('closed') else 'open'}</span></td>"
                "</tr>")
        cards.append(card("Commercial closure — 26 corners",
                          "<table class='kv wide'><tr><th>#</th><th>corner</th><th>module</th><th>state</th></tr>"
                          + "".join(rows) + "</table>",
                          f"{sum(1 for s in steps if s.get('closed'))}/{len(steps)} closed"))

    # --- live api ---------------------------------------------------------- #
    if live_url:
        body = (f"<p>Public HTTPS endpoint (24/7 cloud-hosted): "
                f"<a href='{esc(live_url)}/health/live'>{esc(live_url)}</a></p>"
                "<p>Stable front door: <a href='live/'>/live/</a> · state in "
                "<a href='api/live.json'>/api/live.json</a>. The URL is rotated by the "
                "<code>Live API (24-7 public)</code> workflow.</p>")
        cards.append(card("Live API (24-7)", body, "cloud runner · no local machine required"))
    elif live_stale:
        cards.append(card("Live API (24-7)",
                          "<p>The advertised endpoint's heartbeat is stale, so it is not "
                          "being served as live. A fresh run of <code>Live API (24-7 public)</code> "
                          "will republish shortly; see <a href='api/live.json'>/api/live.json</a>.</p>",
                          "cloud runner · heartbeat stale"))
    else:
        cards.append(card("Live API (24-7)",
                          "<p>No live endpoint is currently advertised. The autonomous loop "
                          "still runs 24/7 in the cloud; set the <code>LIVE_URL</code> repo "
                          "variable or let the Live API workflow publish one.</p>",
                          "cloud runner"))

    # --- real retention engine (live evidence) ------------------------ #
    ret_sum: dict | None = None
    try:
        if ROOT not in sys.path:
            sys.path.insert(0, ROOT)
        import children_retention as _ret  # noqa: E402

        ret_sum = _ret.engine.summary()
        dump("retention-status.json", ret_sum)
        rbody = (
            "<div class='row'>"
            f"<div><div class='lbl'>Households (30d)</div><div class='big'>{esc(ret_sum.get('households', 0))}</div></div>"
            f"<div><div class='lbl'>DAU</div><div class='big'>{esc(ret_sum.get('dau', 0))}</div></div>"
            f"<div><div class='lbl'>MAU</div><div class='big'>{esc(ret_sum.get('mau', 0))}</div></div>"
            f"<div><div class='lbl'>Avg streak</div><div class='big'>{esc(ret_sum.get('avg_streak', 0))}</div></div>"
            f"<div><div class='lbl'>Avg completion</div><div class='big'>{esc(ret_sum.get('avg_completion', 0))}</div></div>"
            f"<div><div class='lbl'>Avg min/user</div><div class='big'>{esc(ret_sum.get('avg_minutes', 0))}</div></div>"
            "</div>"
            "<div class='row'>"
            f"<div><div class='lbl'>Churn low</div><div class='big ok'>{esc(ret_sum.get('churn_low', 0))}</div></div>"
            f"<div><div class='lbl'>Churn medium</div><div class='big warn'>{esc(ret_sum.get('churn_medium', 0))}</div></div>"
            f"<div><div class='lbl'>Churn high</div><div class='big bad'>{esc(ret_sum.get('churn_high', 0))}</div></div>"
            f"<div><div class='lbl'>Renewal prob (avg)</div><div class='big'>{esc(round(ret_sum.get('renewal_prob_avg', 1)*100))}%</div></div>"
            f"<div><div class='lbl'>Expansion ready</div><div class='big'>{esc(ret_sum.get('expansion_opportunities', 0))}</div></div>"
            "</div>"
            f"<p class='mut'>Source: {esc(ret_sum.get('data_source', 'data_loop'))}. "
            "If zero, wire device telemetry → data_loop.emit('learning.session', ...).</p>"
        )
        if live_url:
            rbody += f"<p>Live API: <a href='{esc(live_url)}/api/retention/summary'>{esc(live_url)}/api/retention/summary</a></p>"
        cards.append(card("Real Retention Engine", rbody,
                          "product flywheel · live evidence"))
    except Exception as exc:  # noqa: BLE001
        cards.append(card("Real Retention Engine",
                          f"<p>Engine unavailable: {esc(str(exc))}</p>",
                          "product flywheel"))

    # --- free AI token pool (acquisition lever) ------------------------ #
    fa_sum: dict | None = None
    try:
        if ROOT not in sys.path:
            sys.path.insert(0, ROOT)
        import children_free_ai as _fa  # noqa: E402

        fa_sum = _fa.pool.summary()
        dump("free-ai-status.json", fa_sum)
        fa_body = (
            "<div class='row'>"
            f"<div><div class='lbl'>Free providers</div><div class='big'>{esc(fa_sum.get('total', 0))}</div></div>"
            f"<div><div class='lbl'>Keyless (no key)</div><div class='big'>{esc(fa_sum.get('keyless', 0))}</div></div>"
            f"<div><div class='lbl'>Ready now</div><div class='big'>{esc(fa_sum.get('ready', 0))}</div></div>"
            f"<div><div class='lbl'>EU-hosted</div><div class='big'>{esc(fa_sum.get('eu_hosted', 0))}</div></div>"
            f"<div><div class='lbl'>Child-safe</div><div class='big'>{esc(fa_sum.get('child_safe', 0))}</div></div>"
            "</div>"
            "<p>Every household gets a metered <b>free daily AI allowance</b> "
            "(trial 20 · STD 200 · PRO 1000 calls/day) over genuinely free, "
            "no-credit-card LLM endpoints — the keyless ones work with zero "
            "setup, so an early customer gets a real answer immediately. This is "
            "the acquisition &amp; stickiness lever: free now, subscription when "
            "the allowance runs out. No API keys are ever committed; add them "
            "via <code>FREE_AI_KEYS</code> to widen the pool.</p>"
        )
        if live_url:
            fa_body += (
                f"<p>Live pool status: <a href='{esc(live_url)}/api/free-ai/status'>"
                f"{esc(live_url)}/api/free-ai/status</a></p>")
        cards.append(card("Free AI token pool", fa_body,
                          "acquisition · free daily credits"))
    except Exception as exc:  # noqa: BLE001
        cards.append(card("Free AI token pool",
                          f"<p>Pool metadata unavailable: {esc(str(exc))}</p>",
                          "acquisition"))

    # --- api links --------------------------------------------------------- #
    links = ["status.json", "cycle.json", "closure.json", "revenue-plan.json",
             "growth-kit.json", "subscription.json", "referral.json",
             "live.json", "free-ai-status.json", "retention-status.json"]
    body = "<ul class='tasks'>" + "".join(
        f"<li><a href='api/{esc(l)}'>/api/{esc(l)}</a></li>" for l in links) + "</ul>"
    cards.append(card("JSON API (static)", body, "machine-readable, always on"))

    if notes:
        cards.append(card("Notes", f"<pre>{esc(notes)}</pre>"))

    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EU Children Companion Robot — Operations</title>
<style>
:root{{--bg:#0b1020;--card:#151b33;--fg:#e8ecff;--mut:#9aa6d0;--ok:#39d98a;--bad:#ff6b6b;--acc:#6c8cff}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif}}
header{{padding:28px 22px 8px;max-width:1100px;margin:0 auto}}
h1{{margin:0 0 4px;font-size:24px}}
h2{{margin:0 0 10px;font-size:16px;letter-spacing:.3px;text-transform:uppercase;color:var(--acc)}}
h3{{margin:14px 0 6px;font-size:14px;color:var(--mut)}}
main{{max-width:1100px;margin:0 auto;padding:8px 22px 60px;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(330px,1fr))}}
.card{{background:var(--card);border:1px solid #26304f;border-radius:14px;padding:16px 18px}}
.sub{{color:var(--mut);font-size:12px;margin:-6px 0 10px}}
.row{{display:flex;flex-wrap:wrap;gap:18px;margin:6px 0 12px}}
.lbl{{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.4px}}
.big{{font-size:18px;font-weight:600}}
table.kv{{width:100%;border-collapse:collapse;font-size:13px}}
table.kv th{{text-align:left;color:var(--mut);font-weight:500;padding:3px 10px 3px 0;white-space:nowrap;vertical-align:top}}
table.kv td{{padding:3px 0;word-break:break-word}}
table.wide td,table.wide th{{padding:4px 8px;border-bottom:1px solid #222c49}}
.badge{{display:inline-block;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:600}}
.badge.ok{{background:rgba(57,217,138,.15);color:var(--ok)}}
.badge.bad{{background:rgba(255,107,107,.15);color:var(--bad)}}
ul.tasks{{margin:6px 0 0;padding-left:18px}}
ul.tasks li{{margin:3px 0}}
a{{color:var(--acc)}}
.cta{{display:inline-block;margin-top:8px;background:var(--acc);color:#0b1020;font-weight:700;
padding:8px 14px;border-radius:10px;text-decoration:none}}
pre{{white-space:pre-wrap;word-break:break-word;font-size:12px;color:var(--mut)}}
footer{{max-width:1100px;margin:0 auto;padding:0 22px 40px;color:var(--mut);font-size:12px}}
</style></head><body>
<header><h1>EU Children Companion Robot — Operations</h1>
<div class='sub'>Autonomous commercial loop · region EU · generated {esc(now)}</div>
<div><a class='cta' href='live/'>Open the live console →</a>
<a class='cta' href='store/' style='background:#26304f;color:#e8ecff;margin-left:8px'>Storefront →</a></div></header>
<main>{''.join(cards)}</main>
<footer>Static snapshot published by <code>scripts/ops_cron.py</code>. The live API is hosted 24/7 on a cloud runner (see <a href='api/live.json'>/api/live.json</a> for the current endpoint).</footer>
</body></html>
"""
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(page)

    # A stable front door: /live/ always resolves to the current cloud endpoint.
    live_dir = os.path.join(out_dir, "live")
    os.makedirs(live_dir, exist_ok=True)
    fixed = esc(live_url) if live_url else ""
    live_page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Opening the live console…</title>
<style>body{{margin:0;background:#0b1020;color:#e8ecff;font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;
display:grid;place-items:center;min-height:100vh}}
.box{{max-width:540px;padding:24px 26px;background:#151b33;border:1px solid #26304f;border-radius:14px;text-align:center}}
h1{{margin:0 0 8px;font-size:20px}} a{{color:#6c8cff}}</style></head><body>
<div class="box">
<h1>🤖 Live console</h1>
<p id="msg">Resolving the current endpoint…</p>
<p><a id="lnk" href="{"#" if not live_url else fixed}">Continue</a></p>
<p style="color:#9aa6d0;font-size:12px">This page always forwards to the current 24/7 cloud endpoint
(mirrored in <a href="../api/live.json">/api/live.json</a>).</p>
</div>
<script>
(async () => {{
  let url = {json.dumps(live_url or "")};
  try {{
    if (!url) {{
      const r = await fetch('../api/live.json', {{cache: 'no-store'}});
      const j = await r.json();
      url = (j && j.url) ? j.url : '';
    }}
  }} catch (e) {{}}
  const msg = document.getElementById('msg');
  const lnk = document.getElementById('lnk');
  if (url) {{
    const target = url.replace(/\\/+$/, '') + '/';
    lnk.href = target;
    lnk.textContent = 'Open ' + target;
    msg.textContent = 'Redirecting…';
    window.location.replace(target);
  }} else {{
    msg.textContent = 'No live endpoint is currently advertised. The autonomous loop is still running 24/7 in the cloud; this page will open the console as soon as the next Live API run publishes an endpoint.';
    lnk.href = '../api/live.json';
    lnk.textContent = 'View /api/live.json';
  }}
}})();
</script>
</body></html>
"""
    with open(os.path.join(live_dir, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(live_page)

    # Customer-facing storefront (additive; the ops dashboard stays at /).
    build_store(cycle, out_dir, live_url)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Run one cloud ops cycle and publish a static site")
    ap.add_argument("--out", default="site")
    ap.add_argument("--state", default="loop-state")
    ap.add_argument("--interval", type=int, default=900)
    ap.add_argument("--skip-loop", action="store_true")
    args = ap.parse_args(argv)

    out_dir = args.out if os.path.isabs(args.out) else os.path.join(ROOT, args.out)
    state_dir = args.state if os.path.isabs(args.state) else os.path.join(ROOT, args.state)
    os.makedirs(state_dir, exist_ok=True)

    notes = []
    cycle = closure = None

    if not args.skip_loop:
        cycle, err = _run_json(
            [sys.executable, "scripts/autonomous_ops.py", "--once", "--json",
             "--state-backend", "file", "--state-dir", state_dir],
            _utf8_env({"AUTONOMOUS_INTERVAL": str(args.interval)}))
        if err:
            notes.append("loop: " + err)
    try:
        closure, err2 = _run_json([sys.executable, "scripts/closure_audit.py", "--json"], _utf8_env())
        if err2:
            notes.append("closure: " + err2)
    except Exception as exc:  # noqa: BLE001
        notes.append(f"closure: {exc}")

    if cycle is None and os.path.isfile(os.path.join(state_dir, "cycle.json")):
        try:
            cycle = json.load(open(os.path.join(state_dir, "cycle.json"), encoding="utf-8"))
        except Exception:  # noqa: BLE001
            pass

    if cycle is not None:
        with open(os.path.join(state_dir, "cycle.json"), "w", encoding="utf-8") as fh:
            json.dump(cycle, fh, ensure_ascii=False, indent=2)
    if closure is not None:
        with open(os.path.join(state_dir, "closure.json"), "w", encoding="utf-8") as fh:
            json.dump(closure, fh, ensure_ascii=False, indent=2)

    build_site(cycle, closure, out_dir, notes="\n".join(notes))
    print(f"[ops_cron] published -> {out_dir}")
    print(f"[ops_cron] cycle_ok={bool(cycle and cycle.get('ok'))} "
          f"closure_ok={bool(closure and closure.get('closed'))} "
          f"holes={(closure or {}).get('holes')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
