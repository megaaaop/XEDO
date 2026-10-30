@echo off
setlocal
title XEDO CPU Worker
chcp 65001 >nul
cd /d "%~dp0"
if errorlevel 1 goto folder_error
set "XEDO_WORKER_PYTHON=%~dp0..\..\tmp\local-ai-worker-venv\Scripts\python.exe"
if not exist "%XEDO_WORKER_PYTHON%" goto python_error
set "XEDO_WORKER_MODE="
if /I "%~1"=="--reconnect" set "XEDO_WORKER_MODE=--reconnect"
"%XEDO_WORKER_PYTHON%" -X utf8 -B "%~dp0workers\local-ai\launch_worker.py" %XEDO_WORKER_MODE%
set "XEDO_WORKER_EXIT=%ERRORLEVEL%"
echo.
echo You can close this window. Double-click Start-XEDO-CPU.cmd to open it again.
pause
exit /b %XEDO_WORKER_EXIT%
:python_error
echo XEDO could not find the prepared Python environment on this computer.
echo Keep this file in the XEDO release folder. See docs\CPU_WORKER_START_GUIDE.md.
pause
exit /b 2
:folder_error
echo XEDO could not open its release folder.
pause
exit /b 2
