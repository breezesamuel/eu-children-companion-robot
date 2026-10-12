#!/usr/bin/env python3
"""
SOP executor round 2 — authoritative verification via npm / PyPI registries.

Targets this round:
  A. 爬虫采集框架 (crawler / scraping)
  B. 工作流引擎 (workflow / job orchestration)
  C. 自主电商自动化 (headless commerce + autonomous ops)
  D. 自主运营支撑 (agent / memory / browser automation)

Gate (unchanged, from OPEN_SOURCE_REUSE_SOP.md):
  allow MIT / MIT-0 / Apache-2.0 / BSD-2 / BSD-3 / ISC / 0BSD / Unlicense / CC0
  deny  GPL/LGPL/AGPL/SSPL/BSL/BUSL/Elastic-2.0/OSL/MPL/CC-BY-NC/fair-code SUSTAINABLE USE
  unknown -> deny. name must resolve (404 = invented). stale > 24 months -> deny.
"""
import subprocess, json, os, sys, datetime, shutil

NPM = shutil.which("npm") or shutil.which("npm.cmd") or r"C:\Program Files\nodejs\npm.cmd"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs", "sop_reuse_audit_round2.json")

ALLOWED = {"MIT", "MIT-0", "APACHE-2.0", "BSD-2-CLAUSE", "BSD-3-CLAUSE", "ISC", "0BSD",
           "UNLICENSE", "CC0-1.0", "APACHE 2.0", "PYTHON SOFTWARE FOUNDATION LICENSE"}
DENY = {"GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-3.0", "LGPL-2.1", "SSPL-1.0", "BSL-1.1",
        "BUSL-1.1", "ELASTIC-2.0", "OSL-3.0", "EUPL-1.2", "CC-BY-NC-4.0", "MPL-2.0",
        "CC-BY-NC-SA-4.0", "PROPRIETARY", "SEE LICENSE IN LICENSE", "SUSTAINABLE USE LICENSE",
        "NGPL", "POSTGRESQL LICENSE"}
SIG = [("AGPL-3.0", "GNU AFFERO"), ("GPL-3.0", "GNU GENERAL PUBLIC LICENSE"),
       ("GPL-2.0", "GNU GENERAL PUBLIC LICENSE VERSION 2"), ("LGPL-3.0", "GNU LESSER"),
       ("SSPL-1.0", "SERVER SIDE PUBLIC"), ("BUSL-1.1", "BUSINESS SOURCE"),
       ("BSL-1.1", "BOOST SOFTWARE"), ("ELASTIC-2.0", "ELASTIC LICENSE"),
       ("OSL-3.0", "OPEN SOFTWARE LICENSE"), ("MPL-2.0", "MOZILLA PUBLIC"),
       ("CC-BY-NC-4.0", "CREATIVE COMMONS ATTRIBUTION-NONCOMMERCIAL"),
       ("CC0-1.0", "CC0 1.0 UNIVERSAL"),
       ("UNLICENSE", "THIS IS FREE AND UNENCUMBERED"),
       ("APACHE-2.0", "APACHE LICENSE"),
       ("MIT", "PERMISSION IS HEREBY GRANTED, FREE OF CHARGE"),
       ("BSD-3-CLAUSE", "REDISTRIBUTION AND USE"), ("ISC", "PERMISSION TO USE, COPY, MODIFY"),
       ("PYTHON SOFTWARE FOUNDATION LICENSE", "PYTHON SOFTWARE FOUNDATION LICENSE")]

