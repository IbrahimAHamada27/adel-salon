@echo off
chcp 65001 > nul
title تثبيت تطبيق إدارة الصالون للمالك على سطح المكتب - ADEL SALON ADMIN
color 03

echo ===================================================================
echo    تثبيت تطبيق لوحة إدارة وتحكم الصالون المستقل - ADEL SALON ADMIN
echo ===================================================================
echo.

set "TARGET_DIR=%~dp0"
set "LAUNCH_BAT=%TARGET_DIR%2- تشغيل_لوحة_إدارة_المالك (Admin Web).bat"

echo [1/2] جاري إنشاء اختصار سطح المكتب لتطبيق الإدارة...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s = $ws.CreateShortcut(\"$desktop\إدارة صالون عادل - ADMIN.lnk\"); " ^
  "$s.TargetPath = '%LAUNCH_BAT%'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'تطبيق لوحة تحكم وإدارة صالون عادل للمالك'; " ^
  "$s.WindowStyle = 7; " ^
  "$s.Save();"

echo [2/2] تم إنشاء الأيقونة بنجاح على سطح المكتب!
echo.
echo ===================================================================
echo [✓] تم تثبيت تطبيق الإدارة المكتبي بنجاح!
echo     ستجد الآن أيقونة باسم: "إدارة صالون عادل - ADMIN" على سطح المكتب.
echo ===================================================================
echo.
pause
