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
SUPPORTED_LANGUAGES = ("en", "de", "fr", "es", "it", "nl", "pt", "pl", "sv", "da", "fi")
LANGUAGE_NAMES = {"en": "English", "de": "Deutsch", "fr": "Français",
                  "es": "Español", "it": "Italiano", "nl": "Nederlands",
                  "pt": "Português", "pl": "Polski", "sv": "Svenska",
                  "da": "Dansk", "fi": "Suomi"}

_PLAN_LABELS = {"SUB-STD-M": "Standard — monthly", "SUB-STD-Y": "Standard — yearly",
                "SUB-PRO-M": "Pro — monthly", "SUB-PRO-Y": "Pro — yearly"}

# `@@TOKEN@@` template so the CSS braces need no escaping.
_STORE_TEMPLATE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="EU Children Companion Robot — a companion that reads, plays and learns with your child, with data staying in the EU.">
<title>EU Children Companion Robot — bring it home</title>
<style>
:root{--bg:#0b1020;--card:#151b33;--fg:#e8ecff;--mut:#9aa6d0;--ok:#39d98a;--acc:#6c8cff;--warn:#ffd166}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,Segoe UI,Roboto,sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:32px 22px 64px}
h1{font-size:30px;margin:0 0 6px}
h2{font-size:19px;margin:0 0 6px}
.lede{color:var(--mut);font-size:18px;margin:0 0 22px}
.card{background:var(--card);border:1px solid #26304f;border-radius:14px;padding:20px 22px;margin:14px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.plan{background:#101731;border:1px solid #26304f;border-radius:14px;padding:18px;display:flex;flex-direction:column}
.plan.best{border-color:var(--acc)}
ul{margin:8px 0 0;padding-left:18px}
li{margin:4px 0}
.price{font-size:26px;font-weight:800}
.mut{color:var(--mut)}
.cta{display:inline-block;background:var(--acc);color:#0b1020;font-weight:800;padding:12px 20px;border-radius:12px;text-decoration:none;margin-top:8px;border:0;cursor:pointer}
.cta.alt{background:#26304f;color:#e8ecff}
.cta[disabled]{opacity:.5;cursor:not-allowed}
.badge{display:inline-block;background:#0f2a1f;color:var(--ok);border-radius:999px;padding:2px 10px;font-size:12px;margin-left:6px;vertical-align:middle}
.badge.warn{background:#3a2f10;color:var(--warn)}
.toggle{display:inline-flex;gap:0;border:1px solid #26304f;border-radius:999px;overflow:hidden}
.toggle button{background:transparent;color:var(--mut);border:0;padding:8px 16px;cursor:pointer;font-weight:700}
.toggle button.on{background:var(--acc);color:#0b1020}
input,select{width:100%;padding:10px;border-radius:10px;border:1px solid #26304f;background:#0b1220;color:var(--fg)}
.chat{height:150px;overflow:auto;background:#0b1220;border:1px solid #26304f;border-radius:10px;padding:10px;margin:10px 0}
.msg{margin:6px 0}.msg.u{color:var(--acc)}.msg.a{color:var(--fg)}
.overlay{position:fixed;inset:0;background:rgba(5,8,20,.8);display:none;align-items:center;justify-content:center;padding:20px;z-index:50}
.overlay.on{display:flex}
.modal{background:var(--card);border:1px solid #26304f;border-radius:16px;max-width:640px;width:100%;padding:22px;max-height:90vh;overflow:auto}
footer{color:var(--mut);font-size:13px;margin-top:28px}
a{color:var(--acc)}
table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid #26304f;text-align:left;font-size:14px}
</style></head><body><div class="wrap">
<h1>EU Children Companion Robot <span class="badge">region EU</span></h1>
<div style="margin:0 0 12px"><span class="toggle" id="locale">
  <button data-r="en" class="on">English · $</button>
  <button data-r="zh">中文 · ¥</button>
</span></div>
<p class="lede" id="lede">A companion that reads, plays and learns with your child — on your terms,
in your language, with the data staying in the EU.</p>
<div class="grid">
  <div class="card">
    <div class="price">@@ROBOT@@</div>
    <div data-i18n="hardware">one-off, incl. VAT display</div>
    <div class="mut" data-i18n="hardware_sub">Companion robot · setup in minutes</div>
  </div>
  <div class="card">
    <div class="price">@@LANGS@@</div>
    <div data-i18n="langs">languages</div>
    <div class="mut">@@LANG_LIST@@</div>
  </div>
  <div class="card">
    <div class="price">10</div>
    <div data-i18n="free">free questions to try</div>
    <div class="mut" data-i18n="free_sub">then a subscription unlocks the companion</div>
  </div>
</div>

<div class="card">
  <h2 id="plans-title">Choose your plan</h2>
  <div class="plans" id="plans"></div>
  <p class="mut" style="margin-top:10px" id="eu-note">@@EU_ROWS@@</p>
  <p class="mut" id="rail" style="margin-top:12px"></p>
</div>

<div class="card">
  <h2 id="try-title">Try the companion — 10 free questions</h2>
  <div class="chat" id="chat"><div class="msg a" id="chat-hint">Say hello to your child's companion…</div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    <input id="ask" placeholder="Ask the companion anything…" style="flex:1;min-width:200px">
    <button class="cta" id="send" style="margin-top:0">Send</button>
  </div>
  <p class="mut" id="quota" style="margin-top:10px">Checking your free quota…</p>
</div>

<div class="card">
  <h2 id="ref-title">Invite friends, earn free months</h2>
  <p class="mut" id="ref-sub">Share your link — when friends subscribe you both get free access.</p>
  <div id="ref-tiers"></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
    <input id="ref-link" readonly placeholder="your referral link appears here">
    <button class="cta alt" id="ref-claim" style="margin-top:0">Claim earned months</button>
  </div>
  <p class="mut" id="ref-msg" style="margin-top:10px"></p>
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
  <h2>Live</h2>
  <p class="mut">The live console runs in the cloud, 24/7, and opens the
  current endpoint automatically.</p>
  <a class="cta" href="@@LIVE@@">Open the live console →</a>
  <a class="cta" href="../api/status.json" style="background:#26304f;color:#e8ecff;margin-left:8px">System status</a>
</div>
<footer>
  Hardware ships with a subscription; nothing else is required to try the live console.<br>
  Prices and plans come from this project's own price table (@@STAMP@@). We publish only
  our own numbers — never invented testimonials, star scores or customer counts.
</footer>
</div>

<div class="overlay" id="overlay"><div class="modal">
  <h2 id="m-title">Unlock unlimited access</h2>
  <p class="mut" id="m-sub">You've used your 10 free questions. Subscribe to keep going — access unlocks as soon as payment succeeds.</p>
  <div class="plans" id="m-plans"></div>
  <p class="mut" id="m-rail" style="margin-top:10px"></p>
  <div style="margin-top:14px">
    <button class="cta" id="m-pay">Pay &amp; unlock</button>
    <button class="cta alt" id="m-close" style="margin-left:8px">Not now</button>
  </div>
  <p class="mut" id="m-msg" style="margin-top:10px"></p>
</div></div>

<script>
var PLANS = @@PLANS_JSON@@;
var REWARDS = @@REWARDS_JSON@@;
var I18N = {
  en: {hardware:"one-off, incl. VAT display", hardware_sub:"Companion robot · setup in minutes",
       langs:"languages", free:"free questions to try", free_sub:"then a subscription unlocks the companion",
       plans_title:"Choose your plan", plans_sub:"", per:"", month:"/month", quarter:"/quarter", year:"/year",
       subscribe:"Subscribe", best:"Best value", rail_live:"Live payment rails: ", rail_mock:"Test mode — no real charge yet (operator has not connected the live rail).",
       try_title:"Try the companion — 10 free questions", ask:"Ask the companion anything…", send:"Send",
       ref_title:"Invite friends, earn free months", ref_sub:"Share your link — when friends subscribe you both get free access.",
       claim:"Claim earned months", quota:"Free questions left: ", unlimited:"Unlimited access — thank you!",
       lede:"A companion that reads, plays and learns with your child — on your terms, in your language, with the data staying in the EU."},
  zh: {hardware:"一次性购买（含税展示）", hardware_sub:"陪护机器人 · 几分钟即可完成设置",
       langs:"种语言", free:"次免费提问", free_sub:"之后订阅即可解锁完整陪护功能",
       plans_title:"选择订阅方案", per:"", month:"/月", quarter:"/季", year:"/年",
       subscribe:"立即订阅", best:"最划算", rail_live:"支付通道：", rail_mock:"测试模式——暂未真实扣款（运营方尚未接入正式支付通道）。",
       try_title:"试用陪护机器人 — 10 次免费提问", ask:"向陪护机器人提问…", send:"发送",
       ref_title:"邀请好友，免费领取使用时长", ref_sub:"分享你的链接——好友订阅后，双方都可获得免费时长。",
       claim:"领取已获赠时长", quota:"剩余免费次数：", unlimited:"已解锁无限使用——感谢订阅！",
       lede:"陪伴孩子阅读、玩耍与学习的陪护机器人——按你的方式，用你的语言，数据留在欧盟。"}
};
var region = "en";
var vis = (function () {
  try {
    var v = localStorage.getItem("rcv");
    if (!v) { v = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("rcv", v); }
    return v;
  } catch (e) { return "v_" + Math.random().toString(36).slice(2); }
})();
var liveBase = null;
function $(id) { return document.getElementById(id); }
function cur(r) { return r === "zh" ? "CNY" : "USD"; }
function perLabel(months, t) { return months === 12 ? t.year : (months === 3 ? t.quarter : t.month); }
function money(cents, curr) {
  var v = (cents / 100);
  return (curr === "CNY" ? "¥" : "$") + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
}
function say(id, t) { var e = $(id); if (e) e.textContent = t; }
function planCards(container, onPick) {
  var t = I18N[region] || I18N.en;
  var list = (PLANS[region] || []);
  container.innerHTML = "";
  for (var k = 0; k < list.length; k++) {
    var pl = list[k];
    var div = document.createElement("div");
    div.className = "plan" + (pl.months === 12 ? " best" : "");
    var h = "<div class='mut'>" + (pl.name || pl.plan_id) + "</div>" +
            "<div class='price'>" + money(pl.price_cents, pl.currency) + perLabel(pl.months, t) + "</div>";
    if (pl.months === 12) h += "<div class='badge'>" + t.best + "</div>";
    div.innerHTML = h;
    var b = document.createElement("button");
    b.className = "cta";
    b.textContent = t.subscribe + " · " + money(pl.price_cents, pl.currency);
    b.setAttribute("data-plan", pl.plan_id);
    b.addEventListener("click", function () { onPick(this.getAttribute("data-plan")); });
    div.appendChild(b);
    container.appendChild(div);
  }
}
function paintPlans() {
  planCards($("plans"), function (plan) { subscribe(plan); });
  planCards($("m-plans"), function (plan) { subscribe(plan); });
}
function applyRegion(r) {
  region = r;
  var t = I18N[r];
  document.documentElement.lang = (r === "zh" ? "zh" : "en");
  var nodes = document.querySelectorAll("[data-i18n]");
  for (var i = 0; i < nodes.length; i++) { var key = nodes[i].getAttribute("data-i18n"); if (t[key]) nodes[i].textContent = t[key]; }
  $("lede").textContent = t.lede;
  $("plans-title").textContent = t.plans_title;
  $("try-title").textContent = t.try_title;
  $("ref-title").textContent = t.ref_title;
  $("ref-sub").textContent = t.ref_sub;
  $("ask").placeholder = t.ask;
  $("send").textContent = t.send;
  $("ref-claim").textContent = t.claim;
  var btns = $("locale").getElementsByTagName("button");
  for (var j = 0; j < btns.length; j++) { btns[j].className = (btns[j].getAttribute("data-r") === r ? "on" : ""); }
  paintPlans();
  paintRewards();
  paintQuota();
}
function paintRewards() {
  var t = I18N[region];
  var tiers = REWARDS[region === "zh" ? "CNY" : "USD"] || [];
  var html = "<table><tr><th>" + t.ref_title + "</th><th>" + t.month.replace("/", "") + "</th></tr>";
  for (var i = 0; i < tiers.length; i++) {
    html += "<tr><td>" + tiers[i].label + "</td><td>+" + tiers[i].months + " " + (region === "zh" ? "个月" : "mo") + "</td></tr>";
  }
  html += "</table>";
  $("ref-tiers").innerHTML = html;
}
function api(path, body) {
  if (!liveBase) return Promise.reject(new Error("no live endpoint"));
  return fetch(liveBase + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  }).then(function (r) { return r.json(); });
}
var quotaRemaining = null;
function paintQuota() {
  var t = I18N[region];
  if (quotaRemaining === null) return;
  if (quotaRemaining === -1) { say("quota", t.unlimited); return; }
  say("quota", t.quota + quotaRemaining);
}
function refreshStatus() {
  if (!liveBase) return;
  fetch(liveBase + "/api/paywall/status?visitor_id=" + encodeURIComponent(vis), { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      quotaRemaining = j.unlocked ? -1 : (j.remaining === null ? -1 : j.remaining);
      paintQuota();
    }).catch(function () {});
}
function ask() {
  var text = ($("ask").value || "").trim();
  if (!text) return;
  if (!liveBase) { say("quota", "Waiting for the live endpoint…"); return; }
  writeMsg("u", text);
  $("ask").value = "";
  api("/api/paywall/consume", { visitor_id: vis, feature: "chat" })
    .then(function (c) {
      quotaRemaining = c.unlocked ? -1 : (c.remaining || 0);
      paintQuota();
      if (!c.allowed) { showModal(); return null; }
      return api("/api/free-ai/chat", { messages: [{ role: "user", content: text }], household_id: vis, plan: "free" });
    })
    .then(function (res) {
      if (!res) return;
      var reply = res.reply || res.content || res.text || (res.result && String(res.result)) ||
                  (res.ok ? "(the companion is thinking — try again in a moment)" : (res.error || "no answer"));
      writeMsg("a", reply);
    })
    .catch(function (e) { writeMsg("a", "Error: " + e.message); });
}
function writeMsg(cls, text) {
  var d = document.createElement("div");
  d.className = "msg " + cls;
  d.textContent = text;
  $("chat").appendChild(d);
  $("chat").scrollTop = $("chat").scrollHeight;
}
function showModal() { $("overlay").className = "overlay on"; }
function hideModal() { $("overlay").className = "overlay"; }
function subscribe(planId) {
  if (!liveBase) { say("m-msg", "No live endpoint right now — try again after the next cycle."); return; }
  var method = (region === "zh" ? "alipay" : "paypal");
  say("m-msg", "Creating subscription…");
  api("/api/paywall/subscribe", { visitor_id: vis, plan_id: planId, method: method })
    .then(function (j) {
      if (j && j.ok) {
        var mockNote = (j.payment && j.payment.mock) ? " Test mode — no real charge." : " Payment captured.";
        if (j.unlock && j.unlock.unlocked) {
          quotaRemaining = -1; paintQuota(); hideModal();
          say("quota", I18N[region].unlimited + mockNote);
        } else {
          say("m-msg", "Payment pending or not verified: " + JSON.stringify(j.unlock || j).slice(0, 200));
        }
      } else {
        say("m-msg", "Could not subscribe: " + JSON.stringify(j).slice(0, 200));
      }
    })
    .catch(function (e) { say("m-msg", "Network error: " + e.message); });
}
(function boot() {
  var btns = $("locale").getElementsByTagName("button");
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () { applyRegion(this.getAttribute("data-r")); });
  }
  $("send").addEventListener("click", ask);
  $("m-close").addEventListener("click", hideModal);
  $("m-pay").addEventListener("click", function () { say("m-msg", "Pick a specific plan above."); });
  $("ask").addEventListener("keydown", function (e) { if (e.key === "Enter") ask(); });
  var rf = new URLSearchParams(location.search).get("ref");
  fetch("../api/live.json", { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && j.url && !j.stale) {
        liveBase = String(j.url).replace(/[/]+$/, "");
        say("rail", I18N[region].rail_live + "PayPal · WeChat Pay · Alipay → Alipay settlement");
        refreshStatus();
        // referral link + tiers
        api("/api/referral/code?household_id=" + encodeURIComponent(vis))
          .then(function (c) {
            if (c && c.code) {
              var link = location.origin + location.pathname + "?ref=" + c.code;
              $("ref-link").value = link;
              if (rf) { api("/api/referral/click", { code: rf, referee_household: vis, meta: {} }); }
            }
          }).catch(function () {});
      } else {
        say("rail", I18N[region].rail_mock);
        say("quota", "The companion opens with the live endpoint (published on the next cloud cycle).");
      }
    })
    .catch(function () { say("rail", I18N[region].rail_mock); });
  $("ref-claim").addEventListener("click", function () {
    var t = I18N[region];
    say("ref-msg", "Checking your rewards…");
    api("/api/referral/rewards/claim", { household_id: vis, currency: (region === "zh" ? "CNY" : "USD"), visitor_id: vis })
      .then(function (j) { say("ref-msg", j && j.ok ? ("Granted " + (j.granted_months || 0) + (region === "zh" ? " 个月" : " month(s).")) : "No new rewards yet."); })
      .catch(function (e) { say("ref-msg", "Error: " + e.message); });
  });
  applyRegion("en");
})();
</script>
</body></html>
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


def _robot_price_cents() -> int | None:
    """Hardware price (EU cents) from the single source of truth, or None.

    The storefront must never show a made-up price; when the loop has not yet
    produced unit economics we fall back to the planner's own constant.
    """
    try:
        import children_revenue_planner as _rp  # noqa: WPS433
        v = getattr(_rp, "ROBOT_PRICE_CENTS", None)
        return int(v) if v else None
    except Exception:  # noqa: BLE001
        return None


def eur_price(cents) -> str:
    """Format integer cents as a euro price, e.g. 29900 -> \"299.00 €\"."""
    try:
        return f"{int(cents) / 100:.2f} €"
    except Exception:  # noqa: BLE001
        return ""


def _paywall_plans() -> dict:
    """The USD/CNY paywall catalog as plain dicts for the storefront JS.

    Sourced from ``children_subscription`` (single source of truth); falls back to
    the published price list so the page is never empty or wrong.
    """
    for base in (ROOT, os.path.join(ROOT, "scripts")):
        if base not in sys.path:
            sys.path.insert(0, base)
    try:
        import children_subscription as _sub  # noqa: WPS433
        out = {}
        for region in ("en", "zh"):
            out[region] = [{"plan_id": p.plan_id, "name": p.name,
                            "price_cents": p.price_cents, "currency": p.currency,
                            "months": p.period_months()}
                           for p in _sub.plans_for_region(region)]
        if out.get("en"):
            return out
    except Exception:  # noqa: BLE001
        pass
    return {
        "en": [
            {"plan_id": "SUB-EN-M", "name": "English — monthly", "price_cents": 2990, "currency": "USD", "months": 1},
            {"plan_id": "SUB-EN-Q", "name": "English — quarterly", "price_cents": 7990, "currency": "USD", "months": 3},
            {"plan_id": "SUB-EN-Y", "name": "English — yearly", "price_cents": 29900, "currency": "USD", "months": 12}],
        "zh": [
            {"plan_id": "SUB-ZH-M", "name": "中文 — 月付", "price_cents": 6000, "currency": "CNY", "months": 1},
            {"plan_id": "SUB-ZH-Q", "name": "中文 — 季付", "price_cents": 15000, "currency": "CNY", "months": 3},
            {"plan_id": "SUB-ZH-Y", "name": "中文 — 年付", "price_cents": 50000, "currency": "CNY", "months": 12}],
    }


def _reward_tiers() -> dict:
    """Referral free-month tiers (USD/CNY) for the storefront JS."""
    try:
        import children_referral as _rf  # noqa: WPS433
        return dict(getattr(_rf, "REWARD_TIERS", {}) or {})
    except Exception:  # noqa: BLE001
        return {
            "USD": [{"id": "usd-invite-1", "label": "Invite 1 who pays for >= 1 month", "months": 1,
                     "required": 1, "min_amount_cents": 2990},
                    {"id": "usd-invite-3", "label": "Invite 3 who each pay for a quarter", "months": 3,
                     "required": 3, "min_amount_cents": 7990},
                    {"id": "usd-invite-10", "label": "Invite 10 who each pay >= $99", "months": 12,
                     "required": 10, "min_amount_cents": 9900}],
            "CNY": [{"id": "cny-invite-1", "label": "邀请 1 位并支付满 1 个月", "months": 1,
                     "required": 1, "min_amount_cents": 6000},
                    {"id": "cny-invite-3", "label": "邀请 3 位并各支付 1 个季度", "months": 3,
                     "required": 3, "min_amount_cents": 15000},
                    {"id": "cny-invite-10", "label": "邀请 10 位并各支付 500 元", "months": 12,
                     "required": 10, "min_amount_cents": 50000}],
        }


def build_store(cycle: dict | None, out_dir: str, live_url: str = "") -> None:
    """Render the customer-facing storefront at `store/index.html`.

    Numbers come from the loop's own plan output plus the real price catalog; the
    page never invents traction, reviews or ratings. The pricing and the paywall
    modal read the live USD/CNY plans from ``children_subscription`` and talk to
    the real ``/api/paywall/*`` endpoints on the advertised live host.
    """
    eng = (((cycle or {}).get("phases") or {}).get("engage") or {}).get("summary") or {}
    ue = ((eng.get("revenue_plan") or {}).get("unit_economics_cents")) or {}
    robot = ue.get("robot_price") or _robot_price_cents()

    stamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lang_list = " · ".join(LANGUAGE_NAMES.get(code, code) for code in SUPPORTED_LANGUAGES)
    plans_json = json.dumps(_paywall_plans(), ensure_ascii=False)
    rewards_json = json.dumps(_reward_tiers(), ensure_ascii=False)

    # server-rendered EU (EUR) price line — keeps the real EUR catalog visible
    # even without JavaScript, and never fabricates anything.
    eu_prices = _plan_prices_cents()
    eu_bits = []
    for sku, price in sorted(eu_prices.items()):
        if sku.endswith("-Y"):
            eu_bits.append(f"{esc(_PLAN_LABELS.get(sku, sku))} {esc(eur_price(price))}/year")
        else:
            eu_bits.append(f"{esc(_PLAN_LABELS.get(sku, sku))} {esc(eur_price(price))}/month")
    eu_rows = ("Also available in EUR (EU): " + " · ".join(eu_bits)) if eu_bits \
        else "EUR pricing publishes with the next loop cycle."

    tmpl = _STORE_TEMPLATE
    page = (tmpl
            .replace("@@ROBOT@@", esc(eur_price(robot)) or "see live console")
            .replace("@@LANGS@@", str(len(SUPPORTED_LANGUAGES)))
            .replace("@@LANG_LIST@@", esc(lang_list))
            .replace("@@LIVE@@", "../live/")
            .replace("@@STAMP@@", esc(stamp))
            .replace("@@EU_ROWS@@", eu_rows)
            .replace("@@PLANS_JSON@@", plans_json)
            .replace("@@REWARDS_JSON@@", rewards_json))
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
