# 构建 v9.8.0 - 彻底跳过签名
$env:ELECTRON_SKIP_SIGNING = "true"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
Set-Location "C:\Users\Admin\WorkBuddy\20260416094716\calendar-app"
Write-Host "=== 开始构建 v9.8.0 ===" -ForegroundColor Cyan
npx electron-builder --win --x64
if ($LASTEXITCODE -eq 0) {
    Write-Host "=== 构建成功 ===" -ForegroundColor Green
    $exePath = "C:\Users\Admin\WorkBuddy\20260416094716\calendar-app\release\win-unpacked\任务清单.exe"
    if (Test-Path $exePath) {
        $info = Get-Item $exePath
        Write-Host "EXE 生成时间: $($info.LastWriteTime)" -ForegroundColor Yellow
        Write-Host "EXE 大小: $([math]::Round($info.Length/1MB, 1)) MB" -ForegroundColor Yellow
    }
} else {
    Write-Host "=== 构建失败 (exit code: $LASTEXITCODE) ===" -ForegroundColor Red
}
