#!/usr/bin/env python3
"""repo_check.py — 开源复用尽调 CLI（"先检索复用，再造" SOP 的执行工具）。

用法:
    python scripts/repo_check.py eval <owner/repo> [<owner/repo> ...]
    python scripts/repo_check.py search "<query>" [--limit 8] [--sort stars|updated]
    python scripts/repo_check.py npm <package> [<package> ...]
    python scripts/repo_check.py pypi <package> [<package> ...]
    python scripts/repo_check.py pub <package> [<package> ...]
    python scripts/repo_check.py osv <ecosystem>:<package> [<version>]
    python scripts/repo_check.py policy

设计目标（对应 docs/OPEN_SOURCE_REUSE_SOP.md）:
  * 事实全部来自 GitHub REST API / OSV.dev —— 绝不依赖模型记忆，
    因此"幻觉仓库 / 已归档 / 协议有毒"的候选会在采纳前被拦下。
  * 对每项给出 5 维度事实卡 + 协议合规裁决 + 采纳/二开/弃用建议。
  * 仅用标准库（urllib），零依赖，CI 与本地均可跑。

环境变量:
  GITHUB_TOKEN / GH_TOKEN   可选，提高 API 速率上限（未认证 60 次/小时）。

退出码: 0 正常；2 存在"弃用"级候选（便于在 CI 中卡关）。
"""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

API = "https://api.github.com"
OSV_API = "https://api.osv.dev/v1/query"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")

# ---------------------------------------------------------------------------
# 1. 开源协议合规闸门（本项目的政策：闭源 + 商用分发）
# ---------------------------------------------------------------------------
# allow  : 可采用，保留版权/许可与 NOTICE 即可
# review : 可用但需法务确认边界（弱 copyleft / 特殊条款）
# deny   : 传染性强或含限制条款，闭源商用项目默认拒绝
LICENSE_POLICY = {
    "MIT": ("allow", "宽松，保留版权与许可声明即可"),
    "MIT-0": ("allow", "宽松，免署名"),
    "Apache-2.0": ("allow", "宽松 + 明确专利授权；需保留 NOTICE 与修改声明"),
    "BSD-2-Clause": ("allow", "宽松，保留声明"),
    "BSD-3-Clause": ("allow", "宽松，含禁止背书条款（不得用作者名义促销）"),
    "ISC": ("allow", "等价 MIT"),
    "0BSD": ("allow", "宽松，免署名"),
    "Unlicense": ("allow", "公共领域"),
    "CC0-1.0": ("allow", "公共领域（更适合数据/文档）"),
    "MPL-2.0": ("review", "文件级 copyleft：仅被修改的文件需开源，可大可小"),
    "LGPL-2.1": ("review", "弱 copyleft：动态链接通常可闭源，须法务确认"),
    "LGPL-3.0": ("review", "弱 copyleft + 安装信息要求，须法务确认"),
    "EPL-2.0": ("review", "弱 copyleft，须确认链接方式"),
    "EUPL-1.2": ("review", "欧盟公共许可，弱/强混合，须法务确认"),
    "GPL-2.0": ("deny", "强 copyleft：分发衍生作品须整体开源"),
    "GPL-3.0": ("deny", "强 copyleft：含专利授权与反 Tivo 条款"),
    "AGPL-3.0": ("deny", "网络/SaaS 使用即触发开源义务（传染最强）"),
    "SSPL-1.0": ("deny", "非 OSI 认可，限制托管服务商"),
    "OSL-3.0": ("deny", "强 copyleft"),
    "BUSL-1.1": ("deny", "商业源码许可，非开源，限制生产使用"),
    "Commons-Clause": ("deny", "反商业条款，商用禁止"),
}
DEFAULT_POLICY = ("deny", "协议未知/未识别：默认拒绝，先人工澄清")


def license_verdict(spdx):
    if not spdx or spdx in ("NOASSERTION", "NONE"):
        return DEFAULT_POLICY
    base = spdx.replace("-only", "").replace("-or-later", "").strip()
    return LICENSE_POLICY.get(base, LICENSE_POLICY.get(spdx, DEFAULT_POLICY))


