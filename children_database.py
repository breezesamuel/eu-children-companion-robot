# Sourced from children_persistence.sqlite_query / sqlite_execute / sqlite_upsert
# Wraps them into a convenience class.

import json
from datetime import datetime
from typing import Dict, List, Optional, Any

from children_persistence import (
    DB_PATH, sqlite_query, sqlite_execute, sqlite_query_one, sqlite_upsert
)

class Database:
    def execute(self, sql: str, params: tuple = ()):
        return sqlite_execute(sql, params)

    def fetchone(self, sql: str, params: tuple = ()) -> Optional[Dict]:
        return sqlite_query_one(sql, params)

    def fetchall(self, sql: str, params: tuple = ()) -> List[Dict]:
        return sqlite_query(sql, params)

    def insert(self, sql: str, params: tuple = ()) -> int:
        cur = sqlite_execute(sql, params)
        return cur.lastrowid

    def upsert(self, table: str, data: dict, conflict: list) -> bool:
        return sqlite_upsert(table, data, conflict)

    def count(self, sql: str, params: tuple = ()) -> int:
        row = self.fetchone(sql, params)
        return row["count(*)"] if row else 0

    def add_user(self, user_id: str, username: str, password: str, role: str = "child",
                 parent_id: str = None, display_name: str = None, age: int = None) -> bool:
        now = datetime.now().isoformat()
        try:
            self.upsert("users", {
                "user_id": user_id, "name": username, "age": age or 0,
                "role": role, "parent_id": parent_id or ""
            }, ["user_id"])
            return True
        except Exception:
            return False

    def get_user(self, user_id: str) -> Optional[Dict]:
        return self.fetchone("SELECT * FROM users WHERE user_id = ?", (user_id,))

    def list_users(self) -> List[Dict]:
        return self.fetchall("SELECT user_id, name, age, role, parent_id, created_at FROM users")

    def log_audit(self, user_id: str, action: str, resource: str = None,
                  detail: str = None, ip_address: str = None):
        now = datetime.now().isoformat()
        self.execute(
            "INSERT INTO audit_log (user_id, action, resource, detail, ip_address, created_at) VALUES (?,?,?,?,?,?)",
            (user_id, action, resource, detail, ip_address, now)
        )

    def get_audit_log(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        return self.fetchall(
            "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )

    def get_stats(self) -> Dict:
        return {
            "users": self.count("SELECT count(*) FROM users"),
            "learning_records": self.count("SELECT count(*) FROM learning_records"),
            "emotional_records": self.count("SELECT count(*) FROM emotional_history"),
            "devices": self.count("SELECT count(*) FROM device_records"),
            "audit_entries": self.count("SELECT count(*) FROM audit_log"),
        }

    def record_emotion(self, user_id: str, emotion: str, intensity: float = 0.5,
                       context: str = None) -> int:
        return self.insert(
            "INSERT INTO emotional_history (user_id, emotion, intensity, note) VALUES (?,?,?,?)",
            (user_id, emotion, intensity, context or "")
        )

    def get_emotion_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        return self.fetchall(
            "SELECT * FROM emotional_history WHERE user_id=? ORDER BY timestamp DESC LIMIT ?",
            (user_id, limit)
        )

    def record_learning(self, user_id: str, course_id: str, lesson_id: str,
                        score: float = 0, duration: int = 0) -> int:
        now = datetime.now().isoformat()
        return self.insert(
            "INSERT INTO learning_records (user_id, course_id, lesson_id, score, duration_minutes, timestamp) VALUES (?,?,?,?,?,?)",
            (user_id, course_id, lesson_id, score, duration, now)
        )

    def get_learning_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        return self.fetchall(
            "SELECT * FROM learning_records WHERE user_id=? ORDER BY timestamp DESC LIMIT ?",
            (user_id, limit)
        )

database = Database()
