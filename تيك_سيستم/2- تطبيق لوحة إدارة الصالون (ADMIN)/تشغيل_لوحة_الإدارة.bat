@echo off
chcp 65001 > nul
title تشغيل لوحة إدارة صالون عادل - ADEL SALON ADMIN
color 03

echo ===================================================================
echo     جاري تشغيل تطبيق لوحة إدارة الصالون للمالك - ADEL SALON ADMIN
echo ===================================================================
echo.

set "SYS_ROOT=%~dp0..\"
cd /d "%SYS_ROOT%"

:: 1. Auto-start Engine Backend API if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0..\engine\apps\api\" && npm run start:dev' }"

:: 2. Auto-start Admin Web UI
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0..\engine\apps\admin-web\" && npm run dev' }"

timeout /t 3 > nul

:: 3. Launch App in Standalone Admin Window
start msedge --app=http://localhost:3000 --window-size=1400,900

echo [✓] تم فتح لوحة إدارة الصالون بنجاح!
