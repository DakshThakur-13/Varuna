@echo off
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           Varuna AI Agent Startup                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/3] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

echo [2/3] Installing dependencies...
pip install -r requirements.txt --quiet

echo [3/3] Starting AI Agent server...
echo.
echo ═══════════════════════════════════════════════════════════════
echo   Agent will start on http://localhost:8000
echo   API docs available at http://localhost:8000/docs
echo   Press Ctrl+C to stop
echo ═══════════════════════════════════════════════════════════════
echo.

python main.py
