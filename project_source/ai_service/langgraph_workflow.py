"""LangGraph-based educational workflow engine for children companion robot"""
import json
import logging
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Enums & data classes
# ---------------------------------------------------------------------------
class NodeType(str, Enum):
    WELCOME = "welcome"
    INTENT = "intent_recognition"
    ENTITY = "entity_extraction"
    LESSON = "lesson_delivery"
    QUIZ = "quiz_generation"
    STORY = "story_telling"
    GAME = "game_suggestion"
    EMOTION = "emotion_support"
    HOMEWORK = "homework_help"
    TRANSLATE = "translation"
    GENERAL = "general_chat"
    FALLBACK = "fallback"
    CONFIRM = "confirmation"

@dataclass
class DialogueState:
    user_input: str = ""
    intent: str = ""
    sub_intent: str = ""
    entities: Dict = field(default_factory=dict)
    response: str = ""
    confidence: float = 0.0
    history: List[Dict] = field(default_factory=list)
    current_step: str = "start"
    session_id: str = "default"
    language: str = "en"
    turn_count: int = 0
    child_mood: str = "neutral"
    last_topic: str = ""

@dataclass
class WorkflowResult:
    success: bool
    state: DialogueState
    execution_steps: List[str]
    error: Optional[str] = None

# ---------------------------------------------------------------------------
# EducationWorkflow
# ---------------------------------------------------------------------------
class EducationWorkflow:
    """LangGraph-style workflow for educational dialogue with children."""

    INTENT_KEYWORDS = {
        "lesson":       {"en": ["lesson", "learn", "teach", "study", "tell me about", "what is", "explain"], "zh": ["上课", "学习", "教", "什么是", "解释", "什么是"]},
        "quiz":         {"en": ["quiz", "test", "exam", "practice", "question"], "zh": ["测验", "考试", "练习", "问题", "测试"]},
        "story":        {"en": ["story", "tale", "once upon", "tell me a", "read"], "zh": ["故事", "童话", "讲个", "读"]},
        "game":         {"en": ["game", "play", "fun", "riddle", "puzzle"], "zh": ["游戏", "玩", "谜语", "猜"]},
        "homework":     {"en": ["homework", "problem", "solve", "math", "help me with"], "zh": ["作业", "题目", "解答", "数学", "帮我"]},
        "emotion":      {"en": ["sad", "happy", "angry", "scared", "lonely", "feel"], "zh": ["难过", "开心", "生气", "害怕", "孤单", "感觉"]},
        "translate":    {"en": ["translate", "meaning", "how to say", "in english", "in chinese"], "zh": ["翻译", "意思", "怎么说", "英文", "中文"]},
        "greeting":     {"en": ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"], "zh": ["你好", "嗨", "早上好", "下午好", "晚上好"]},
        "farewell":     {"en": ["bye", "goodbye", "see you", "later"], "zh": ["再见", "拜拜", "明天见", "回头见"]},
    }

    def __init__(self):
        self.states: Dict[str, DialogueState] = {}
        self._node_registry: Dict[str, Callable] = {}

    # -----------------------------------------------------------------------
    # Node definitions (LangGraph-style)
    # -----------------------------------------------------------------------
    def register_node(self, name: str, fn: Callable):
        self._node_registry[name] = fn

    def _welcome_node(self, state: DialogueState) -> DialogueState:
        state.response = "Hi there! I'm RoboMate, your learning companion. What would you like to do today? We can learn a lesson, play a game, hear a story, or practice a quiz!"
        state.current_step = NodeType.WELCOME
        state.history.append({"step": "welcome", "response": state.response})
        return state

    def _intent_recognition_node(self, state: DialogueState) -> DialogueState:
        text = state.user_input.lower().strip()
        lang = state.language

        best_intent = "general_chat"
        best_score = 0

        for intent, langs in self.INTENT_KEYWORDS.items():
            keywords = langs.get(lang, langs.get("en", []))
            for kw in keywords:
                if kw in text:
                    score = len(kw) / len(text) if text else 0
                    if score > best_score:
                        best_score = score
                        best_intent = intent

        state.intent = best_intent
        state.confidence = min(best_score * 2, 1.0) if best_score > 0 else 0.1
        state.current_step = NodeType.INTENT
        state.history.append({"step": "intent_recognition", "intent": best_intent, "confidence": state.confidence})
        return state

    def _entity_extraction_node(self, state: DialogueState) -> DialogueState:
        text = state.user_input.lower()
        entities = {}

        subjects_en = {"math": "math", "science": "science", "history": "history", "english": "english", "art": "art", "music": "music"}
        subjects_zh = {"数学": "math", "科学": "science", "历史": "history", "英语": "english", "艺术": "art", "音乐": "music"}
        subj_map = subjects_zh if state.language == "zh" else subjects_en
        for keyword, subj in subj_map.items():
            if keyword in text:
                entities["subject"] = subj
                break

        story_themes = ["dragon", "princess", "robot", "animal", "space", "ocean", "fairy", "magic"]
        for theme in story_themes:
            if theme in text:
                entities["story_theme"] = theme
                break

        emotions = {"happy": "happy", "sad": "sad", "angry": "angry", "scared": "scared", "lonely": "lonely", "tired": "tired"}
        for emo, val in emotions.items():
            if emo in text:
                entities["emotion"] = val
                break

        state.entities = entities
        state.current_step = NodeType.ENTITY
        state.history.append({"step": "entity_extraction", "entities": entities})
        return state

    def _lesson_delivery_node(self, state: DialogueState) -> DialogueState:
        subject = state.entities.get("subject", "fun topic")
        state.response = f"Great! Let's learn about {subject}! Here's a quick lesson: {subject.title()} is fascinating because it helps us understand the world around us. Would you like me to explain more about a specific part of {subject}?"
        state.current_step = NodeType.LESSON
        state.history.append({"step": "lesson_delivery", "subject": subject, "response": state.response})
        return state

    def _quiz_generation_node(self, state: DialogueState) -> DialogueState:
        subject = state.entities.get("subject", "general knowledge")
        state.response = f"Quiz time! Here's a question about {subject}:\n\nWhat is the main purpose of studying {subject}?\nA) To have fun\nB) To understand the world\nC) To get good grades\nD) All of the above\n\nTell me your answer!"
        state.current_step = NodeType.QUIZ
        state.history.append({"step": "quiz_generation", "response": state.response})
        return state

    def _story_telling_node(self, state: DialogueState) -> DialogueState:
        theme = state.entities.get("story_theme", "adventure")
        state.response = f"Let me tell you a story about {theme}!\n\nOnce upon a time, in a land not so far away, there was a brave little {theme} who loved to explore. Every day brought new adventures and new friends. One morning, the little {theme} discovered something amazing — a hidden path leading to a magical garden where every flower sang a different song...\n\nWould you like me to continue the story?"
        state.current_step = NodeType.STORY
        state.history.append({"step": "story_telling", "theme": theme, "response": state.response})
        return state

    def _game_suggestion_node(self, state: DialogueState) -> DialogueState:
        state.response = "Let's play a game! I'm thinking of an animal. It has four legs, says 'woof', and is a human's best friend. What is it? 🐕"
        state.current_step = NodeType.GAME
        state.history.append({"step": "game_suggestion", "response": state.response})
        return state

    def _emotion_support_node(self, state: DialogueState) -> DialogueState:
        emotion = state.entities.get("emotion", "this way")
        responses = {
            "sad": "I'm sorry you're feeling sad. It's okay to be sad sometimes. Would you like to hear a funny joke or a cheerful song to feel better?",
            "angry": "I understand you're feeling angry. Taking a deep breath can help. Want to count to ten together?",
            "scared": "It's okay to feel scared sometimes. I'm here with you! Would you like me to tell you something brave?",
            "lonely": "You're never alone — I'm here! Want to play a game or hear a story together?",
            "tired": "You sound tired. Maybe it's time for a little rest. I can sing you a lullaby if you'd like.",
        }
        state.response = responses.get(emotion, f"I hear you're feeling {emotion}. That's okay. I'm here for you!").format(emotion=emotion)
        state.current_step = NodeType.EMOTION
        state.history.append({"step": "emotion_support", "emotion": emotion, "response": state.response})
        return state

    def _homework_help_node(self, state: DialogueState) -> DialogueState:
        subject = state.entities.get("subject", "this problem")
        state.response = f"Let me help you with {subject}! Can you tell me the problem you're working on? I'll explain it step by step so it's easy to understand."
        state.current_step = NodeType.HOMEWORK
        state.history.append({"step": "homework_help", "response": state.response})
        return state

    def _translation_node(self, state: DialogueState) -> DialogueState:
        state.response = "I can help with translation! Tell me the word or sentence you want me to translate, and I'll help you understand it in both English and Chinese."
        state.current_step = NodeType.TRANSLATE
        state.history.append({"step": "translation", "response": state.response})
        return state

    def _general_chat_node(self, state: DialogueState) -> DialogueState:
        state.response = "That's interesting! Tell me more about it. I love learning new things from you!"
        state.current_step = NodeType.GENERAL
        state.history.append({"step": "general_chat", "response": state.response})
        return state

    def _fallback_node(self, state: DialogueState) -> DialogueState:
        state.response = "I'm not sure I understand. Could you say that again? You can ask me to teach a lesson, tell a story, play a game, or help with homework!"
        state.current_step = NodeType.FALLBACK
        state.history.append({"step": "fallback", "response": state.response})
        return state

    def _confirmation_node(self, state: DialogueState) -> DialogueState:
        if not state.response:
            state.response = "Is there anything else you'd like to do?"
        state.current_step = NodeType.CONFIRM
        state.history.append({"step": "confirmation", "final_response": state.response})
        return state

    # -----------------------------------------------------------------------
    # Routing
    # -----------------------------------------------------------------------
    def _route_intent(self, state: DialogueState) -> str:
        route_map = {
            "lesson":     "lesson_delivery",
            "quiz":       "quiz_generation",
            "story":      "story_telling",
            "game":       "game_suggestion",
            "homework":   "homework_help",
            "emotion":    "emotion_support",
            "translate":  "translation",
            "greeting":   "general_chat",
            "farewell":   "confirmation",
        }
        return route_map.get(state.intent, "general_chat")

    # -----------------------------------------------------------------------
    # Graph execution
    # -----------------------------------------------------------------------
    def run_workflow(self, user_input: str, session_id: str = "default", language: str = "en") -> WorkflowResult:
        execution_steps = []
        try:
            prev = self.states.get(session_id)
            state = DialogueState(
                user_input=user_input,
                session_id=session_id,
                language=language,
                turn_count=(prev.turn_count + 1) if prev else 1,
                history=(prev.history or []) if prev else [],
                child_mood=prev.child_mood if prev else "neutral",
            )
            if prev and prev.last_topic:
                state.last_topic = prev.last_topic

            # Graph: start → intent → entity → [route] → response → confirm
            steps = [
                ("start", self._welcome_node),
                ("intent", self._intent_recognition_node),
                ("entity", self._entity_extraction_node),
            ]

            for name, node_fn in steps:
                state = node_fn(state)
                execution_steps.append(name)

            route = self._route_intent(state)
            if route == "lesson_delivery":
                state = self._lesson_delivery_node(state)
            elif route == "quiz_generation":
                state = self._quiz_generation_node(state)
            elif route == "story_telling":
                state = self._story_telling_node(state)
            elif route == "game_suggestion":
                state = self._game_suggestion_node(state)
            elif route == "homework_help":
                state = self._homework_help_node(state)
            elif route == "emotion_support":
                state = self._emotion_support_node(state)
            elif route == "translation":
                state = self._translation_node(state)
            elif route == "fallback":
                state = self._fallback_node(state)
            else:
                state = self._general_chat_node(state)

            execution_steps.append(route)

            state = self._confirmation_node(state)
            execution_steps.append("confirmation")

            state.last_topic = state.entities.get("subject", state.entities.get("story_theme", ""))
            self.states[session_id] = state

            return WorkflowResult(success=True, state=state, execution_steps=execution_steps)

        except Exception as e:
            logger.exception("Workflow error")
            return WorkflowResult(
                success=False,
                state=DialogueState(user_input=user_input, session_id=session_id),
                execution_steps=execution_steps,
                error=str(e),
            )

    # -----------------------------------------------------------------------
    # Session management
    # -----------------------------------------------------------------------
    def get_session_state(self, session_id: str) -> Optional[DialogueState]:
        return self.states.get(session_id)

    def clear_session(self, session_id: str):
        self.states.pop(session_id, None)

    def get_all_sessions(self) -> List[str]:
        return list(self.states.keys())

    def get_session_count(self) -> int:
        return len(self.states)
