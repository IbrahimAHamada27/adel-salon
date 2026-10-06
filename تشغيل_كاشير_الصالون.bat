@echo off
chcp 65001 > nul
title تشغيل نظام كاشير الصالون - ADEL SALON POS
color 0A

echo ========================================================
echo        جاري تشغيل نظام الكاشير المكتبي - ADEL SALON POS
echo ========================================================
echo.

:: 1. Start NestJS Backend API if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\api\" && npm run start:dev' }"

:: 2. Start Cashier Desktop UI Server if not running
powershell -Command "if ((Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\cashier-desktop\" && npm run dev' }"

echo جاري تهيئة الاتصال بالطابعة والنظام...
timeout /t 3 > nul

:: 3. Launch App in Standalone Native-like Window
start msedge --app=http://localhost:1420 --window-size=1280,800

echo.
echo [✓] تم فتح تطبيق الكاشير بنجاح!
echo يمكنك تصغير هذه النافذة.
