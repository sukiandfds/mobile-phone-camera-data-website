@echo off
echo =======================================
echo Updating Phone Camera Data
echo =======================================
echo.

echo Step 1: Converting Excel to JSON...
node scripts/convert-enhanced.js

echo.
echo Step 2: Copying files to public folder...
copy "data\phones-enhanced.json" "public\data\" /Y
copy "data\chart-enhanced.json" "public\data\" /Y

echo.
echo Step 3: Checking files...
dir "public\data\*.json"

echo.
echo =======================================
echo Update completed successfully!
echo Please refresh your browser (Ctrl+F5)
echo =======================================
pause 