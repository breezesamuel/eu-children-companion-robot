#!/usr/bin/env python3
"""Full-text search across courses, lessons, and quizzes."""

from typing import Dict, List, Optional
from collections import defaultdict
import logging
import re

logger = logging.getLogger("search")

class SearchEngine:
    def __init__(self):
        self._course_index: Dict[str, List[Dict]] = {}
        self._lesson_index: Dict[str, List[Dict]] = {}
        self._quiz_index: Dict[str, List[Dict]] = {}

    def reindex(self, content_db):
        self._course_index.clear()
        self._lesson_index.clear()
        self._quiz_index.clear()
        for stage_key in ["kindergarten_courses", "primary_courses", "middle_school_courses"]:
            courses = content_db.get(stage_key, {})
            if isinstance(courses, dict):
                courses = courses.values()
            for course in courses:
                cid = course.get("course_id", "")
                name = course.get("name", "")
                desc = course.get("description", "")
                words = self._tokenize(f"{name} {desc} {cid}")
                for w in words:
                    self._course_index.setdefault(w, []).append(course)
                for lesson in course.get("lessons", []):
                    ltitle = lesson.get("title", "")
                    lcontent = lesson.get("content", "")
                    lwords = self._tokenize(f"{ltitle} {lcontent}")
                    for w in lwords:
                        self._lesson_index.setdefault(w, []).append({
                            **lesson, "course_name": name, "course_id": cid,
                        })
        for qid, quiz in content_db.get("quiz_database", {}).items():
            if isinstance(quiz, dict):
                words = self._tokenize(quiz.get("name", "") + " " + quiz.get("subject", ""))
                for w in words:
                    self._quiz_index.setdefault(w, []).append(quiz)

    def _tokenize(self, text: str) -> List[str]:
        if not text:
            return []
        text = text.lower()
        tokens = re.findall(r'[\w\u4e00-\u9fff]+', text)
        result = []
        for t in tokens:
            result.append(t)
            # Split snake_case identifiers so a query such as "math" matches
            # the course id "p_g1_math".
            if "_" in t:
                result.extend(p for p in t.split("_") if p)
            # Only generate bigrams for Chinese text (2+ CJK chars)
            if re.match(r'^[\u4e00-\u9fff]{2,}$', t):
                for i in range(len(t) - 1):
                    result.append(t[i:i+2])
        return list(set(result))

    def search(self, query: str, types: List[str] = None, max_results: int = 10) -> Dict:
        if not query:
            return {"courses": [], "lessons": [], "quizzes": []}
        terms = self._tokenize(query)
        if not terms:
            return {"courses": [], "lessons": [], "quizzes": []}

        def rank(items: List[Dict], index: Dict) -> List[Dict]:
            scores = defaultdict(float)
            seen = set()
            for term in terms:
                for item in index.get(term, []):
                    uid = id(item)
                    scores[uid] += 1
            ranked = sorted(
                [(item, score) for uid, (item, score) in
                 {uid: (item, scores[uid]) for uid, item in
                  [(id(item), item) for term in terms for item in index.get(term, [])]}.items()],
                key=lambda x: -x[1]
            )
            return [item for item, _ in ranked[:max_results]]

        result = {}
        if types is None or "courses" in types:
            result["courses"] = rank(self._course_index, self._course_index)
        if types is None or "lessons" in types:
            result["lessons"] = rank(self._lesson_index, self._lesson_index)
        if types is None or "quizzes" in types:
            result["quizzes"] = rank(self._quiz_index, self._quiz_index)

        for k in result:
            result[k] = result[k][:max_results]

        result["total"] = sum(len(v) for v in result.values())
        return result

    def suggest(self, prefix: str, max_results: int = 5) -> List[str]:
        if not prefix:
            return []
        prefix = prefix.lower()
        terms = set()
        for index in [self._course_index, self._lesson_index, self._quiz_index]:
            for key in index:
                if key.startswith(prefix):
                    terms.add(key)
        return sorted(terms)[:max_results]

search_engine = SearchEngine()
