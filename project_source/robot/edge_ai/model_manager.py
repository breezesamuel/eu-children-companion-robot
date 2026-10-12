import os
import json
import time
import shutil
import hashlib
import platform
import threading
from pathlib import Path
from typing import Dict, Optional, List, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
from collections import OrderedDict


class EvictionPolicy(Enum):
    LRU = "lru"
    LFU = "lfu"
    FIFO = "fifo"


class ModelType(Enum):
    LLM = "llm"
    VISION = "vision"
    AUDIO = "audio"
    MULTIMODAL = "multimodal"
    EMBEDDING = "embedding"


@dataclass
class ModelInfo:
    name: str
    path: str
    type: str
    version: str
    size_mb: int
    description: str
    supported_languages: List[str]
    backend: str = "transformers"
    checksum: str = ""
    requires_gpu: bool = False
    min_memory_mb: int = 512
    accuracy: float = 0.0
    download_url: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = 0.0
    updated_at: float = 0.0


@dataclass
class ModelLoadProgress:
    model_name: str
    status: str
    progress: float
    message: str
    started_at: float
    completed_at: Optional[float] = None


class ModelCache:
    def __init__(self, max_size_mb: int = 2048, eviction_policy: EvictionPolicy = EvictionPolicy.LRU):
        self.max_size_mb = max_size_mb
        self.eviction_policy = eviction_policy
        self._cache = OrderedDict()
        self._access_counts = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            if self.eviction_policy == EvictionPolicy.LRU:
                self._cache.move_to_end(key)
            elif self.eviction_policy == EvictionPolicy.LFU:
                self._access_counts[key] = self._access_counts.get(key, 0) + 1
            return self._cache[key]

    def put(self, key: str, value: Any, size_mb: int):
        with self._lock:
            current_size = sum(s for _, (_, s) in self._cache.items())
            while current_size + size_mb > self.max_size_mb and self._cache:
                if self.eviction_policy == EvictionPolicy.LRU:
                    evicted_key, _ = self._cache.popitem(last=False)
                elif self.eviction_policy == EvictionPolicy.LFU:
                    evicted_key = min(self._access_counts, key=lambda k: self._access_counts[k])
                    self._cache.pop(evicted_key)
                    self._access_counts.pop(evicted_key, None)
                else:
                    evicted_key = next(iter(self._cache))
                    self._cache.pop(evicted_key)
                current_size = sum(s for _, (_, s) in self._cache.items())
            self._cache[key] = (value, size_mb)


