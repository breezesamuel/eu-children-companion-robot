import os
import json
import time
import hashlib
import threading
from typing import Dict, Optional, List, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import OrderedDict


class ModelBackend(Enum):
    TRANSFORMERS = "transformers"
    ONNX = "onnx"
    TENSORFLOW_LITE = "tflite"
    PYTORCH = "pytorch"


@dataclass
class AIResponse:
    text: str
    confidence: float
    model_name: str
    model_version: str
    inference_time_ms: int
    tokens_used: int
    backend: str = "transformers"


@dataclass
class IntentResult:
    intent: str
    confidence: float
    entities: Dict[str, str]


@dataclass
class ProfileRecord:
    operation: str
    duration_ms: float
    model_name: str
    input_size: int
    timestamp: float


class InferenceCache:
    def __init__(self, max_size: int = 100, ttl_seconds: int = 300):
        self.cache = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl_seconds
        self.lock = threading.Lock()

    def _make_key(self, prompt: str, language: str, **kwargs) -> str:
        raw = f"{prompt}:{language}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, prompt: str, language: str, **kwargs) -> Optional[str]:
        key = self._make_key(prompt, language, **kwargs)
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                if time.time() - entry["timestamp"] < self.ttl:
                    self.cache.move_to_end(key)
                    return entry["result"]
                del self.cache[key]
        return None

    def set(self, prompt: str, language: str, result: str, **kwargs):
        key = self._make_key(prompt, language, **kwargs)
        with self.lock:
            if len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
            self.cache[key] = {"result": result, "timestamp": time.time()}

    def clear(self):
        with self.lock:
            self.cache.clear()

    def size(self) -> int:
        return len(self.cache)


class InputPreprocessor:
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.max_length = self.config.get("max_input_length", 2048)
        self.strip_html = self.config.get("strip_html", True)

    def preprocess(self, text: str, language: str = "en") -> str:
        if self.strip_html:
            import re
            text = re.sub(r"<[^>]+>", "", text)
        text = text.strip()
        words = text.split()
        if len(words) > self.max_length:
            text = " ".join(words[:self.max_length])
        if language == "zh" and len(text) > self.max_length * 2:
            text = text[:self.max_length * 2]
        return text


class OutputPostprocessor:
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.min_confidence = self.config.get("min_confidence", 0.3)

    def postprocess(self, text: str, confidence: float) -> str:
        if confidence < self.min_confidence:
            return "I'm not confident enough to respond to that."
        text = text.strip()
        sentences = text.split(".")
        clean = ". ".join(s.strip() for s in sentences if len(s.strip()) > 5)
        return clean if clean else text


