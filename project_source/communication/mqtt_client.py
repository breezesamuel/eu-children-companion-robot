import json
import time
import ssl
import hashlib
import logging
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, field
from collections import deque
import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)

@dataclass
class MQTTMessage:
    topic: str
    payload: Dict[str, Any]
    qos: int = 1
    retain: bool = False
    timestamp: float = None
    message_id: int = 0

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()


@dataclass
class MQTTStats:
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    reconnect_count: int = 0
    publish_failures: int = 0
    last_connected: float = 0.0
    last_disconnected: float = 0.0
    uptime_seconds: float = 0.0
    current_latency_ms: float = 0.0


class MQTTClient:
    TOPIC_SEPARATOR = '/'
    SINGLE_LEVEL_WILDCARD = '+'
    MULTI_LEVEL_WILDCARD = '#'

    def __init__(self, client_id: str, config: Dict):
        self.client_id = client_id
        self.broker = config.get("broker", "mqtt.example.com")
        self.port = config.get("port", 1883)
        self.username = config.get("username", "robot_user")
        self.password = config.get("password", "secure_password")
        self.keepalive = config.get("keepalive", 60)
        self.qos = min(max(config.get("qos", 1), 0), 2)
        self.use_tls = config.get("use_tls", False)
        self.tls_ca_cert = config.get("tls_ca_cert")
        self.tls_cert = config.get("tls_cert")
        self.tls_key = config.get("tls_key")
        self.tls_insecure = config.get("tls_insecure", False)
        self.clean_session = config.get("clean_session", True)
        self.will_topic = config.get("will_topic")
        self.will_payload = config.get("will_payload")
        self.will_qos = config.get("will_qos", 1)
        self.will_retain = config.get("will_retain", False)
        self.reconnect_delay_min = config.get("reconnect_delay_min", 1)
        self.reconnect_delay_max = config.get("reconnect_delay_max", 120)
        self.reconnect_delay_growth = config.get("reconnect_delay_growth", 2.0)
        self.max_reconnect_attempts = config.get("max_reconnect_attempts", 0)
        self.offline_queue_size = config.get("offline_queue_size", 1000)
        self.offline_queue_interval = config.get("offline_queue_interval", 1.0)

        self.connected = False
        self._message_handlers: Dict[str, Callable] = {}
        self._wildcard_handlers: List[tuple] = []
        self._topic_handlers: Dict[str, List[Callable]] = {}
        self._stats = MQTTStats()
        self._reconnect_attempt = 0
        self._offline_queue = deque(maxlen=self.offline_queue_size)
        self._subscriptions_to_restore: List[tuple] = []
        self._publish_callbacks: Dict[int, Callable] = {}
        self._message_id_counter = 0

        protocol = mqtt.MQTTv311
        transport = config.get("transport", "tcp")
        self.client = mqtt.Client(
            client_id=client_id,
            clean_session=self.clean_session,
            protocol=protocol,
            transport=transport,
        )

        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)

        if self.use_tls:
            tls_params = {}
            if self.tls_ca_cert:
                tls_params["ca_certs"] = self.tls_ca_cert
            if self.tls_cert:
                tls_params["certfile"] = self.tls_cert
            if self.tls_key:
                tls_params["keyfile"] = self.tls_key
            if self.tls_insecure:
                tls_params["cert_reqs"] = ssl.CERT_NONE
            self.client.tls_set(**tls_params)

        if self.will_topic and self.will_payload:
            self.client.will_set(
                self.will_topic,
                json.dumps(self.will_payload),
                self.will_qos,
                self.will_retain,
            )

        self._setup_callbacks()

    def _setup_callbacks(self):
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        self.client.on_publish = self._on_publish
        self.client.on_subscribe = self._on_subscribe
        self.client.on_unsubscribe = self._on_unsubscribe
        self.client.on_log = self._on_log

    def _on_connect(self, client, userdata, flags, rc):
        rc_messages = {
            0: "Connection accepted",
            1: "Incorrect protocol version",
            2: "Invalid client identifier",
            3: "Server unavailable",
            4: "Bad username or password",
            5: "Not authorized",
        }
        if rc == 0:
            self.connected = True
            self._stats.last_connected = time.time()
            self._stats.reconnect_count += 1
            self._reconnect_attempt = 0
            logger.info(f"Connected to MQTT broker: {self.broker}:{self.port}")

            for topic, qos in self._subscriptions_to_restore:
                self.client.subscribe(topic, qos)
                logger.debug(f"Restored subscription: {topic}")

            self._flush_offline_queue()
        else:
            logger.error(f"MQTT connection failed: {rc_messages.get(rc, f'Unknown code {rc}')}")

    def _on_disconnect(self, client, userdata, rc):
        self.connected = False
        self._stats.last_disconnected = time.time()
        if self._stats.last_connected:
            self._stats.uptime_seconds = self._stats.last_disconnected - self._stats.last_connected

        if rc != 0:
            logger.warning(f"Unexpected disconnect (rc={rc}), scheduling reconnect")
            self._schedule_reconnect()
        else:
            logger.info("Disconnected from MQTT broker")

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            payload = {"_raw": msg.payload.hex()}

        message = MQTTMessage(
            topic=msg.topic,
            payload=payload,
            qos=msg.qos,
            retain=msg.retain,
            message_id=msg.mid,
        )
        self._stats.messages_received += 1
        self._stats.bytes_received += len(msg.payload)

        handled = False

        if msg.topic in self._topic_handlers:
            for handler in self._topic_handlers[msg.topic]:
                try:
                    handler(message)
                except Exception as e:
                    logger.error(f"Handler error for {msg.topic}: {e}")
            handled = True

        for pattern, handler in self._wildcard_handlers:
            if self._topic_matches(pattern, msg.topic):
                try:
                    handler(message)
                except Exception as e:
                    logger.error(f"Wildcard handler error for {pattern}: {e}")
                handled = True

        if not handled:
            logger.debug(f"No handler for topic: {msg.topic}")

    @staticmethod
    def _topic_matches(pattern: str, topic: str) -> bool:
        pattern_parts = pattern.split('/')
        topic_parts = topic.split('/')

        for i, p in enumerate(pattern_parts):
            if p == MQTTClient.MULTI_LEVEL_WILDCARD:
                return True
            if i >= len(topic_parts):
                return False
            if p == MQTTClient.SINGLE_LEVEL_WILDCARD:
                continue
            if p != topic_parts[i]:
                return False

        return len(pattern_parts) == len(topic_parts)

    def _on_publish(self, client, userdata, mid):
        logger.debug(f"Message published, mid: {mid}")
        cb = self._publish_callbacks.pop(mid, None)
        if cb:
            try:
                cb()
            except Exception as e:
                logger.error(f"Publish callback error: {e}")

    def _on_subscribe(self, client, userdata, mid, granted_qos):
        logger.debug(f"Subscribed mid={mid}, qos={granted_qos}")

    def _on_unsubscribe(self, client, userdata, mid):
        logger.debug(f"Unsubscribed mid={mid}")

    def _on_log(self, client, userdata, level, buf):
        if level <= mqtt.MQTT_LOG_WARNING:
            logger.debug(f"MQTT log: {buf}")

    def connect(self) -> bool:
        try:
            self.client.connect(self.broker, self.port, self.keepalive)
            self.client.loop_start()
            return True
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            self._schedule_reconnect()
            return False

    def _schedule_reconnect(self):
        if self.max_reconnect_attempts > 0 and self._reconnect_attempt >= self.max_reconnect_attempts:
            logger.error("Max reconnect attempts reached, giving up")
            return

        delay = min(
            self.reconnect_delay_min * (self.reconnect_delay_growth ** self._reconnect_attempt),
            self.reconnect_delay_max,
        )
        self._reconnect_attempt += 1
        logger.info(f"Reconnecting in {delay:.1f}s (attempt {self._reconnect_attempt})")

        def _reconnect():
            time.sleep(delay)
            if not self.connected:
                self.connect()

        import threading
        t = threading.Thread(target=_reconnect, daemon=True)
        t.start()

    def disconnect(self, force: bool = False):
        self.client.loop_stop()
        if force:
            self.client.disconnect()
        else:
            self.client.disconnect()
        self.connected = False
        logger.info("Disconnected from MQTT broker")

    def register_handler(self, topic: str, handler: Callable) -> None:
        if MQTTClient.SINGLE_LEVEL_WILDCARD in topic or MQTTClient.MULTI_LEVEL_WILDCARD in topic:
            self._wildcard_handlers.append((topic, handler))
        else:
            self._topic_handlers.setdefault(topic, []).append(handler)

        if topic not in [s[0] for s in self._subscriptions_to_restore]:
            self._subscriptions_to_restore.append((topic, self.qos))

        if self.connected:
            self.client.subscribe(topic, self.qos)
            logger.info(f"Subscribed to topic: {topic}")

    def unregister_handler(self, topic: str, handler: Optional[Callable] = None) -> None:
        if topic in self._topic_handlers:
            if handler:
                try:
                    self._topic_handlers[topic].remove(handler)
                except ValueError:
                    pass
                if not self._topic_handlers[topic]:
                    del self._topic_handlers[topic]
            else:
                del self._topic_handlers[topic]

        self._wildcard_handlers = [(p, h) for p, h in self._wildcard_handlers if not (p == topic and (handler is None or h == handler))]
        self._subscriptions_to_restore = [(t, q) for t, q in self._subscriptions_to_restore if t != topic]

        if self.connected:
            self.client.unsubscribe(topic)
            logger.info(f"Unsubscribed from topic: {topic}")

    def publish(self, topic: str, payload: Dict[str, Any], qos: Optional[int] = None,
                retain: bool = False, callback: Optional[Callable] = None) -> bool:
        if not self.connected:
            if len(self._offline_queue) < self.offline_queue_size:
                self._offline_queue.append((topic, payload, qos or self.qos, retain, callback))
                logger.debug(f"Queued offline message for {topic}")
            else:
                logger.warning(f"Offline queue full, dropping message for {topic}")
            return False

        try:
            payload_str = json.dumps(payload)
            info = self.client.publish(topic, payload_str, qos=qos or self.qos, retain=retain)
            self._stats.messages_sent += 1
            self._stats.bytes_sent += len(payload_str)
            if callback and info.mid:
                self._publish_callbacks[info.mid] = callback
            return True
        except Exception as e:
            self._stats.publish_failures += 1
            logger.error(f"Failed to publish message: {e}")
            return False

    def publish_raw(self, topic: str, raw_bytes: bytes, qos: Optional[int] = None,
                    retain: bool = False) -> bool:
        if not self.connected:
            return False
        try:
            info = self.client.publish(topic, raw_bytes, qos=qos or self.qos, retain=retain)
            self._stats.messages_sent += 1
            self._stats.bytes_sent += len(raw_bytes)
            return True
        except Exception as e:
            logger.error(f"Failed to publish raw message: {e}")
            return False

    def _flush_offline_queue(self):
        while self._offline_queue and self.connected:
            topic, payload, qos, retain, callback = self._offline_queue.popleft()
            self.publish(topic, payload, qos, retain, callback)
            time.sleep(self.offline_queue_interval)

    def subscribe(self, topic: str, qos: Optional[int] = None):
        q = qos or self.qos
        self._subscriptions_to_restore.append((topic, q))
        if self.connected:
            self.client.subscribe(topic, q)
            logger.info(f"Subscribed to topic: {topic}")

    def unsubscribe(self, topic: str):
        self._subscriptions_to_restore = [(t, q) for t, q in self._subscriptions_to_restore if t != topic]
        if self.connected:
            self.client.unsubscribe(topic)
            logger.info(f"Unsubscribed from topic: {topic}")

    def is_connected(self) -> bool:
        return self.connected

    def get_stats(self) -> MQTTStats:
        if self.connected and self._stats.last_connected:
            self._stats.uptime_seconds = time.time() - self._stats.last_connected
        return self._stats

    def get_pending_messages(self) -> int:
        return len(self._offline_queue)

    def clear_offline_queue(self):
        self._offline_queue.clear()
        logger.info("Offline queue cleared")

    def loop_forever(self):
        self.client.loop_forever()

    @staticmethod
    def create_device_topic(device_id: str, sub_topic: str = "") -> str:
        base = f"robobuddy/device/{device_id}"
        return f"{base}/{sub_topic}" if sub_topic else base

    @staticmethod
    def create_sensor_topic(device_id: str, sensor: str) -> str:
        return f"robobuddy/device/{device_id}/sensor/{sensor}"

    @staticmethod
    def create_command_topic(device_id: str) -> str:
        return f"robobuddy/device/{device_id}/command"

    @staticmethod
    def create_status_topic(device_id: str) -> str:
        return f"robobuddy/device/{device_id}/status"

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
