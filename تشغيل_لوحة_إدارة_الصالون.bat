@echo off
chcp 65001 > nul
title تشغيل لوحة إدارة وتحكم الصالون - ADEL SALON ADMIN
color 03

echo ===================================================================
echo     جاري تشغيل لوحة الإدارة والتحكم لصالون عادل - ADEL SALON ADMIN
echo ===================================================================
echo.

:: 1. Start NestJS Backend API if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\api\" && npm run start:dev' }"

:: 2. Start Admin Web Frontend if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\admin-web\" && npm run dev' }"

timeout /t 3 > nul

:: 3. Open in Browser
start http://localhost:3000

echo.
echo [✓] تم فتح لوحة الإدارة بنجاح على: http://localhost:3000
echo.
