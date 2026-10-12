"""
Robot Controller
Hardware interaction, sensor management, motion planning, and offline AI
"""

import time
import math
import threading
import queue
from typing import Dict, Any, Optional, List, Callable, Tuple
from enum import Enum
from dataclasses import dataclass, field


class RobotStatus(Enum):
    OFFLINE = "offline"
    ONLINE = "online"
    SLEEPING = "sleeping"
    BUSY = "busy"
    ERROR = "error"
    DIAGNOSTIC = "diagnostic"
    EMERGENCY_STOP = "emergency_stop"
    CALIBRATING = "calibrating"


class PowerProfile(Enum):
    PERFORMANCE = "performance"
    BALANCED = "balanced"
    POWER_SAVE = "power_save"
    LOW_POWER = "low_power"


@dataclass
class MotorCommand:
    motor_id: str
    target_position: float
    target_speed: float
    acceleration: float = 0.5
    deceleration: float = 0.5


@dataclass
class TaskItem:
    id: str
    name: str
    priority: int
    task_type: str
    params: Dict
    status: str = "pending"
    created_at: float = 0.0
    started_at: float = 0.0
    completed_at: float = 0.0


class SensorFusion:
    def __init__(self):
        self.sensors: Dict[str, Dict] = {}
        self.fused_data: Dict[str, Any] = {}

    def register_sensor(self, name: str, sensor_type: str, config: Dict = None):
        self.sensors[name] = {
            "type": sensor_type,
            "config": config or {},
            "last_value": None,
            "last_update": 0,
            "bias": config.get("bias", 0) if config else 0,
            "weight": config.get("weight", 1.0) if config else 1.0
        }

    def update_sensor(self, name: str, value: Any):
        if name in self.sensors:
            self.sensors[name]["last_value"] = value
            self.sensors[name]["last_update"] = time.time()
            self._fuse()

    def _fuse(self):
        temp_readings = []
        temp_weights = []
        for name, sensor in self.sensors.items():
            if sensor["type"] == "temperature" and sensor["last_value"] is not None:
                temp_readings.append(sensor["last_value"] + sensor["bias"])
                temp_weights.append(sensor["weight"])
        if temp_readings:
            total_weight = sum(temp_weights)
            self.fused_data["temperature"] = sum(
                r * w for r, w in zip(temp_readings, temp_weights)
            ) / total_weight if total_weight > 0 else temp_readings[-1]

        prox_readings = []
        for name, sensor in self.sensors.items():
            if sensor["type"] in ("infrared", "ultrasonic") and sensor["last_value"] is not None:
                prox_readings.append(sensor["last_value"])
        self.fused_data["obstacle_distance"] = min(prox_readings) if prox_readings else None

    def get_fused(self, data_type: str) -> Any:
        return self.fused_data.get(data_type)

    def get_all_fused(self) -> Dict:
        return dict(self.fused_data)


class MotionPlanner:
    def __init__(self):
        self.current_position = [0.0, 0.0, 0.0]
        self.current_velocity = [0.0, 0.0, 0.0]
        self.obstacle_map = []
        self.max_speed = 1.0
        self.max_acceleration = 0.5
        self.clearance_radius = 0.3

    def update_obstacles(self, obstacles: List[Tuple[float, float, float]]):
        self.obstacle_map = obstacles

    def plan_path(self, target: Tuple[float, float, float]) -> List[Tuple[float, float, float]]:
        waypoints = [tuple(self.current_position)]
        current = list(self.current_position)

        for dim in range(3):
            step = 0.1 if target[dim] > current[dim] else -0.1 if target[dim] < current[dim] else 0
            while abs(current[dim] - target[dim]) > 0.05:
                current[dim] += step
                if self._check_collision(tuple(current)):
                    current[dim] -= step
                    break
                waypoints.append(tuple(current))

        waypoints.append(target)
        return waypoints

    def _check_collision(self, position: Tuple[float, float, float]) -> bool:
        for obs in self.obstacle_map:
            dist = math.sqrt(sum((position[i] - obs[i]) ** 2 for i in range(min(len(position), len(obs)))))
            if dist < self.clearance_radius:
                return True
        return False

    def compute_velocity(self, current: Tuple[float, float, float],
                         target: Tuple[float, float, float], dt: float) -> Tuple[float, float, float]:
        dx = target[0] - current[0]
        dy = target[1] - current[1]
        dz = target[2] - current[2]
        dist = math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)
        if dist < 0.01:
            return (0.0, 0.0, 0.0)
        speed = min(self.max_speed, dist / max(dt, 0.001))
        return (dx / dist * speed, dy / dist * speed, dz / dist * speed)


