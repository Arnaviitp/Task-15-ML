@echo off
echo Starting SocialAI Application...

:: Start Backend
echo Starting Backend Server...
start "SocialAI Backend" cmd /k "call .venv\Scripts\activate && cd backend && python -m uvicorn main:app --reload"

:: Start Frontend
echo Starting Frontend Dev Server...
start "SocialAI Frontend" cmd /k "cd frontend && npm run dev"

echo Application launching...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this launcher window (servers will keep running)...
pause >nul