# (name, ecosystem, category, need)
CANDIDATES = [
    # ── A. 爬虫采集框架 ──────────────────────────────────────────────────
    ("crawlee",                     "npm", "A-crawler", "headless浏览器抓取+队列+去重"),
    ("got-scraping",                "npm", "A-crawler", "反检测HTTP抓取"),
    ("playwright",                  "npm", "A-crawler", "浏览器自动化(已有依赖)"),
    ("cheerio",                     "npm", "A-crawler", "服务端HTML解析(已有依赖)"),
    ("playwright-extra",            "npm", "A-crawler", "Playwright插件生态"),
    ("apify-client",                "npm", "A-crawler", "Apify云爬虫SDK"),
    ("simplecrawler",               "npm", "A-crawler", "轻量Node爬虫"),
    ("node-crawler",                "npm", "A-crawler", "老牌Node爬虫"),
    ("scrapy",                      "pip", "A-crawler", "Python爬虫框架"),
    ("requests-html",               "pip", "A-crawler", "Python渲染抓取"),
    ("newspaper3k",                 "pip", "A-crawler", "Python新闻抽取"),

    # ── B. 工作流引擎 ────────────────────────────────────────────────────
    ("@temporalio/client",          "npm", "B-workflow", "持久化工作流引擎"),
    ("@temporalio/worker",          "npm", "B-workflow", "Temporal worker"),
    ("bullmq",                      "npm", "B-workflow", "Redis任务队列(已有)"),
    ("agenda",                      "npm", "B-workflow", "MongoDB任务调度"),
    ("toad-scheduler",              "npm", "B-workflow", "内存任务调度"),
    ("graphile-worker",             "npm", "B-workflow", "PG任务队列"),
    ("node-cron",                   "npm", "B-workflow", "cron调度"),
    ("cron",                        "npm", "B-workflow", "另一cron实现"),
    ("airflow",                     "pip", "B-workflow", "数据管道编排"),
    ("prefect",                     "pip", "B-workflow", "Python工作流"),
    ("dagster",                     "pip", "B-workflow", "数据资产编排"),
    ("luigi",                       "pip", "B-workflow", "批处理管道"),

    # ── C. 自主电商自动化 ────────────────────────────────────────────────
    ("payload",                     "npm", "C-ecommerce", "headless CMS/商品/内容"),
    ("@keystone-6/core",            "npm", "C-ecommerce", "headless CMS/GraphQL"),
    ("@saleor/sdk",                 "npm", "C-ecommerce", "电商SDK"),
    ("crystallize",                 "npm", "C-ecommerce", "PIM/电商API"),
    ("stripe",                      "npm", "C-ecommerce", "支付(已有)"),
    ("@shopify/admin-api-client",   "npm", "C-ecommerce", "Shopify(对比)"),
    ("shippo",                      "npm", "C-ecommerce", "物流多承运商"),
    ("pdfkit",                      "npm", "C-ecommerce", "发票PDF"),
    ("resend",                      "npm", "C-ecommerce", "邮件发送API"),

    # ── D. 自主运营支撑（自学习/自记忆/自进化）────────────────────────
    ("@langchain/langgraph",        "npm", "D-autonomous", "LLM智能体编排"),
    ("langgraph",                   "pip", "D-autonomous", "LLM智能体编排"),
    ("crewai",                      "pip", "D-autonomous", "多智能体协作"),
    ("mem0ai",                      "pip", "D-autonomous", "智能体长期记忆"),
    ("letta",                       "pip", "D-autonomous", "有状态智能体记忆"),
    ("zep",                         "pip", "D-autonomous", "记忆/时序知识图谱"),
    ("cognee",                      "pip", "D-autonomous", "自建记忆层"),
    ("smolagents",                  "pip", "D-autonomous", "轻量智能体"),
    ("browser-use",                 "pip", "D-autonomous", "浏览器自主操作智能体"),
    ("e2b",                         "pip", "D-autonomous", "智能体沙箱执行"),
    ("browserbase",                 "npm", "D-autonomous", "托管浏览器"),
]


def norm(lic):
    if lic is None: return None
    if isinstance(lic, dict): lic = lic.get("type") or ""
    if not isinstance(lic, str): return None
    s = lic.strip(); up = s.upper()
    if not s: return None
    if len(up) <= 40 and "\n" not in s: return up
    for n, sig in SIG:
        if sig in up: return n
    return up[:60]


def months_old(iso):
    try:
        d = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return (datetime.datetime.now(datetime.timezone.utc) - d).days // 30
    except Exception:
        return -1


