#!/usr/bin/env python3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging
from collections import defaultdict

logger = logging.getLogger("learning")

# Stage-based learning support

@dataclass
class Course:
    name: str
    subject: str
    grade: str
    lessons: List[str]

@dataclass
class LearningRecord:
    course_id: str
    lesson_id: str
    score: float
    timestamp: str
    duration_minutes: int

class LearningManagementSystem:
    def __init__(self):
        self.courses = self._init_courses()
        self.enrollments: Dict[str, List[str]] = {}
        self.records: Dict[str, List[LearningRecord]] = {}
        self.streaks: Dict[str, List[str]] = {}

    def _init_courses(self) -> Dict[str, Course]:
        return {
            "math_g1": Course("数学一年级", "math", "G1", ["认识数字1-100", "加减法入门", "认识图形", "比较大小", "认识钟表"]),
            "math_g2": Course("数学二年级", "math", "G2", ["两位数加减", "乘法口诀", "认识长度", "认识角", "统计入门"]),
            "math_g3": Course("数学三年级", "math", "G3", ["三位数加减", "除法入门", "分数初步", "周长和面积", "时间计算"]),
            "english_g1": Course("英语一年级", "english", "G1", ["ABC", "颜色", "动物", "水果", "身体部位"]),
            "english_g2": Course("英语二年级", "english", "G2", ["家庭成员", "天气", "食物", "学校", "动作"]),
            "english_g3": Course("英语三年级", "english", "G3", ["时态入门", "阅读理解", "简单写作", "日常对话", "语法基础"]),
            "chinese_g1": Course("语文一年级", "chinese", "G1", ["拼音", "笔画", "识字", "阅读", "写话"]),
            "chinese_g2": Course("语文二年级", "chinese", "G2", ["古诗欣赏", "成语故事", "看图写话", "朗读训练", "汉字书写"]),
            "science_g1": Course("科学一年级", "science", "G1", ["认识植物", "了解动物", "四季变化", "水和空气", "我的身体"]),
            "science_g2": Course("科学二年级", "science", "G2", ["植物生长", "动物习性", "天气现象", "磁铁探索", "声音奥秘"]),
            "science_g3": Course("科学三年级", "science", "G3", ["力的初步", "电的基础", "光的传播", "声音与振动", "简单机械"]),
            "history_g1": Course("历史启蒙", "history", "G1", ["古代文明", "四大发明", "丝绸之路", "伟大人物", "传统节日"]),
            "history_g2": Course("历史故事", "history", "G2", ["世界古代文明", "著名探险家", "科技发明史", "文化名人", "历史大事件"]),
            "geography_g1": Course("地理启蒙", "geography", "G1", ["七大洲", "四大洋", "中国地理", "世界之最", "地图知识"]),
            "geography_g2": Course("地理探索", "geography", "G2", ["认识地图", "气候与天气", "世界文化", "自然资源", "环境保护"]),
            "art_g1": Course("艺术启蒙", "art", "G1", ["认识色彩", "简笔画", "折纸", "泥塑", "拼贴画"]),
        }

    def get_courses(self, subject: Optional[str] = None) -> List[Dict]:
        items = list(self.courses.items())
        if subject:
            items = [(cid, c) for cid, c in items if c.subject == subject]
        return [{"id": cid, "course_id": cid, "name": c.name, "subject": c.subject, "grade": c.grade,
                 "lessons": len(c.lessons), "description": c.lessons[0] if c.lessons else "",
                 "total_lessons": len(c.lessons)}
                for cid, c in items]

    def get_stage_courses(self, stage: str, grade: str = None) -> List[Dict]:
        from children_content_db import get_content_by_stage
        data = get_content_by_stage(stage)
        courses = data.get("courses", [])
        if grade:
            courses = [c for c in courses if c.get("grade") == grade]
        return [{"course_id": c["course_id"], "name": c["name"],
                 "subject": c.get("subject", ""), "grade": c.get("grade", ""),
                 "description": c["description"], "target_ages": c.get("target_ages", ""),
                 "lesson_count": len(c.get("lessons", [])),
                 "stage": stage} for c in courses]

    def get_paginated_courses(self, stage: str = None, grade: str = None, page: int = 1, page_size: int = 25) -> Dict:
        from children_pagination import paginate
        if stage:
            courses = self.get_stage_courses(stage, grade)
        else:
            courses = []
            for s in ["kindergarten", "primary", "middle_school"]:
                courses.extend(self.get_stage_courses(s, grade))
        return paginate(courses, page, page_size)

    def get_stage_lesson(self, stage: str, course_id: str, lesson_id: str = None) -> Dict:
        from children_content_db import KINDERGARTEN_COURSES, PRIMARY_COURSES, MIDDLE_SCHOOL_COURSES
        db = {"kindergarten": KINDERGARTEN_COURSES, "primary": PRIMARY_COURSES, "middle_school": MIDDLE_SCHOOL_COURSES}
        courses = db.get(stage, {})
        course = courses.get(course_id)
        if not course:
            return {"success": False, "message": f"未找到课程 {course_id}"}
        if lesson_id:
            lessons = [l for l in course.get("lessons", []) if l["id"] == lesson_id]
            if not lessons:
                return {"success": False, "message": f"未找到课节 {lesson_id}"}
            return {"success": True, "course": course["name"], "lesson": lessons[0]}
        return {"success": True, "course": course["name"], "lessons": course.get("lessons", []),
                "lesson_count": len(course.get("lessons", []))}

    def get_stage_summary(self) -> List[Dict]:
        from children_content_db import get_stage_summary
        return get_stage_summary()

    def get_stages(self) -> List[Dict]:
        from children_content_db import STAGES
        return [{"id": sid, "name": s["name"], "age_range": s["age_range"],
                 "sub_stages": s["sub_stages"], "subjects": s["subjects"],
                 "learning_hours_per_week": s.get("learning_hours_per_week", 0)}
                for sid, s in STAGES.items()]

    def enroll(self, user_id: str, course_id: str) -> Dict:
        if course_id not in self.courses:
            return {"success": False, "message": "课程不存在"}
        if user_id not in self.enrollments:
            self.enrollments[user_id] = []
        if course_id in self.enrollments[user_id]:
            return {"success": False, "message": "已经注册过此课程"}
        self.enrollments[user_id].append(course_id)
        return {"success": True, "message": f"注册成功: {self.courses[course_id].name}"}

    def record_lesson(self, user_id: str, course_id: str, lesson_index: int, score: float, duration_minutes: int) -> Dict:
        if course_id not in self.courses:
            return {"success": False, "message": "课程不存在"}
        course = self.courses[course_id]
        if lesson_index < 0 or lesson_index >= len(course.lessons):
            return {"success": False, "message": "课时索引无效"}
        score = max(0, min(100, score))
        record = LearningRecord(
            course_id=course_id, lesson_id=course.lessons[lesson_index],
            score=score, timestamp=datetime.now().isoformat(), duration_minutes=duration_minutes
        )
        self.records.setdefault(user_id, []).append(record)
        today = datetime.now().strftime("%Y-%m-%d")
        self.streaks.setdefault(user_id, []).append(today)
        self._check_streak(user_id)
        return {"success": True, "message": "学习记录已保存", "record": record}

    def _check_streak(self, user_id: str):
        dates = sorted(set(self.streaks.get(user_id, [])), reverse=True)
        if not dates:
            return
        streak = 1
        for i in range(len(dates) - 1):
            d1 = datetime.strptime(dates[i], "%Y-%m-%d")
            d2 = datetime.strptime(dates[i + 1], "%Y-%m-%d")
            if (d1 - d2).days == 1:
                streak += 1
            else:
                break
        self.streaks[user_id + "_current"] = streak

    def get_streak(self, user_id: str) -> int:
        return self.streaks.get(user_id + "_current", 0)

    def get_report(self, user_id: str) -> Dict:
        records = self.records.get(user_id, [])
        if not records:
            return {"user_id": user_id, "total_lessons": 0, "message": "暂无学习记录"}
        subject_scores = defaultdict(list)
        total_duration = 0
        for r in records:
            course = self.courses.get(r.course_id)
            if course:
                subject_scores[course.subject].append(r.score)
            total_duration += r.duration_minutes
        avg_scores = {subj: round(sum(scores) / len(scores), 1) for subj, scores in subject_scores.items()}
        overall = round(sum(sum(scores) for scores in subject_scores.values()) /
                        sum(len(scores) for scores in subject_scores.values()), 1) if subject_scores else 0
        return {
            "user_id": user_id, "total_lessons": len(records),
            "total_duration_minutes": total_duration,
            "subject_averages": avg_scores, "overall_average": overall,
            "recommendations": self._generate_recommendations(avg_scores),
            "current_streak": self.get_streak(user_id)
        }

    def _generate_recommendations(self, avg_scores: Dict[str, float]) -> List[str]:
        recs = []
        for subj, score in avg_scores.items():
            if score < 60:
                recs.append(f"{subj}需要加强，建议多做练习")
            elif score < 75:
                recs.append(f"{subj}基础不错，继续巩固")
            elif score < 90:
                recs.append(f"{subj}成绩良好，尝试挑战更高难度")
            else:
                recs.append(f"{subj}优秀！可以学习更高年级的内容")
        if not avg_scores:
            recs.append("开始你的学习之旅吧！")
        return recs[:3]

    def get_learning_plan(self, user_id: str) -> Dict:
        enrolled = self.enrollments.get(user_id, [])
        if not enrolled:
            return {"user_id": user_id, "message": "还未注册任何课程", "suggestions": list(self.courses.keys())[:3]}
        total_lessons = sum(len(self.courses[cid].lessons) for cid in enrolled if cid in self.courses)
        done = len(self.records.get(user_id, []))
        return {
            "user_id": user_id, "enrolled_courses": enrolled,
            "total_lessons": total_lessons, "completed_lessons": done,
            "progress": round(done / total_lessons * 100, 1) if total_lessons else 0,
            "daily_goal_minutes": 30, "weekly_goal_minutes": 150,
            "current_streak": self.get_streak(user_id)
        }

    def get_subject_performance(self, user_id: str, subject: str) -> Dict:
        records = [r for r in self.records.get(user_id, [])
                   if r.course_id in self.courses and self.courses[r.course_id].subject == subject]
        if not records:
            return {"subject": subject, "message": "暂无该科目的学习记录"}
        scores = [r.score for r in records]
        return {
            "subject": subject, "total_lessons": len(scores),
            "average": round(sum(scores) / len(scores), 1),
            "highest": max(scores), "lowest": min(scores),
            "recent_scores": scores[-5:]
        }

learning_system = LearningManagementSystem()
