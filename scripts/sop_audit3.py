#!/usr/bin/env python3
"""
SOP executor v3 -- authoritative sources reachable from this environment:
  * npm registry  (license, version, time.modified)   -> Node side
  * PyPI JSON API  (license, release date)            -> Python side

Anti-hallucination enforcement:
  * name must resolve; 404 => invented name => DENY
  * license read from registry metadata, never from memory
  * unknown / not on allow-list => DENY
  * not updated in > 24 months => DENY (staleness)
"""
import json, time, urllib.request, urllib.error, os, datetime

ALLOWED = {"MIT", "APACHE-2.0", "BSD-2-CLAUSE", "BSD-3-CLAUSE", "ISC", "0BSD", "UNLICENSE",
           "CC0-1.0", "APACHE 2.0", "MIT LICENSE", "PYTHON SOFTWARE FOUNDATION LICENSE"}
DENY    = {"GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-3.0", "LGPL-2.1", "SSPL-1.0", "BSL-1.1",
           "BUSL-1.1", "ELASTIC-2.0", "OSL-3.0", "EUPL-1.2", "CC-BY-NC-4.0", "MPL-2.0",
           "CC-BY-NC-SA-4.0", "PROPRIETARY", "SEE LICENSE IN LICENSE"}
STALE_MONTHS = 24

# (name, ecosystem, need, tag)
CANDIDATES = [
    # ---- commerce core (订单路由/上架/定价) ----
    ("@vendure/core",          "npm", "订单路由/商品目录/定价规则",     "commerce-core"),
    ("@medusajs/medusa",       "npm", "订单/目录/支付编排",            "commerce-core"),
    ("@saleor/sdk",            "npm", "商品目录/订单(SDK)",            "commerce-core"),
    # ---- 数据闭环 / 自进化 ----
    ("posthog-js",             "npm", "数据闭环/行为分析",             "analytics"),
    ("posthog-node",           "npm", "数据闭环(服务端)",              "analytics"),
    ("growthbook",             "npm", "自进化 A/B",                    "growth"),
    ("@flagsmith/flagsmith",   "npm", "自进化 特性开关/A-B",            "growth"),
    # ---- 自学习 / LLM 评估 ----
    ("langfuse",               "npm", "自学习 LLM追踪/评估",            "llmops"),
    ("ragas",                  "pip", "自学习 RAG评估",                "llmops"),
    ("deepeval",               "pip", "自学习 LLM评估",                "llmops"),
    # ---- 外联 / 跟进 / 通知 ----
    ("@novu/node",             "npm", "外联通知基础设施",              "automation"),
    ("novu",                   "npm", "外联通知基础设施",              "automation"),
    ("activepieces",           "npm", "外联自动化编排",                "automation"),
    ("bullmq",                 "npm", "任务队列(编排)",                "queue"),
    ("nodemailer",             "npm", "外联邮件",                      "automation"),
    # ---- 蜘蛛发现 / 采集 ----
    ("crawlee",                "npm", "蜘蛛发现",                      "crawler"),
    ("playwright",             "npm", "采集渲染",                      "crawler"),
    ("puppeteer",              "npm", "采集渲染",                      "crawler"),
    ("scrapy",                 "pip", "蜘蛛发现",                      "crawler"),
    # ---- 内容官 / 上架 CMS ----
    ("payload",                "npm", "内容官/上架/入库",              "cms"),
    ("directus",               "npm", "数据闭环低代码",                "database"),
    ("nocodb",                 "npm", "数据闭环低代码",                "database"),
    # ---- 物流 ----
    ("shippo",                 "npm", "物流运费/追踪",                 "logistics"),
    ("@easypost/api",          "npm", "物流运费/追踪",                 "logistics"),
    # ---- 售后 / 咨询 ----
    ("@chatwoot/app",          "npm", "售后咨询",                      "support"),
    # ---- 文档/发票 ----
    ("gotenberg-js-client",   "npm", "发票PDF",                       "documents"),
    ("pdfkit",                 "npm", "发票PDF生成",                   "documents"),
    # ---- 已有依赖（基线核对） ----
    ("express",                "npm", "基线",                           "baseline"),
    ("helmet",                 "npm", "基线",                           "baseline"),
    ("otplib",                 "npm", "基线",                           "baseline"),
]


