@echo off
rem ===========================================================================
rem  PTG - update the live site on the server from GitHub.
rem
rem  Run it (double-click, or `update-server.bat` from a terminal) and it will:
rem    1. push the local branch if it is ahead of origin  (with --push)
rem    2. pull origin/main onto the server, discarding any drift there
rem    3. upload deploy\server.env to the server as its .env  - every run
rem    4. rebuild the images, migrate the database, restart the stack
rem
rem  Flags:
rem    --push    git push the current branch before deploying
rem    --seed    reseed the database even if it already has users (destructive
rem              in the sense that seeded rows are re-inserted; existing data
rem              is not dropped)
rem ===========================================================================
setlocal EnableExtensions EnableDelayedExpansion

set "SERVER=130.110.124.121"
set "SSH_USER=opc"
set "REPO=%~dp0"
set "KEY_SRC=%REPO%ssh-key-2026-08-21.key"
set "ENV_SRC=%REPO%deploy\server.env"
set "SYNC_SRC=%REPO%deploy\remote-sync.sh"
set "KEY=%TEMP%\ptg-deploy-key"

set "DO_PUSH="
set "REMOTE_ENV="
:parse
if "%~1"=="" goto parsed
if /i "%~1"=="--push" set "DO_PUSH=1"
if /i "%~1"=="--seed" set "REMOTE_ENV=PTG_SEED=force "
shift
goto parse
:parsed

echo(
echo ===========================================================
echo  PTG deploy  ^-^>  %SSH_USER%@%SERVER%
echo ===========================================================

rem --- preflight ------------------------------------------------------------
if not exist "%KEY_SRC%" (
  echo [ERROR] SSH key not found: %KEY_SRC%
  goto :fail
)
if not exist "%ENV_SRC%" (
  echo [ERROR] Server env file not found: %ENV_SRC%
  echo         Copy deploy\server.env.example to deploy\server.env and fill it in.
  goto :fail
)
if not exist "%SYNC_SRC%" (
  echo [ERROR] Missing %SYNC_SRC%
  goto :fail
)

rem Windows OpenSSH refuses a private key that other accounts can read, and the
rem key sitting in the repo folder inherits that folder's ACLs. Work from a
rem locked-down copy in %TEMP% instead of loosening the original.
copy /y "%KEY_SRC%" "%KEY%" >nul || goto :fail
icacls "%KEY%" /inheritance:r >nul 2>&1
icacls "%KEY%" /grant:r "%USERNAME%:(R)" >nul 2>&1

set "SSH=ssh -i "%KEY%" -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="%USERPROFILE%\.ssh\known_hosts""
set "SCP=scp -i "%KEY%" -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="%USERPROFILE%\.ssh\known_hosts""

rem --- 1. optionally push local work ---------------------------------------
pushd "%REPO%" >nul
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "BRANCH=%%b"
if not defined BRANCH set "BRANCH=main"

if defined DO_PUSH (
  echo(
  echo [1/4] pushing %BRANCH% to origin...
  git push origin "%BRANCH%" || (popd >nul & goto :fail)
) else (
  echo(
  echo [1/4] checking local repo state...
  git diff --quiet || echo       NOTE: you have uncommitted changes - they will NOT be deployed.
  for /f %%a in ('git rev-list --count origin/%BRANCH%..%BRANCH% 2^>nul') do set "AHEAD=%%a"
  if not "!AHEAD!"=="0" if defined AHEAD (
    echo       NOTE: %BRANCH% is !AHEAD! commit^(s^) ahead of origin - they will NOT be
    echo             deployed. Re-run as: update-server.bat --push
  )
)
popd >nul

rem --- 2. pull the repo on the server --------------------------------------
echo(
echo [2/4] updating the checkout on the server from GitHub...
%SSH% %SSH_USER%@%SERVER% "bash -s" < "%SYNC_SRC%"
if errorlevel 1 goto :fail

rem --- 3. push the environment ---------------------------------------------
echo(
echo [3/4] uploading deploy\server.env -^> ~/PTG/.env ...
%SCP% "%ENV_SRC%" %SSH_USER%@%SERVER%:PTG/.env
if errorlevel 1 goto :fail
rem .env carries every production secret; keep it owner-only on the server.
%SSH% %SSH_USER%@%SERVER% "chmod 600 ~/PTG/.env"

rem --- 4. rebuild and restart ----------------------------------------------
echo(
echo [4/4] rebuilding and restarting the stack ^(first run can take ~15 min^)...
%SSH% -o ServerAliveInterval=30 %SSH_USER%@%SERVER% "%REMOTE_ENV%bash ~/PTG/deploy/server-update.sh"
if errorlevel 1 goto :fail

del /q "%KEY%" >nul 2>&1
echo(
echo ===========================================================
echo  DONE - http://%SERVER%/  ^(admin: http://%SERVER%:4000/^)
echo ===========================================================
echo(
pause
exit /b 0

:fail
del /q "%KEY%" >nul 2>&1
echo(
echo ===========================================================
echo  DEPLOY FAILED - see the output above.
echo ===========================================================
echo(
pause
exit /b 1
