#!/usr/bin/env python3
"""SOP license gate -- single canonical source of truth for the protocol gate.

This module is the *hard gate* of the open-source reuse SOP.  It is deliberately
dependency-free and pure so that it can be imported both by the audit scripts and
by the 24/7 GitHub hunter, and unit-tested in isolation.

Rule (non-negotiable, closed-source commercial product):
  * ALLOW  : MIT / Apache-2.0 / BSD-2-Clause / BSD-3-Clause / ISC / 0BSD /
             Unlicense / CC0-1.0 / PSF
  * DENY   : GPL / LGPL / AGPL / SSPL / BSL / BUSL / Elastic / OSL / EUPL /
             MPL / CC-BY-NC* / proprietary / "see license in LICENSE"
  * UNKNOWN: anything we cannot positively classify -> DENY (unknown-is-deny)

The gate never trusts the model's memory.  Callers must pass an SPDX-ish string
obtained from a first-party artifact (npm registry, PyPI JSON, GitHub API or the
LICENSE file shipped in the wheel).  See SOP evidence scripts for provenance.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

# ── canonical allow / deny sets (uppercased, punctuation-normalised) ──────────

ALLOWED: set[str] = {
    "MIT",
    "MIT LICENSE",
    "APACHE-2.0",
    "APACHE 2.0",
    "APACHE LICENSE 2.0",
    "BSD-2-CLAUSE",
    "BSD-3-CLAUSE",
    "BSD",
    "ISC",
    "0BSD",
    "MIT-0",
    "ZLIB",
    "ZLIB LICENSE",
    "POSTGRESQL",
    "POSTGRESQL LICENSE",
    "UNLICENSE",
    "THE UNLICENSE",
    "CC0-1.0",
    "PYTHON SOFTWARE FOUNDATION LICENSE",
    "PSF-2.0",
}

DENIED: set[str] = {
    "GPL-2.0",
    "GPL-2.0-ONLY",
    "GPL-2.0-OR-LATER",
    "GPL-3.0",
    "GPL-3.0-ONLY",
    "GPL-3.0-OR-LATER",
    "AGPL-3.0",
    "AGPL-3.0-ONLY",
    "AGPL-3.0-OR-LATER",
    "LGPL-2.1",
    "LGPL-3.0",
    "SSPL-1.0",
    "BSL-1.1",
    "BUSL-1.1",
    "ELASTIC-2.0",
    "ELASTIC LICENSE",
    "OSL-3.0",
    "EUPL-1.2",
    "MPL-2.0",
    "CC-BY-NC-4.0",
    "CC-BY-NC-SA-4.0",
    "PROPRIETARY",
    "SEE LICENSE IN LICENSE",
    "COMMONS-CLAUSE",
    "SUSTAINABLE USE LICENSE",
    "FAIR SOURCE",
}

# Text fingerprints used when the registry only ships a license *body*
# (e.g. the LICENSE file inside a wheel / npm tarball).  Longest / most specific
# signatures first so that "GNU AFFERO" wins over a generic "GNU" token.
_SIGNATURES: List[tuple[str, str]] = [
    ("AGPL-3.0", "GNU AFFERO"),
    ("GPL-3.0", "GNU GENERAL PUBLIC LICENSE"),
    ("GPL-3.0", "GNU GENERAL PUBLIC LICENSE VERSION 3"),
    ("GPL-2.0", "GNU GENERAL PUBLIC LICENSE VERSION 2"),
    ("LGPL-3.0", "GNU LESSER GENERAL PUBLIC LICENSE"),
    ("LGPL-2.1", "GNU LESSER"),
    ("SSPL-1.0", "SERVER SIDE PUBLIC LICENSE"),
    ("BUSL-1.1", "BUSINESS SOURCE LICENSE"),
    ("BSL-1.1", "BOOST SOFTWARE LICENSE"),
    ("ELASTIC-2.0", "ELASTIC LICENSE"),
    ("OSL-3.0", "OPEN SOFTWARE LICENSE"),
    ("EUPL-1.2", "EUROPEAN UNION PUBLIC LICENCE"),
    ("MPL-2.0", "MOZILLA PUBLIC LICENSE"),
    ("CC-BY-NC-4.0", "NONCOMMERCIAL"),
    ("CC0-1.0", "CC0 1.0 UNIVERSAL"),
    ("UNLICENSE", "THIS IS FREE AND UNENCUMBERED"),
    ("APACHE-2.0", "APACHE LICENSE"),
    ("MIT", "PERMISSION IS HEREBY GRANTED, FREE OF CHARGE"),
    ("BSD-3-CLAUSE", "REDISTRIBUTION AND USE"),
    ("ISC", "PERMISSION TO USE, COPY, MODIFY"),
]

UNKNOWN = "UNKNOWN"

# ── result type ───────────────────────────────────────────────────────────────


@dataclass
class GateResult:
    verdict: str                       # "ALLOW" | "DENY"
    license: str                       # normalised license token (or UNKNOWN)
    reason: str
    evidence: str = ""                 # where the raw string came from
    raw: str = ""
    notes: List[str] = field(default_factory=list)

    @property
    def allowed(self) -> bool:
        return self.verdict == "ALLOW"

    def to_dict(self) -> Dict[str, str]:
        return {
            "verdict": self.verdict,
            "license": self.license,
            "reason": self.reason,
            "evidence": self.evidence,
            "raw": self.raw,
        }


# ── normalisation ─────────────────────────────────────────────────────────────


def normalise(raw: Optional[str]) -> Optional[str]:
    """Collapse an arbitrary license string to a canonical token (or None).

    Handles: dict-shaped values from package managers (``spdx_id`` / ``type`` /
    ``name``), multi-line license bodies, and single SPDX identifiers.
    For ``A OR B`` / ``A AND B`` expressions use :func:`classify`, which
    evaluates them properly.
    """
    if raw is None:
        return None
    if isinstance(raw, dict):
        raw = raw.get("spdx_id") or raw.get("type") or raw.get("name") or ""
    if not isinstance(raw, str):
        return None

    s = raw.strip()
    if not s:
        return None

    up = " ".join(s.upper().split())
    # Fast path: a short, single-line SPDX-ish token.
    if len(up) <= 64 and "\n" not in s and " OR " not in up and " AND " not in up:
        return _canonical_token(up)

    # Otherwise treat it as a license *body* and fingerprint it.
    for token, sig in _SIGNATURES:
        if sig in up:
            return token
    return up[:60]


def _canonical_token(up: str) -> str:
    """Normalise a short license identifier."""
    # strip surrounding punctuation / whitespace
    up = up.strip().strip(" .,;:()[]{}<>").strip()
    up = " ".join(up.split())
    alias = {
        "MIT LICENSE": "MIT",
        "THE MIT LICENSE": "MIT",
        "APACHE 2.0": "APACHE-2.0",
        "APACHE LICENSE 2.0": "APACHE-2.0",
        "APACHE-2.0 LICENSE": "APACHE-2.0",
        "APACHE SOFTWARE LICENSE": "APACHE-2.0",
        "BSD": "BSD-3-CLAUSE",
        "BSD LICENSE": "BSD-3-CLAUSE",
        "THE UNLICENSE": "UNLICENSE",
        "ZLIB LICENSE": "ZLIB",
    }
    return alias.get(up, up)


# ── the gate ──────────────────────────────────────────────────────────────────


def _raw_string(raw: str) -> Optional[str]:
    if isinstance(raw, dict):
        raw = raw.get("spdx_id") or raw.get("type") or raw.get("name") or ""
    return raw if isinstance(raw, str) else None


def _verdict_from_token(token: Optional[str], raw: str, evidence: str) -> GateResult:
    if token in ALLOWED:
        return GateResult("ALLOW", token, f"license ALLOW ({token})",
                          evidence=evidence, raw=raw)
    if token in DENIED:
        return GateResult("DENY", token, f"license DENY ({token})",
                          evidence=evidence, raw=raw)
    # Not on either list: try body fingerprinting, then default to deny.
    up = raw.upper()
    for t, sig in _SIGNATURES:
        if sig in up:
            if t in ALLOWED:
                return GateResult("ALLOW", t, f"license ALLOW ({t}) via body fingerprint",
                                  evidence=evidence, raw=raw)
            return GateResult("DENY", t, f"license DENY ({t}) via body fingerprint",
                              evidence=evidence, raw=raw)
    return GateResult("DENY", token or UNKNOWN,
                      f"license '{token}' not on allow-list -> deny",
                      evidence=evidence, raw=raw)


def _classify_expression(up: str, raw: str, evidence: str) -> GateResult:
    """Evaluate an SPDX ``AND`` / ``OR`` expression.

    OR  -> allowed if ANY operand is allowed (we may pick the permissive one).
    AND -> allowed only if EVERY operand is allowed.
    """
    if " OR " in up:
        results = [classify(p, evidence) for p in up.split(" OR ")]
        allowed = [r for r in results if r.allowed]
        if allowed:
            return GateResult("ALLOW", allowed[0].license,
                              f"SPDX OR: {allowed[0].license} permitted",
                              evidence=evidence, raw=raw, notes=["spdx_or"])
        lic = results[0].license if results else UNKNOWN
        return GateResult("DENY", lic, "SPDX OR: no operand allowed -> deny",
                          evidence=evidence, raw=raw, notes=["spdx_or"])
    # AND
    results = [classify(p, evidence) for p in up.split(" AND ")]
    bad = [r for r in results if not r.allowed]
    if not bad:
        return GateResult("ALLOW", results[0].license,
                          "SPDX AND: all operands allowed",
                          evidence=evidence, raw=raw, notes=["spdx_and"])
    return GateResult("DENY", bad[0].license,
                      f"SPDX AND: operand denied ({bad[0].license})",
                      evidence=evidence, raw=raw, notes=["spdx_and"])


def classify(raw: Optional[str], evidence: str = "") -> GateResult:
    """Run the hard gate over a raw license string.

    Returns a :class:`GateResult` whose ``verdict`` is exactly ``ALLOW`` or
    ``DENY``.  Unknown / empty / unclassifiable input is DENY.
    """
    s = _raw_string(raw)
    if s is None or not s.strip():
        return GateResult("DENY", UNKNOWN, "license UNKNOWN -> unknown-is-deny",
                          evidence=evidence, raw=str(raw or ""))

    up = " ".join(s.upper().split())
    if " OR " in up or " AND " in up:
        return _classify_expression(up, s, evidence)

    token = _canonical_token(up)
    return _verdict_from_token(token, s, evidence)


def is_allowed(raw: Optional[str]) -> bool:
    """Convenience predicate."""
    return classify(raw).allowed


__all__ = [
    "ALLOWED", "DENIED", "UNKNOWN", "GateResult",
    "normalise", "classify", "is_allowed",
]
