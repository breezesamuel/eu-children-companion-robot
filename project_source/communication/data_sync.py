import asyncio
import json
import time
import uuid
import hashlib
import os
import threading
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
from datetime import datetime


class SyncDirection(Enum):
    LOCAL_TO_CLOUD = "local_to_cloud"
    CLOUD_TO_LOCAL = "cloud_to_local"
    BIDIRECTIONAL = "bidirectional"


class ConflictResolution(Enum):
    LAST_WRITE_WINS = "last_write_wins"
    MANUAL = "manual"
    MERGE = "merge"


class SyncStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CONFLICT = "conflict"
    SKIPPED = "skipped"


@dataclass
class SyncRecord:
    id: str
    device_id: str
    data_type: str
    payload: Dict[str, Any]
    timestamp: float
    sync_status: SyncStatus = SyncStatus.PENDING
    retry_count: int = 0
    version: int = 1
    checksum: str = ""
    direction: SyncDirection = SyncDirection.LOCAL_TO_CLOUD
    error_message: str = ""
    bytes_transferred: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    dependency_ids: List[str] = field(default_factory=list)


@dataclass
class SyncProgress:
    total: int = 0
    completed: int = 0
    failed: int = 0
    bytes_synced: int = 0
    estimated_total_bytes: int = 0
    current_item: str = ""
    percentage: float = 0.0


class SyncConflict:
    def __init__(self, local_record: SyncRecord, cloud_record: SyncRecord):
        self.local = local_record
        self.cloud = cloud_record
        self.resolution: Optional[SyncRecord] = None
        self.resolved = False

    def resolve_last_write_wins(self) -> SyncRecord:
        self.resolution = self.local if self.local.timestamp > self.cloud.timestamp else self.cloud
        self.resolved = True
        return self.resolution

    def resolve_manual(self, chosen: str) -> SyncRecord:
        self.resolution = self.local if chosen == "local" else self.cloud
        self.resolved = True
        return self.resolution

    def resolve_merge(self, merge_fn: Callable) -> SyncRecord:
        merged_payload = merge_fn(self.local.payload, self.cloud.payload)
        merged = SyncRecord(
            id=self.local.id,
            device_id=self.local.device_id,
            data_type=self.local.data_type,
            payload=merged_payload,
            timestamp=max(self.local.timestamp, self.cloud.timestamp),
            version=max(self.local.version, self.cloud.version) + 1,
            direction=SyncDirection.BIDIRECTIONAL
        )
        self.resolution = merged
        self.resolved = True
        return merged


class OfflineQueue:
    def __init__(self, persistence_path: str = "./sync_offline_queue.json"):
        self.persistence_path = persistence_path
        self.queue: List[SyncRecord] = []
        self._lock = threading.Lock()
        self._load()

    def _load(self):
        try:
            if os.path.exists(self.persistence_path):
                with open(self.persistence_path, 'r') as f:
                    data = json.load(f)
                    for item in data:
                        item["sync_status"] = SyncStatus(item.get("sync_status", "pending"))
                        item["direction"] = SyncDirection(item.get("direction", "local_to_cloud"))
                        self.queue.append(SyncRecord(**item))
        except Exception as e:
            print(f"Failed to load offline queue: {e}")

    def _save(self):
        try:
            with open(self.persistence_path, 'w') as f:
                data = [vars(r) for r in self.queue]
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Failed to persist offline queue: {e}")

    def enqueue(self, record: SyncRecord):
        with self._lock:
            self.queue.append(record)
            self._save()

    def dequeue(self) -> Optional[SyncRecord]:
        with self._lock:
            for i, r in enumerate(self.queue):
                if r.sync_status == SyncStatus.PENDING:
                    r.sync_status = SyncStatus.IN_PROGRESS
                    self._save()
                    return r
            return None

    def remove(self, record_id: str):
        with self._lock:
            self.queue = [r for r in self.queue if r.id != record_id]
            self._save()

    def update_status(self, record_id: str, status: SyncStatus, error: str = ""):
        with self._lock:
            for r in self.queue:
                if r.id == record_id:
                    r.sync_status = status
                    r.error_message = error
                    break
            self._save()

    def count(self, status: Optional[SyncStatus] = None) -> int:
        if status is None:
            return len(self.queue)
        return sum(1 for r in self.queue if r.sync_status == status)

    def clear(self):
        with self._lock:
            self.queue.clear()
            self._save()


