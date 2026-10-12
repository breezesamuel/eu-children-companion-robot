#!/usr/bin/env python3
"""Parental controls — screen time limits, content filters, activity reports."""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict, deque
import logging
import uuid

logger = logging.getLogger("parental")

class ParentalControlSystem:
    def __init__(self):
        self._screen_time_limits: Dict[str, int] = {}
        self._screen_time_usage: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1440))
        self._content_filters: Dict[str, Dict] = {}
        self._activity_log: Dict[str, List[Dict]] = defaultdict(list)
        self._approved_apps: Dict[str, List[str]] = defaultdict(list)
        self._blocked_categories: Dict[str, List[str]] = defaultdict(list)
        self._bedtime_schedule: Dict[str, Dict] = {}
        self._learning_goals: Dict[str, List[Dict]] = defaultdict(list)

    def set_screen_time_limit(self, user_id: str, minutes_per_day: int) -> Dict:
        self._screen_time_limits[user_id] = minutes_per_day
        return {"success": True, "user_id": user_id, "limit_minutes": minutes_per_day}

    def get_screen_time_remaining(self, user_id: str) -> Dict:
        limit = self._screen_time_limits.get(user_id, 120)
        today = datetime.now().strftime("%Y-%m-%d")
        used = sum(1 for ts in self._screen_time_usage.get(user_id, [])
                   if ts.startswith(today))
        remaining = max(0, limit - used)
        return {"used_minutes": used, "limit_minutes": limit, "remaining_minutes": remaining}

    def log_activity(self, user_id: str, activity_type: str, detail: str,
                     duration_minutes: int = 0) -> Dict:
        entry = {
            "id": str(uuid.uuid4())[:8],
            "type": activity_type,
            "detail": detail,
            "duration_minutes": duration_minutes,
            "timestamp": datetime.now().isoformat(),
        }
        self._activity_log[user_id].append(entry)
        if duration_minutes > 0:
            self._screen_time_usage[user_id].append(datetime.now().strftime("%Y-%m-%d"))
        if len(self._activity_log[user_id]) > 10000:
            self._activity_log[user_id] = self._activity_log[user_id][-5000:]
        return entry

    def get_activity_report(self, user_id: str, days: int = 7) -> Dict:
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        activities = [a for a in self._activity_log.get(user_id, [])
                      if a["timestamp"] >= cutoff]
        by_type = defaultdict(int)
        total_time = 0
        for a in activities:
            by_type[a["type"]] += 1
            total_time += a.get("duration_minutes", 0)
        return {
            "user_id": user_id,
            "period_days": days,
            "total_activities": len(activities),
            "total_screen_time_minutes": total_time,
            "average_daily_minutes": round(total_time / max(1, days), 1),
            "by_type": dict(by_type),
            "recent": activities[-20:],
        }

    def set_content_filter(self, user_id: str, category: str, blocked: bool) -> Dict:
        if blocked:
            if category not in self._blocked_categories[user_id]:
                self._blocked_categories[user_id].append(category)
        else:
            self._blocked_categories[user_id] = [c for c in self._blocked_categories[user_id] if c != category]
        return {"success": True, "user_id": user_id, "category": category, "blocked": blocked}

    def is_content_allowed(self, user_id: str, category: str) -> bool:
        return category not in self._blocked_categories.get(user_id, [])

    def set_bedtime(self, user_id: str, start_time: str, end_time: str) -> Dict:
        self._bedtime_schedule[user_id] = {"start": start_time, "end": end_time}
        return {"success": True, "schedule": self._bedtime_schedule[user_id]}

    def is_bedtime(self, user_id: str) -> bool:
        schedule = self._bedtime_schedule.get(user_id)
        if not schedule:
            return False
        now = datetime.now().strftime("%H:%M")
        start, end = schedule["start"], schedule["end"]
        if start <= end:
            return start <= now <= end
        return now >= start or now <= end

    def set_learning_goal(self, user_id: str, goal: str, target: str,
                          metric: str = "lessons") -> Dict:
        goal_entry = {
            "id": str(uuid.uuid4())[:8],
            "goal": goal,
            "target": target,
            "metric": metric,
            "progress": 0,
            "created_at": datetime.now().isoformat(),
            "completed": False,
        }
        self._learning_goals[user_id].append(goal_entry)
        return {"success": True, "goal": goal_entry}

    def update_goal_progress(self, user_id: str, goal_id: str, progress: int) -> Dict:
        for g in self._learning_goals.get(user_id, []):
            if g["id"] == goal_id:
                g["progress"] = progress
                g["completed"] = progress >= 100
                return {"success": True, "goal": g}
        return {"success": False, "error": "Goal not found"}

    def get_dashboard(self, user_id: str) -> Dict:
        screen = self.get_screen_time_remaining(user_id)
        report = self.get_activity_report(user_id, 7)
        goals = self._learning_goals.get(user_id, [])
        bedtime = self._bedtime_schedule.get(user_id)
        blocked = self._blocked_categories.get(user_id, [])

        completed = sum(1 for g in goals if g.get("completed"))
        return {
            "screen_time": screen,
            "activity": {"total": report["total_activities"], "daily_avg": report["average_daily_minutes"]},
            "goals": {"total": len(goals), "completed": completed, "list": goals},
            "bedtime": bedtime,
            "blocked_categories": blocked,
            "is_bedtime": self.is_bedtime(user_id),
        }

parental_control = ParentalControlSystem()
