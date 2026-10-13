#!/usr/bin/env python3
"""OSS 五维筛选器 — 内部 SOP 的机器可执行部分。

用法:
    python scripts/oss_screen.py scrape        # 爬虫采集候选
    python scripts/oss_screen.py workflow     # 工作流引擎候选
    python scripts/oss_screen.py commerce     # 电商自动化候选
    python scripts/oss_screen.py owner/repo   # 单个仓库深查（默认）

五维（权重见 docs/sop/oss-screening-checklist.md）:
    1. 更新时间 20%   pushed_at / archived / disabled
    2. Star 社区 15%   stargazers / forks / open_issues（issue/star 比）
    3. 开源协议 35%   license.spdx_id + LICENSE 全文复核（一票否决）
    4. 技术栈   20%   与 runtime 同栈加分
    5. 部署难度 10%   外部依赖（DB/Redis/Go 服务/浏览器）

输出 JSON（可提交进 docs/research/evidence/ 作为检索证据），
并且许可判定复用 scripts/sop_license_gate.py 的白名单/拒绝规则 —— 不另造标准。
"""
from __future__ import annotations

import json
import os
import sys

try:
    import requests
except Exception:  # noqa: BLE001
    print("requests is required: pip install requests")
    raise

API = "https://api.github.com"
HEAD = {"Accept": "application/vnd.github+json",
        "User-Agent": "eu-robot-oss-screen",
        "X-GitHub-Api-Version": "2022-11-28"}
if os.getenv("GITHUB_PAT"):
    HEAD["Authorization"] = "Bearer " + os.environ["GITHUB_PAT"].strip()

# 白名单（与 scripts/sop_license_gate.py 保持一致：MIT/Apache/BSD/ISC/0BSD/Unlicense/Zlib）
OK_LICENSES = {"mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "bsd-3-clause-clear",
               "isc", "0bsd", "unlicense", "zlib"}
# 致命传染 / 非开源协议：见到即拒，不读全文
FATAL_LICENSES = {"agpl-3.0", "gpl-3.0", "gpl-2.0", "lgpl-3.0", "lgpl-2.1", "mpl-2.0",
                  "sspl-1.0", "elastic-license-2.0", "busl-1.1", "eupl-1.2",
                  "osl-3.0", "cc-by-nc-4.0"}
# API 认不出（other/noassertion）→ 必须读全文才能定性，不能默认放行
UNKNOWN_LICENSES = {"other", "noassertion"}

# 本项目运行时技术栈（用于维度 4 打分）
OUR_STACK = {"Python", "TypeScript", "JavaScript", "Go"}

# open-core 项目：MIT/Apache core 可用，但必须排除企业目录
OPEN_CORE_MARKERS = ("/ee", "ee/", "ENTERPRISE-LICENSE", "enterprise-license")

CATEGORIES = {
    "scrape": ["topic:crawler stars:>500", "topic:scraping-framework stars:>200",
               "topic:web-scraping stars:>200"],
    "workflow": ["topic:workflow-engine stars:>1000", "topic:workflow-automation stars:>1000",
                "topic:durable-execution stars:>500"],
    "commerce": ["topic:ecommerce stars:>3000", "topic:headless-commerce stars:>500",
                "topic:commerce stars:>1000"],
}


def _get(path: str):
    r = requests.get(API + path, headers=HEAD, timeout=30)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


def license_text(full: str, limit: int = 12000) -> str:
    """取 LICENSE 全文前 limit 字符——协议必须读原文，不能只信 API 字段。

    读多点（12k）：open-core 项目的 MIT 正文常出现在企业声明之后，
    只读头部会把它们误判成"未识别许可"。
    """
    for path in ("LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING", "LICENSE-MIT"):
        data = _get(f"/repos/{full}/contents/{path}")
        if data and isinstance(data, dict) and data.get("encoding") == "base64":
            import base64
            return base64.b64decode(data["content"]).decode("utf-8", "replace")[:limit]
    return ""


