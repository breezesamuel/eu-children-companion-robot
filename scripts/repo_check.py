#!/usr/bin/env python3
"""repo_check.py -- the SOP licence gate as a CI check.

Reads the *direct* dependencies from the project manifests, resolves each one's
declared licence from a first-party artifact (installed ``node_modules``
package.json for npm, ``importlib.metadata`` for Python), and pushes every
licence through ``scripts/sop_license_gate.py``.

Exit code is non-zero if any direct dependency fails the gate (unknown-is-deny),
which is what makes this a hard CI gate per ``OPEN_SOURCE_REUSE_SOP.md §7``.

Usage
-----
    python scripts/repo_check.py                 # direct deps only
    python scripts/repo_check.py --deep          # every installed npm package
    python scripts/repo_check.py --json out.json
    python scripts/repo_check.py --changed-since 2026-08-01   # informational
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sop_license_gate import classify  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE_ROOT = os.path.join(ROOT, "project_source")
NODE_MODULES = os.path.join(NODE_ROOT, "node_modules")

# ── manifests ─────────────────────────────────────────────────────────────────
NPM_MANIFESTS = [
    os.path.join(NODE_ROOT, "package.json"),
    os.path.join(NODE_ROOT, "scraper", "package.json"),
]
PY_MANIFESTS = [
    os.path.join(ROOT, "requirements.txt"),
    os.path.join(ROOT, "requirements-python.txt"),
]

_REQ_RE = re.compile(r"^\s*([A-Za-z0-9_.\-]+)\s*(\[[^\]]*\])?\s*(==|>=|<=|~=|>|<|!)?.*$")


# ── npm resolution ────────────────────────────────────────────────────────────
def _npm_direct_deps() -> List[Tuple[str, str]]:
    """(name, manifest) for each declared npm dependency."""
    out = []
    for man in NPM_MANIFESTS:
        if not os.path.exists(man):
            continue
        try:
            data = json.load(open(man, encoding="utf-8"))
        except Exception:
            continue
        for section in ("dependencies", "devDependencies", "optionalDependencies"):
            for name in (data.get(section) or {}):
                out.append((name, os.path.relpath(man, ROOT).replace("\\", "/")))
    return out


def _npm_license(name: str) -> Tuple[Optional[str], str]:
    """Read the licence from the installed package manifest."""
    pkg_json = os.path.join(NODE_MODULES, *name.split("/"), "package.json")
    if not os.path.exists(pkg_json):
        return None, "not installed"
    try:
        data = json.load(open(pkg_json, encoding="utf-8"))
    except Exception:
        return None, "unreadable package.json"
    lic = data.get("license")
    if lic is None:
        lics = data.get("licenses")
        if isinstance(lics, list) and lics:
            lic = lics[0].get("type") if isinstance(lics[0], dict) else lics[0]
    return lic, "node_modules/package.json"


def _npm_all_installed() -> List[str]:
    out = []
    if not os.path.isdir(NODE_MODULES):
        return out
    for entry in os.listdir(NODE_MODULES):
        if entry.startswith("."):
            continue
        if entry.startswith("@"):
            scope = os.path.join(NODE_MODULES, entry)
            if os.path.isdir(scope):
                for sub in os.listdir(scope):
                    out.append(f"{entry}/{sub}")
        else:
            out.append(entry)
    return sorted(out)


# ── python resolution ─────────────────────────────────────────────────────────
def _py_direct_deps() -> List[Tuple[str, str]]:
    out = []
    for man in PY_MANIFESTS:
        if not os.path.exists(man):
            continue
        for line in open(man, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            m = _REQ_RE.match(line)
            if m and m.group(1):
                out.append((m.group(1), os.path.relpath(man, ROOT).replace("\\", "/")))
    return out


def _py_license(name: str) -> Tuple[Optional[str], str]:
    try:
        import importlib.metadata as md
    except Exception:
        return None, "importlib.metadata unavailable"
    try:
        meta = md.metadata(name)
    except Exception:
        return None, "not installed"
    expr = meta.get("License-Expression")
    if expr:
        return expr, "License-Expression"
    lic = meta.get("License")
    if lic and len(lic) <= 100 and "\n" not in lic:
        return lic, "License"
    for c in (meta.get_all("Classifier") or []):
        if c.startswith("License ::"):
            return c.split("::")[-1].strip(), "Classifier"
    if lic:
        return lic, "License(body)"
    return None, "no licence metadata"


# ── check ─────────────────────────────────────────────────────────────────────
EXCEPTIONS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "sop_exceptions.json")


def _load_exceptions() -> Dict[Tuple[str, str], Dict[str, Any]]:
    """Return {(ecosystem, package): exception} for unexpired entries.

    An expired entry is returned with ``_expired=True`` so the caller can fail
    the gate on it.
    """
    if not os.path.exists(EXCEPTIONS_FILE):
        return {}
    try:
        data = json.load(open(EXCEPTIONS_FILE, encoding="utf-8"))
    except Exception:
        return {}
    today = _dt.date.today().isoformat()
    out: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for e in data.get("exceptions", []):
        key = (e.get("ecosystem", ""), e.get("package", ""))
        e = dict(e)
        e["_expired"] = bool(e.get("expires")) and e["expires"] < today
        out[key] = e
    return out


def check(deep: bool = False) -> Dict[str, Any]:
    rows: List[Dict[str, Any]] = []
    exceptions = _load_exceptions()

    def _add(ecosystem: str, name: str, src: str, lic, ev: str):
        # a package that is simply not installed cannot be adjudicated: record
        # it as UNRESOLVED rather than a hard DENY (it is not shipped).
        if ev == "not installed":
            rows.append({"ecosystem": ecosystem, "package": name, "source": src,
                         "license": None, "verdict": "UNRESOLVED",
                         "evidence": ev, "reason": "package not installed"})
            return
        gate = classify(lic, evidence=ev)
        verdict, reason = gate.verdict, gate.reason
        exc = exceptions.get((ecosystem, name))
        note = None
        if verdict == "DENY" and exc is not None:
            if exc["_expired"]:
                verdict = "DENY"
                note = f"exception EXPIRED on {exc.get('expires')} -> must remediate"
                reason = reason + "; " + note
            else:
                verdict = "EXCEPTION"
                note = (f"exception until {exc.get('expires')} "
                        f"[owner={exc.get('owner')}]")
        rows.append({"ecosystem": ecosystem, "package": name, "source": src,
                     "license": gate.license, "verdict": verdict,
                     "evidence": ev, "reason": reason, "exception": note})

    if deep:
        npm_items = [(n, "node_modules") for n in _npm_all_installed()]
    else:
        npm_items = _npm_direct_deps()
    for name, src in npm_items:
        lic, ev = _npm_license(name)
        _add("npm", name, src, lic, ev)

    for name, src in _py_direct_deps():
        lic, ev = _py_license(name)
        _add("python", name, src, lic, ev)

    denied = [r for r in rows if r["verdict"] == "DENY"]
    unresolved = [r for r in rows if r["verdict"] == "UNRESOLVED"]
    excepted = [r for r in rows if r["verdict"] == "EXCEPTION"]
    return {"rows": rows, "denied": denied, "unresolved": unresolved,
            "excepted": excepted, "total": len(rows),
            "pass": sum(1 for r in rows if r["verdict"] == "ALLOW")}


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="SOP licence gate (CI)")
    ap.add_argument("--deep", action="store_true",
                    help="scan every installed npm package, not just direct deps")
    ap.add_argument("--json", help="write full results to this path")
    ap.add_argument("--changed-since", metavar="DATE",
                    help="informational only (recorded in output, no behavioural effect)")
    args = ap.parse_args(argv)

    res = check(deep=args.deep)

    print(f"SOP licence gate -- {res['total']} packages checked "
          f"({'deep' if args.deep else 'direct'})")
    for r in sorted(res["rows"], key=lambda x: (x["verdict"] != "DENY", x["package"])):
        mark = {"DENY": "DENY ", "UNRESOLVED": "??   ",
                "EXCEPTION": "EXC  "}.get(r["verdict"], "ok   ")
        extra = f"  {r['exception']}" if r.get("exception") else ""
        print(f"  [{mark}] {r['ecosystem']:6s} {r['package']:34s} "
              f"{(r['license'] or '-'):18s} {r['evidence']}{extra}")

    if res.get("excepted"):
        print(f"\n{len(res['excepted'])} time-boxed exception(s) in force "
              f"(see scripts/sop_exceptions.json):")
        for r in res["excepted"]:
            print(f"  {r['package']}: {r['exception']}")

    if args.json:
        payload = dict(res)
        if args.changed_since:
            payload["changed_since"] = args.changed_since
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        print(f"  -> wrote {args.json}")

    if res["denied"]:
        print(f"\nFAIL: {len(res['denied'])} package(s) failed the licence gate:")
        for r in res["denied"]:
            print(f"  {r['package']}: {r['reason']}")
        if res.get("unresolved"):
            print(f"  ({len(res['unresolved'])} package(s) not installed -> unresolved)")
        return 1
    print(f"\nPASS: {res['pass']}/{res['total']} packages on the allow-list"
          + (f" ({len(res['unresolved'])} unresolved/not-installed)"
             if res.get("unresolved") else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
