#!/usr/bin/env python3
"""Multi-channel notification system — in-app, email, push, webhook."""

from datetime import datetime
from typing import Dict, List, Optional, Any
from collections import defaultdict
from dataclasses import dataclass, field
import logging
import json
import uuid

logger = logging.getLogger("notify")

@dataclass
class Notification:
    id: str
    user_id: str
    channel: str
    title: str
    body: str
    data: Dict
    priority: str
    status: str
    created_at: str
    read_at: Optional[str] = None
    sent_at: Optional[str] = None

class NotificationSystem:
    CHANNELS = {"in_app", "email", "push", "webhook"}

    def __init__(self):
        self._notifications: Dict[str, Notification] = {}
        self._templates: Dict[str, str] = self._init_templates()
        self._preferences: Dict[str, Dict] = defaultdict(lambda: {c: True for c in self.CHANNELS})
        self._webhooks: Dict[str, List[str]] = defaultdict(list)

    def _init_templates(self) -> Dict[str, str]:
        return {
            "achievement_unlocked": "Congratulations! You unlocked: {achievement}",
            "lesson_completed": "Lesson completed: {lesson_name} (Score: {score})",
            "low_emotion": "{user_name} seems {emotion}. Check in with them.",
            "weekly_report": "Weekly report ready for {user_name}",
            "sync_completed": "Data sync completed. {count} items synced.",
            "device_offline": "Device {device_name} has been offline for {hours}h",
            "goal_reminder": "Reminder: {goal_name} is due soon!",
            "parent_tip": "Parenting tip: {tip}",
        }

    def send(self, user_id: str, channel: str, title: str, body: str,
             data: Optional[Dict] = None, priority: str = "normal") -> Dict:
        if channel not in self.CHANNELS:
            return {"success": False, "error": f"Unknown channel: {channel}"}
        prefs = self._preferences.get(user_id, {})
        if not prefs.get(channel, True):
            return {"success": False, "error": f"User opted out of {channel}"}

        n = Notification(
            id=str(uuid.uuid4())[:12],
            user_id=user_id,
            channel=channel,
            title=title,
            body=body,
            data=data or {},
            priority=priority,
            status="pending",
            created_at=datetime.now().isoformat(),
        )

        if channel == "in_app":
            n.status = "sent"
            n.sent_at = datetime.now().isoformat()
        elif channel == "push":
            n.status = "sent"
            n.sent_at = datetime.now().isoformat()
        elif channel == "webhook":
            urls = self._webhooks.get(user_id, [])
            if urls:
                n.status = "sent"
                n.sent_at = datetime.now().isoformat()
            else:
                n.status = "failed"
                n.body = "No webhook URLs registered"

        self._notifications[n.id] = n
        return {"success": True, "notification_id": n.id, "channel": channel, "status": n.status}

    def send_template(self, user_id: str, channel: str, template_name: str,
                      variables: Dict, data: Optional[Dict] = None,
                      priority: str = "normal") -> Dict:
        template = self._templates.get(template_name)
        if not template:
            return {"success": False, "error": f"Unknown template: {template_name}"}
        try:
            body = template.format(**variables)
        except KeyError as e:
            return {"success": False, "error": f"Missing template variable: {e}"}
        return self.send(user_id, channel, template_name.replace("_", " ").title(), body, data, priority)

    def mark_read(self, notification_id: str) -> Dict:
        n = self._notifications.get(notification_id)
        if not n:
            return {"success": False, "error": "Notification not found"}
        n.status = "read"
        n.read_at = datetime.now().isoformat()
        return {"success": True}

    def mark_all_read(self, user_id: str) -> int:
        count = 0
        for n in self._notifications.values():
            if n.user_id == user_id and n.status == "sent":
                n.status = "read"
                n.read_at = datetime.now().isoformat()
                count += 1
        return count

    def get_notifications(self, user_id: str, limit: int = 50,
                          unread_only: bool = False) -> List[Dict]:
        ns = [n for n in self._notifications.values() if n.user_id == user_id]
        if unread_only:
            ns = [n for n in ns if n.status != "read"]
        ns.sort(key=lambda x: x.created_at, reverse=True)
        return [
            {"id": n.id, "channel": n.channel, "title": n.title, "body": n.body,
             "priority": n.priority, "status": n.status, "created_at": n.created_at,
             "read_at": n.read_at}
            for n in ns[:limit]
        ]

    def get_unread_count(self, user_id: str) -> int:
        return sum(1 for n in self._notifications.values()
                   if n.user_id == user_id and n.status == "sent")

    def set_preference(self, user_id: str, channel: str, enabled: bool) -> Dict:
        if channel not in self.CHANNELS:
            return {"success": False, "error": f"Unknown channel: {channel}"}
        self._preferences[user_id][channel] = enabled
        return {"success": True}

    def register_webhook(self, user_id: str, url: str) -> Dict:
        if url not in self._webhooks[user_id]:
            self._webhooks[user_id].append(url)
        return {"success": True, "webhooks": self._webhooks[user_id]}

    def stats(self) -> Dict:
        by_status = defaultdict(int)
        by_channel = defaultdict(int)
        for n in self._notifications.values():
            by_status[n.status] += 1
            by_channel[n.channel] += 1
        return {
            "total": len(self._notifications),
            "by_status": dict(by_status),
            "by_channel": dict(by_channel),
            "templates_available": len(self._templates),
        }

notifications = NotificationSystem()
