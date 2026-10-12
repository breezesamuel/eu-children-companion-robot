"""Tests for the SOP licence gate + the CI repo_check (direct-dependency scan).

Covers: SPDX AND/OR semantics, artifact-shaped licence fields, the time-boxed
exception registry (in force vs expired), and a real scan of this repository.
"""
import json
import os
import sys
import logging
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir, "scripts"))
os.chdir(os.path.join(os.path.dirname(__file__), os.pardir))
logging.disable(logging.CRITICAL)

from sop_license_gate import classify
import repo_check

R = []
def check(name, cond, detail=""):
    R.append((name, bool(cond), detail))
    print(f"{'[OK] ' if cond else '[XX] '}{name} {detail if not cond else ''}")


# ── SPDX expression semantics ────────────────────────────────────────────────
check("spdx.or_dual_licence_allowed", classify("MIT OR GPL-3.0").allowed)
check("spdx.or_all_denied", not classify("GPL-2.0 OR AGPL-3.0").allowed)
check("spdx.and_needs_all", not classify("MIT AND GPL-3.0").allowed)
check("spdx.and_all_permissive",
      classify("BSD-3-Clause AND MIT AND Zlib AND CC0-1.0").allowed)
check("spdx.and_with_unknown_denied", not classify("MIT AND SEE LICENSE IN LICENSE").allowed)

# ── artefact-shaped fields ───────────────────────────────────────────────────
check("artefact.spdx_id_dict", classify({"spdx_id": "Apache-2.0", "name": "Apache"}).allowed)
check("artefact.github_noassertion", not classify({"spdx_id": "NOASSERTION"}).allowed)
check("artefact.licenses_list_shape",
      classify({"type": "BSD-3-Clause"}).allowed)

# ── exception registry ───────────────────────────────────────────────────────
tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
json.dump({
    "exceptions": [
        {"ecosystem": "npm", "package": "pkg-live", "license": "GPL-3.0-only",
         "expires": "2999-01-01", "owner": "t"},
        {"ecosystem": "npm", "package": "pkg-dead", "license": "GPL-3.0-only",
         "expires": "2000-01-01", "owner": "t"},
    ]
}, tmp)
tmp.close()

_orig = repo_check.EXCEPTIONS_FILE
repo_check.EXCEPTIONS_FILE = tmp.name
try:
    exc = repo_check._load_exceptions()
    check("exceptions.live_not_expired", exc[("npm", "pkg-live")]["_expired"] is False)
    check("exceptions.dead_expired", exc[("npm", "pkg-dead")]["_expired"] is True)
finally:
    repo_check.EXCEPTIONS_FILE = _orig
    os.unlink(tmp.name)

# ── real repository scan (needs node_modules for npm resolution) ─────────────
node_modules = os.path.join("project_source", "node_modules")
if os.path.isdir(node_modules):
    res = repo_check.check(deep=False)
    check("repo.no_hard_deny", len(res["denied"]) == 0,
          json.dumps([r["package"] for r in res["denied"]]))
    check("repo.direct_scan_nonempty", res["total"] > 20, str(res["total"]))
    all_pkgs = [r["package"] for r in res["rows"]]
    # the GPL TTS engine was removed, not excepted: it must not appear at all
    check("repo.gpl_dep_removed", "@andresaya/edge-tts" not in all_pkgs)
    # its permissive replacements are installed and pass the gate
    check("repo.permissive_tts_present",
          "msedge-tts" in all_pkgs and "node-edge-tts" in all_pkgs, json.dumps(all_pkgs))
    # tqdm (MPL) must be gone from the direct python deps
    check("repo.tqdm_removed", "tqdm" not in all_pkgs)
    # with the remediation complete there is no exception debt left
    exc_pkgs = [r["package"] for r in res.get("excepted", [])]
    check("repo.no_exceptions_needed", len(exc_pkgs) == 0, json.dumps(exc_pkgs))
else:
    print("  (skipped repo scan: project_source/node_modules not installed)")

ok = sum(1 for _, v, _ in R if v)
print(f"\n{'='*60}\nLicence gate + repo_check: {ok}/{len(R)} checks passed, {len(R) - ok} failed")
for n, v, d in R:
    if not v:
        print("  FAILED:", n, d)
sys.exit(0 if ok == len(R) else 1)
