#!/usr/bin/env python3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger("admin")

@dataclass
class User:
    user_id: str
    name: str
    age: int
    role: str
    parent_id: Optional[str]

class AdminManagementSystem:
    def __init__(self):
        self.users = self._init_users()
        self._start_time = datetime.now()

    def _init_users(self) -> Dict[str, User]:
        return {
            "child_001": User("child_001", "小明", 8, "child", "parent_001"),
            "child_002": User("child_002", "小红", 6, "child", "parent_002"),
            "parent_001": User("parent_001", "张先生", 35, "parent", None),
            "parent_002": User("parent_002", "李女士", 32, "parent", None),
            "child_003": User("child_003", "小刚", 10, "child", "parent_001"),
            "child_004": User("child_004", "小美", 4, "child", "parent_002"),
            "parent_003": User("parent_003", "王女士", 38, "parent", None),
            "admin_001": User("admin_001", "系统管理员", 28, "admin", None),
        }

    def get_users(self, role: Optional[str] = None, search: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict:
        items = list(self.users.values())
        if role:
            items = [u for u in items if u.role == role]
        if search:
            q = search.lower()
            items = [u for u in items if q in u.name.lower() or q in u.user_id.lower()]
        total = len(items)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = items[start:end]
        return {
            "total": total, "page": page, "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "has_prev": page > 1,
            "has_next": page < ((total + page_size - 1) // page_size),
            "users": [{"user_id": u.user_id, "name": u.name, "age": u.age,
                       "role": u.role, "parent_id": u.parent_id} for u in page_items]
        }

    def get_user(self, user_id: str) -> Optional[Dict]:
        u = self.users.get(user_id)
        if not u:
            return None
        return {"user_id": u.user_id, "name": u.name, "age": u.age, "role": u.role, "parent_id": u.parent_id}

    def create_user(self, user_id: str, name: str, age: int, role: str, parent_id: Optional[str] = None) -> Dict:
        if user_id in self.users:
            return {"success": False, "message": "用户已存在"}
        if role not in ("child", "parent", "admin"):
            return {"success": False, "message": f"无效角色: {role}"}
        self.users[user_id] = User(user_id=user_id, name=name, age=age, role=role, parent_id=parent_id)
        return {"success": True, "message": f"用户 {name} 创建成功"}

    def update_user(self, user_id: str, data: Dict) -> Dict:
        user = self.users.get(user_id)
        if not user:
            return {"success": False, "message": "用户不存在"}
        if "name" in data:
            user.name = data["name"]
        if "age" in data:
            user.age = data["age"]
        if "parent_id" in data:
            user.parent_id = data["parent_id"]
        return {"success": True, "message": "用户信息已更新"}

    def delete_user(self, user_id: str) -> Dict:
        if user_id not in self.users:
            return {"success": False, "message": "用户不存在"}
        del self.users[user_id]
        return {"success": True, "message": "用户已删除"}

    def get_statistics(self) -> Dict:
        children = [u for u in self.users.values() if u.role == "child"]
        parents = [u for u in self.users.values() if u.role == "parent"]
        return {
            "total_users": len(self.users),
            "children_count": len(children),
            "parents_count": len(parents),
            "children_age_range": f"{min(u.age for u in children) if children else 0}-{max(u.age for u in children) if children else 0}",
            "average_child_age": round(sum(u.age for u in children) / len(children), 1) if children else 0,
            "registered_today": 0,
            "active_users": len(children) + len(parents),
        }

    def get_usage_report(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict:
        return {
            "period": f"{start_date or 'N/A'} - {end_date or 'N/A'}",
            "total_conversations": 1245,
            "average_daily_usage_minutes": 45,
            "most_active_hour": "19:00-20:00",
            "most_active_feature": "故事讲述",
            "engagement_rate": "87%",
            "total_learning_hours": 320,
            "achievements_unlocked": 45,
        }

    def get_content_analytics(self) -> Dict:
        return {
            "popular_categories": [{"category": "故事", "count": 450}, {"category": "音乐", "count": 320},
                                    {"category": "学习", "count": 280}, {"category": "游戏", "count": 200},
                                    {"category": "绘画", "count": 150}],
            "total_content_plays": 1400,
            "average_session_length": "25分钟",
            "peak_usage_time": "晚上19:00-21:00",
            "content_completion_rate": "76%",
            "most_used_device": "主控机器人",
        }

    def get_stage_statistics(self) -> List[Dict]:
        from children_content_db import get_stage_summary
        stages = get_stage_summary()
        children = [u for u in self.users.values() if u.role == "child"]
        for s in stages:
            sid = s["id"]
            age_min, age_max = {"kindergarten": (3,6), "primary": (6,12), "middle_school": (12,15)}.get(sid, (0,0))
            stage_children = [c for c in children if age_min <= c.age < age_max]
            s["children_count"] = len(stage_children)
            s["children"] = [{"id": c.user_id, "name": c.name, "age": c.age} for c in stage_children]
        return stages

    def get_stage_summary_endpoint_data(self) -> Dict:
        from children_content_db import get_stage_summary
        base = get_stage_summary()
        from children_content_db import STAGES
        enrollments = {}
        for sid, s in STAGES.items():
            children_count = len([u for u in self.users.values() 
                                 if u.role == "child" and 
                                 {"kindergarten": 3, "primary": 6, "middle_school": 12}.get(sid, 0) <= u.age < 
                                 {"kindergarten": 6, "primary": 12, "middle_school": 16}.get(sid, 0)])
            enrollments[sid] = {"children_count": children_count}
        return {"stages": base, "enrollments": enrollments}

    def get_content_categories(self) -> List[Dict]:
        return [
            {"id": "story", "name": "故事", "icon": "📖", "count": 12, "age_range": "3-12"},
            {"id": "music", "name": "音乐", "icon": "🎵", "count": 8, "age_range": "0-12"},
            {"id": "animation", "name": "动画", "icon": "🎬", "count": 6, "age_range": "2-8"},
            {"id": "game", "name": "游戏", "icon": "🎮", "count": 10, "age_range": "3-12"},
            {"id": "quiz", "name": "问答", "icon": "❓", "count": 15, "age_range": "4-12"},
            {"id": "painting", "name": "绘画", "icon": "🎨", "count": 5, "age_range": "2-10"},
            {"id": "dance", "name": "舞蹈", "icon": "💃", "count": 3, "age_range": "3-10"},
        ]

    def get_dashboard_kpi(self) -> Dict:
        return {
            "total_users": len(self.users),
            "active_devices": self.get_system_health().get("active_devices", 0),
            "today_conversations": self.get_usage_report().get("total_conversations", 0),
            "system_uptime": self.get_system_health().get("uptime", "N/A"),
            "api_requests_today": self.get_system_health().get("api_requests_today", 0),
            "avg_child_age": self.get_statistics().get("average_child_age", 0),
            "total_courses": 16,
            "total_achievements": 16,
            "total_quiz_questions": 40,
            "total_models": 12,
        }

    def get_devices_overview(self) -> List[Dict]:
        from children_device import device_control
        return device_control.get_devices()

    def get_system_health(self) -> Dict:
        uptime_delta = datetime.now() - self._start_time
        days = uptime_delta.days
        hours = uptime_delta.seconds // 3600
        uptime_str = f"{days}天{hours}小时"
        return {
            "status": "healthy",
            "uptime": uptime_str,
            "active_devices": 3,
            "total_devices": 5,
            "last_backup": datetime.now().isoformat(),
            "memory_usage": "42%",
            "cpu_load": "28%",
            "api_requests_today": 789,
            "errors_today": 1,
            "modules_loaded": 14,
        }

admin_system = AdminManagementSystem()
