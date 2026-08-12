@echo off
cd /d %~dp0
if not exist node_modules\.bin\next.cmd (
  echo Installing locked dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run dev
