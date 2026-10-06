@echo off
chcp 65001 > nul
title سيرفر صالون عادل المركزي - ADEL SALON Central Server (Port 3001)
color 0E

echo ===================================================================
echo           سيرفر صالون عادل المركزي - ADEL SALON API SERVER
echo                      منفذ التشغيل: http://localhost:3001
echo ===================================================================
echo.
echo [!] هذا السيرفر هو العقل المركزي للنظام وقاعدة البيانات.
echo [!] يرجى ترك هذه النافذة مفتوحة طوال فترة العمل.
echo.

cd /d "%~dp0apps\api"
npm run start:dev
