@echo off
REM Nightly board digest wrapper for Windows Task Scheduler (runs 23:00 daily).
cd /d "C:\GitHub\command-center"
node "C:\GitHub\command-center\scripts\nightly-board-update.mjs" >> "C:\GitHub\command-center\scripts\logs\cron.out" 2>&1
