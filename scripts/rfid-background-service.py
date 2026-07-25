#!/usr/bin/env python3
"""
=============================================================================
Crown Coffee - USB RFID Background Service
=============================================================================
This script runs in the background on the PC connected to the RFID scanner.
It captures RFID card scans automatically (even when the web browser is closed
or in the background) and sends attendance check-ins directly to the API.

Features:
 - Multi-platform (Windows, Mac, Linux)
 - Safe Unicode print fallback for Windows CMD (no charmap crash)
 - Support for both regular keys and Numpad virtual keys (vk 96-105)
 - Offline tap queue with auto-retry
 - Audible beep feedback
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

# Force UTF-8 encoding for stdout/stderr on Windows to prevent UnicodeEncodeError in cmd
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def safe_print(*args, **kwargs):
    """Print wrapper that strips or replaces unencodable characters if console lacks UTF-8."""
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        text = " ".join(str(a) for a in args)
        clean_text = text.encode("ascii", errors="replace").decode("ascii")
        print(clean_text, **kwargs)

# Default API URL
DEFAULT_URL = os.environ.get("ATTENDANCE_API_URL", "https://ccadmin.online/api/attendance/checkin")
DEVICE_KEY  = os.environ.get("ATTENDANCE_DEVICE_KEY", "")

# Offline queue file
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
                winsound.Beep(880, 120)   # High short beep
            elif type == "checkout":
                winsound.Beep(660, 120)
                time.sleep(0.05)
                winsound.Beep(880, 120)   # Two-tone
            elif type == "blocked":
                winsound.Beep(440, 200)   # Medium tone
            else:
                winsound.Beep(280, 300)   # Low long beep
        else:
            safe_print("\a", end="", flush=True)
    except Exception:
        pass

# ── Offline Queue ─────────────────────────────────────────────────────────────

def load_queue():
    if not os.path.exists(QUEUE_FILE):
        return []
    try:
        with open(QUEUE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_queue(queue):
    try:
        with open(QUEUE_FILE, "w", encoding="utf-8") as f:
            json.dump(queue, f, indent=2)
    except Exception as e:
        safe_print(f"[QUEUE] Warning: could not save offline queue: {e}")

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
    safe_print(f"[{ts}] [QUEUE] Tap saved to offline queue. Queue size: {len(queue)}")

def flush_queue():
    """Retry all queued taps."""
    queue = load_queue()
    if not queue:
        return

    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    safe_print(f"[{ts}] [RETRY] Retrying {len(queue)} offline tap(s)...")

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
        safe_print(f"[{ts}] [SUCCESS] Flushed {len(queue) - len(remaining)} tap(s) from offline queue. Remaining: {len(remaining)}")

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
    Send card check-in request to API.
    """
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
    queued_note = f" [queued at {queued_at}]" if queued_at else ""
    safe_print(f"[{timestamp_str}] [RFID] Scanned Card Code: {card_code}{queued_note}")

    payload = {"identifier": str(card_code).strip(), "source": "rfid", "enableBreak": True}
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
                safe_print(f"[{timestamp_str}] [BLOCKED] {name} — attendance already complete for today.")
                beep("blocked")
            elif res_json.get("success"):
                staff_name = res_json.get("staff", {}).get("name", "Staff")
                status = res_json.get("status", "present").upper()
                raw_action = res_json.get("action", "")
                
                if raw_action == "break_start":
                    action_label = "BREAK START ☕"
                    beep_type = "success"
                elif raw_action == "break_end":
                    action_label = "BREAK END 🔵"
                    beep_type = "success"
                elif res_json.get("alreadyCheckedOut") or raw_action == "check_out":
                    action_label = "CHECK-OUT ⚪"
                    beep_type = "checkout"
                else:
                    action_label = "CHECK-IN 🟢"
                    beep_type = "success"

                msg = res_json.get("message") or status
                safe_print(f"[{timestamp_str}] [OK] {action_label}: {staff_name} — {msg}")
                beep(beep_type)
            else:
                safe_print(f"[{timestamp_str}] [RESPONSE] API Response: {res_json}")
                beep("error")

            return True

    except urllib.error.HTTPError as e:
        error_content = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_content)
            safe_print(f"[{timestamp_str}] [ERROR] API Error ({e.code}): {err_json.get('error', error_content)}")
        except Exception:
            safe_print(f"[{timestamp_str}] [ERROR] HTTP Error {e.code}: {error_content}")
        beep("error")
        return True

    except Exception as err:
        safe_print(f"[{timestamp_str}] [OFFLINE] Network Error: {err}")
        beep("error")
        if not suppress_queue:
            enqueue_tap(api_url, card_code, device_key)
        return False

# ── Keyboard Listener ─────────────────────────────────────────────────────────

