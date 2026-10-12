@echo off
echo Starting 10000 round browser training...
cd /d "%~dp0"
node scripts/browser-automation-training.js 10000
echo.
echo Training complete! Check data/browser-training-stats.json for results.
pause
