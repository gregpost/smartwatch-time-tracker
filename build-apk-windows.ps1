# ==============================================================================
# Galaxy Watch Bezel Tracker - PowerShell Build Script for Windows
# Run in PowerShell:
#   .\build-apk-windows.ps1
#   or with custom path:
#   .\build-apk-windows.ps1 "D:\programs\android-studio"
# ==============================================================================

param (
    [string]$CustomSdkPath = ""
)

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Galaxy Watch Bezel Tracker — Сборка APK (PowerShell / Windows)    " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "`n[1/5] Поиск Android SDK..." -ForegroundColor Yellow

$DetectedSdk = ""

if ($CustomSdkPath -ne "") {
    if (Test-Path "$CustomSdkPath\sdk") {
        $DetectedSdk = "$CustomSdkPath\sdk"
    } elseif (Test-Path $CustomSdkPath) {
        $DetectedSdk = $CustomSdkPath
    }
}

if ($DetectedSdk -eq "") {
    if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
        $DetectedSdk = $env:ANDROID_HOME
    } elseif ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) {
        $DetectedSdk = $env:ANDROID_SDK_ROOT
    }
}

if ($DetectedSdk -eq "") {
    $PotentialPaths = @(
        "D:\programs\android-studio\sdk",
        "D:\programs\android-studio",
        "D:\Android\Sdk",
        "D:\programs\Android\Sdk"
    )
    foreach ($p in $PotentialPaths) {
        if (Test-Path $p) {
            $DetectedSdk = $p
            break
        }
    }
}

if ($DetectedSdk -eq "") {
    $AppDataSdk = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $AppDataSdk) {
        $DetectedSdk = $AppDataSdk
    }
}

if ($DetectedSdk -eq "") {
    Write-Host "`n[!] Android SDK не найден автоматически." -ForegroundColor Red
    Write-Host "Запустите скрипт с указанием пути к папке SDK:" -ForegroundColor Yellow
    Write-Host "  .\build-apk-windows.ps1 `"D:\programs\android-studio`"" -ForegroundColor White
    exit 1
}

Write-Host "✓ Найден Android SDK: $DetectedSdk" -ForegroundColor Green

# 2. Поиск совместимого JDK (встроенного в Android Studio JBR)
Write-Host "`n[2/5] Поиск совместимого Java JDK (Android Studio JBR)..." -ForegroundColor Yellow
$JbrCandidates = @(
    "$DetectedSdk\jbr",
    "$DetectedSdk\..\jbr",
    "D:\programs\android-studio\jbr",
    "D:\programs\android-studio\jre"
)
$FoundJbr = $false
foreach ($j in $JbrCandidates) {
    if (Test-Path "$j\bin\java.exe") {
        $env:JAVA_HOME = (Resolve-Path $j).Path
        $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
        Write-Host "✓ Активирован встроенный стабильный JDK (JBR): $env:JAVA_HOME" -ForegroundColor Green
        $FoundJbr = $true
        break
    }
}
if (!$FoundJbr) {
    Write-Host "[i] JBR не найден, используется системная Java" -ForegroundColor Yellow
}

# 3. local.properties, лицензии и Gradle Wrapper
Write-Host "`n[3/5] Формирование local.properties, принятие лицензий и проверка Gradle Wrapper..." -ForegroundColor Yellow
$EscapedSdk = $DetectedSdk.Replace("\", "\\")
"sdk.dir=$EscapedSdk" | Out-File -FilePath "$ScriptDir\local.properties" -Encoding ascii
Write-Host "✓ local.properties создан" -ForegroundColor Green

# Автоматическое принятие лицензий Android SDK (необходимо для автоскачивания platforms и build-tools)
$LicensesDir = "$DetectedSdk\licenses"
if (!(Test-Path $LicensesDir)) {
    New-Item -ItemType Directory -Path $LicensesDir -Force | Out-Null
}
@('24333f8a63cbd82497577c687f05e4707624c43f', '8933902f0dafbf5c2929fb79c211442148169a7e', 'd56f5187479451eabf01fb78ba6ed6f316281657') | Set-Content "$LicensesDir\android-sdk-license" -Encoding ascii
'84831b9409646a918e30573bab4c9c91346d8abd' | Set-Content "$LicensesDir\android-sdk-preview-license" -Encoding ascii
Write-Host "✓ Лицензии Android SDK автоматически приняты" -ForegroundColor Green

$WrapperDir = "$ScriptDir\gradle\wrapper"
if (!(Test-Path $WrapperDir)) {
    New-Item -ItemType Directory -Path $WrapperDir -Force | Out-Null
}

# Обновляем версию Gradle до 8.7
$PropsFile = "$WrapperDir\gradle-wrapper.properties"
if (Test-Path $PropsFile) {
    (Get-Content $PropsFile) -replace 'gradle-[0-9.]+-bin\.zip', 'gradle-8.7-bin.zip' | Set-Content $PropsFile
} else {
    @"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
"@ | Out-File -FilePath $PropsFile -Encoding ascii
}

$WrapperJar = "$WrapperDir\gradle-wrapper.jar"
if (!(Test-Path $WrapperJar)) {
    Write-Host "Скачивание gradle-wrapper.jar с официального репозитория Gradle..." -ForegroundColor Cyan
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object Net.WebClient).DownloadFile("https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar", $WrapperJar)
}

if (!(Test-Path $WrapperJar)) {
    Write-Host "[!] Не удалось загрузить gradle-wrapper.jar" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Gradle Wrapper проверен" -ForegroundColor Green

# Устранение конфликта репозиториев между settings.gradle и build.gradle
if (Test-Path "$ScriptDir\\settings.gradle") {
    (Get-Content "$ScriptDir\\settings.gradle") -replace 'FAIL_ON_PROJECT_REPOS', 'PREFER_SETTINGS' | Set-Content "$ScriptDir\\settings.gradle"
}
if (Test-Path "$ScriptDir\\build.gradle") {
    $bg = Get-Content "$ScriptDir\\build.gradle" -Raw
    $bg = $bg -replace '(?s)allprojects\s*\{.*?\}', ''
    Set-Content "$ScriptDir\\build.gradle" $bg
}

& "$ScriptDir\\gradlew.bat" assembleDebug

# 5. Результат
Write-Host "`n[5/5] Проверка результата..." -ForegroundColor Yellow
$ApkOutput = "$ScriptDir\app\build\outputs\apk\debug\app-debug.apk"
$FinalApk = "$ScriptDir\GalaxyWatch-BezelTracker.apk"

if (Test-Path $ApkOutput) {
    Copy-Item -Path $ApkOutput -Destination $FinalApk -Force
    Write-Host "`n====================================================================" -ForegroundColor Green
    Write-Host "✓ СБОРКА УСПЕШНО ЗАВЕРШЕНА!" -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host "Готовый установочный файл APK:"
    Write-Host "  -> $FinalApk" -ForegroundColor Cyan
    Write-Host "`nКоманды для установки на Samsung Galaxy Watch через Wi-Fi:" -ForegroundColor Yellow
    Write-Host "  1. adb connect <IP_ЧАСОВ>:<ПОРТ>" -ForegroundColor Cyan
    Write-Host "  2. adb install GalaxyWatch-BezelTracker.apk" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Green
} else {
    Write-Host "[!] Сборка не удалась. Проверьте вывод gradle выше." -ForegroundColor Red
    exit 1
}