class EdgeAICore:
    def __init__(self, config: Dict):
        self.config = config
        self.tokenizer = None
        self.model = None
        self.generator = None
        self.model_loaded = False
        self.model_name = config.get("local_model", "TinyLlama-1.1B")
        self.model_version = config.get("model_version", "1.0.0")
        self.backend = ModelBackend(config.get("backend", "transformers"))
        self.fallback_chain = []
        self.cache = InferenceCache(
            max_size=config.get("cache_size", 100),
            ttl_seconds=config.get("cache_ttl", 300)
        )
        self.preprocessor = InputPreprocessor(config.get("preprocessing", {}))
        self.postprocessor = OutputPostprocessor(config.get("postprocessing", {}))
        self.profiler = []
        self.accuracy_tracker = {"correct": 0, "total": 0}
        self.warmed_up = False
        self._load_model()

    def _load_model(self):
        model_path = self.config.get("model_path", "./models/")
        full_path = os.path.join(model_path, self.model_name)

        if not os.path.exists(full_path):
            print(f"Model not found at {full_path}")
            if self.fallback_chain:
                self._load_fallback()
            return

        try:
            print(f"Loading model: {self.model_name} (backend: {self.backend.value})")
            start_time = time.time()

            if self.backend == ModelBackend.TRANSFORMERS:
                self._load_transformers(full_path)
            elif self.backend == ModelBackend.ONNX:
                self._load_onnx(full_path)
            elif self.backend == ModelBackend.TENSORFLOW_LITE:
                self._load_tflite(full_path)
            elif self.backend == ModelBackend.PYTORCH:
                self._load_pytorch(full_path)

            self.model_loaded = True
            load_time = (time.time() - start_time) * 1000
            print(f"Model loaded in {load_time:.2f}ms")

        except Exception as e:
            print(f"Error loading model: {e}")
            self.model_loaded = False
            if self.fallback_chain:
                self._load_fallback()

    def _load_transformers(self, path: str):
        from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
        self.tokenizer = AutoTokenizer.from_pretrained(path)
        self.model = AutoModelForCausalLM.from_pretrained(
            path,
            device_map="auto",
            load_in_4bit=True,
            max_memory={0: "2048MB"}
        )
        self.generator = pipeline(
            "text-generation",
            model=self.model,
            tokenizer=self.tokenizer,
            max_new_tokens=256,
            temperature=0.7,
            top_p=0.95
        )

    def _load_onnx(self, path: str):
        try:
            import onnxruntime as ort
            model_file = os.path.join(path, "model.onnx")
            if not os.path.exists(model_file):
                raise FileNotFoundError(f"ONNX model not found at {model_file}")
            self.ort_session = ort.InferenceSession(model_file)
            self.generator = lambda prompt: self._onnx_generate(prompt)
        except ImportError:
            raise RuntimeError("onnxruntime not installed")

    def _onnx_generate(self, prompt: str) -> List[Dict]:
        inputs = self.tokenizer(prompt, return_tensors="np")
        outputs = self.ort_session.run(None, {k: v for k, v in inputs.items()})
        import numpy as np
        tokens = np.argmax(outputs[0], axis=-1)
        text = self.tokenizer.decode(tokens[0], skip_special_tokens=True)
        return [{"generated_text": text}]

    def _load_tflite(self, path: str):
        try:
            import tensorflow.lite as tflite
            model_file = os.path.join(path, "model.tflite")
            if not os.path.exists(model_file):
                raise FileNotFoundError(f"TFLite model not found at {model_file}")
            self.tflite_interpreter = tflite.Interpreter(model_path=model_file)
            self.tflite_interpreter.allocate_tensors()
            self.generator = lambda prompt: self._tflite_generate(prompt)
        except ImportError:
            raise RuntimeError("tensorflow not installed")

    def _tflite_generate(self, prompt: str) -> List[Dict]:
        input_details = self.tflite_interpreter.get_input_details()
        output_details = self.tflite_interpreter.get_output_details()
        inputs = self.tokenizer(prompt, return_tensors="np", padding=True, truncation=True)
        self.tflite_interpreter.set_tensor(input_details[0]["index"], inputs["input_ids"])
        self.tflite_interpreter.invoke()
        output = self.tflite_interpreter.get_tensor(output_details[0]["index"])
        import numpy as np
        tokens = np.argmax(output, axis=-1)
        text = self.tokenizer.decode(tokens[0], skip_special_tokens=True)
        return [{"generated_text": text}]

    def _load_pytorch(self, path: str):
        import torch
        from transformers import AutoTokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(path)
        model_file = os.path.join(path, "pytorch_model.bin")
        if not os.path.exists(model_file):
            model_file = os.path.join(path, "model.pt")
        self.model = torch.load(model_file, map_location="cpu")
        self.model.eval()
        self.generator = lambda prompt: self._pytorch_generate(prompt)

    def _pytorch_generate(self, prompt: str) -> List[Dict]:
        import torch
        inputs = self.tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model.generate(**inputs, max_new_tokens=256)
        text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return [{"generated_text": text}]

    def _load_fallback(self):
        for fallback in self.fallback_chain:
            try:
                saved_name = self.model_name
                self.model_name = fallback.get("name", "fallback")
                self.backend = ModelBackend(fallback.get("backend", "transformers"))
                self._load_model()
                if self.model_loaded:
                    print(f"Fallback model loaded: {self.model_name}")
                    return
            except Exception as e:
                print(f"Fallback {fallback} failed: {e}")
        self.model_name = saved_name if "saved_name" in dir() else self.model_name

    def add_fallback(self, name: str, backend: str = "transformers", config: Optional[Dict] = None):
        self.fallback_chain.append({"name": name, "backend": backend, **(config or {})})

    def warmup(self, sample_texts: Optional[List[str]] = None):
        if self.warmed_up:
            return
        texts = sample_texts or ["Hello, how are you?", "Tell me a story.", "What is 2+3?"]
        print("Warming up model...")
        for text in texts:
            try:
                self.generate_response(text, warmup=True)
            except Exception as e:
                print(f"Warmup failed for '{text}': {e}")
        self.warmed_up = True
        print("Warmup complete")

    def generate_response(self, prompt: str, language: str = "en", warmup: bool = False) -> AIResponse:
        start_time = time.time()

        if not self.model_loaded:
            return AIResponse(
                text="Sorry, the AI model is not available.",
                confidence=0.0,
                model_name="unavailable",
                model_version="",
                inference_time_ms=0,
                tokens_used=0
            )

        if not warmup:
            cached = self.cache.get(prompt, language)
            if cached:
                return AIResponse(
                    text=cached,
                    confidence=0.95,
                    model_name=self.model_name,
                    model_version=self.model_version,
                    inference_time_ms=0,
                    tokens_used=len(cached.split())
                )

        processed_prompt = self.preprocessor.preprocess(prompt, language)
        system_prompt = self._get_system_prompt(language)
        full_prompt = f"{system_prompt}\n\nUser: {processed_prompt}\n\nAssistant:"

        try:
            outputs = self.generator(full_prompt)
            response_text = outputs[0]['generated_text'].replace(full_prompt, "").strip()

            inference_time = int((time.time() - start_time) * 1000)
            tokens_used = len(self.tokenizer.encode(response_text)) if self.tokenizer else len(response_text.split())
            confidence = self._calculate_confidence(response_text, processed_prompt)

            processed = self.postprocessor.postprocess(response_text, confidence)

            if not warmup:
                self.cache.set(prompt, language, processed)
                self._record_profile("generate_response", inference_time, len(processed_prompt))

            return AIResponse(
                text=processed,
                confidence=confidence,
                model_name=self.model_name,
                model_version=self.model_version,
                inference_time_ms=inference_time,
                tokens_used=tokens_used,
                backend=self.backend.value
            )

        except Exception as e:
            inference_time = int((time.time() - start_time) * 1000)
            print(f"Generation error: {e}")
            return AIResponse(
                text="Sorry, I couldn't generate a response.",
                confidence=0.0,
                model_name=self.model_name,
                model_version=self.model_version,
                inference_time_ms=inference_time,
                tokens_used=0
            )

    def _calculate_confidence(self, response: str, prompt: str) -> float:
        if not response or len(response) < 3:
            return 0.0
        words = response.split()
        if len(words) < 2:
            return 0.3
        repeated_ratio = 1.0 - (len(set(w.lower() for w in words)) / max(1, len(words)))
        if repeated_ratio > 0.8:
            return 0.3
        length_score = min(1.0, len(response) / 100)
        return 0.7 + (length_score * 0.25)

    def _get_system_prompt(self, language: str) -> str:
        prompts = {
            "en": "You are a friendly children's companion robot. Respond in English. Keep responses short, friendly, and appropriate for children. Always be helpful and encouraging.",
            "de": "Du bist ein freundlicher Kinderbegleitroboter. Antworte auf Deutsch. Halte die Antworten kurz, freundlich und für Kinder geeignet. Sei immer hilfreich und ermutigend.",
            "fr": "Tu es un robot compagnon d'enfants amical. Réponds en français. Gardez les réponses courtes, amicales et adaptées aux enfants. Soyez toujours utile et encourageant.",
            "nl": "Je bent een vriendelijke kinderbegeleidingsrobot. Antwoord in het Nederlands. Houd antwoorden kort, vriendelijk en geschikt voor kinderen. Wees altijd behulpzaam en aanmoedigend.",
            "zh": "你是一个友好的儿童陪护机器人。用中文回答。保持回答简短、友好、适合儿童。始终乐于助人、鼓励他人。"
        }
        return prompts.get(language, prompts["en"])

    def classify_intent(self, text: str) -> IntentResult:
        intents = [
            ("play_story", ["story", "tell me", "read", "once upon"]),
            ("play_music", ["music", "song", "sing", "play"]),
            ("ask_question", ["what", "how", "why", "who", "where", "when"]),
            ("homework_help", ["homework", "help me", "problem", "solve", "math"]),
            ("greeting", ["hello", "hi", "good morning", "good afternoon", "good evening"]),
            ("emotion", ["happy", "sad", "angry", "lonely", "scared"]),
            ("control", ["turn on", "turn off", "open", "close", "start", "stop"]),
            ("unknown", [])
        ]

        text_lower = text.lower()
        best_intent = "unknown"
        best_score = 0.0
        entities = {}

        for intent, keywords in intents:
            if intent == "unknown":
                continue
            score = sum(1 for keyword in keywords if keyword in text_lower) / len(keywords) if keywords else 0
            if score > best_score:
                best_score = score
                best_intent = intent

        if best_score < 0.2:
            best_intent = "unknown"
            best_score = 0.0

        return IntentResult(intent=best_intent, confidence=best_score if best_score > 0 else 0.0, entities=entities)

    def extract_entities(self, text: str) -> Dict[str, str]:
        entities = {}
        story_keywords = ["snow white", "cinderella", "alice", "pinocchio", "little red", "goldilocks"]
        for keyword in story_keywords:
            if keyword in text.lower():
                entities["story_name"] = keyword
                break
        emotion_keywords = {
            "happy": ["happy", "glad", "joy", "excited"],
            "sad": ["sad", "unhappy", "depressed", "cry"],
            "angry": ["angry", "mad", "frustrated"],
            "scared": ["scared", "afraid", "frightened"]
        }
        for emotion, keywords in emotion_keywords.items():
            if any(k in text.lower() for k in keywords):
                entities["emotion"] = emotion
                break
        return entities

    async def batch_inference(self, prompts: List[str], language: str = "en") -> List[AIResponse]:
        results = []
        for prompt in prompts:
            results.append(self.generate_response(prompt, language))
        return results

    def _record_profile(self, operation: str, duration_ms: float, input_size: int):
        record = ProfileRecord(
            operation=operation,
            duration_ms=duration_ms,
            model_name=self.model_name,
            input_size=input_size,
            timestamp=time.time()
        )
        self.profiler.append(record)
        if len(self.profiler) > 1000:
            self.profiler = self.profiler[-500:]

    def get_profile(self, last_n: int = 100) -> List[ProfileRecord]:
        return self.profiler[-last_n:]

    def get_profile_summary(self) -> Dict:
        if not self.profiler:
            return {"total_calls": 0}
        recent = self.profiler[-100:]
        avg_time = sum(p.duration_ms for p in recent) / len(recent)
        return {
            "total_calls": len(self.profiler),
            "avg_inference_time_ms": round(avg_time, 2),
            "min_time_ms": round(min(p.duration_ms for p in recent), 2),
            "max_time_ms": round(max(p.duration_ms for p in recent), 2),
            "model": self.model_name,
            "warmed_up": self.warmed_up,
            "cache_size": self.cache.size()
        }

    def track_accuracy(self, expected: str, actual: str) -> bool:
        correct = expected.strip().lower() == actual.strip().lower()
        self.accuracy_tracker["total"] += 1
        if correct:
            self.accuracy_tracker["correct"] += 1
        return correct

    def get_accuracy(self) -> float:
        if self.accuracy_tracker["total"] == 0:
            return 0.0
        return self.accuracy_tracker["correct"] / self.accuracy_tracker["total"]

    def quantize_model(self, precision: str = "int8"):
        try:
            from transformers import AutoModelForCausalLM
            import torch
            if precision == "int8":
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name, load_in_8bit=True, device_map="auto"
                )
            elif precision == "int4":
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name, load_in_4bit=True, device_map="auto"
                )
            print(f"Model quantized to {precision}")
            return True
        except Exception as e:
            print(f"Quantization failed: {e}")
            return False

    def is_available(self) -> bool:
        return self.model_loaded

    def unload_model(self):
        if self.model:
            del self.model
            self.model = None
            self.generator = None
            self.tokenizer = None
            self.model_loaded = False
            self.warmed_up = False
            self.cache.clear()
            print("Model unloaded")
