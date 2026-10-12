#!/usr/bin/env python3
"""Cross-module analytics engine — aggregates data from all modules for insights & reporting."""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict, Counter
import logging
import json

logger = logging.getLogger("analytics")

class AnalyticsEngine:
    def __init__(self):
        self._snapshots: Dict[str, List[Dict]] = defaultdict(list)
        self._max_history = 1000

    def snapshot(self) -> Dict:
        data = self._collect_all()
        ts = datetime.now().isoformat()
        record = {"timestamp": ts, "data": data}
        self._snapshots["system"].append(record)
        if len(self._snapshots["system"]) > self._max_history:
            self._snapshots["system"] = self._snapshots["system"][-self._max_history:]
        return record

    def _collect_all(self) -> Dict:
        result = {}
        try:
            from children_education import education_system
            skills = education_system.get_all_skills()
            result["education"] = {
                "total_skills": len(skills),
                "categories": len(set(s.get("category", "") for s in skills)),
                "progress_users": len(getattr(education_system, "user_progress", {})),
            }
        except Exception as e:
            result["education"] = {"error": str(e)}

        try:
            from children_learning import learning_system
            result["learning"] = {
                "enrollments": len(getattr(learning_system, "enrollments", {})),
                "total_records": sum(len(v) for v in getattr(learning_system, "records", {}).values()),
                "users_learning": len(getattr(learning_system, "records", {})),
            }
        except Exception as e:
            result["learning"] = {"error": str(e)}

        try:
            from children_emotional import emotional_system
            history = getattr(emotional_system, "emotion_history", {})
            total = sum(len(v) for v in history.values()) if isinstance(history, dict) else 0
            result["emotional"] = {"total_entries": total, "users_tracked": len(history) if isinstance(history, dict) else 0}
        except Exception as e:
            result["emotional"] = {"error": str(e)}

        try:
            from children_growth import growth_system
            achievements = getattr(growth_system, "unlocked_achievements", {})
            result["growth"] = {
                "total_achievements": sum(len(v) for v in achievements.values()),
                "users_with_achievements": len(achievements),
                "total_points": sum(getattr(growth_system, "points", {}).values()),
            }
        except Exception as e:
            result["growth"] = {"error": str(e)}

        try:
            from children_security import security
            score_data = security.get_security_score()
            result["security"] = {
                "score": score_data.get("overall_score", 0) if isinstance(score_data, dict) else 0,
                "audit_entries": len(getattr(security, "audit_log", [])),
            }
        except Exception as e:
            result["security"] = {"error": str(e)}

        try:
            from children_device import device_control
            devices = device_control.get_devices()
            total = len(devices)
            online = sum(1 for d in devices if isinstance(d, dict) and d.get("status") == "online")
            result["device"] = {"total": total, "online": online, "offline": total - online}
        except Exception as e:
            result["device"] = {"error": str(e)}

        try:
            from children_admin import admin_system
            kpi = admin_system.get_dashboard_kpi()
            result["admin"] = dict(kpi) if isinstance(kpi, dict) else {}
        except Exception as e:
            result["admin"] = {"error": str(e)}

        try:
            from children_content_db import STAGES, PRIMARY_COURSES, MIDDLE_SCHOOL_COURSES, QUIZ_DATABASE
            def count_questions(d):
                return sum(count_questions(v) for v in d.values()) if isinstance(d, dict) else (len(d) if isinstance(d, list) else 0)
            result["content"] = {
                "stages": len(STAGES),
                "primary_courses": len(PRIMARY_COURSES),
                "middle_school_courses": len(MIDDLE_SCHOOL_COURSES),
                "quiz_questions": count_questions(QUIZ_DATABASE),
            }
        except Exception as e:
            result["content"] = {"error": str(e)}

        try:
            from children_conversation import conversation_system
            result["conversation"] = {"active_sessions": len(getattr(conversation_system, "sessions", {}))}
        except Exception as e:
            result["conversation"] = {"error": str(e)}

        try:
            from children_data_sync import data_sync
            sync_stats = data_sync.get_sync_stats()
            result["sync"] = dict(sync_stats) if isinstance(sync_stats, dict) else {}
        except Exception as e:
            result["sync"] = {"error": str(e)}

        return result

    def user_report(self, user_id: str) -> Dict:
        report = {"user_id": user_id, "generated_at": datetime.now().isoformat()}
        try:
            from children_education import education_system
            progress = education_system.get_progress(user_id)
            report["education"] = progress if progress else {}
        except Exception:
            report["education"] = {}

        try:
            from children_learning import learning_system
            learning_report = learning_system.get_report(user_id)
            report["learning"] = learning_report if isinstance(learning_report, dict) else {}
            report["learning"]["streak"] = learning_system.get_streak(user_id)
        except Exception:
            report["learning"] = {}

        try:
            from children_emotional import emotional_system
            trends = emotional_system.get_emotion_trends(user_id)
            report["emotional"] = {"trends": trends if isinstance(trends, list) else []}
        except Exception:
            report["emotional"] = {}

        try:
            from children_growth import growth_system
            report["growth"] = {
                "achievements": growth_system.get_achievements(user_id),
                "goals": growth_system.get_next_goals(user_id),
            }
        except Exception:
            report["growth"] = {}

        try:
            from children_security import security
            consent = security.get_consent(user_id)
            report["security"] = {"consent_granted": consent is not None}
        except Exception:
            report["security"] = {}

        return report

    def weekly_summary(self, user_id: str) -> Dict:
        report = self.user_report(user_id)
        report["type"] = "weekly"
        learning = report.get("learning", {})
        emotional = report.get("emotional", {})
        growth = report.get("growth", {})

        trends = emotional.get("trends", [])
        if isinstance(trends, list) and trends:
            emotions = Counter()
            for t in trends:
                e = t.get("emotion", "neutral") if isinstance(t, dict) else str(t)
                emotions[e] += 1
            dominant = emotions.most_common(1)
            report["summary"] = {
                "dominant_emotion": dominant[0][0] if dominant else "neutral",
                "lessons_completed": learning.get("total_lessons", 0) if isinstance(learning, dict) else 0,
                "achievements_unlocked": len(growth.get("achievements", [])) if isinstance(growth, dict) else 0,
                "average_score": learning.get("average_score", 0) if isinstance(learning, dict) else 0,
            }
        return report

    def system_health(self) -> Dict:
        data = self._collect_all()
        status = "healthy"
        issues = []

        sec = data.get("security", {})
        if isinstance(sec, dict) and sec.get("score", 100) < 70:
            status = "attention"
            issues.append("Security score below threshold")

        dev = data.get("device", {})
        if isinstance(dev, dict) and dev.get("total", 0) > 0:
            ratio = dev.get("offline", 0) / max(1, dev.get("total", 1))
            if ratio > 0.5:
                status = "attention" if status == "healthy" else status
                issues.append(f"More than half devices offline ({dev.get('offline', 0)}/{dev.get('total', 0)})")

        return {"status": status, "issues": issues, "snapshot": data, "timestamp": datetime.now().isoformat()}

analytics = AnalyticsEngine()
