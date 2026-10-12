#!/usr/bin/env python3
"""Session management — track, validate, and revoke user sessions."""

import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger("sessions")

class SessionManager:
    def __init__(self):
        self._sessions: Dict[str, Dict] = {}
        self._user_sessions: Dict[str, List[str]] = {}

    def create(self, user_id: str, role: str = "child",
               metadata: dict = None, ttl_seconds: int = 86400) -> Dict:
        session_id = str(uuid.uuid4())[:16]
        now = datetime.now().isoformat()
        expiry = time.time() + ttl_seconds
        session = {
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "metadata": metadata or {},
            "created_at": now,
            "last_activity": now,
            "expires_at": datetime.fromtimestamp(expiry).isoformat(),
            "ip_address": metadata.get("ip", "") if metadata else "",
            "user_agent": metadata.get("ua", "") if metadata else "",
            "active": True,
        }
        self._sessions[session_id] = session
        self._user_sessions.setdefault(user_id, []).append(session_id)
        return session

    def get(self, session_id: str) -> Optional[Dict]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        if not session.get("active", True):
            return None
        if "expires_at" in session:
            exp = datetime.fromisoformat(session["expires_at"]).timestamp()
            if time.time() > exp:
                self.revoke(session_id)
                return None
        session["last_activity"] = datetime.now().isoformat()
        return session

    def revoke(self, session_id: str) -> bool:
        session = self._sessions.get(session_id)
        if not session:
            return False
        session["active"] = False
        user_id = session.get("user_id", "")
        if user_id in self._user_sessions:
            try:
                self._user_sessions[user_id].remove(session_id)
            except ValueError:
                pass
        return True

    def revoke_all_for_user(self, user_id: str) -> int:
        count = 0
        for sid in list(self._user_sessions.get(user_id, [])):
            if self.revoke(sid):
                count += 1
        return count

    def list_user_sessions(self, user_id: str) -> List[Dict]:
        return [self._sessions[sid] for sid in self._user_sessions.get(user_id, [])
                if sid in self._sessions and self._sessions[sid].get("active", True)]

    def cleanup_expired(self) -> int:
        count = 0
        now = time.time()
        for sid, session in list(self._sessions.items()):
            if "expires_at" in session:
                exp = datetime.fromisoformat(session["expires_at"]).timestamp()
                if now > exp:
                    self.revoke(sid)
                    count += 1
            if not session.get("active", True):
                # Remove fully expired after 7 days
                created = datetime.fromisoformat(session["created_at"]).timestamp()
                if now - created > 7 * 86400:
                    self._sessions.pop(sid, None)
        return count

    def get_stats(self) -> Dict:
        active = sum(1 for s in self._sessions.values() if s.get("active", True))
        return {
            "total_sessions": len(self._sessions),
            "active_sessions": active,
            "unique_users": len(self._user_sessions),
        }

session_manager = SessionManager()
