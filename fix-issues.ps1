# Quick Fix Script for Common Issues

Write-Host "🔧 Fixing Common Issues..." -ForegroundColor Cyan
Write-Host ""

# 1. Kill process on port 3001
Write-Host "1. Checking port 3001..." -ForegroundColor Yellow
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    $pid = $port3001.OwningProcess
    Write-Host "   Found process $pid using port 3001. Killing it..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "   ✅ Port 3001 is now free" -ForegroundColor Green
} else {
    Write-Host "   ✅ Port 3001 is free" -ForegroundColor Green
}

# 2. Check for .env file
Write-Host ""
Write-Host "2. Checking environment configuration..." -ForegroundColor Yellow
$envPath = "config\.env"
if (Test-Path $envPath) {
    Write-Host "   ✅ Found .env file at config\.env" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env file not found at config\.env" -ForegroundColor Yellow
    Write-Host "   Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path "config\.env.example") {
        Copy-Item "config\.env.example" "config\.env"
        Write-Host "   ✅ Created config\.env from template" -ForegroundColor Green
        Write-Host "   ⚠️  Please edit config\.env with your database credentials!" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ .env.example not found!" -ForegroundColor Red
    }
}

# 3. Check database connection settings
Write-Host ""
Write-Host "3. Database connection info:" -ForegroundColor Yellow
if (Test-Path "config\.env") {
    $envContent = Get-Content "config\.env" -Raw
    if ($envContent -match "DB_HOST|POSTGRES_HOST") {
        Write-Host "   ✅ Database host configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Database host not found in .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Using default database settings from connection.js" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Fix complete! Try starting the server again:" -ForegroundColor Green
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White

