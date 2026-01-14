# Run Burnout Field Migration Script

Write-Host "🔧 Running Burnout Field Migration..." -ForegroundColor Cyan
Write-Host ""

$migrationFile = "database\add-burnout-field.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration file found: $migrationFile" -ForegroundColor Green
Write-Host ""
Write-Host "To run this migration, you need to:" -ForegroundColor Yellow
Write-Host "1. Connect to your PostgreSQL database" -ForegroundColor White
Write-Host "2. Run the SQL file using one of these methods:" -ForegroundColor White
Write-Host ""
Write-Host "Method 1 - Using psql command line:" -ForegroundColor Cyan
Write-Host "   psql -h 165.22.221.77 -U dbadmin -d salesmaya_agent -f database\add-burnout-field.sql" -ForegroundColor White
Write-Host ""
Write-Host "Method 2 - Using pgAdmin or another SQL client:" -ForegroundColor Cyan
Write-Host "   1. Open pgAdmin or your SQL client" -ForegroundColor White
Write-Host "   2. Connect to your database" -ForegroundColor White
Write-Host "   3. Open and execute: database\add-burnout-field.sql" -ForegroundColor White
Write-Host ""
Write-Host "Method 3 - Copy and paste the SQL:" -ForegroundColor Cyan
Write-Host "   Get-Content database\add-burnout-field.sql" -ForegroundColor White
Write-Host "   (Then copy and paste into your SQL client)" -ForegroundColor White
Write-Host ""

$runNow = Read-Host "Do you want to see the SQL content now? (y/n)"
if ($runNow -eq 'y' -or $runNow -eq 'Y') {
    Write-Host ""
    Write-Host "SQL Content:" -ForegroundColor Yellow
    Write-Host "============" -ForegroundColor Yellow
    Get-Content $migrationFile
    Write-Host ""
}

Write-Host "Note: The backend will work without this column (using COALESCE), but" -ForegroundColor Yellow
Write-Host "   you should run the migration to properly add the burnout_score column." -ForegroundColor Yellow

