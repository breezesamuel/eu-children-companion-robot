#!/usr/bin/env python3
"""File upload support for avatars and learning materials."""

import hashlib
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger("file_upload")

UPLOAD_DIR = Path(os.environ.get("ROBOT_UPLOAD_DIR",
                                  os.path.join(os.path.dirname(__file__), "uploads")))
MAX_FILE_SIZE = int(os.environ.get("ROBOT_MAX_UPLOAD_SIZE", 10 * 1024 * 1024))  # 10MB
ALLOWED_TYPES = {
    "image": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    "document": [".pdf", ".doc", ".docx", ".txt", ".md"],
    "audio": [".mp3", ".wav", ".ogg", ".m4a"],
    "video": [".mp4", ".webm", ".mov"],
}

class FileManager:
    def __init__(self):
        self._files: Dict[str, Dict] = {}
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    def _get_category(self, ext: str) -> str:
        for cat, exts in ALLOWED_TYPES.items():
            if ext.lower() in exts:
                return cat
        return "other"

    def save(self, filename: str, content: bytes, user_id: str = "anonymous",
             metadata: dict = None) -> Optional[Dict]:
        ext = Path(filename).suffix.lower()
        category = self._get_category(ext)

        if len(content) > MAX_FILE_SIZE:
            logger.warning(f"File too large: {len(content)} > {MAX_FILE_SIZE}")
            return None

        file_id = str(uuid.uuid4())[:12]
        safe_name = f"{file_id}{ext}"
        subdir = UPLOAD_DIR / category
        subdir.mkdir(exist_ok=True)
        filepath = subdir / safe_name

        try:
            filepath.write_bytes(content)
            checksum = hashlib.sha256(content).hexdigest()[:16]
            record = {
                "file_id": file_id,
                "original_name": filename,
                "stored_name": safe_name,
                "path": str(filepath.relative_to(UPLOAD_DIR.parent)),
                "category": category,
                "size_bytes": len(content),
                "checksum": checksum,
                "user_id": user_id,
                "mime_type": self._guess_mime(ext),
                "metadata": metadata or {},
                "created_at": datetime.now().isoformat(),
                "downloads": 0,
            }
            self._files[file_id] = record
            return record
        except OSError as e:
            logger.error(f"Failed to save file {filename}: {e}")
            return None

    def _guess_mime(self, ext: str) -> str:
        return {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
            ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
            ".pdf": "application/pdf", ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt": "text/plain", ".md": "text/markdown",
            ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
            ".mp4": "video/mp4", ".webm": "video/webm",
        }.get(ext, "application/octet-stream")

    def get(self, file_id: str) -> Optional[Dict]:
        return self._files.get(file_id)

    def get_path(self, file_id: str) -> Optional[Path]:
        record = self._files.get(file_id)
        if not record:
            return None
        path = UPLOAD_DIR / record["category"] / record["stored_name"]
        if path.exists():
            return path
        return None

    def delete(self, file_id: str) -> bool:
        record = self._files.pop(file_id, None)
        if not record:
            return False
        path = UPLOAD_DIR / record["category"] / record["stored_name"]
        try:
            if path.exists():
                path.unlink()
            return True
        except OSError as e:
            logger.error(f"Failed to delete file {file_id}: {e}")
            return False

    def list_by_user(self, user_id: str) -> List[Dict]:
        return [r for r in self._files.values() if r["user_id"] == user_id]

    def get_stats(self) -> Dict:
        by_cat = {}
        for r in self._files.values():
            cat = r["category"]
            by_cat[cat] = by_cat.get(cat, 0) + 1
        return {
            "total_files": len(self._files),
            "total_bytes": sum(r["size_bytes"] for r in self._files.values()),
            "by_category": by_cat,
        }

    def record_download(self, file_id: str):
        record = self._files.get(file_id)
        if record:
            record["downloads"] += 1

file_manager = FileManager()
