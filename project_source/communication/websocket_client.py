import asyncio
import json
import time
import uuid
import zlib
import logging
from typing import Dict, Any, Optional, Callable, List, Union
from dataclasses import dataclass, field
import websockets
import websockets.exceptions

logger = logging.getLogger(__name__)


@dataclass
class WebSocketMessage:
    type: str
    topic: str
    payload: Dict[str, Any]
    timestamp: float = None
    message_id: str = ""
    correlation_id: str = ""
    compressed: bool = False
    encoding: str = "json"

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()
        if not self.message_id:
            self.message_id = str(uuid.uuid4())


@dataclass
class WebSocketStats:
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    reconnect_count: int = 0
    heartbeats_sent: int = 0
    heartbeats_received: int = 0
    last_connected: float = 0.0
    last_disconnected: float = 0.0
    uptime_seconds: float = 0.0
    avg_latency_ms: float = 0.0
    min_latency_ms: float = 0.0
    max_latency_ms: float = 0.0


class EventEmitter:
    def __init__(self):
        self._events: Dict[str, List[Callable]] = {}

    def on(self, event: str, handler: Callable):
        self._events.setdefault(event, []).append(handler)

    def off(self, event: str, handler: Optional[Callable] = None):
        if handler and event in self._events:
            self._events[event] = [h for h in self._events[event] if h != handler]
        elif event in self._events:
            del self._events[event]

    async def emit(self, event: str, *args, **kwargs):
        for handler in self._events.get(event, []):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(*args, **kwargs)
                else:
                    handler(*args, **kwargs)
            except Exception as e:
                logger.error(f"Event handler error on {event}: {e}")


