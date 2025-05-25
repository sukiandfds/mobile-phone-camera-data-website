Write-Host "=== Phone Camera Data Update ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Converting Excel..." -ForegroundColor Yellow
Set-Location ..
node scripts/convert-enhanced.js
Set-Location data

Write-Host ""
Write-Host "Step 2: Copying files..." -ForegroundColor Yellow
Copy-Item "phones-enhanced.json" "../public/data/" -Force
Copy-Item "chart-enhanced.json" "../public/data/" -Force

Write-Host ""
Write-Host "Step 3: Checking files..." -ForegroundColor Yellow
Get-ChildItem "../public/data/*.json" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

Write-Host "=== Update Complete! ===" -ForegroundColor Green
Write-Host "Please refresh browser (Ctrl+F5)" -ForegroundColor Cyan
Write-Host "" 