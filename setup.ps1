# Quick Setup Script for Compara Tu Ingreso Web App
# Run this after cloning the repository

Write-Host "🚀 Compara Tu Ingreso - Setup Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "📦 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
    
    # Check if version is >= 18
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 18) {
        Write-Host "⚠ Warning: Node.js 18+ recommended. You have: $nodeVersion" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check R (optional)
Write-Host ""
Write-Host "📊 Checking R installation (for data conversion)..." -ForegroundColor Yellow
try {
    $rVersion = Rscript --version 2>&1
    Write-Host "✓ R found: $rVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ R not found. You'll need R to convert FST data files." -ForegroundColor Yellow
    Write-Host "  Install from: https://cran.r-project.org/" -ForegroundColor Yellow
}

# Install npm dependencies
Write-Host ""
Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Check for environment variables
Write-Host ""
Write-Host "🔐 Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "✓ .env.local found" -ForegroundColor Green
} else {
    Write-Host "⚠ .env.local not found. Creating template..." -ForegroundColor Yellow
    @"
# Google Sheets Configuration
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=your-private-key-here
GOOGLE_SHEET_ID=REDACTED_SHEET_ID

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-Y8KGPP8Z00
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✓ Created .env.local template. Please fill in your credentials." -ForegroundColor Green
}

# Check for data files
Write-Host ""
Write-Host "📁 Checking data files..." -ForegroundColor Yellow
if (Test-Path "public\data\national_percentiles.arrow") {
    Write-Host "✓ Arrow data files found" -ForegroundColor Green
} else {
    Write-Host "⚠ Arrow data files not found" -ForegroundColor Yellow
    if (Test-Path "data\national_percentiles.fst") {
        Write-Host "  FST files detected. Run: Rscript scripts\convert-data.R" -ForegroundColor Yellow
    } else {
        Write-Host "  No source data found. Please add FST files to /data directory" -ForegroundColor Yellow
    }
}

# Check for remaining components
Write-Host ""
Write-Host "📄 Checking component files..." -ForegroundColor Yellow
$missingComponents = @()

if (-not (Test-Path "src\components\QuestionFlow.tsx")) {
    $missingComponents += "QuestionFlow.tsx"
}
if (-not (Test-Path "src\components\ResultsView.tsx")) {
    $missingComponents += "ResultsView.tsx"
}
if (-not (Test-Path "src\components\DistributionChart.tsx")) {
    $missingComponents += "DistributionChart.tsx"
}
if (-not (Test-Path "src\components\StatsCards.tsx")) {
    $missingComponents += "StatsCards.tsx"
}
if (-not (Test-Path "src\app\api\appendResponse\route.ts")) {
    $missingComponents += "api/appendResponse/route.ts"
}

if ($missingComponents.Count -gt 0) {
    Write-Host "⚠ Missing components (see IMPLEMENTATION_GUIDE.md):" -ForegroundColor Yellow
    foreach ($comp in $missingComponents) {
        Write-Host "  - $comp" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ All components found" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Fill in .env.local with your credentials" -ForegroundColor White
if (Test-Path "data\national_percentiles.fst") {
    Write-Host "2. Convert data: Rscript scripts\convert-data.R" -ForegroundColor White
}
if ($missingComponents.Count -gt 0) {
    Write-Host "3. Add missing components from IMPLEMENTATION_GUIDE.md" -ForegroundColor White
}
Write-Host "4. Start dev server: npm run dev" -ForegroundColor White
Write-Host "5. Open http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  - README.md - Project overview" -ForegroundColor White
Write-Host "  - IMPLEMENTATION_GUIDE.md - Component code" -ForegroundColor White
Write-Host "  - PROJECT_SUMMARY.md - What was created" -ForegroundColor White
Write-Host ""
