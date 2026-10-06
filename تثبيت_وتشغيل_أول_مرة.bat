@echo off
chcp 65001 > nul
title تجهيز وتثبيت وتشغيل نظام كاشير الصالون لأول مرة - ADEL SALON POS
color 0B

echo ===================================================================
echo     مرحباً بك في نظام صالون عادل - ADEL SALON MANAGEMENT POS
echo               معالج التثبيت والتشغيل لأول مرة
echo ===================================================================
echo.

:: 1. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [!] خطأ: برنامج Node.js غير مثبت على هذا الجهاز.
    echo يرجى تحميل وتثبيت Node.js (LTS) من الرابط: https://nodejs.org
    echo ثم إعادة تشغيل هذا الملف مجدداً.
    echo.
    pause
    exit /b 1
)

echo [1/4] التحقق من بيئة العمل والمكتبات البرمجية...
if not exist "node_modules" (
    echo [!] لم يتم العثور على حزم النظام، جاري التثبيت لأول مرة (قد يستغرق 1-2 دقيقة)...
    call npm install
    if %errorlevel% neq 0 (
        echo [!] حدث خطأ أثناء تثبيت المكتبات. يرجى التأكد من اتصال الإنترنت والمحاولة ثانية.
        pause
        exit /b 1
    )
)

:: 2. Ensure data directory exists
if not exist "apps\api\data" (
    mkdir "apps\api\data"
)

echo [2/4] جاري بناء وتجهيز تطبيق الكاشير المكتبي...
if not exist "apps\cashier-desktop\dist" (
    call npm --workspace=apps/cashier-desktop run build
)

echo [3/4] جاري بدء تشغيل السيرفر المحلي وقاعدة البيانات...
powershell -Command "if ((Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\api\" && npm run start:dev' }"

echo [4/4] جاري تشغيل شاشة الكاشير...
powershell -Command "if ((Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Where-Object State -eq 'Listen').Count -eq 0) { Start-Process -NoNewWindow cmd -ArgumentList '/c cd /d \"%~dp0apps\cashier-desktop\" && npm run dev' }"

timeout /t 3 > nul

:: Launch standalone application window
start msedge --app=http://localhost:1420 --window-size=1280,820

echo.
echo ===================================================================
echo [✓] تم تشغيل النظام بنجاح!
echo - واجهة الكاشير المكتبي: http://localhost:1420
echo - واجهة إدارة الصالون (Admin): http://localhost:3000
echo ===================================================================
echo.
echo يمكنك الآن استخدام النظام مباشرة. في المرات القادمة يمكنك استخدام:
echo ملف "تشغيل_كاشير_الصالون.bat" للتشغيل الفوري بنقرة واحدة.
echo.
pause
