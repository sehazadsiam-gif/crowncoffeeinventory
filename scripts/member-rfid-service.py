#!/usr/bin/env python3
"""
Crown Coffee - Dedicated Member RFID Background Listener Service
Runs in the background on the PC connected to the Member RFID reader hardware.
Captures member RFID card taps and submits them to the Crown Coffee API.

Usage:
  python3 scripts/member-rfid-service.py
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error
from datetime import datetime

# Default configuration
DEFAULT_API_URL = "https://ccadmin.online/api/members/rfid/tap"
LOCAL_API_URL = "http://localhost:3000/api/members/rfid/tap"

def safe_print(msg):
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode('ascii', errors='replace').decode('ascii'), flush=True)

def post_rfid_tap(api_url, card_code, location="Counter"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    payload = {
        "rfid_code": str(card_code).strip(),
        "location": location
    }

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        api_url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "CrownCoffee-Member-RFID-Service/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)

            if res_json.get("success"):
                member = res_json.get("member", {})
                visit_info = res_json.get("visit_recorded", {})
                safe_print(f"[{timestamp}] [SUCCESS] Member: {member.get('full_name')} | Card: {member.get('card_number')}")
                safe_print(f"[{timestamp}] Visits: #{visit_info.get('total_visits')} | Punch: {visit_info.get('punch_count')}/5 | Rewards: {visit_info.get('free_coffees_available')}")
                if visit_info.get("reward_unlocked"):
                    safe_print(f"[{timestamp}] REWARD UNLOCKED: 1 Free Coffee Reward Earned!")
            else:
                error_msg = res_json.get("error", "Unknown Error")
                safe_print(f"[{timestamp}] [WARNING] {error_msg}")

    except urllib.error.HTTPError as e:
        safe_print(f"[{timestamp}] [HTTP ERROR {e.code}] {e.reason}")
    except urllib.error.URLError as e:
        safe_print(f"[{timestamp}] [NETWORK ERROR] {e.reason}")
    except Exception as e:
        safe_print(f"[{timestamp}] [ERROR] {str(e)}")

def run_console_listener(api_url, location):
    safe_print("--------------------------------------------------")
    safe_print(" Crown Coffee - Member RFID Listener Service")
    safe_print(" Server Endpoint: " + api_url)
    safe_print(" Location: " + location)
    safe_print(" Ready. Scan Member RFID card or enter card number...")
    safe_print("--------------------------------------------------")

    while True:
        try:
            card_code = input("Scan Card > ").strip()
            if card_code:
                safe_print(f"\n[SCAN] Scanned RFID Card Code: {card_code}")
                post_rfid_tap(api_url, card_code, location)
        except KeyboardInterrupt:
            safe_print("\nStopping Member RFID Service.")
            sys.exit(0)
        except Exception as e:
            safe_print(f"Listener Error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Crown Coffee Member RFID Service")
    parser.add_argument("--local", action="store_true", help="Use local API endpoint (localhost:3000)")
    parser.add_argument("--url", type=str, help="Custom API endpoint URL")
    parser.add_argument("--location", type=str, default="Counter", help="Terminal location name")

    args = parser.parse_args()

    api_endpoint = DEFAULT_API_URL
    if args.local:
        api_endpoint = LOCAL_API_URL
    elif args.url:
        api_endpoint = args.url

    run_console_listener(api_endpoint, args.location)
