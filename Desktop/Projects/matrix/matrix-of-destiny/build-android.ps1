### Matrix of Soul — Android Release Build Script ###
# Повний чистий білд з нуля

$BUILD_DIR = "C:\m"
$PROJECT_DIR = "C:\Users\dell\Desktop\Projects\matrix\matrix-of-soul"
$KEYSTORE_SRC = "C:\Users\dell\Desktop\job\matrix\@deusn__ingredify.jks"
$FONT_SRC = "$PROJECT_DIR\node_modules\@expo\vector-icons\build\vendor\react-native-vector-icons\Fonts\Ionicons.ttf"

Write-Host "=== STEP 1: Kill java processes ===" -ForegroundColor Cyan
taskkill /F /IM java.exe /T 2>$null; $null
taskkill /F /IM cmake.exe /T 2>$null; $null
taskkill /F /IM ninja.exe /T 2>$null; $null
Start-Sleep 3

Write-Host "=== STEP 2: Delete build directory ===" -ForegroundColor Cyan
if (Test-Path $BUILD_DIR) {
    Remove-Item $BUILD_DIR -Recurse -Force
}

Write-Host "=== STEP 3: Copy project ===" -ForegroundColor Cyan
robocopy $PROJECT_DIR $BUILD_DIR /MIR /XD node_modules .git .expo ios /NFL /NDL /NJH /NJS

Write-Host "=== STEP 4: npm install ===" -ForegroundColor Cyan
Set-Location $BUILD_DIR
npm install

Write-Host "=== STEP 5: Expo prebuild (generate android) ===" -ForegroundColor Cyan
npx expo prebuild --platform android --clean

Write-Host "=== STEP 6: Copy ionicons.ttf (LOWERCASE!) to assets/fonts ===" -ForegroundColor Cyan
$FONTS_DIR = "$BUILD_DIR\android\app\src\main\assets\fonts"
if (-not (Test-Path $FONTS_DIR)) {
    New-Item -ItemType Directory -Path $FONTS_DIR -Force
}
# CRITICAL: filename must be lowercase 'ionicons.ttf' to match fontFamily: 'ionicons'
Copy-Item $FONT_SRC "$FONTS_DIR\ionicons.ttf"
Write-Host "  Copied as: $FONTS_DIR\ionicons.ttf" -ForegroundColor Green

Write-Host "=== STEP 7: Create local.properties ===" -ForegroundColor Cyan
"sdk.dir=C\:\\Users\\dell\\AppData\\Local\\Android\\Sdk" | Out-File -FilePath "$BUILD_DIR\android\local.properties" -Encoding ascii

Write-Host "=== STEP 8: Copy release keystore ===" -ForegroundColor Cyan
Copy-Item $KEYSTORE_SRC "$BUILD_DIR\android\app\release.keystore"

Write-Host "=== STEP 9: Patch build.gradle (release signing) ===" -ForegroundColor Cyan
$gradle = Get-Content "$BUILD_DIR\android\app\build.gradle" -Raw
$gradle = $gradle -replace '(signingConfigs \{[\s\S]*?debug \{[^}]+\})\s*\}', @'
$1
        release {
            storeFile file('release.keystore')
            storePassword '809da5e91a222a7ccfa914605de333a2'
            keyAlias 'ac7732c1909e848c9d34449dc92e380a'
            keyPassword 'e1675cf74407c94894b6549ab7d04136'
        }
    }
'@
$gradle = $gradle -replace 'signingConfig signingConfigs\.debug(\s+def enableShrinkResources)', 'signingConfig signingConfigs.release$1'
Set-Content "$BUILD_DIR\android\app\build.gradle" $gradle -NoNewline

Write-Host "=== STEP 10: Build AAB ===" -ForegroundColor Cyan
Set-Location "$BUILD_DIR\android"
.\gradlew bundleRelease

Write-Host ""
Write-Host "=== BUILD COMPLETE ===" -ForegroundColor Green
Write-Host "AAB: $BUILD_DIR\android\app\build\outputs\bundle\release\app-release.aab" -ForegroundColor Yellow
