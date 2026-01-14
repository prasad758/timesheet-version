# Database Connection Check Script

Write-Host "🔍 Checking Database Configuration..." -ForegroundColor Cyan
Write-Host ""

$configPath = "config\.env"
$backendPath = "backend\.env"

# Check for .env files
Write-Host "1. Checking for .env files..." -ForegroundColor Yellow
if (Test-Path $configPath) {
    Write-Host "   ✅ Found config\.env" -ForegroundColor Green
    $envFile = $configPath
} elseif (Test-Path $backendPath) {
    Write-Host "   ✅ Found backend\.env" -ForegroundColor Green
    $envFile = $backendPath
} else {
    Write-Host "   ❌ No .env file found!" -ForegroundColor Red
    Write-Host "   Creating config\.env from template..." -ForegroundColor Yellow
    if (Test-Path "config\.env.example") {
        Copy-Item "config\.env.example" "config\.env"
        Write-Host "   ✅ Created config\.env" -ForegroundColor Green
        Write-Host "   ⚠️  Please edit config\.env with your database credentials!" -ForegroundColor Yellow
        $envFile = $configPath
    } else {
        Write-Host "   ❌ .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

# Read and display database settings
Write-Host ""
Write-Host "2. Current Database Settings:" -ForegroundColor Yellow
$envContent = Get-Content $envFile -ErrorAction SilentlyContinue

$dbHost = ($envContent | Select-String -Pattern "DB_HOST|POSTGRES_HOST").Line
$dbPort = ($envContent | Select-String -Pattern "DB_PORT|POSTGRES_PORT").Line
$dbName = ($envContent | Select-String -Pattern "DB_NAME|POSTGRES_DB").Line
$dbUser = ($envContent | Select-String -Pattern "DB_USER|POSTGRES_USER").Line
$dbPass = ($envContent | Select-String -Pattern "DB_PASSWORD|POSTGRES_PASSWORD").Line

if ($dbHost) { Write-Host "   Host: $dbHost" -ForegroundColor White } else { Write-Host "   Host: ⚠️  Not set (using default: 143.110.249.144)" -ForegroundColor Yellow }
if ($dbPort) { Write-Host "   Port: $dbPort" -ForegroundColor White } else { Write-Host "   Port: ⚠️  Not set (using default: 5432)" -ForegroundColor Yellow }
if ($dbName) { Write-Host "   Database: $dbName" -ForegroundColor White } else { Write-Host "   Database: ⚠️  Not set (using default: salesmaya_agent)" -ForegroundColor Yellow }
if ($dbUser) { Write-Host "   User: $dbUser" -ForegroundColor White } else { Write-Host "   User: ⚠️  Not set (using default: postgres)" -ForegroundColor Yellow }
if ($dbPass) { Write-Host "   Password: ********" -ForegroundColor White } else { Write-Host "   Password: ⚠️  Not set (using default)" -ForegroundColor Yellow }

# Test network connectivity
Write-Host ""
Write-Host "3. Testing Network Connectivity..." -ForegroundColor Yellow
$testHost = if ($dbHost) { ($dbHost -split "=")[1].Trim() } else { "143.110.249.144" }
$testPort = if ($dbPort) { ($dbPort -split "=")[1].Trim() } else { "5432" }

Write-Host "   Testing connection to $testHost : $testPort..." -ForegroundColor White
$tcpTest = Test-NetConnection -ComputerName $testHost -Port $testPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue

if ($tcpTest.TcpTestSucceeded) {
    Write-Host "   ✅ Network connection successful!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Cannot reach database server at $testHost : $testPort" -ForegroundColor Red
    Write-Host "   Possible issues:" -ForegroundColor Yellow
    Write-Host "   - Database server is down" -ForegroundColor White
    Write-Host "   - Firewall blocking connection" -ForegroundColor White
    Write-Host "   - Wrong host/port in .env file" -ForegroundColor White
    Write-Host "   - VPN required to access database" -ForegroundColor White
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Verify your database credentials in $envFile" -ForegroundColor White
Write-Host "   2. Ensure the database server is running and accessible" -ForegroundColor White
Write-Host "   3. Check firewall/VPN settings if connection fails" -ForegroundColor White
Write-Host "   4. The server will continue running but database features won't work until connected" -ForegroundColor White

