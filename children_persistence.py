#!/usr/bin/env python3
import json, os, shutil, logging, threading, time, hashlib
from pathlib import Path
from datetime import datetime
from typing import Any, Optional

# Encryption at rest (Fernet = AES-128-CBC + HMAC-SHA256)
try:
    from cryptography.fernet import Fernet
    _ENCRYPTION_KEY = os.getenv("PERSISTENCE_ENCRYPTION_KEY")
    if _ENCRYPTION_KEY:
        _CIPHER = Fernet(_ENCRYPTION_KEY.encode() if isinstance(_ENCRYPTION_KEY, str) else _ENCRYPTION_KEY)
    else:
        _CIPHER = None
        logging.getLogger("persistence").warning("PERSISTENCE_ENCRYPTION_KEY not set — data stored unencrypted")
except ImportError:
    _CIPHER = None
    logging.getLogger("persistence").warning("cryptography not installed — data stored unencrypted")

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
BACKUP_DIR = DATA_DIR / "backups"
_lock = threading.Lock()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("persistence")

def _encrypt(data: Any) -> str:
    """Encrypt arbitrary JSON-serializable data."""
    if _CIPHER is None:
        return json.dumps(data, ensure_ascii=False, default=str)
    plaintext = json.dumps(data, ensure_ascii=False, default=str).encode()
    return _CIPHER.encrypt(plaintext).decode()

def _decrypt(ciphertext: str) -> Any:
    """Decrypt data encrypted by _encrypt()."""
    if _CIPHER is None:
        return json.loads(ciphertext)
    return json.loads(_CIPHER.decrypt(ciphertext.encode()).decode())

def ensure_data_dir():
    DATA_DIR.mkdir(exist_ok=True)
    BACKUP_DIR.mkdir(exist_ok=True)

def save_json(filename: str, data: Any, backup: bool = True) -> bool:
    ensure_data_dir()
    filepath = DATA_DIR / filename
    with _lock:
        try:
            if backup and filepath.exists():
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                shutil.copy2(filepath, BACKUP_DIR / f"{filename}.{ts}.bak")
            temp = filepath.with_suffix(".tmp")
            with open(temp, "w", encoding="utf-8") as f:
                f.write(_encrypt(data))
            temp.replace(filepath)
            return True
        except (OSError, json.JSONEncodeError) as e:
            logger.error("Save error (%s): %s", filename, e)
            return False

def load_json(filename: str, default: Any = None):
    ensure_data_dir()
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return default
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            return _decrypt(content)
    except (OSError, json.JSONDecodeError) as e:
        logger.error("Load error (%s): %s", filename, e)
        return default

def list_backups(filename: str) -> list:
    ensure_data_dir()
    pattern = f"{filename}.*.bak"
    return sorted([p.name for p in BACKUP_DIR.glob(pattern)], reverse=True)

def restore_backup(filename: str, backup_name: str) -> bool:
    ensure_data_dir()
    src = BACKUP_DIR / backup_name
    dst = DATA_DIR / filename
    if not src.exists():
        logger.error("Backup not found: %s", backup_name)
        return False
    with _lock:
        try:
            shutil.copy2(src, dst)
            logger.info("Restored %s from %s", filename, backup_name)
            return True
        except OSError as e:
            logger.error("Restore error: %s", e)
            return False

def cleanup_backups(max_per_file: int = 10):
    ensure_data_dir()
    groups = {}
    for p in BACKUP_DIR.glob("*.bak"):
        stem = p.name.rsplit(".", 2)[0] + ".json"
        groups.setdefault(stem, []).append(p)
    for fn, files in groups.items():
        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        for old in files[max_per_file:]:
            old.unlink()
            logger.debug("Removed old backup: %s", old.name)

def load_all():
    return {
        "sync": load_json("sync.json", {}),
        "conversations": load_json("conversations.json", {}),
        "education_progress": load_json("education_progress.json", {}),
        "emotional_history": load_json("emotional_history.json", {}),
        "learning": load_json("learning.json", {}),
        "growth": load_json("growth.json", {}),
    }

def save_all(data: dict, backup: bool = True):
    mappings = {
        "sync.json": data.get("sync", {}),
        "conversations.json": data.get("conversations", {}),
        "education_progress.json": data.get("education_progress", {}),
        "emotional_history.json": data.get("emotional_history", {}),
        "learning.json": data.get("learning", {}),
        "growth.json": data.get("growth", {}),
    }
    for fn, content in mappings.items():
        save_json(fn, content, backup=backup)

# ==================== SQLite Backend ====================
import sqlite3 as _sqlite3
import queue as _queue

DB_PATH = DATA_DIR / "system.db"

_SQLITE_POOL_SIZE = int(os.getenv("ROBOT_DB_POOL_SIZE", "5"))
_sqlite_pool = _queue.Queue(maxsize=_SQLITE_POOL_SIZE)
_pool_lock = threading.Lock()
_pool_initialized = False

