import json, os
p = os.path.join("scripts", "docs", "sop_reuse_audit_round2.json")
d = json.load(open(p, encoding="utf-8"))
ev = json.load(open(os.path.join("scripts", "docs", "sop_evidence_round2.json"), encoding="utf-8")) \
    if os.path.exists(os.path.join("scripts", "docs", "sop_evidence_round2.json")) else {}

ALLOWED = {"MIT", "APACHE-2.0", "BSD-3-CLAUSE", "MIT LICENSE"}

# Apply evidence-based corrections (source of truth = LICENSE file / license_expression / classifiers)
FIXES = {
    "smolagents":  ("PASS", "APACHE-2.0 (verified from wheel LICENSE file)"),
    "browser-use": ("PASS", "MIT (verified from wheel LICENSE file + classifiers)"),
    "apache-airflow": ("PASS", "APACHE-2.0 (license_expression + wheel LICENSE)"),
    "zep":         ("DENY", "GPL-3.0 (verified from wheel LICENSE file - copyleft)"),
    "crewai":      ("DENY", "license UNKNOWN after 3 signals -> unknown-is-deny"),
    "got-scraping": ("DENY", "npm view timed out; unverified -> unknown-is-deny"),
}
for e in d:
    if e["package"] in FIXES:
        v, note = FIXES[e["package"]]
        e["verdict"] = v
        e["note"] = note + " | " + e["note"]
        e["evidence_file"] = "sop_evidence_round2.json"

json.dump(d, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

bycat = {}
for e in d:
    bycat.setdefault(e["category"], []).append(e)

print(f"{'PACKAGE':32s} {'CATEGORY':12s} {'VERDICT':5s} NOTE")
print("-" * 120)
for e in d:
    print(f"{e['package']:32s} {e['category']:12s} {e['verdict']:5s} {e['note'][:70]}")

print()
total_pass = 0
for cat, rows in bycat.items():
    ok = [r for r in rows if r["verdict"] == "PASS"]
    total_pass += len(ok)
    print(f"=== {cat}: {len(ok)}/{len(rows)} passed ===")
    for r in ok:
        print(f"   [PASS] {r['package']:30s} {r['need']}")
print(f"\nTOTAL PASS {total_pass}/{len(d)}")
print("saved:", p)