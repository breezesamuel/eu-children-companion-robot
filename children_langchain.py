#!/usr/bin/env python3
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
import logging
import json
import os
import urllib.request
import urllib.error
import time
from collections import OrderedDict

logger = logging.getLogger("langchain")

@dataclass
class LLMModel:
    name: str
    provider: str
    api_key_env: str
    api_url: str
    enabled: bool = False

@dataclass
class PromptTemplate:
    name: str
    template: str
    variables: List[str]

class ResponseCache:
    def __init__(self, maxsize: int = 100, ttl: int = 300):
        self.cache: OrderedDict = OrderedDict()
        self.maxsize = maxsize
        self.ttl = ttl

    def get(self, key: str) -> Optional[str]:
        if key in self.cache:
            val, ts = self.cache[key]
            if time.time() - ts < self.ttl:
                self.cache.move_to_end(key)
                return val
            del self.cache[key]
        return None

    def set(self, key: str, value: str):
        self.cache[key] = (value, time.time())
        if len(self.cache) > self.maxsize:
            self.cache.popitem(last=False)

class LangChainIntegration:
    def __init__(self):
        self.models = self._init_models()
        self.prompts = self._init_prompts()
        self.cache = ResponseCache()
        self._load_env()

    def _init_models(self) -> Dict[str, LLMModel]:
        return {
            "llama3.2:1b": LLMModel("llama3.2:1b", "ollama", "OLLAMA_HOST", "http://localhost:11434/api/generate"),
            "qwen2:7b": LLMModel("qwen2:7b", "ollama", "OLLAMA_HOST", "http://localhost:11434/api/generate"),
            "deepseek-r1:7b": LLMModel("deepseek-r1:7b", "ollama", "OLLAMA_HOST", "http://localhost:11434/api/generate"),
            "mistral:7b": LLMModel("mistral:7b", "ollama", "OLLAMA_HOST", "http://localhost:11434/api/generate"),
            "deepseek-chat": LLMModel("DeepSeek Chat", "deepseek", "DEEPSEEK_API_KEY", "https://api.deepseek.com/chat/completions"),
            "qwen-max": LLMModel("通义千问", "alibaba", "QWEN_API_KEY", "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"),
            "glm-4": LLMModel("智谱GLM-4", "zhipu", "ZHIPU_API_KEY", "https://open.bigmodel.cn/api/paas/v4/chat/completions"),
            "gpt-4o-mini": LLMModel("GPT-4o Mini", "openai", "OPENAI_API_KEY", "https://api.openai.com/v1/chat/completions"),
            "claude-3-haiku": LLMModel("Claude 3 Haiku", "anthropic", "ANTHROPIC_API_KEY", "https://api.anthropic.com/v1/messages"),
            "gemini-2.0-flash": LLMModel("Gemini 2.0 Flash", "google", "GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"),
            "moonshot-v1": LLMModel("Moonshot v1", "moonshot", "MOONSHOT_API_KEY", "https://api.moonshot.cn/v1/chat/completions"),
            "mixtral-8x7b": LLMModel("Mixtral 8x7b", "groq", "GROQ_API_KEY", "https://api.groq.com/openai/v1/chat/completions"),
            "mixtral-8x7b-32768": LLMModel("Groq Mixtral 8x7b 32768", "groq", "GROQ_API_KEY", "https://api.groq.com/openai/v1/chat/completions"),
            "mistralai/Mixtral-8x7B-Instruct-v0.1": LLMModel("Together Mixtral 8x7B", "togetherai", "TOGETHER_API_KEY", "https://api.together.xyz/v1/chat/completions"),
            "llama-3-sonar-small-32k-chat": LLMModel("Perplexity Sonar Small", "perplexity", "PERPLEXITY_API_KEY", "https://api.perplexity.ai/chat/completions"),
            "meta/meta-llama-3-8b-instruct": LLMModel("Replicate Llama 3 8B", "replicate", "REPLICATE_API_KEY", "https://api.replicate.com/v1/chat/completions"),
        }

    def _init_prompts(self) -> Dict[str, PromptTemplate]:
        return {
            "storytelling": PromptTemplate("storytelling", "请根据以下要求创作一个适合{age}岁儿童的故事：{input}", ["age", "input"]),
            "homework_help": PromptTemplate("homework_help", "请帮助{age}岁的孩子解答以下问题，用简单易懂的语言：{input}", ["age", "input"]),
            "english_practice": PromptTemplate("english_practice", "Please help a {age}-year-old child practice English: {input}", ["input", "age"]),
            "emotional_support": PromptTemplate("emotional_support", "请用温暖、鼓励的语气回应一个{emotion}的{age}岁孩子：{input}", ["emotion", "age", "input"]),
            "creative_writing": PromptTemplate("creative_writing", "请创作一段适合{age}岁儿童的创意内容：{input}", ["age", "input"]),
            "conversation": PromptTemplate("conversation", "你是一个儿童陪伴机器人，请用友好、简单的语言回应一个孩子的话：{input}", ["input"]),
        }

    def _load_env(self):
        for name, model in self.models.items():
            key = os.environ.get(model.api_key_env)
            if key:
                model.enabled = True
        if os.environ.get("ACTIVE_LLM", "ollama") == "ollama":
            for name, model in self.models.items():
                if model.provider == "ollama":
                    model.enabled = True

    def render_prompt(self, prompt_name: str, variables: Dict) -> Optional[str]:
        prompt = self.prompts.get(prompt_name)
        if not prompt:
            return None
        try:
            return prompt.template.format(**variables)
        except KeyError as e:
            logger.warning("Missing variable in prompt %s: %s", prompt_name, e)
            return prompt.template

    def _call_ollama(self, model_name: str, prompt: str, timeout: int = 15) -> Optional[str]:
        model = self.models.get(model_name)
        if not model:
            return None
        host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
        url = f"{host}/api/generate"
        payload = json.dumps({"model": model_name, "prompt": prompt, "stream": False, "options": {"num_predict": 200}}).encode()
        try:
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                result = json.loads(resp.read())
                return result.get("response", "").strip()
        except (urllib.error.URLError, json.JSONDecodeError, OSError) as e:
            logger.debug("Ollama call failed: %s", e)
            return None

    def _call_api_model(self, model_name: str, prompt: str, timeout: int = 15, max_retries: int = 2) -> Optional[str]:
        model = self.models.get(model_name)
        if not model or not model.enabled:
            return None
        api_key = os.environ.get(model.api_key_env, "")
        if not api_key:
            return None
        last_error = None
        provider = model.provider

        for attempt in range(max_retries + 1):
            try:
                if provider == "openai" or provider == "deepseek":
                    m = model_name if provider == "openai" else "deepseek-chat"
                    payload = json.dumps({"model": m, "messages": [{"role": "user", "content": prompt}], "max_tokens": 200}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
                elif provider == "anthropic":
                    payload = json.dumps({"model": "claude-3-haiku-20240307", "max_tokens": 200,
                        "messages": [{"role": "user", "content": prompt}]}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "x-api-key": api_key, "anthropic-version": "2023-06-01"})
                elif provider == "google":
                    url = f"{model.api_url}?key={api_key}"
                    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"maxOutputTokens": 200}}).encode()
                    req = urllib.request.Request(url, data=payload,
                        headers={"Content-Type": "application/json"})
                elif provider == "groq":
                    payload = json.dumps({"model": "mixtral-8x7b-32768", "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 200}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
                elif provider == "togetherai":
                    payload = json.dumps({"model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
                        "messages": [{"role": "user", "content": prompt}], "max_tokens": 200}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
                elif provider == "perplexity":
                    payload = json.dumps({"model": "llama-3-sonar-small-32k-chat",
                        "messages": [{"role": "user", "content": prompt}], "max_tokens": 200}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
                elif provider == "replicate":
                    payload = json.dumps({"input": {"prompt": prompt, "max_tokens": 200}}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
                elif provider == "alibaba":
                    payload = json.dumps({"model": "qwen-max", "input": {"messages": [{"role": "user", "content": prompt}]},
                        "parameters": {"max_tokens": 200}}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
                elif provider == "zhipu":
                    payload = json.dumps({"model": "glm-4", "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 200}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
                elif provider == "moonshot":
                    payload = json.dumps({"model": "moonshot-v1", "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 200}).encode()
                    req = urllib.request.Request(model.api_url, data=payload,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
                else:
                    return None

                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    result = json.loads(resp.read())
                    if provider in ("openai", "deepseek", "groq", "togetherai", "perplexity", "zhipu", "moonshot"):
                        return result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                    elif provider == "anthropic":
                        return result.get("content", [{}])[0].get("text", "").strip()
                    elif provider == "google":
                        candidates = result.get("candidates", [])
                        if candidates:
                            return candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                        return ""
                    elif provider == "replicate":
                        return result.get("output", "")
                    elif provider == "alibaba":
                        return result.get("output", {}).get("text", "")
                    return json.dumps(result)[:200]
            except Exception as e:
                last_error = e
                logger.debug("API call attempt %d failed for %s: %s", attempt + 1, model_name, e)
                if attempt < max_retries:
                    time.sleep(2 ** attempt)
        return None

    def _simulate_llm_call(self, model_name: str, prompt: str) -> str:
        prompt_lower = prompt.lower()
        if "你好" in prompt_lower or "hello" in prompt_lower:
            return "你好呀！今天有什么我可以帮助你的吗？"
        if "故事" in prompt_lower or "story" in prompt_lower:
            return "从前有一个可爱的小兔子，它住在大森林里..."
        if "开心" in prompt_lower or "happy" in prompt_lower:
            return "太棒了！开心是最好的心情！我们一起来分享快乐吧！"
        if "难过" in prompt_lower or "sad" in prompt_lower:
            return "别难过，我在这里陪着你呢。想聊聊吗？"
        if "学" in prompt_lower or "learn" in prompt_lower or "homework" in prompt_lower:
            return "好的！让我们一起来学习吧！先从简单的开始..."
        if "音乐" in prompt_lower or "music" in prompt_lower or "song" in prompt_lower:
            return "音乐可以让人心情变好！我给你推荐一首好听的歌！"
        if "再见" in prompt_lower or "bye" in prompt_lower:
            return "再见！祝你开心快乐！明天见！"
        if "1+1" in prompt_lower:
            return "1+1=2！这是一个简单的加法问题。"
        return "嗯，我明白了。让我们继续我们的对话吧！"

    def execute_chain(self, steps: List[Dict], context: Dict = None) -> Dict:
        context = context or {}
        result = {"steps_executed": [], "response": ""}
        rendered_prompt = None
        chosen_model = None

        for step in steps:
            step_type = step.get("type")
            if step_type == "prompt":
                pname = step.get("name", "conversation")
                rendered_prompt = self.render_prompt(pname, context)
                result["prompt_used"] = rendered_prompt
                result["steps_executed"].append(f"prompt:{pname}")
            elif step_type == "model":
                model_name = step.get("name", "llama3.2:1b")
                if rendered_prompt:
                    cache_key = f"{model_name}:{rendered_prompt[:100]}"
                    cached = self.cache.get(cache_key)
                    if cached:
                        result["response"] = cached
                        result["cached"] = True
                        result["steps_executed"].append(f"model:{model_name}(cached)")
                        return result
                    response = self._call_ollama(model_name, rendered_prompt)
                    if not response:
                        response = self._call_api_model(model_name, rendered_prompt)
                    if not response:
                        response = self._simulate_llm_call(model_name, rendered_prompt)
                    self.cache.set(cache_key, response)
                    result["response"] = response
                    result["steps_executed"].append(f"model:{model_name}")
                chosen_model = model_name
            elif step_type == "tool":
                tool_name = step.get("name", "")
                from children_langgraph import langgraph_workflow
                wf_result = langgraph_workflow.execute_workflow(tool_name, context)
                result["tool_result"] = wf_result
                result["steps_executed"].append(f"tool:{tool_name}")

        if not result.get("response") and not result.get("tool_result"):
            result["response"] = self._simulate_llm_call(chosen_model or "llama3.2:1b", rendered_prompt or str(context))
        return result

    def get_available_models(self) -> List[Dict]:
        return [{"name": name, "provider": m.provider, "enabled": m.enabled, "api_url": m.api_url}
                for name, m in self.models.items()]

    def clear_cache(self):
        self.cache = ResponseCache()
        logger.info("Response cache cleared")

langchain_integration = LangChainIntegration()
