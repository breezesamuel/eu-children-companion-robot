#!/usr/bin/env python3
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import logging
import random

logger = logging.getLogger("entertainment")

@dataclass
class EntertainmentContent:
    title: str
    type: str
    description: str
    duration: int
    age_range: str
    tags: List[str]
    stage: str = "kindergarten"

class EntertainmentSkillSystem:
    def __init__(self):
        self.catalog = self._init_catalog()
        self._ensure_stages()
        self.play_history: Dict[str, List[Dict]] = {}
        self.favorites: Dict[str, List[str]] = {}
        self.play_queue: Dict[str, List[str]] = {}
        self.quiz_scores: Dict[str, List[Dict]] = {}

    def _init_catalog(self) -> Dict[str, EntertainmentContent]:
        return {
            # Stories (8)
            "story_cinderella": EntertainmentContent("灰姑娘", "story", "经典童话故事，灰姑娘参加舞会的故事", 10, "3-12", ["童话", "经典", "公主"], stage="kindergarten"),
            "story_three_little_pigs": EntertainmentContent("三只小猪", "story", "经典寓言故事，三只小猪建房子", 8, "2-10", ["寓言", "动物", "经典"], stage="kindergarten"),
            "story_journey_west": EntertainmentContent("西游记故事", "story", "孙悟空大闹天宫", 15, "5-14", ["神话", "冒险", "经典"], stage="kindergarten"),
            "story_little_red_riding_hood": EntertainmentContent("小红帽", "story", "经典欧洲童话，小红帽看望奶奶遇见大灰狼", 10, "3-10", ["童话", "欧洲", "经典", "冒险"], stage="kindergarten"),
            "story_hansel_and_gretel": EntertainmentContent("汉塞尔与格蕾特", "story", "德国童话，兄妹俩在森林里遇见糖果屋", 12, "4-12", ["童话", "欧洲", "冒险", "家庭"], stage="kindergarten"),
            "story_the_little_mermaid": EntertainmentContent("小美人鱼", "story", "安徒生童话，美人鱼追求梦想的故事", 15, "4-12", ["童话", "公主", "海洋", "安徒生"], stage="kindergarten"),
            "story_the_snow_queen": EntertainmentContent("冰雪女王", "story", "安徒生经典童话，冰雪女王的魔镜", 14, "4-12", ["童话", "冰雪", "冒险", "安徒生"], stage="kindergarten"),
            "story_the_ugly_duckling": EntertainmentContent("丑小鸭", "story", "安徒生童话，丑小鸭变成白天鹅的励志故事", 8, "2-10", ["童话", "动物", "励志", "安徒生"], stage="kindergarten"),
            # Music (7)
            "music_twinkle": EntertainmentContent("小星星", "music", "经典儿歌小星星", 3, "0-8", ["儿歌", "经典", "睡前"], stage="kindergarten"),
            "music_butterfly": EntertainmentContent("蝴蝶蝴蝶真美丽", "music", "欢快的童谣", 3, "2-10", ["儿歌", "动物"], stage="kindergarten"),
            "music_frere_jaques": EntertainmentContent("雅克兄弟", "music", "法国民谣 Frère Jacques，学法语儿歌", 3, "2-10", ["儿歌", "法语", "欧洲"], stage="kindergarten"),
            "music_au_clair_de_lune": EntertainmentContent("月光下", "music", "法国民歌 Au Clair de la Lune 优美旋律", 4, "3-12", ["儿歌", "法语", "经典"], stage="primary"),
            "music_head_shoulders": EntertainmentContent("头和肩膀膝盖和脚趾", "music", "英文身体部位儿歌 Head Shoulders Knees & Toes", 3, "2-8", ["儿歌", "英语", "身体", "动作"], stage="kindergarten"),
            "music_old_macdonald": EntertainmentContent("老麦克唐纳有个农场", "music", "经典英文儿歌 Old MacDonald Had a Farm", 4, "2-10", ["儿歌", "英语", "动物"], stage="kindergarten"),
            "music_bingo": EntertainmentContent("宾果", "music", "英文儿歌 Bingo 学字母拼写", 3, "2-8", ["儿歌", "英语", "字母"], stage="kindergarten"),
            # Animation (4)
            "animation_frozen": EntertainmentContent("冰雪奇缘片段", "animation", "冰雪奇缘精彩片段", 20, "4-14", ["动画", "冒险", "友情"], stage="primary"),
            "animation_peppa_pig": EntertainmentContent("小猪佩奇", "animation", "小猪佩奇和家人的快乐日常", 8, "2-6", ["动画", "家庭", "动物"], stage="kindergarten"),
            "animation_paw_patrol": EntertainmentContent("汪汪队立大功", "animation", "汪汪队救援冒险故事", 12, "3-10", ["动画", "冒险", "救援"], stage="primary"),
            "animation_masha_bear": EntertainmentContent("玛莎和熊", "animation", "玛莎与大熊的趣味故事", 10, "2-8", ["动画", "友情", "幽默"], stage="kindergarten"),
            # Game (6)
            "game_riddle": EntertainmentContent("猜谜语", "game", "有趣的谜语挑战", 5, "4-12", ["益智", "猜谜"], stage="primary"),
            "game_twenty_questions": EntertainmentContent("二十个问题", "game", "猜猜我在想什么", 10, "3-12", ["益智", "互动"], stage="primary"),
            "game_memory_match": EntertainmentContent("记忆配对", "game", "翻卡片配对记忆游戏", 8, "3-10", ["益智", "记忆", "互动"], stage="middle_school"),
            "game_simon_says": EntertainmentContent("西蒙说", "game", "听指令做动作的互动游戏", 6, "3-10", ["益智", "动作", "互动"], stage="kindergarten"),
            "game_color_guess": EntertainmentContent("颜色猜猜看", "game", "根据描述猜颜色", 5, "2-8", ["益智", "颜色", "认知"], stage="kindergarten"),
            "game_number_magic": EntertainmentContent("数字魔法", "game", "数字与算术小游戏", 7, "4-10", ["益智", "数学", "认知"], stage="kindergarten"),
            # Dance (1)
            "dance_hokey": EntertainmentContent("动动手指舞", "dance", "简单的律动舞蹈", 5, "2-8", ["运动", "律动"], stage="kindergarten"),
            # Riddle (5)
            "riddle_animals": EntertainmentContent("动物谜语", "riddle", "猜动物谜语", 5, "3-10", ["动物", "猜谜"], stage="kindergarten"),
            "riddle_body_parts": EntertainmentContent("身体部位谜语", "riddle", "猜身体部位趣味谜语", 4, "3-8", ["身体", "猜谜", "认知"], stage="kindergarten"),
            "riddle_nature": EntertainmentContent("自然谜语", "riddle", "关于大自然现象的谜语", 5, "4-10", ["自然", "猜谜", "科学"], stage="primary"),
            "riddle_food": EntertainmentContent("食物谜语", "riddle", "猜各种食物和水果的谜语", 4, "3-10", ["食物", "猜谜", "生活"], stage="kindergarten"),
            "riddle_transport": EntertainmentContent("交通工具谜语", "riddle", "猜交通工具的趣味谜语", 5, "3-10", ["交通", "猜谜", "认知"], stage="kindergarten"),
            # Quiz (5)
            "quiz_math_fun": EntertainmentContent("趣味数学问答", "quiz", "有趣的小学数学题", 10, "6-12", ["数学", "教育"], stage="primary"),
            "quiz_knowledge": EntertainmentContent("百科小知识", "quiz", "有趣的百科问答", 10, "5-14", ["百科", "教育"], stage="middle_school"),
            "quiz_animal_world": EntertainmentContent("动物世界", "quiz", "认识各种动物的趣味问答", 8, "4-10", ["动物", "教育", "自然"], stage="kindergarten"),
            "quiz_geography": EntertainmentContent("地理小知识", "quiz", "世界地理基础问答", 8, "6-14", ["地理", "教育", "百科"], stage="middle_school"),
            "quiz_english": EntertainmentContent("英语小测验", "quiz", "基础英语单词和字母问答", 6, "4-10", ["英语", "教育", "字母"], stage="primary"),
        }

    def get_content(self, content_type: Optional[str] = None, age: Optional[int] = None) -> List[Dict]:
        items = list(self.catalog.items())
        if content_type:
            items = [(cid, c) for cid, c in items if c.type == content_type]
        if age is not None:
            items = [(cid, c) for cid, c in items if self._age_in_range(age, c.age_range)]
        return [{"id": cid, "title": c.title, "type": c.type, "description": c.description,
                 "duration": c.duration, "age_range": c.age_range, "tags": c.tags}
                for cid, c in items]

    def _age_in_range(self, age: int, age_range: str) -> bool:
        try:
            parts = age_range.split("-")
            return int(parts[0]) <= age <= int(parts[1])
        except (ValueError, IndexError):
            return True

    def _ensure_stages(self):
        for item in self.catalog.values():
            if not item.stage:
                item.stage = "kindergarten"

    def get_content_by_stage(self, stage: str) -> List[Dict]:
        return [{"id": cid, "title": c.title, "type": c.type, "description": c.description,
                 "duration": c.duration, "age_range": c.age_range, "tags": c.tags, "stage": c.stage}
                for cid, c in self.catalog.items() if c.stage == stage]

    def get_paginated_content(self, stage: str = None, page: int = 1, page_size: int = 25) -> Dict:
        from children_pagination import paginate
        if stage:
            items = self.get_content_by_stage(stage)
        else:
            items = self.get_content()
        return paginate(items, page, page_size)

    def get_stage_summary(self) -> Dict:
        stages = {"kindergarten": 0, "primary": 0, "middle_school": 0}
        for item in self.catalog.values():
            s = item.stage or "kindergarten"
            stages[s] = stages.get(s, 0) + 1
        return {"total": len(self.catalog), "by_stage": stages,
                "stages": [{"stage": k, "count": v} for k, v in stages.items()]}

    def play_content(self, content_id: str, user_id: str) -> Dict:
        content = self.catalog.get(content_id)
        if not content:
            return {"success": False, "message": "内容不存在"}
        self.play_history.setdefault(user_id, []).append({
            "content_id": content_id, "title": content.title,
            "type": content.type, "played_at": datetime.now().isoformat()
        })
        result = {"success": True, "title": content.title, "type": content.type,
                  "duration": content.duration}
        playback = {
            "story": {"text": self._get_story_text(content_id)},
            "music": {"lyrics": self._get_song_lyrics(content_id)},
            "game": {"description": self._get_game_description(content_id)},
            "riddle": {"question": self._get_riddle(content_id)},
            "quiz": {"questions": self._get_quiz_questions(content_id)},
        }
        result.update(playback.get(content.type, {"message": "正在播放..."}))
        return result

    def _get_story_text(self, content_id: str) -> str:
        stories = {
            "story_cinderella": "从前有一个善良的女孩叫辛德瑞拉...",
            "story_three_little_pigs": "从前有三只小猪，它们决定各自建一座房子...",
            "story_journey_west": "孙悟空是从石头里蹦出来的猴子..."
        }
        return stories.get(content_id, "这是一个有趣的故事...")

    def _get_song_lyrics(self, content_id: str) -> str:
        songs = {
            "music_twinkle": "一闪一闪亮晶晶，满天都是小星星...",
            "music_butterfly": "蝴蝶蝴蝶真美丽，飞来飞去花丛中..."
        }
        return songs.get(content_id, "啦啦啦...")

    def _get_game_description(self, content_id: str) -> str:
        games = {
            "game_riddle": "我来出一个谜语，你来猜答案！",
            "game_twenty_questions": "想一个东西，我来问问题猜它是什么！"
        }
        return games.get(content_id, "有趣的游戏时间！")

    def _get_riddle(self, content_id: str) -> str:
        riddles = {
            "riddle_animals": "耳朵长，尾巴短，红眼睛，白毛衫，三瓣嘴，胆子小，蹦蹦跳跳真可爱。（打一动物）"
        }
        return riddles.get(content_id, "谜语时间！")

    def _get_quiz_questions(self, content_id: str) -> List[Dict]:
        quizzes = {
            "quiz_math_fun": [
                {"question": "1+1=?", "options": ["1", "2", "3"], "answer": 1},
                {"question": "2×3=?", "options": ["4", "5", "6"], "answer": 2},
            ],
            "quiz_knowledge": [
                {"question": "太阳从哪边升起？", "options": ["西方", "南方", "东方"], "answer": 2},
                {"question": "一年有多少个月？", "options": ["10", "12", "11"], "answer": 1},
            ]
        }
        return quizzes.get(content_id, [])

    def submit_quiz_answer(self, content_id: str, user_id: str, answers: Dict[int, int]) -> Dict:
        questions = self._get_quiz_questions(content_id)
        if not questions:
            return {"success": False, "message": "没有找到测验题"}
        correct = 0
        for qid_str, chosen in answers.items():
            qid = int(qid_str)
            if qid < len(questions) and questions[qid]["answer"] == chosen:
                correct += 1
        score = round(correct / len(answers) * 100) if answers else 0
        self.quiz_scores.setdefault(user_id, []).append({
            "content_id": content_id, "score": score,
            "timestamp": datetime.now().isoformat()
        })
        return {"success": True, "score": score, "correct": correct, "total": len(answers)}

    def toggle_favorite(self, user_id: str, content_id: str) -> Dict:
        self.favorites.setdefault(user_id, [])
        if content_id in self.favorites[user_id]:
            self.favorites[user_id].remove(content_id)
            return {"success": True, "favorited": False, "message": "已取消收藏"}
        self.favorites[user_id].append(content_id)
        return {"success": True, "favorited": True, "message": "已收藏"}

    def get_favorites(self, user_id: str) -> List[Dict]:
        favs = self.favorites.get(user_id, [])
        return [{"id": cid, "title": self.catalog[cid].title, "type": self.catalog[cid].type}
                for cid in favs if cid in self.catalog]

    def add_to_queue(self, user_id: str, content_id: str) -> Dict:
        if content_id not in self.catalog:
            return {"success": False, "message": "内容不存在"}
        self.play_queue.setdefault(user_id, []).append(content_id)
        return {"success": True, "message": "已加入播放队列", "queue_length": len(self.play_queue[user_id])}

    def get_queue(self, user_id: str) -> List[Dict]:
        queue = self.play_queue.get(user_id, [])
        return [{"id": cid, "title": self.catalog[cid].title, "type": self.catalog[cid].type}
                for cid in queue if cid in self.catalog]

    def clear_queue(self, user_id: str) -> Dict:
        self.play_queue[user_id] = []
        return {"success": True, "message": "播放队列已清空"}

    def get_recommendations(self, user_id: str, count: int = 5) -> List[Dict]:
        history = self.play_history.get(user_id, [])
        if not history:
            items = list(self.catalog.items())
            random.shuffle(items)
            return [{"id": cid, "title": c.title, "type": c.type, "duration": c.duration}
                    for cid, c in items[:count]]
        last_type = history[-1].get("type", "story")
        same_type = [c for cid, c in self.catalog.items()
                     if c.type == last_type and cid != history[-1].get("content_id")]
        random.shuffle(same_type)
        result = [{"id": cid, "title": c.title, "type": c.type, "duration": c.duration}
                  for c in same_type[:count]]
        if len(result) < count:
            others = [c for cid, c in self.catalog.items()
                      if c.type != last_type and {"id": cid, "title": c.title} not in result]
            random.shuffle(others)
            result.extend({"id": cid, "title": c.title, "type": c.type, "duration": c.duration}
                          for c in others[:count - len(result)])
        return result

    def get_play_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        history = self.play_history.get(user_id, [])
        return history[-limit:]

    def search(self, query: str) -> List[Dict]:
        q = query.lower()
        return [{"id": cid, "title": c.title, "type": c.type, "description": c.description,
                 "duration": c.duration, "age_range": c.age_range, "tags": c.tags}
                for cid, c in self.catalog.items()
                if q in c.title.lower() or q in c.description.lower() or any(q in t.lower() for t in c.tags)]

entertainment = EntertainmentSkillSystem()
