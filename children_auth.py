#!/usr/bin/env python3
"""JWT authentication + RBAC (parent, child, admin roles) backed by SQLite.

SECURITY: Uses bcrypt for password hashing (memory-hard, salted) — replaces the
earlier SHA-256+salt construction which is not memory-hard and vulnerable
to GPU cracking. JWT tokens are HS256 with shared secret (env: ROBOT_JWT_SECRET).
Refresh tokens are stored hashed in SQLite with TTL and rotation.

Note: Uses the `bcrypt` package directly (not passlib) for Python 3.12+ compatibility.
bcrypt has a 72-byte password limit; passwords are truncated if necessary.
"""

import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

try:
    import bcrypt
    _HAS_BCRYPT = True
except ImportError:
    _HAS_BCRYPT = False
    import hashlib  # fallback only for dev

logger = logging.getLogger("auth")

ROLE_HIERARCHY = {"admin": 3, "parent": 2, "child": 1, "guest": 0}

# --- Config ---------------------------------------------------------------
JWT_SECRET = os.environ.get("ROBOT_JWT_SECRET", "robot-dev-secret-change-in-production")
ACCESS_TOKEN_TTL_HOURS = int(os.environ.get("ROBOT_ACCESS_TOKEN_TTL_HOURS", "2"))
REFRESH_TOKEN_TTL_DAYS = int(os.environ.get("ROBOT_REFRESH_TOKEN_TTL_DAYS", "30"))
BCRYPT_ROUNDS = int(os.environ.get("ROBOT_BCRYPT_ROUNDS", "12"))
# bcrypt truncates at 72 bytes; we enforce this explicitly
BCRYPT_MAX_PASSWORD_BYTES = 72

def _secret() -> str:
    return JWT_SECRET

