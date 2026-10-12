#!/usr/bin/env python3
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging
import random
# Stage-based content support

logger = logging.getLogger("education")

@dataclass
class EducationSkill:
    name: str
    description: str
    category: str
    difficulty: str
    duration: int
    prerequisites: List[str]

@dataclass
class QuizQuestion:
    question: str
    options: List[str]
    answer: int
    explanation: str

class EducationSkillSystem:
    def __init__(self):
        self.skills = self._init_skills()
        self.quiz_bank = self._init_quiz_bank()
        self.user_progress: Dict[str, Dict] = {}

    def _init_skills(self) -> Dict[str, EducationSkill]:
        skills = {
            "math_basics": EducationSkill("数学基础", "学习加减乘除基础运算", "math", "easy", 20, []),
            "math_advanced": EducationSkill("数学进阶", "学习分数、小数、百分比", "math", "medium", 25, ["math_basics"]),
            "english_basics": EducationSkill("英语入门", "学习基础英语词汇和对话", "language", "easy", 20, []),
            "english_grammar": EducationSkill("英语语法", "学习基础英语语法规则", "language", "medium", 25, ["english_basics"]),
            "chinese_basics": EducationSkill("语文启蒙", "学习汉字拼音和基础词汇", "language", "easy", 20, []),
            "science_nature": EducationSkill("自然科学", "探索自然界的奥秘", "science", "medium", 30, []),
            "history_stories": EducationSkill("历史故事", "聆听有趣的历史故事", "history", "easy", 25, []),
            "art_creation": EducationSkill("艺术创作", "学习绘画和手工艺术", "art", "easy", 30, []),
            "music_rhythm": EducationSkill("音乐节奏", "学习音乐节奏和简单乐器", "music", "easy", 25, []),
            "programming_basics": EducationSkill("编程入门", "学习基础编程概念和逻辑", "technology", "medium", 30, []),
            "health_living": EducationSkill("健康生活", "学习健康饮食和运动知识", "life", "easy", 20, []),
            "geography_world": EducationSkill("世界地理", "探索世界各地的自然和人文", "geography", "medium", 25, []),
        }
        return skills

    def _init_quiz_bank(self) -> Dict[str, List[QuizQuestion]]:
        return {
            "math_basics": [
                QuizQuestion("1 + 1 = ?", ["1", "2", "3", "4"], 1, "1加1等于2"),
                QuizQuestion("5 - 3 = ?", ["1", "2", "3", "4"], 1, "5减去3等于2"),
                QuizQuestion("2 × 3 = ?", ["4", "5", "6", "7"], 2, "2乘以3等于6"),
                QuizQuestion("10 ÷ 2 = ?", ["3", "4", "5", "6"], 2, "10除以2等于5"),
                QuizQuestion("3 + 4 = ?", ["5", "6", "7", "8"], 2, "3加4等于7"),
            ],
            "math_advanced": [
                QuizQuestion("1/2 + 1/2 = ?", ["1/4", "1/2", "1", "2"], 2, "二分之一加二分之一等于1"),
                QuizQuestion("0.5 等于哪个分数？", ["1/5", "1/4", "1/3", "1/2"], 3, "0.5等于二分之一"),
                QuizQuestion("50% 等于？", ["一半", "四分之一", "全部", "零"], 0, "50%就是一半"),
                QuizQuestion("2/4 化简后是？", ["1/4", "1/3", "1/2", "2/2"], 2, "2/4化简为1/2"),
                QuizQuestion("25% 等于什么分数？", ["1/2", "1/4", "1/5", "1/3"], 1, "25%等于四分之一即1/4"),
            ],
            "english_basics": [
                QuizQuestion("'Hello'的中文意思是什么？", ["再见", "你好", "谢谢", "对不起"], 1, "Hello是问候语'你好'"),
                QuizQuestion("'Good morning'的意思是什么？", ["下午好", "晚上好", "早上好", "你好"], 2, "Good morning是早上好"),
                QuizQuestion("'Red'是什么颜色？", ["蓝色", "绿色", "红色", "黄色"], 2, "Red是红色"),
                QuizQuestion("'Thank you'的意思是什么？", ["你好", "谢谢", "再见", "对不起"], 1, "Thank you是谢谢"),
                QuizQuestion("'Cat'的中文是什么？", ["狗", "猫", "鸟", "鱼"], 1, "Cat是猫"),
            ],
            "chinese_basics": [
                QuizQuestion("'大'的反义词是什么？", ["小", "多", "长", "高"], 0, "大的反义词是小"),
                QuizQuestion("'日'字加一笔变成哪个字？", ["目", "白", "旧", "田"], 0, "日加一竖变成目"),
                QuizQuestion("下面哪个是汉字？", ["Hello", "中国", "Good", "123"], 1, "中国是汉字，其他不是"),
                QuizQuestion("'水'字有几画？", ["2", "3", "4", "5"], 2, "水字有4画"),
                QuizQuestion("'木'字加一笔是什么字？", ["本", "禾", "术", "未"], 0, "木加一横是本"),
            ],
            "science_nature": [
                QuizQuestion("太阳系有几颗行星？", ["6", "7", "8", "9"], 2, "太阳系有8颗行星"),
                QuizQuestion("植物生长需要什么？", ["阳光和水", "音乐", "电视", "书本"], 0, "植物需要阳光和水才能生长"),
                QuizQuestion("地球绕着什么转？", ["月亮", "太阳", "星星", "火星"], 1, "地球绕着太阳公转"),
                QuizQuestion("哪种动物生活在南极？", ["北极熊", "企鹅", "老虎", "大象"], 1, "企鹅生活在南极"),
                QuizQuestion("水的化学式是什么？", ["CO2", "O2", "H2O", "NaCl"], 2, "水的化学式是H2O"),
            ],
            "history_stories": [
                QuizQuestion("古埃及文明发源于哪条河流？", ["黄河", "尼罗河", "长江", "多瑙河"], 1, "古埃及文明发源于尼罗河"),
                QuizQuestion("第一次登上月球的是哪个国家的宇航员？", ["美国", "苏联", "中国", "英国"], 0, "1969年美国阿波罗11号首次登月"),
                QuizQuestion("长城是在哪个朝代开始大规模修建？", ["唐朝", "秦朝", "宋朝", "明朝"], 1, "秦始皇统一后大规模修建长城"),
                QuizQuestion("哥伦布在1492年发现了什么？", ["澳大利亚", "新大陆（美洲）", "南极洲", "非洲"], 1, "哥伦布发现了新大陆美洲"),
                QuizQuestion("古希腊最著名的城邦是哪两个？", ["罗马和巴黎", "雅典和斯巴达", "伦敦和柏林", "开罗和东京"], 1, "雅典和斯巴达是古希腊两大著名城邦"),
            ],
            "geography_world": [
                QuizQuestion("世界上面积最大的国家是？", ["中国", "美国", "俄罗斯", "加拿大"], 2, "俄罗斯是面积最大的国家"),
                QuizQuestion("法国的首都是哪里？", ["伦敦", "柏林", "巴黎", "罗马"], 2, "法国的首都是巴黎"),
                QuizQuestion("世界上最长的河流是什么？", ["长江", "亚马逊河", "尼罗河", "密西西比河"], 2, "尼罗河是世界上最长的河流"),
                QuizQuestion("哪个大洲被称为'热带大陆'？", ["欧洲", "亚洲", "非洲", "南极洲"], 2, "非洲大部分地区位于热带"),
                QuizQuestion("中国的最高峰是什么？", ["泰山", "黄山", "珠穆朗玛峰", "华山"], 2, "珠穆朗玛峰是世界最高峰"),
            ],
            "art_creation": [
                QuizQuestion("三原色是哪三种颜色？", ["红黄蓝", "红绿蓝", "红白蓝", "黄绿蓝"], 0, "红黄蓝是三原色"),
                QuizQuestion("画《蒙娜丽莎》的画家是谁？", ["梵高", "达芬奇", "毕加索", "米开朗基罗"], 1, "达芬奇创作了《蒙娜丽莎》"),
                QuizQuestion("黄色和蓝色混合会得到什么颜色？", ["红色", "绿色", "紫色", "橙色"], 1, "蓝加黄变成绿色"),
                QuizQuestion("梵高是哪国人？", ["法国", "荷兰", "意大利", "西班牙"], 1, "梵高是荷兰画家"),
                QuizQuestion("彩虹有几种颜色？", ["5", "6", "7", "8"], 2, "彩虹有赤橙黄绿青蓝紫7种颜色"),
            ],
        }

    def get_all_skills(self) -> List[Dict]:
        return [{"id": sid, "name": s.name, "description": s.description, "category": s.category,
                 "difficulty": s.difficulty, "duration": s.duration} for sid, s in self.skills.items()]

    def get_stage_skills(self, stage: str) -> List[Dict]:
        from children_content_db import get_quiz_by_stage
        quizzes = get_quiz_by_stage(stage)
        return [{"skill_id": q.get("subject", q["name"]), "name": q["name"], "stage": stage,
                 "question_count": len(q.get("questions", [])), "grade": q.get("grade", "")}
                for q in quizzes]

    def get_stage_quiz(self, stage: str, subject: str = None, count: int = 5) -> Dict:
        from children_content_db import get_quiz_by_stage, QUIZ_DATABASE
        quizzes = get_quiz_by_stage(stage, subject)
        if not quizzes:
            return {"success": False, "message": f"未找到 {stage}/{subject} 的测验"}
        questions = []
        for qz in quizzes:
            for q in qz.get("questions", []):
                questions.append({**q, "skill": qz["name"]})
        import random
        selected = random.sample(questions, min(count, len(questions)))
        return {"success": True, "stage": stage, "subject": subject or "all",
                "questions": selected, "total_available": len(questions)}

    def get_paginated_quiz(self, stage: str, subject: str = None, page: int = 1, page_size: int = 25) -> Dict:
        from children_content_db import get_quiz_by_stage, QUIZ_DATABASE
        from children_pagination import paginate
        quizzes = get_quiz_by_stage(stage, subject)
        all_questions = []
        for qz in quizzes:
            for q in qz.get("questions", []):
                all_questions.append({**q, "skill": qz["name"]})
        result = paginate(all_questions, page, page_size)
        result["stage"] = stage
        result["subject"] = subject or "all"
        return {"success": True, **result}

    def get_skills_by_category(self, category: str) -> List[Dict]:
        return [{"id": sid, "name": s.name, "difficulty": s.difficulty, "duration": s.duration}
                for sid, s in self.skills.items() if s.category == category]

    def execute_skill(self, skill_name: str, params: Dict, user_id: str) -> Dict:
        skill_id = self._find_skill_id(skill_name)
        if not skill_id or skill_id not in self.skills:
            return {"success": False, "message": f"技能 '{skill_name}' 不存在"}
        skill = self.skills[skill_id]
        if not self._check_prerequisites(skill_id, user_id):
            return {"success": False, "message": f"需要先完成前置技能: {', '.join(skill.prerequisites)}"}
        if user_id not in self.user_progress:
            self.user_progress[user_id] = {}
        self.user_progress[user_id][skill_id] = {
            "status": "in_progress", "started_at": datetime.now().isoformat(),
            "completion": 0, "score": 0, "lessons_done": 0
        }
        return {
            "success": True, "message": f"开始学习: {skill.name}",
            "skill_id": skill_id, "duration": skill.duration,
            "content": self._generate_learning_content(skill_id)
        }

    def get_quiz(self, skill_id: str, count: int = 3) -> Dict:
        questions = self.quiz_bank.get(skill_id, [])
        if not questions:
            from children_content_db import get_stage_for_age
            stage = get_stage_for_age(8)
            fallback = self.get_stage_quiz(stage, skill_id, count)
            if fallback.get("success"):
                return fallback
            return {"success": False, "message": "该技能没有测验题"}
        selected = random.sample(questions, min(count, len(questions)))
        return {
            "success": True, "skill_id": skill_id,
            "questions": [{"id": i, "question": q.question, "options": q.options}
                          for i, q in enumerate(selected)],
            "answers": {str(i): q.answer for i, q in enumerate(selected)},
            "explanations": {str(i): q.explanation for i, q in enumerate(selected)}
        }

    def submit_quiz(self, skill_id: str, user_id: str, answers: Dict[int, int]) -> Dict:
        questions = self.quiz_bank.get(skill_id, [])
        if not questions:
            return {"success": False, "message": "没有找到测验"}
        correct = 0
        total = len(answers)
        details = []
        for qid_str, chosen in answers.items():
            qid = int(qid_str)
            if qid < len(questions):
                q = questions[qid]
                is_correct = (chosen == q.answer)
                if is_correct:
                    correct += 1
                details.append({"question": q.question, "correct": is_correct, "explanation": q.explanation})
        score = round(correct / total * 100) if total > 0 else 0
        if user_id in self.user_progress and skill_id in self.user_progress[user_id]:
            p = self.user_progress[user_id][skill_id]
            p["score"] = max(p.get("score", 0), score)
            p["lessons_done"] = p.get("lessons_done", 0) + 1
            if score >= 80:
                p["status"] = "completed"
                p["completed_at"] = datetime.now().isoformat()
        return {"success": True, "score": score, "correct": correct, "total": total, "details": details}

    def _find_skill_id(self, skill_name: str) -> Optional[str]:
        for sid, skill in self.skills.items():
            if skill.name == skill_name or sid == skill_name:
                return sid
        return None

    def _check_prerequisites(self, skill_id: str, user_id: str) -> bool:
        skill = self.skills.get(skill_id)
        if not skill or not skill.prerequisites:
            return True
        progress = self.user_progress.get(user_id, {})
        for prereq in skill.prerequisites:
            if prereq not in progress or progress[prereq].get("status") != "completed":
                return False
        return True

    def _generate_learning_content(self, skill_id: str) -> Dict:
        contents = {
            "math_basics": {"title": "数学基础 - 加减乘除", "lessons": [
                {"topic": "认识数字", "content": "1, 2, 3, 4, 5... 这些都是数字"},
                {"topic": "加法", "content": "1 + 1 = 2, 把两个数合起来就是加法"},
                {"topic": "减法", "content": "5 - 2 = 3, 从总数中去掉一部分就是减法"},
                {"topic": "乘法", "content": "2 × 3 = 6, 乘法就是快速的加法"},
                {"topic": "除法", "content": "6 ÷ 2 = 3, 把东西平均分开就是除法"}
            ]},
            "math_advanced": {"title": "数学进阶 - 分数和小数", "lessons": [
                {"topic": "认识分数", "content": "1/2 表示一半，1/4 表示四分之一"},
                {"topic": "分数比较", "content": "同分母分数比大小，分子大的就大"},
                {"topic": "小数入门", "content": "0.1 是十分之一，0.5 是二分之一"},
                {"topic": "百分数", "content": "50% 就是一半，100% 就是全部"},
                {"topic": "混合运算", "content": "先乘除后加减，括号优先计算"}
            ]},
            "english_basics": {"title": "英语入门", "lessons": [
                {"topic": "问候语", "content": "Hello - 你好, Good morning - 早上好"},
                {"topic": "自我介绍", "content": "My name is... - 我的名字是..."},
                {"topic": "数字", "content": "One, Two, Three, Four, Five"},
                {"topic": "颜色", "content": "Red, Blue, Green, Yellow, White"},
                {"topic": "家庭", "content": "Mother, Father, Sister, Brother"}
            ]},
            "science_nature": {"title": "自然科学探索", "lessons": [
                {"topic": "太阳系", "content": "太阳系有8颗行星，地球是其中之一"},
                {"topic": "植物生长", "content": "植物需要阳光、水和土壤才能生长"},
                {"topic": "动物世界", "content": "动物分哺乳动物、鸟类、鱼类等"},
                {"topic": "天气变化", "content": "有晴天、雨天、雪天、刮风天等"},
                {"topic": "水的循环", "content": "水会变成云，云会变成雨落下来"}
            ]},
            "chinese_basics": {"title": "语文启蒙", "lessons": [
                {"topic": "认识拼音", "content": "a o e i u ü 是六个单韵母"},
                {"topic": "汉字结构", "content": "汉字分上下结构、左右结构等"},
                {"topic": "常见偏旁", "content": "氵（三点水）与水有关，火字旁与火有关"},
                {"topic": "反义词", "content": "大小、高低、长短、多少都是反义词"},
                {"topic": "简单造句", "content": "把词语连成一句通顺的话"}
            ]},
            "history_stories": {"title": "历史故事", "lessons": [
                {"topic": "古埃及文明", "content": "古埃及人建造了金字塔和狮身人面像"},
                {"topic": "古代中国", "content": "四大发明：造纸术、印刷术、火药、指南针"},
                {"topic": "大航海时代", "content": "哥伦布发现新大陆，麦哲伦环球航行"},
                {"topic": "工业革命", "content": "蒸汽机的发明改变了世界"},
                {"topic": "世界名人", "content": "爱因斯坦、牛顿、达芬奇等伟大人物"}
            ]},
            "geography_world": {"title": "世界地理", "lessons": [
                {"topic": "七大洲", "content": "亚洲、非洲、欧洲、北美洲、南美洲、大洋洲、南极洲"},
                {"topic": "四大洋", "content": "太平洋、大西洋、印度洋、北冰洋"},
                {"topic": "世界之最", "content": "最高峰珠穆朗玛峰、最长河尼罗河"},
                {"topic": "认识地图", "content": "学会看地图，认识方向：上北下南左西右东"},
                {"topic": "中国地理", "content": "中国有34个省级行政区，地大物博"}
            ]},
            "art_creation": {"title": "艺术创作", "lessons": [
                {"topic": "认识颜色", "content": "三原色红黄蓝，混合可以调出各种颜色"},
                {"topic": "著名画家", "content": "达芬奇、梵高、毕加索都是伟大的画家"},
                {"topic": "绘画技巧", "content": "点、线、面是绘画的基本元素"},
                {"topic": "手工艺术", "content": "用彩纸、剪刀、胶水制作有趣的手工作品"},
                {"topic": "艺术欣赏", "content": "学会观察和欣赏生活中的美"}
            ]},
        }
        return contents.get(skill_id, {"title": "学习内容", "lessons": [{"topic": "学习中", "content": "请认真听讲..."}]})

    def get_progress(self, user_id: str) -> Dict:
        progress = self.user_progress.get(user_id, {})
        completed = sum(1 for p in progress.values() if p.get("status") == "completed")
        return {
            "user_id": user_id, "total_skills": len(self.skills),
            "completed_skills": completed,
            "progress_percentage": round(completed / len(self.skills) * 100, 1) if self.skills else 0,
            "skills_detail": progress
        }

    def complete_skill(self, skill_id: str, user_id: str) -> Dict:
        if user_id not in self.user_progress or skill_id not in self.user_progress[user_id]:
            return {"success": False, "message": "用户未开始学习此技能"}
        self.user_progress[user_id][skill_id]["status"] = "completed"
        self.user_progress[user_id][skill_id]["completed_at"] = datetime.now().isoformat()
        return {"success": True, "message": f"恭喜完成: {self.skills[skill_id].name}"}

education_system = EducationSkillSystem()
