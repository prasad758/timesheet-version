# Test Profiles API Endpoint

Write-Host "🧪 Testing Profiles API..." -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://localhost:3001/api/profiles"

Write-Host "1. Testing without authentication..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $apiUrl -Method GET -ErrorAction Stop
    Write-Host "   ✅ Response received" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor White
    $content = $response.Content | ConvertFrom-Json
    Write-Host "   Profiles count: $($content.profiles.Count)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status Code: $statusCode" -ForegroundColor Yellow
        if ($statusCode -eq 401) {
            Write-Host "   ⚠️  Authentication required!" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "2. Checking if you're logged in (checking localStorage token)..." -ForegroundColor Yellow
Write-Host "   Open browser console and run:" -ForegroundColor White
Write-Host "   localStorage.getItem('auth_token')" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. To test with authentication, you need to:" -ForegroundColor Yellow
Write-Host "   a) Log in to the application first" -ForegroundColor White
Write-Host "   b) Get the auth token from browser console" -ForegroundColor White
Write-Host "   c) Use it in the API request" -ForegroundColor White
Write-Host ""

Write-Host "4. Check backend logs for:" -ForegroundColor Yellow
Write-Host "   - Database connection status" -ForegroundColor White
Write-Host "   - API request logs" -ForegroundColor White
Write-Host "   - Any error messages" -ForegroundColor White

