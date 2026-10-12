import subprocess, json, os, sys, datetime, shutil

NPM = shutil.which("npm") or shutil.which("npm.cmd") or r"C:\Program Files\nodejs\npm.cmd"
print("using npm:", NPM, flush=True)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs", "sop_reuse_audit.json")
existing = []
if os.path.exists(OUT):
    try:
        existing = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        existing = []
done = {e["package"]: e for e in existing}

ALLOWED = {"MIT", "APACHE-2.0", "BSD-2-CLAUSE", "BSD-3-CLAUSE", "ISC", "0BSD", "UNLICENSE",
           "CC0-1.0", "APACHE 2.0", "MIT LICENSE", "PYTHON SOFTWARE FOUNDATION LICENSE"}
DENY = {"GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-3.0", "LGPL-2.1", "SSPL-1.0", "BSL-1.1",
        "BUSL-1.1", "ELASTIC-2.0", "OSL-3.0", "EUPL-1.2", "CC-BY-NC-4.0", "MPL-2.0",
        "CC-BY-NC-SA-4.0", "PROPRIETARY", "SEE LICENSE IN LICENSE"}
SIG = [("AGPL-3.0","GNU AFFERO"),("GPL-3.0","GNU GENERAL PUBLIC"),("GPL-2.0","GNU GENERAL PUBLIC LICENSE VERSION 2"),
       ("LGPL-3.0","GNU LESSER"),("SSPL-1.0","SERVER SIDE PUBLIC"),("BUSL-1.1","BUSINESS SOURCE"),
       ("BSL-1.1","BOOST SOFTWARE"),("ELASTIC-2.0","ELASTIC LICENSE"),("OSL-3.0","OPEN SOFTWARE LICENSE"),
       ("MPL-2.0","MOZILLA PUBLIC"),("CC-BY-NC-4.0","CREATIVE COMMONS ATTRIBUTION-NONCOMMERCIAL"),
       ("CC0-1.0","CC0 1.0 UNIVERSAL"),("UNLICENSE","THIS IS FREE AND UNENCUMBERED"),
       ("APACHE-2.0","APACHE LICENSE"),("MIT","PERMISSION IS HEREBY GRANTED, FREE OF CHARGE"),
       ("BSD-3-CLAUSE","REDISTRIBUTION AND USE"),("ISC","PERMISSION TO USE, COPY, MODIFY")]

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

PKGS = [
    ("@vendure/core","npm","订单路由/商品目录/定价规则/多渠道","commerce-core"),
    ("@medusajs/medusa","npm","订单/目录/支付编排","commerce-core"),
    ("@saleor/sdk","npm","商品目录/订单(SDK)","commerce-core"),
    ("posthog-node","npm","数据闭环(服务端)","analytics"),
    ("growthbook","npm","自进化 A/B","growth"),
    ("@flagsmith/flagsmith-node","npm","自进化 特性开关/A-B","growth"),
    ("langfuse","npm","自学习 LLM追踪/评估","llmops"),
    ("@novu/node","npm","外联通知基础设施","automation"),
    ("activepieces","npm","外联自动化编排","automation"),
    ("bullmq","npm","任务队列(编排)","queue"),
    ("nodemailer","npm","外联邮件","automation"),
    ("crawlee","npm","蜘蛛发现","crawler"),
    ("payload","npm","内容官/上架/入库","cms"),
    ("directus","npm","数据闭环低代码","database"),
    ("nocodb","npm","数据闭环低代码","database"),
    ("shippo","npm","物流运费/追踪","logistics"),
    ("pdfkit","npm","发票PDF生成","documents"),
    ("gotenberg","npm","发票PDF服务","documents"),
    ("express","npm","基线","baseline"),
    ("helmet","npm","基线","baseline"),
    ("otplib","npm","基线","baseline"),
    ("bull","npm","任务队列","queue"),
    ("n8n-workflow","npm","外联自动化(工作流)","automation"),
]

for name, eco, need, tag in PKGS:
    if name in done:
        e = done[name]
        print(f"{name:26s} {eco:4s} {tag:15s} {e['verdict']:7s} (cached) {e['note']}", flush=True)
        continue
    try:
        r = subprocess.run([NPM, "view", name, "license", "version", "time.modified", "--json"],
                           capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            row = {"package": name, "ecosystem": eco, "tag": tag, "verdict": "DENY",
                   "note": "npm view failed - not resolvable (invented name?)", "need": need}
            done[name] = row
            print(f"{name:26s} {eco:4s} {tag:15s} DENY    npm view failed", flush=True)
            continue
        d = json.loads(r.stdout)
        lic = norm(d.get("license"))
        mod = d.get("time", {}).get("modified", "")
        ver = d.get("version", "?")
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
        notes.append(why); notes.append(f"v{ver}"); notes.append(f"age={age}mo")
        if age > 24:
            verdict = "DENY"; notes.append("STALE(>24mo)")
        row = {"package": name, "ecosystem": eco, "tag": tag, "verdict": verdict,
               "note": "; ".join(notes), "need": need}
        done[name] = row
        print(f"{name:26s} {eco:4s} {tag:15s} {verdict:7s} {'; '.join(notes)}  <- {need}", flush=True)
    except Exception as ex:
        row = {"package": name, "ecosystem": eco, "tag": tag, "verdict": "DENY",
               "note": f"error {str(ex)[:60]}", "need": need}
        done[name] = row
        print(f"{name:26s} {eco:4s} {tag:15s} DENY    {str(ex)[:50]}", flush=True)
    json.dump(list(done.values()), open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

print()
passes = [v for v in done.values() if v["verdict"] == "PASS"]
print(f"PASS {len(passes)} / {len(done)}")
for v in passes:
    print(f"  [{v['tag']:15s}] {v['package']:24s} {v['note']}   <- {v['need']}")
print("saved:", OUT)