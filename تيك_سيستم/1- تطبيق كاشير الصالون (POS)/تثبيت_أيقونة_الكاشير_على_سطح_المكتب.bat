@echo off
chcp 65001 > nul
title تثبيت أيقونة كاشير الصالون على سطح المكتب - ADEL SALON POS
color 0A

echo ===================================================================
echo     تثبيت أيقونة كاشير الصالون على سطح المكتب - ADEL SALON POS
echo ===================================================================
echo.

set "FOLDER_DIR=%~dp0"
set "LAUNCH_TARGET=%FOLDER_DIR%تشغيل_تطبيق_الكاشير.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s = $ws.CreateShortcut(\"$desktop\كاشير صالون عادل - POS.lnk\"); " ^
  "$s.TargetPath = '%LAUNCH_TARGET%'; " ^
  "$s.WorkingDirectory = '%FOLDER_DIR%'; " ^
  "$s.Description = 'تطبيق نقطة البيع وكاشير صالون عادل المكتبي'; " ^
  "$s.Save();"

echo [✓] تم تثبيت تطبيق الكاشير بنجاح على سطح المكتب!
echo     ستجد أيقونة: "كاشير صالون عادل - POS" جاهزة للتشغيل.
echo.
pause
