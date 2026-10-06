@echo off
chcp 65001 > nul
title تثبيت أيقونة إدارة الصالون للمالك على سطح المكتب - ADEL SALON ADMIN
color 03

echo ===================================================================
echo     تثبيت أيقونة إدارة الصالون للمالك على سطح المكتب - ADEL SALON ADMIN
echo ===================================================================
echo.

set "FOLDER_DIR=%~dp0"
set "LAUNCH_TARGET=%FOLDER_DIR%تشغيل_لوحة_الإدارة.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s = $ws.CreateShortcut(\"$desktop\إدارة صالون عادل - ADMIN.lnk\"); " ^
  "$s.TargetPath = '%LAUNCH_TARGET%'; " ^
  "$s.WorkingDirectory = '%FOLDER_DIR%'; " ^
  "$s.Description = 'لوحة تحكم وإدارة صالون عادل للمالك'; " ^
  "$s.Save();"

echo [✓] تم تثبيت تطبيق لوحة الإدارة بنجاح على سطح المكتب!
echo     ستجد أيقونة: "إدارة صالون عادل - ADMIN" جاهزة للتشغيل.
echo.
pause
