@echo off
chcp 65001 >nul
cd /d "E:\project\project3\software-clones"

call :find_npm
if errorlevel 1 goto :no_npm
goto :main

:no_npm
echo.
echo 未检测到 Node.js/npm，请先安装 Node.js https://nodejs.org 或将 node 安装目录加入系统 PATH 后再运行
echo.
pause
exit /b 1

:main
echo ============================================================
echo   正在启动 20 个 App + 启动大厅 ...
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
goto :eof

:find_npm
where npm >nul 2>&1 && goto :eof
set "NODE_DIR="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_DIR=%ProgramFiles%\nodejs"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_DIR=%ProgramFiles(x86)%\nodejs"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_DIR=%LOCALAPPDATA%\Programs\nodejs"
if exist "%APPDATA%\nvm\node.exe" set "NODE_DIR=%APPDATA%\nvm"
if exist "%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe" set "NODE_DIR=%USERPROFILE%\AppData\Local\Programs\nodejs"
if defined NODE_DIR (
    set "PATH=%NODE_DIR%;%PATH%"
    where npm >nul 2>&1 && goto :eof
)
if exist "%APPDATA%\nvm\versions\node" (
    for /d %%D in ("%APPDATA%\nvm\versions\node\*") do (
        if exist "%%~D\node.exe" (
            set "PATH=%%~D;%PATH%"
            where npm >nul 2>&1 && goto :eof
        )
    )
)
exit /b 1
