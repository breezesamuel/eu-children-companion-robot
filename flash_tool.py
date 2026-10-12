#!/usr/bin/env python3
"""
Robot Flasher & Console — USB-TTL (CH340) for STM32 & RK3588.

Usage:
  python flash_tool.py                          # Status
  python flash_tool.py --detect                 # Detect STM32
  python flash_tool.py --write firmware.bin     # Flash STM32
  python flash_tool.py --console               # RK3588 UART console
  python flash_tool.py --test-loopback          # Verify USB-TTL wiring
"""

import sys, os, argparse, time, glob, threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

FIRMWARE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "firmware", "stm32")
DEFAULT_PORT = "COM3"

def detect_port():
    try:
        import serial.tools.list_ports
        for p in serial.tools.list_ports.comports():
            if "CH340" in p.description or (p.vid and p.vid == 0x1A86):
                return p.device
    except Exception:
        pass
    return DEFAULT_PORT

def list_ports():
    try:
        import serial.tools.list_ports
        print("Available ports:")
        for p in serial.tools.list_ports.comports():
            flag = " <--" if p.device == detect_port() else ""
            print(f"  {p.device}: {p.description}{flag}")
    except Exception:
        print("[!] pyserial not installed: pip install pyserial")

def try_bootloader(port):
    import serial
    baudrates = [115200, 57600, 38400, 19200, 9600, 230400, 460800]
    for baud in baudrates:
        try:
            ser = serial.Serial(port=port, baudrate=baud, timeout=1)
            # Pulse DTR to reset if wired
            ser.setDTR(False); time.sleep(0.1)
            ser.setDTR(True); time.sleep(0.1)
            ser.setDTR(False); time.sleep(0.3)
            ser.write(b'\x7f')
            time.sleep(0.2)
            resp = ser.read(5)
            ser.close()
            if resp and resp[0] == 0x79:
                return baud
            elif resp:
                print(f"  Response at {baud}: {resp.hex()}")
        except Exception:
            continue
    return None

def console_mode(port, baud=115200):
    """RK3588 UART console (8N1, no flow control)."""
    import serial
    print(f"Opening UART console on {port} @ {baud}...")
    print("Press Ctrl+C to exit.")
    ser = serial.Serial(port=port, baudrate=baud, timeout=0.1)
    running = True

    def reader():
        nonlocal running
        while running:
            try:
                data = ser.read(256)
                if data:
                    sys.stdout.write(data.decode('utf-8', errors='replace'))
                    sys.stdout.flush()
            except Exception:
                break

    t = threading.Thread(target=reader, daemon=True)
    t.start()
    try:
        while running:
            inp = sys.stdin.read(1)
            if not inp:
                break
            ser.write(inp.encode())
    except KeyboardInterrupt:
        running = False
    finally:
        ser.close()
        print("\nConsole closed.")

def loopback_test(port):
    """Verify USB-TTL wiring by testing TX->RX loopback."""
    import serial
    print(f"Loopback test on {port}...")
    ser = serial.Serial(port=port, baudrate=115200, timeout=2)
    ser.write(b'HELLO_CH340!\r\n')
    time.sleep(0.3)
    resp = ser.read(64)
    ser.close()
    if resp:
        print(f"  [OK] Echo received: {resp}")
        print("  TX→RX connected (loopback or through target)")
    else:
        print("  [NO ECHO] TX not reaching RX")
        print("  Check: GND connected? TX→STM32 RX, RX←STM32 TX?")

def do_flash(port, fw_path, baud, verify):
    if not os.path.exists(fw_path):
        matches = glob.glob(os.path.join(FIRMWARE_DIR, fw_path))
        if not matches:
            print(f"Firmware not found: {fw_path}")
            for f in glob.glob(os.path.join(FIRMWARE_DIR, "*.bin")):
                print(f"  Available: {f}")
            sys.exit(1)
        fw_path = matches[0]
    flags = ["-e", "-w"]
    if verify:
        flags.append("-v")
    cmd = f'python -m stm32loader -p {port} -b {baud} {" ".join(flags)} "{fw_path}"'
    print(f"Flashing: {os.path.basename(fw_path)} ({os.path.getsize(fw_path)} bytes)")
    sys.exit(os.system(cmd))

def main():
    parser = argparse.ArgumentParser(description="Robot Flasher & Console")
    parser.add_argument("--port", default=None, help="COM port")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--list-ports", action="store_true", help="List COM ports")
    parser.add_argument("--detect", action="store_true", help="Detect STM32 bootloader")
    parser.add_argument("--console", action="store_true", help="UART console (RK3588)")
    parser.add_argument("--test-loopback", action="store_true", help="Test TX/RX wiring")
    parser.add_argument("--write", help="Flash firmware .bin")
    parser.add_argument("--read", help="Backup firmware to file")
    parser.add_argument("--erase", action="store_true", help="Erase STM32 flash")
    parser.add_argument("--family", default="F4", help="STM32 family (F0/F1/F3/F4/F7/H7/L4/G0)")
    args = parser.parse_args()

    port = args.port or detect_port()

    if args.list_ports:
        list_ports()
        return

    if args.test_loopback:
        loopback_test(port)
        return

    if args.console:
        console_mode(port, args.baud)
        return

    if args.detect:
        print(f"Port: {port}")
        baud = try_bootloader(port)
        if baud:
            print(f"[READY] STM32 at {baud} baud")
        else:
            print("[WAITING] No STM32 bootloader detected")
            print("  1. Set BOOT0 jumper to HIGH")
            print("  2. Press RESET button")
            print("  3. Verify TX→PA10(RX), RX→PA9(TX), GND→GND")
        return

    if args.erase:
        os.system(f'python -m stm32loader -p {port} --family {args.family} -e')
        return

    if args.write:
        do_flash(port, args.write, args.baud, args.read is None)
        return

    if args.read:
        os.system(f'python -m stm32loader -p {port} --family {args.family} -r "{args.read}"')
        return

    # Default: full status
    list_ports()
    print()
    baud = try_bootloader(port)
    if baud:
        print(f"[READY] STM32 @ {port} ({baud} baud)")
        print(f"  Flash: python flash_tool.py --write firmware/stm32/robot_fw_v2.1.0.bin")
    else:
        print(f"[IDLE] {port} — no STM32 detected")
        print(f"  Console: python flash_tool.py --console")
        print(f"  Detect:  python flash_tool.py --detect")

if __name__ == "__main__":
    main()
