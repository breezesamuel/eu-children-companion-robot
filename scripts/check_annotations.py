#!/usr/bin/env python3
"""Guard against annotations that only work on Python 3.14+ (PEP 649).

Python 3.14 defers annotation evaluation, so `def f() -> Dict[str, Any]` does
NOT raise a NameError locally even when `Any` was never imported. The
production images and CI runners use Python 3.11, where annotations are still
evaluated eagerly at definition time, so the same code crashes on import.

This static check parses every first-party module, collects the names that are
actually defined/imported, and reports any *bare* name used inside an
annotation that is not defined. It needs no imports and no third-party
packages, so it is safe to run in any environment.

Modules that opt into deferred annotations with
`from __future__ import annotations` are skipped, because there the annotation
is never evaluated at import time.

Usage:
    python scripts/check_annotations.py            # human readable
    python scripts/check_annotations.py --json     # machine readable
Exit code is 0 when clean and 1 when undefined annotation names are found.
"""
from __future__ import annotations

import argparse
import ast
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Names that are always available without an import.
BUILTINS = set(dir(__builtins__)) if not isinstance(__builtins__, dict) else set(__builtins__)

TARGETS = (
    sorted(glob.glob(os.path.join(ROOT, "*.py")))
    + sorted(glob.glob(os.path.join(ROOT, "scripts", "*.py")))
    + sorted(glob.glob(os.path.join(ROOT, "project_source", "**", "*.py"), recursive=True))
)


def _defined_names(tree: ast.AST) -> set[str]:
    names: set[str] = set(BUILTINS)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                names.add((alias.asname or alias.name).split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                names.add(alias.asname or alias.name)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.arg):
            names.add(node.arg)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            names.add(node.id)
        elif isinstance(node, ast.alias):
            names.add((node.asname or node.name).split(".")[0])
        elif isinstance(node, ast.ExceptHandler) and node.name:
            names.add(node.name)
        elif isinstance(node, (ast.Global, ast.Nonlocal)):
            names.update(node.names)
    return names


def _annotation_nodes(node: ast.AST):
    if isinstance(node, ast.AnnAssign):
        yield node.annotation
    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        args = node.args
        for arg in list(getattr(args, "posonlyargs", [])) + list(args.args) + list(args.kwonlyargs):
            if arg.annotation is not None:
                yield arg.annotation
        if args.vararg is not None and args.vararg.annotation is not None:
            yield args.vararg.annotation
        if args.kwarg is not None and args.kwarg.annotation is not None:
            yield args.kwarg.annotation
        if node.returns is not None:
            yield node.returns


def check_file(path: str) -> list[dict]:
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    try:
        src = open(path, encoding="utf-8", errors="replace").read()
    except OSError as exc:
        return [{"file": rel, "line": 0, "name": "<unreadable>", "detail": str(exc)}]
    if "from __future__ import annotations" in src:
        return []
    try:
        tree = ast.parse(src)
    except SyntaxError as exc:
        return [{"file": rel, "line": exc.lineno or 0, "name": "<syntax>", "detail": str(exc)}]

    defined = _defined_names(tree)
    problems: list[dict] = []
    for node in ast.walk(tree):
        for ann in _annotation_nodes(node):
            for sub in ast.walk(ann):
                if isinstance(sub, ast.Name) and sub.id not in defined:
                    problems.append({
                        "file": rel,
                        "line": getattr(node, "lineno", 0),
                        "name": sub.id,
                        "detail": "undefined annotation name (fails on Python 3.11 eager evaluation)",
                    })
    return problems


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Detect annotations that need names not imported")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    problems: list[dict] = []
    scanned = 0
    for path in TARGETS:
        base = os.path.basename(path)
        if base.startswith(".") or "__pycache__" in path:
            continue
        scanned += 1
        problems.extend(check_file(path))

    if args.json:
        print(json.dumps({"scanned": scanned, "issues": problems,
                          "ok": not problems}, ensure_ascii=False, indent=2))
    else:
        print(f"scanned {scanned} python files")
        if not problems:
            print("OK: every annotation name is defined (Python 3.11 compatible)")
        for p in problems:
            print(f"  {p['file']}:{p['line']}  undefined annotation name: {p['name']}")
        print(f"issues: {len(problems)}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
