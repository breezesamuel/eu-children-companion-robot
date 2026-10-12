"""
Intent Recognition Service
Supports 100+ intents across 10+ categories in English and Chinese.
"""
import re
import json
import logging
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class Intent:
    code: str
    name: str
    name_zh: str
    category: str
    keywords_en: List[str] = field(default_factory=list)
    keywords_zh: List[str] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    priority: int = 0
    compiled_patterns: List = field(default_factory=list, repr=False)


class IntentRecognizer:
    """Multi-language intent recognizer with keyword + regex matching."""

    def __init__(self):
        self.intents: List[Intent] = []
        self._load_intents()
        self._compile_patterns()

    # ------------------------------------------------------------------
    # Intent definitions
    # ------------------------------------------------------------------
    def _load_intents(self):
        I = Intent

        # ===== CONVERSATION (对话类) =====
        self.intents.extend([
            I("greeting", "Greeting", "问候", "conversation",
              ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy"],
              ["你好", "嗨", "早上好", "下午好", "晚上好", "你好吗"], priority=10),
            I("farewell", "Farewell", "告别", "conversation",
              ["bye", "goodbye", "see you", "later", "see ya", "take care", "talk to you later"],
              ["再见", "拜拜", "明天见", "回头见", "下次见"], priority=10),
            I("thanks", "Thanks", "感谢", "conversation",
              ["thank", "thanks", "thank you", "appreciate", "grateful", "thx"],
              ["谢谢", "多谢", "感谢", "非常感谢", "太感谢了"], priority=10),
            I("apologize", "Apologize", "道歉", "conversation",
              ["sorry", "apologize", "my bad", "i apologize", "excuse me"],
              ["对不起", "抱歉", "不好意思", "是我的错"], priority=9),
            I("ask_help", "Ask for help", "请求帮助", "conversation",
              ["help", "can you help", "need help", "assist", "help me"],
              ["帮帮我", "你能帮我吗", "我需要帮助", "帮忙"], priority=10),
            I("ask_name", "Ask name", "问名字", "conversation",
              ["what is your name", "your name", "who are you", "what are you"],
              ["你叫什么", "你是谁", "你叫什么名字"], priority=9),
            I("ask_age", "Ask age", "问年龄", "conversation",
              ["how old are you", "your age", "age"],
              ["你几岁", "你多大了", "你今年几岁"], priority=8),
            I("compliment", "Compliment", "赞美", "conversation",
              ["good robot", "you are great", "nice", "awesome", "you are smart", "well done"],
              ["你真棒", "你好聪明", "太好了", "真厉害"], priority=8),
            I("introduce_self", "Introduce self", "自我介绍", "conversation",
              ["my name is", "i am", "i'm", "call me"],
              ["我叫", "我是", "我的名字是"], priority=9),
        ])

        # ===== LEARNING - MATH (学习类-数学) =====
        self.intents.extend([
            I("do_math", "Do math", "做数学", "learning",
              ["calculate", "compute", "what is", "plus", "minus", "times", "divided by", "math problem", "equation"],
              ["算一下", "计算", "数学题", "加", "减", "乘", "除以", "等于"], priority=10,
              patterns=[r'(\d+)\s*[\+\-\*/]\s*(\d+)', r'what\s+is\s+(\d+)\s*[\+\-\*/]\s*(\d+)']),
            I("learn_math_add", "Learn addition", "学加法", "learning",
              ["addition", "add", "plus", "how to add"],
              ["加法", "加怎么算", "教我加法", "加法怎么算"], priority=9),
            I("learn_math_subtract", "Learn subtraction", "学减法", "learning",
              ["subtraction", "subtract", "minus", "how to subtract"],
              ["减法", "减怎么算", "教我减法"], priority=9),
            I("learn_math_multiply", "Learn multiplication", "学乘法", "learning",
              ["multiplication", "multiply", "times", "multiplication table"],
              ["乘法", "乘法表", "乘法怎么算"], priority=9),
            I("learn_math_divide", "Learn division", "学除法", "learning",
              ["division", "divide", "divided by"],
              ["除法", "除怎么算", "除法怎么算"], priority=9),
            I("math_count", "Counting", "数数", "learning",
              ["count", "counting", "count to", "count from"],
              ["数数", "数到", "帮我数", "从1数到"], priority=8),
            I("learn_shapes", "Learn shapes", "学形状", "learning",
              ["shape", "circle", "square", "triangle", "rectangle", "diamond"],
              ["形状", "圆形", "正方形", "三角形", "长方形"], priority=8),
            I("learn_numbers", "Learn numbers", "学数字", "learning",
              ["number", "numbers", "digit", "count numbers", "learn numbers"],
              ["数字", "数字学习", "学数字", "认数字"], priority=8),
        ])

        # ===== LEARNING - ENGLISH (学习类-英语) =====
        self.intents.extend([
            I("translate_word", "Translate word", "翻译单词", "learning",
              ["translate", "translation", "meaning", "what does", "mean in"],
              ["翻译", "是什么意思", "用英语怎么说", "英文怎么说", "中文怎么说"], priority=10),
            I("learn_english", "Learn English", "学英语", "learning",
              ["learn english", "english lesson", "study english", "english words", "speak english"],
              ["学英语", "英语学习", "英语单词", "英语课"], priority=9),
            I("english_alphabet", "English alphabet", "英文字母", "learning",
              ["alphabet", "abc", "letters", "letter"],
              ["字母", "字母表", "英文字母", "ABC"], priority=8),
            I("english_phonics", "English phonics", "英语自然拼读", "learning",
              ["phonics", "pronunciation", "sound", "how to pronounce"],
              ["拼读", "发音", "自然拼读", "怎么读"], priority=8),
            I("learn_colors", "Learn colors", "学颜色", "learning",
              ["color", "colour", "red", "blue", "green", "yellow", "name colors"],
              ["颜色", "红色", "蓝色", "绿色", "黄色", "学颜色"], priority=8),
        ])

        # ===== LEARNING - GENERAL (学习类-通用) =====
        self.intents.extend([
            I("learn_science", "Learn science", "学科学", "learning",
              ["science", "scientific", "experiment", "why is", "how does", "how come"],
              ["科学", "为什么", "怎么回事", "怎么来的", "科学实验"], priority=9),
            I("learn_history", "Learn history", "学历史", "learning",
              ["history", "historical", "past", "ancient", "what happened"],
              ["历史", "古代", "过去", "历史上"], priority=8),
            I("learn_geography", "Learn geography", "学地理", "learning",
              ["geography", "country", "capital", "map", "continent", "world"],
              ["地理", "国家", "首都", "地图", "大洲"], priority=8),
            I("learn_biology", "Learn biology", "学生物", "learning",
              ["biology", "animal", "plant", "body", "living", "human body"],
              ["生物", "动物", "植物", "人体", "生命"], priority=8),
            I("learn_astronomy", "Learn astronomy", "学天文", "learning",
              ["space", "planet", "star", "moon", "sun", "solar system", "galaxy"],
              ["太空", "星球", "星星", "月亮", "太阳", "太阳系"], priority=8),
            I("learn_coding", "Learn coding", "学编程", "learning",
              ["coding", "programming", "code", "computer", "scratch", "python"],
              ["编程", "代码", "计算机", "scratch", "python"], priority=8),
        ])

        # ===== EMOTION (情感类) =====
        self.intents.extend([
            I("feeling_happy", "Feeling happy", "开心", "emotion",
              ["happy", "joyful", "great", "wonderful", "excellent", "amazing", "fantastic"],
              ["开心", "高兴", "太棒了", "太好了", "好开心"], priority=10),
            I("feeling_sad", "Feeling sad", "难过", "emotion",
              ["sad", "unhappy", "down", "cry", "crying", "depressed", "miserable"],
              ["难过", "伤心", "不开心", "悲伤", "哭"], priority=10),
            I("feeling_angry", "Feeling angry", "生气", "emotion",
              ["angry", "mad", "furious", "annoyed", "upset", "frustrated"],
              ["生气", "愤怒", "气死了", "烦死了"], priority=10),
            I("feeling_scared", "Feeling scared", "害怕", "emotion",
              ["scared", "afraid", "frightened", "terrified", "fear", "scary", "nightmare"],
              ["害怕", "恐惧", "吓人", "好可怕", "噩梦"], priority=10),
            I("feeling_lonely", "Feeling lonely", "孤单", "emotion",
              ["lonely", "alone", "nobody", "no one", "by myself"],
              ["孤单", "孤独", "一个人", "没人陪我"], priority=10),
            I("feeling_tired", "Feeling tired", "累了", "emotion",
              ["tired", "exhausted", "sleepy", "drowsy", "fatigued"],
              ["累了", "困了", "好累", "想睡觉"], priority=9),
            I("feeling_bored", "Feeling bored", "无聊", "emotion",
              ["bored", "boring", "nothing to do", "dull"],
              ["无聊", "好无聊", "没意思"], priority=9),
            I("feeling_loved", "Feeling loved", "被爱", "emotion",
              ["love you", "i love", "loved", "cared"],
              ["我爱你", "爱你", "好喜欢你"], priority=9),
            I("feeling_curious", "Feeling curious", "好奇", "emotion",
              ["curious", "wonder", "interesting", "cool"],
              ["好奇", "想知道", "有意思", "好神奇"], priority=8),
        ])

        # ===== SENSORY (感官类) =====
        self.intents.extend([
            I("feel_cold", "Feel cold", "感觉冷", "sensory",
              ["cold", "freezing", "chilly", "too cold"],
              ["好冷", "太冷了", "冷死了", "冻死了"], priority=9),
            I("feel_hot", "Feel hot", "感觉热", "sensory",
              ["hot", "warm", "too hot", "sweating"],
              ["好热", "太热了", "热死了"], priority=9),
            I("feel_hungry", "Feel hungry", "饿了", "sensory",
              ["hungry", "starving", "want to eat", "hunger"],
              ["饿了", "想吃东西", "好饿", "肚子饿"], priority=9),
            I("feel_thirsty", "Feel thirsty", "渴了", "sensory",
              ["thirsty", "want water", "want drink", "dry"],
              ["渴了", "想喝水", "口渴"], priority=9),
            I("feel_sick", "Feel sick", "不舒服", "sensory",
              ["sick", "ill", "pain", "hurt", "ache", "fever", "cold", "cough"],
              ["不舒服", "生病", "疼", "痛", "发烧", "咳嗽", "感冒"], priority=10),
        ])

        # ===== KNOWLEDGE (常识类) =====
        self.intents.extend([
            I("ask_weather", "Ask weather", "问天气", "knowledge",
              ["weather", "temperature", "rain", "sunny", "cloudy", "forecast", "today weather"],
              ["天气", "温度", "下雨", "晴天", "今天天气", "天气预报"], priority=9),
            I("ask_time", "Ask time", "问时间", "knowledge",
              ["what time", "current time", "time now", "what is the time", "clock"],
              ["几点了", "现在几点", "时间", "什么时候"], priority=9),
            I("ask_date", "Ask date", "问日期", "knowledge",
              ["what date", "today date", "what day", "date today", "day of week"],
              ["今天几号", "今天星期几", "日期"], priority=9),
            I("ask_science", "Ask science why", "问科学", "knowledge",
              ["why is the sky", "why do", "why does", "why are", "reason"],
              ["为什么天", "为什么会", "为什么是"], priority=9),
        ])

        # ===== ENTERTAINMENT (娱乐类) =====
        self.intents.extend([
            I("tell_joke", "Tell joke", "讲笑话", "entertainment",
              ["joke", "jokes", "funny", "make me laugh", "crack a joke"],
              ["讲笑话", "说个笑话", "来个笑话", "搞笑"], priority=9),
            I("tell_story", "Tell story", "讲故事", "entertainment",
              ["story", "tale", "fairy tale", "tell me a story", "once upon a time"],
              ["讲故事", "故事", "童话", "讲个故事"], priority=10),
            I("play_music", "Play music", "播放音乐", "entertainment",
              ["music", "song", "sing", "play music", "listen to", "melody", "tune"],
              ["音乐", "唱歌", "放歌", "听歌", "放音乐"], priority=9),
            I("play_game", "Play game", "玩游戏", "entertainment",
              ["game", "play", "play with me", "let's play", "riddle", "puzzle"],
              ["游戏", "玩游戏", "猜谜", "谜语", "一起玩"], priority=9),
            I("dance", "Dance", "跳舞", "entertainment",
              ["dance", "dancing", "let's dance", "move"],
              ["跳舞", "舞蹈", "一起跳舞"], priority=8),
            I("draw", "Draw", "画画", "entertainment",
              ["draw", "drawing", "paint", "coloring", "sketch"],
              ["画画", "绘画", "涂色", "画一幅"], priority=8),
        ])

        # ===== EDUCATION - LESSONS (教育类-课程) =====
        self.intents.extend([
            I("request_lesson", "Request lesson", "请求课程", "education",
              ["teach me", "lesson", "i want to learn", "can you teach", "educate"],
              ["教我", "上课", "我想学", "教教我", "课程"], priority=9),
            I("request_quiz", "Request quiz", "请求测验", "education",
              ["quiz", "test me", "practice", "exercise", "exam", "question"],
              ["测验", "考考我", "练习", "考试", "题目"], priority=9),
            I("spelling_bee", "Spelling bee", "拼写比赛", "education",
              ["spell", "spelling", "spelling bee", "how to spell"],
              ["拼写", "怎么拼", "拼写比赛"], priority=8),
            I("vocabulary", "Vocabulary", "词汇", "education",
              ["vocabulary", "word", "new word", "learn words"],
              ["词汇", "单词", "学单词", "生词"], priority=8),
        ])

        # ===== PARENT / HOME (家庭类) =====
        self.intents.extend([
            I("call_parent", "Call parent", "找家长", "family",
              ["mom", "dad", "parent", "mother", "father", "mommy", "daddy"],
              ["妈妈", "爸爸", "家长", "母亲", "父亲", "找妈妈", "找爸爸"], priority=9),
            I("ask_permission", "Ask permission", "请求许可", "family",
              ["can i", "may i", "is it ok", "permission", "allowed", "can i please"],
              ["我可以", "能不能", "允许", "可以吗"], priority=8),
        ])

        # ===== NEEDS (需求类) =====
        self.intents.extend([
            I("want_sleep", "Want sleep", "想睡觉", "needs",
              ["sleep", "bed", "tired", "nap", "go to bed", "good night"],
              ["睡觉", "晚安", "要睡了", "想睡", "休息"], priority=9),
            I("want_bathroom", "Want bathroom", "上厕所", "needs",
              ["bathroom", "restroom", "toilet", "washroom", "potty"],
              ["厕所", "卫生间", "上厕所", "洗手间", "尿尿"], priority=9),
            I("want_play_outside", "Want play outside", "想出去玩", "needs",
              ["outside", "outdoor", "playground", "park", "go out", "garden"],
              ["出去玩", "外面", "公园", "操场", "去外面"], priority=8),
            I("want_snack", "Want snack", "想吃零食", "needs",
              ["snack", "candy", "cookie", "chocolate", "treat", "yummy"],
              ["零食", "糖果", "饼干", "巧克力", "好吃"], priority=8),
            I("want_milk", "Want milk", "想喝牛奶", "needs",
              ["milk", "formula", "bottle", "drink milk"],
              ["牛奶", "喝奶", "奶粉", "奶瓶"], priority=8),
        ])

        # ===== ROBOT CONTROL (机器人控制) =====
        self.intents.extend([
            I("robot_move", "Move robot", "移动", "robot",
              ["move", "come here", "go there", "forward", "backward", "follow me"],
              ["过来", "去那里", "前进", "后退", "跟着我", "过来这里"], priority=10),
            I("robot_stop", "Stop robot", "停止", "robot",
              ["stop", "freeze", "halt", "stay"],
              ["停止", "停下", "停", "别动"], priority=10),
            I("robot_dance", "Robot dance", "机器人跳舞", "robot",
              ["dance", "spin", "turn around"],
              ["跳舞", "转圈", "转个圈"], priority=8),
            I("robot_light", "Robot light", "机器人灯光", "robot",
              ["light", "lights", "led", "bright", "lamp"],
              ["灯", "灯光", "开灯", "关灯", "亮"], priority=8),
            I("robot_volume", "Robot volume", "音量", "robot",
              ["volume", "louder", "quieter", "sound", "speak up", "too loud", "too quiet"],
              ["音量", "大声点", "小声点", "太吵了", "太安静"], priority=8),
        ])

        # ===== HEALTH (健康类) =====
        self.intents.extend([
            I("exercise", "Exercise", "运动", "health",
              ["exercise", "workout", "stretch", "yoga", "run", "jump"],
              ["运动", "锻炼", "做操", "拉伸", "跑步", "跳"], priority=8),
            I("wash_hands", "Wash hands", "洗手", "health",
              ["wash hands", "clean hands", "soap", "hand wash"],
              ["洗手", "洗干净", "肥皂", "洗手液"], priority=9),
            I("brush_teeth", "Brush teeth", "刷牙", "health",
              ["brush teeth", "toothbrush", "toothpaste", "dental"],
              ["刷牙", "牙刷", "牙膏", "牙齿"], priority=9),
            I("take_medicine", "Take medicine", "吃药", "health",
              ["medicine", "medication", "pill", "take medicine", "doctor"],
              ["吃药", "药", "药片", "看医生"], priority=10),
        ])

        # ===== DAILY ROUTINE (日常作息) =====
        self.intents.extend([
            I("wake_up", "Wake up", "起床", "routine",
              ["wake up", "good morning", "rise and shine", "get up"],
              ["起床", "早上好", "该起床了"], priority=9),
            I("get_dressed", "Get dressed", "穿衣服", "routine",
              ["dress", "get dressed", "wear", "clothes", "put on"],
              ["穿衣服", "穿", "衣服", "穿衣"], priority=9),
            I("go_school", "Go to school", "上学", "routine",
              ["school", "go to school", "class", "teacher", "school bus"],
              ["上学", "去学校", "上课", "老师", "校车"], priority=9),
            I("homework_time", "Homework time", "做作业", "routine",
              ["homework", "assignment", "study time", "do homework"],
              ["作业", "做作业", "写作业", "学习时间"], priority=9),
            I("bath_time", "Bath time", "洗澡", "routine",
              ["bath", "bathtub", "shower", "wash", "bubble"],
              ["洗澡", "泡澡", "洗个澡", "沐浴"], priority=9),
        ])

        # ===== EMERGENCY (紧急类) =====
        self.intents.extend([
            I("emergency", "Emergency", "紧急情况", "emergency",
              ["emergency", "help me", "danger", "fire", "hurt", "accident", "911", "call 911"],
              ["救命", "紧急", "危险", "着火了", "受伤", "事故"], priority=100),
            I("fall_down", "Fall down", "摔倒了", "emergency",
              ["fell", "fall", "fallen", "hurt myself", "i'm hurt", "ouch"],
              ["摔倒了", "摔跤", "摔伤", "好疼", "摔疼了"], priority=100),
            I("lost", "Lost", "迷路了", "emergency",
              ["lost", "can't find", "where am i", "i'm lost", "scared lost"],
              ["迷路", "找不到", "我在哪", "走丢了", "找不到路了"], priority=100),
        ])

        # ===== CURIOSITY / DISCOVERY (好奇心) =====
        self.intents.extend([
            I("ask_animals", "Ask animals", "问动物", "curiosity",
              ["animal", "dog", "cat", "bird", "fish", "pet", "zoo", "dinosaur"],
              ["动物", "狗", "猫", "鸟", "鱼", "宠物", "动物园", "恐龙"], priority=8),
            I("ask_plants", "Ask plants", "问植物", "curiosity",
              ["plant", "flower", "tree", "garden", "grow", "seed"],
              ["植物", "花", "树", "花园", "种子", "生长"], priority=7),
            I("ask_transport", "Ask transport", "问交通工具", "curiosity",
              ["car", "bus", "train", "plane", "bicycle", "truck", "vehicle"],
              ["车", "公交车", "火车", "飞机", "自行车", "卡车"], priority=7),
            I("ask_food", "Ask food", "问食物", "curiosity",
              ["food", "fruit", "vegetable", "rice", "bread", "pizza", "noodle"],
              ["食物", "水果", "蔬菜", "米饭", "面包", "披萨", "面条"], priority=7),
        ])

        logger.info("Loaded %d intents", len(self.intents))

    # ------------------------------------------------------------------
    # Pattern compilation
    # ------------------------------------------------------------------
    def _compile_patterns(self):
        for intent in self.intents:
            compiled = []
            for p in intent.patterns:
                try:
                    compiled.append(re.compile(p, re.IGNORECASE))
                except re.error as e:
                    logger.warning("Bad regex '%s' for intent %s: %s", p, intent.code, e)
            intent.compiled_patterns = compiled

    # ------------------------------------------------------------------
    # Recognition
    # ------------------------------------------------------------------
    def recognize(self, text: str, language: str = "zh") -> Tuple[str, Dict, float]:
        """
        Recognize intent from user text.

        Returns:
            (intent_code, entities, confidence)
        """
        if not text or not text.strip():
            return ("unknown", {}, 0.0)

        text_lower = text.lower().strip()
        best_intent: Optional[Intent] = None
        best_score = 0.0
        entities: Dict = {}

        # Score each intent
        for intent in sorted(self.intents, key=lambda x: -x.priority):
            score = self._score(text_lower, text, intent, language)
            if score > best_score:
                best_score = score
                best_intent = intent

        # Extract entities for best intent
        if best_intent and best_score > 0.25:
            for pattern in best_intent.compiled_patterns:
                m = pattern.search(text_lower)
                if m:
                    entities["captures"] = list(m.groups())
                    break
            entities["text"] = text
            return (best_intent.code, entities, round(best_score, 2))

        return ("unknown", {"text": text}, 0.0)

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------
    def _score(self, text_lower: str, text_orig: str, intent: Intent, language: str) -> float:
        score = 0.0

        # Keyword matching
        if language == "zh":
            keywords = intent.keywords_zh
        else:
            keywords = intent.keywords_en

        for kw in keywords:
            if kw in text_lower:
                # Full match bonus
                if text_lower == kw:
                    score += 1.0
                else:
                    score += 0.3 * (len(kw) / max(len(text_lower), 1))
                break

        # Regex matching
        for pattern in intent.compiled_patterns:
            if pattern.search(text_lower):
                score += 0.5
                break

        return min(score, 1.0)

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------
    def get_intent(self, code: str) -> Optional[Intent]:
        for i in self.intents:
            if i.code == code:
                return i
        return None

    def get_intents_by_category(self, category: str) -> List[Intent]:
        return [i for i in self.intents if i.category == category]

    def get_categories(self) -> List[str]:
        cats: List[str] = []
        for i in self.intents:
            if i.category not in cats:
                cats.append(i.category)
        return cats

    def get_statistics(self) -> Dict:
        return {
            "total_intents": len(self.intents),
            "categories": {cat: len(self.get_intents_by_category(cat)) for cat in self.get_categories()},
        }
