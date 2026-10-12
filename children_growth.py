#!/usr/bin/env python3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger("growth")

@dataclass
class Achievement:
    name: str
    description: str
    icon: str
    points: int
    category: str
    criteria: Dict
    stage: str = "kindergarten"

@dataclass
class GrowthRecord:
    event_type: str
    description: str
    points: int
    timestamp: str
    icon: str

class GrowthRecordSystem:
    def __init__(self):
        self.achievements = self._init_achievements()
        self.achievement_progress: Dict[str, Dict[str, int]] = {}
        self.unlocked_achievements: Dict[str, List[str]] = {}
        self.growth_timeline: Dict[str, List[GrowthRecord]] = {}
        self.points: Dict[str, int] = {}

    def _init_achievements(self) -> Dict[str, Achievement]:
        return {
            "first_lesson": Achievement("第一次学习", "完成第一节课", "📚", 10, "learning", {"type": "lesson", "count": 1}, stage="kindergarten"),
            "persistent": Achievement("坚持不懈", "累计完成10节课", "💪", 50, "learning", {"type": "lesson", "count": 10}, stage="primary"),
            "scholar": Achievement("小学霸", "累计完成50节课", "🎓", 200, "learning", {"type": "lesson", "count": 50}, stage="primary"),
            "perfect_score": Achievement("满分达人", "任意测验获得100分", "🌟", 30, "learning", {"type": "perfect_score", "threshold": 100}, stage="primary"),
            "helper": Achievement("助人为乐", "帮助其他小朋友3次", "🤝", 20, "social", {"type": "help", "count": 3}, stage="kindergarten"),
            "week_streak": Achievement("周之星", "连续学习7天", "🔥", 60, "habit", {"type": "streak", "days": 7}, stage="primary"),
            "month_streak": Achievement("月之星", "连续学习30天", "⭐", 300, "habit", {"type": "streak", "days": 30}, stage="primary"),
            "emotion_master": Achievement("情绪大师", "识别并管理10次情绪", "💖", 40, "emotional", {"type": "emotion", "count": 10}, stage="kindergarten"),
            "brave_heart": Achievement("勇敢的心", "克服恐惧5次", "🦁", 50, "emotional", {"type": "brave", "count": 5}, stage="kindergarten"),
            "story_lover": Achievement("故事大王", "听完20个故事", "📖", 30, "entertainment", {"type": "story", "count": 20}, stage="kindergarten"),
            "champion": Achievement("全能冠军", "解锁所有基础成就", "🏆", 500, "special", {"type": "all_basic", "count": 10}, stage="primary"),
            "creative_artist": Achievement("创意小画家", "完成5节美术课", "🎨", 30, "learning", {"type": "lessons_completed", "subject": "art", "count": 5}, stage="kindergarten"),
            "history_explorer": Achievement("历史探险家", "完成5节历史课", "📜", 30, "learning", {"type": "lessons_completed", "subject": "history", "count": 5}, stage="middle_school"),
            "geo_discoverer": Achievement("地理发现者", "完成5节地理课", "🌏", 30, "learning", {"type": "lessons_completed", "subject": "geography", "count": 5}, stage="middle_school"),
            "music_lover": Achievement("小小音乐家", "播放10首音乐", "🎵", 25, "entertainment", {"type": "content_played", "content_type": "music", "count": 10}, stage="kindergarten"),
            "story_teller": Achievement("故事大王", "听10个故事", "📖", 25, "entertainment", {"type": "content_played", "content_type": "story", "count": 10}, stage="kindergarten"),
        }

    def check_and_unlock(self, user_id: str, event: Dict) -> List[Dict]:
        unlocked = []
        event_type = event.get("type", "")
        event_data = event.get("data", {})

        for aid, ach in self.achievements.items():
            if user_id in self.unlocked_achievements and aid in self.unlocked_achievements[user_id]:
                continue
            criteria = ach.criteria
            if criteria.get("type") != event_type:
                continue
            self.achievement_progress.setdefault(user_id, {}).setdefault(aid, 0)
            self.achievement_progress[user_id][aid] += event_data.get("count", 1)
            count = self.achievement_progress[user_id][aid]

            if count >= criteria.get("count", 0) or event_data.get("score", 0) >= criteria.get("threshold", 999):
                self.unlocked_achievements.setdefault(user_id, []).append(aid)
                self.points[user_id] = self.points.get(user_id, 0) + ach.points
                record = GrowthRecord(
                    event_type="achievement", description=f"解锁成就: {ach.name}",
                    points=ach.points, timestamp=datetime.now().isoformat(), icon=ach.icon
                )
                self.growth_timeline.setdefault(user_id, []).append(record)
                unlocked.append({
                    "achievement_id": aid, "name": ach.name, "description": ach.description,
                    "points": ach.points, "icon": ach.icon, "category": ach.category
                })

        if not unlocked and event_type == "lesson":
            self.growth_timeline.setdefault(user_id, []).append(GrowthRecord(
                event_type="learning", description=event_data.get("description", "完成学习"),
                points=5, timestamp=datetime.now().isoformat(), icon="📝"
            ))
            self.points[user_id] = self.points.get(user_id, 0) + 5

        return unlocked

    def add_record(self, user_id: str, event_type: str, description: str, points: int = 0, icon: str = "📌"):
        self.growth_timeline.setdefault(user_id, []).append(GrowthRecord(
            event_type=event_type, description=description, points=points,
            timestamp=datetime.now().isoformat(), icon=icon
        ))
        self.points[user_id] = self.points.get(user_id, 0) + points

    def get_achievements(self, user_id: str) -> List[Dict]:
        unlocked = self.unlocked_achievements.get(user_id, [])
        result = []
        for aid, ach in self.achievements.items():
            unlocked_status = aid in unlocked
            progress = self.achievement_progress.get(user_id, {}).get(aid, 0)
            needed = ach.criteria.get("count", 1)
            result.append({
                "id": aid, "name": ach.name, "description": ach.description,
                "icon": ach.icon, "points": ach.points, "category": ach.category,
                "unlocked": unlocked_status, "progress": f"{progress}/{needed}",
                "progress_pct": min(100, round(progress / needed * 100)) if needed else 100
            })
        return result

    def get_timeline(self, user_id: str, limit: int = 20) -> List[Dict]:
        timeline = self.growth_timeline.get(user_id, [])
        return [{"event_type": r.event_type, "description": r.description,
                 "points": r.points, "timestamp": r.timestamp, "icon": r.icon}
                for r in timeline[-limit:]]

    def get_leaderboard(self) -> List[Dict]:
        sorted_users = sorted(self.points.items(), key=lambda x: x[1], reverse=True)
        return [{"user_id": uid, "points": pts, "rank": i + 1,
                 "achievements": len(self.unlocked_achievements.get(uid, []))}
                for i, (uid, pts) in enumerate(sorted_users[:10])]

    def get_next_goals(self, user_id: str) -> List[Dict]:
        unlocked = self.unlocked_achievements.get(user_id, [])
        locked = [(aid, ach) for aid, ach in self.achievements.items() if aid not in unlocked]
        locked.sort(key=lambda x: x[1].points)
        return [{"id": aid, "name": ach.name, "description": ach.description,
                 "points": ach.points, "icon": ach.icon, "category": ach.category}
                for aid, ach in locked[:3]]

    def get_achievements_by_stage(self, stage: str) -> List[Dict]:
        return [{"id": aid, "name": a.name, "description": a.description,
                 "icon": a.icon, "points": a.points, "category": a.category,
                 "stage": a.stage}
                for aid, a in self.achievements.items() if a.stage == stage]

    def get_stage_achievements_summary(self) -> Dict:
        stages = {}
        for a in self.achievements.values():
            s = a.stage
            if s not in stages:
                stages[s] = []
            stages[s].append(a.name)
        return {s: {"count": len(names), "names": names} for s, names in stages.items()}

    def get_user_stats(self, user_id: str) -> Dict:
        return {
            "user_id": user_id, "total_points": self.points.get(user_id, 0),
            "achievements_unlocked": len(self.unlocked_achievements.get(user_id, [])),
            "total_achievements": len(self.achievements),
            "recent_activity": self.get_timeline(user_id, 5)
        }

    def load_state(self, data: Dict):
        self.unlocked_achievements = data.get("unlocked", {})
        self.points = data.get("points", {})
        self.achievement_progress = data.get("progress", {})

    def export_state(self) -> Dict:
        return {"unlocked": self.unlocked_achievements, "points": self.points,
                "progress": self.achievement_progress}

growth_system = GrowthRecordSystem()
