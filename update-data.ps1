Write-Host "正在更新手机摄像头数据..." -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] 转换Excel数据..." -ForegroundColor Yellow
try {
    $output = node scripts/convert-enhanced.js 2>&1
    Write-Host $output
    if ($LASTEXITCODE -ne 0) {
        throw "数据转换失败"
    }
    Write-Host "✅ Excel数据转换成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误：$_" -ForegroundColor Red
    Read-Host "按Enter键继续..."
    exit 1
}

Write-Host ""
Write-Host "[2/3] 复制数据到网站目录..." -ForegroundColor Yellow
try {
    Copy-Item "data/phones-enhanced.json" "public/data/" -Force
    Copy-Item "data/chart-enhanced.json" "public/data/" -Force
    Write-Host "✅ 数据文件复制成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误：数据复制失败 - $_" -ForegroundColor Red
    Read-Host "按Enter键继续..."
    exit 1
}

Write-Host ""
Write-Host "[3/3] 检查更新状态..." -ForegroundColor Yellow
Get-ChildItem "public/data/*.json" | Select-Object Name, Length, @{Name="更新时间";Expression={$_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")}} | Format-Table -AutoSize

Write-Host ""
Write-Host "✅ 数据更新完成！" -ForegroundColor Green
Write-Host "💡 请刷新浏览器页面 (Ctrl+F5) 查看最新数据" -ForegroundColor Cyan
Write-Host ""
Read-Host "按Enter键继续..." 