class DataSyncManager:
    def __init__(self, websocket_client, mqtt_client, options: Optional[Dict] = None):
        self.ws = websocket_client
        self.mqtt = mqtt_client
        self.options = options or {}
        self.sync_queue: List[SyncRecord] = []
        self.offline_queue = OfflineQueue(self.options.get("offline_queue_path", "./sync_offline_queue.json"))
        self.conflict_resolution = ConflictResolution(self.options.get("conflict_resolution", "last_write_wins"))
        self.direction = SyncDirection(self.options.get("direction", "bidirectional"))
        self.batch_size = self.options.get("batch_size", 50)
        self.sync_interval_ms = self.options.get("sync_interval_ms", 5000)
        self.data_validators: Dict[str, Callable] = {}
        self.conflict_handlers: List[SyncConflict] = []
        self.progress = SyncProgress()
        self.encryption_key = self.options.get("encryption_key", "")
        self._sync_task = None
        self._periodic_task = None
        self._running = False
        self._analytics = {
            "total_synced": 0, "total_failed": 0, "total_bytes": 0,
            "sync_times": [], "errors_by_type": defaultdict(int)
        }
        self.selective_filters: Dict[str, List[str]] = {}
        self.listeners: Dict[str, List[Callable]] = defaultdict(list)

    def on(self, event: str, callback: Callable):
        self.listeners[event].append(callback)

    def _emit(self, event: str, data: Any = None):
        for cb in self.listeners.get(event, []):
            try:
                cb(data)
            except Exception as e:
                print(f"Listener error on {event}: {e}")

    def register_validator(self, data_type: str, validator_fn: Callable):
        self.data_validators[data_type] = validator_fn

    def set_selective_sync(self, data_type: str, fields: List[str]):
        self.selective_filters[data_type] = fields

    def _validate_data(self, record: SyncRecord) -> bool:
        validator = self.data_validators.get(record.data_type)
        if validator:
            try:
                return validator(record.payload)
            except Exception as e:
                print(f"Validation failed for {record.data_type}: {e}")
                return False
        return True

    def _compute_checksum(self, payload: Dict) -> str:
        raw = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()

    def _encrypt_payload(self, payload: Dict) -> Dict:
        if not self.encryption_key:
            return payload
        try:
            from cryptography.fernet import Fernet
            key = hashlib.sha256(self.encryption_key.encode()).digest()
            f = Fernet(key)
            encrypted = f.encrypt(json.dumps(payload, default=str).encode())
            return {"__encrypted": True, "data": encrypted.decode()}
        except ImportError:
            return payload

    def _decrypt_payload(self, payload: Dict) -> Dict:
        if not payload.get("__encrypted"):
            return payload
        try:
            from cryptography.fernet import Fernet
            key = hashlib.sha256(self.encryption_key.encode()).digest()
            f = Fernet(key)
            decrypted = f.decrypt(payload["data"].encode())
            return json.loads(decrypted.decode())
        except ImportError:
            return payload

    def create_sync_record(self, device_id: str, data_type: str,
                           payload: Dict[str, Any],
                           direction: SyncDirection = SyncDirection.LOCAL_TO_CLOUD,
                           dependencies: Optional[List[str]] = None) -> SyncRecord:
        record = SyncRecord(
            id=str(uuid.uuid4()),
            device_id=device_id,
            data_type=data_type,
            payload=payload,
            timestamp=time.time(),
            direction=direction,
            checksum=self._compute_checksum(payload),
            dependency_ids=dependencies or []
        )
        return record

    def add_to_sync_queue(self, device_id: str, data_type: str,
                          payload: Dict[str, Any],
                          direction: SyncDirection = SyncDirection.LOCAL_TO_CLOUD,
                          immediate: bool = False):
        record = self.create_sync_record(device_id, data_type, payload, direction)
        if not self._validate_data(record):
            record.sync_status = SyncStatus.FAILED
            record.error_message = "Data validation failed"
            self.sync_queue.append(record)
            self._analytics["total_failed"] += 1
            print(f"Validation failed for {data_type}")
            return

        # Apply selective sync filter
        if data_type in self.selective_filters:
            fields = self.selective_filters[data_type]
            record.payload = {k: v for k, v in payload.items() if k in fields}
            record.checksum = self._compute_checksum(record.payload)

        if self._is_connected():
            self.sync_queue.append(record)
        else:
            self.offline_queue.enqueue(record)

        if immediate and self._is_connected():
            asyncio.ensure_future(self._sync_record(record))

        self._emit("record-queued", record)

    async def process_sync_queue(self):
        self._running = True
        while self._running:
            # Process offline queue first
            while self.offline_queue.count(SyncStatus.PENDING) > 0:
                offline_record = self.offline_queue.dequeue()
                if offline_record:
                    if self._is_connected():
                        await self._sync_record(offline_record)
                    else:
                        break

            # Process in-memory queue in batches
            pending = [r for r in self.sync_queue if r.sync_status == SyncStatus.PENDING]
            batch = pending[:self.batch_size]
            if batch:
                self.progress.total = len(pending)
                self.progress.current_item = batch[0].data_type

                try:
                    results = await asyncio.gather(
                        *[self._sync_record(r) for r in batch],
                        return_exceptions=True
                    )
                    for record, result in zip(batch, results):
                        if isinstance(result, Exception):
                            record.retry_count += 1
                            if record.retry_count >= (self.options.get("max_retries", 3)):
                                record.sync_status = SyncStatus.FAILED
                                record.error_message = str(result)
                                self._analytics["total_failed"] += 1
                                self._analytics["errors_by_type"][type(result).__name__] += 1
                            self.offline_queue.enqueue(record)
                        else:
                            record.sync_status = SyncStatus.COMPLETED
                            self._analytics["total_synced"] += 1
                            self._analytics["total_bytes"] += record.bytes_transferred
                            self._analytics["sync_times"].append(time.time())
                            self.progress.completed += 1
                            self.progress.bytes_synced += record.bytes_transferred

                    self.sync_queue = [r for r in self.sync_queue if r.sync_status != SyncStatus.COMPLETED]
                    self.progress.percentage = (self.progress.completed / max(1, self.progress.total)) * 100
                    self._emit("batch-completed", self.progress)

                except Exception as e:
                    print(f"Batch sync error: {e}")

            await asyncio.sleep(self.sync_interval_ms / 1000)

    async def _sync_record(self, record: SyncRecord) -> bool:
        start_time = time.time()
        record.sync_status = SyncStatus.IN_PROGRESS

        # Check for dependency completion
        for dep_id in record.dependency_ids:
            dep = next((r for r in self.sync_queue if r.id == dep_id), None)
            if dep and dep.sync_status != SyncStatus.COMPLETED:
                await self._wait_for_dependency(dep_id)

        payload = self._encrypt_payload(record.payload)
        sync_packet = {
            "type": record.data_type,
            "payload": payload,
            "timestamp": record.timestamp,
            "version": record.version,
            "checksum": record.checksum,
            "device_id": record.device_id,
            "sync_id": record.id,
            "direction": record.direction.value
        }

        if record.direction in (SyncDirection.LOCAL_TO_CLOUD, SyncDirection.BIDIRECTIONAL):
            success = False
            if self.ws and hasattr(self.ws, 'is_connected') and self.ws.is_connected():
                success = await self._sync_via_websocket(record, sync_packet)
            elif self.mqtt and hasattr(self.mqtt, 'is_connected') and self.mqtt.is_connected():
                success = self._sync_via_mqtt(record, sync_packet)

            if success:
                record.bytes_transferred = len(json.dumps(sync_packet))
                elapsed = time.time() - start_time
                self._emit("record-synced", {"record": record, "duration_ms": elapsed * 1000})
                return True

        # Cloud to local sync
        if record.direction in (SyncDirection.CLOUD_TO_LOCAL, SyncDirection.BIDIRECTIONAL):
            try:
                cloud_data = await self._fetch_from_cloud(record)
                if cloud_data:
                    conflict = self._detect_conflict(record, cloud_data)
                    if conflict:
                        resolved = self._resolve_conflict(conflict)
                        if resolved:
                            record.payload = resolved.payload
                            record.version = resolved.version
                            record.sync_status = SyncStatus.COMPLETED
                            self._emit("conflict-resolved", conflict)
                            return True
                        record.sync_status = SyncStatus.CONFLICT
                        return False
                    record.payload = self._decrypt_payload(cloud_data.get("payload", {}))
                    record.sync_status = SyncStatus.COMPLETED
                    return True
            except Exception as e:
                record.error_message = str(e)
                return False

        return False

    async def _sync_via_websocket(self, record: SyncRecord, packet: Dict) -> bool:
        try:
            result = await self.ws.send_message(f"device/{record.device_id}/sync", packet)
            return bool(result)
        except Exception as e:
            record.error_message = str(e)
            return False

    def _sync_via_mqtt(self, record: SyncRecord, packet: Dict) -> bool:
        try:
            return self.mqtt.publish(f"robot/{record.device_id}/sync", packet)
        except Exception as e:
            record.error_message = str(e)
            return False

    async def _fetch_from_cloud(self, record: SyncRecord) -> Optional[Dict]:
        try:
            if self.ws and self.ws.is_connected():
                result = await self.ws.send_message(f"device/{record.device_id}/fetch", {
                    "data_type": record.data_type,
                    "since_timestamp": record.timestamp,
                    "device_id": record.device_id
                })
                return result
        except:
            pass
        return None

    async def _wait_for_dependency(self, dep_id: str, timeout: float = 10.0):
        start = time.time()
        while time.time() - start < timeout:
            dep = next((r for r in self.sync_queue if r.id == dep_id), None)
            if not dep or dep.sync_status == SyncStatus.COMPLETED:
                return
            await asyncio.sleep(0.1)

    def _detect_conflict(self, local: SyncRecord, cloud: Dict) -> Optional[SyncConflict]:
        cloud_record = SyncRecord(
            id=cloud.get("sync_id", str(uuid.uuid4())),
            device_id=cloud.get("device_id", local.device_id),
            data_type=cloud.get("type", local.data_type),
            payload=self._decrypt_payload(cloud.get("payload", {})),
            timestamp=cloud.get("timestamp", 0),
            version=cloud.get("version", 0),
            checksum=cloud.get("checksum", "")
        )

        if local.checksum != cloud_record.checksum:
            return SyncConflict(local, cloud_record)
        return None

    def _resolve_conflict(self, conflict: SyncConflict) -> Optional[SyncRecord]:
        if self.conflict_resolution == ConflictResolution.LAST_WRITE_WINS:
            return conflict.resolve_last_write_wins()
        elif self.conflict_resolution == ConflictResolution.MERGE:
            return conflict.resolve_merge(self._default_merge_fn)
        else:
            self.conflict_handlers.append(conflict)
            return None

    def _default_merge_fn(self, local_payload: Dict, cloud_payload: Dict) -> Dict:
        merged = dict(cloud_payload)
        merged.update(local_payload)
        merged["_merged_at"] = time.time()
        return merged

    def resolve_conflict_manually(self, conflict_index: int, choice: str) -> bool:
        if conflict_index < len(self.conflict_handlers):
            conflict = self.conflict_handlers[conflict_index]
            resolved = conflict.resolve_manual(choice)
            if resolved:
                self._emit("conflict-resolved", conflict)
                return True
        return False

    def get_pending_conflicts(self) -> List[SyncConflict]:
        return [c for c in self.conflict_handlers if not c.resolved]

    def _is_connected(self) -> bool:
        ws_ok = self.ws and hasattr(self.ws, 'is_connected') and self.ws.is_connected()
        mqtt_ok = self.mqtt and hasattr(self.mqtt, 'is_connected') and self.mqtt.is_connected()
        return ws_ok or mqtt_ok

    def sync_device_status(self, device_id: str, status: Dict[str, Any]):
        self.add_to_sync_queue(device_id, "device_status", status)

    def sync_learning_record(self, device_id: str, record: Dict[str, Any]):
        self.add_to_sync_queue(device_id, "learning_record", record)

    def sync_growth_record(self, device_id: str, record: Dict[str, Any]):
        self.add_to_sync_queue(device_id, "growth_record", record)

    def sync_command(self, device_id: str, command: Dict[str, Any]):
        self.add_to_sync_queue(device_id, "command", command, immediate=True)

    async def force_sync(self):
        await self.process_sync_queue()

    def start_periodic_sync(self, interval_ms: Optional[int] = None):
        if interval_ms:
            self.sync_interval_ms = interval_ms
        if self._periodic_task is None:
            loop = asyncio.get_event_loop()
            self._periodic_task = loop.create_task(self._periodic_sync_loop())

    async def _periodic_sync_loop(self):
        while self._running:
            if self._is_connected():
                await self.force_sync()
            await asyncio.sleep(self.sync_interval_ms / 1000)

    def on_connectivity_change(self, connected: bool):
        if connected:
            asyncio.ensure_future(self.force_sync())
            self._emit("reconnected")
        else:
            self._emit("disconnected")

    def get_queue_status(self) -> Dict[str, int]:
        status_counts = defaultdict(int)
        for record in self.sync_queue:
            status_counts[record.sync_status.value] += 1
        status_counts["offline"] = self.offline_queue.count()
        return dict(status_counts)

    def get_sync_progress(self) -> SyncProgress:
        return self.progress

    def get_analytics(self) -> Dict:
        analytics = dict(self._analytics)
        analytics["sync_times"] = analytics["sync_times"][-100:]
        analytics["errors_by_type"] = dict(analytics["errors_by_type"])
        analytics["queue_size"] = len(self.sync_queue)
        analytics["offline_queue_size"] = self.offline_queue.count()
        return analytics

    def clear_queue(self):
        self.sync_queue.clear()
        self.offline_queue.clear()
        self._emit("queue-cleared")

    def shutdown(self):
        self._running = False
        if self._periodic_task:
            self._periodic_task.cancel()
