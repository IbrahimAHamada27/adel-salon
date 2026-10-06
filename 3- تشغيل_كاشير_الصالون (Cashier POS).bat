@echo off
chcp 65001 > nul
title شاشة كاشير الصالون - ADEL SALON POS (Port 1420)
color 0A

echo ===================================================================
echo             شاشة كاشير ونقطة بيع الصالون - ADEL SALON POS
echo                      منفذ التشغيل: http://localhost:1420
echo ===================================================================
echo.

:: 1. Auto-start Server if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\api\" && npm run start:dev' }"

:: 2. Auto-start Cashier Desktop UI if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\cashier-desktop\" && npm run dev' }"

timeout /t 3 > nul

:: 3. Launch POS Window
start msedge --app=http://localhost:1420 --window-size=1280,820

echo.
echo [✓] تم فتح شاشة الكاشير المستقلة بنجاح!
echo.
