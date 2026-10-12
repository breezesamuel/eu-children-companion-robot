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
def build_site(cycle: dict | None, closure: dict | None, out_dir: str,
               notes: str = "") -> None:
    os.makedirs(out_dir, exist_ok=True)
    api_dir = os.path.join(out_dir, "api")
    os.makedirs(api_dir, exist_ok=True)

    now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    status = {
        "generated_at": now,
        "cycle_ok": bool(cycle and cycle.get("ok")),
        "closure_ok": bool(closure and closure.get("closed")),
        "holes": (closure or {}).get("holes"),
        "notes": notes,
    }

    def dump(name: str, obj) -> None:
        with open(os.path.join(api_dir, name), "w", encoding="utf-8") as fh:
            json.dump(obj if obj is not None else {}, fh, ensure_ascii=False, indent=2)

    dump("status.json", status)
    dump("cycle.json", cycle)
    dump("closure.json", closure)
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

    # --- api links --------------------------------------------------------- #
    links = ["status.json", "cycle.json", "closure.json", "revenue-plan.json",
             "growth-kit.json", "subscription.json", "referral.json"]
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
pre{{white-space:pre-wrap;word-break:break-word;font-size:12px;color:var(--mut)}}
footer{{max-width:1100px;margin:0 auto;padding:0 22px 40px;color:var(--mut);font-size:12px}}
</style></head><body>
<header><h1>EU Children Companion Robot — Operations</h1>
<div class='sub'>Autonomous commercial loop · region EU · generated {esc(now)}</div></header>
<main>{''.join(cards)}</main>
<footer>Static snapshot published by <code>scripts/ops_cron.py</code>. Live API runs under the same codebase when hosted with a card-backed provider.</footer>
</body></html>
"""
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(page)


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
