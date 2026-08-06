@echo off
chcp 65001 >nul
cd /d "E:\project\project3\software-clones"

echo ============================================================
echo   正在停止 12 个 App ...
echo ============================================================
echo.

call npm run stop:all

echo.
echo 已停止 12 个 App，如大厅仍在运行请执行 npm run stop:hall。
echo.
pause
