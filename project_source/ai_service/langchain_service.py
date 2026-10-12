"""LangChain integration service for children companion robot"""
import os
import json
import time
import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class LLMResponse:
    text: str
    model: str = "unavailable"
    tokens_used: int = 0
    cost: float = 0.0
    response_time_ms: int = 0

@dataclass
class PromptTemplateInfo:
    name: str
    template: str
    description: str = ""
    variables: List[str] = field(default_factory=list)
    version: str = "1.0"

# ---------------------------------------------------------------------------
# LangChainService
# ---------------------------------------------------------------------------
class LangChainService:
    """Multi-provider LLM service with prompt templates, streaming, and fallback."""

    PROVIDER_CONFIGS = {
        "openai":     {"env_key": "OPENAI_API_KEY",     "module": "langchain_openai", "class": "ChatOpenAI",     "default_model": "gpt-4o-mini"},
        "deepseek":   {"env_key": "DEEPSEEK_API_KEY",   "module": "langchain_openai", "class": "ChatOpenAI",     "default_model": "deepseek-chat",       "base_url": "https://api.deepseek.com/v1"},
        "claude":     {"env_key": "ANTHROPIC_API_KEY",  "module": "langchain_anthropic", "class": "ChatAnthropic", "default_model": "claude-3-haiku-20240307"},
        "qwen":       {"env_key": "QWEN_API_KEY",       "module": "langchain_openai", "class": "ChatOpenAI",     "default_model": "qwen-plus",           "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1"},
        "gemini":     {"env_key": "GEMINI_API_KEY",     "module": "langchain_google_genai", "class": "ChatGoogleGenerativeAI", "default_model": "gemini-1.5-flash"},
        "ollama":     {"env_key": None,                 "module": "langchain_ollama",  "class": "ChatOllama",     "default_model": "llama3.2:1b",            "base_url": "http://localhost:11434"},
        "groq":       {"env_key": "GROQ_API_KEY",       "module": "langchain_openai", "class": "ChatOpenAI",     "default_model": "mixtral-8x7b-32768",  "base_url": "https://api.groq.com/openai/v1"},
        "mistral":    {"env_key": "MISTRAL_API_KEY",    "module": "langchain_mistralai", "class": "ChatMistralAI", "default_model": "mistral-small-latest"},
    }

    def __init__(self, config: Dict):
        self.config = config
        self.llm = None
        self.provider = config.get("default_provider", "local")
        self.memories: Dict[str, Any] = {}
        self.prompt_templates: Dict[str, PromptTemplateInfo] = {}
        self._load_prompt_templates()
        self._initialize_llm()

    # -----------------------------------------------------------------------
    # Provider management
    # -----------------------------------------------------------------------
    def list_providers(self) -> List[str]:
        return list(self.PROVIDER_CONFIGS.keys()) + ["local"]

    def set_provider(self, name: str):
        self.provider = name
        self._initialize_llm()

    def _initialize_llm(self):
        provider = self.provider
        if provider == "local" or provider not in self.PROVIDER_CONFIGS:
            self.llm = None
            logger.info("LLM provider=%s (unavailable)", provider)
            return

        cfg = self.PROVIDER_CONFIGS[provider]
        api_key = os.getenv(cfg["env_key"]) if cfg["env_key"] else None
        if not api_key and cfg["env_key"]:
            logger.warning("No API key for %s (env: %s)", provider, cfg["env_key"])
            self.llm = None
            return

        try:
            mod = __import__(cfg["module"], fromlist=[cfg["class"]])
            cls = getattr(mod, cfg["class"])
            kwargs = {"model": cfg["default_model"]}
            if api_key:
                kwargs["api_key"] = api_key
            if cfg.get("base_url"):
                kwargs["base_url"] = cfg["base_url"]
            kwargs["temperature"] = 0.7
            kwargs["max_tokens"] = 1024
            self.llm = cls(**kwargs)
            logger.info("LLM initialized: %s / %s", provider, cfg["default_model"])
        except ImportError as e:
            logger.warning("Module %s not installed: %s", cfg["module"], e)
            self.llm = None

    def is_available(self) -> bool:
        return self.llm is not None

    # -----------------------------------------------------------------------
    # Prompt templates
    # -----------------------------------------------------------------------
    def _load_prompt_templates(self):
        templates = {
            "system_prompt": PromptTemplateInfo(
                name="system_prompt",
                template="You are a friendly children's companion robot named RoboMate. Respond in {language}. Keep responses short, friendly, and appropriate for children (ages 3-12). Use simple words. Be encouraging, warm, and helpful. Never generate harmful content.",
                description="Default system prompt",
                variables=["language"],
            ),
            "story_prompt": PromptTemplateInfo(
                name="story_prompt",
                template="Write a short, engaging children's story (150-200 words) in {language} about {topic}. The story should be suitable for ages {age_group}. Include a positive message.",
                description="Story generation",
                variables=["language", "topic", "age_group"],
            ),
            "education_lesson": PromptTemplateInfo(
                name="education_lesson",
                template="Create an educational lesson in {language} for grade {grade} student on {subject}. Include clear explanations, one example, and a fun fact. Keep it under 200 words.",
                description="Lesson generation",
                variables=["language", "grade", "subject"],
            ),
            "quiz_generation": PromptTemplateInfo(
                name="quiz_generation",
                template="Generate {count} multiple-choice quiz questions in {language} for grade {grade} about {subject}. Each question must have 4 options (A-D) and indicate the correct answer. Format as JSON array.",
                description="Quiz generation",
                variables=["count", "language", "grade", "subject"],
            ),
            "evaluation": PromptTemplateInfo(
                name="evaluation",
                template="Evaluate the student's answer. Question: {question}. Student's answer: {answer}. Provide: 1) Correct/Incorrect, 2) Brief explanation, 3) Encouraging feedback. Respond in {language}.",
                description="Answer evaluation",
                variables=["question", "answer", "language"],
            ),
            "sentiment": PromptTemplateInfo(
                name="sentiment",
                template="Analyze the emotion in this text. Respond with exactly one word: happy, sad, angry, fearful, surprised, disgusted, or neutral. Text: {text}",
                description="Sentiment analysis",
                variables=["text"],
            ),
            "math_tutor": PromptTemplateInfo(
                name="math_tutor",
                template="Help a child solve this math problem step by step in {language}. Problem: {problem}. Explain each step simply. End with the final answer.",
                description="Math tutoring",
                variables=["language", "problem"],
            ),
            "translation": PromptTemplateInfo(
                name="translation",
                template="Translate the following {source_lang} text to {target_lang}. Keep it simple for children. Text: {text}",
                description="Translation",
                variables=["source_lang", "target_lang", "text"],
            ),
        }
        self.prompt_templates = templates

    def add_prompt_template(self, name: str, template: str, description: str = "", variables: List[str] = None, version: str = "1.0"):
        self.prompt_templates[name] = PromptTemplateInfo(name=name, template=template, description=description, variables=variables or [], version=version)

    def get_prompt_template(self, name: str) -> Optional[PromptTemplateInfo]:
        return self.prompt_templates.get(name)

    def list_prompt_templates(self) -> List[PromptTemplateInfo]:
        return list(self.prompt_templates.values())

    # -----------------------------------------------------------------------
    # Sync generation
    # -----------------------------------------------------------------------
    async def generate_response(self, prompt: str, child_id: str = "default", language: str = "en", template_name: str = "system_prompt") -> LLMResponse:
        if not self.llm:
            return LLMResponse(text="I'm sorry, my AI service is not available right now. Please try again later.", model="unavailable")

        start = time.time()
        try:
            template_info = self.prompt_templates.get(template_name, self.prompt_templates["system_prompt"])
            filled = template_info.template
            var_map = {"language": language, "child_id": child_id}
            try:
                filled = template_info.template.format(**{v: "{" + v + "}" if v not in var_map else var_map[v] for v in template_info.variables})
            except KeyError:
                filled = template_info.template.replace("{language}", language)

            messages = [{"role": "system", "content": filled}, {"role": "user", "content": prompt}]

            if hasattr(self.llm, "ainvoke"):
                result = await self.llm.ainvoke(messages)
            else:
                import asyncio
                result = await asyncio.to_thread(self.llm.invoke, messages)

            text = result.content if hasattr(result, "content") else str(result)
            elapsed = int((time.time() - start) * 1000)
            return LLMResponse(text=text, model=self.provider, response_time_ms=elapsed)

        except Exception as e:
            logger.exception("LLM generate error")
            elapsed = int((time.time() - start) * 1000)
            return LLMResponse(text=f"Sorry, I encountered an error: {str(e)}", model=self.provider, response_time_ms=elapsed)

    # -----------------------------------------------------------------------
    # Streaming generation
    # -----------------------------------------------------------------------
    async def generate_stream(self, prompt: str, child_id: str = "default", language: str = "en") -> AsyncGenerator[str, None]:
        if not self.llm:
            yield "I'm sorry, my AI service is not available right now."
            return

        try:
            template = self.prompt_templates["system_prompt"].template.replace("{language}", language)
            messages = [{"role": "system", "content": template}, {"role": "user", "content": prompt}]

            if hasattr(self.llm, "astream"):
                async for chunk in self.llm.astream(messages):
                    text = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if text:
                        yield text
            else:
                result = await self.llm.ainvoke(messages)
                text = result.content if hasattr(result, "content") else str(result)
                yield text

        except Exception as e:
            logger.exception("Stream error")
            yield f"Error: {str(e)}"

    # -----------------------------------------------------------------------
    # Memory management
    # -----------------------------------------------------------------------
    def get_memory(self, session_id: str) -> List[Dict]:
        if session_id not in self.memories:
            self.memories[session_id] = []
        return self.memories[session_id]

    def add_to_memory(self, session_id: str, role: str, content: str):
        self.get_memory(session_id).append({"role": role, "content": content, "timestamp": time.time()})

    def clear_memory(self, session_id: str):
        self.memories.pop(session_id, None)
