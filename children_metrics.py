#!/usr/bin/env python3
"""Prometheus-compatible metrics endpoint + structured logging."""

from datetime import datetime
from typing import Dict
import logging
import json

logger = logging.getLogger("metrics")

class MetricsCollector:
    def __init__(self):
        self._counters: Dict[str, int] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, list] = {}

    def increment(self, name: str, value: int = 1):
        self._counters[name] = self._counters.get(name, 0) + value

    def gauge(self, name: str, value: float):
        self._gauges[name] = value

    def observe(self, name: str, value: float):
        if name not in self._histograms:
            self._histograms[name] = []
        self._histograms[name].append(value)
        if len(self._histograms[name]) > 1000:
            self._histograms[name] = self._histograms[name][-1000:]

    def prometheus_format(self) -> str:
        lines = []
        lines.append("# HELP robot_api_requests_total Total API requests")
        lines.append("# TYPE robot_api_requests_total counter")
        for name, val in self._counters.items():
            lines.append(f'robot_api_requests_total{{endpoint="{name}"}} {val}')

        lines.append("\n# HELP robot_active_gauges Current gauge values")
        lines.append("# TYPE robot_active_gauges gauge")
        for name, val in self._gauges.items():
            lines.append(f'robot_gauge{{metric="{name}"}} {val}')

        lines.append("\n# HELP robot_request_duration_ms Request duration in ms")
        lines.append("# TYPE robot_request_duration_ms histogram")
        for name, vals in self._histograms.items():
            if vals:
                lines.append(f'robot_duration_sum{{metric="{name}"}} {sum(vals)}')
                lines.append(f'robot_duration_count{{metric="{name}"}} {len(vals)}')
                for p, q in [("50", 0.5), ("90", 0.9), ("99", 0.99)]:
                    idx = max(0, int(len(vals) * q) - 1)
                    lines.append(f'robot_duration_bucket{{metric="{name}",le="{p}"}} {sorted(vals)[idx]}')

        return "\n".join(lines)

    def snapshot(self) -> Dict:
        return {
            "counters": dict(self._counters),
            "gauges": dict(self._gauges),
            "histogram_count": sum(len(v) for v in self._histograms.values()),
            "timestamp": datetime.now().isoformat(),
        }

metrics = MetricsCollector()

class StructuredLogger:
    def __init__(self):
        self._handler = logging.StreamHandler()
        self._handler.setFormatter(logging.Formatter(
            '{"time":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","message":"%(message)s"}'))
        self._logger = logging.getLogger("structured")
        self._logger.addHandler(self._handler)
        self._logger.setLevel(logging.INFO)

    def log(self, level: str, module: str, message: str, **kwargs):
        record = {"time": datetime.now().isoformat(), "level": level, "module": module, "message": message}
        record.update(kwargs)
        print(json.dumps(record, ensure_ascii=False))

structured_log = StructuredLogger()
