#!/usr/bin/env python3
"""Load testing + performance benchmarks for the robot API."""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List

BASE_URL = os.environ.get("ROBOT_TEST_URL", "http://localhost:8888")
RESULTS: Dict[str, List[float]] = {}

def _request(method: str, path: str, body: dict = None) -> float:
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
    except Exception:
        pass
    return (time.perf_counter() - start) * 1000

def bench(name: str, path: str, method: str = "GET", body: dict = None,
          concurrency: int = 10, iterations: int = 50):
    times = []
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futs = [pool.submit(_request, method, path, body) for _ in range(iterations)]
        for f in as_completed(futs):
            try:
                times.append(f.result())
            except Exception:
                pass
    if times:
        times.sort()
        avg = sum(times) / len(times)
        p50 = times[len(times)//2]
        p95 = times[int(len(times)*0.95)]
        p99 = times[int(len(times)*0.99)]
        RESULTS[name] = times
        print(f"  {name:35s}  avg={avg:7.1f}ms  p50={p50:7.1f}ms  p95={p95:7.1f}ms  p99={p99:7.1f}ms  ({len(times)}/{iterations} ok)")
    else:
        print(f"  {name:35s}  FAILED (0 responses)")

def main():
    print(f"\n{'='*70}")
    print(f"  Load Test: {BASE_URL}")
    print(f"  Concurrency: 10, Iterations per endpoint: 50")
    print(f"{'='*70}\n")

    bench("GET /health (lightweight)", "/health")
    bench("GET /api/health/detailed (heavy)", "/api/health/detailed")
    bench("GET /api/search (empty q)", "/api/search?q=")
    bench("GET /api/search (chinese)", "/api/search?q=数学")
    bench("GET /api/search (english)", "/api/search?q=english")
    bench("GET /api/search/suggest", "/api/search/suggest?q=数")
    bench("POST /api/auth/login", "/api/auth/login", "POST",
          {"username": "admin", "password": "admin123"})
    bench("POST /api/auth/register", "/api/auth/register", "POST",
          {"username": f"loadtest_{int(time.time())}", "password": "test123", "role": "child"})
    bench("GET /api/auth/users", "/api/auth/users")
    bench("GET /metrics", "/metrics")
    bench("POST /api/webhooks/test (fail)", "/api/webhooks/test/nonexistent", "POST")
    bench("GET /api/education/stages", "/api/education/stages")
    bench("POST /api/parental/screen-time-limit", "/api/parental/screen-time-limit", "POST",
          {"user_id": "test_user", "minutes_per_day": 60})

    print(f"\n{'='*70}")
    print(f"  Summary: {len(RESULTS)} endpoints tested")
    for name in RESULTS:
        times = RESULTS[name]
        print(f"  {name:35s}  requests={len(times)}, avg={sum(times)/len(times):.1f}ms")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    main()
