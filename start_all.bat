@echo off
start cmd /k ".\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"
set PATH=%PATH%;C:\Program Files\nodejs
cd frontend
npm run dev
