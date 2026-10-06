@echo off
chcp 65001 > nul
title تثبيت تطبيق كاشير الصالون على سطح المكتب - ADEL SALON POS
color 0A

echo ===================================================================
echo     تثبيت تطبيق كاشير الصالون المكتبي المستقل - ADEL SALON POS
echo ===================================================================
echo.

set "TARGET_DIR=%~dp0"
set "LAUNCH_BAT=%TARGET_DIR%3- تشغيل_كاشير_الصالون (Cashier POS).bat"

echo [1/2] جاري إنشاء اختصار سطح المكتب لتطبيق الكاشير...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s = $ws.CreateShortcut(\"$desktop\كاشير صالون عادل - POS.lnk\"); " ^
  "$s.TargetPath = '%LAUNCH_BAT%'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'تطبيق نقطة البيع وكاشير صالون عادل المكتبي'; " ^
  "$s.WindowStyle = 7; " ^
  "$s.Save();"

echo [2/2] تم إنشاء الأيقونة بنجاح على سطح المكتب!
echo.
echo ===================================================================
echo [✓] تم تثبيت تطبيق الكاشير المكتبي بنجاح!
echo     ستجد الآن أيقونة باسم: "كاشير صالون عادل - POS" على سطح المكتب.
echo ===================================================================
echo.
pause
