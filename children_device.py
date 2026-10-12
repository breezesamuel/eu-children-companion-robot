#!/usr/bin/env python3
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging
import random
import time

logger = logging.getLogger("device")

@dataclass
class Device:
    device_id: str
    name: str
    type: str
    status: str
    mode: str
    volume: int
    brightness: int
    battery: int
    storage: str
    memory: str
    cpu_usage: float
    gpu_usage: float
    temperature: float
    last_active: str
    owner_id: str

class DeviceControlSystem:
    def __init__(self):
        self.devices = self._init_devices()
        self.command_history: List[Dict] = []
        self.error_scenarios = {
            "low_battery": {"chance": 0.1, "message": "设备电量不足，无法执行"},
            "overheated": {"chance": 0.05, "message": "设备温度过高，请稍后再试"},
            "offline": {"chance": 0.0, "message": "设备不在线"}
        }
        self.uptimes = {"robot_001": 3600, "robot_002": 7200, "robot_003": 1800}

    def _init_devices(self) -> Dict[str, Device]:
        return {
            "robot_001": Device("robot_001", "主控机器人", "robot", "online", "learning", 60, 70, 85, "2.1GB/32GB", "1.2GB/4GB", 35.0, 20.0, 38.5, "2024-01-15T10:30:00", "child_001"),
            "robot_002": Device("robot_002", "学习平板", "tablet", "online", "learning", 50, 80, 92, "3.5GB/64GB", "0.8GB/3GB", 25.0, 0.0, 32.0, "2024-01-15T10:25:00", "child_001"),
            "robot_003": Device("robot_003", "智能音箱", "speaker", "offline", "standby", 40, 0, 15, "0.2GB/8GB", "0.1GB/1GB", 0.0, 0.0, 28.0, "2024-01-14T20:00:00", "child_002"),
            "robot_004": Device("robot_004", "Emma", "desktop", "online", "learning", 55, 75, 80, "4.8GB/128GB", "2.4GB/8GB", 30.0, 15.0, 36.0, "2024-01-15T09:00:00", "child_003"),
            "robot_005": Device("robot_005", "Leo", "mobile", "online", "entertainment", 45, 60, 70, "1.5GB/16GB", "0.6GB/2GB", 20.0, 5.0, 34.0, "2024-01-15T08:30:00", "child_004"),
        }

    def _simulate_metrics(self, device: Device):
        cpu = random.uniform(10, 95)
        device.cpu_usage = round(cpu, 1)
        device.gpu_usage = round(random.uniform(0, 80), 1)
        device.temperature = round(random.uniform(30, 45), 1)
        drain = random.randint(0, 3) + (2 if cpu > 75 else 0)
        device.battery = max(0, device.battery - drain)
        device.last_active = datetime.now().isoformat()
        if device.device_id in self.uptimes:
            self.uptimes[device.device_id] += 10

    def _check_error(self, device: Device) -> Optional[str]:
        if device.status == "offline":
            return "设备不在线"
        if device.battery < 5 and random.random() < 0.3:
            return "设备电量不足（<5%），无法执行"
        if device.temperature > 43:
            return "设备温度过高（>43°C），请稍后再试"
        return None

    def get_devices(self, owner_id: Optional[str] = None) -> List[Dict]:
        devices = self.devices.values()
        if owner_id:
            devices = [d for d in devices if d.owner_id == owner_id]
        return [{"device_id": d.device_id, "name": d.name, "type": d.type, "status": d.status,
                 "mode": d.mode, "battery": d.battery, "cpu_usage": d.cpu_usage, "gpu_usage": d.gpu_usage,
                 "temperature": d.temperature, "last_active": d.last_active}
                for d in devices]

    def get_device_detail(self, device_id: str) -> Optional[Dict]:
        device = self.devices.get(device_id)
        if not device:
            return None
        return {
            "device_id": device.device_id, "name": device.name, "type": device.type,
            "status": device.status, "mode": device.mode, "volume": device.volume,
            "brightness": device.brightness, "battery": device.battery,
            "storage": device.storage, "memory": device.memory,
            "cpu_usage": f"{device.cpu_usage}%", "gpu_usage": f"{device.gpu_usage}%",
            "temperature": f"{device.temperature}°C", "last_active": device.last_active
        }

    def execute_command(self, device_id: str, command: str, params: Dict = None) -> Dict:
        params = params or {}
        device = self.devices.get(device_id)
        if not device:
            return {"success": False, "message": "设备不存在"}

        err = self._check_error(device)
        if err:
            self.command_history.append({"device_id": device_id, "command": command,
                                         "status": "error", "message": err, "timestamp": datetime.now().isoformat()})
            return {"success": False, "message": err}

        self._simulate_metrics(device)
        handlers = {
            "switch_mode": self._handle_switch_mode,
            "set_volume": self._handle_set_volume,
            "set_brightness": self._handle_set_brightness,
            "restart": self._handle_restart,
            "shutdown": self._handle_shutdown,
            "wake_up": self._handle_wake_up,
            "screenshot": self._handle_screenshot,
            "play": self._handle_play,
            "pause": self._handle_pause,
            "get_status": self._handle_get_status,
            "take_photo": self._handle_take_photo,
            "set_mode": self._handle_switch_mode,
            "update_firmware": self._handle_update_firmware,
            "factory_reset": self._handle_factory_reset,
            "enable_bluetooth": self._handle_enable_bluetooth,
            "disable_bluetooth": self._handle_disable_bluetooth,
            "enable_wifi": self._handle_enable_wifi,
            "disable_wifi": self._handle_disable_wifi,
            "locate": self._handle_locate,
            "status_all": self._handle_status_all,
        }
        handler = handlers.get(command)
        if not handler:
            return {"success": False, "message": f"未知命令: {command}"}

        result = handler(device, params)
        self.command_history.append({"device_id": device_id, "command": command,
                                     "status": "ok" if result.get("success") else "error",
                                     "message": result.get("message", ""), "timestamp": datetime.now().isoformat()})
        return result

    def _handle_switch_mode(self, device: Device, params: Dict) -> Dict:
        mode = params.get("mode", "learning")
        if mode not in ("learning", "entertainment", "rest", "sleep"):
            return {"success": False, "message": f"未知模式: {mode}"}
        device.mode = mode
        return {"success": True, "message": f"已切换到 {mode} 模式", "mode": mode}

    def _handle_set_volume(self, device: Device, params: Dict) -> Dict:
        value = params.get("value") or params.get("volume", 50)
        device.volume = max(0, min(100, int(value)))
        return {"success": True, "message": f"音量已设置为 {device.volume}", "volume": device.volume}

    def _handle_set_brightness(self, device: Device, params: Dict) -> Dict:
        value = params.get("value") or params.get("brightness", 50)
        device.brightness = max(0, min(100, int(value)))
        return {"success": True, "message": f"亮度已设置为 {device.brightness}", "brightness": device.brightness}

    def _handle_restart(self, device: Device, params: Dict) -> Dict:
        device.status = "online"
        device.mode = "learning"
        self._simulate_metrics(device)
        return {"success": True, "message": "设备正在重启...", "estimated_time": "30秒"}

    def _handle_shutdown(self, device: Device, params: Dict) -> Dict:
        device.status = "offline"
        return {"success": True, "message": "设备已关机"}

    def _handle_wake_up(self, device: Device, params: Dict) -> Dict:
        device.status = "online"
        device.mode = "learning"
        device.volume = 30
        device.brightness = 50
        return {"success": True, "message": "设备已唤醒"}

    def _handle_screenshot(self, device: Device, params: Dict) -> Dict:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return {"success": True, "message": "截图已保存", "url": f"/screenshots/{device.device_id}_{ts}.png"}

    def _handle_play(self, device: Device, params: Dict) -> Dict:
        content = params.get("content", "音乐")
        return {"success": True, "message": f"正在播放: {content}", "playing": content}

    def _handle_pause(self, device: Device, params: Dict) -> Dict:
        return {"success": True, "message": "已暂停播放"}

    def _handle_get_status(self, device: Device, params: Dict) -> Dict:
        return {"success": True, **self.get_device_detail(device.device_id)}

    def _handle_take_photo(self, device: Device, params: Dict) -> Dict:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return {"success": True, "message": "照片已拍摄", "url": f"/photos/{device.device_id}_{ts}.jpg"}

    def _handle_update_firmware(self, device: Device, params: Dict) -> Dict:
        version = params.get("version", "v2.1.0")
        return {"success": True, "message": f"固件正在更新到 {version}", "version": version, "estimated_time": "120秒"}

    def _handle_factory_reset(self, device: Device, params: Dict) -> Dict:
        device.status = "online"
        device.mode = "learning"
        device.volume = 50
        device.brightness = 70
        device.battery = 100
        return {"success": True, "message": "设备已恢复出厂设置并重启"}

    def _handle_enable_bluetooth(self, device: Device, params: Dict) -> Dict:
        return {"success": True, "message": "蓝牙已开启", "bluetooth": True}

    def _handle_disable_bluetooth(self, device: Device, params: Dict) -> Dict:
        return {"success": True, "message": "蓝牙已关闭", "bluetooth": False}

    def _handle_enable_wifi(self, device: Device, params: Dict) -> Dict:
        return {"success": True, "message": "WiFi 已开启", "wifi": True}

    def _handle_disable_wifi(self, device: Device, params: Dict) -> Dict:
        return {"success": True, "message": "WiFi 已关闭", "wifi": False}

    def _handle_locate(self, device: Device, params: Dict) -> Dict:
        lat = round(random.uniform(39.8, 40.2), 6)
        lng = round(random.uniform(116.1, 116.6), 6)
        return {"success": True, "message": "定位成功", "latitude": lat, "longitude": lng}

    def _handle_status_all(self, device: Device, params: Dict) -> Dict:
        self._simulate_metrics(device)
        uptime_secs = self.uptimes.get(device.device_id, 0)
        network_latency = random.randint(5, 200) if device.status == "online" else 0
        disk_usage = round(random.uniform(20, 90), 1)
        process_count = random.randint(15, 60)
        return {
            "success": True,
            **self.get_device_detail(device.device_id),
            "uptime_seconds": uptime_secs,
            "network_latency_ms": network_latency,
            "disk_usage_percent": disk_usage,
            "process_count": process_count,
        }

    def get_device_logs(self, device_id: str, limit: int = 20) -> List[Dict]:
        logs = [h for h in self.command_history if h["device_id"] == device_id]
        return logs[-limit:]

    def register_device(self, device_id: str, name: str, device_type: str, owner_id: str) -> Dict:
        if device_id in self.devices:
            return {"success": False, "message": "设备已存在"}
        self.devices[device_id] = Device(
            device_id=device_id, name=name, type=device_type, status="online",
            mode="learning", volume=50, brightness=70, battery=100,
            storage="0GB/32GB", memory="0GB/4GB", cpu_usage=0.0, gpu_usage=0.0,
            temperature=25.0, last_active=datetime.now().isoformat(), owner_id=owner_id
        )
        return {"success": True, "message": f"设备 {name} 注册成功"}

    def unregister_device(self, device_id: str) -> Dict:
        """Remove a device from the fleet (idempotent)."""
        device = self.devices.pop(device_id, None)
        if not device:
            return {"success": False, "message": "设备不存在"}
        self.command_history[:] = [h for h in self.command_history if h.get("device_id") != device_id]
        return {"success": True, "message": f"设备 {device.name} 已删除"}

device_control = DeviceControlSystem()
