#!/usr/bin/env python3
"""SOP discovery executor -- the executable form of the five step checklist.

For a curated candidate set it pulls *authoritative* facts from the registries
(never from model memory) and applies the five dimension screen:

    1. licence   -> scripts/sop_license_gate.py        (HARD GATE)
    2. activity  -> last release / push (<= 24 months)
    3. community -> GitHub stars (>= 2000, >= 1000 for tool-tier)
    4. stack     -> language fits Node/Python baseline
    5. deploy    -> curated difficulty score (1 hard .. 5 easy)

Facts come from:
    npm  : https://registry.npmjs.org/<pkg>
    PyPI : https://pypi.org/pypi/<pkg>/json
    GitHub: https://api.github.com/repos/<owner>/<repo>

Results are cached in ``scripts/docs/sop_discovery_cache.json`` so re-runs are
cheap and offline-tolerant.  Output: ``scripts/docs/sop_discovery.json``.

Usage
-----
    python scripts/sop_discovery.py                 # all categories
    python scripts/sop_discovery.py --category tts
    python scripts/sop_discovery.py --offline       # cache only
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sop_license_gate import classify  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, "docs")
CACHE = os.path.join(DOCS, "sop_discovery_cache.json")
OUT = os.path.join(DOCS, "sop_discovery.json")

UA = {"User-Agent": "children-robot-sop-discovery"}
NPM_OK_LANGS = {"javascript", "typescript", "python", "go", "rust", "c++", "c"}


# ── curated candidates ────────────────────────────────────────────────────────
# deploy: 5 = drop-in, 4 = trivial, 3 = adapter, 2 = infra + adapter, 1 = heavy
CANDIDATES: Dict[str, List[Dict[str, Any]]] = {
    "crawler": [
        {"name": "crawlee", "eco": "npm", "deploy": 4,
         "note": "Apache-2.0 scraping/actor framework (playwright+cheerio)"},
        {"name": "playwright", "eco": "npm", "deploy": 4,
         "note": "browser automation, Apache-2.0"},
        {"name": "puppeteer", "eco": "npm", "deploy": 4, "note": "headless Chrome"},
        {"name": "cheerio", "eco": "npm", "deploy": 5, "note": "fast static HTML parse"},
        {"name": "crawl4ai", "eco": "pypi", "deploy": 3,
         "note": "LLM-friendly crawler, Apache-2.0"},
        {"name": "scrapy", "eco": "pypi", "deploy": 4, "note": "BSD-3 mature crawl framework"},
        {"name": "trafilatura", "eco": "pypi", "deploy": 5,
         "note": "main-content extraction, Apache-2.0"},
    ],
    "workflow": [
        {"name": "@temporalio/client", "eco": "npm", "deploy": 2,
         "note": "durable workflow, needs Temporal server"},
        {"name": "bullmq", "eco": "npm", "deploy": 3, "note": "Redis queue, MIT"},
        {"name": "temporalio", "eco": "pypi", "deploy": 2, "note": "python Temporal SDK"},
        {"name": "prefect", "eco": "pypi", "deploy": 3, "note": "Apache-2.0 orchestration"},
        {"name": "dagster", "eco": "pypi", "deploy": 3, "note": "Apache-2.0 data orchestration"},
        {"name": "apache-airflow", "eco": "pypi", "deploy": 2,
         "note": "Apache-2.0, heavy scheduler"},
        {"name": "luigi", "eco": "pypi", "deploy": 4, "note": "lightweight pipelines"},
    ],
    "ecommerce": [
        {"name": "@medusajs/medusa", "eco": "npm", "deploy": 2, "note": "OSS commerce core"},
        {"name": "payload", "eco": "npm", "deploy": 3, "note": "MIT headless CMS/commerce"},
        {"name": "@saleor/sdk", "eco": "npm", "deploy": 3, "note": "Saleor storefront SDK"},
        {"name": "shippo", "eco": "npm", "deploy": 4, "note": "multi-carrier shipping API"},
        {"name": "@novu/node", "eco": "npm", "deploy": 3, "note": "notification/outreach infra"},
        {"name": "saleor", "eco": "pypi", "deploy": 2, "note": "commerce platform (python)"},
    ],
    "tts": [
        {"name": "msedge-tts", "eco": "npm", "deploy": 4, "note": "Edge TTS node client"},
        {"name": "node-edge-tts", "eco": "npm", "deploy": 4, "note": "Edge TTS node client"},
        {"name": "edge-tts", "eco": "npm", "deploy": 4, "note": "node edge-tts (legacy)"},
        {"name": "@andresaya/edge-tts", "eco": "npm", "deploy": 4,
         "note": "current dep (GPL-3.0-only)"},
    ],
}

TOOL_TIER = {"cheerio", "trafilatura", "shippy", "shippo", "payload",
             "msedge-tts", "node-edge-tts", "edge-tts", "@sop/none"}
MAX_AGE_MONTHS = 24


# ── cache ─────────────────────────────────────────────────────────────────────
# NOTE: we cache *distilled* facts keyed by "<eco>:<name>" / "gh:<slug>".
# Raw registry bodies are multi-megabyte and must never be persisted (a prior
# version of this tool grew the cache to ~77 MB by storing them verbatim).
def _load_cache() -> Dict[str, Any]:
    if os.path.exists(CACHE):
        try:
            return json.load(open(CACHE, encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_cache(c: Dict[str, Any]):
    os.makedirs(DOCS, exist_ok=True)
    json.dump(c, open(CACHE, "w", encoding="utf-8"), indent=2, ensure_ascii=False)


def _http_json(url: str, offline: bool, retries: int = 2,
               headers: Optional[Dict[str, str]] = None) -> Optional[Any]:
    """GET + parse JSON with bounded retries. Never persists anything."""
    if offline:
        return None
    import httpx
    for attempt in range(retries + 1):
        try:
            r = httpx.get(url, headers=headers or UA, timeout=20, follow_redirects=True)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (403, 429) and attempt < retries:
                time.sleep(2 * (attempt + 1))   # rate limited -> back off
                continue
            return None
        except Exception:
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            return None
    return None


def _gh_headers() -> Dict[str, str]:
    h = dict(UA)
    tok = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


# ── registry readers ──────────────────────────────────────────────────────────
def _months_since(iso: Optional[str]) -> Optional[int]:
    if not iso:
        return None
    try:
        d = _dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return max(0, (_dt.datetime.now(_dt.timezone.utc) - d).days // 30)
    except Exception:
        return None


def _repo_url(raw: Any) -> str:
    if isinstance(raw, str):
        return raw
    if isinstance(raw, dict):
        return raw.get("url", "") or ""
    return ""


def npm_facts(name: str, cache, offline) -> Dict[str, Any]:
    key = f"npm:{name}"
    if key in cache:
        return cache[key]
    if offline:
        return {"resolved": False}
    d = _http_json(f"https://registry.npmjs.org/{name}", offline)
    if not d:
        return {"resolved": False}
    latest = (d.get("dist-tags") or {}).get("latest")
    v = (d.get("versions") or {}).get(latest, {})
    mod = (d.get("time") or {}).get("modified")
    facts = {"resolved": True, "version": latest, "license": v.get("license"),
             "description": v.get("description"), "repo_url": _repo_url(v.get("repository")),
             "modified": mod, "age_months": _months_since(mod),
             "deprecated": bool(v.get("deprecated"))}
    cache[key] = facts
    return facts


def pypi_facts(name: str, cache, offline) -> Dict[str, Any]:
    key = f"pypi:{name}"
    if key in cache:
        return cache[key]
    if offline:
        return {"resolved": False}
    d = _http_json(f"https://pypi.org/pypi/{name}/json", offline)
    if not d:
        return {"resolved": False}
    info = d.get("info") or {}
    version = info.get("version")
    urls = d.get("urls") or []
    upload = urls[0].get("upload_time_iso_8601") if urls else None
    lic = info.get("license_expression") or info.get("license")
    if not lic or len(lic) > 100 or "\n" in lic:
        for c in (info.get("classifiers") or []):
            if c.startswith("License ::"):
                lic = c.split("::")[-1].strip()
                break
    repo_url = ""
    for k, val in (info.get("project_urls") or {}).items():
        if "github" in (val or "").lower() or "source" in k.lower():
            repo_url = val
            break
    facts = {"resolved": True, "version": version, "license": lic,
             "description": info.get("summary"), "repo_url": repo_url,
             "modified": upload, "age_months": _months_since(upload)}
    cache[key] = facts
    return facts


def github_facts(repo_url: str, cache, offline) -> Dict[str, Any]:
    if not repo_url or "github.com" not in repo_url:
        return {}
    slug = repo_url.replace(".git", "").rstrip("/").split("github.com/")[-1]
    if slug.count("/") != 1:
        return {}
    key = f"gh:{slug}"
    if key in cache:
        return cache[key]
    if offline:
        return {}
    d = _http_json(f"https://api.github.com/repos/{slug}", offline, headers=_gh_headers())
    if not d:
        return {}
    facts = {"stars": d.get("stargazers_count"), "forks": d.get("forks_count"),
             "archived": d.get("archived"), "language": d.get("language"),
             "pushed_at": d.get("pushed_at"),
             "gh_age_months": _months_since(d.get("pushed_at")),
             "gh_license": ((d.get("license") or {}) or {}).get("spdx_id")}
    cache[key] = facts
    return facts


# ── five dimension screen ─────────────────────────────────────────────────────
def screen(cand: Dict[str, Any], facts: Dict[str, Any], gh: Dict[str, Any]) -> Dict[str, Any]:
    name = cand["name"]
    dims: Dict[str, str] = {}

    raw_license = facts.get("license") or gh.get("gh_license")
    gate = classify(raw_license, evidence=f"{cand['eco']}_registry")
    # 1. licence hard gate
    dims["license"] = f"ALLOW({gate.license})" if gate.allowed else f"DENY({gate.license})"

    # 2. activity (prefer repo push, else package release)
    age = gh.get("gh_age_months")
    if age is None:
        age = facts.get("age_months")
    if not facts.get("resolved"):
        dims["activity"] = "UNRESOLVED"
    elif age is None:
        dims["activity"] = "UNKNOWN"
    else:
        dims["activity"] = "PASS" if age <= MAX_AGE_MONTHS else f"FAIL({age}mo)"

    # 3. community
    stars = gh.get("stars")
    floor = 1000 if name in TOOL_TIER else 2000
    if stars is None:
        dims["community"] = "n/a"
    else:
        dims["community"] = "PASS" if stars >= floor else f"LOW({stars})"

    # 4. stack fit
    lang = (gh.get("language") or "").lower()
    dims["stack"] = "PASS" if (not lang or lang in NPM_OK_LANGS) \
        else f"CHECK({gh.get('language')})"

    # 5. deployment difficulty (curated)
    dims["deploy"] = f"{cand['deploy']}/5"

    archived = bool(gh.get("archived"))
    # stale: prefer repo push age, else the package's own release age
    eff_age = gh.get("gh_age_months")
    if eff_age is None:
        eff_age = facts.get("age_months")
    stale = (eff_age is not None and eff_age > MAX_AGE_MONTHS)
    verdict = "PASS" if (gate.allowed and facts.get("resolved") and not archived and not stale) \
        else "DENY"
    return {"name": name, "eco": cand["eco"], "category": cand["category"],
            "verdict": verdict, "license": gate.license,
            "version": facts.get("version"), "stars": gh.get("stars"),
            "age_months": facts.get("age_months"), "gh_age_months": gh.get("gh_age_months"),
            "archived": archived, "language": gh.get("language"),
            "deploy": cand["deploy"], "dimensions": dims, "note": cand["note"],
            "resolved": facts.get("resolved", False)}


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="SOP five-step discovery executor")
    ap.add_argument("--category", action="append", default=[])
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args(argv)

    cache = _load_cache()
    cats = args.category or list(CANDIDATES)
    results: List[Dict[str, Any]] = []

    for cat in cats:
        for cand in CANDIDATES.get(cat, []):
            cand = dict(cand, category=cat)
            facts = npm_facts(cand["name"], cache, args.offline) if cand["eco"] == "npm" \
                else pypi_facts(cand["name"], cache, args.offline)
            gh = github_facts(facts.get("repo_url", ""), cache, args.offline) if facts.get("resolved") else {}
            results.append(screen(cand, facts, gh))

    _save_cache(cache)
    os.makedirs(DOCS, exist_ok=True)
    json.dump({"generated_at": _dt.datetime.now().isoformat(),
               "offline": args.offline, "items": results},
              open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    cur = None
    for r in results:
        if r["category"] != cur:
            cur = r["category"]
            print(f"\n== {cur} ==")
            print(f"  {'verdict':6s} {'pkg':22s} {'lic':16s} {'ver':10s} "
                  f"{'stars':>7s} {'age':>5s} dep")
        lic = (r["license"] or "?")[:16]
        age = r["gh_age_months"] if r["gh_age_months"] is not None else r["age_months"]
        print(f"  {r['verdict']:6s} {r['name']:22s} {lic:16s} "
              f"{(r['version'] or '-'):10s} {str(r['stars'] or '-'):>7s} "
              f"{str(age if age is not None else '-'):>5s} {r['deploy']}/5")
    print(f"\nwrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
