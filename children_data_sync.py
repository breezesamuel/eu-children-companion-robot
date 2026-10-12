#!/usr/bin/env python3
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging
import hashlib
import json

logger = logging.getLogger("datasync")

@dataclass
class SyncRecord:
    device_id: str
    data_type: str
    data: Dict
    timestamp: str
    checksum: str
    size: int
    version: int

class DataSyncSystem:
    def __init__(self):
        self.sync_store: Dict[str, SyncRecord] = {}
        self.sync_queue: List[Dict] = []
        self.conflict_log: List[Dict] = []
        self.offline_queue: List[Dict] = []
        self.sync_strategy: str = "merge"
        self.sync_schedule: Dict = {"interval_minutes": 15, "auto_sync": True, "last_sync": None, "sync_windows": [{"start": "02:00", "end": "04:00"}, {"start": "14:00", "end": "15:00"}]}

    def push(self, device_id: str, data_type: str, data: Dict) -> Dict:
        ts = datetime.now().isoformat()
        data_str = json.dumps(data, ensure_ascii=False, default=str)
        checksum = hashlib.md5(data_str.encode()).hexdigest()
        key = f"{device_id}:{data_type}"
        version = 0

        if key in self.sync_store:
            version = self.sync_store[key].version + 1
            conflict = self._check_conflict(self.sync_store[key], data, ts)
            if conflict:
                return self._resolve_conflict(key, device_id, data_type, data, ts, checksum, version)

        record = SyncRecord(device_id=device_id, data_type=data_type, data=data,
                           timestamp=ts, checksum=checksum, size=len(data_str), version=version)
        self.sync_store[key] = record
        return {"success": True, "message": f"{data_type} 同步成功", "version": version, "checksum": checksum}

    def batch_push(self, batch: List[Dict]) -> Dict:
        results = []
        for item in batch:
            result = self.push(
                item.get("device_id", ""),
                item.get("data_type", ""),
                item.get("data", {})
            )
            results.append(result)
        return {"success": True, "batch_size": len(batch), "succeeded": sum(1 for r in results if r.get("success")), "failed": sum(1 for r in results if not r.get("success")), "results": results}

    def pull(self, device_id: str, data_type: str) -> Optional[Dict]:
        key = f"{device_id}:{data_type}"
        record = self.sync_store.get(key)
        if not record:
            return None
        return {"device_id": record.device_id, "data_type": record.data_type,
                "data": record.data, "timestamp": record.timestamp,
                "checksum": record.checksum, "version": record.version}

    def _check_conflict(self, existing: SyncRecord, new_data: Dict, new_ts: str) -> bool:
        existing_ts = datetime.fromisoformat(existing.timestamp)
        new_ts_dt = datetime.fromisoformat(new_ts)
        if (new_ts_dt - existing_ts).total_seconds() < 5 and existing.data != new_data:
            return True
        return False

    def _resolve_conflict(self, key: str, device_id: str, data_type: str, data: Dict,
                          ts: str, checksum: str, version: int) -> Dict:
        existing = self.sync_store.get(key)
        strategy = self.sync_strategy

        if strategy == "keep_local":
            return {"success": True, "message": "保留本地数据", "conflict_resolved": True}
        elif strategy == "keep_remote":
            record = SyncRecord(device_id=device_id, data_type=data_type, data=data,
                               timestamp=ts, checksum=checksum, size=len(json.dumps(data)), version=version)
            self.sync_store[key] = record
            return {"success": True, "message": "使用远程数据", "conflict_resolved": True}
        else:
            merged = {**(existing.data if existing else {}), **data}
            merged["_merged_at"] = ts
            record = SyncRecord(device_id=device_id, data_type=data_type, data=merged,
                               timestamp=ts, checksum=checksum, size=len(json.dumps(merged)), version=version)
            self.sync_store[key] = record
            self.conflict_log.append({"key": key, "resolved_at": ts, "strategy": "merge"})
            return {"success": True, "message": "冲突已合并", "conflict_resolved": True, "merged_fields": list(data.keys())}

    def enqueue(self, device_id: str, data_type: str, data: Dict) -> Dict:
        self.sync_queue.append({"device_id": device_id, "data_type": data_type,
                                "data": data, "timestamp": datetime.now().isoformat()})
        return {"success": True, "message": "已加入同步队列", "queue_size": len(self.sync_queue)}

    def sync_now(self) -> Dict:
        results = []
        for item in self.sync_queue:
            result = self.push(item["device_id"], item["data_type"], item["data"])
            results.append(result)
        count = len(self.sync_queue)
        self.sync_queue.clear()
        return {"success": True, "synced": count, "results": results}

    def get_sync_status(self, device_id: Optional[str] = None) -> List[Dict]:
        records = self.sync_store.values()
        if device_id:
            records = [r for r in records if r.device_id == device_id]
        return [{"device_id": r.device_id, "data_type": r.data_type,
                 "version": r.version, "timestamp": r.timestamp,
                 "size": r.size, "checksum": r.checksum[:8]}
                for r in records]

    def get_conflicts(self) -> List[Dict]:
        return self.conflict_log[-50:]

    def get_offline_queue(self) -> List[Dict]:
        return self.offline_queue

    def enqueue_offline(self, device_id: str, data_type: str, data: Dict) -> Dict:
        self.offline_queue.append({"device_id": device_id, "data_type": data_type,
                                   "data": data, "timestamp": datetime.now().isoformat()})
        return {"success": True, "message": "已加入离线队列", "queue_size": len(self.offline_queue)}

    def sync_offline(self) -> Dict:
        results = []
        for item in self.offline_queue:
            result = self.push(item["device_id"], item["data_type"], item["data"])
            results.append(result)
        count = len(self.offline_queue)
        self.offline_queue.clear()
        return {"success": True, "synced_offline": count, "results": results}

    def get_sync_schedule(self) -> Dict:
        return {
            **self.sync_schedule,
            "next_sync": "自动计算",
            "pending_items": len(self.sync_queue),
            "offline_items": len(self.offline_queue),
            "total_conflicts": len(self.conflict_log)
        }

    def update_sync_schedule(self, config: Dict) -> Dict:
        valid_keys = {"interval_minutes", "auto_sync", "sync_windows"}
        for k, v in config.items():
            if k in valid_keys:
                self.sync_schedule[k] = v
        return {"success": True, "message": "同步计划已更新", "schedule": self.sync_schedule}

    def get_sync_stats(self) -> Dict:
        keys = list(self.sync_store.keys())
        total_size = sum(r.size for r in self.sync_store.values())
        return {
            "total_records": len(self.sync_store),
            "data_types": len(set(k.split(":")[1] for k in keys)) if keys else 0,
            "devices_synced": len(set(k.split(":")[0] for k in keys)) if keys else 0,
            "total_storage_bytes": total_size,
            "queue_pending": len(self.sync_queue),
            "offline_pending": len(self.offline_queue),
            "total_conflicts": len(self.conflict_log),
            "last_sync": self.sync_schedule["last_sync"]
        }

    def set_sync_strategy(self, strategy: str) -> Dict:
        valid = ["keep_local", "keep_remote", "merge", "manual"]
        if strategy not in valid:
            return {"success": False, "message": f"无效策略，可选: {valid}"}
        self.sync_strategy = strategy
        return {"success": True, "message": f"同步策略已设置为 {strategy}"}

    def get_delta(self, device_id: str, data_type: str, since_version: int) -> Optional[Dict]:
        key = f"{device_id}:{data_type}"
        record = self.sync_store.get(key)
        if not record or record.version <= since_version:
            return None
        return {"device_id": record.device_id, "data_type": record.data_type,
                "data": record.data, "current_version": record.version,
                "delta_version": record.version - since_version}

data_sync = DataSyncSystem()
