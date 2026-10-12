#!/usr/bin/env python3
"""Webhook system for external integrations."""

from datetime import datetime
from typing import Dict, List, Optional
import logging
import uuid
import json

try:
    from urllib.request import Request, urlopen
    from urllib.error import URLError, HTTPError
except ImportError:
    Request = urlopen = URLError = HTTPError = None

logger = logging.getLogger("webhooks")

class WebhookManager:
    def __init__(self):
        self._webhooks: Dict[str, Dict] = {}
        self._delivery_log: List[Dict] = []

    def register(self, url: str, events: List[str], secret: str = "") -> Dict:
        hook = {
            "id": str(uuid.uuid4())[:8],
            "url": url,
            "events": events,
            "secret": secret,
            "created_at": datetime.now().isoformat(),
            "last_delivery": None,
            "success_count": 0,
            "failure_count": 0,
        }
        self._webhooks[hook["id"]] = hook
        return hook

    def list_webhooks(self) -> List[Dict]:
        return list(self._webhooks.values())

    def delete(self, hook_id: str):
        self._webhooks.pop(hook_id, None)

    def get_matching(self, event: str) -> List[Dict]:
        return [h for h in self._webhooks.values()
                if "*" in h["events"] or event in h["events"]]

    async def deliver(self, hook_id: str, payload: Dict) -> Dict:
        hook = self._webhooks.get(hook_id)
        if not hook:
            return {"success": False, "error": "Webhook not found"}
        return await self._deliver_to(hook, payload)

    async def broadcast(self, event: str, payload: Dict) -> List[Dict]:
        results = []
        for hook in self.get_matching(event):
            result = await self._deliver_to(hook, {"event": event, **payload})
            results.append(result)
        return results

    async def _deliver_to(self, hook: Dict, payload: Dict) -> Dict:
        import asyncio
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = Request(hook["url"], data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("User-Agent", "RobotWebhook/1.0")
        if hook.get("secret"):
            req.add_header("X-Webhook-Secret", hook["secret"])

        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: urlopen(req, timeout=10))
            status = response.getcode()
            success = 200 <= status < 300
            hook["last_delivery"] = datetime.now().isoformat()
            if success:
                hook["success_count"] += 1
            else:
                hook["failure_count"] += 1
            result = {"success": success, "status": status, "hook_id": hook["id"]}
        except Exception as e:
            hook["failure_count"] += 1
            result = {"success": False, "error": str(e), "hook_id": hook["id"]}

        self._delivery_log.append({
            "hook_id": hook["id"],
            "url": hook["url"],
            "timestamp": datetime.now().isoformat(),
            **result,
        })
        if len(self._delivery_log) > 1000:
            self._delivery_log = self._delivery_log[-500:]
        return result

    def get_delivery_log(self, limit: int = 50) -> List[Dict]:
        return self._delivery_log[-limit:]

webhook_manager = WebhookManager()