def screen_repo(full: str) -> dict:
    j = _get("/repos/" + full)
    if not j:
        return {"repo": full, "exists": False, "verdict": "REJECT — repo not found (possible hallucination)"}
    lic = (j.get("license") or {}).get("spdx_id") or "NOASSERTION"
    key = ((j.get("license") or {}).get("key") or "other").lower()
    stars = j.get("stargazers_count", 0)
    issues = j.get("open_issues_count", 0)
    text = license_text(full).lower()

    # 3. 协议（一票否决）
    # 3. 协议（一票否决）。顺序：致命协议 → 白名单 → 读全文定性 API 认不出的。
    permissive = ("permission is hereby granted, free of charge" in text
                  or ("apache license" in text and "version 2.0" in text))
    # open-core 的典型写法：某个目录（/ee、packages/ee）另受一份企业许可约束
    open_core = (("/ee" in text and "enterprise" in text)
                 or "/ee/" in text
                 or "license defined in" in text
                 or "enterprise-license" in text)
    if key in FATAL_LICENSES:
        lic_ok, lic_note = False, f"rejected — copyleft/non-OSS ({key})"
    elif key in OK_LICENSES or permissive:
        if open_core:
            lic_ok, lic_note = True, "open-core — MIT/Apache core only, exclude enterprise files"
        else:
            lic_ok, lic_note = True, "whitelist"
    elif "sustainable use" in text or "fair-code" in text:
        lic_ok, lic_note = False, "fair-code / Sustainable Use — not open source"
    else:
        lic_ok, lic_note = False, "unrecognised licence — deny by default"

    # 1. 更新时间
    import datetime as dt
    pushed = (j.get("pushed_at") or "")[:10]
    days = 9999
    try:
        days = (dt.date.today() - dt.date.fromisoformat(pushed)).days
    except Exception:  # noqa: BLE001
        pass
    if j.get("archived"):
        upd = 0
    elif days <= 90:
        upd = 5
    elif days <= 180:
        upd = 3
    else:
        upd = 1

    # 2. 社区（issue/star 比更诚实）
    ratio = (issues / stars) if stars else 9
    if stars > 20000 and ratio < 0.01:
        comm = 5
    elif stars > 5000 and ratio < 0.03:
        comm = 4
    elif stars > 500 and ratio < 0.08:
        comm = 3
    elif stars > 100:
        comm = 2
    else:
        comm = 1

    # 4. 技术栈
    stack_score = 5 if j.get("language") in OUR_STACK else 2

    # 5. 部署难度（按已知重型依赖粗判）
    heavy = ("postgres" in (j.get("description") or "").lower()
             or "kubernetes" in (j.get("description") or "").lower()
             or j.get("size", 0) > 400000)
    deploy = 2 if heavy else 5

    total = round(upd * .20 + comm * .15 + (5 if lic_ok else 0) * .35
                  + stack_score * .20 + deploy * .10, 2)
    if not lic_ok:
        verdict = "REJECT — licence"
    elif upd <= 1:
        verdict = "REJECT — stale/archived"
    elif "open-core" in lic_note:
        verdict = "CONDITIONAL — needs licence split + rework"
    elif total >= 4.0:
        verdict = "USE DIRECTLY"
    elif total >= 3.0:
        verdict = "REWORK"
    else:
        verdict = "SKIP"

    return {
        "repo": full, "exists": True, "stars": stars, "forks": j.get("forks_count"),
        "open_issues": issues, "issue_per_star": round(ratio, 4),
        "license_api": lic, "license_key": key, "licence_ok": lic_ok, "licence_note": lic_note,
        "language": j.get("language"), "size_kb": j.get("size"), "archived": j.get("archived"),
        "days_since_push": days, "scores": {"update": upd, "community": comm,
                                           "licence": 5 if lic_ok else 0, "stack": stack_score,
                                           "deploy": deploy, "total": total},
        "verdict": verdict, "description": (j.get("description") or "")[:140],
    }


def run_category(cat: str) -> dict:
    rows = []
    seen = set()
    for q in CATEGORIES.get(cat, CATEGORIES["scrape"]):
        r = requests.get(API + "/search/repositories",
                         params={"q": q, "per_page": 25, "sort": "stars", "order": "desc"},
                         headers=HEAD, timeout=30)
        r.raise_for_status()
        for it in (r.json().get("items") or []):
            if it["full_name"] in seen:
                continue
            seen.add(it["full_name"])
            rows.append(screen_repo(it["full_name"]))
    rows.sort(key=lambda x: -x["scores"]["total"])
    return {"category": cat, "candidates": rows[:20]}


def main() -> int:
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    if not arg:
        print(__doc__)
        return 1
    if arg in CATEGORIES:
        out = run_category(arg)
    else:
        out = {"repo": arg, **screen_repo(arg)}
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
