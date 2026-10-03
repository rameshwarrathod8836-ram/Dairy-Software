@echo off
title Jagdamb Dairy Management System
echo ==========================================
echo    Jagdamb Dairy System Chalu Hot Ahe...
echo ==========================================

start cmd /k "cd /d %~dp0backend && node server.js"
start cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:5173