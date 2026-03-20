@echo off
echo Starting FairQ System...
echo =========================

REM Add Docker to PATH just in case it's missing
set PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin

REM Disable BuildKit for compatibility
set DOCKER_BUILDKIT=0

REM Run Docker Compose
docker compose up --build

pause
