# Pre-Deployment Checklist Script
# Run this before deploying to Vercel

Write-Host "🔍 Pre-Deployment Verification" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$errors = 0
$warnings = 0

# Check if .env.local exists
Write-Host "1. Checking environment files..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✅ .env.local exists" -ForegroundColor Green
    $envContent = Get-Content ".env.local" -Raw
    
    # Check required variables
    $requiredVars = @(
        "GOOGLE_SHEETS_CLIENT_EMAIL",
        "GOOGLE_SHEETS_PRIVATE_KEY",
        "GOOGLE_SHEET_ID"
    )
    
    foreach ($var in $requiredVars) {
        if ($envContent -match $var) {
            Write-Host "   ✅ $var is set" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $var is missing" -ForegroundColor Red
            $errors++
        }
    }
    
    # Check optional variables
    if ($envContent -match "NEXT_PUBLIC_GA_MEASUREMENT_ID") {
        Write-Host "   ✅ NEXT_PUBLIC_GA_MEASUREMENT_ID is set (optional)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  NEXT_PUBLIC_GA_MEASUREMENT_ID not set (optional)" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "   ⚠️  .env.local not found (okay for deployment, but needed for local testing)" -ForegroundColor Yellow
    $warnings++
}

# Check if data files exist
Write-Host "`n2. Checking data files..." -ForegroundColor Yellow
$dataDir = "public/data"
if (Test-Path $dataDir) {
    $arrowFiles = Get-ChildItem -Path $dataDir -Filter "*.arrow" -Recurse
    if ($arrowFiles.Count -gt 0) {
        Write-Host "   ✅ Found $($arrowFiles.Count) .arrow data files" -ForegroundColor Green
    } else {
        Write-Host "   ❌ No .arrow files found. Run: Rscript scripts/convert-data.R" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "   ❌ public/data directory not found" -ForegroundColor Red
    $errors++
}

# Check if social media card exists
Write-Host "`n3. Checking social media card..." -ForegroundColor Yellow
if (Test-Path "public/card_teaser.png") {
    Write-Host "   ✅ card_teaser.png exists" -ForegroundColor Green
    $image = [System.Drawing.Image]::FromFile((Resolve-Path "public/card_teaser.png"))
    $width = $image.Width
    $height = $image.Height
    $image.Dispose()
    
    Write-Host "   ℹ️  Dimensions: ${width}x${height}" -ForegroundColor Cyan
    if ($width -eq 1200 -and $height -eq 630) {
        Write-Host "   ✅ Perfect dimensions for social media" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Recommended: 1200x630px" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "   ❌ card_teaser.png not found" -ForegroundColor Red
    $errors++
}

# Check package.json
Write-Host "`n4. Checking package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   ✅ package.json exists" -ForegroundColor Green
    $pkg = Get-Content "package.json" | ConvertFrom-Json
    
    if ($pkg.scripts.build) {
        Write-Host "   ✅ Build script defined" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Build script missing" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "   ❌ package.json not found" -ForegroundColor Red
    $errors++
}

# Check .gitignore
Write-Host "`n5. Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore" -Raw
    if ($gitignore -match "\.env") {
        Write-Host "   ✅ .env files are ignored" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  .env not in .gitignore" -ForegroundColor Yellow
        $warnings++
    }
    if ($gitignore -match "node_modules") {
        Write-Host "   ✅ node_modules is ignored" -ForegroundColor Green
    } else {
        Write-Host "   ❌ node_modules not in .gitignore" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "   ❌ .gitignore not found" -ForegroundColor Red
    $errors++
}

# Try to build
Write-Host "`n6. Testing build..." -ForegroundColor Yellow
Write-Host "   ⏳ Running npm run build (this may take a minute)..." -ForegroundColor Cyan

$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build failed. Check output above." -ForegroundColor Red
    Write-Host $buildOutput
    $errors++
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "🎉 All checks passed! Ready to deploy!" -ForegroundColor Green
} elseif ($errors -eq 0) {
    Write-Host "✅ Ready to deploy (with $warnings warnings)" -ForegroundColor Green
    Write-Host "   Review warnings above before deploying." -ForegroundColor Yellow
} else {
    Write-Host "❌ $errors error(s) found. Fix them before deploying." -ForegroundColor Red
    Write-Host "   See DEPLOYMENT.md for help." -ForegroundColor Yellow
}

Write-Host "`n📖 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Read DEPLOYMENT.md for detailed instructions" -ForegroundColor White
Write-Host "   2. Push to GitHub: git push origin main" -ForegroundColor White
Write-Host "   3. Import project in Vercel dashboard" -ForegroundColor White
Write-Host "   4. Add environment variables in Vercel" -ForegroundColor White
Write-Host "   5. Deploy and test!" -ForegroundColor White