def run_pynput_listener(api_url, device_key):
    """Global keyboard listener using pynput."""
    try:
        from pynput import keyboard
    except ImportError:
        safe_print("Installing 'pynput' library for background keyboard capture...")
        os.system(f'"{sys.executable}" -m pip install pynput')
        try:
            from pynput import keyboard
        except ImportError:
            safe_print("[WARN] 'pynput' is not installed. Run: pip install pynput")
            safe_print("Falling back to console stdin listener...")
            return run_stdin_listener(api_url, device_key)

    buffer = []
    last_key_time = [time.time()]

    def extract_char(key):
        """Extract character from key object, including Numpad keys."""
        # Standard character
        if hasattr(key, 'char') and key.char:
            return key.char
        
        # Virtual keycodes (Windows/Linux Numpad & Digits)
        vk = getattr(key, 'vk', None)
        if vk is not None:
            # Numpad 0-9 (vk 96 to 105)
            if 96 <= vk <= 105:
                return str(vk - 96)
            # Top row 0-9 (vk 48 to 57)
            if 48 <= vk <= 57:
                return str(vk - 48)
        
        return None

    def is_enter_key(key):
        """Check if key is Enter / Return."""
        if key in (keyboard.Key.enter, getattr(keyboard.Key, 'enter_l', keyboard.Key.enter)):
            return True
        vk = getattr(key, 'vk', None)
        if vk in (13, 108): # 13 = Enter, 108 = Numpad Enter
            return True
        ch = getattr(key, 'char', None)
        if ch in ('\r', '\n'):
            return True
        return False

    def on_press(key):
        now = time.time()
        # Reset buffer if key gap > 0.8 seconds
        if now - last_key_time[0] > 0.8:
            buffer.clear()
        last_key_time[0] = now

        try:
            ch = extract_char(key)
            if ch:
                buffer.append(ch)
            elif is_enter_key(key):
                if len(buffer) >= 3:
                    card_code = "".join(buffer).strip()
                    buffer.clear()
                    send_checkin(api_url, card_code, device_key)
                else:
                    buffer.clear()
            elif key == keyboard.Key.backspace and buffer:
                buffer.pop()
        except Exception as e:
            safe_print(f"Key read error: {e}")

    safe_print("==========================================================")
    safe_print(" Crown Coffee RFID Background Attendance Service Running")
    safe_print(f" Target API: {api_url}")
    safe_print(" Ready! Scan an RFID card at any time...")
    safe_print("==========================================================")

    start_queue_flusher()
    flush_queue()

    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()

# ── Fallback Console Listener ─────────────────────────────────────────────────

def run_stdin_listener(api_url, device_key):
    """Fallback terminal stdin listener."""
    safe_print("==========================================================")
    safe_print(" Crown Coffee RFID Console Listener")
    safe_print(f" Target API: {api_url}")
    safe_print(" Scan RFID card or type card number + Enter...")
    safe_print("==========================================================")
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
            safe_print("\nStopping RFID service.")
            break
        except Exception as e:
            safe_print(f"Error: {e}")

# ── Native Windows Global Listener (via 'keyboard' or 'pynput') ────────────────

def run_keyboard_module_listener(api_url, device_key):
    """
    Ultra-reliable background listener using python 'keyboard' package.
    Hooks low-level Windows keyboard events globally across all windows.
    """
    import keyboard
    safe_print("==========================================================")
    safe_print(" Crown Coffee RFID Background Listener (Native Hook)")
    safe_print(f" Target API: {api_url}")
    safe_print(" Ready! Capturing RFID card scans in BACKGROUND...")
    safe_print("==========================================================")

    start_queue_flusher()
    flush_queue()

    buffer = []
    last_key_time = [time.time()]

    def on_event(e):
        if e.event_type != 'down':
            return
        now = time.time()
        if now - last_key_time[0] > 1.5:
            buffer.clear()
        last_key_time[0] = now

        name = e.name.lower() if e.name else ''
        if name in ('enter', 'return'):
            if len(buffer) >= 3:
                card_code = "".join(buffer).strip()
                buffer.clear()
                threading.Thread(target=send_checkin, args=(api_url, card_code, device_key), daemon=True).start()
            else:
                buffer.clear()
        elif name == 'backspace' and buffer:
            buffer.pop()
        elif len(name) == 1 and (name.isalnum() or name in '0123456789'):
            buffer.append(name)

    keyboard.hook(on_event)
    keyboard.wait()

def main():
    parser = argparse.ArgumentParser(description="Crown Coffee RFID Background Attendance Service")
    parser.add_argument("--url",     default=DEFAULT_URL, help="Attendance Checkin API URL")
    parser.add_argument("--key",     default=DEVICE_KEY,  help="Optional X-Device-Key Header")
    parser.add_argument("--console", action="store_true", help="Run in interactive console mode")

    args = parser.parse_args()

    if args.console:
        run_stdin_listener(args.url, args.key)
        return

    # Try 'keyboard' library first (best for Windows background execution)
    try:
        run_keyboard_module_listener(args.url, args.key)
        return
    except Exception as e1:
        safe_print(f"[INFO] 'keyboard' library listener not available ({e1}). Trying pynput...")

    # Try 'pynput' library second
    try:
        run_pynput_listener(args.url, args.key)
        return
    except Exception as e2:
        safe_print(f"[WARNING] Pynput listener also failed ({e2}).")

    safe_print("\n" + "!" * 65)
    safe_print(" ATTENTION: Background RFID Listening requires one of these packages:")
    safe_print("   pip install keyboard pynput")
    safe_print(" IMPORTANT on Windows: Right-click Command Prompt and select 'Run as Administrator'")
    safe_print("!" * 65 + "\n")

    run_stdin_listener(args.url, args.key)

if __name__ == "__main__":
    main()
