# 🪟 Complete Windows Setup Guide for Cafe Counter RFID Attendance

Follow these step-by-step instructions to set up the RFID Reader background service on any Windows Cafe Counter PC.

---

## Step 1: Install Python on Windows (One-time setup)

1. Download Python from the official site: **[python.org/downloads](https://www.python.org/downloads/)**
2. Run the downloaded file (`python-3.x.x-amd64.exe`).
3. ⚠️ **CRITICAL STEP**: At the very bottom of the setup screen, check the box that says:
   `☑ Add python.exe to PATH`
4. Click **Install Now**.

---

## Step 2: Copy the Script to the Windows PC

1. Create a folder on your `C:` drive named `CrownCoffee`:
   `C:\CrownCoffee`
2. Copy the file [`rfid-background-service.py`](file:///Users/macbookm1/Downloads/cafe-inventory/scripts/rfid-background-service.py) into `C:\CrownCoffee\rfid-background-service.py`.

---

## Step 3: Install Background Keyboard Library

1. Press `Win + R`, type `cmd`, and press **Enter** to open Command Prompt.
2. Run this command:
   ```cmd
   pip install pynput
   ```
3. Test the script by running:
   ```cmd
   python C:\CrownCoffee\rfid-background-service.py
   ```
4. Scan an RFID card! You will see:
   ```text
   ==========================================================
    ☕ Crown Coffee RFID Background Attendance Service Running
    Target API: https://ccadmin.online/api/attendance/checkin
    Ready! Scan an RFID card at any time...
   ==========================================================
   ```
5. Press `Ctrl + C` in Command Prompt to stop testing.

---

## Step 4: Make it Run Automatically on Windows Boot (Silent Mode)

To ensure attendance works 24/7 even if no one opens a terminal or browser:

1. Open **Notepad**.
2. Paste the following line (using `pythonw.exe` so no black box opens):
   ```bat
   @echo off
   start "" pythonw "C:\CrownCoffee\rfid-background-service.py"
   ```
3. Click **File -> Save As...**
   - Save location: `C:\CrownCoffee\`
   - File name: `start_rfid.bat`
   - Save as type: **All Files (*.*)**

4. Press `Win + R`, type `shell:startup`, and press **Enter**.
   *(This opens your Windows Startup folder: `C:\Users\...\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`)*

5. Right-click inside the Startup folder -> **New -> Shortcut**.
6. Browse to `C:\CrownCoffee\start_rfid.bat` and click **Finish**.

---

## ✅ You're All Set!

Whenever the Windows PC turns on:
- The script automatically runs silently in the background.
- Whenever a staff member taps an RFID card on the counter reader, attendance is posted instantly to `https://ccadmin.online`.
- Staff can work on Word, Excel, POS, or Chrome without card taps typing random numbers on screen!
