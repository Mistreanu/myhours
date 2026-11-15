@echo off
rem Deploys the current commit to the live site. Usage: deploy.cmd [--skip-tests]
rem The real work is in scripts\deploy.sh, run with Git Bash.
set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" (
    echo Git Bash not found at "%GIT_BASH%". Install Git for Windows or run: bash scripts/deploy.sh
    exit /b 1
)
"%GIT_BASH%" "%~dp0scripts/deploy.sh" %*
exit /b %ERRORLEVEL%
