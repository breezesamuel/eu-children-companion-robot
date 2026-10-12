import json
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from abc import ABC, abstractmethod

@dataclass
class SkillResult:
    success: bool
    message: str
    data: Optional[Dict] = None
    execution_time_ms: int = 0
    skill_name: str = ""

@dataclass
class SkillInfo:
    name: str
    description: str
    category: str
    parameters: List[Dict]
    enabled: bool
    version: str

class BaseSkill(ABC):
    @abstractmethod
    def get_info(self) -> SkillInfo:
        pass
    
    @abstractmethod
    def execute(self, parameters: Dict) -> SkillResult:
        pass

class StorySkill(BaseSkill):
    def get_info(self) -> SkillInfo:
        return SkillInfo(
            name="story",
            description="Tell children's stories",
            category="entertainment",
            parameters=[
                {"name": "story_name", "type": "string", "required": True, "description": "Name of the story"}
            ],
            enabled=True,
            version="1.0"
        )
    
    def execute(self, parameters: Dict) -> SkillResult:
        start_time = time.time()
        story_name = parameters.get("story_name", "Unknown")
        
        stories = {
            "snow white": "Once upon a time, there was a beautiful princess named Snow White...",
            "cinderella": "Cinderella lived with her evil stepmother and stepsisters...",
            "alice": "Alice followed the white rabbit down the rabbit hole...",
            "default": "Let me tell you a wonderful story about friendship and adventure..."
        }
        
        story_text = stories.get(story_name.lower(), stories["default"])
        
        execution_time = int((time.time() - start_time) * 1000)
        return SkillResult(
            success=True,
            message=story_text,
            data={"story_name": story_name},
            execution_time_ms=execution_time,
            skill_name="story"
        )

class MathSkill(BaseSkill):
    def get_info(self) -> SkillInfo:
        return SkillInfo(
            name="math",
            description="Help with math problems",
            category="education",
            parameters=[
                {"name": "problem", "type": "string", "required": True, "description": "Math problem to solve"}
            ],
            enabled=True,
            version="1.0"
        )
    
    def execute(self, parameters: Dict) -> SkillResult:
        start_time = time.time()
        problem = parameters.get("problem", "")
        
        try:
            result = self._solve_problem(problem)
            execution_time = int((time.time() - start_time) * 1000)
            return SkillResult(
                success=True,
                message=f"The answer is {result}",
                data={"problem": problem, "answer": result},
                execution_time_ms=execution_time,
                skill_name="math"
            )
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            return SkillResult(
                success=False,
                message=f"Sorry, I couldn't solve that problem: {str(e)}",
                data={"problem": problem},
                execution_time_ms=execution_time,
                skill_name="math"
            )
    
    def _solve_problem(self, problem: str) -> float:
        problem = problem.replace("plus", "+").replace("minus", "-")
        problem = problem.replace("times", "*").replace("divided by", "/")
        problem = ''.join(c for c in problem if c in '0123456789+-*/. ')
        
        if not problem:
            raise ValueError("No valid math expression")
        
        return eval(problem)

class MusicSkill(BaseSkill):
    def get_info(self) -> SkillInfo:
        return SkillInfo(
            name="music",
            description="Play music and songs",
            category="entertainment",
            parameters=[
                {"name": "song_name", "type": "string", "required": True, "description": "Name of the song"}
            ],
            enabled=True,
            version="1.0"
        )
    
    def execute(self, parameters: Dict) -> SkillResult:
        start_time = time.time()
        song_name = parameters.get("song_name", "Unknown")
        
        songs = {
            "twinkle": "Twinkle, twinkle, little star...",
            "abc": "ABCDEFG, HIJKLMNOP...",
            "happy birthday": "Happy birthday to you...",
            "default": "Playing a cheerful tune..."
        }
        
        song_text = songs.get(song_name.lower(), songs["default"])
        
        execution_time = int((time.time() - start_time) * 1000)
        return SkillResult(
            success=True,
            message=song_text,
            data={"song_name": song_name},
            execution_time_ms=execution_time,
            skill_name="music"
        )

class EmotionSkill(BaseSkill):
    def get_info(self) -> SkillInfo:
        return SkillInfo(
            name="emotion",
            description="Emotional support and encouragement",
            category="emotion",
            parameters=[
                {"name": "emotion", "type": "string", "required": True, "description": "User's emotion"}
            ],
            enabled=True,
            version="1.0"
        )
    
    def execute(self, parameters: Dict) -> SkillResult:
        start_time = time.time()
        emotion = parameters.get("emotion", "")
        
        responses = {
            "happy": "I'm so happy you're feeling happy! 😊",
            "sad": "I'm sorry you're feeling sad. Want to talk about it? 🤗",
            "angry": "It's okay to feel angry. Let's take a deep breath together. 💆",
            "scared": "Don't be scared, I'm here with you! 🌟",
            "lonely": "You're never alone! I'm always here to chat. 🎈",
            "default": "I'm here for you, whatever you're feeling. 💖"
        }
        
        response = responses.get(emotion.lower(), responses["default"])
        
        execution_time = int((time.time() - start_time) * 1000)
        return SkillResult(
            success=True,
            message=response,
            data={"emotion": emotion},
            execution_time_ms=execution_time,
            skill_name="emotion"
        )

class SkillExecutor:
    def __init__(self):
        self.skills: Dict[str, BaseSkill] = {}
        self._register_skills()
    
    def _register_skills(self):
        self.skills["story"] = StorySkill()
        self.skills["math"] = MathSkill()
        self.skills["music"] = MusicSkill()
        self.skills["emotion"] = EmotionSkill()
    
    def register_skill(self, skill: BaseSkill):
        self.skills[skill.get_info().name] = skill
    
    def get_skill_info(self, skill_name: str) -> Optional[SkillInfo]:
        skill = self.skills.get(skill_name)
        return skill.get_info() if skill else None
    
    def list_skills(self) -> List[SkillInfo]:
        return [skill.get_info() for skill in self.skills.values()]
    
    def execute_skill(self, skill_name: str, parameters: Dict) -> SkillResult:
        skill = self.skills.get(skill_name)
        
        if not skill:
            return SkillResult(
                success=False,
                message=f"Skill '{skill_name}' not found",
                skill_name=skill_name
            )
        
        if not skill.get_info().enabled:
            return SkillResult(
                success=False,
                message=f"Skill '{skill_name}' is disabled",
                skill_name=skill_name
            )
        
        return skill.execute(parameters)
    
    def execute_by_intent(self, intent: str, entities: Dict) -> SkillResult:
        intent_skill_map = {
            "play_story": ("story", {"story_name": entities.get("story_name", "default")}),
            "play_music": ("music", {"song_name": entities.get("song_name", "default")}),
            "homework_help": ("math", {"problem": entities.get("problem", "")}),
            "emotion": ("emotion", {"emotion": entities.get("emotion", "")})
        }
        
        if intent not in intent_skill_map:
            return SkillResult(
                success=False,
                message=f"No skill found for intent '{intent}'",
                skill_name=intent
            )
        
        skill_name, params = intent_skill_map[intent]
        return self.execute_skill(skill_name, params)