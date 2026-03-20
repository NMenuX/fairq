Write-Host "Starting FairQ System..." -ForegroundColor Cyan

# Add Docker to PATH local scope
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;" + $env:Path

# Disable BuildKit
$env:DOCKER_BUILDKIT=0

# Run Docker
docker compose up --build
