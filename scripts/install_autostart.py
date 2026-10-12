#!/usr/bin/env python3
"""
install_autostart.py — make the 24/7 live supervisor start on boot.

Windows : registers a Scheduled Task ("RobotCompanionLive").
Linux   : writes and enables a systemd unit (robot-companion.service).
macOS   : writes a launchd plist.

The task runs `scripts/live_runner.py`, which itself restarts the app and the
public tunnel if either dies, so the whole stack is resilient.

Usage:
    python scripts/install_autostart.py --install
    python scripts/install_autostart.py --install --no-tunnel --trigger onstart
    python scripts/install_autostart.py --status
    python scripts/install_autostart.py --uninstall
"""
from __future__ import annotations

import argparse
import os
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TASK_NAME = "RobotCompanionLive"
SERVICE_NAME = "robot-companion"


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def runner_command(no_tunnel: bool) -> list[str]:
    cmd = [sys.executable, str(ROOT / "scripts" / "live_runner.py")]
    if no_tunnel:
        cmd.append("--no-tunnel")
    return cmd


# ---------------------------------------------------------------------------
# Windows
# ---------------------------------------------------------------------------
def _startup_dir() -> Path:
    return Path(os.getenv("APPDATA", "")) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"


def install_windows_startup(no_tunnel: bool) -> int:
    """Logon autostart without admin: a hidden launcher in the Startup folder."""
    d = _startup_dir()
    d.mkdir(parents=True, exist_ok=True)
    args = runner_command(no_tunnel)
    cmdline = " ".join(f'"{a}"' for a in args)
    vbs = d / f"{TASK_NAME}.vbs"
    vbs.write_text(
        'Set s = CreateObject("WScript.Shell")\r\n'
        f's.Run "{cmdline}", 0, False\r\n',
        encoding="utf-8",
    )
    print(f"installed startup launcher (no admin needed): {vbs}")
    print("it will start the 24/7 supervisor at every logon.")
    return 0


def install_windows(trigger: str, no_tunnel: bool) -> int:
    tr = {"onstart": "ONSTART", "onlogon": "ONLOGON", "both": "ONLOGON"}.get(trigger, "ONLOGON")
    args = runner_command(no_tunnel)
    tr_arg = args[0]
    ar_arg = " ".join(f'"{a}"' for a in args[1:])
    cmd = [
        "schtasks", "/Create", "/TN", TASK_NAME, "/TR", f'"{tr_arg}" {ar_arg}',
        "/SC", tr, "/F",
    ]
    r = run(cmd)
    if r.returncode != 0:
        print(f"schtasks unavailable ({r.stderr.strip() or r.stdout.strip()}); "
              f"falling back to Startup folder")
        return install_windows_startup(no_tunnel)
    print(f"registered scheduled task '{TASK_NAME}' ({tr})")
    # start immediately
    run(["schtasks", "/Run", "/TN", TASK_NAME])
    print("task started now")
    return 0


def uninstall_windows() -> int:
    r = run(["schtasks", "/Delete", "/TN", TASK_NAME, "/F"])
    print("scheduled task removed" if r.returncode == 0 else "no scheduled task found")
    vbs = _startup_dir() / f"{TASK_NAME}.vbs"
    if vbs.exists():
        try:
            vbs.unlink()
            print(f"startup launcher removed: {vbs}")
        except Exception as exc:
            print(f"could not remove {vbs}: {exc}")
    return 0


def status_windows() -> int:
    r = run(["schtasks", "/Query", "/TN", TASK_NAME, "/V", "/FO", "LIST"])
    vbs = _startup_dir() / f"{TASK_NAME}.vbs"
    found = False
    if r.returncode == 0:
        print(r.stdout)
        found = True
    if vbs.exists():
        print(f"startup launcher present: {vbs}")
        content = vbs.read_text(encoding="utf-8", errors="replace")
        line = next((ln for ln in content.splitlines() if ".Run" in ln), "")
        print(f"  -> {line.strip()}")
        found = True
    if not found:
        print("autostart not installed")
        return 1
    return 0


# ---------------------------------------------------------------------------
# Linux (systemd)
# ---------------------------------------------------------------------------
def install_linux(no_tunnel: bool) -> int:
    args = runner_command(no_tunnel)
    unit = f"""[Unit]
Description=European Children Companion Robot (24/7 live supervisor)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory={ROOT}
ExecStart={' '.join(args)}
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1
Environment=ROBOT_STAGE=production
User={os.getenv('USER','root')}

[Install]
WantedBy=multi-user.target
"""
    path = Path(f"/tmp/{SERVICE_NAME}.service")
    path.write_text(unit, encoding="utf-8")
    print(f"wrote {path}")
    print("install with:")
    print(f"  sudo cp {path} /etc/systemd/system/{SERVICE_NAME}.service")
    print(f"  sudo systemctl daemon-reload && sudo systemctl enable --now {SERVICE_NAME}")
    return 0


# ---------------------------------------------------------------------------
# macOS (launchd)
# ---------------------------------------------------------------------------
def install_macos(no_tunnel: bool) -> int:
    args = runner_command(no_tunnel)
    plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.robot.{SERVICE_NAME}</string>
  <key>ProgramArguments</key><array>
    {''.join(f'<string>{a}</string>' for a in args)}
  </array>
  <key>WorkingDirectory</key><string>{ROOT}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
"""
    path = Path.home() / "Library" / "LaunchAgents" / f"com.robot.{SERVICE_NAME}.plist"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(plist, encoding="utf-8")
    print(f"wrote {path}")
    print(f"  load with: launchctl load {path}")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Install 24/7 autostart")
    ap.add_argument("--install", action="store_true")
    ap.add_argument("--uninstall", action="store_true")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--no-tunnel", action="store_true")
    ap.add_argument("--trigger", choices=["onstart", "onlogon", "both"], default="onlogon",
                    help="Windows trigger (default onlogon so it works without admin)")
    args = ap.parse_args(argv)

    sysname = platform.system().lower()

    if args.uninstall:
        if sysname == "windows":
            return uninstall_windows()
        print("uninstall: remove the unit/plist shown at install time.")
        return 0

    if args.status:
        if sysname == "windows":
            return status_windows()
        print("status: check systemctl / launchctl")
        return 0

    if not args.install:
        ap.print_help()
        return 0

    if sysname == "windows":
        return install_windows(args.trigger, args.no_tunnel)
    if sysname == "darwin":
        return install_macos(args.no_tunnel)
    return install_linux(args.no_tunnel)


if __name__ == "__main__":
    sys.exit(main())
