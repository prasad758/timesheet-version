# Start both frontend and backend servers
# Run this script to start the entire application

Write-Host "`nStarting TechieMaya Timesheet Application..." -ForegroundColor Green
Write-Host "`nThis will start:" -ForegroundColor Yellow
Write-Host "  - Backend server on http://localhost:3001" -ForegroundColor Cyan
Write-Host "  - Frontend server on http://localhost:5173" -ForegroundColor Cyan
Write-Host "`nStarting servers..." -ForegroundColor Yellow

# Get the script directory (handle both direct execution and nested folder structure)
$scriptPath = $MyInvocation.MyCommand.Path
if (-not $scriptPath) {
    $scriptPath = $PSCommandPath
}
$scriptDir = Split-Path -Parent $scriptPath
# Handle nested folder structure
if (Test-Path (Join-Path $scriptDir "VCP_Automation-TechieMaya-Timesheet")) {
    $scriptDir = Join-Path $scriptDir "VCP_Automation-TechieMaya-Timesheet"
}
$backendPath = Join-Path $scriptDir "backend"
$frontendPath = $scriptDir

# Check if ports are already in use
Write-Host "`nChecking ports..." -ForegroundColor Yellow
$backendPortInUse = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
$frontendPortInUse = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($backendPortInUse) {
    Write-Host "  WARNING: Port 3001 is already in use. Backend may already be running." -ForegroundColor Yellow
}
if ($frontendPortInUse) {
    Write-Host "  WARNING: Port 5173 is already in use. Frontend may already be running." -ForegroundColor Yellow
}

# Check if backend node_modules exists
if (-not (Test-Path (Join-Path $backendPath "node_modules"))) {
    Write-Host "`nBackend node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    Set-Location $backendPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install backend dependencies!" -ForegroundColor Red
        exit 1
    }
    Set-Location $scriptDir
}

# Check if frontend node_modules exists
if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Write-Host "`nFrontend node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install frontend dependencies!" -ForegroundColor Red
        exit 1
    }
    Set-Location $scriptDir
}

# Check for backend .env file
$backendEnvPath = Join-Path $backendPath ".env"
if (-not (Test-Path $backendEnvPath)) {
    Write-Host "`nWARNING: Backend .env file not found!" -ForegroundColor Yellow
    Write-Host "  The backend will use default database settings." -ForegroundColor Yellow
    Write-Host "  Create backend/.env file if you need custom configuration." -ForegroundColor Yellow
}

# Start backend in a new window
Write-Host "`nStarting Backend Server..." -ForegroundColor Cyan
$backendCommand = "cd '$backendPath'; `$ErrorActionPreference = 'Continue'; Write-Host 'Backend Server' -ForegroundColor Yellow; Write-Host 'http://localhost:3001' -ForegroundColor Green; Write-Host 'Press Ctrl+C to stop' -ForegroundColor Gray; Write-Host ''; npm start; Write-Host ''; Write-Host 'Backend stopped. Press any key to close...' -ForegroundColor Yellow; `$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand

# Wait for backend to start and verify it's running
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
$backendStarted = $false
$maxAttempts = 15
$attempt = 0

while (-not $backendStarted -and $attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $backendStarted = $true
            Write-Host "  Backend is running!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts - Backend not ready yet..." -ForegroundColor Gray
    }
}

if (-not $backendStarted) {
    Write-Host "`nWARNING: Backend health check failed after $maxAttempts attempts!" -ForegroundColor Yellow
    Write-Host "  Check the backend window for error messages." -ForegroundColor Yellow
    Write-Host "  Common issues:" -ForegroundColor Yellow
    Write-Host "    - Database connection failed" -ForegroundColor Yellow
    Write-Host "    - Missing environment variables" -ForegroundColor Yellow
    Write-Host "    - Port 3001 already in use" -ForegroundColor Yellow
} else {
    Write-Host "  Backend health check passed!" -ForegroundColor Green
}

# Start frontend in a new window
Write-Host "`nStarting Frontend Server..." -ForegroundColor Cyan
$frontendCommand = "cd '$frontendPath'; Write-Host 'Frontend Server' -ForegroundColor Yellow; Write-Host 'http://localhost:5173' -ForegroundColor Green; Write-Host 'Press Ctrl+C to stop' -ForegroundColor Gray; Write-Host ''; npm run dev; Write-Host ''; Write-Host 'Frontend stopped. Press any key to close...' -ForegroundColor Yellow; `$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

Write-Host "`nServers starting in separate windows!" -ForegroundColor Green
Write-Host "`nInstructions:" -ForegroundColor Yellow
Write-Host "  - Backend: http://localhost:3001" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  - Wait for both servers to start before using the app" -ForegroundColor White
Write-Host "  - Close the PowerShell windows to stop the servers" -ForegroundColor White
Write-Host "`nTip: Keep both windows open while using the application!" -ForegroundColor Cyan
Write-Host ""

