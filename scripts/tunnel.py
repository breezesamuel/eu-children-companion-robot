#!/usr/bin/env python3
"""
Free public tunnel bridge — expose the robot-companion app on the internet.

This is a *real* bridge, not a claim:
  * It downloads Cloudflare's `cloudflared` (Apache-2.0) from the official
    GitHub release asset for the current platform on first use.
  * It runs a "quick tunnel" (`cloudflared tunnel --url ...`), which requires
    no account and yields a public HTTPS URL under `*.trycloudflare.com`.
  * The public URL is parsed from cloudflared's own output. It is never
    fabricated: if the URL cannot be parsed the tunnel is reported DOWN.

Usage:
    python scripts/tunnel.py --port 8888            # run until Ctrl-C
    python scripts/tunnel.py --port 8888 --timeout 90 --print-url
    python scripts/tunnel.py --check                # report availability only
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import threading
import time
import urllib.request
from pathlib import Path
from typing import Callable, Optional

ROOT = Path(__file__).resolve().parent.parent
BIN_DIR = ROOT / "runtime" / "bin"
STATE_PATH = ROOT / "runtime" / "tunnel_state.json"

# Official release base for the cloudflared project (Apache-2.0).
RELEASE_BASE = "https://github.com/cloudflare/cloudflared/releases/latest/download"
URL_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")


def _platform_asset() -> tuple[str, str]:
    """Return (asset_filename, local_filename) for the current platform."""
    sysname = platform.system().lower()
    machine = platform.machine().lower()
    arch = "amd64" if machine in ("x86_64", "amd64") else ("arm64" if machine in ("aarch64", "arm64") else machine)
    if sysname == "windows":
        return f"cloudflared-windows-{arch}.exe", "cloudflared.exe"
    if sysname == "darwin":
        return f"cloudflared-darwin-{arch}.tgz", "cloudflared"
    return f"cloudflared-linux-{arch}", "cloudflared"


def ensure_cloudflared(cache_dir: Path = BIN_DIR, log: Callable[[str], None] = print) -> Optional[Path]:
    """Ensure a runnable cloudflared binary exists locally.

    Returns the path, or None if it cannot be obtained. Never raises.
    """
    cache_dir.mkdir(parents=True, exist_ok=True)
    # Prefer an already-installed binary on PATH.
    on_path = shutil.which("cloudflared")
    if on_path:
        return Path(on_path)

    asset, local_name = _platform_asset()
    target = cache_dir / local_name
    if target.exists():
        try:
            subprocess.run([str(target), "--version"], capture_output=True, timeout=20, check=True)
            return target
        except Exception:
            log(f"cached cloudflared unusable, re-downloading: {target}")

    url = f"{RELEASE_BASE}/{asset}"
    log(f"downloading cloudflared: {url}")
    try:
        tmp = cache_dir / (local_name + ".part")
        with urllib.request.urlopen(url, timeout=120) as resp, open(tmp, "wb") as fh:
            shutil.copyfileobj(resp, fh)
        if asset.endswith(".tgz"):
            with tarfile.open(tmp, "r:gz") as tf:
                member = next((m for m in tf.getmembers() if m.name.endswith("cloudflared")), None)
                if not member:
                    raise RuntimeError("cloudflared not found in archive")
                tf.extract(member, cache_dir)
                extracted = cache_dir / member.name
                extracted.replace(target)
        else:
            tmp.replace(target)
        if platform.system().lower() != "windows":
            target.chmod(target.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        subprocess.run([str(target), "--version"], capture_output=True, timeout=20, check=True)
        log(f"cloudflared ready: {target}")
        return target
    except Exception as exc:  # pragma: no cover - network dependent
        log(f"cloudflared unavailable: {exc}")
        return None


class CloudflareTunnel:
    """Supervise a cloudflared quick tunnel and expose its public URL."""

    def __init__(self, port: int, binary: Optional[Path] = None, log: Callable[[str], None] = print):
        self.port = port
        self.binary = binary
        self.log = log
        self.proc: Optional[subprocess.Popen] = None
        self.public_url: Optional[str] = None
        self._url_event = threading.Event()
        self._reader: Optional[threading.Thread] = None

    def start(self) -> bool:
        if self.binary is None:
            self.binary = ensure_cloudflared(log=self.log)
        if self.binary is None:
            return False
        cmd = [
            str(self.binary), "tunnel", "--no-autoupdate",
            "--url", f"http://127.0.0.1:{self.port}",
        ]
        self.log(f"starting tunnel -> {self.port}")
        try:
            self.proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace", bufsize=1,
            )
        except Exception as exc:
            self.log(f"tunnel start failed: {exc}")
            return False
        self._reader = threading.Thread(target=self._read_output, daemon=True)
        self._reader.start()
        return True

    def _read_output(self):
        assert self.proc and self.proc.stdout
        for line in self.proc.stdout:
            line = line.rstrip()
            if not line:
                continue
            if "trycloudflare.com" in line and not self.public_url:
                m = URL_RE.search(line)
                if m:
                    self.public_url = m.group(0)
                    self._url_event.set()
                    self.log(f"public URL: {self.public_url}")
                    self._write_state("up")
            elif "ERR" in line or "error" in line.lower():
                self.log(f"[cloudflared] {line}")

    def wait_for_url(self, timeout: int = 90) -> Optional[str]:
        if self._url_event.wait(timeout):
            return self.public_url
        return None

    def _write_state(self, status: str):
        try:
            STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
            STATE_PATH.write_text(json.dumps({
                "status": status,
                "backend": "cloudflare-quick-tunnel",
                "port": self.port,
                "public_url": self.public_url,
                "pid": self.proc.pid if self.proc else None,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

    def is_alive(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def stop(self):
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.terminate()
                self.proc.wait(timeout=10)
            except Exception:
                try:
                    self.proc.kill()
                except Exception:
                    pass
        self._write_state("stopped")


def check() -> dict:
    """Report tunnel availability without starting one."""
    binary = ensure_cloudflared()
    return {
        "available": binary is not None,
        "binary": str(binary) if binary else None,
        "backend": "cloudflare-quick-tunnel",
        "account_required": False,
        "public_url_suffix": "trycloudflare.com",
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Free public tunnel bridge (Cloudflare quick tunnel)")
    ap.add_argument("--port", type=int, default=int(os.getenv("PORT", "8888")))
    ap.add_argument("--timeout", type=int, default=90)
    ap.add_argument("--check", action="store_true", help="report availability only")
    ap.add_argument("--print-url", action="store_true", help="print URL and keep running")
    args = ap.parse_args(argv)

    if args.check:
        print(json.dumps(check(), ensure_ascii=False, indent=2))
        return 0

    tun = CloudflareTunnel(args.port)
    if not tun.start():
        print("tunnel unavailable (cloudflared could not be obtained)", file=sys.stderr)
        return 1
    url = tun.wait_for_url(args.timeout)
    if not url:
        print("tunnel started but no public URL was parsed within timeout", file=sys.stderr)
        tun.stop()
        return 1
    print(url, flush=True)
    try:
        while tun.is_alive():
            time.sleep(2)
    except KeyboardInterrupt:
        pass
    finally:
        tun.stop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
