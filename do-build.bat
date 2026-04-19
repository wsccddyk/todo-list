@echo off
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_SKIP_SIGNING=true
cd /d C:\Users\Admin\WorkBuddy\20260416094716\calendar-app
F:\nodejs\npx.cmd electron-builder --win --x64 --publish=never > build_out.txt 2>&1
echo EXITCODE=%ERRORLEVEL% >> build_out.txt
echo BUILD_DONE