def fetch(url, timeout=8):
    req = urllib.request.Request(url, headers={"User-Agent": "sop-check"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


LICENSE_SIGNATURES = [
    ("AGPL-3.0", "GNU AFFERO GENERAL PUBLIC LICENSE"),
    ("GPL-3.0",  "GNU GENERAL PUBLIC LICENSE"),
    ("GPL-2.0",  "GNU GENERAL PUBLIC LICENSE VERSION 2"),
    ("LGPL-3.0", "GNU LESSER GENERAL PUBLIC LICENSE"),
    ("SSPL-1.0", "SERVER SIDE PUBLIC LICENSE"),
    ("BUSL-1.1", "BUSINESS SOURCE LICENSE"),
    ("BSL-1.1",  "BOOST SOFTWARE LICENSE"),
    ("ELASTIC-2.0", "ELASTIC LICENSE"),
    ("OSL-3.0",  "OPEN SOFTWARE LICENSE"),
    ("EUPL-1.2", "EUROPEAN UNION PUBLIC LICENCE"),
    ("MPL-2.0",  "MOZILLA PUBLIC LICENSE"),
    ("CC-BY-NC-4.0", "CREATIVE COMMONS ATTRIBUTION-NONCOMMERCIAL"),
    ("CC0-1.0",  "CC0 1.0 UNIVERSAL"),
    ("UNLICENSE", "THIS IS FREE AND UNENCUMBERED SOFTWARE RELEASED INTO THE PUBLIC DOMAIN"),
    ("APACHE-2.0", "APACHE LICENSE"),
    ("MIT",      "PERMISSION IS HEREBY GRANTED, FREE OF CHARGE"),
    ("BSD-3-CLAUSE", "REDISTRIBUTION AND USE IN SOURCE AND BINARY"),
    ("BSD-2-CLAUSE", "REDISTRIBUTION AND USE IN SOURCE AND BINARY"),
    ("ISC",      "PERMISSION TO USE, COPY, MODIFY, AND/OR DISTRIBUTE THIS SOFTWARE"),
    ("PYTHON SOFTWARE FOUNDATION LICENSE", "PYTHON SOFTWARE FOUNDATION LICENSE"),
]

def norm_lic(lic):
    """Normalize a license field that may be a dict, a short SPDX string, or the
    ENTIRE license text (common on PyPI). Signature match instead of exact match."""
    if lic is None:
        return None
    if isinstance(lic, dict):
        lic = lic.get("type") or ""
    if not isinstance(lic, str):
        return None
    s = lic.strip()
    if not s:
        return None
    up = s.upper()
    # short SPDX-style id -> exact match against allow/deny lists
    if len(up) <= 40 and "\n" not in s:
        return up
    # long text -> classify by signature (most specific first)
    for name, sig in LICENSE_SIGNATURES:
        if sig in up:
            return name
    return up[:60]


def months_old(dt_iso):
    try:
        d = datetime.datetime.fromisoformat(dt_iso.replace("Z", "+00:00"))
        return (datetime.datetime.now(datetime.timezone.utc) - d).days // 30
    except Exception:
        return -1


rows = []
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs", "sop_reuse_audit.json")
os.makedirs(os.path.dirname(OUT), exist_ok=True)


def save_partial():
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump([{"package": r[0], "ecosystem": r[1], "tag": r[4], "verdict": r[2],
                    "note": r[3], "need": r[5]} for r in rows], f, indent=2, ensure_ascii=False)


for name, eco, need, tag in CANDIDATES:
    try:
        if eco == "npm":
            d = fetch(f"https://registry.npmjs.org/{name.replace('/', '%2f')}")
            latest = d.get("dist-tags", {}).get("latest", "")
            ver = (d.get("versions") or {}).get(latest, {})
            lic = norm_lic(ver.get("license") or d.get("license"))
            modified = (d.get("time") or {}).get(latest) or (d.get("time") or {}).get("modified", "")
            age = months_old(modified)
            extra = f"v{latest}"
        else:
            d = fetch(f"https://pypi.org/pypi/{name}/json")
            info = d.get("info", {})
            lic = norm_lic(info.get("license") or info.get("license_expression"))
            rels = d.get("releases") or {}
            dates = [f["upload_time"] for v in rels.values() for f in v if f.get("upload_time")]
            latest_date = max(dates) if dates else ""
            age = months_old(latest_date)
            extra = f"v{info.get('version','?')}, py-updated {latest_date[:10]}"
    except urllib.error.HTTPError as e:
        rows.append((name, eco, "DENY", f"HTTP {e.code} -- not resolvable (invented name?)", tag, need))
        time.sleep(0.2)
        continue
    except Exception as e:
        rows.append((name, eco, "DENY", f"unreachable {str(e)[:60]}", tag, need))
        time.sleep(0.2)
        continue

    notes = []
    if lic is None:
        verdict, why = "DENY", "license UNKNOWN -> unknown-is-deny"
    elif lic in ALLOWED:
        verdict, why = "PASS", f"license OK ({lic})"
    elif lic in DENY:
        verdict, why = "DENY", f"license DENY ({lic})"
    else:
        verdict, why = "DENY", f"license '{lic}' not on allow-list -> deny"
    notes.append(why)
    notes.append(extra)
    if age >= 0:
        notes.append(f"age={age}mo")
        if age > STALE_MONTHS:
            verdict = "DENY"
            notes.append(f"STALE(>{STALE_MONTHS}mo)")
    rows.append((name, eco, verdict, "; ".join(notes), tag, need))
    save_partial()
    print(f"{name:26s} {eco:4s} {tag:15s} {verdict:7s} {'; '.join(notes)}", flush=True)
    time.sleep(0.05)

print(f"{'PACKAGE':26s} {'ECO':4s} {'TAG':15s} {'VERDICT':7s} NOTES")
print("-" * 132)
for r in rows:
    print(f"{r[0]:26s} {r[1]:4s} {r[4]:15s} {r[2]:7s} {r[3]}   <- {r[5]}")

passes = [r for r in rows if r[2] == "PASS"]
print()
print(f"PASS {len(passes)} / {len(rows)}")
print()
print("=== PASSING CANDIDATES (by 16-step need) ===")
for r in passes:
    print(f"  [{r[4]:15s}] {r[0]:24s} {r[5]}")

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs", "sop_reuse_audit.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump([{"package": r[0], "ecosystem": r[1], "tag": r[4], "verdict": r[2],
                "note": r[3], "need": r[5]} for r in rows], f, indent=2, ensure_ascii=False)
print("saved:", out)