class WebSocketClient(EventEmitter):
    def __init__(self, config: Dict):
        super().__init__()
        self.server_url = config.get("server_url", "wss://api.example.com/ws")
        self.reconnect_interval_ms = config.get("reconnect_interval_ms", 5000)
        self.reconnect_max_delay_ms = config.get("reconnect_max_delay_ms", 60000)
        self.reconnect_multiplier = config.get("reconnect_multiplier", 1.5)
        self.max_reconnect_attempts = config.get("max_reconnect_attempts", 0)
        self.heartbeat_interval_ms = config.get("heartbeat_interval_ms", 30000)
        self.heartbeat_timeout_ms = config.get("heartbeat_timeout_ms", 10000)
        self.auth_token = config.get("auth_token", "")
        self.auth_endpoint = config.get("auth_endpoint", "")
        self.use_compression = config.get("use_compression", False)
        self.compression_level = config.get("compression_level", 6)
        self.ping_interval = config.get("ping_interval", 20)
        self.ping_timeout = config.get("ping_timeout", 10)
        self.max_message_size = config.get("max_message_size", 2 ** 20)
        self.rooms: List[str] = config.get("rooms", [])

        self.connected = False
        self.websocket = None
        self._message_handlers: Dict[str, Callable] = {}
        self._wildcard_handlers: List[tuple] = []
        self._pending_requests: Dict[str, asyncio.Future] = {}
        self._latency_samples: List[float] = []
        self._latency_window = 50
        self._stats = WebSocketStats()
        self._reconnect_attempt = 0
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._reconnect_task: Optional[asyncio.Task] = None
        self._listener_task: Optional[asyncio.Task] = None
        self._monitor_task: Optional[asyncio.Task] = None

    async def connect(self):
        try:
            extra_headers = {}
            if self.auth_token:
                extra_headers["Authorization"] = f"Bearer {self.auth_token}"
            extra_headers["User-Agent"] = "RoboBuddyWebSocket/1.0"

            self.websocket = await websockets.connect(
                self.server_url,
                extra_headers=extra_headers,
                ping_interval=self.ping_interval,
                ping_timeout=self.ping_timeout,
                max_size=self.max_message_size,
                compression=None if not self.use_compression else "deflate",
            )
            self.connected = True
            self._stats.last_connected = time.time()
            self._stats.reconnect_count += 1
            self._reconnect_attempt = 0
            logger.info(f"Connected to WebSocket server: {self.server_url}")

            await self._join_rooms()

            self._listener_task = asyncio.create_task(self._listen())
            self._start_heartbeat()

            await self.emit("connected")

        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await self.emit("connect_error", error=str(e))
            await self._schedule_reconnect()

    async def disconnect(self, reason: str = "client_disconnect"):
        self.connected = False
        self._stats.last_disconnected = time.time()
        if self._stats.last_connected:
            self._stats.uptime_seconds = self._stats.last_disconnected - self._stats.last_connected

        for fut in self._pending_requests.values():
            if not fut.done():
                fut.set_exception(Exception("Connection closed"))
        self._pending_requests.clear()

        for task in [self._heartbeat_task, self._listener_task, self._monitor_task]:
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        if self.websocket:
            try:
                await self.websocket.close()
            except Exception:
                pass
            self.websocket = None

        logger.info(f"Disconnected from WebSocket server ({reason})")
        await self.emit("disconnected", reason=reason)

    async def _listen(self):
        try:
            async for message in self.websocket:
                await self._handle_message(message)
        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"WebSocket connection closed: {e.code}")
            self.connected = False
            await self.emit("connection_closed", code=e.code, reason=e.reason)
            await self._schedule_reconnect()
        except Exception as e:
            logger.error(f"WebSocket listen error: {e}")
            self.connected = False
            await self._schedule_reconnect()

    async def _handle_message(self, raw_message: Union[str, bytes]):
        try:
            data = raw_message
            if isinstance(data, bytes) and self.use_compression:
                try:
                    decompressor = zlib.decompressobj(-zlib.MAX_WBITS)
                    data = decompressor.decompress(data) + decompressor.flush()
                except zlib.error:
                    data = raw_message.decode("utf-8") if isinstance(raw_message, bytes) else raw_message

            if isinstance(data, bytes):
                data = data.decode("utf-8")

            msg = json.loads(data)

            self._stats.messages_received += 1
            self._stats.bytes_received += len(raw_message) if isinstance(raw_message, bytes) else len(data)

            message_id = msg.get("message_id", "")
            correlation_id = msg.get("correlation_id", "")
            topic = msg.get("topic", "")
            msg_type = msg.get("type", "message")
            payload = msg.get("payload", {})
            compressed = msg.get("compressed", False)
            encoding = msg.get("encoding", "json")

            # Handle acknowledgments
            if msg_type == "ack" and correlation_id in self._pending_requests:
                fut = self._pending_requests.pop(correlation_id)
                if not fut.done():
                    fut.set_result(payload)
                return

            # Handle heartbeat responses
            if msg_type == "pong":
                latency = time.time() - payload.get("sent", time.time())
                self._record_latency(latency * 1000)
                self._stats.heartbeats_received += 1
                return

            message_obj = WebSocketMessage(
                type=msg_type,
                topic=topic,
                payload=payload,
                message_id=message_id,
                correlation_id=correlation_id,
                compressed=compressed,
                encoding=encoding,
            )

            handled = False
            if topic in self._message_handlers:
                handler = self._message_handlers[topic]
                if asyncio.iscoroutinefunction(handler):
                    await handler(message_obj)
                else:
                    handler(message_obj)
                handled = True

            for pattern, handler in self._wildcard_handlers:
                if self._topic_matches(pattern, topic):
                    if asyncio.iscoroutinefunction(handler):
                        await handler(message_obj)
                    else:
                        handler(message_obj)
                    handled = True

            await self.emit("message", message=message_obj)
            if not handled:
                logger.debug(f"No handler for topic: {topic}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message: {e}")
        except Exception as e:
            logger.error(f"Message handling error: {e}")

    @staticmethod
    def _topic_matches(pattern: str, topic: str) -> bool:
        if pattern.endswith("/*"):
            return topic.startswith(pattern[:-1])
        if pattern.endswith("/**"):
            return topic.startswith(pattern[:-2])
        return pattern == topic

    def register_handler(self, topic: str, handler: Callable):
        if "*" in topic:
            self._wildcard_handlers.append((topic, handler))
        else:
            self._message_handlers[topic] = handler

    def unregister_handler(self, topic: str):
        self._message_handlers.pop(topic, None)
        self._wildcard_handlers = [(p, h) for p, h in self._wildcard_handlers if p != topic]

    async def send_message(self, topic: str, payload: Dict[str, Any],
                           message_type: str = "message",
                           correlation_id: str = "") -> bool:
        if not self.connected or not self.websocket:
            logger.warning("Not connected to WebSocket server")
            return False

        try:
            message_id = str(uuid.uuid4())
            msg = {
                "type": message_type,
                "topic": topic,
                "payload": payload,
                "message_id": message_id,
                "timestamp": time.time(),
            }
            if correlation_id:
                msg["correlation_id"] = correlation_id

            encoded = json.dumps(msg)

            if self.use_compression:
                compressor = zlib.compressobj(self.compression_level, zlib.DEFLATED, -zlib.MAX_WBITS)
                data = compressor.compress(encoded.encode()) + compressor.flush()
                msg["compressed"] = True
                encoded = json.dumps(msg)
                data = encoded.encode()
            else:
                data = encoded.encode()

            await self.websocket.send(data)
            self._stats.messages_sent += 1
            self._stats.bytes_sent += len(data)
            return True

        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return False

    async def request(self, topic: str, payload: Dict[str, Any],
                      timeout: float = 10.0) -> Optional[Dict[str, Any]]:
        correlation_id = str(uuid.uuid4())
        future = asyncio.get_event_loop().create_future()
        self._pending_requests[correlation_id] = future

        try:
            await self.send_message(topic, payload, "request", correlation_id)
            result = await asyncio.wait_for(future, timeout=timeout)
            return result
        except asyncio.TimeoutError:
            logger.warning(f"Request timeout for {topic}")
            self._pending_requests.pop(correlation_id, None)
            return None
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None

    async def _start_heartbeat(self):
        async def heartbeat_loop():
            while self.connected:
                try:
                    await self.send_message("heartbeat", {"sent": time.time()}, "ping")
                    self._stats.heartbeats_sent += 1
                    await asyncio.sleep(self.heartbeat_interval_ms / 1000)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.warning(f"Heartbeat failed: {e}")
                    break

        self._heartbeat_task = asyncio.create_task(heartbeat_loop())

    def _record_latency(self, latency_ms: float):
        self._latency_samples.append(latency_ms)
        if len(self._latency_samples) > self._latency_window:
            self._latency_samples.pop(0)

        if self._latency_samples:
            self._stats.avg_latency_ms = sum(self._latency_samples) / len(self._latency_samples)
            self._stats.min_latency_ms = min(self._latency_samples)
            self._stats.max_latency_ms = max(self._latency_samples)

    async def _schedule_reconnect(self):
        if self.max_reconnect_attempts > 0 and self._reconnect_attempt >= self.max_reconnect_attempts:
            logger.error("Max reconnect attempts reached")
            await self.emit("reconnect_failed")
            return

        delay = min(
            self.reconnect_interval_ms * (self.reconnect_multiplier ** self._reconnect_attempt),
            self.reconnect_max_delay_ms,
        ) / 1000

        self._reconnect_attempt += 1
        logger.info(f"Reconnecting in {delay:.1f}s (attempt {self._reconnect_attempt})")

        await self.emit("reconnecting", attempt=self._reconnect_attempt, delay=delay)
        await asyncio.sleep(delay)
        if not self.connected:
            await self.connect()

    async def _join_rooms(self):
        for room in self.rooms:
            await self.send_message("room", {"action": "join", "room": room}, "control")
            logger.debug(f"Joined room: {room}")

    async def join_room(self, room: str):
        if room not in self.rooms:
            self.rooms.append(room)
        await self.send_message("room", {"action": "join", "room": room}, "control")
        logger.info(f"Joined room: {room}")

    async def leave_room(self, room: str):
        self.rooms = [r for r in self.rooms if r != room]
        await self.send_message("room", {"action": "leave", "room": room}, "control")
        logger.info(f"Left room: {room}")

    async def send_binary(self, data: bytes, topic: str = ""):
        if not self.connected or not self.websocket:
            return False
        try:
            header = json.dumps({"type": "binary", "topic": topic, "timestamp": time.time()})
            await self.websocket.send(header.encode() + b"\n" + data)
            self._stats.messages_sent += 1
            self._stats.bytes_sent += len(data)
            return True
        except Exception as e:
            logger.error(f"Failed to send binary: {e}")
            return False

    def is_connected(self) -> bool:
        return self.connected

    def get_stats(self) -> WebSocketStats:
        if self.connected and self._stats.last_connected:
            self._stats.uptime_seconds = time.time() - self._stats.last_connected
        return self._stats

    async def reconnect_now(self):
        await self.disconnect(reason="manual_reconnect")
        await self.connect()

    def set_auth_token(self, token: str):
        self.auth_token = token
