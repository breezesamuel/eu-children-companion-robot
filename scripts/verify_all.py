"""Run the SOP reuse audit (npm/PyPI authoritative sources) + Node/Python tests."""
import subprocess, sys, os, glob, json

def run(cmd, cwd=None, timeout=900):
    """Run a child process capturing text safely on Windows (GBK terminals)."""
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)


print("=" * 72)
print("  ROBOT COMPANION — FULL VERIFICATION")
print("=" * 72)

fails = []

# ── 1. Node.js suites ────────────────────────────────────────────────────
print("\n[1] Node.js test suites (node tests/run-all.js)")
r = run(["node", "tests/run-all.js"], cwd="project_source")
tail = (r.stdout or "").strip().splitlines()
for line in tail[-24:]:
    if "passed" in line.lower() or "TESTS:" in line.upper() or "===" in line:
        print("   ", line)
print(f"    -> exit {r.returncode}")
if r.returncode != 0:
    fails.append("node-test-all")

# ── 2. Python standalone suites ──────────────────────────────────────────
print("\n[2] Python test suites")
for t in sorted(glob.glob(os.path.join("tests", "test_*.py"))):
    name = os.path.basename(t)
    rr = run([sys.executable, t])
    summary = [l for l in (rr.stdout or "").splitlines()
               if ("passed" in l.lower() and "/" in l) or "MCP Server" in l]
    tag = "PASS" if rr.returncode == 0 else "FAIL"
    print(f"    [{tag}] {name:26s} {summary[-1] if summary else ''}")
    if rr.returncode != 0:
        fails.append(name)

# ── 3. Commerce workflow (16-step) ───────────────────────────────────────
print("\n[3] 16-step commerce workflow")
rc = run([sys.executable, "tests/test_commerce_flow.py"])
last = [l for l in (rc.stdout or "").splitlines() if l.startswith("PASS")]
print("   ", last[-1] if last else "?")
if rc.returncode != 0:
    fails.append("commerce-flow")

# ── 4. SOP licence audit (authoritative, cached) ─────────────────────────
print("\n[4] SOP reuse licence audit")
p = os.path.join("scripts", "docs", "sop_reuse_audit.json")
if os.path.exists(p):
    rows = json.load(open(p, encoding="utf-8"))
    ok = [x for x in rows if x["verdict"] == "PASS"]
    print(f"    {len(ok)}/{len(rows)} candidates passed the licence gate")
    for x in ok:
        print(f"      [PASS] {x['package']:24s} {x['note'][:70]}")
else:
    print("    (audit not run yet: python scripts/sop_audit4.py)")

# ── 5. Licence gate over direct deps (hard gate, SOP §7) ──────────────────
print("\n[5] SOP licence gate (scripts/repo_check.py)")
rg = run([sys.executable, "scripts/repo_check.py"])
lines5 = (rg.stdout or "").splitlines()
summary = [l for l in lines5 if l.startswith("PASS:") or l.startswith("FAIL:")]
print("   ", summary[-1] if summary else "?")
for l in lines5:
    s = l.strip()
    if "exception(s) in force" in s or s.startswith("@"):
        print("   ", s)
    elif "failed the licence gate" in s or "exception EXPIRED" in s:
        print("   ", s)
if rg.returncode != 0:
    fails.append("licence-gate")

# ── 6. Commercial closure audit (16-step chain, live cycle evidence) ──────
print("\n[6] Commercial closure audit (scripts/closure_audit.py)")
ca = run([sys.executable, "scripts/closure_audit.py"])
for l in (ca.stdout or "").splitlines():
    s = l.strip()
    if "funnel:" in s or "HOLES" in s or "ALL CORNERS CLOSED" in s or "OPEN HOLES" in s:
        print("   ", s)
if ca.returncode != 0:
    fails.append("closure-audit")

# ── 7. Python 3.11 annotation compatibility (no PEP 649 deferral) ──────────
print("\n[7] Annotation portability check (scripts/check_annotations.py)")
an = run([sys.executable, "scripts/check_annotations.py"])
for l in (an.stdout or "").splitlines():
    if l.startswith("scanned") or l.startswith("OK:") or "undefined annotation" in l or l.startswith("issues:"):
        print("   ", l)
if an.returncode != 0:
    fails.append("annotation-check")

print()
print("=" * 72)
if fails:
    print("  FAILURES:", ", ".join(fails))
else:
    print("  ALL GREEN")
print("=" * 72)
sys.exit(1 if fails else 0)