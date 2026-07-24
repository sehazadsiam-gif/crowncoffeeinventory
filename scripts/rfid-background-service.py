#!/usr/bin/env python3
"""
=============================================================================
Crown Coffee - USB RFID Background Service
=============================================================================
This script runs in the background on the PC connected to the RFID scanner.
It captures RFID card scans automatically (even when the web browser is closed
or in the background) and sends attendance check-ins directly to the API.

Usage:
  python3 rfid-background-service.py [--url API_URL] [--key DEVICE_KEY]

Options:
  --url   The endpoint URL (default: https://ccadmin.online/api/attendance/checkin)
  --key   Optional X-Device-Key header value
=============================================================================
"""

import sys
import time
import json
import urllib.request
import urllib.error
import argparse
import os

# Default API URL
DEFAULT_URL = os.environ.get("ATTENDANCE_API_URL", "https://ccadmin.online/api/attendance/checkin")
DEVICE_KEY = os.environ.get("ATTENDANCE_DEVICE_KEY", "")

class HTTP307RedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if code in (307, 308):
            return urllib.request.Request(
                newurl,
                data=req.data,
                headers=dict(req.headers),
                method=req.get_method()
            )
        return super().redirect_request(req, fp, code, msg, headers, newurl)

opener = urllib.request.build_opener(HTTP307RedirectHandler)

def send_checkin(api_url, card_code, device_key=""):
    """Send card check-in request to ccadmin.online API."""
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp_str}] 💳 Scanned RFID Card: {card_code}")
    
    payload = {
        "identifier": str(card_code).strip(),
        "source": "rfid"
    }
    
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "CrownCoffee-RFID-Service/1.0"
    }
    if device_key:
        headers["x-device-key"] = device_key
        
    req = urllib.request.Request(api_url, data=data, headers=headers, method="POST")
    
    try:
        with opener.open(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            
            if res_json.get("blocked"):
                print(f"[{timestamp_str}] ⚠️  Check-in blocked: {res_json.get('staff', {}).get('name', 'Staff')} has already completed attendance today.")
            elif res_json.get("success"):
                staff_name = res_json.get("staff", {}).get("name", "Staff")
                status = res_json.get("action", "recorded").upper()
                time_disp = res_json.get("record", {}).get("check_in") or res_json.get("record", {}).get("check_out") or ""
                print(f"[{timestamp_str}] ✅  SUCCESS! {staff_name} - {status} ({time_disp})")
            else:
                print(f"[{timestamp_str}] ⚠️  API Response: {res_json}")
                
    except urllib.error.HTTPError as e:
        error_content = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_content)
            print(f"[{timestamp_str}] ❌  Check-in Failed ({e.code}): {err_json.get('error', error_content)}")
        except Exception:
            print(f"[{timestamp_str}] ❌  HTTP Error {e.code}: {error_content}")
    except Exception as err:
        print(f"[{timestamp_str}] ❌  Network/Service Error: {err}")

def run_pynput_listener(api_url, device_key):
    """Global keyboard listener using pynput (Captures taps even when unfocused)."""
    try:
        from pynput import keyboard
    except ImportError:
        print("Installing 'pynput' library for background keyboard capture...")
        os.system(f"{sys.executable} -m pip install pynput")
        from pynput import keyboard

    buffer = []
    last_key_time = [time.time()]

    def on_press(key):
        now = time.time()
        # RFID scanners output numbers in rapid succession (< 50ms between keypresses)
        if now - last_key_time[0] > 0.2:
            buffer.clear()
        last_key_time[0] = now

        try:
            if hasattr(key, 'char') and key.char:
                buffer.append(key.char)
            elif key == keyboard.Key.enter:
                if len(buffer) >= 3:
                    card_code = "".join(buffer).strip()
                    buffer.clear()
                    send_checkin(api_url, card_code, device_key)
            elif key == keyboard.Key.backspace and buffer:
                buffer.pop()
        except Exception as e:
            print(f"Error reading key: {e}")

    print("==========================================================")
    print(" ☕ Crown Coffee RFID Background Attendance Service Running")
    print(f" Target API: {api_url}")
    print(" Ready! Scan an RFID card at any time...")
    print("==========================================================")

    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()

def run_stdin_listener(api_url, device_key):
    """Fallback terminal stdin listener if pynput is unavailable."""
    print("==========================================================")
    print(" ☕ Crown Coffee RFID Console Listener Running")
    print(f" Target API: {api_url}")
    print(" Ready! Scan an RFID card or type card number and press Enter...")
    print("==========================================================")
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            card_code = line.strip()
            if card_code:
                send_checkin(api_url, card_code, device_key)
        except KeyboardInterrupt:
            print("\nStopping RFID service.")
            break
        except Exception as e:
            print(f"Error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Crown Coffee RFID Background Attendance Service")
    parser.add_argument("--url", default=DEFAULT_URL, help="Attendance Checkin API URL")
    parser.add_argument("--key", default=DEVICE_KEY, help="Optional X-Device-Key Header")
    parser.add_argument("--console", action="store_true", help="Run in interactive console mode")

    args = parser.parse_args()

    if args.console:
        run_stdin_listener(args.url, args.key)
    else:
        try:
            run_pynput_listener(args.url, args.key)
        except Exception as e:
            print(f"Pynput listener failed: {e}. Falling back to console mode.")
            run_stdin_listener(args.url, args.key)

if __name__ == "__main__":
    main()
