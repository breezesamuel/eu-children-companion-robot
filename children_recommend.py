#!/usr/bin/env python3
"""Cross-module content recommendation engine based on stage + user progress."""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict
import random
import logging

from children_content_db import STAGES, PRIMARY_COURSES, MIDDLE_SCHOOL_COURSES, QUIZ_DATABASE
from children_pagination import paginate

logger = logging.getLogger("recommend")

STAGE_AGE_MAP = {
    "kindergarten": (3, 6),
    "primary": (6, 12),
    "middle_school": (12, 15),
}

class RecommendationEngine:
    def __init__(self):
        self.user_profiles: Dict[str, Dict] = {}
        self.recommendation_cache: Dict[str, Dict] = {}
        self.cache_ttl = timedelta(minutes=15)

    def build_profile(self, user_id: str,
                      learning_records: Optional[List] = None,
                      education_progress: Optional[Dict] = None,
                      emotion_history: Optional[List] = None,
                      growth_data: Optional[Dict] = None,
                      device_data: Optional[Dict] = None) -> Dict:
        from children_learning import learning_system
        from children_education import education_system
        from children_emotional import emotional_system
        from children_growth import growth_system

        profile = {
            "user_id": user_id,
            "stage": self._determine_stage(user_id, learning_records),
            "completed_skills": [],
            "in_progress_skills": [],
            "enrolled_courses": [],
            "recent_emotions": [],
            "achievements": [],
            "strong_subjects": [],
            "weak_subjects": [],
            "last_active": datetime.now().isoformat(),
        }

        if education_progress:
            profile["completed_skills"] = education_progress.get("completed_skills", [])
            profile["in_progress_skills"] = education_progress.get("in_progress_skills", [])

        if learning_records:
            enrolled = [r for r in learning_records if isinstance(r, dict)]
            profile["enrolled_courses"] = enrolled
            subjects = defaultdict(list)
            for r in enrolled:
                subj = r.get("course_id", "").split("_")[1] if "_" in r.get("course_id", "") else "general"
                score = r.get("score", 0)
                subjects[subj].append(score)
            for subj, scores in subjects.items():
                avg = sum(scores) / len(scores)
                if avg >= 80:
                    profile["strong_subjects"].append(subj)
                elif avg < 60:
                    profile["weak_subjects"].append(subj)

        if emotion_history:
            profile["recent_emotions"] = [e.get("emotion", "neutral") for e in emotion_history[-10:]]

        if growth_data:
            profile["achievements"] = growth_data.get("achievements", [])

        self.user_profiles[user_id] = profile
        return profile

    def _determine_stage(self, user_id: str, learning_records: Optional[List] = None) -> str:
        if learning_records:
            for r in learning_records:
                cid = r.get("course_id", "") if isinstance(r, dict) else ""
                if cid.startswith("p_"):
                    return "primary"
                elif cid.startswith("m_"):
                    return "middle_school"
        return "kindergarten"

    def recommend_courses(self, user_id: str, top_n: int = 5) -> List[Dict]:
        profile = self.user_profiles.get(user_id)
        if not profile:
            return []

        stage = profile["stage"]
        course_pool = list(PRIMARY_COURSES.values()) if stage == "primary" else list(MIDDLE_SCHOOL_COURSES.values())
        if stage == "kindergarten":
            course_pool = list(PRIMARY_COURSES.values())[:5]

        completed = set(profile.get("completed_skills", []))
        enrolled_ids = {r.get("course_id") for r in profile.get("enrolled_courses", []) if isinstance(r, dict)}

        scored = []
        for course in course_pool:
            cid = course.get("course_id", "")
            if cid in enrolled_ids:
                continue
            score = 0
            weak = profile.get("weak_subjects", [])
            for w in weak:
                if w in cid:
                    score += 10
            strong = profile.get("strong_subjects", [])
            for s_ in strong:
                if s_ in cid and score > 0:
                    score -= 3
            if course.get("name") in completed:
                score -= 5
            scored.append((score, course))

        scored.sort(key=lambda x: -x[0])
        return [c for _, c in scored[:top_n]]

    def recommend_activities(self, user_id: str, top_n: int = 3) -> List[Dict]:
        profile = self.user_profiles.get(user_id)
        if not profile:
            return []
        emotions = profile.get("recent_emotions", [])
        if not emotions:
            return []

        neg_emotions = {"sad", "angry", "fearful", "anxious", "frustrated"}
        recent_neg = sum(1 for e in emotions if e in neg_emotions)
        ratio = recent_neg / len(emotions) if emotions else 0

        from children_entertainment import entertainment
        content = entertainment.get_content()

        if ratio > 0.5:
            calming = [c for c in content if any(k in c.get("type", "").lower() for k in ["music", "story"])]
            return calming[:top_n] if calming else content[:top_n]
        elif ratio > 0.3:
            engaging = [c for c in content if any(k in c.get("type", "").lower() for k in ["game", "quiz"])]
            return engaging[:top_n] if engaging else content[:top_n]

        return content[:top_n]

    def recommend_quizzes(self, user_id: str, top_n: int = 5) -> List[Dict]:
        profile = self.user_profiles.get(user_id)
        if not profile:
            return []

        weak = set(profile.get("weak_subjects", []))
        all_quiz = []

        def collect(q_dict, path=""):
            if isinstance(q_dict, dict):
                for k, v in q_dict.items():
                    collect(v, f"{path}/{k}")
            elif isinstance(q_dict, list):
                for item in q_dict:
                    if isinstance(item, dict) and ("q" in item or "question" in item):
                        qtext = item.get("q") or item.get("question", "")
                        all_quiz.append({**item, "question": qtext, "category": path.strip("/")})

        collect(QUIZ_DATABASE)
        if not all_quiz:
            return []

        scored = []
        for q in all_quiz:
            score = 0
            cat = q.get("category", "")
            for w in weak:
                if w in cat.lower():
                    score += 5
            scored.append((score, q))

        scored.sort(key=lambda x: -x[0])
        return scored[:top_n]

    def recommend_all(self, user_id: str) -> Dict:
        now = datetime.now()
        cached = self.recommendation_cache.get(user_id)
        if cached and (now - cached.get("timestamp", now - self.cache_ttl)) < self.cache_ttl:
            return cached["data"]

        result = {
            "user_id": user_id,
            "timestamp": now.isoformat(),
            "courses": self.recommend_courses(user_id),
            "activities": self.recommend_activities(user_id),
            "quizzes": self.recommend_quizzes(user_id),
        }

        self.recommendation_cache[user_id] = {"data": result, "timestamp": now}
        return result

    def invalidate_cache(self, user_id: Optional[str] = None):
        if user_id:
            self.recommendation_cache.pop(user_id, None)
        else:
            self.recommendation_cache.clear()

recommendation_engine = RecommendationEngine()