class ModelManager:
    def __init__(self, config: Dict):
        self.config = config
        self.model_dir = Path(config.get("model_path", "./models/"))
        self.models: Dict[str, ModelInfo] = {}
        self.active_model: Optional[str] = None
        self.loaded_models: Dict[str, Any] = {}
        self.model_loaders: Dict[str, Callable] = {}
        self.load_progress: Dict[str, ModelLoadProgress] = {}
        self.cache = ModelCache(
            max_size_mb=config.get("cache_size_mb", 2048),
            eviction_policy=EvictionPolicy(config.get("eviction_policy", "lru"))
        )
        self.health_status: Dict[str, bool] = {}
        self.rollback_history: List[Dict] = []
        self.memory_usage: Dict[str, float] = {}
        self.concurrent_limit = config.get("concurrent_limit", 2)
        self._active_inferences = 0
        self._lock = threading.RLock()
        self._load_models()

    def _load_models(self):
        if not self.model_dir.exists():
            self.model_dir.mkdir(parents=True)
            return
        config_path = self.model_dir / "models.json"
        if config_path.exists():
            with open(config_path, 'r') as f:
                models_data = json.load(f)
                for name, info in models_data.items():
                    if "created_at" not in info:
                        info["created_at"] = 0
                    if "updated_at" not in info:
                        info["updated_at"] = 0
                    self.models[name] = ModelInfo(**info)
        if self.models:
            self.active_model = list(self.models.keys())[0]

    def _save_models(self):
        config_path = self.model_dir / "models.json"
        with open(config_path, 'w') as f:
            models_dict = {}
            for name, info in self.models.items():
                d = vars(info).copy()
                d.pop('_field_defaults', None)
                models_dict[name] = d
            json.dump(models_dict, f, indent=2)

    def register_loader(self, model_type: str, loader_fn: Callable):
        self.model_loaders[model_type] = loader_fn

    def add_model(self, name: str, path: str, type: str = "llm",
                  version: str = "1.0", description: str = "",
                  supported_languages: List[str] = None,
                  backend: str = "transformers",
                  download_url: str = "",
                  metadata: Optional[Dict] = None) -> bool:
        with self._lock:
            if name in self.models:
                return False
            model_path = Path(path)
            size_mb = 0
            checksum = ""
            if model_path.exists():
                size_mb = sum(f.stat().st_size for f in model_path.rglob('*')) // (1024 * 1024)
                checksum = self._compute_checksum(model_path)
            self.models[name] = ModelInfo(
                name=name, path=str(model_path), type=type, version=version,
                size_mb=size_mb, description=description,
                supported_languages=supported_languages or ["en"],
                backend=backend, checksum=checksum, download_url=download_url,
                metadata=metadata or {}, created_at=time.time(), updated_at=time.time()
            )
            self._save_models()
            return True

    def remove_model(self, name: str) -> bool:
        with self._lock:
            if name not in self.models:
                return False
            if name in self.loaded_models:
                self.unload_model(name)
            model_info = self.models[name]
            model_path = Path(model_info.path)
            if model_path.exists() and model_path.is_dir():
                shutil.rmtree(model_path)
            del self.models[name]
            if self.active_model == name:
                self.active_model = list(self.models.keys())[0] if self.models else None
            self._save_models()
            return True

    def activate_model(self, name: str) -> bool:
        with self._lock:
            if name not in self.models:
                return False
            self.active_model = name
            return True

    def get_active_model(self) -> Optional[ModelInfo]:
        if not self.active_model:
            return None
        return self.models.get(self.active_model)

    def list_models(self) -> List[ModelInfo]:
        return list(self.models.values())

    def update_model_version(self, name: str, new_version: str) -> bool:
        with self._lock:
            if name not in self.models:
                return False
            old_version = self.models[name].version
            self.models[name].version = new_version
            self.models[name].updated_at = time.time()
            self.rollback_history.append({
                "model": name, "from_version": old_version,
                "to_version": new_version, "timestamp": time.time()
            })
            self._save_models()
            return True

    def rollback_model(self, name: str) -> bool:
        with self._lock:
            rollbacks = [r for r in self.rollback_history if r["model"] == name]
            if not rollbacks:
                return False
            last = rollbacks[-1]
            self.models[name].version = last["from_version"]
            self.models[name].updated_at = time.time()
            self._save_models()
            return True

    def load_model(self, name: str) -> bool:
        with self._lock:
            if name not in self.models:
                return False
            if name in self.loaded_models:
                return True
            if len(self.loaded_models) >= self.concurrent_limit:
                oldest = min(self.loaded_models, key=lambda k: self.loaded_models[k].get("_loaded_at", 0))
                self.unload_model(oldest)
            progress = ModelLoadProgress(
                model_name=name, status="loading", progress=0.0,
                message="Starting model load...", started_at=time.time()
            )
            self.load_progress[name] = progress
            try:
                model_info = self.models[name]
                loader = self.model_loaders.get(model_info.type)
                model_instance = loader(model_info) if loader else self._default_loader(model_info)
                self.loaded_models[name] = {
                    "instance": model_instance, "loaded_at": time.time(),
                    "memory_mb": self._estimate_memory(model_info)
                }
                progress.status = "loaded"
                progress.progress = 1.0
                progress.message = "Model loaded successfully"
                progress.completed_at = time.time()
                self.health_status[name] = True
                return True
            except Exception as e:
                progress.status = "failed"
                progress.message = str(e)
                progress.completed_at = time.time()
                self.health_status[name] = False
                return False

    def _default_loader(self, model_info: ModelInfo) -> Dict:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        tokenizer = AutoTokenizer.from_pretrained(model_info.path)
        model = AutoModelForCausalLM.from_pretrained(
            model_info.path, device_map="auto", load_in_4bit=True
        )
        return {"tokenizer": tokenizer, "model": model}

    def unload_model(self, name: str):
        with self._lock:
            if name in self.loaded_models:
                instance = self.loaded_models[name].get("instance", {})
                if isinstance(instance, dict):
                    instance.pop("model", None)
                    instance.pop("tokenizer", None)
                del self.loaded_models[name]
                self.health_status.pop(name, None)
                self.memory_usage.pop(name, None)

    def get_model_by_language(self, language: str) -> Optional[ModelInfo]:
        for model in self.models.values():
            if language in model.supported_languages:
                return model
        return None

    def _compute_checksum(self, path: Path) -> str:
        try:
            hasher = hashlib.sha256()
            for file_path in sorted(path.rglob('*')):
                if file_path.is_file():
                    with open(file_path, 'rb') as f:
                        while chunk := f.read(8192):
                            hasher.update(chunk)
            return hasher.hexdigest()
        except:
            return ""

    def _estimate_memory(self, model_info: ModelInfo) -> float:
        base = model_info.size_mb * 1.2
        return base * 1.5 if model_info.requires_gpu else base

    async def download_model(self, name: str, url: str = None,
                             on_progress: Optional[Callable] = None) -> bool:
        import aiohttp
        import aiofiles
        target_url = url or self.models.get(name, {}).get("download_url", "")
        if not target_url:
            return False
        dest_path = self.model_dir / name
        dest_path.mkdir(parents=True, exist_ok=True)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(target_url) as response:
                    total = int(response.headers.get('content-length', 0))
                    downloaded = 0
                    chunk_size = 8192
                    while True:
                        chunk = await response.content.read(chunk_size)
                        if not chunk:
                            break
                        downloaded += len(chunk)
                        if on_progress:
                            on_progress(name, downloaded, total)
                    model_meta = {"download_url": target_url, "downloaded_size": downloaded}
                    meta_path = dest_path / "download_meta.json"
                    async with aiofiles.open(meta_path, 'w') as f:
                        await f.write(json.dumps(model_meta))
                    return True
        except Exception as e:
            print(f"Download failed for {name}: {e}")
            return False

    def resume_download(self, name: str, url: str = None) -> bool:
        dest_path = self.model_dir / name
        meta_path = dest_path / "download_meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                url = url or meta.get("download_url", "")
            except:
                pass
        return False

    def check_model_health(self, name: str) -> Dict:
        info = self.models.get(name)
        if not info:
            return {"healthy": False, "reason": "not_found"}
        issues = []
        model_path = Path(info.path)
        if not model_path.exists():
            issues.append("path_not_found")
        if not info.checksum:
            issues.append("no_checksum")
        elif self._compute_checksum(model_path) != info.checksum:
            issues.append("checksum_mismatch")
        loaded = name in self.loaded_models
        return {"healthy": len(issues) == 0 and loaded, "issues": issues, "loaded": loaded}

    def get_memory_usage(self) -> Dict:
        result = {}
        for name, data in self.loaded_models.items():
            result[name] = data.get("memory_mb", 0)
        result["total_mb"] = sum(result.values())
        result["total_gb"] = round(result["total_mb"] / 1024, 2)
        result["available_models"] = len(self.loaded_models)
        return result

    def select_hardware_aware_model(self, task: str, language: str = "en") -> Optional[str]:
        is_gpu = platform.machine().lower() in ("amd64", "x86_64") and self.config.get("use_gpu", False)
        candidates = []
        for name, info in self.models.items():
            if language not in info.supported_languages:
                continue
            if is_gpu and not info.requires_gpu:
                continue
            if not is_gpu and info.requires_gpu:
                continue
            candidates.append((name, info.size_mb))
        candidates.sort(key=lambda x: x[1])
        return candidates[0][0] if candidates else None

    def get_load_progress(self, name: str) -> Optional[ModelLoadProgress]:
        return self.load_progress.get(name)

    def get_stats(self) -> Dict:
        return {
            "total_models": len(self.models),
            "loaded_models": len(self.loaded_models),
            "active_model": self.active_model,
            "cache_size_mb": self.cache.max_size_mb,
            "concurrent_limit": self.concurrent_limit,
            "healthy_models": sum(1 for s in self.health_status.values() if s),
            "rollback_count": len(self.rollback_history),
            "memory": self.get_memory_usage()
        }
