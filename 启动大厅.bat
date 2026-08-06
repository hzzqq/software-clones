@echo off
chcp 65001 >nul
cd /d "E:\project\project3\software-clones"

echo ============================================================
echo   正在启动 12 个 App + 启动大厅 ...
echo   浏览器将自动打开 http://localhost:5192/
echo ============================================================
echo.
echo   如需停止全部服务，请双击 停止全部.bat 文件。
echo.

call npm run dev:all

echo.
echo 服务已在后台运行，关闭本窗口不影响服务。
echo.
pause
