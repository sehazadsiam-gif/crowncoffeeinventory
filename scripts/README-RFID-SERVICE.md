# ☕ Crown Coffee - Background RFID Attendance Service Setup

This standalone script allows your RFID Card Reader to record attendance **in the background 24/7**, even when the web browser is closed or when someone is using the PC for other tasks.

---

## 🌐 How Multi-PC Setup Works

1. **Website & Backend (`https://ccadmin.online`)**:
   - Hosted online on the server.
   - Accessible from **any PC, laptop, or phone** in the world. You do **NOT** need the website codebase on the cafe PC!

2. **Cafe Counter PC (Where the RFID reader is plugged in)**:
   - Only needs **this single script** (`rfid-background-service.py`).
   - Runs in the background on the Cafe PC. Whenever an RFID tag is tapped, it sends a secure HTTP request over the internet to `https://ccadmin.online/api/attendance/checkin`.
   - Attendance is instantly recorded in the online database!

---

## 🚀 Quick Start on the Cafe PC

### Step 1: Ensure Python is installed
- **Windows**: Install Python from [python.org](https://www.python.org/downloads/) (Make sure to check *"Add Python to PATH"* during installation).
- **Mac / Linux**: Python 3 is pre-installed (`python3`).

### Step 2: Run the Service

On **Mac / Linux**:
```bash
python3 scripts/rfid-background-service.py
```

On **Windows**:
```cmd
python scripts/rfid-background-service.py
```

---

## 🖥️ How to Run Automatically on PC Startup (Silent Background)

### Windows (Autostart on PC Boot)
1. Press `Win + R`, type `shell:startup`, and press **Enter**.
2. Create a batch file `start_rfid.bat`:
   ```bat
   @echo off
   python "C:\path\to\rfid-background-service.py"
   ```
3. Place `start_rfid.bat` in the Startup folder. It will launch silently whenever Windows turns on!

---

### macOS (LaunchAgent / Startup)
1. Open Terminal and create a LaunchAgent configuration:
   `~/Library/LaunchAgents/com.crowncoffee.rfid.plist`
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.crowncoffee.rfid</string>
       <key>ProgramArguments</key>
       <array>
           <string>/usr/bin/python3</string>
           <string>/Users/youruser/path/to/rfid-background-service.py</string>
       </array>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
   </dict>
   </plist>
   ```
2. Load the daemon:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.crowncoffee.rfid.plist
   ```

