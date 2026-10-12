#!/usr/bin/env python3
"""
Performance benchmark for the robot API system.
Tests concurrent request throughput, latency percentiles, and error rates.
Run: python tests/test_e2e_load.py
"""

import sys, os, json, asyncio, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
os.chdir(sys.path[0])

CONCURRENCY = 5
REQUESTS_PER_WORKER = 10

async def benchmark():
    from httpx import ASGITransport, AsyncClient
    from children_robot_system import app
    from children_content_db import get_all_content
    from children_search import search_engine
    search_engine.reindex(get_all_content())

    transport = ASGITransport(app=app)

    endpoints = [
        ("GET", "/health", None, 200),
        ("GET", "/api/health/detailed", None, 200),
        ("GET", "/api/ping", None, 200),
        ("GET", "/api/stages", None, 200),
        ("GET", "/api/education/skills", None, 200),
        ("GET", "/api/stages/kindergarten/courses", None, 200),
        ("GET", "/api/learning/courses", None, 200),
        # RBAC-protected endpoint: must be 200 WITH a token (RBAC is enforced),
        # and 401 without one. We measure the authenticated path below.
        ("GET", "/api/admin/stats", None, 401),
        ("GET", "/api/security/compliance", None, 200),
        ("GET", "/api/search?q=math", None, 200),
        ("GET", "/metrics", None, 200),
        ("GET", "/api/subscription/plans", None, 200),
        ("GET", "/api/preview/content/courses", None, 200),
        ("GET", "/api/notifications/templates", None, 200),
        ("POST", "/api/emotional/analyze", {"user_id":"load_test","text":"happy"}, 200),
        ("POST", "/api/conversation/chat", {"user_id":"load_test","message":"Hi robot"}, 200),
    ]

    latencies = []
    errors = 0
    total = 0

    # Obtain an admin token so the RBAC-protected path is also measured.
    admin_headers = None
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as setup:
            await setup.post("/api/auth/register",
                             json={"username": "load_admin", "password": "pass123", "role": "admin"})
            r = await setup.post("/api/auth/login",
                                 json={"username": "load_admin", "password": "pass123"})
            tok = (r.json().get("data") or {}).get("token") or ""
            if tok:
                admin_headers = {"Authorization": f"Bearer {tok}"}
                # Re-target the admin endpoint to the authenticated expectation.
                endpoints[7] = ("GET", "/api/admin/stats", None, 200)
    except Exception:
        pass

    async def worker(worker_id):
        nonlocal errors, total
        local_lat = []
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            for i in range(REQUESTS_PER_WORKER):
                method, path, data, expected = endpoints[i % len(endpoints)]
                # Endpoints under /api/admin require a bearer token.
                headers = admin_headers if path.startswith("/api/admin") else None
                start = time.perf_counter()
                try:
                    if method == "GET":
                        r = await client.get(path, headers=headers)
                    else:
                        r = await client.post(path, json=data or {}, headers=headers)
                    elapsed = (time.perf_counter() - start) * 1000
                    local_lat.append(elapsed)
                    if r.status_code != expected:
                        errors += 1
                except Exception:
                    errors += 1
                    local_lat.append(9999)
                total += 1
        return local_lat

    print(f"Running benchmark: {CONCURRENCY} workers x {REQUESTS_PER_WORKER} requests each...")
    print(f"Total requests: {CONCURRENCY * REQUESTS_PER_WORKER}")
    print()

    start = time.perf_counter()
    results = await asyncio.gather(*[worker(w) for w in range(CONCURRENCY)])
    total_elapsed = time.perf_counter() - start

    for r in results:
        latencies.extend(r)

    latencies.sort()
    total_ok = total - errors
    avg_lat = sum(latencies) / len(latencies) if latencies else 0
    throughput = total / total_elapsed if total_elapsed > 0 else 0
    p50 = latencies[len(latencies) // 2] if latencies else 0
    p90 = latencies[int(len(latencies) * 0.9)] if latencies else 0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
    p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0

    print(f"{'='*55}")
    print(f"  Benchmark Results")
    print(f"{'='*55}")
    print(f"  Total requests:    {total}")
    print(f"  Passed:            {total_ok} ({total_ok/total*100:.1f}%)")
    print(f"  Failed:            {errors} ({errors/total*100:.1f}%)")
    print(f"  Total time:        {total_elapsed:.2f}s")
    print(f"  Throughput:        {throughput:.0f} req/s")
    print(f"  Concurrency:       {CONCURRENCY}")
    print(f"{'─'*55}")
    print(f"  Latency (ms):")
    print(f"    Average:         {avg_lat:.1f}")
    print(f"    Min:             {min(latencies):.1f}")
    print(f"    Max:             {max(latencies):.1f}")
    print(f"    P50 (median):    {p50:.1f}")
    print(f"    P90:             {p90:.1f}")
    print(f"    P95:             {p95:.1f}")
    print(f"    P99:             {p99:.1f}")
    print(f"{'='*55}")

    return errors

if __name__ == "__main__":
    sys.exit(0 if asyncio.run(benchmark()) == 0 else 1)
