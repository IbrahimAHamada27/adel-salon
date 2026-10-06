@echo off
chcp 65001 > nul
title لوحة إدارة وتحكم المالك - ADEL SALON ADMIN (Port 3000)
color 03

echo ===================================================================
echo           لوحة إدارة وتحكم المالك - ADEL SALON ADMIN
echo                      منفذ التشغيل: http://localhost:3000
echo ===================================================================
echo.

:: 1. Auto-start Server if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\api\" && npm run start:dev' }"

:: 2. Auto-start Admin Web if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\admin-web\" && npm run dev' }"

timeout /t 3 > nul

:: 3. Launch Admin Window
start msedge --app=http://localhost:3000 --window-size=1400,900

echo.
echo [✓] تم فتح لوحة تحكم الإدارة المستقلة بنجاح!
echo.
