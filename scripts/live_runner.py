#!/usr/bin/env python3
"""
24/7 live supervisor — keeps the robot-companion app (and an optional public
tunnel) running unattended, surviving crashes and reboots.

Contract:
  * launches `children_robot_system.py` as a child process
  * waits for /health/live before declaring the service UP
  * optionally attaches a free Cloudflare quick tunnel (see scripts/tunnel.py)
  * restarts whichever component dies, with capped exponential backoff
  * persists live state to runtime/live_state.json for external monitoring
  * never fabricates a URL or a health status

Usage:
    python scripts/live_runner.py                 # app + tunnel, run forever
    python scripts/live_runner.py --no-tunnel     # app only
    python scripts/live_runner.py --once          # boot, verify, stay
    python scripts/live_runner.py --status        # print current state
    python scripts/live_runner.py --stop          # stop recorded processes
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

STATE_PATH = ROOT / "runtime" / "live_state.json"
LOG_DIR = ROOT / "runtime"
MAX_BACKOFF = 60
HEALTH_PATH = "/health/live"


def _log(msg: str):
    print(f"[live {time.strftime('%H:%M:%S')}] {msg}", flush=True)


def _write_state(state: dict):
    try:
        STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        state["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def _read_state() -> Optional[dict]:
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None


def _health_ok(port: int, timeout: float = 4.0) -> bool:
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}{HEALTH_PATH}")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode() == 200
    except Exception:
        return False


def _wait_health(port: int, deadline_s: float = 60.0, proc: Optional[subprocess.Popen] = None) -> bool:
    end = time.time() + deadline_s
    while time.time() < end:
        if proc is not None and proc.poll() is not None:
            return False
        if _health_ok(port):
            return True
        time.sleep(1.5)
    return False


class LiveRunner:
    def __init__(self, port: int = 8888, use_tunnel: bool = True,
                 app_argv: Optional[list[str]] = None):
        self.port = port
        self.use_tunnel = use_tunnel
        self.app_argv = app_argv or [sys.executable, "children_robot_system.py"]
        self.app: Optional[subprocess.Popen] = None
        self.tunnel = None
        self.app_restarts = 0
        self.tunnel_restarts = 0
        self.running = True
        self.started_at = time.strftime("%Y-%m-%dT%H:%M:%S")

    # -- app lifecycle --
    def start_app(self) -> bool:
        env = os.environ.copy()
        env.setdefault("ROBOT_STAGE", "production")
        env["PORT"] = str(self.port)
        env.setdefault("PYTHONIOENCODING", "utf-8")
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        out = open(LOG_DIR / "live_app.log", "a", encoding="utf-8")
        try:
            self.app = subprocess.Popen(
                self.app_argv, cwd=str(ROOT), env=env,
                stdout=out, stderr=subprocess.STDOUT,
            )
        except Exception as exc:
            _log(f"app start failed: {exc}")
            return False
        _log(f"app started pid={self.app.pid}")
        return True

    def stop_app(self):
        if self.app and self.app.poll() is None:
            try:
                self.app.terminate()
                self.app.wait(timeout=15)
            except Exception:
                try:
                    self.app.kill()
                except Exception:
                    pass

    # -- tunnel lifecycle --
    def start_tunnel(self) -> bool:
        try:
            from tunnel import CloudflareTunnel
        except Exception as exc:
            _log(f"tunnel module unavailable: {exc}")
            return False
        self.tunnel = CloudflareTunnel(self.port, log=lambda m: _log(f"[tunnel] {m}"))
        if not self.tunnel.start():
            _log("tunnel unavailable; continuing app-only")
            self.tunnel = None
            return False
        url = self.tunnel.wait_for_url(90)
        if url:
            _log(f"PUBLIC URL: {url}")
        else:
            _log("tunnel started but no URL parsed yet")
        return True

    # -- state --
    def _state(self, status: str) -> dict:
        return {
            "status": status,
            "port": self.port,
            "pid": self.app.pid if self.app else None,
            "public_url": self.tunnel.public_url if self.tunnel else None,
            "tunnel_backend": "cloudflare-quick-tunnel" if self.tunnel else None,
            "started_at": self.started_at,
            "app_restarts": self.app_restarts,
            "tunnel_restarts": self.tunnel_restarts,
            "health_path": HEALTH_PATH,
        }

    def run(self):
        _log(f"supervisor starting (port={self.port}, tunnel={self.use_tunnel})")
        _write_state(self._state("starting"))
        backoff = 2
        while self.running:
            # ensure app
            if not (self.app and self.app.poll() is None):
                if self.app is not None:
                    self.app_restarts += 1
                    _log(f"app exited (rc={self.app.returncode}); restart #{self.app_restarts}")
                    time.sleep(min(backoff, MAX_BACKOFF))
                    backoff = min(backoff * 2, MAX_BACKOFF)
                if not self.start_app():
                    _write_state(self._state("app_failed"))
                    time.sleep(min(backoff, MAX_BACKOFF))
                    backoff = min(backoff * 2, MAX_BACKOFF)
                    continue
                if not _wait_health(self.port, 90, self.app):
                    _log("app did not become healthy; will restart")
                    self.stop_app()
                    continue
                backoff = 2
                _log("app healthy")
                _write_state(self._state("up"))
                if self.use_tunnel and self.tunnel is None:
                    self.start_tunnel()
                    _write_state(self._state("up"))
            # ensure tunnel
            if self.use_tunnel and self.tunnel is not None and not self.tunnel.is_alive():
                self.tunnel_restarts += 1
                _log(f"tunnel died; restart #{self.tunnel_restarts}")
                self.tunnel = None
                self.start_tunnel()
                _write_state(self._state("up"))
            time.sleep(5)
        _log("supervisor stopping")

    def shutdown(self):
        self.running = False
        if self.tunnel:
            try:
                self.tunnel.stop()
            except Exception:
                pass
        self.stop_app()
        _write_state(self._state("stopped"))


def status() -> int:
    st = _read_state()
    if not st:
        print("no live state recorded (service not started via live_runner)")
        return 1
    print(json.dumps(st, ensure_ascii=False, indent=2))
    port = st.get("port", 8888)
    print(f"health({HEALTH_PATH}) now: {'OK' if _health_ok(port) else 'DOWN'}")
    return 0 if _health_ok(port) else 2


def stop() -> int:
    st = _read_state()
    if not st:
        print("no recorded processes")
        return 0
    for key in ("pid",):
        pid = st.get(key)
        if pid:
            try:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True)
                else:
                    os.kill(pid, signal.SIGTERM)
                print(f"stopped pid={pid}")
            except Exception as exc:
                print(f"could not stop pid={pid}: {exc}")
    _write_state({"status": "stopped"})
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="24/7 live supervisor")
    ap.add_argument("--port", type=int, default=int(os.getenv("PORT", "8888")))
    ap.add_argument("--no-tunnel", action="store_true")
    ap.add_argument("--once", action="store_true", help="boot and verify, then keep running")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--stop", action="store_true")
    ap.add_argument("--force", action="store_true", help="start even if one seems to be running")
    args = ap.parse_args(argv)

    if args.status:
        return status()
    if args.stop:
        return stop()

    # single-instance guard: do not fight an already-healthy instance on this port
    if not args.force and _health_ok(args.port):
        st = _read_state() or {}
        if st.get("status") == "up" or args.port:
            _log(f"a live instance already answers on port {args.port}; "
                 f"use --force to start anyway")
            print(json.dumps(st, ensure_ascii=False, indent=2))
            return 0

    runner = LiveRunner(port=args.port, use_tunnel=not args.no_tunnel)

    def _sig(*_):
        runner.shutdown()
        sys.exit(0)

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, _sig)
        except Exception:
            pass

    if args.once:
        # boot, verify, then fall through to the supervised loop
        if not runner.start_app() or not _wait_health(runner.port, 90, runner.app):
            _log("one-shot boot failed")
            runner.stop_app()
            return 1
        _log("one-shot boot healthy; entering supervised mode")

    try:
        runner.run()
    finally:
        runner.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
