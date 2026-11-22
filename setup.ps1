# Run from this folder in PowerShell:  .\setup.ps1
# Works whether or not Laravel (api) and Next.js (web) are already installed here.
# If yours are in other folders, copy the contents of api-overlay\ over your Laravel project
# and web-overlay\ over your Next.js project instead (same relative paths), then follow README.md.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# ---- API (Laravel) ----
if (-not (Test-Path "api\artisan")) {
  composer create-project laravel/laravel api
}
Push-Location api
if (-not (Test-Path "routes\api.php")) { php artisan install:api --no-interaction }
Pop-Location
Copy-Item -Recurse -Force "api-overlay\*" "api\"
Push-Location api
if (-not (Select-String -Path .env -Pattern "^ADMIN_PASSWORD=" -Quiet)) {
  Add-Content .env "`nADMIN_EMAIL=admin@maaambeysweets.in`nADMIN_PASSWORD=ChangeMe123!"
}
php artisan migrate --seed --force
if (-not (Test-Path "public\storage")) { php artisan storage:link }
Pop-Location

# ---- Web (Next.js) ----
if (-not (Test-Path "web\package.json")) {
  npx create-next-app@latest web --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-npm --yes
}
Copy-Item -Recurse -Force "web-overlay\*" "web\"
if (-not (Test-Path "web\.env.local")) { Set-Content -Path "web\.env.local" -Value "NEXT_PUBLIC_API_URL=http://localhost:8000/api`nNEXT_PUBLIC_WHATSAPP=919999999999" }
Push-Location web
npm install jsbarcode qrcode
npm install -D @types/qrcode
Pop-Location

Write-Host "`nDone. Start with two terminals:`n  cd api; php artisan serve`n  cd web; npm run dev`nThen open http://localhost:3000 (admin: /admin/login)."
