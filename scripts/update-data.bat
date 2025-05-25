@echo off
echo 正在更新手机摄像头数据...
echo.

echo [1/3] 转换Excel数据...
node scripts/convert-enhanced.js
if %errorlevel% neq 0 (
    echo 错误：数据转换失败！
    pause
    exit /b 1
)

echo.
echo [2/3] 复制数据到网站目录...
copy "data\phones-enhanced.json" "public\data\" /Y >nul
copy "data\chart-enhanced.json" "public\data\" /Y >nul

echo.
echo [3/3] 检查更新状态...
dir "public\data\*.json" /T:W

echo.
echo ✅ 数据更新完成！
echo 💡 请刷新浏览器页面 (Ctrl+F5) 查看最新数据
echo.
pause 