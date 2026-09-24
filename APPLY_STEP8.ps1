# STEP 8 - Apply patch to an existing OrgFlow-Pro working folder
# Run from the repository root in PowerShell.
$ErrorActionPreference = "Stop"

if (!(Test-Path ".\index.html")) {
  throw "index.html not found. Run this script from the OrgFlow-Pro repository root."
}

New-Item -ItemType Directory -Force ".\js" | Out-Null
Copy-Item ".\STEP8_LOGIN_MFA\js\auth-gate.js" ".\js\auth-gate.js" -Force

$index = Get-Content ".\index.html" -Raw
if ($index -notmatch 'js/auth-gate\.js') {
  $needle = '<script src="js/supabase-service.js"></script>'
  if ($index -notmatch [regex]::Escape($needle)) {
    throw "Could not find supabase-service.js script tag in index.html."
  }
  $index = $index.Replace($needle, $needle + "`r`n  <script src=""js/auth-gate.js""></script>")
  Set-Content ".\index.html" $index -Encoding UTF8
}

Write-Host "STEP 8 patch applied." -ForegroundColor Green
Write-Host "Now set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in js/config.js, then commit/push." -ForegroundColor Yellow
