#!/usr/bin/env python3
"""GitHub 24/7 hunter -- open-source discovery under the reuse SOP.

The hunter searches GitHub for candidate repositories that could replace a
module we would otherwise build, then pushes every hit through the *five
dimension screen* from ``docs/OPEN_SOURCE_REUSE_SOP.md``:

    1. 协议闸门  (license hard gate)     -> scripts/sop_license_gate.py
    2. 活跃度    (recently pushed)
    3. 社区热度  (stars / forks)
    4. 技术栈匹配 (language)
    5. 维护成熟度 (not archived, has a license + description)

Dimension 1 is a *hard gate*: a single DENY short-circuits the whole record.
Unknown license is always denied (unknown-is-deny).

Usage
-----
    python scripts/github_hunter.py --query "children robot" --limit 10
    python scripts/github_hunter.py --offline            # no network, fixture only
    python scripts/github_hunter.py --queries-file q.txt --token "$GITHUB_TOKEN"

Output: ``scripts/docs/github_hunter_result.json`` (list of screened records)
        plus a human readable table on stdout.

The hunter never trusts model memory: every license verdict is annotated with
the evidence source (``github_api`` / ``offline_fixture``).
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sop_license_gate import classify  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DEFAULT = os.path.join(HERE, "docs", "github_hunter_result.json")

# Languages we are willing to absorb into the (Python + Node) stack.
LANG_OK = {"python", "typescript", "javascript", "go", "rust", "c++"}

DEFAULT_QUERIES = [
    "children companion robot",
    "kids voice assistant edge",
    "child safety AI moderation",
    "toy embedded firmware",
    "school learning platform",
]

# ── thresholds (dimension 2 & 3) ─────────────────────────────────────────────
MAX_AGE_MONTHS = 24          # stale beyond this -> fail activity
MIN_STARS = 50               # community heat floor
MIN_FORKS = 5

# ── offline fixture: realistic repo shapes so the hunter is testable w/o net ──
OFFLINE_FIXTURE: List[Dict[str, Any]] = [
    {
        "full_name": "acme/kids-voice-edge",
        "html_url": "https://github.com/acme/kids-voice-edge",
        "description": "On-device voice pipeline for children's toys",
        "stargazers_count": 1840, "forks_count": 210,
        "language": "Python", "archived": False,
        "pushed_at": "2099-01-01T00:00:00Z",
        "license": {"spdx_id": "MIT"},
        "topics": ["voice", "edge", "children"],
    },
    {
        "full_name": "corp/toy-firmware",
        "html_url": "https://github.com/corp/toy-firmware",
        "description": "Firmware for a talking doll",
        "stargazers_count": 320, "forks_count": 40,
        "language": "C++", "archived": False,
        "pushed_at": "2099-01-01T00:00:00Z",
        "license": {"spdx_id": "AGPL-3.0"},
        "topics": ["firmware", "toy"],
    },
    {
        "full_name": "ghost/unknown-license-lib",
        "html_url": "https://github.com/ghost/unknown-license-lib",
        "description": "Helper lib with no declared license",
        "stargazers_count": 900, "forks_count": 80,
        "language": "TypeScript", "archived": False,
        "pushed_at": "2099-01-01T00:00:00Z",
        "license": None,
        "topics": ["util"],
    },
    {
        "full_name": "old/abandoned-sdk",
        "html_url": "https://github.com/old/abandoned-sdk",
        "description": "An SDK nobody maintains anymore",
        "stargazers_count": 1200, "forks_count": 150,
        "language": "JavaScript", "archived": True,
        "pushed_at": "2019-05-01T00:00:00Z",
        "license": {"spdx_id": "Apache-2.0"},
        "topics": ["sdk"],
    },
]


# ── result record ─────────────────────────────────────────────────────────────


@dataclass
class Screened:
    repo: str
    url: str
    need: str
    verdict: str                       # PASS | DENY
    license: str
    stars: int
    forks: int
    language: str
    age_months: int
    score: float
    dimensions: Dict[str, str] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)
    evidence: str = "github_api"


# ── helpers ───────────────────────────────────────────────────────────────────


def _age_months(iso: Optional[str]) -> int:
    if not iso:
        return 999
    try:
        d = _dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
        now = _dt.datetime.now(_dt.timezone.utc)
        return max(0, (now - d).days // 30)
    except Exception:
        return 999


def screen_repo(repo: Dict[str, Any], need: str = "",
                evidence: str = "github_api") -> Screened:
    """Run the five dimension screen over one GitHub repo object."""
    name = repo.get("full_name") or repo.get("repo") or "?"
    url = repo.get("html_url", "")
    stars = int(repo.get("stargazers_count") or 0)
    forks = int(repo.get("forks_count") or 0)
    lang = (repo.get("language") or "").strip()
    archived = bool(repo.get("archived"))
    lic_raw = repo.get("license")
    if isinstance(lic_raw, dict):
        lic_raw = lic_raw.get("spdx_id") or lic_raw.get("name")
    age = _age_months(repo.get("pushed_at"))

    dims: Dict[str, str] = {}
    notes: List[str] = []

    # 1. license hard gate
    gate = classify(lic_raw, evidence=evidence)
    dims["license"] = gate.verdict
    if not gate.allowed:
        notes.append(gate.reason)

    # 2. activity
    dims["activity"] = "PASS" if age <= MAX_AGE_MONTHS else f"FAIL(age={age}mo)"
    if age > MAX_AGE_MONTHS:
        notes.append(f"stale > {MAX_AGE_MONTHS}mo")

    # 3. community heat
    heat = stars >= MIN_STARS and forks >= MIN_FORKS
    dims["community"] = "PASS" if heat else f"FAIL(stars={stars},forks={forks})"
    if not heat:
        notes.append("insufficient community traction")

    # 4. language / stack fit
    lang_ok = lang.lower() in LANG_OK
    dims["stack"] = "PASS" if lang_ok else f"FAIL(lang={lang or 'unknown'})"
    if not lang_ok:
        notes.append(f"language not in stack ({lang or 'unknown'})")

    # 5. maintenance maturity
    mature = (not archived) and bool(repo.get("description")) and lic_raw is not None
    dims["maturity"] = "PASS" if mature else (
        "FAIL(archived)" if archived else "FAIL(incomplete metadata)")
    if archived:
        notes.append("repository archived")

    # verdict: license gate is a hard gate; any other dimension failure = DENY
    def _ok(dim: str, val: str) -> bool:
        return val == ("ALLOW" if dim == "license" else "PASS")

    failed = [k for k, v in dims.items() if not _ok(k, v)]
    verdict = "PASS" if not failed else "DENY"

    # score = fraction of dimensions that pass (0..1)
    score = round(sum(1 for k, v in dims.items() if _ok(k, v)) / len(dims), 3)

    lic_token = gate.license
    return Screened(
        repo=name, url=url, need=need, verdict=verdict, license=lic_token,
        stars=stars, forks=forks, language=lang, age_months=age, score=score,
        dimensions=dims, notes=notes, evidence=evidence)


# ── network hunt ──────────────────────────────────────────────────────────────


def _search_github(query: str, limit: int, token: Optional[str]) -> List[Dict[str, Any]]:
    import httpx
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": "children-robot-sop-hunter"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    params = {"q": query, "sort": "stars", "order": "desc",
              "per_page": max(1, min(limit, 50))}
    r = httpx.get("https://api.github.com/search/repositories",
                  headers=headers, params=params, timeout=20)
    r.raise_for_status()
    return r.json().get("items", [])


def hunt(queries: List[str], limit: int, token: Optional[str] = None,
         offline: bool = False) -> List[Screened]:
    """Hunt for candidates across queries and screen them all."""
    out: List[Screened] = []
    if offline:
        for repo in OFFLINE_FIXTURE[:limit]:
            out.append(screen_repo(repo, need="offline fixture",
                                   evidence="offline_fixture"))
        return out

    seen: set[str] = set()
    for q in queries:
        try:
            items = _search_github(q, limit, token)
        except Exception as ex:  # network down -> degrade, never crash the loop
            print(f"[hunter] query '{q}' failed: {type(ex).__name__}: {ex}",
                  file=sys.stderr)
            continue
        for repo in items:
            full = repo.get("full_name")
            if not full or full in seen:
                continue
            seen.add(full)
            out.append(screen_repo(repo, need=q, evidence="github_api"))
    # sort: PASS first, then by score, then stars
    out.sort(key=lambda s: (s.verdict != "PASS", -s.score, -s.stars))
    return out[: max(limit, len(queries) * limit)]


# ── CLI ───────────────────────────────────────────────────────────────────────


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="SOP GitHub 24/7 hunter")
    ap.add_argument("--query", action="append", default=[],
                    help="search query (repeatable)")
    ap.add_argument("--queries-file", help="file with one query per line")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--token", default=os.environ.get("GITHUB_TOKEN", ""))
    ap.add_argument("--offline", action="store_true",
                    help="use bundled fixture, no network")
    ap.add_argument("--out", default=OUT_DEFAULT)
    args = ap.parse_args(argv)

    queries = list(args.query)
    if args.queries_file and os.path.exists(args.queries_file):
        with open(args.queries_file, encoding="utf-8") as f:
            queries += [ln.strip() for ln in f if ln.strip()]
    if not queries:
        queries = DEFAULT_QUERIES

    results = hunt(queries, args.limit, token=args.token or None,
                   offline=args.offline)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    payload = {
        "generated_at": _dt.datetime.now().isoformat(),
        "offline": args.offline,
        "queries": queries,
        "count": len(results),
        "pass": sum(1 for r in results if r.verdict == "PASS"),
        "items": [asdict(r) for r in results],
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"{'VERDICT':7s} {'SCORE':5s} {'STARS':>7s} {'AGE':>5s} "
          f"{'LICENSE':14s} REPO")
    for r in results:
        print(f"{r.verdict:7s} {r.score:<5.2f} {r.stars:>7d} {r.age_months:>4d}mo "
              f"{r.license[:14]:14s} {r.repo}")
    print(f"\n{payload['pass']}/{len(results)} PASS  ->  {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
