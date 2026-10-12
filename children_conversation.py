#!/usr/bin/env python3
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import logging
import re

logger = logging.getLogger("conversation")

LANG_WORDS = {
    "zh-CN": ["的", "了", "是", "我", "不", "人", "在", "他", "有", "这", "它", "你", "好", "们", "来", "去", "说", "看", "想", "能", "要", "会", "对", "很", "做", "学", "到", "和", "就", "也"],
    "de-DE": ["der", "die", "das", "ich", "du", "er", "sie", "es", "wir", "ihr", "Sie", "und", "oder", "aber", "mit", "auf", "für", "nicht", "kein", "ja", "nein", "hallo", "tschüss", "danke", "bitte", "ist", "hat", "wird", "kann", "muss"],
    "nl-NL": ["ik", "jij", "hij", "zij", "het", "wij", "jullie", "zij", "de", "het", "een", "en", "of", "maar", "met", "op", "voor", "niet", "geen", "ja", "nee", "hallo", "dag", "dank", "alsjeblieft", "is", "heeft", "wordt", "kan", "moet"],
    "fr-FR": ["je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "le", "la", "les", "un", "une", "des", "et", "ou", "mais", "avec", "sur", "pour", "pas", "très", "est", "sont", "dans", "fait", "faire", "peux", "veux", "bonjour", "merci", "au revoir", "salut"],
    "es-ES": ["el", "la", "los", "las", "un", "una", "y", "o", "pero", "porque", "con", "sin", "en", "por", "para", "de", "del", "no", "sí", "muy", "más", "es", "son", "está", "están", "tiene", "tienen", "puede", "quiere", "hola", "adiós", "gracias", "bueno", "buena", "bonito", "bonita", "grande", "pequeño", "yo", "tú", "él", "ella", "nosotros", "ellos", "ellas", "mi", "tu", "su", "qué", "cómo", "dónde", "por", "qué", "cuándo"],
    "it-IT": ["il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "e", "o", "ma", "con", "senza", "in", "per", "su", "di", "del", "non", "sì", "molto", "è", "sono", "ha", "hanno", "può", "vuole", "ciao", "arrivederci", "grazie", "buono", "buona", "bello", "bella", "grande", "piccolo", "io", "tu", "lui", "lei", "noi", "voi", "loro", "mio", "tuo", "suo", "che", "cosa", "come", "dove", "perché", "quando"],
}
LANG_PATTERNS = {
    "zh-CN": re.compile(r"[\u4e00-\u9fff]+"),
    "en-US": re.compile(r"\b(hello|hi|hey|how|are|you|what|is|the|and|to|of|in|for|it|that|was|with|this|have|from|they|his|her|can|will|would|about|there|their|your|good|morning|evening|please|thank|thanks|bye|yes|no|story|music|game|play|song|happy|sad|angry|scared|tired|homework|learning|study|school|friend|love|like|want|need|help|tell|hear|listen|read|write|draw|sing|dance|run|jump|sleep|eat|drink|make|see|know|think|feel|come|go|get|say|let)\b", re.IGNORECASE),
    "fr-FR": re.compile(r"\b(je|tu|il|elle|nous|vous|ils|elles|le|la|les|un|une|des|et|ou|mais|avec|sur|pour|pas|bonjour|merci|au|revoir|salut|est|sont|dans|très|fait|faire|peux|veux|mon|ton|son|ma|ta|sa|mes|tes|ses|notre|votre|leur|ce|cet|cette|ces|qui|que|quoi|où|comment|pourquoi|parce|car|donc|ni|or)\b", re.IGNORECASE),
    "de-DE": re.compile(r"\b(der|die|das|ich|du|er|sie|es|wir|ihr|Sie|und|oder|aber|mit|auf|für|nicht|kein|ja|nein|hallo|tschüss|danke|bitte|ist|hat|wird|kann|muss|sind|habe|hast|haben|seid|einen|eine|einer|einem|eines|dem|den|des|zum|zur|beim|vom|nach|aus|bei|durch|gegen|um|ohne|geht|macht|sagt|will)\b", re.IGNORECASE),
    "nl-NL": re.compile(r"\b(ik|jij|hij|zij|het|wij|jullie|zij|de|het|een|en|of|maar|met|op|voor|niet|geen|ja|nee|hallo|dag|dank|alsjeblieft|is|heeft|wordt|kan|moet|zijn|heb|hebt|hebben|bent|ben|zijn|deze|die|dat|dit|wat|hoe|waarom|omdat|dus|naar|uit|bij|door|tegen|zonder|gaat|maakt|zegt|wil)\b", re.IGNORECASE),
    "es-ES": re.compile(r"\b(el|la|los|las|un|una|unos|unas|y|o|pero|porque|con|sin|en|por|para|de|del|no|sí|muy|más|es|son|está|están|tiene|tienen|puede|quiere|hola|adiós|gracias|bueno|buena|bonito|bonita|grande|pequeño|yo|tú|él|ella|nosotros|ellos|ellas|mi|tu|su|qué|cómo|dónde|por|qué|cuándo|niño|niña|casa|perro|gato|comer|beber|dormir|jugar|correr|leer|escribir|feliz|triste|enojado|asustado|cansado|bien|mal|amo|gusta|necesito|ayuda|quiero|tengo|hago|digo|voy|vengo|sé|puedo|debo|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella)\b", re.IGNORECASE),
    "it-IT": re.compile(r"\b(il|lo|la|i|gli|le|un|uno|una|e|o|ma|con|senza|in|per|su|di|del|non|sì|molto|è|sono|ha|hanno|può|vuole|ciao|arrivederci|grazie|buono|buona|bello|bella|grande|piccolo|io|tu|lui|lei|noi|voi|loro|mio|tuo|suo|che|cosa|come|dove|perché|quando|bambino|bambina|casa|cane|gatto|mangiare|bere|dormire|giocare|correre|leggere|scrivere|felice|triste|arrabbiato|spaventato|stanco|bene|male|amo|piace|aiuto|voglio|ho|faccio|dico|vado|vengo|so|posso|devo|questo|questa|questi|queste|quello|quella|quegli|quelle)\b", re.IGNORECASE),
}

SENSITIVE_PATTERNS = [
    re.compile(r"(地址|住址|电话|手机|身份证|密码|银行卡|信用卡|家庭住址|学校地址|父母电话|父母手机|ssn|password|credit.?card)", re.IGNORECASE),
    re.compile(r"\d{6,}", re.IGNORECASE),
]

@dataclass
class ConversationMessage:
    role: str
    content: str
    timestamp: str

@dataclass
class ConversationSession:
    session_id: str
    user_id: str
    language: str
    mode: str
    messages: List[ConversationMessage] = field(default_factory=list)

class SmartConversationSystem:
    def __init__(self):
        self.intent_keywords = {
            "greeting": ["你好", "嗨", "哈喽", "hello", "hi", "hey", "早上好", "晚上好", "下午好", "你好吗", "how are you", "good morning", "good evening"],
            "learning": ["学", "学习", "上课", "lesson", "study", "learn", "course", "class", "作业", "homework", "assignment"],
            "homework": ["作业", "题目", "问题", "不会", "怎么做", "homework", "problem", "question", "help me"],
            "story": ["故事", "听故事", "童话", "寓言", "story", "fairy tale", "tell me a story", "read"],
            "music": ["音乐", "唱歌", "歌曲", "听歌", "music", "song", "sing", "play"],
            "game": ["游戏", "玩", "猜", "game", "play", "guess", "riddle"],
            "emotion": ["开心", "难过", "伤心", "生气", "害怕", "孤独", "累", "高兴", "快乐", "sad", "happy", "angry", "scared", "lonely", "tired"],
            "encourage": ["加油", "鼓励", "坚持", "努力", "come on", "keep going", "encourage", "try"],
            "goodbye": ["再见", "拜拜", "bye", "goodbye", "see you", "明天见", "下次见"],
            "science": ["科学", "实验", "自然", "植物", "动物", "天气", "星球", "科学实验", "science", "experiment", "nature", "animal", "plant"],
            "art": ["画画", "绘画", "涂色", "手工", "折纸", "画画", "画", "color", "draw", "paint", "art", "craft", "origami"],
            "sport": ["运动", "跑步", "跳绳", "游泳", "打球", "跳舞", "锻炼", "sport", "run", "jump", "swim", "dance", "exercise"],
            "curiosity": ["为什么", "怎么", "什么是", "什么", "为什么", "怎么", "怎么回事", "why", "what", "how", "curious", "wonder"],
            "praise": ["真棒", "好厉害", "太好了", "聪明", "乖", "good", "great", "well done", "amazing", "clever", "proud"],
            "general": []
        }
        self.response_templates = {
            "greeting": ["你好呀！今天过得怎么样？", "嗨！很高兴见到你！", "你好！有什么我可以帮你的吗？"],
            "learning": ["学习是一件快乐的事情！我们开始吧！", "想要学习什么呢？", "学习时间到！准备好了吗？"],
            "homework": ["让我看看这道题...", "我们一起解决这个问题！", "遇到难题了吗？我来帮你！"],
            "story": ["想听什么故事呢？", "我来给你讲一个有趣的故事！", "故事时间到！准备好听故事了吗？"],
            "music": ["想听什么歌？我可以给你推荐！", "音乐能让人心情变好！", "唱歌时间到！"],
            "game": ["太好了！我们来玩游戏吧！", "猜谜语时间到！", "我们来玩个有趣的游戏！"],
            "emotion": ["我感受到你的情绪了，想聊聊吗？", "情绪是正常的，我在这里陪着你。"],
            "encourage": ["加油！你是最棒的！", "坚持就是胜利！你可以的！", "继续努力，我为你骄傲！"],
            "goodbye": ["再见！下次再聊！", "拜拜！祝你今天开心！", "明天见！好梦！"],
            "science": ["哇！这个问题很有趣！我们一起来探索科学世界吧！", "科学真是太神奇了！你想了解什么？", "让我来给你解释这个科学现象！"],
            "art": ["好呀！我们一起来画画吧！", "艺术创作时间到！你想画什么？", "你的想象力真丰富！我们一起创作吧！"],
            "sport": ["运动让身体更健康！我们动起来吧！", "做个运动小达人！", "生命在于运动！准备好了吗？"],
            "curiosity": ["好问题！让我来告诉你是怎么回事！", "你真是个爱思考的小朋友！", "这个问题很有趣，我们一起来探索吧！"],
            "praise": ["谢谢！你也非常棒！", "你做得太好了！继续加油！", "我真为你感到骄傲！"],
            "general": ["嗯，我明白了。", "原来是这样啊！", "很有趣，继续说！", "我在听，请继续说。"]
        }
        self.sessions: Dict[str, ConversationSession] = {}
        self.max_history = 50

    def _detect_language(self, text: str) -> str:
        scores = {}
        for lang, pattern in LANG_PATTERNS.items():
            matches = pattern.findall(text)
            scores[lang] = len(matches)
        if max(scores.values(), default=0) == 0:
            return "zh-CN"
        max_lang = max(scores, key=scores.get)
        return max_lang if scores[max_lang] > 0 else "zh-CN"

    def _filter_sensitive(self, text: str) -> str:
        for pattern in SENSITIVE_PATTERNS:
            text = pattern.sub("***", text)
        return text

    def _analyze_intent(self, text: str) -> str:
        text_lower = text.lower()
        scores = {}
        for intent, keywords in self.intent_keywords.items():
            scores[intent] = sum(1 for kw in keywords if kw in text_lower)
        max_intent = max(scores, key=scores.get)
        return max_intent if scores[max_intent] > 0 else "general"

    def process_message(self, user_id: str, text: str, session_id: Optional[str] = None, mode: str = "free") -> Dict:
        safe_text = self._filter_sensitive(text)
        language = self._detect_language(safe_text)
        intent = self._analyze_intent(safe_text)

        if not session_id:
            session_id = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        if session_id not in self.sessions:
            self.sessions[session_id] = ConversationSession(
                session_id=session_id, user_id=user_id, language=language, mode=mode
            )

        session = self.sessions[session_id]
        session.messages.append(ConversationMessage(role="user", content=safe_text, timestamp=datetime.now().isoformat()))

        response = self._generate_response(intent, safe_text, language, session)
        session.messages.append(ConversationMessage(role="assistant", content=response, timestamp=datetime.now().isoformat()))

        if len(session.messages) > self.max_history:
            session.messages = session.messages[-self.max_history:]

        session.language = language

        return {
            "response": response, "intent": intent, "language": language,
            "session_id": session_id, "mode": mode,
            "suggestions": self._get_suggestions(intent)
        }

    _ollama_available = None

    def _generate_response(self, intent: str, text: str, language: str, session: ConversationSession) -> str:
        if self._ollama_available is None:
            try:
                import urllib.request, json
                req = urllib.request.Request("http://localhost:11434/api/tags", method="GET")
                urllib.request.urlopen(req, timeout=2)
                self._ollama_available = True
            except Exception:
                self._ollama_available = False
        if self._ollama_available:
            try:
                from children_langchain import langchain_integration
                prompt_name = {"learning": "homework_help", "story": "storytelling",
                               "emotion": "emotional_support", "homework": "homework_help"}.get(intent, "conversation")
                result = langchain_integration.execute_chain([
                    {"type": "prompt", "name": prompt_name},
                    {"type": "model", "name": "llama3.2:1b"}
                ], {"input": text})
                if result.get("response"):
                    return result["response"]
            except Exception:
                pass
        import random
        templates = self.response_templates.get(intent, self.response_templates["general"])
        return random.choice(templates)

    def _get_suggestions(self, intent: str) -> List[str]:
        suggestions = {
            "greeting": ["今天学点什么？", "给我讲个故事吧", "我们来聊天"],
            "learning": ["我想学数学", "学英语怎么样？", "做练习题"],
            "homework": ["这道题怎么做？", "帮我检查作业", "我不懂这个知识点"],
            "story": ["讲个童话故事", "我想听寓言", "讲个有趣的故事"],
            "music": ["推荐一首歌", "我们一起唱歌", "听点轻松的音乐"],
            "game": ["猜谜语", "玩文字游戏", "做个测试"],
            "emotion": ["我今天很开心", "我有点难过", "我害怕"],
            "goodbye": ["明天见", "拜拜", "晚安"],
            "science": ["为什么天是蓝的?", "恐龙怎么灭绝的?", "做个小实验"],
            "art": ["画一只小猫咪", "做手工折纸", "涂色练习"],
            "sport": ["一起做运动", "跳跳绳", "跑步比赛"],
            "curiosity": ["为什么会下雨?", "星星为什么眨眼睛", "鱼怎么睡觉"],
            "praise": ["我今天考了100分", "我画了一幅画", "我做完了作业"],
            "general": ["给我讲个故事", "我想学习", "做点什么好呢？"]
        }
        return suggestions.get(intent, ["继续聊天", "换一个话题", "你有什么建议？"])

    def get_session(self, session_id: str) -> Optional[Dict]:
        session = self.sessions.get(session_id)
        if not session:
            return None
        return {
            "session_id": session.session_id, "user_id": session.user_id,
            "language": session.language, "mode": session.mode,
            "message_count": len(session.messages),
            "messages": [{"role": m.role, "content": m.content, "timestamp": m.timestamp}
                         for m in session.messages[-20:]]
        }

    def get_user_sessions(self, user_id: str) -> List[Dict]:
        return [{"session_id": s.session_id, "language": s.language, "mode": s.mode,
                 "messages_count": len(s.messages),
                 "last_message": s.messages[-1].content if s.messages else ""}
                for s in self.sessions.values() if s.user_id == user_id]

    def get_user_languages(self, user_id: str) -> Dict:
        sessions = [s for s in self.sessions.values() if s.user_id == user_id]
        if not sessions:
            return {"user_id": user_id, "languages": [], "primary_language": "zh-CN"}
        lang_counts = {}
        for s in sessions:
            lang_counts[s.language] = lang_counts.get(s.language, 0) + 1
        primary = max(lang_counts, key=lang_counts.get)
        return {
            "user_id": user_id,
            "languages": list(lang_counts.keys()),
            "primary_language": primary,
            "language_distribution": lang_counts
        }

    def delete_session(self, session_id: str) -> Dict:
        if session_id not in self.sessions:
            return {"success": False, "message": "会话不存在"}
        del self.sessions[session_id]
        return {"success": True, "message": "会话已删除"}

    def load_session(self, session_data: Dict):
        session = ConversationSession(
            session_id=session_data["session_id"], user_id=session_data["user_id"],
            language=session_data.get("language", "zh-CN"), mode=session_data.get("mode", "free")
        )
        for m in session_data.get("messages", []):
            session.messages.append(ConversationMessage(**m))
        self.sessions[session.session_id] = session

conversation_system = SmartConversationSystem()
