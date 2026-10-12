#!/usr/bin/env python3
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger("emotional")

@dataclass
class EmotionRecord:
    emotion_type: str
    intensity: float
    trigger: str
    timestamp: str
    message: str

class EmotionalCompanionSystem:
    def __init__(self):
        self.emotion_keywords = {
            "happy": ["开心", "高兴", "快乐", "幸福", "excited", "happy", "joyful", "棒", "太好了", "真好"],
            "sad": ["难过", "伤心", "不高兴", "sad", "unhappy", "down", "哭", "泪", "失落", "沮丧"],
            "angry": ["生气", "愤怒", "讨厌", "angry", "mad", "frustrated", "烦", "气", "恨"],
            "scared": ["害怕", "担心", "紧张", "scared", "afraid", "nervous", "worried", "怕", "恐惧"],
            "lonely": ["孤独", "寂寞", "无聊", "lonely", "bored", "alone", "没意思", "没人"],
            "tired": ["累", "困", "疲倦", "tired", "sleepy", "exhausted", "疲惫", "没精神"],
            "anxious": ["紧张", "焦虑", "担心", "不安", "害怕考试", "做噩梦", "睡不着", "心慌", "忐忑", "没底", "worried", "nervous", "anxious", "afraid", "stress"],
            "proud": ["骄傲", "自豪", "得意", "了不起", "我做到了", "第一", "胜利", "冠军", "成功", "完成", "proud", "achievement", "win", "success", "victory"]
        }
        self.negation_words = ["不", "没", "别", "不要", "没有", "not", "no", "don't", "doesn't", "isn't"]
        self.emotion_responses = {
            "happy": ["我也很开心！你的快乐会传染给我哦！", "太棒了！开心的时光要好好珍惜！", "看到你开心，我也好开心呀！"],
            "sad": ["别难过，我在这里陪着你呢。", "有时候难过是正常的，告诉我发生了什么？", "抱抱你，一切都会好起来的！"],
            "angry": ["深呼吸，慢慢来，我理解你的感受。", "生气很正常，但我们一起想办法解决好不好？", "来，跟我说说是什么让你不开心了？"],
            "scared": ["别怕，我在这里保护你！", "很多事情其实没那么可怕，我们一起面对。", "告诉我你在害怕什么，我来帮你想办法。"],
            "lonely": ["你不是一个人！我在这里陪着你。", "来，我们一起做点有趣的事情吧！", "寂寞的时候可以找我聊天哦，我永远都在。"],
            "tired": ["累了就休息一下吧，我会给你讲故事哄你睡。", "休息是为了走更远的路，好好休息吧！", "要不要听点舒缓的音乐放松一下？"],
            "anxious": ["别担心，我陪着你", "深呼吸，慢慢来", "想和我聊聊你在担心什么吗？", "每个人都会紧张，这很正常", "我们一起做个放松练习吧"],
            "proud": ["太棒了！你真厉害！", "为你感到骄傲！继续加油！", "这是你努力的结果！", "真了不起，想和谁分享这个好消息？"]
        }
        self.emotion_history: Dict[str, List[EmotionRecord]] = {}

    def _detect_negation(self, text: str, keyword: str) -> bool:
        idx = text.lower().find(keyword)
        if idx < 0:
            return False
        before = text[max(0, idx - 5):idx]
        for neg in self.negation_words:
            if neg in before:
                return True
        return False

    def analyze_emotion(self, text: str, user_id: str) -> Dict:
        text_lower = text.lower()
        detected_emotion = "neutral"
        max_matches = 0
        negated_emotions = set()
        emotion_invert = {"happy": "sad", "sad": "happy", "angry": "scared", "scared": "angry"}

        for emotion, keywords in self.emotion_keywords.items():
            matches = 0
            for kw in keywords:
                if kw in text_lower:
                    if self._detect_negation(text_lower, kw):
                        negated_emotions.add(emotion)
                    else:
                        matches += 1
            if matches > max_matches:
                max_matches = matches
                detected_emotion = emotion

        if max_matches == 0 and negated_emotions:
            for neg_em in negated_emotions:
                inverted = emotion_invert.get(neg_em)
                if inverted:
                    detected_emotion = inverted
                    max_matches = 1
                    break

        intensity = min(max_matches * 0.3, 1.0) if max_matches > 0 else 0.2

        if user_id not in self.emotion_history:
            self.emotion_history[user_id] = []

        emotion_msg = self._get_emotion_message(detected_emotion)
        record = EmotionRecord(
            emotion_type=detected_emotion, intensity=intensity,
            trigger=text[:100], timestamp=datetime.now().isoformat(), message=emotion_msg
        )
        self.emotion_history[user_id].append(record)

        return {
            "emotion": detected_emotion, "intensity": intensity,
            "message": emotion_msg,
            "suggestions": self._get_emotion_suggestions(detected_emotion)
        }

    def _get_emotion_message(self, emotion: str) -> str:
        import random
        responses = self.emotion_responses.get(emotion, ["我理解你的感受。"])
        return random.choice(responses)

    def _get_emotion_suggestions(self, emotion: str) -> List[str]:
        suggestions = {
            "happy": ["分享你的快乐", "讲个故事", "玩游戏"],
            "sad": ["告诉我发生了什么", "给你一个拥抱", "听个故事"],
            "angry": ["深呼吸练习", "说出来", "听舒缓音乐"],
            "scared": ["我保护你", "告诉我怕什么", "讲个勇敢的故事"],
            "lonely": ["我陪着你", "玩游戏", "讲故事"],
            "tired": ["休息一下", "听轻音乐", "听睡前故事"]
        }
        return suggestions.get(emotion, ["我们聊聊吧"])

    def provide_companion(self, user_id: str, emotion_type: str, message: str) -> Dict:
        response = self._get_emotion_message(emotion_type)
        record = EmotionRecord(
            emotion_type=emotion_type, intensity=0.5,
            trigger=message[:100], timestamp=datetime.now().isoformat(), message=response
        )
        if user_id not in self.emotion_history:
            self.emotion_history[user_id] = []
        self.emotion_history[user_id].append(record)

        return {
            "response": response, "companion_type": emotion_type,
            "actions": {
                "chat": self._generate_chat_topics(emotion_type),
                "activity": self._generate_companion_activities(emotion_type),
                "story": self._generate_recommended_stories(emotion_type)
            },
            "mood_score": self._calculate_mood_score(user_id)
        }

    def _generate_chat_topics(self, emotion: str) -> List[str]:
        topics = {
            "happy": ["你今天为什么这么开心呀？告诉我吧！", "开心的时光要记住哦，我们来分享快乐！", "快乐的心情最棒啦，我们一起庆祝！"],
            "sad": ["你想聊聊让你难过的事情吗？", "我听说笑一笑可以赶走难过，你要试试吗？", "要不要我给你讲个笑话？"],
            "angry": ["深呼吸，我们一起冷静下来。", "有时候说出来会好受一些，你想聊聊吗？", "愤怒说明你在乎某些事情，这是正常的。"],
            "scared": ["别害怕，我会保护你的。", "你害怕的东西其实没那么可怕。", "跟我说说你害怕什么，我们一起想办法。"],
            "lonely": ["你永远不是一个人，我在这里！", "想不想一起玩游戏或者听故事？", "做一些有趣的事情可以赶走寂寞哦。"],
            "tired": ["累了就休息一下，我给你讲个温馨的故事。", "睡眠是最好的休息，我们一起放松。", "要不要听听舒缓的音乐，帮你放松心情？"],
            "anxious": ["放松技巧", "呼吸练习", "正念冥想", "勇气故事", "化解担忧"],
            "proud": ["成就回顾", "未来目标", "分享喜悦", "新挑战计划", "感恩练习"]
        }
        return topics.get(emotion, ["我们聊聊吧？", "今天过得怎么样？"])

    def _generate_companion_activities(self, emotion: str) -> List[str]:
        return {
            "sad": ["听开心的音乐", "做深呼吸练习", "画一幅画"],
            "angry": ["数到10", "去跑步", "捏橡皮泥"],
            "scared": ["抱着喜欢的玩具", "开小夜灯", "听睡前故事"],
            "lonely": ["和其他小朋友玩", "做手工", "和家人聊天"],
            "anxious": ["深呼吸", "听舒缓音乐", "画画释放", "数数游戏", "抱抱玩偶"],
            "proud": ["庆祝活动", "记录成就", "分享故事", "设定新目标", "感恩日记"]
        }.get(emotion, ["画画", "听音乐", "做游戏"])

    def _generate_recommended_stories(self, emotion: str) -> List[Dict]:
        return {
            "sad": [{"title": "快乐王子", "theme": "帮助别人带来快乐"}, {"title": "卖火柴的小女孩", "theme": "温暖和希望"}],
            "angry": [{"title": "小火山不生气了", "theme": "学会控制情绪"}, {"title": "生气的小兔子", "theme": "用沟通代替生气"}],
            "scared": [{"title": "勇敢的小士兵", "theme": "勇气和自信"}, {"title": "黑暗中的小灯笼", "theme": "克服恐惧"}],
            "lonely": [{"title": "交到新朋友的小熊", "theme": "友谊的力量"}, {"title": "神奇的友谊魔法", "theme": "友谊的温暖"}],
            "anxious": [{"title": "勇敢的小兔", "theme": "克服焦虑"}, {"title": "不怕考试的小熊", "theme": "考试不紧张"}, {"title": "夜晚不害怕", "theme": "克服恐惧"}],
            "proud": [{"title": "骄傲的小公鸡", "theme": "自信的力量"}, {"title": "我是冠军", "theme": "努力成就梦想"}, {"title": "坚持的力量", "theme": "坚持不懈"}]
        }.get(emotion, [{"title": "小星星的故事", "theme": "梦想和希望"}])

    def _calculate_mood_score(self, user_id: str) -> float:
        records = self.emotion_history.get(user_id, [])
        if not records:
            return 7.5
        recent = records[-10:]
        weights = {"happy": 1.0, "neutral": 0.7, "tired": 0.6, "lonely": 0.5, "sad": 0.4, "scared": 0.3, "angry": 0.2}
        total = sum(weights.get(r.emotion_type, 0.5) * 10 for r in recent)
        return round(total / len(recent), 1)

    def get_emotion_trends(self, user_id: str, days: int = 7) -> Dict:
        records = self.emotion_history.get(user_id, [])
        recent = records[-days * 10:] if records else []
        counts = {}
        for r in recent:
            counts[r.emotion_type] = counts.get(r.emotion_type, 0) + 1
        return {
            "total_records": len(recent), "emotion_distribution": counts,
            "average_mood": self._calculate_mood_score(user_id),
            "most_common": max(counts, key=counts.get) if counts else "neutral"
        }

    def get_emotion_detail(self, user_id: str, limit: int = 20) -> List[Dict]:
        records = self.emotion_history.get(user_id, [])
        return [
            {"emotion_type": r.emotion_type, "intensity": r.intensity,
             "trigger": r.trigger[:60], "timestamp": r.timestamp, "message": r.message}
            for r in records[-limit:]
        ]

    def load_history(self, data: Dict):
        for uid, records in data.items():
            self.emotion_history[uid] = [
                EmotionRecord(**r) if isinstance(r, dict) else r
                for r in records
            ]

    def export_history(self) -> Dict:
        result = {}
        for uid, records in self.emotion_history.items():
            result[uid] = [
                {"emotion_type": r.emotion_type, "intensity": r.intensity,
                 "trigger": r.trigger, "timestamp": r.timestamp, "message": r.message}
                for r in records
            ]
        return result

emotional_system = EmotionalCompanionSystem()
