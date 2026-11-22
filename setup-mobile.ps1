# Creates the Android/iOS customer app in .\mobile (Expo / React Native). Run after setup.ps1.
Set-Location $PSScriptRoot

if (-not (Test-Path "mobile\package.json")) {
  npx create-expo-app@latest mobile --template default --yes
}
Push-Location mobile
# remove the starter screens, keep the project config
foreach ($d in "app", "components", "hooks", "constants", "app-example") { if (Test-Path $d) { Remove-Item -Recurse -Force $d } }
Pop-Location
Copy-Item -Recurse -Force "mobile-overlay\*" "mobile\"
Push-Location mobile
npx expo install @react-native-async-storage/async-storage expo-image-picker
if (-not (Test-Path ".env")) {
  # Android emulator reaches your PC at 10.0.2.2. For a real phone use your PC's address, e.g. http://192.168.1.10:8000/api
  Set-Content ".env" "EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api"
}
Pop-Location

Write-Host "`nDone. Start the API with: cd api; php artisan serve --host=0.0.0.0`nThen: cd mobile; npx expo start   (press a for Android emulator, or scan the QR code with Expo Go on your phone)."
