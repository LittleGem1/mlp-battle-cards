@echo off
cd /d "%~dp0"
py -3 INSTALLIEREN.py
if errorlevel 1 python INSTALLIEREN.py
pause