def run_json(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=90)
    if r.returncode != 0:
        return None
    return json.loads(r.stdout)


done = {}
if os.path.exists(OUT):
    try:
        done = {e["package"]: e for e in json.load(open(OUT, encoding="utf-8"))}
    except Exception:
        done = {}


def save():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(list(done.values()), open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)


for name, eco, cat, need in CANDIDATES:
    if name in done:
        print(f"{name:30s} {cat:12s} {done[name]['verdict']:5s} (cached)", flush=True)
        continue
    try:
        if eco == "npm":
            d = run_json([NPM, "view", name, "license", "version", "time.modified", "--json"])
            if not d:
                row = {"package": name, "ecosystem": eco, "category": cat, "verdict": "DENY",
                       "note": "npm view failed -> not resolvable (invented name?)", "need": need}
            else:
                lic = norm(d.get("license"))
                mod = (d.get("time") or {}).get("modified", "")
                age = months_old(mod)
                notes = []
                if lic is None:
                    verdict, why = "DENY", "license UNKNOWN -> unknown-is-deny"
                elif lic in ALLOWED:
                    verdict, why = "PASS", f"license OK ({lic})"
                elif lic in DENY:
                    verdict, why = "DENY", f"license DENY ({lic})"
                else:
                    verdict, why = "DENY", f"license '{lic}' not on allow-list -> deny"
                notes.append(why); notes.append(f"v{d.get('version','?')}"); notes.append(f"age={age}mo")
                if age > 24:
                    verdict = "DENY"; notes.append("STALE(>24mo)")
                row = {"package": name, "ecosystem": eco, "category": cat,
                       "verdict": verdict, "note": "; ".join(notes), "need": need}
        else:
            d = run_json(["pip", "index", "versions", name, "--json"]) if False else None
            import urllib.request
            with urllib.request.urlopen(f"https://pypi.org/pypi/{name}/json", timeout=20) as resp:
                d = json.loads(resp.read().decode())
            info = d.get("info", {})
            lic = norm(info.get("license") or info.get("license_expression"))
            rels = d.get("releases") or {}
            dates = [f["upload_time"] for v in rels.values() for f in v if f.get("upload_time")]
            latest = max(dates) if dates else ""
            age = months_old(latest)
            notes = []
            if lic is None:
                verdict, why = "DENY", "license UNKNOWN -> unknown-is-deny"
            elif lic in ALLOWED:
                verdict, why = "PASS", f"license OK ({lic})"
            elif lic in DENY:
                verdict, why = "DENY", f"license DENY ({lic})"
            else:
                verdict, why = "DENY", f"license '{lic}' not on allow-list -> deny"
            notes.append(why); notes.append(f"v{info.get('version','?')}"); notes.append(f"age={age}mo")
            if age > 24:
                verdict = "DENY"; notes.append("STALE(>24mo)")
            row = {"package": name, "ecosystem": eco, "category": cat,
                   "verdict": verdict, "note": "; ".join(notes), "need": need}
    except Exception as ex:
        row = {"package": name, "ecosystem": eco, "category": cat, "verdict": "DENY",
               "note": f"error {str(ex)[:70]}", "need": need}

    done[name] = row
    save()
    print(f"{name:30s} {cat:12s} {row['verdict']:5s} {row['note'][:78]}", flush=True)

print()
bycat = {}
for r in done.values():
    bycat.setdefault(r["category"], []).append(r)
for cat, rows in bycat.items():
    ok = [r for r in rows if r["verdict"] == "PASS"]
    print(f"=== {cat}: {len(ok)}/{len(rows)} passed ===")
    for r in ok:
        print(f"   [PASS] {r['package']:30s} {r['note'][:64]}")
    for r in rows:
        if r["verdict"] != "PASS":
            print(f"   [DENY] {r['package']:30s} {r['note'][:64]}")
print(f"\nTOTAL PASS {sum(1 for r in done.values() if r['verdict']=='PASS')}/{len(done)}")
print("saved:", OUT)