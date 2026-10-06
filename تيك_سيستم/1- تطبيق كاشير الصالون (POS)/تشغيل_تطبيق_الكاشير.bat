@echo off
chcp 65001 > nul
title تشغيل كاشير صالون عادل - ADEL SALON POS
color 0A

echo ===================================================================
echo     جاري تشغيل تطبيق كاشير صالون عادل المكتبي - ADEL SALON POS
echo ===================================================================
echo.

set "SYS_ROOT=%~dp0..\"
cd /d "%SYS_ROOT%"

:: 1. Auto-start Engine Backend API if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0..\engine\apps\api\" && npm run start:dev' }"

:: 2. Auto-start Cashier POS UI
powershell -Command "if ((Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0..\engine\apps\cashier-desktop\" && npm run dev' }"

timeout /t 3 > nul

:: 3. Launch App in Standalone POS Window
start msedge --app=http://localhost:1420 --window-size=1280,820

echo [✓] تم فتح كاشير الصالون بنجاح!
