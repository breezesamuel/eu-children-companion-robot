#!/usr/bin/env python3
"""
SOP evidence collection for packages whose PyPI summary `license` field is empty.

Uses three authoritative signals, in order:
  1. PyPI JSON `info.license_expression` (PEP 639)
  2. PyPI JSON `info.classifiers` -> "License :: OSI Approved :: ..."
  3. The LICENSE file inside the wheel/sdist from PyPI (ground truth)
Never uses model memory.
"""
import json, os, urllib.request, tarfile, zipfile, io, re, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs", "sop_evidence_round2.json")

AMBIGUOUS = ["crewai", "smolagents", "browser-use", "apache-airflow", "zep", "got-scraping"]

SIG = [("AGPL-3.0", "GNU AFFERO GENERAL PUBLIC LICENSE"),
       ("GPL-3.0", "GNU GENERAL PUBLIC LICENSE"),
       ("LGPL-3.0", "GNU LESSER GENERAL PUBLIC LICENSE"),
       ("SSPL-1.0", "SERVER SIDE PUBLIC LICENSE"),
       ("BUSL-1.1", "BUSINESS SOURCE LICENSE"),
       ("BSL-1.1", "BOOST SOFTWARE LICENSE"),
       ("ELASTIC-2.0", "ELASTIC LICENSE"),
       ("MPL-2.0", "MOZILLA PUBLIC LICENSE"),
       ("APACHE-2.0", "APACHE LICENSE"),
       ("MIT", "PERMISSION IS HEREBY GRANTED, FREE OF CHARGE"),
       ("BSD-3-CLAUSE", "REDISTRIBUTION AND USE IN SOURCE AND BINARY FORMS, PROVIDED"),
       ("BSD-2-CLAUSE", "REDISTRIBUTION AND USE IN SOURCE AND BINARY FORMS"),
       ("ISC", "PERMISSION TO USE, COPY, MODIFY")]


def get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": "sop-evidence"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def classify(text):
    t = (text or "")[:4000].upper()
    for name, sig in SIG:
        if sig in t:
            return name
    return None


def license_from_wheel(pkg):
    """Download the wheel and read the .dist-info/LICENSE* file (ground truth)."""
    meta = json.loads(get(f"https://pypi.org/pypi/{pkg}/json").decode())
    ver = meta["info"]["version"]
    urls = {u["filename"]: u["url"] for u in meta["urls"] if u["filename"].endswith(".whl")}
    if not urls:
        return None, "no wheel"
    fn = sorted(urls)[0]
    blob = get(urls[fn])
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        cand = [n for n in z.namelist()
                if n.endswith((".dist-info/LICENSE", ".dist-info/LICENSE.txt",
                               ".dist-info/LICENSE.md", ".dist-info/COPYING",
                               ".dist-info/COPYING.txt"))]
        if not cand:
            cand = [n for n in z.namelist() if "/LICENSE" in n or "/COPYING" in n]
        if not cand:
            return None, "no LICENSE file in wheel"
        text = z.read(cand[0]).decode("utf-8", "replace")
    return classify(text) or f"UNCLASSIFIED(package={pkg}, version={ver})", f"{fn}"


results = {}
for pkg in AMBIGUOUS:
    if pkg == "got-scraping":
        # npm package, use a different path
        import subprocess, shutil
        NPM = shutil.which("npm") or shutil.which("npm.cmd")
        r = subprocess.run([NPM, "view", pkg, "license", "--json"],
                           capture_output=True, text=True, timeout=60)
        lic = "UNKNOWN"
        if r.returncode == 0:
            d = json.loads(r.stdout)
            lic = (d.get("license") or {}).get("type") if isinstance(d.get("license"), dict) else d.get("license")
        results[pkg] = {"source": "npm", "evidence": lic}
        print(f"{pkg:20s} npm license field -> {lic}", flush=True)
        continue

    try:
        meta = json.loads(get(f"https://pypi.org/pypi/{pkg}/json").decode())
        info = meta["info"]
        # signal 1: license_expression
        lic_expr = info.get("license_expression")
        # signal 2: classifiers
        cls = [c for c in info.get("classifiers", []) if c.startswith("License ::")]
        # signal 3: wheel LICENSE file
        wheel_lic, how = license_from_wheel(pkg)

        verdict_src = "wheel" if wheel_lic and not str(wheel_lic).startswith("UNCLASSIFIED") else None
        final = None
        if lic_expr:
            final = lic_expr.upper(); verdict_src = "license_expression"
        elif cls:
            m = re.search(r"OSI Approved :: (.+?) License", cls[0])
            final = (m.group(1) + " License").upper() if m else None
            verdict_src = "classifiers"
        if not final and wheel_lic:
            final = wheel_lic; verdict_src = "wheel"

        results[pkg] = {
            "source": "PyPI",
            "version": info.get("version"),
            "license_expression": lic_expr,
            "classifiers": cls,
            "wheel_license": wheel_lic,
            "decided_by": verdict_src,
            "license": final,
            "how": how,
        }
        print(f"{pkg:20s} v{info.get('version'):12s} decided_by={verdict_src} license={final}", flush=True)
        print(f"                     classifiers={cls[:2]} wheel={wheel_lic}", flush=True)
    except Exception as e:
        results[pkg] = {"source": "PyPI", "error": str(e)[:100], "license": "UNKNOWN"}
        print(f"{pkg:20s} ERROR {str(e)[:70]}", flush=True)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(results, open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("\nsaved:", OUT)