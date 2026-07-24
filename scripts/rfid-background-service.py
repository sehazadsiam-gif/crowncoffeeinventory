#!/usr/bin/env python3
"""
=============================================================================
Crown Coffee - USB RFID Background Service
=============================================================================
This script runs in the background on the PC connected to the RFID scanner.
It captures RFID card scans automatically (even when the web browser is closed
or in the background) and sends attendance check-ins directly to the API.

NEW: Offline tap queue — if internet is down when a card is tapped, the scan
     is saved locally and retried automatically when connection is restored.
NEW: Audible beep feedback — success/error beeps via Windows winsound.

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
import threading

# Default API URL
DEFAULT_URL = os.environ.get("ATTENDANCE_API_URL", "https://ccadmin.online/api/attendance/checkin")
DEVICE_KEY  = os.environ.get("ATTENDANCE_DEVICE_KEY", "")

# Offline queue file — stores failed taps to retry later
QUEUE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "offline_queue.json")

# ── Redirect Handler ──────────────────────────────────────────────────────────

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

# ── Audible Beep ──────────────────────────────────────────────────────────────

def beep(type="success"):
    """Play a system beep. Works on Windows without extra packages."""
    try:
        if sys.platform == "win32":
            import winsound
            if type == "success":
                winsound.Beep(880, 120)   # High short beep — success
            elif type == "checkout":
                winsound.Beep(660, 120)
                time.sleep(0.05)
                winsound.Beep(880, 120)   # Two-tone — checkout
            elif type == "blocked":
                winsound.Beep(440, 200)   # Medium tone — already done
            else:
                winsound.Beep(280, 300)   # Low long beep — error/offline
        else:
            print("\a", end="", flush=True)  # Terminal bell on non-Windows
    except Exception:
        pass  # Beep is optional — never crash because of it

# ── Offline Queue ─────────────────────────────────────────────────────────────

def load_queue():
    if not os.path.exists(QUEUE_FILE):
        return []
    try:
        with open(QUEUE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_queue(queue):
    try:
        with open(QUEUE_FILE, "w") as f:
            json.dump(queue, f)
    except Exception as e:
        print(f"[QUEUE] Warning: could not save offline queue: {e}")

def enqueue_tap(api_url, card_code, device_key):
    queue = load_queue()
    queue.append({
        "api_url": api_url,
        "card_code": card_code,
        "device_key": device_key,
        "queued_at": time.strftime("%Y-%m-%dT%H:%M:%S")
    })
    save_queue(queue)
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] 📥 Tap saved to offline queue (will retry when internet is back). Queue size: {len(queue)}")

def flush_queue():
    """Retry all queued taps. Called by background thread every 30 seconds."""
    queue = load_queue()
    if not queue:
        return

    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] 🔄 Retrying {len(queue)} offline tap(s)...")

    remaining = []
    for tap in queue:
        success = send_checkin(
            tap["api_url"], tap["card_code"], tap.get("device_key", ""),
            queued_at=tap.get("queued_at"), suppress_queue=True
        )
        if not success:
            remaining.append(tap)

    save_queue(remaining)
    if len(remaining) < len(queue):
        print(f"[{ts}] ✅ Flushed {len(queue) - len(remaining)} tap(s) from offline queue. Remaining: {len(remaining)}")

def start_queue_flusher():
    """Background thread — retries offline queue every 30 seconds."""
    def loop():
        while True:
            time.sleep(30)
            try:
                flush_queue()
            except Exception:
                pass
    t = threading.Thread(target=loop, daemon=True)
    t.start()

# ── Check-In Sender ───────────────────────────────────────────────────────────

def send_checkin(api_url, card_code, device_key="", queued_at=None, suppress_queue=False):
    """
    Send card check-in request to ccadmin.online API.
    Returns True on success, False on network failure.
    """
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
    queued_note = f" [queued at {queued_at}]" if queued_at else ""
    print(f"[{timestamp_str}] 💳 Scanned RFID Card: {card_code}{queued_note}")

    payload = {"identifier": str(card_code).strip(), "source": "rfid"}
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
            res_json = json.loads(response.read().decode("utf-8"))

            if res_json.get("blocked"):
                name = res_json.get("staff", {}).get("name", "Staff")
                print(f"[{timestamp_str}] ⚠️  {name} — attendance already complete for today.")
                beep("blocked")
            elif res_json.get("success"):
                staff_name = res_json.get("staff", {}).get("name", "Staff")
                status = res_json.get("status", "present").upper()
                action = "CHECK-IN" if not res_json.get("alreadyCheckedOut") else "CHECK-OUT"
                print(f"[{timestamp_str}] ✅  {action}: {staff_name} — {status}")
                beep("checkout" if action == "CHECK-OUT" else "success")
            else:
                print(f"[{timestamp_str}] ⚠️  API Response: {res_json}")
                beep("error")

            return True  # Network OK

    except urllib.error.HTTPError as e:
        error_content = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_content)
            print(f"[{timestamp_str}] ❌  API Error ({e.code}): {err_json.get('error', error_content)}")
        except Exception:
            print(f"[{timestamp_str}] ❌  HTTP Error {e.code}: {error_content}")
        beep("error")
        return True  # HTTP error = server responded = no need to queue

    except Exception as err:
        print(f"[{timestamp_str}] 🌐  Offline/Network Error: {err}")
        beep("error")
        if not suppress_queue:
            enqueue_tap(api_url, card_code, device_key)
        return False  # Network failure — should queue

# ── Keyboard Listener ─────────────────────────────────────────────────────────

def run_pynput_listener(api_url, device_key):
    """Global keyboard listener using pynput (captures taps even when unfocused)."""
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
            print(f"Key read error: {e}")

    print("==========================================================")
    print(" ☕  Crown Coffee RFID Background Attendance Service")
    print(f"    API: {api_url}")
    print(f"    Queue file: {QUEUE_FILE}")
    print("    Ready! Scan an RFID card at any time...")
    print("    Offline taps will be queued and retried automatically.")
    print("==========================================================")

    # Start offline queue retry thread
    start_queue_flusher()
    # Flush any previously queued taps immediately on start
    flush_queue()

    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()

# ── Fallback Console Listener ─────────────────────────────────────────────────

def run_stdin_listener(api_url, device_key):
    """Fallback terminal stdin listener if pynput is unavailable."""
    print("==========================================================")
    print(" ☕  Crown Coffee RFID Console Listener")
    print(f"    API: {api_url}")
    print("    Scan RFID card or type card number + Enter...")
    print("==========================================================")
    start_queue_flusher()
    flush_queue()
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

# ── Entry Point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Crown Coffee RFID Background Attendance Service")
    parser.add_argument("--url",     default=DEFAULT_URL, help="Attendance Checkin API URL")
    parser.add_argument("--key",     default=DEVICE_KEY,  help="Optional X-Device-Key Header")
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