class SafetyMonitor:
    def __init__(self):
        self.overheat_threshold = 75.0
        self.stall_threshold = 5.0
        self.current_temp = 30.0
        self.stall_count = 0
        self.emergency_stop_triggered = False

    def check(self, sensor_fusion: SensorFusion, motors: Dict) -> List[str]:
        alerts = []
        temp = sensor_fusion.get_fused("temperature") or self.current_temp
        self.current_temp = temp
        if temp > self.overheat_threshold:
            alerts.append(f"OVERHEAT: {temp:.1f}C exceeds {self.overheat_threshold}C")
        for motor_id, motor in motors.items():
            if motor.get("speed", 0) == 0 and motor.get("target_speed", 0) > 0:
                self.stall_count += 1
                if self.stall_count > self.stall_threshold:
                    alerts.append(f"STALL_DETECTED: motor {motor_id}")
                    self.emergency_stop_triggered = True
            else:
                self.stall_count = max(0, self.stall_count - 0.5)
        return alerts


class RobotController:
    def __init__(self, robot_id: str):
        self.robot_id = robot_id
        self.status = RobotStatus.OFFLINE
        self.battery_level = 100.0
        self.last_heartbeat = time.time()
        self.sensors = {}
        self.actuators = {}
        self.motors = {}
        self._running = False
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._task_thread: Optional[threading.Thread] = None
        self._command_queue = queue.Queue()
        self._task_queue: List[TaskItem] = []
        self.power_profile = PowerProfile.BALANCED
        self.sensor_fusion = SensorFusion()
        self.motion_planner = MotionPlanner()
        self.safety_monitor = SafetyMonitor()
        self.state_machine = RobotStateMachine()
        self.calibration_data = {}
        self.error_recovery_handlers: Dict[str, Callable] = {}

    def initialize(self):
        print(f"[Robot {self.robot_id}] Initializing...")
        self._init_sensors()
        self._init_actuators()
        self._init_motors()
        self.sensor_fusion.register_sensor("temperature_main", "temperature", {"weight": 1.0})
        self.sensor_fusion.register_sensor("temperature_motor", "temperature", {"weight": 0.8, "bias": 2.0})
        self.sensor_fusion.register_sensor("infrared_front", "infrared", {"weight": 1.0})
        self.sensor_fusion.register_sensor("infrared_back", "infrared", {"weight": 0.7})
        self.status = RobotStatus.ONLINE
        self._running = True
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()
        self._task_thread = threading.Thread(target=self._task_loop, daemon=True)
        self._task_thread.start()
        print(f"[Robot {self.robot_id}] Initialized successfully!")

    def _init_sensors(self):
        self.sensors = {
            'camera': {'active': True, 'resolution': '1080p', 'fps': 30},
            'microphone': {'active': True, 'channels': 2, 'sample_rate': 44100},
            'temperature': {'active': True, 'current': 25.0},
            'touch': {'active': True, 'current': False},
            'infrared': {'active': True, 'current': False, 'range_m': 2.5},
            'ultrasonic': {'active': True, 'current': 0.0, 'range_m': 4.0},
            'accelerometer': {'active': True, 'current': [0.0, 0.0, 0.0]},
            'gyroscope': {'active': True, 'current': [0.0, 0.0, 0.0]},
            'battery_monitor': {'active': True, 'voltage': 12.0, 'current_ma': 500},
        }

    def _init_actuators(self):
        self.actuators = {
            'speaker': {'active': True, 'volume': 80, 'muted': False},
            'led_matrix': {'active': True, 'brightness': 100, 'pattern': 'default'},
            'wheels': {'active': True, 'speed': 0, 'direction': 'stop'},
            'arm': {'active': True, 'position': 0, 'gripper': 'open'},
            'head': {'active': True, 'tilt': 0, 'pan': 0},
        }

    def _init_motors(self):
        self.motors = {
            'motor_left_wheel': {'type': 'dc', 'speed': 0, 'target_speed': 0, 'current_a': 0.1, 'temperature_c': 30},
            'motor_right_wheel': {'type': 'dc', 'speed': 0, 'target_speed': 0, 'current_a': 0.1, 'temperature_c': 30},
            'motor_arm_shoulder': {'type': 'servo', 'position': 90, 'target_position': 90, 'current_a': 0.05, 'temperature_c': 28},
            'motor_arm_elbow': {'type': 'servo', 'position': 45, 'target_position': 45, 'current_a': 0.05, 'temperature_c': 28},
            'motor_head_tilt': {'type': 'servo', 'position': 0, 'target_position': 0, 'current_a': 0.03, 'temperature_c': 27},
            'motor_head_pan': {'type': 'servo', 'position': 0, 'target_position': 0, 'current_a': 0.03, 'temperature_c': 27},
        }

    def _heartbeat_loop(self):
        while self._running:
            self.send_heartbeat()
            interval = 30 if self.power_profile != PowerProfile.POWER_SAVE else 60
            time.sleep(interval)

    def send_heartbeat(self) -> Dict[str, Any]:
        self.last_heartbeat = time.time()
        discharge_rate = 0.02
        if self.power_profile == PowerProfile.PERFORMANCE:
            discharge_rate = 0.05
        elif self.power_profile == PowerProfile.POWER_SAVE:
            discharge_rate = 0.005
        self.battery_level = max(0, self.battery_level - discharge_rate)

        if self.battery_level < 5:
            self.status = RobotStatus.OFFLINE
        elif self.battery_level < 15:
            self.status = RobotStatus.SLEEPING
        elif self.status == RobotStatus.SLEEPING and self.battery_level > 30:
            self.status = RobotStatus.ONLINE

        return {
            'robot_id': self.robot_id, 'status': self.status.value,
            'battery': self.battery_level, 'timestamp': self.last_heartbeat
        }

    def set_power_profile(self, profile: PowerProfile):
        self.power_profile = profile
        if profile == PowerProfile.PERFORMANCE:
            self.motion_planner.max_speed = 1.0
        elif profile == PowerProfile.BALANCED:
            self.motion_planner.max_speed = 0.6
        elif profile in (PowerProfile.POWER_SAVE, PowerProfile.LOW_POWER):
            self.motion_planner.max_speed = 0.3

    def _task_loop(self):
        while self._running:
            self._process_task_queue()
            self._run_safety_checks()
            time.sleep(0.1)

    def _process_task_queue(self):
        self._task_queue.sort(key=lambda t: t.priority, reverse=True)
        active = [t for t in self._task_queue if t.status == "in_progress"]
        if len(active) >= 2:
            return
        pending = [t for t in self._task_queue if t.status == "pending"]
        if pending:
            task = pending[0]
            task.status = "in_progress"
            task.started_at = time.time()
            self.status = RobotStatus.BUSY
            try:
                self._execute_task(task)
                task.status = "completed"
                task.completed_at = time.time()
            except Exception as e:
                task.status = "failed"
                print(f"Task {task.name} failed: {e}")
            if not [t for t in self._task_queue if t.status == "in_progress"]:
                self.status = RobotStatus.ONLINE

    def _execute_task(self, task: TaskItem):
        if task.task_type == "move":
            target = task.params.get("target", [0, 0, 0])
            self.move_to(target, task.params.get("speed", 50))
        elif task.task_type == "speak":
            self.speak(task.params.get("text", ""))
        elif task.task_type == "gesture":
            self.perform_gesture(task.params.get("gesture", "wave"))
        elif task.task_type == "calibrate":
            self.calibrate(task.params.get("component", "all"))

    def _run_safety_checks(self):
        for motor_id, motor in self.motors.items():
            self.sensor_fusion.update_sensor("temperature_main", self.sensors["temperature"]["current"])
            self.sensor_fusion.update_sensor("temperature_motor", motor["temperature_c"])
        alerts = self.safety_monitor.check(self.sensor_fusion, self.motors)
        if alerts:
            for alert in alerts:
                print(f"[SAFETY] {alert}")
            if self.safety_monitor.emergency_stop_triggered:
                self.emergency_stop()

    def emergency_stop(self):
        print(f"[Robot {self.robot_id}] EMERGENCY STOP!")
        self.status = RobotStatus.EMERGENCY_STOP
        for motor_id in self.motors:
            self.motors[motor_id]["speed"] = 0
            self.motors[motor_id]["target_speed"] = 0
        self.actuators["wheels"]["speed"] = 0
        self._command_queue.put({"type": "emergency_stop"})
        threading.Timer(5.0, self._recover_from_emergency).start()

    def _recover_from_emergency(self):
        self.safety_monitor.emergency_stop_triggered = False
        if self.status == RobotStatus.EMERGENCY_STOP:
            self.status = RobotStatus.ONLINE
            print(f"[Robot {self.robot_id}] Recovered from emergency stop")

    def add_error_recovery_handler(self, error_type: str, handler: Callable):
        self.error_recovery_handlers[error_type] = handler

    def recover_from_error(self, error: Exception):
        error_type = type(error).__name__
        handler = self.error_recovery_handlers.get(error_type)
        if handler:
            try:
                handler(self, error)
                print(f"Recovered from {error_type}")
            except Exception as e:
                print(f"Recovery handler failed: {e}")
                self.emergency_stop()
        else:
            self.emergency_stop()

    def move_motor(self, motor_id: str, target_position: float, speed: float = 50):
        if motor_id not in self.motors:
            raise ValueError(f"Unknown motor: {motor_id}")
        self.motors[motor_id]["target_position"] = target_position
        self.motors[motor_id]["target_speed"] = speed
        print(f"Moving {motor_id} to {target_position} at {speed}%")

    def coordinate_motors(self, commands: List[MotorCommand]):
        for cmd in commands:
            self.move_motor(cmd.motor_id, cmd.target_position, cmd.target_speed)

    def move_to(self, target: Tuple[float, float, float], speed: int = 50):
        self.motion_planner.max_speed = speed / 100.0
        waypoints = self.motion_planner.plan_path(target)
        for wp in waypoints:
            vel = self.motion_planner.compute_velocity(
                tuple(self.motion_planner.current_position), wp, 0.1
            )
            self.actuators["wheels"]["speed"] = math.sqrt(vel[0] ** 2 + vel[1] ** 2)
            self.motion_planner.current_position = list(wp)
            time.sleep(0.1)

    def move(self, direction: str, speed: int = 50):
        print(f"[Robot {self.robot_id}] Moving {direction} at {speed}% speed")
        self.actuators["wheels"]["direction"] = direction
        self.actuators["wheels"]["speed"] = speed
        self._command_queue.put({"type": "move", "direction": direction, "speed": speed})

    def speak(self, text: str):
        print(f"[Robot {self.robot_id}] Speaking: {text}")

    def play_sound(self, sound_file: str):
        print(f"[Robot {self.robot_id}] Playing sound: {sound_file}")

    def show_expression(self, expression: str):
        expressions = {
            'happy': 'HAPPY', 'sad': 'SAD', 'thinking': 'THINKING',
            'excited': 'EXCITED', 'love': 'LOVE', 'surprised': 'SURPRISED',
            'sleepy': 'SLEEPY', 'angry': 'ANGRY'
        }
        disp = expressions.get(expression, 'NEUTRAL')
        self.actuators["led_matrix"]["pattern"] = disp
        print(f"[Robot {self.robot_id}] Expression: {disp}")

    def perform_gesture(self, gesture: str):
        gestures = {
            'wave': [MotorCommand("motor_arm_shoulder", 135, 60), MotorCommand("motor_arm_elbow", 90, 60)],
            'nod': [MotorCommand("motor_head_tilt", 15, 30), MotorCommand("motor_head_tilt", -15, 30)],
            'shake': [MotorCommand("motor_head_pan", 30, 40), MotorCommand("motor_head_pan", -30, 40)],
            'hug': [MotorCommand("motor_arm_shoulder", 180, 50), MotorCommand("motor_arm_elbow", 0, 50)]
        }
        cmds = gestures.get(gesture, [])
        self.coordinate_motors(cmds)
        print(f"[Robot {self.robot_id}] Gesture: {gesture}")

    def detect_touch(self) -> bool:
        return self.sensors['touch']['current']

    def get_sensor_data(self, sensor_name: str) -> Optional[Dict]:
        return self.sensors.get(sensor_name)

    def get_all_sensor_data(self) -> Dict:
        data = dict(self.sensors)
        data["fused"] = self.sensor_fusion.get_all_fused()
        return data

    def calibrate(self, component: str = "all"):
        self.status = RobotStatus.CALIBRATING
        print(f"[Robot {self.robot_id}] Calibrating {component}...")
        if component in ("all", "motors"):
            for motor_id in self.motors:
                self.motors[motor_id]["position"] = 0
                self.motors[motor_id]["speed"] = 0
                time.sleep(0.2)
        if component in ("all", "sensors"):
            for sensor_id in self.sensors:
                if sensor_id == "temperature":
                    self.sensors[sensor_id]["current"] = 25.0
                elif sensor_id == "accelerometer":
                    self.sensors[sensor_id]["current"] = [0.0, 0.0, 9.81]
                elif sensor_id in ("infrared", "ultrasonic"):
                    self.sensors[sensor_id]["current"] = 0.0
        self.calibration_data[component] = {"last_calibrated": time.time(), "status": "ok"}
        self.status = RobotStatus.ONLINE
        print(f"[Robot {self.robot_id}] Calibration complete for {component}")

    def enter_diagnostic_mode(self):
        self.status = RobotStatus.DIAGNOSTIC
        report = {
            "status": self.status.value,
            "battery": self.battery_level,
            "sensors": {k: v.get("active") for k, v in self.sensors.items()},
            "actuators": {k: v.get("active") for k, v in self.actuators.items()},
            "motors": {k: {"speed": v["speed"], "temp": v["temperature_c"]} for k, v in self.motors.items()},
            "safety": {"overheat": self.safety_monitor.current_temp, "stalls": self.safety_monitor.stall_count},
            "fused_data": self.sensor_fusion.get_all_fused()
        }
        print(f"[Robot {self.robot_id}] Diagnostic report generated")
        return report

    def exit_diagnostic_mode(self):
        if self.status == RobotStatus.DIAGNOSTIC:
            self.status = RobotStatus.ONLINE

    def enqueue_task(self, name: str, task_type: str, params: Dict, priority: int = 0) -> str:
        import uuid
        task = TaskItem(
            id=str(uuid.uuid4()), name=name, priority=priority,
            task_type=task_type, params=params
        )
        self._task_queue.append(task)
        return task.id

    def get_task_status(self, task_id: str) -> Optional[str]:
        for t in self._task_queue:
            if t.id == task_id:
                return t.status
        return None

    def remote_control(self, command: Dict):
        self._command_queue.put(command)
        cmd_type = command.get("type", "")
        if cmd_type == "move":
            self.move(command.get("direction", "forward"), command.get("speed", 50))
        elif cmd_type == "speak":
            self.speak(command.get("text", ""))
        elif cmd_type == "expression":
            self.show_expression(command.get("expression", "happy"))
        elif cmd_type == "gesture":
            self.perform_gesture(command.get("gesture", "wave"))
        elif cmd_type == "emergency_stop":
            self.emergency_stop()

    def shutdown(self):
        self._running = False
        self.status = RobotStatus.OFFLINE
        self._command_queue.put({"type": "shutdown"})
        print(f"[Robot {self.robot_id}] Shutting down...")

    def recharge(self):
        print(f"[Robot {self.robot_id}] Recharging...")
        rate = 5 if self.power_profile != PowerProfile.LOW_POWER else 2
        self.battery_level = min(100, self.battery_level + rate)
        if self.status == RobotStatus.SLEEPING and self.battery_level > 30:
            self.status = RobotStatus.ONLINE