# ---------------------------------------------------------------------------
# 2. HTTP helpers
# ---------------------------------------------------------------------------
def _request(url, method="GET", payload=None, timeout=20):
    headers = {
        "User-Agent": "repo-check-sop/1.0",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    if data is not None and "osv.dev" in url:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", "replace")
            return resp.status, resp.headers, (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"message": body[:200]}
        return e.code, e.headers, parsed
    except Exception as e:  # noqa: BLE001
        return 0, {}, {"message": str(e)}


def gh(path):
    return _request(f"{API}{path}")


# ---------------------------------------------------------------------------
# 3. 评分与建议
# ---------------------------------------------------------------------------
def months_since(iso):
    if not iso:
        return 999
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days / 30.44
    except Exception:
        return 999


def activity_score(archived, months):
    if archived:
        return 0
    if months < 3:
        return 5
    if months < 6:
        return 4
    if months < 12:
        return 3
    if months < 24:
        return 2
    return 1


def popularity_score(stars):
    if stars >= 20000:
        return 5
    if stars >= 5000:
        return 4
    if stars >= 1000:
        return 3
    if stars >= 300:
        return 2
    return 1


def recommend(archived, months, spdx, stars):
    verdict, _ = license_verdict(spdx)
    if archived:
        return "弃用", "仓库已归档，不再维护"
    if verdict == "deny":
        return "弃用/不可用", "协议违规风险：闭源商用不可用"
    if verdict == "review":
        return "二开/法务确认", "弱 copyleft，须确认使用与分发方式"
    if months > 24:
        return "二开（需自维护）", "已停更 > 2 年，需自行维护/换源"
    if stars < 300:
        return "谨慎采用", "规模小、巴士系数低，注意长期可维护性"
    return "可直接采用", "宽松协议 + 活跃维护"


# ---------------------------------------------------------------------------
# 4. 子命令
# ---------------------------------------------------------------------------
def cmd_eval(args):
    bad = 0
    for full in args:
        if "/" not in full:
            print(f"  !! 非法仓库名 '{full}'（应形如 owner/repo）")
            bad += 1
            continue
        status, hdrs, repo = gh(f"/repos/{full}")
        if status == 404:
            print(f"\n【{full}】 404 —— 仓库不存在（很可能是 AI 幻觉出的名字）")
            bad += 1
            continue
        if status != 200:
            print(f"\n【{full}】 查询失败 HTTP {status}: {repo.get('message')}")
            bad += 1
            continue

        spdx = (repo.get("license") or {}).get("spdx_id")
        verdict, why = license_verdict(spdx)
        months = months_since(repo.get("pushed_at"))
        archived = bool(repo.get("archived"))
        stars = repo.get("stargazers_count", 0)

        # 最新 release（判断"停更/无发版"）
        rstatus, _, rel = gh(f"/repos/{full}/releases/latest")
        rel_tag = rel.get("tag_name") if rstatus == 200 else None
        rel_age = months_since(rel.get("published_at")) if rstatus == 200 else None

        a_s = activity_score(archived, months)
        p_s = popularity_score(stars)
        rec, rec_why = recommend(archived, months, spdx, stars)
        if rec.startswith("弃用"):
            bad += 1

        print(f"\n=== {full} ===")
        print(f"  描述        : {(repo.get('description') or '')[:90]}")
        print(f"  语言/星标   : {repo.get('language')} / {stars}★  forks={repo.get('forks_count')}")
        print(f"  最近推送    : {repo.get('pushed_at')}  ({months:.1f} 个月前)  归档={archived}")
        print(f"  最新版本    : {rel_tag or '(无 release)'}"
              + (f"  ({rel_age:.1f} 个月前)" if rel_age is not None else ""))
        print(f"  未关闭 issue: {repo.get('open_issues_count')}")
        print(f"  协议        : {spdx or '(无)'}  -> [{verdict}] {why}")
        print(f"  维度评分    : 维护活跃={a_s}/5  社区规模={p_s}/5  协议合规="
              f"{ {'allow':5,'review':3,'deny':0}[verdict] }/5  技术栈={repo.get('language')}  部署难度=需人评")
        print(f"  => 结论     : 【{rec}】{rec_why}")
        print(f"  URL         : {repo.get('html_url')}")

    remaining = None
    return 2 if bad else 0


def cmd_search(args):
    query, limit, sort = None, 8, "stars"
    i = 0
    while i < len(args):
        if args[i] == "--limit":
            limit = int(args[i + 1]); i += 2
        elif args[i] == "--sort":
            sort = args[i + 1]; i += 2
        else:
            query = (query + " " + args[i]).strip() if query else args[i]; i += 1
    if not query:
        print("需要查询词，例: repo_check.py search \"express rate limit\"")
        return 2
    import urllib.parse
    q = urllib.parse.quote(query)
    status, _, data = gh(f"/search/repositories?q={q}&sort={sort}&order=desc&per_page={limit}")
    if status != 200:
        print(f"搜索失败 HTTP {status}: {data.get('message')}")
        return 2
    items = data.get("items", [])
    print(f"\nGitHub 搜索: '{query}'  (共 {data.get('total_count')} 条，取 top {len(items)})")
    print(f"{'repository':38s} {'★':>8s}  {'协议':12s} {'最近推送':12s} 裁决")
    print("-" * 92)
    for it in items:
        spdx = (it.get("license") or {}).get("spdx_id")
        verdict, _ = license_verdict(spdx)
        months = months_since(it.get("pushed_at"))
        flag = "ARCHIVED" if it.get("archived") else ""
        print(f"{it['full_name'][:38]:38s} {it['stargazers_count']:8d}  "
              f"{(str(spdx) + '/' + verdict)[:12]:12s} {months:9.1f}mo  {flag}")
    return 0


def cmd_osv(args):
    if not args or ":" not in args[0]:
        print("用法: repo_check.py osv <ecosystem>:<package> [version]")
        print("  例: repo_check.py osv npm:helmet        (生态: npm/PyPI/Pub/Go/Maven/...)")
        return 2
    eco, pkg = args[0].split(":", 1)
    version = args[1] if len(args) > 1 else None
    payload = {"package": {"name": pkg, "ecosystem": eco}}
    if version:
        payload["version"] = version
    status, _, data = _request(OSV_API, method="POST", payload=payload)
    if status != 200:
        print(f"OSV 查询失败 HTTP {status}: {data.get('message')}")
        return 2
    vulns = data.get("vulns", [])
    print(f"\nOSV.dev 漏洞库: {eco}:{pkg}" + (f"@{version}" if version else "") + f"  -> {len(vulns)} 条")
    seen = set()
    for v in vulns:
        vid = v.get("id")
        if vid in seen:
            continue
        seen.add(vid)
        aliases = ",".join(v.get("aliases", [])[:3])
        summary = (v.get("summary") or "").strip()[:110]
        sev = ""
        for s in v.get("severity", []) or []:
            if s.get("type") == "CVSS_V3":
                sev = s.get("score", "")
        print(f"  - {vid} {sev} {aliases}")
        if summary:
            print(f"      {summary}")
    if not vulns:
        print("  (未发现已知漏洞)")
    return 0


def cmd_policy(_args):
    print("\n本项目开源协议政策（闭源 + 商用分发场景）:\n")
    for k in ("allow", "review", "deny"):
        names = [lic for lic, (v, _) in LICENSE_POLICY.items() if v == k]
        label = {"allow": "可采用", "review": "需法务确认", "deny": "默认拒绝"}[k]
        print(f"  [{label}] {', '.join(sorted(names))}")
    print("\n  未知/NOASSERTION/NONE -> 默认拒绝（先澄清）")
    print("  注意: Star 多、更新勤 ≠ 能用；协议是硬闸门。GPL/AGPL 会传染闭源代码。")
    return 0


# ---------------------------------------------------------------------------
# 4b. 包registry 后端（npm / PyPI / pub.dev）——无需鉴权、不受 GitHub 限流，
#     直接给出"协议 + 最新版本 + 最后发布时间"，是核验"轮子"的关键事实源。
# ---------------------------------------------------------------------------
def _norm_license(raw):
    """把 registry 的自由文本协议名归一到 SPDX 近似值（仅用于裁决，原始值照实显示）。"""
    if not raw:
        return None
    r = raw.strip()
    low = r.lower()
    table = [
        ("agpl", "AGPL-3.0"), ("lgpl", "LGPL-3.0"), ("gpl", "GPL-3.0"),
        ("apache", "Apache-2.0"), ("mit", "MIT"), ("bsd-3", "BSD-3-Clause"),
        ("bsd-2", "BSD-2-Clause"), ("bsd", "BSD-3-Clause"), ("isc", "ISC"),
        ("mpl", "MPL-2.0"), ("epl", "EPL-2.0"), ("eupl", "EUPL-1.2"),
        ("unlicense", "Unlicense"), ("cc0", "CC0-1.0"),
    ]
    for needle, spdx in table:
        if needle in low:
            return spdx
    return None


def _registry_card(label, version, raw_license, published_iso, repo_url, homepage):
    spdx = _norm_license(raw_license)
    verdict, why = license_verdict(spdx)
    months = months_since(published_iso)
    print(f"\n=== [{label}] {version or '(?)'} ===")
    print(f"  协议(原始)  : {raw_license or '(未声明)'}   -> 归一: {spdx or '未知'}  [{verdict}] {why}")
    print(f"  最后发布    : {published_iso or '(未知)'}" + (f"  ({months:.1f} 个月前)" if published_iso else ""))
    print(f"  仓库        : {repo_url or '(未提供)'}")
    if homepage:
        print(f"  主页        : {homepage}")
    if verdict == "deny":
        print("  => 结论     : 【弃用/不可用】协议违规风险")
    elif months > 24:
        print("  => 结论     : 【二开（需自维护）】已停更 > 2 年")
    else:
        print("  => 结论     : 协议闸门通过（早于 GitHub star/技术栈维度，见 SOP）")
    return verdict


def cmd_npm(args):
    bad = 0
    for pkg in args:
        status, _, data = _request(f"https://registry.npmjs.org/{pkg.replace('/', '%2f')}")
        if status == 404:
            print(f"\n=== [npm] {pkg} === 404 —— 包不存在（防幻觉）"); bad += 1; continue
        if status != 200:
            why = data.get("message", "")
            hint = "（网络不可达/超时；本机若无法直连 registry，请在 CI 或代理环境运行）" if status == 0 else ""
            print(f"\n=== [npm] {pkg} === 查询失败 HTTP {status} {why} {hint}"); bad += 1; continue
        latest = (data.get("dist-tags") or {}).get("latest")
        lic = data.get("license")
        if not lic and latest:
            lic = ((data.get("versions") or {}).get(latest) or {}).get("license")
        if isinstance(lic, dict):
            lic = lic.get("type")
        pub = (data.get("time") or {}).get(latest)
        repo = data.get("repository")
        repo_url = repo.get("url") if isinstance(repo, dict) else repo
        if _registry_card(f"npm {pkg}", latest, lic, pub, repo_url, data.get("homepage")) == "deny":
            bad += 1
    return 2 if bad else 0


def cmd_pypi(args):
    bad = 0
    for pkg in args:
        status, _, data = _request(f"https://pypi.org/pypi/{pkg}/json")
        if status == 404:
            print(f"\n=== [PyPI] {pkg} === 404 —— 包不存在（防幻觉）"); bad += 1; continue
        if status != 200:
            hint = "（网络不可达/超时）" if status == 0 else ""
            print(f"\n=== [PyPI] {pkg} === 查询失败 HTTP {status} {hint}"); bad += 1; continue
        info = data.get("info") or {}
        lic = info.get("license") or info.get("license_expression")
        if not lic or len(lic) > 60:
            for c in info.get("classifiers", []) or []:
                if c.startswith("License ::"):
                    lic = c.split("::")[-1].strip()
                    break
        version = info.get("version")
        pub = None
        for f in data.get("urls", []) or []:
            pub = f.get("upload_time_iso_8601") or f.get("upload_time")
            break
        if not pub:
            rel = (data.get("releases") or {}).get(version) or []
            if rel:
                pub = rel[0].get("upload_time_iso_8601") or rel[0].get("upload_time")
        urls = info.get("project_urls") or {}
        repo_url = info.get("home_page") or urls.get("Source") or urls.get("Repository") or urls.get("Homepage")
        if _registry_card(f"PyPI {pkg}", version, lic, pub, repo_url, info.get("home_page")) == "deny":
            bad += 1
    return 2 if bad else 0


def cmd_pub(args):
    bad = 0
    for pkg in args:
        status, _, data = _request(f"https://pub.dev/api/packages/{pkg}")
        if status == 404:
            print(f"\n=== [pub.dev] {pkg} === 404 —— 包不存在（防幻觉）"); bad += 1; continue
        if status != 200:
            hint = "（网络不可达/超时）" if status == 0 else ""
            print(f"\n=== [pub.dev] {pkg} === 查询失败 HTTP {status} {hint}"); bad += 1; continue
        latest = data.get("latest") or {}
        pubspec = latest.get("pubspec") or {}
        pub = latest.get("published")
        urls = pubspec.get("homepage") or pubspec.get("repository")
        # pub.dev API 不直接返回协议；Flutter 生态绝大多数为 BSD-3-Clause。
        print(f"\n=== [pub.dev] {pubspec.get('name', pkg)} {latest.get('version')} ===")
        print(f"  协议        : 见仓库 LICENSE（pub.dev API 不提供）")
        print(f"  最后发布    : {pub or '(未知)'}" + (f"  ({months_since(pub):.1f} 个月前)" if pub else ""))
        print(f"  仓库        : {urls or '(未提供)'}")
        print(f"  => 结论     : 需人工核对仓库 LICENSE（SOP 第 4 步）")
    return 2 if bad else 0


COMMANDS = {
    "eval": cmd_eval, "search": cmd_search, "osv": cmd_osv, "policy": cmd_policy,
    "npm": cmd_npm, "pypi": cmd_pypi, "pub": cmd_pub,
}


def main(argv):
    if len(argv) < 2 or argv[1] not in COMMANDS:
        print(__doc__)
        return 1
    return COMMANDS[argv[1]](argv[2:])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
