#!/usr/bin/env python3
"""
CLI management tool for European Children Companion Robot.

Usage:
  python cli.py --users          List all registered users
  python cli.py --stats          System statistics
  python cli.py --backup         Create a database backup
  python cli.py --health         Health check
  python cli.py --routes         List all API routes
  python cli.py --search <q>     Search content
  python cli.py --migrations     Show migration status
  python cli.py --export <file>  Export system state to JSON
  python cli.py --serve          Start the API server
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))
os.chdir(str(BASE_DIR))


def cmd_users():
    from children_persistence import sqlite_query
    rows = sqlite_query("SELECT user_id, name, role, created_at FROM users ORDER BY created_at")
    if not rows:
        print("No users found")
        return
    print(f"{'User ID':<20} {'Name':<20} {'Role':<12} {'Created'}")
    print("-" * 70)
    for r in rows:
        print(f"{r['user_id']:<20} {r['name']:<20} {r['role']:<12} {r.get('created_at','?')}")
    print(f"\nTotal: {len(rows)} users")


def cmd_stats():
    from children_persistence import sqlite_query, sqlite_query_one
    users = sqlite_query_one("SELECT COUNT(*) as c FROM users")
    audit = sqlite_query_one("SELECT COUNT(*) as c FROM audit_log")
    learning = sqlite_query_one("SELECT COUNT(*) as c FROM learning_records")
    emotions = sqlite_query_one("SELECT COUNT(*) as c FROM emotional_history")

    from children_content_db import KINDERGARTEN_COURSES, PRIMARY_COURSES, MIDDLE_SCHOOL_COURSES, QUIZ_DATABASE
    kinder_lessons = sum(len(c.get("lessons", [])) for c in KINDERGARTEN_COURSES.values())
    primary_lessons = sum(len(c.get("lessons", [])) for c in PRIMARY_COURSES.values())
    middle_lessons = sum(len(c.get("lessons", [])) for c in MIDDLE_SCHOOL_COURSES.values())
    total_quizzes = sum(len(q.get("questions", [])) for q in QUIZ_DATABASE.values())

    from children_robot_system import app
    api_routes = [r.path for r in app.routes if hasattr(r, "path") and r.path.startswith("/api/")]
    total_routes = len([r for r in app.routes if hasattr(r, "path")])

    print("=== System Statistics ===")
    print(f"  Users:             {users['c'] if users else 0}")
    print(f"  Audit entries:     {audit['c'] if audit else 0}")
    print(f"  Learning records:  {learning['c'] if learning else 0}")
    print(f"  Emotion records:   {emotions['c'] if emotions else 0}")
    print(f"  Courses:           {len(KINDERGARTEN_COURSES) + len(PRIMARY_COURSES) + len(MIDDLE_SCHOOL_COURSES)}")
    print(f"    Kindergarten:    {len(KINDERGARTEN_COURSES)} courses, {kinder_lessons} lessons")
    print(f"    Primary:         {len(PRIMARY_COURSES)} courses, {primary_lessons} lessons")
    print(f"    Middle School:   {len(MIDDLE_SCHOOL_COURSES)} courses, {middle_lessons} lessons")
    print(f"  Quiz questions:    {total_quizzes}")
    print(f"  API routes:        {len(api_routes)} API / {total_routes} total")


def cmd_backup():
    from children_persistence import save_json, ensure_data_dir, DATA_DIR, BACKUP_DIR, load_all
    ensure_data_dir()
    ts = time.strftime("%Y%m%d_%H%M%S")
    data = load_all()
    backup_file = f"full_backup_{ts}.json"
    save_json(backup_file, data, backup=False)
    print(f"Backup saved: {DATA_DIR / backup_file}")
    # Also backup SQLite
    import shutil
    db_src = DATA_DIR / "system.db"
    if db_src.exists():
        db_dst = BACKUP_DIR / f"system.db.{ts}.bak"
        shutil.copy2(db_src, db_dst)
        print(f"  DB backup: {db_dst}")
    print(f"  Backup dir: {BACKUP_DIR}")
    total = sum(f.stat().st_size for f in BACKUP_DIR.glob("*"))
    print(f"  Total backups size: {total / 1024:.1f} KB")


def cmd_health():
    from children_persistence import sqlite_query_one
    try:
        row = sqlite_query_one("SELECT COUNT(*) as c FROM users")
        db_ok = row is not None
    except Exception:
        db_ok = False
    print("=== Health Check ===")
    print(f"  Status:         {'OK' if db_ok else 'FAIL'}")
    print(f"  Database:       {'Connected' if db_ok else 'Disconnected'}")
    print(f"  Python:         {sys.version.split()[0]}")
    print(f"  Working dir:    {BASE_DIR}")
    print(f"  PID:            {os.getpid()}")


def cmd_routes():
    from children_robot_system import app
    routes = sorted(
        [(r.path, list(r.methods) if hasattr(r, "methods") else [])
         for r in app.routes if hasattr(r, "path") and r.path.startswith("/api/")],
        key=lambda x: x[0]
    )
    print(f"{'Method':<10} {'Path'}")
    print("-" * 80)
    for path, methods in routes:
        for m in (methods or ["GET"]):
            if m in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                print(f"{m:<10} {path}")
                break
    print(f"\nTotal: {len(routes)} API routes")


def cmd_search(query: str):
    from children_search import search_engine
    from children_content_db import get_all_content
    content = get_all_content()
    search_engine.reindex(content)
    results = search_engine.search(query)
    print(f'Search results for "{query}": {results.get("total", 0)} total')
    for key in ("courses", "lessons", "quizzes"):
        items = results.get(key, [])
        if items:
            print(f"\n  {key.title()}:")
            for item in items[:5]:
                name = item.get("name") or item.get("title") or item.get("course_id", "?")
                print(f"    - {name}")


def cmd_migrations():
    from children_persistence import sqlite_query
    rows = sqlite_query("SELECT version, name, applied_at, checksum FROM schema_migrations ORDER BY version")
    if not rows:
        print("No migrations applied")
        return
    print(f"{'Version':<10} {'Name':<25} {'Applied At':<20} {'Checksum'}")
    print("-" * 70)
    for r in rows:
        print(f"{r['version']:<10} {r['name']:<25} {r.get('applied_at','?'):<20} {r.get('checksum','?')}")


def cmd_export(filepath: str):
    from children_persistence import load_all, sqlite_query
    data = load_all()
    data["sqlite"] = {
        "users": sqlite_query("SELECT * FROM users"),
        "audit_log": sqlite_query("SELECT * FROM audit_log"),
        "learning_records": sqlite_query("SELECT * FROM learning_records ORDER BY timestamp DESC LIMIT 100"),
        "emotional_history": sqlite_query("SELECT * FROM emotional_history ORDER BY timestamp DESC LIMIT 100"),
    }
    path = Path(filepath)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print(f"Exported to {path} ({path.stat().st_size / 1024:.1f} KB)")


def cmd_serve():
    import uvicorn
    print("Starting API server on http://0.0.0.0:8888")
    uvicorn.run("children_robot_system:app", host="0.0.0.0", port=8888, ws="websockets", log_level="info")


def main():
    parser = argparse.ArgumentParser(description="Robot Management CLI")
    parser.add_argument("--users", action="store_true", help="List users")
    parser.add_argument("--stats", action="store_true", help="System statistics")
    parser.add_argument("--backup", action="store_true", help="Create backup")
    parser.add_argument("--health", action="store_true", help="Health check")
    parser.add_argument("--routes", action="store_true", help="List API routes")
    parser.add_argument("--search", type=str, metavar="QUERY", help="Search content")
    parser.add_argument("--migrations", action="store_true", help="Migration status")
    parser.add_argument("--export", type=str, metavar="FILE", help="Export to JSON")
    parser.add_argument("--serve", action="store_true", help="Start API server")
    args = parser.parse_args()

    if args.users:
        cmd_users()
    elif args.stats:
        cmd_stats()
    elif args.backup:
        cmd_backup()
    elif args.health:
        cmd_health()
    elif args.routes:
        cmd_routes()
    elif args.search:
        cmd_search(args.search)
    elif args.migrations:
        cmd_migrations()
    elif args.export:
        cmd_export(args.export)
    elif args.serve:
        cmd_serve()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