def _create_conn() -> _sqlite3.Connection:
    conn = _sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = _sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-8000")
    return conn

def _init_pool():
    global _pool_initialized
    if _pool_initialized:
        return
    with _pool_lock:
        if _pool_initialized:
            return
        ensure_data_dir()
        for _ in range(_SQLITE_POOL_SIZE):
            _sqlite_pool.put(_create_conn())
        _pool_initialized = True

def _get_conn() -> _sqlite3.Connection:
    _init_pool()
    try:
        return _sqlite_pool.get(timeout=10)
    except _queue.Empty:
        return _create_conn()

def _put_conn(conn: _sqlite3.Connection):
    try:
        _sqlite_pool.put_nowait(conn)
    except _queue.Full:
        conn.close()

def _with_conn(fn, *args, **kwargs):
    conn = _get_conn()
    try:
        return fn(conn, *args, **kwargs)
    finally:
        _put_conn(conn)

def init_sqlite_db():
    _init_pool()
    conn = _get_conn()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT DEFAULT 'zh-CN',
                mode TEXT DEFAULT 'free',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (session_id) REFERENCES conversations(session_id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS education_progress (
                user_id TEXT NOT NULL,
                skill_name TEXT NOT NULL,
                status TEXT DEFAULT 'not_started',
                score REAL DEFAULT 0.0,
                questions_answered INTEGER DEFAULT 0,
                last_practice TEXT,
                PRIMARY KEY (user_id, skill_name)
            );
            CREATE TABLE IF NOT EXISTS learning_enrollments (
                user_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                enrolled_at TEXT DEFAULT (datetime('now')),
                progress REAL DEFAULT 0.0,
                status TEXT DEFAULT 'active',
                PRIMARY KEY (user_id, course_id)
            );
            CREATE TABLE IF NOT EXISTS learning_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                lesson_id TEXT NOT NULL,
                score REAL DEFAULT 0.0,
                duration_minutes INTEGER DEFAULT 0,
                timestamp TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                achievement_id TEXT NOT NULL,
                unlocked_at TEXT DEFAULT (datetime('now')),
                UNIQUE(user_id, achievement_id)
            );
            CREATE TABLE IF NOT EXISTS emotional_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                emotion TEXT NOT NULL,
                intensity REAL DEFAULT 0.5,
                note TEXT DEFAULT '',
                timestamp TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS device_records (
                device_id TEXT NOT NULL,
                data_type TEXT NOT NULL,
                data_json TEXT NOT NULL,
                version INTEGER DEFAULT 0,
                timestamp TEXT DEFAULT (datetime('now')),
                PRIMARY KEY (device_id, data_type)
            );
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER DEFAULT 0,
                role TEXT DEFAULT 'child',
                parent_id TEXT,
                password_hash TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS system_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                action TEXT NOT NULL,
                resource TEXT,
                detail TEXT,
                ip_address TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS rate_limits (
                client_ip TEXT NOT NULL,
                timestamp REAL NOT NULL,
                endpoint TEXT DEFAULT ''
            );
            CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(client_ip, timestamp);
            CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
            CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
            CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_learning_enrollments_user ON learning_enrollments(user_id);
            CREATE INDEX IF NOT EXISTS idx_emotional_history_user ON emotional_history(user_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
            CREATE INDEX IF NOT EXISTS idx_education_progress_user ON education_progress(user_id);
            CREATE TABLE IF NOT EXISTS rate_limit_config (
                client_ip TEXT PRIMARY KEY,
                max_requests INTEGER DEFAULT 120,
                window_seconds INTEGER DEFAULT 60,
                blocked_until REAL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                revoked INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT DEFAULT (datetime('now')),
                checksum TEXT
            );
        """)
        # Idempotent add for databases created before auth hardening.
        try:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''")
            conn.commit()
        except Exception:
            pass  # column already exists
        conn.commit()
        logger.info("SQLite database initialized at %s", DB_PATH)
    finally:
        _put_conn(conn)

def _migration_checksum(sql: str) -> str:
    return hashlib.md5(sql.encode()).hexdigest()[:8]

MIGRATIONS = [
    (1, "initial_schema", """-- Schema defined in init_sqlite_db()"""),
    (2, "add_rate_limits", """-- Rate limiting tables added in init_sqlite_db()"""),
    (3, "add_migrations_table", """-- schema_migrations tracking table"""),
]

def run_migrations():
    _init_pool()
    conn = _get_conn()
    try:
        applied = set()
        try:
            for row in conn.execute("SELECT version FROM schema_migrations ORDER BY version").fetchall():
                applied.add(row["version"])
        except Exception:
            pass
        for ver, name, sql in MIGRATIONS:
            if ver not in applied:
                checksum = _migration_checksum(sql)
                try:
                    conn.execute("INSERT INTO schema_migrations (version, name, checksum) VALUES (?,?,?)",
                                 (ver, name, checksum))
                    conn.commit()
                    logger.info("Migration %d/%s applied", ver, name)
                except Exception as e:
                    logger.error("Migration %d failed: %s", ver, e)
                    raise
        # Re-initialize DB (safe as tables use IF NOT EXISTS)
        init_sqlite_db()
    finally:
        _put_conn(conn)

def sqlite_execute(sql: str, params: tuple = ()) -> _sqlite3.Cursor:
    conn = _get_conn()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur
    except Exception as e:
        logger.error("SQLite execute error: %s", e)
        raise
    finally:
        _put_conn(conn)

def sqlite_query(sql: str, params: tuple = ()) -> list:
    conn = _get_conn()
    try:
        cur = conn.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error("SQLite query error: %s", e)
        return []
    finally:
        _put_conn(conn)

def sqlite_query_one(sql: str, params: tuple = ()):
    conn = _get_conn()
    try:
        cur = conn.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None
    except Exception as e:
        logger.error("SQLite query one error: %s", e)
        return None
    finally:
        _put_conn(conn)

def sqlite_upsert(table: str, data: dict, conflict_columns: list):
    columns = ", ".join(data.keys())
    placeholders = ", ".join("?" for _ in data)
    updates = ", ".join(f"{k}=excluded.{k}" for k in data.keys() if k not in conflict_columns)
    conflict = ", ".join(conflict_columns)
    sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders}) ON CONFLICT({conflict}) DO UPDATE SET {updates}"
    conn = _get_conn()
    try:
        conn.execute(sql, tuple(data.values()))
        conn.commit()
        return True
    except Exception as e:
        logger.error("SQLite upsert error: %s", e)
        return False
    finally:
        _put_conn(conn)

# Rate limiting with SQLite persistence
def rate_limit_check(client_ip: str, max_requests: int = 120, window_seconds: int = 60) -> bool:
    now = time.time()
    cutoff = now - window_seconds
    conn = _get_conn()
    try:
        # Clean old entries for this IP
        conn.execute("DELETE FROM rate_limits WHERE client_ip=? AND timestamp<?", (client_ip, cutoff))

        # Check if currently blocked
        blocked = conn.execute(
            "SELECT blocked_until FROM rate_limit_config WHERE client_ip=?", (client_ip,)
        ).fetchone()
        if blocked and blocked["blocked_until"] > now:
            return False

        # Count recent requests
        cur = conn.execute(
            "SELECT COUNT(*) as cnt FROM rate_limits WHERE client_ip=? AND timestamp>?",
            (client_ip, cutoff)
        )
        row = cur.fetchone()
        count = row["cnt"] if row else 0

        if count >= max_requests:
            # Block for one window
            conn.execute(
                "INSERT OR REPLACE INTO rate_limit_config (client_ip, max_requests, window_seconds, blocked_until) VALUES (?,?,?,?)",
                (client_ip, max_requests, window_seconds, now + window_seconds)
            )
            conn.commit()
            return False

        # Record the request
        conn.execute("INSERT INTO rate_limits (client_ip, timestamp) VALUES (?,?)", (client_ip, now))
        conn.commit()

        # Periodic cleanup across all IPs
        if int(now) % 100 < 2:
            conn.execute("DELETE FROM rate_limits WHERE timestamp<?", (now - 3600,))
            conn.execute("DELETE FROM rate_limit_config WHERE blocked_until<?", (now - 3600,))
            conn.commit()
        return True
    except Exception as e:
        logger.error("rate_limit_check error: %s", e)
        return True
    finally:
        _put_conn(conn)

def migrate_json_to_sqlite():
    """One-time migration: copy data from JSON files to SQLite tables"""
    ensure_data_dir()
    # Check if migration already done
    existing = sqlite_query_one("SELECT value FROM system_config WHERE key='migration_version'")
    if existing:
        logger.info("Migration already completed (version=%s)", existing['value'])
        return
    
    # Migrate users from admin
    try:
        import importlib
        admin = importlib.import_module('children_admin')
        for uid, user in admin.admin_system.users.items():
            sqlite_upsert("users", {
                "user_id": uid, "name": user.name, "age": user.age,
                "role": user.role, "parent_id": user.parent_id or ""
            }, ["user_id"])
        logger.info("Migrated %d users to SQLite", len(admin.admin_system.users))
    except Exception as e:
        logger.warning("User migration skipped: %s", e)
    
    sqlite_upsert("system_config", {"key": "migration_version", "value": "1"}, ["key"])
    logger.info("Migration to SQLite completed")

# Auto-initialize SQLite on import
try:
    init_sqlite_db()
    run_migrations()
    migrate_json_to_sqlite()
except Exception as e:
    logger.warning("SQLite initialization deferred: %s", e)