def _hash_password(password: str) -> str:
    """Return bcrypt hash (memory-hard, salted). Fallback to SHA-256 only if bcrypt unavailable (dev)."""
    if _HAS_BCRYPT:
        # bcrypt password limit is 72 bytes; truncate if necessary
        pw_bytes = password.encode('utf-8')
        if len(pw_bytes) > BCRYPT_MAX_PASSWORD_BYTES:
            pw_bytes = pw_bytes[:BCRYPT_MAX_PASSWORD_BYTES]
        return bcrypt.hashpw(pw_bytes, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode('ascii')
    # Dev-only fallback — NEVER use in production
    salt = uuid.uuid4().hex[:16]
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"sha256${salt}${h}"

def _is_bcrypt_hash(stored: str) -> bool:
    """bcrypt hashes are `$2a$`/`$2b$`/`$2y$` prefixed."""
    return stored.startswith(("$2a$", "$2b$", "$2y$"))


def _verify_password(password: str, stored: str) -> bool:
    """Verify against bcrypt or the legacy SHA-256+salt format.

    Legacy format produced by the previous implementation was ``"{salt}${sha256(salt+password)}"``
    (16-hex salt, 64-hex digest) with NO prefix. Accounts created before the
    bcrypt migration still carry it, so verification must accept it — otherwise
    every pre-existing user is locked out.
    """
    if not stored:
        return False

    if _HAS_BCRYPT and _is_bcrypt_hash(stored):
        try:
            pw_bytes = password.encode("utf-8")
            if len(pw_bytes) > BCRYPT_MAX_PASSWORD_BYTES:
                pw_bytes = pw_bytes[:BCRYPT_MAX_PASSWORD_BYTES]
            return bcrypt.checkpw(pw_bytes, stored.encode("ascii"))
        except Exception:
            return False

    # Legacy: either "sha256$salt$hash" or bare "salt$hash"
    legacy = stored[len("sha256$"):] if stored.startswith("sha256$") else stored
    parts = legacy.split("$")
    if len(parts) != 2:
        return False
    salt, digest = parts
    if not salt or not digest:
        return False
    try:
        return hmac.compare_digest(
            hashlib.sha256((salt + password).encode()).hexdigest(), digest)
    except Exception:
        return False


def _needs_hash_upgrade(stored: str) -> bool:
    """True when the stored hash is legacy and should be re-hashed on login."""
    return bool(stored) and not _is_bcrypt_hash(stored)

def _create_token(payload: Dict, expires_hours: int = None, token_type: str = "access") -> str:
    """Create a JWT (HS256). If expires_hours is None, use ACCESS_TOKEN_TTL_HOURS for access,
    REFRESH_TOKEN_TTL_DAYS*24 for refresh."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    if expires_hours is None:
        expires_hours = ACCESS_TOKEN_TTL_HOURS if token_type == "access" else REFRESH_TOKEN_TTL_DAYS * 24
    payload = dict(payload)  # copy
    payload["iat"] = now
    payload["exp"] = now + expires_hours * 3600
    payload["jti"] = uuid.uuid4().hex[:16]
    payload["typ"] = token_type
    import base64
    b64 = lambda d: base64.urlsafe_b64encode(json.dumps(d, separators=(",",":")).encode()).rstrip(b"=").decode()
    h = b64(header)
    p = b64(payload)
    sig = hmac.new(_secret().encode(), f"{h}.{p}".encode(), "sha256").hexdigest()
    return f"{h}.{p}.{sig}"

def _decode_token(token: str) -> Optional[Dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        h, p, sig = parts
        expected = hmac.new(_secret().encode(), f"{h}.{p}".encode(), "sha256").hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        import base64
        payload = json.loads(base64.urlsafe_b64decode(p + "==").decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def _hash_token(token: str) -> str:
    """SHA-256 hash of a token for storage (never store raw tokens)."""
    return hashlib.sha256(token.encode()).hexdigest()

def _store_refresh_token(user_id: str, refresh_token: str, db=None) -> None:
    """Store hashed refresh token with expiry."""
    _ensure_db()
    from children_database import database as db_
    db = db or db_
    payload = _decode_token(refresh_token)
    if not payload:
        return
    expires_at = datetime.fromtimestamp(payload["exp"]).isoformat()
    db.upsert("refresh_tokens", {
        "token_hash": _hash_token(refresh_token),
        "user_id": user_id,
        "expires_at": expires_at,
        "revoked": 0,
        "created_at": datetime.now().isoformat(),
    }, ["token_hash"])

def _revoke_refresh_token(refresh_token: str, db=None) -> bool:
    _ensure_db()
    from children_database import database as db_
    db = db or db_
    token_hash = _hash_token(refresh_token)
    try:
        db.upsert("refresh_tokens", {
            "token_hash": token_hash, "revoked": 1
        }, ["token_hash"])
        return True
    except Exception:
        return False

def _revoke_all_refresh_tokens(user_id: str, db=None) -> int:
    _ensure_db()
    from children_database import database as db_
    db = db or db_
    try:
        # Since we use upsert with conflict on token_hash, we need a different approach
        # Use raw SQL for bulk update
        conn = db._get_conn() if hasattr(db, '_get_conn') else None
        if conn:
            cur = conn.execute("UPDATE refresh_tokens SET revoked=1 WHERE user_id=? AND revoked=0", (user_id,))
            conn.commit()
            return cur.rowcount
    except Exception:
        pass
    return 0

def _is_refresh_token_valid(refresh_token: str, db=None) -> bool:
    _ensure_db()
    from children_database import database as db_
    db = db or db_
    token_hash = _hash_token(refresh_token)
    row = db.fetchone("SELECT * FROM refresh_tokens WHERE token_hash=?", (token_hash,))
    if not row:
        return False
    if row.get("revoked", 0) == 1:
        return False
    try:
        exp = datetime.fromisoformat(row["expires_at"])
        if exp < datetime.now():
            return False
    except Exception:
        return False
    return True

def _ensure_db():
    from children_persistence import init_sqlite_db
    try:
        init_sqlite_db()
    except Exception:
        pass

def register_user(username: str, password: str, role: str = "child",
                  parent_id: str = None, db=None) -> Dict:
    _ensure_db()
    from children_database import database as db_
    db = db or db_
    existing = db.fetchone("SELECT name FROM users WHERE name=?", (username,))
    if existing:
        return {"success": False, "error": "Username already exists"}
    if not password:
        return {"success": False, "error": "Password is required"}
    user_id = str(uuid.uuid4())[:12]
    db.upsert("users", {
        "user_id": user_id, "name": username, "age": 0,
        "role": role, "parent_id": parent_id or "",
        "password_hash": _hash_password(password),
    }, ["user_id"])
    return {"success": True, "user_id": user_id, "role": role}

def authenticate(username: str, password: str, db=None) -> Dict:
    _ensure_db()
    from children_database import database as db_
    db = db or db_
    row = db.fetchone("SELECT * FROM users WHERE name=?", (username,))
    if not row:
        return {"success": False, "error": "Invalid credentials"}
    stored = row.get("password_hash") or ""
    if stored:
        if not _verify_password(password, stored):
            return {"success": False, "error": "Invalid credentials"}
        # Transparent upgrade: re-hash to bcrypt on successful legacy login so
        # the SHA-256 path is retired progressively (no mass-password reset).
        if _needs_hash_upgrade(stored):
            try:
                db.upsert("users", {
                    "user_id": row["user_id"], "name": username, "age": row.get("age", 0),
                    "role": row.get("role", "child"), "parent_id": row.get("parent_id") or "",
                    "password_hash": _hash_password(password),
                }, ["user_id"])
                logger.info("Upgraded password hash to bcrypt for %s", username)
            except Exception as e:
                logger.warning("Hash upgrade failed for %s: %s", username, e)
    elif password:
        # Legacy account created before password hashing existed: bind the
        # password on first successful login (trust-on-first-use migration),
        # after which every subsequent login is verified normally.
        db.upsert("users", {
            "user_id": row["user_id"], "name": username, "age": row.get("age", 0),
            "role": row.get("role", "child"), "parent_id": row.get("parent_id") or "",
            "password_hash": _hash_password(password),
        }, ["user_id"])
    else:
        return {"success": False, "error": "Invalid credentials"}
    
    # Create access + refresh token pair
    base_payload = {
        "sub": row["user_id"],
        "username": username,
        "role": row.get("role", "child"),
        "parent_id": row.get("parent_id"),
    }
    access_token = _create_token(base_payload, token_type="access")
    refresh_token = _create_token(base_payload, token_type="refresh")
    _store_refresh_token(row["user_id"], refresh_token, db)
    
    return {
        "success": True,
        "access_token": access_token,
        "refresh_token": refresh_token,
        # `token` kept as a backward-compatible alias: existing API clients,
        # tests and mobile apps read `data.token`. Do not remove without a
        # documented deprecation window.
        "token": access_token,
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_TTL_HOURS * 3600,
        "user_id": row["user_id"],
        "role": row.get("role", "child"),
        "username": username
    }

def verify_token(token: str) -> Optional[Dict]:
    return _decode_token(token)

def refresh_access_token(refresh_token: str, db=None) -> Dict:
    """Exchange a valid refresh token for a new access token (rotation)."""
    if not _is_refresh_token_valid(refresh_token, db):
        return {"success": False, "error": "Invalid or expired refresh token"}
    
    payload = _decode_token(refresh_token)
    if not payload:
        return {"success": False, "error": "Invalid refresh token"}
    
    # Revoke old refresh token (rotation)
    _revoke_refresh_token(refresh_token, db)
    
    # Issue new token pair
    base_payload = {
        "sub": payload["sub"],
        "username": payload.get("username", ""),
        "role": payload.get("role", "child"),
        "parent_id": payload.get("parent_id"),
    }
    new_access = _create_token(base_payload, token_type="access")
    new_refresh = _create_token(base_payload, token_type="refresh")
    _store_refresh_token(payload["sub"], new_refresh, db)
    
    return {
        "success": True,
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token": new_access,          # backward-compatible alias (see authenticate())
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_TTL_HOURS * 3600
    }

def revoke_token(refresh_token: str, db=None) -> Dict:
    """Explicit logout: revoke the refresh token."""
    ok = _revoke_refresh_token(refresh_token, db)
    return {"success": ok, "message": "Token revoked" if ok else "Token not found"}

def change_password(user_id: str, old_password: str, new_password: str, db=None) -> Dict:
    """Verify the current password, store a new salted hash, and revoke all
    user's sessions so other devices must log in again."""
    _ensure_db()
    from children_database import database as db_
    db = db or db_
    row = db.fetchone("SELECT * FROM users WHERE user_id=?", (user_id,))
    if not row:
        return {"success": False, "error": "User not found"}
    stored = row.get("password_hash") or ""
    if stored and not _verify_password(old_password, stored):
        return {"success": False, "error": "Invalid current password"}
    if not new_password or len(new_password) < 6:
        return {"success": False, "error": "New password must be at least 6 characters"}
    if old_password == new_password:
        return {"success": False, "error": "New password must differ from the current password"}
    if not new_password or len(new_password) > 256:
        return {"success": False, "error": "New password too long"}
    db.upsert("users", {
        "user_id": user_id, "name": row.get("name", ""), "age": row.get("age", 0),
        "role": row.get("role", "child"), "parent_id": row.get("parent_id") or "",
        "password_hash": _hash_password(new_password),
    }, ["user_id"])
    # Revoke all refresh tokens for this user
    revoked = _revoke_all_refresh_tokens(user_id, db)
    try:
        from children_sessions import session_manager
        revoked += session_manager.revoke_all_for_user(user_id)
    except Exception:
        pass
    return {"success": True, "revoked_sessions": revoked}

def require_role(payload: Dict, min_role: str) -> bool:
    return ROLE_HIERARCHY.get(payload.get("role", "guest"), 0) >= ROLE_HIERARCHY.get(min_role, 0)

def parse_auth_header(auth: Optional[str]) -> Optional[Dict]:
    if not auth or not auth.startswith("Bearer "):
        return None
    return verify_token(auth[7:])
