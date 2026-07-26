@echo off
title Crown Coffee Attendance - Auto Updater
color 0A
echo =========================================================
echo       Crown Coffee Attendance System - Auto Updater
echo =========================================================
echo.
echo [1/3] Pulling latest code and fixes from GitHub...
git pull origin main

echo.
echo [2/3] Checking Python dependencies...
python -m pip install keyboard pynput --quiet

echo.
echo [3/3] Code updated successfully! Starting RFID Service...
echo.
echo =========================================================
python scripts/rfid-background-service.py
pause