class RobotStateMachine:
    def __init__(self):
        self.states = {
            RobotStatus.OFFLINE: [RobotStatus.ONLINE, RobotStatus.ERROR],
            RobotStatus.ONLINE: [RobotStatus.BUSY, RobotStatus.SLEEPING, RobotStatus.DIAGNOSTIC, RobotStatus.OFFLINE],
            RobotStatus.BUSY: [RobotStatus.ONLINE, RobotStatus.ERROR, RobotStatus.EMERGENCY_STOP],
            RobotStatus.SLEEPING: [RobotStatus.ONLINE, RobotStatus.OFFLINE],
            RobotStatus.ERROR: [RobotStatus.ONLINE, RobotStatus.OFFLINE],
            RobotStatus.EMERGENCY_STOP: [RobotStatus.ONLINE, RobotStatus.OFFLINE],
            RobotStatus.DIAGNOSTIC: [RobotStatus.ONLINE, RobotStatus.OFFLINE],
            RobotStatus.CALIBRATING: [RobotStatus.ONLINE, RobotStatus.ERROR],
        }

    def can_transition(self, current: RobotStatus, target: RobotStatus) -> bool:
        return target in self.states.get(current, [])

    def transition(self, current: RobotStatus, target: RobotStatus) -> RobotStatus:
        if self.can_transition(current, target):
            return target
        raise ValueError(f"Cannot transition from {current.value} to {target.value}")


class OfflineAI:
    def __init__(self):
        self.local_response = {
            'hello': 'Hello! Nice to meet you!',
            'what is your name': "My name is Lele, I'm your learning assistant!",
            'goodbye': 'Goodbye! Come play with me again!',
        }
        self.common_questions = {
            '2+3': '2+3 equals 5!',
            '5-2': '5-2 equals 3!',
            'thank you': "You're welcome! I'm happy to help!"
        }

    def quick_response(self, text: str) -> Optional[str]:
        text = text.lower().strip()
        if text in self.local_response:
            return self.local_response[text]
        if 'tired' in text or 'sleepy' in text:
            return 'You should rest if you are tired!'
        if 'cold' in text:
            return 'Wear more clothes if you feel cold!'
        if 'math' in text:
            for q in self.common_questions:
                if q in text:
                    return self.common_questions[q]
            return "Let's do some math problems!"
        return None


if __name__ == "__main__":
    robot = RobotController('ROBOT-001')
    robot.initialize()
    robot.speak('Hello! I am your learning robot!')
    robot.show_expression('happy')
    try:
        time.sleep(60)
    finally:
        robot.shutdown()
