$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:ELECTRON_SKIP_SIGNING = "true"
Set-Location "C:\Users\Admin\WorkBuddy\20260416094716\calendar-app"
F:\nodejs\npx.cmd electron-builder --win --x64 --publish=never 2>&1 | Out-File -Encoding utf8 build_out.txt
exit $LASTEXITCODE
