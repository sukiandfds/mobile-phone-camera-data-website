@echo off
chcp 65001 >nul
echo Updating phone camera data...
echo.

echo [1/3] Converting Excel data...
node scripts/convert-enhanced.js
if %errorlevel% neq 0 (
    echo ERROR: Data conversion failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Copying data to website directory...
copy "data\phones-enhanced.json" "public\data\" /Y >nul
copy "data\chart-enhanced.json" "public\data\" /Y >nul

echo.
echo [3/3] Checking update status...
dir "public\data\*.json" /T:W

echo.
echo SUCCESS: Data update completed!
echo TIP: Please refresh browser page (Ctrl+F5) to see latest data
echo.
pause 