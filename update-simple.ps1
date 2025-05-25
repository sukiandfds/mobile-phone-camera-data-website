Write-Host "=== Data Update Starting ===" -ForegroundColor Cyan

Write-Host "Step 1: Converting Excel..." -ForegroundColor Yellow
node scripts/convert-enhanced.js

Write-Host "Step 2: Copying files..." -ForegroundColor Yellow
Copy-Item "data/phones-enhanced.json" "public/data/" -Force
Copy-Item "data/chart-enhanced.json" "public/data/" -Force

Write-Host "=== Update Complete! ===" -ForegroundColor Green
Write-Host "Please refresh browser (Ctrl+F5)" -ForegroundColor Cyan 