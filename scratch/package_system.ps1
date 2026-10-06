$sourceDir = "c:\Users\Ibrahim A. Hamada\Desktop\tech"
$destDir = "c:\Users\Ibrahim A. Hamada\Desktop\tech\تيك_سيستم"

Write-Host "Creating self-contained portable package in $destDir..."

# Ensure directories
$posDir = Join-Path $destDir "1- تطبيق_الكاشير_المكتبي_POS"
$adminDir = Join-Path $destDir "2- تطبيق_إدارة_الصالون_ADMIN"
$engineDir = Join-Path $destDir "engine"

New-Item -ItemType Directory -Path $posDir -Force | Out-Null
New-Item -ItemType Directory -Path $adminDir -Force | Out-Null
New-Item -ItemType Directory -Path $engineDir -Force | Out-Null

# Copy EXEs
Copy-Item (Join-Path $sourceDir "كاشير_صالون_عادل_POS.exe") (Join-Path $posDir "كاشير_صالون_عادل_POS.exe") -Force
Copy-Item (Join-Path $sourceDir "إدارة_صالون_عادل_ADMIN.exe") (Join-Path $adminDir "إدارة_صالون_عادل_ADMIN.exe") -Force
Copy-Item (Join-Path $sourceDir "كاشير_صالون_عادل_POS.exe") (Join-Path $destDir "كاشير_صالون_عادل_POS.exe") -Force
Copy-Item (Join-Path $sourceDir "إدارة_صالون_عادل_ADMIN.exe") (Join-Path $destDir "إدارة_صالون_عادل_ADMIN.exe") -Force

# Copy core apps and builds into engine
Write-Host "Copying apps..."
Copy-Item (Join-Path $sourceDir "apps") $engineDir -Recurse -Force

Write-Host "Copying configuration files..."
Copy-Item (Join-Path $sourceDir "package.json") $engineDir -Force
Copy-Item (Join-Path $sourceDir "package-lock.json") $engineDir -Force
Copy-Item (Join-Path $sourceDir ".env.example") $engineDir -Force
Copy-Item (Join-Path $sourceDir ".gitignore") $engineDir -Force

Write-Host "Packaging done!"
