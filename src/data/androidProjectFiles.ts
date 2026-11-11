export interface ProjectFile {
  path: string;
  name: string;
  language: string;
  category: 'java' | 'manifest' | 'gradle' | 'res' | 'docs' | 'script';
  description: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: ProjectFile[] = [
  {
    path: 'build-apk-wsl.sh',
    name: 'build-apk-wsl.sh',
    language: 'bash',
    category: 'script',
    description: 'Скрипт автоматической сборки APK для WSL Linux: проверяет/качает Android SDK и собирает APK',
    content: `#!/usr/bin/env bash
# ==============================================================================
# Скрипт автоматической сборки APK для Samsung Galaxy Watch (Wear OS)
# Разработан специально для WSL (Ubuntu/Debian) и Linux.
#
# Использование:
#   ./build-apk-wsl.sh
#   ИЛИ с указанием пути к SDK (поддерживает формат Windows и WSL):
#   ./build-apk-wsl.sh "D:\\programs\\android-studio"
#   ./build-apk-wsl.sh /mnt/d/programs/android-studio
# ==============================================================================

set -e

CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m' # No Color

echo -e "\${CYAN}====================================================================\${NC}"
echo -e "\${CYAN}  Galaxy Watch Bezel Tracker — Сборка APK в WSL (Linux)             \${NC}"
echo -e "\${CYAN}====================================================================\${NC}"

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\$SCRIPT_DIR"

# Функция конвертации Windows-пути (D:\\path) в путь WSL (/mnt/d/path)
convert_win_to_wsl() {
    local input_path="\$1"
    input_path=\$(echo "\$input_path" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*\$//' -e 's/^"//' -e 's/"\$//')

    if [[ "\$input_path" =~ ^([a-zA-Z]):[\\\\/](.*) ]]; then
        local drive_letter="\${BASH_REMATCH[1],,}"
        local rest_path="\${BASH_REMATCH[2]//\\\\//}"
        echo "/mnt/\${drive_letter}/\${rest_path}"
    elif command -v wslpath &> /dev/null && [[ "\$input_path" =~ ^[a-zA-Z]: ]]; then
        wslpath -u "\$input_path" 2>/dev/null || echo "\$input_path"
    else
        echo "\$input_path"
    fi
}

echo -e "\\n\${YELLOW}[1/5] Проверка окружения и Java...\${NC}"

if ! command -v javac &> /dev/null; then
    echo -e "\${YELLOW}JDK не найден. Устанавливаем OpenJDK 17...\${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y openjdk-17-jdk wget unzip curl
    else
        echo -e "\${RED}Ошибка: Пакетный менеджер apt-get не найден. Установите OpenJDK 17 вручную.\${NC}"
        exit 1
    fi
else
    JAVA_VER=\$(javac -version 2>&1 | awk '{print \$2}')
    echo -e "\${GREEN}✓ Java обнаружена: version \${JAVA_VER}\${NC}"
fi

echo -e "\\n\${YELLOW}[2/5] Определение пути к Android Studio / Android SDK...\${NC}"

DETECTED_SDK=""

# Вариант А: Передан путь аргументом: ./build-apk-wsl.sh "D:\\programs\\android-studio"
if [ -n "\$1" ]; then
    CUSTOM_ARG_PATH=\$(convert_win_to_wsl "\$1")
    echo -e "\${CYAN}Проверка переданного аргумента: \$1 -> \${CUSTOM_ARG_PATH}\${NC}"
    if [ -d "\$CUSTOM_ARG_PATH" ]; then
        if [ -d "\$CUSTOM_ARG_PATH/sdk" ]; then
            DETECTED_SDK="\$CUSTOM_ARG_PATH/sdk"
        elif [ -d "\$CUSTOM_ARG_PATH/Sdk" ]; then
            DETECTED_SDK="\$CUSTOM_ARG_PATH/Sdk"
        else
            DETECTED_SDK="\$CUSTOM_ARG_PATH"
        fi
        echo -e "\${GREEN}✓ Использован переданный путь: \${DETECTED_SDK}\${NC}"
    fi
fi

# Вариант Б: Переменные ANDROID_HOME / ANDROID_SDK_ROOT
if [ -z "\$DETECTED_SDK" ]; then
    if [ -n "\$ANDROID_HOME" ]; then
        CONV_PATH=\$(convert_win_to_wsl "\$ANDROID_HOME")
        if [ -d "\$CONV_PATH" ]; then DETECTED_SDK="\$CONV_PATH"; fi
    elif [ -n "\$ANDROID_SDK_ROOT" ]; then
        CONV_PATH=\$(convert_win_to_wsl "\$ANDROID_SDK_ROOT")
        if [ -d "\$CONV_PATH" ]; then DETECTED_SDK="\$CONV_PATH"; fi
    fi
fi

# Вариант В: Проверяем local.properties
if [ -z "\$DETECTED_SDK" ] && [ -f "local.properties" ]; then
    PROP_DIR=\$(grep -E '^sdk.dir=' local.properties | cut -d'=' -f2- | tr -d '\\r')
    if [ -n "\$PROP_DIR" ]; then
        CONV_DIR=\$(convert_win_to_wsl "\$PROP_DIR")
        if [ -d "\$CONV_DIR" ]; then
            DETECTED_SDK="\$CONV_DIR"
            echo -e "\${GREEN}✓ Путь прочитан из local.properties: \${DETECTED_SDK}\${NC}"
        fi
    fi
fi

# Вариант Г: Проверяем диск D:\\programs\\android-studio и его подпапки
if [ -z "\$DETECTED_SDK" ]; then
    POSSIBLE_D_PATHS=(
        "/mnt/d/programs/android-studio/sdk"
        "/mnt/d/programs/android-studio/Sdk"
        "/mnt/d/programs/android-studio"
        "/mnt/d/Android/Sdk"
        "/mnt/d/Android/sdk"
        "/mnt/d/android-sdk"
    )
    for p in "\${POSSIBLE_D_PATHS[@]}"; do
        if [ -d "\$p" ]; then
            DETECTED_SDK="\$p"
            echo -e "\${GREEN}✓ Найден SDK на диске D:: \${DETECTED_SDK}\${NC}"
            break
        fi
    done
fi

# Вариант Д: Стандартный путь Windows AppData
if [ -z "\$DETECTED_SDK" ]; then
    for win_user_sdk in /mnt/c/Users/*/AppData/Local/Android/Sdk; do
        if [ -d "\$win_user_sdk" ]; then
            DETECTED_SDK="\$win_user_sdk"
            echo -e "\${GREEN}✓ Найден стандартный SDK Windows: \${DETECTED_SDK}\${NC}"
            break
        fi
    done
fi

# Проверка на папку программы вместо SDK
if [ -n "\$DETECTED_SDK" ]; then
    if [ -f "\$DETECTED_SDK/bin/studio64.exe" ] || [ -f "\$DETECTED_SDK/bin/studio.sh" ]; then
        if [ ! -d "\$DETECTED_SDK/platforms" ] && [ ! -d "\$DETECTED_SDK/platform-tools" ]; then
            if [ -d "\$DETECTED_SDK/sdk" ]; then
                DETECTED_SDK="\$DETECTED_SDK/sdk"
            fi
        fi
    fi
fi

# Если не найден — скачиваем автономный SDK
if [ -z "\$DETECTED_SDK" ]; then
    echo -e "\${YELLOW}Android SDK не обнаружен. Скачиваем официальные Google Command-Line Tools...\${NC}"
    TARGET_SDK_DIR="\$HOME/android-sdk"
    mkdir -p "\$TARGET_SDK_DIR/cmdline-tools"

    CMDLINE_ZIP_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    ZIP_FILE="/tmp/cmdline-tools.zip"

    if [ ! -d "\$TARGET_SDK_DIR/cmdline-tools/latest" ]; then
        wget -q --show-progress "\$CMDLINE_ZIP_URL" -O "\$ZIP_FILE"
        unzip -q "\$ZIP_FILE" -d "\$TARGET_SDK_DIR/cmdline-tools"
        mv "\$TARGET_SDK_DIR/cmdline-tools/cmdline-tools" "\$TARGET_SDK_DIR/cmdline-tools/latest"
        rm -f "\$ZIP_FILE"
    fi

    DETECTED_SDK="\$TARGET_SDK_DIR"
    export PATH="\$DETECTED_SDK/cmdline-tools/latest/bin:\$PATH"
    yes | sdkmanager --licenses > /dev/null 2>&1 || true
    sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
else
    echo -e "\${GREEN}✓ Будет использован Android SDK: \${DETECTED_SDK}\${NC}"
fi

export ANDROID_HOME="\$DETECTED_SDK"
export ANDROID_SDK_ROOT="\$DETECTED_SDK"

echo -e "\\n\${YELLOW}[3/5] Настройка конфигурации local.properties...\${NC}"
echo "sdk.dir=\$DETECTED_SDK" > local.properties
echo -e "\${GREEN}✓ local.properties сформирован (sdk.dir=\${DETECTED_SDK})\${NC}"

if [ ! -f "./gradlew" ]; then
    if command -v gradle &> /dev/null; then
        gradle wrapper
    else
        sudo apt-get install -y gradle
        gradle wrapper
    fi
fi
chmod +x ./gradlew

echo -e "\\n\${YELLOW}[4/5] Запуск компиляции APK для Samsung Galaxy Watch...\${NC}"
./gradlew assembleDebug --no-daemon

echo -e "\\n\${YELLOW}[5/5] Финализация...\${NC}"

APK_SOURCE="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "\$APK_SOURCE" ]; then
    TARGET_APK="./GalaxyWatch-BezelTracker.apk"
    cp "\$APK_SOURCE" "\$TARGET_APK"

    echo -e "\\n\${GREEN}====================================================================\${NC}"
    echo -e "\${GREEN}✓ СБОРКА УСПЕШНО ЗАВЕРШЕНА!                                         \${NC}"
    echo -e "\${GREEN}====================================================================\${NC}"
    echo -e "Готовый установочный файл APK:"
    echo -e "  -> \${CYAN}\${SCRIPT_DIR}/GalaxyWatch-BezelTracker.apk\${NC}"
    echo -e "\\n\${YELLOW}Команды для установки на часы через Wi-Fi:\${NC}"
    echo -e "  1. \${CYAN}adb connect <IP_ЧАСОВ>:<ПОРТ>\${NC}"
    echo -e "  2. \${CYAN}adb install GalaxyWatch-BezelTracker.apk\${NC}"
    echo -e "\${GREEN}====================================================================\${NC}"
else
    echo -e "\${RED}Ошибка: Файл APK не найден после сборки. Проверьте вывод gradle выше.\${NC}"
    exit 1
fi
`
  },
  {
    path: 'build-apk-windows.bat',
    name: 'build-apk-windows.bat',
    language: 'bat',
    category: 'script',
    description: 'Скрипт сборки APK для Windows Command Prompt (без проблем с кодировкой и путями)',
    content: `@echo off
setlocal

rem ==============================================================================
rem Galaxy Watch Bezel Tracker - Windows APK Build Script
rem ==============================================================================

echo ====================================================================
echo   Galaxy Watch Bezel Tracker - Build APK (Windows)
echo ====================================================================

cd /d "%~dp0"

echo [1/5] Detecting Android SDK location...
set "DETECTED_SDK="

rem 1. Check custom argument passed by user
if not "%~1"=="" if exist "%~1\\sdk" set "DETECTED_SDK=%~1\\sdk"
if not "%~1"=="" if "%DETECTED_SDK%"=="" if exist "%~1" set "DETECTED_SDK=%~1"

rem 2. Check ANDROID_HOME or ANDROID_SDK_ROOT environment variables
if "%DETECTED_SDK%"=="" if defined ANDROID_HOME if exist "%ANDROID_HOME%" set "DETECTED_SDK=%ANDROID_HOME%"
if "%DETECTED_SDK%"=="" if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%" set "DETECTED_SDK=%ANDROID_SDK_ROOT%"

rem 3. Check D:\\ disk locations
if "%DETECTED_SDK%"=="" if exist "D:\\programs\\android-studio\\sdk" set "DETECTED_SDK=D:\\programs\\android-studio\\sdk"
if "%DETECTED_SDK%"=="" if exist "D:\\programs\\android-studio" set "DETECTED_SDK=D:\\programs\\android-studio"
if "%DETECTED_SDK%"=="" if exist "D:\\Android\\Sdk" set "DETECTED_SDK=D:\\Android\\Sdk"

rem 4. Check default Windows AppData SDK
if "%DETECTED_SDK%"=="" if exist "%LOCALAPPDATA%\\Android\\Sdk" set "DETECTED_SDK=%LOCALAPPDATA%\\Android\\Sdk"

if "%DETECTED_SDK%"=="" goto :sdk_not_found

echo [OK] Using Android SDK: %DETECTED_SDK%

echo [2/5] Detecting compatible Java JDK...
set "STUDIO_JDK="
if exist "%DETECTED_SDK%\\..\\jbr\\bin\\java.exe" set "STUDIO_JDK=%DETECTED_SDK%\\..\\jbr"
if "%STUDIO_JDK%"=="" if exist "%DETECTED_SDK%\\jbr\\bin\\java.exe" set "STUDIO_JDK=%DETECTED_SDK%\\jbr"
if "%STUDIO_JDK%"=="" if exist "D:\\programs\\android-studio\\jbr\\bin\\java.exe" set "STUDIO_JDK=D:\\programs\\android-studio\\jbr"
if "%STUDIO_JDK%"=="" if exist "D:\\programs\\android-studio\\jre\\bin\\java.exe" set "STUDIO_JDK=D:\\programs\\android-studio\\jre"

if not "%STUDIO_JDK%"=="" goto :activate_jbr
echo [INFO] JBR not found, using system Java.
goto :after_jdk

:activate_jbr
set "JAVA_HOME=%STUDIO_JDK%"
set "PATH=%STUDIO_JDK%\\bin;%PATH%"
echo [OK] Activated Android Studio bundled JDK: %STUDIO_JDK%

:after_jdk
echo [3/5] Generating local.properties and checking Gradle Wrapper...
set "ESCAPED_SDK=%DETECTED_SDK:\\=\\\\%"
echo sdk.dir=%ESCAPED_SDK%> local.properties
echo [OK] local.properties created successfully.

rem Automatically accept Android SDK licenses so Gradle can download build-tools and platforms
if not exist "%DETECTED_SDK%\\licenses" mkdir "%DETECTED_SDK%\\licenses" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$l = Join-Path '%DETECTED_SDK%' 'licenses'; if (!(Test-Path $l)) { New-Item -ItemType Directory -Path $l -Force | Out-Null }; @('24333f8a63cbd82497577c687f05e4707624c43f', '8933902f0dafbf5c2929fb79c211442148169a7e', 'd56f5187479451eabf01fb78ba6ed6f316281657') | Set-Content (Join-Path $l 'android-sdk-license') -Encoding ascii; '84831b9409646a918e30573bab4c9c91346d8abd' | Set-Content (Join-Path $l 'android-sdk-preview-license') -Encoding ascii" 2>nul
echo [OK] Android SDK licenses accepted.

if not exist "gradle\\wrapper" mkdir "gradle\\wrapper"

if exist "gradle\\wrapper\\gradle-wrapper.jar" goto :wrapper_ok
echo [INFO] gradle-wrapper.jar missing. Downloading from Gradle repository...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar', 'gradle\\wrapper\\gradle-wrapper.jar')"

:wrapper_ok
if not exist "gradle\\wrapper\\gradle-wrapper.jar" goto :wrapper_error
echo [OK] Gradle wrapper verified.

if not exist "settings.gradle" goto :after_settings_patch
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='settings.gradle'; (Get-Content $f) -replace 'FAIL_ON_PROJECT_REPOS', 'PREFER_SETTINGS' | Set-Content $f"
:after_settings_patch

if not exist "build.gradle" goto :after_build_patch
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='build.gradle'; $c = Get-Content $f -Raw; $c = $c -replace '(?s)allprojects\\s*\\{.*?\\}', ''; Set-Content $f $c"
:after_build_patch

echo [4/5] Compiling APK using Gradle...
if not exist "gradlew.bat" goto :gradlew_missing

call gradlew.bat assembleDebug

echo [5/5] Verifying build output...
if exist "app\\build\\outputs\\apk\\debug\\app-debug.apk" goto :build_success
goto :build_failed

:build_success
copy /y "app\\build\\outputs\\apk\\debug\\app-debug.apk" "GalaxyWatch-BezelTracker.apk" > nul
echo.
echo ====================================================================
echo [SUCCESS] APK BUILD COMPLETED!
echo Output file: GalaxyWatch-BezelTracker.apk
echo.
echo To install on your Samsung Galaxy Watch via Wi-Fi:
echo   1. adb connect ^<WATCH_IP^>:^<PORT^>
echo   2. adb install GalaxyWatch-BezelTracker.apk
echo ====================================================================
pause
exit /b 0

:build_failed
echo.
echo [ERROR] Build failed. Please inspect gradle output above.
pause
exit /b 1

:sdk_not_found
echo.
echo [ERROR] Android SDK was not found automatically.
echo Please specify your Android SDK path as an argument:
echo   build-apk-windows.bat "D:\\programs\\android-studio"
echo.
pause
exit /b 1

:wrapper_error
echo [ERROR] Could not obtain gradle\\wrapper\\gradle-wrapper.jar.
pause
exit /b 1

:gradlew_missing
echo [ERROR] gradlew.bat not found in current folder.
pause
exit /b 1
`
  },
  {
    path: 'build-apk-windows.ps1',
    name: 'build-apk-windows.ps1',
    language: 'powershell',
    category: 'script',
    description: 'PowerShell скрипт сборки APK для Windows (современная альтернатива .bat)',
    content: `# ==============================================================================
# Galaxy Watch Bezel Tracker - PowerShell Build Script for Windows
# Run in PowerShell:
#   .\\build-apk-windows.ps1
#   or with custom path:
#   .\\build-apk-windows.ps1 "D:\\programs\\android-studio"
# ==============================================================================

param (
    [string]$CustomSdkPath = ""
)

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Galaxy Watch Bezel Tracker — Сборка APK (PowerShell / Windows)    " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "\`n[1/5] Поиск Android SDK..." -ForegroundColor Yellow

$DetectedSdk = ""

if ($CustomSdkPath -ne "") {
    if (Test-Path "$CustomSdkPath\\sdk") {
        $DetectedSdk = "$CustomSdkPath\\sdk"
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
        "D:\\programs\\android-studio\\sdk",
        "D:\\programs\\android-studio",
        "D:\\Android\\Sdk",
        "D:\\programs\\Android\\Sdk"
    )
    foreach ($p in $PotentialPaths) {
        if (Test-Path $p) {
            $DetectedSdk = $p
            break
        }
    }
}

if ($DetectedSdk -eq "") {
    $AppDataSdk = "$env:LOCALAPPDATA\\Android\\Sdk"
    if (Test-Path $AppDataSdk) {
        $DetectedSdk = $AppDataSdk
    }
}

if ($DetectedSdk -eq "") {
    Write-Host "\`n[!] Android SDK не найден автоматически." -ForegroundColor Red
    Write-Host "Запустите скрипт с указанием пути к папке SDK:" -ForegroundColor Yellow
    Write-Host "  .\\build-apk-windows.ps1 \`"D:\\programs\\android-studio\`"" -ForegroundColor White
    exit 1
}

Write-Host "✓ Найден Android SDK: $DetectedSdk" -ForegroundColor Green

Write-Host "\`n[2/5] Поиск совместимого Java JDK (Android Studio JBR)..." -ForegroundColor Yellow
$JbrCandidates = @(
    "$DetectedSdk\\jbr",
    "$DetectedSdk\\..\\jbr",
    "D:\\programs\\android-studio\\jbr",
    "D:\\programs\\android-studio\\jre"
)
$FoundJbr = $false
foreach ($j in $JbrCandidates) {
    if (Test-Path "$j\\bin\\java.exe") {
        $env:JAVA_HOME = (Resolve-Path $j).Path
        $env:PATH = "$env:JAVA_HOME\\bin;$env:PATH"
        Write-Host "✓ Активирован встроенный стабильный JDK (JBR): $env:JAVA_HOME" -ForegroundColor Green
        $FoundJbr = $true
        break
    }
}
if (!$FoundJbr) {
    Write-Host "[i] JBR не найден, используется системная Java" -ForegroundColor Yellow
}

Write-Host "\`n[3/5] Формирование local.properties, принятие лицензий и проверка Gradle Wrapper..." -ForegroundColor Yellow
$EscapedSdk = $DetectedSdk.Replace("\\", "\\\\")
"sdk.dir=$EscapedSdk" | Out-File -FilePath "$ScriptDir\\local.properties" -Encoding ascii
Write-Host "✓ local.properties создан" -ForegroundColor Green

# Автоматическое принятие лицензий Android SDK (необходимо для автоскачивания platforms и build-tools)
$LicensesDir = "$DetectedSdk\\licenses"
if (!(Test-Path $LicensesDir)) {
    New-Item -ItemType Directory -Path $LicensesDir -Force | Out-Null
}
@('24333f8a63cbd82497577c687f05e4707624c43f', '8933902f0dafbf5c2929fb79c211442148169a7e', 'd56f5187479451eabf01fb78ba6ed6f316281657') | Set-Content "$LicensesDir\\android-sdk-license" -Encoding ascii
'84831b9409646a918e30573bab4c9c91346d8abd' | Set-Content "$LicensesDir\\android-sdk-preview-license" -Encoding ascii
Write-Host "✓ Лицензии Android SDK автоматически приняты" -ForegroundColor Green

$WrapperDir = "$ScriptDir\\gradle\\wrapper"
if (!(Test-Path $WrapperDir)) {
    New-Item -ItemType Directory -Path $WrapperDir -Force | Out-Null
}

$PropsFile = "$WrapperDir\\gradle-wrapper.properties"
if (Test-Path $PropsFile) {
    (Get-Content $PropsFile) -replace 'gradle-[0-9.]+-bin\\.zip', 'gradle-8.7-bin.zip' | Set-Content $PropsFile
}

$WrapperJar = "$WrapperDir\\gradle-wrapper.jar"
if (!(Test-Path $WrapperJar)) {
    Write-Host "Скачивание gradle-wrapper.jar с официального репозитория Gradle..." -ForegroundColor Cyan
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object Net.WebClient).DownloadFile("https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar", $WrapperJar)
}

Write-Host "✓ Gradle Wrapper проверен" -ForegroundColor Green

# Устранение конфликта репозиториев между settings.gradle и build.gradle
if (Test-Path "$ScriptDir\\settings.gradle") {
    (Get-Content "$ScriptDir\\settings.gradle") -replace 'FAIL_ON_PROJECT_REPOS', 'PREFER_SETTINGS' | Set-Content "$ScriptDir\\settings.gradle"
}
if (Test-Path "$ScriptDir\\build.gradle") {
    $bg = Get-Content "$ScriptDir\\build.gradle" -Raw
    $bg = $bg -replace '(?s)allprojects\\s*\\{.*?\\}', ''
    Set-Content "$ScriptDir\\build.gradle" $bg
}

& "$ScriptDir\\gradlew.bat" assembleDebug

Write-Host "\`n[5/5] Проверка результата..." -ForegroundColor Yellow
$ApkOutput = "$ScriptDir\\app\\build\\outputs\\apk\\debug\\app-debug.apk"
$FinalApk = "$ScriptDir\\GalaxyWatch-BezelTracker.apk"

if (Test-Path $ApkOutput) {
    Copy-Item -Path $ApkOutput -Destination $FinalApk -Force
    Write-Host "\`n====================================================================" -ForegroundColor Green
    Write-Host "✓ СБОРКА УСПЕШНО ЗАВЕРШЕНА!" -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host "Готовый установочный файл APK:"
    Write-Host "  -> $FinalApk" -ForegroundColor Cyan
    Write-Host "\`nКоманды для установки на Samsung Galaxy Watch через Wi-Fi:" -ForegroundColor Yellow
    Write-Host "  1. adb connect <IP_ЧАСОВ>:<ПОРТ>" -ForegroundColor Cyan
    Write-Host "  2. adb install GalaxyWatch-BezelTracker.apk" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Green
} else {
    Write-Host "[!] Сборка не удалась. Проверьте вывод gradle выше." -ForegroundColor Red
    exit 1
}
`
  },
  {
    path: 'gradlew',
    name: 'gradlew',
    language: 'bash',
    category: 'script',
    description: 'Официальный Unix скрипт Gradle Wrapper для сборки проекта без установленного Gradle',
    content: `#!/bin/sh

# Attempt to set APP_HOME
# Resolve links: $0 may be a link
PRG="$0"
# Need this for relative symlinks.
while [ -h "$PRG" ] ; do
    ls=\`ls -ld "$PRG"\`
    link=\`expr "$ls" : '.*-> \\(.*\\)$'\`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG="\`dirname "$PRG"\`/$link"
    fi
done
SAVED="\`pwd\`"
cd "\`dirname \\"$PRG\\"\`/" >/dev/null
APP_HOME="\`pwd -P\`"
cd "$SAVED" >/dev/null

APP_NAME="Gradle"
APP_BASE_NAME=\`basename "$0"\`

# Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'

# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

warn () {
    echo "$*"
}

die () {
    echo
    echo "$*"
    echo
    exit 1
}

# OS specific support (both for OS X and cygwin/mingw)
cygwin=false
msys=false
darwin=false
nonstop=false
case "\`uname\`" in
  CYGWIN* ) cygwin=true ;;
  Darwin* ) darwin=true ;;
  MSYS* | MINGW* ) msys=true ;;
  NONSTOP* ) nonstop=true ;;
esac

CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
else
    JAVACMD="java"
    which java >/dev/null 2>&1 || die "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH."
fi

exec "$JAVACMD" "-Dorg.gradle.appname=$APP_BASE_NAME" -classpath "$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "$@"
`
  },
  {
    path: 'gradlew.bat',
    name: 'gradlew.bat',
    language: 'bat',
    category: 'script',
    description: 'Windows пакетный файл Gradle Wrapper для запуска сборки',
    content: `@rem
@rem Copyright 2015 the original author or authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem      https://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem

@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve any "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

@rem Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
goto fail

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar

@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

:fail
exit /b 1
`
  },
  {
    path: 'app/src/main/java/com/galaxywatch/bezeltracker/MainActivity.java',
    name: 'MainActivity.java',
    language: 'java',
    category: 'java',
    description: 'Главный экран Wear OS с обработкой вращения безеля и авто-выбором без нажатий',
    content: `package com.galaxywatch.bezeltracker;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;

import com.galaxywatch.bezeltracker.data.ActivityLog;
import com.galaxywatch.bezeltracker.data.AppDatabase;
import com.galaxywatch.bezeltracker.view.BezelCircularView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.Executors;

/**
 * MainActivity для Samsung Galaxy Watch (Wear OS).
 * 
 * Особенности:
 * 1. Просыпается каждые 10 минут поверх экрана блокировки (Turn Screen On + Keep Screen On).
 * 2. Обрабатывает аппаратный поворот безеля Samsung через onGenericMotionEvent(MotionEvent).
 * 3. АВТО-ВЫБОР БЕЗ НАЖАТИЙ: как только пользователь покрутил безель и остановился на 1.5 секунды,
 *    выбранная активность автоматически фиксируется, сохраняется в базу Room,
 *    выдаётся тактильный отклик и экран гаснет.
 */
public class MainActivity extends Activity implements View.OnGenericMotionListener {

    public static final String[] ACTIVITIES = {
        "1. Проект",
        "2. Изучение программирования",
        "3. Изучение иностранного языка",
        "4. Поиск работы",
        "5. Подработка",
        "6. Кулинария",
        "7. Спорт",
        "8. Отдых",
        "9. Быт",
        "10. Другое"
    };

    private static final int TOTAL_ITEMS = 10;
    private static final long AUTO_CONFIRM_DELAY_MS = 1500; // 1.5 секунды после остановки безеля

    private int currentIndex = 0;
    private float scrollAccumulator = 0f;

    private BezelCircularView circularView;
    private TextView tvStatusHint;
    private TextView tvCurrentActivity;

    private Vibrator vibrator;
    private Handler autoConfirmHandler;
    private Runnable autoConfirmRunnable;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Включение экрана поверх блокировки часов
        wakeUpAndUnlock();

        setContentView(R.layout.activity_main);

        circularView = findViewById(R.id.bezel_circular_view);
        tvStatusHint = findViewById(R.id.tv_status_hint);
        tvCurrentActivity = findViewById(R.id.tv_current_activity);

        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        autoConfirmHandler = new Handler(Looper.getMainLooper());

        // Регистрация слушателя событий безеля на корневом элементе
        View rootView = findViewById(R.id.root_container);
        rootView.setOnGenericMotionListener(this);
        rootView.requestFocus();

        // 2. Инициализация таймера авто-подтверждения
        initAutoConfirmRunnable();

        updateSelectionUI(currentIndex, false);

        // Запуск начального таймера (если пользователь не крутил, выберется текущее значение)
        scheduleAutoConfirm();
    }

    /**
     * Пробуждение экрана Samsung Galaxy Watch поверх заблокированного дисплея
     */
    private void wakeUpAndUnlock() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
    }

    /**
     * ОБРАБОТКА ВРАЩЕНИЯ БЕЗЕЛЯ SAMSUNG GALAXY WATCH
     * На Wear OS безель генерирует MotionEvent.ACTION_SCROLL с осью AXIS_SCROLL.
     */
    @Override
    public boolean onGenericMotionEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_SCROLL &&
            (event.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER) || event.isFromSource(InputDevice.SOURCE_CLASS_POINTER))) {

            // Получаем дельту вращения безеля
            // Значение отрицательное при вращении против часовой стрелки, положительное - по часовой
            float delta = -event.getAxisValue(MotionEvent.AXIS_SCROLL);
            scrollAccumulator += delta;

            // Чувствительность шага безеля (один щелчок аппаратного безеля обычно равен 1.0)
            if (Math.abs(scrollAccumulator) >= 0.5f) {
                int direction = scrollAccumulator > 0 ? 1 : -1;
                scrollAccumulator = 0f;

                onBezelRotated(direction);
                return true;
            }
        }
        return super.onGenericMotionEvent(event);
    }

    /**
     * Срабатывает при каждом щелчке безеля
     */
    private void onBezelRotated(int direction) {
        // Переход по кольцу 0..9 (циклически)
        currentIndex = (currentIndex + direction) % TOTAL_ITEMS;
        if (currentIndex < 0) {
            currentIndex += TOTAL_ITEMS;
        }

        // Тактильный клик при повороте безеля
        playBezelClickHaptic();

        // Обновляем визуальное состояние
        updateSelectionUI(currentIndex, true);

        // Перезапускаем таймер авто-выбора:
        // Ничего нажимать не нужно - после остановки безеля выбор будет сделан автоматически!
        scheduleAutoConfirm();
    }

    private void updateSelectionUI(int index, boolean animate) {
        String activityTitle = ACTIVITIES[index];
        tvCurrentActivity.setText(activityTitle);
        tvStatusHint.setText("Остановитесь для авто-выбора...");

        if (circularView != null) {
            circularView.setSelectedActivityIndex(index, animate);
            circularView.startCountdownProgress(AUTO_CONFIRM_DELAY_MS);
        }
    }

    private void initAutoConfirmRunnable() {
        autoConfirmRunnable = new Runnable() {
            @Override
            public void run() {
                // АВТО-ВЫБОР СРАБОТАЛ!
                onAutoConfirmSelection();
            }
        };
    }

    private void scheduleAutoConfirm() {
        if (autoConfirmHandler != null && autoConfirmRunnable != null) {
            autoConfirmHandler.removeCallbacks(autoConfirmRunnable);
            autoConfirmHandler.postDelayed(autoConfirmRunnable, AUTO_CONFIRM_DELAY_MS);
        }
    }

    /**
     * Автоматическое подтверждение выбранной активности
     */
    private void onAutoConfirmSelection() {
        String selected = ACTIVITIES[currentIndex];

        // 1. Тактильное вибро-подтверждение
        playSuccessHaptic();

        // 2. Сохраняем в локальную базу данных Room
        saveActivityRecord(currentIndex + 1, selected);

        // 3. Анимация успеха и мягкое закрытие активности для экономии батареи
        tvStatusHint.setText("✓ Записано!");
        Toast.makeText(this, "Зафиксировано: " + selected, Toast.LENGTH_SHORT).show();

        // Закрываем экран через 800мс и переходим в спящий режим часов
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                finish();
            }
        }, 800);
    }

    private void saveActivityRecord(int activityId, String activityName) {
        Executors.newSingleThreadExecutor().execute(new Runnable() {
            @Override
            public void run() {
                ActivityLog log = new ActivityLog();
                log.activityId = activityId;
                log.activityName = activityName;
                log.timestamp = System.currentTimeMillis();
                log.timeFormatted = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());

                AppDatabase.getInstance(getApplicationContext()).activityDao().insert(log);
            }
        });
    }

    private void playBezelClickHaptic() {
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK));
            } else {
                vibrator.vibrate(25);
            }
        }
    }

    private void playSuccessHaptic() {
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 60, 40, 100}, -1));
            } else {
                vibrator.vibrate(150);
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (autoConfirmHandler != null && autoConfirmRunnable != null) {
            autoConfirmHandler.removeCallbacks(autoConfirmRunnable);
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/galaxywatch/bezeltracker/IntervalReminderReceiver.java',
    name: 'IntervalReminderReceiver.java',
    language: 'java',
    category: 'java',
    description: '10-минутный AlarmManager ресивер: виброотклик, включение экрана и запуск MainActivity',
    content: `package com.galaxywatch.bezeltracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;

/**
 * Ресивер каждые 10 минут пробуждает процессор часов,
 * запускает короткую вибрацию и открывает MainActivity для выбора безелем.
 */
public class IntervalReminderReceiver extends BroadcastReceiver {

    public static final String ACTION_INTERVAL_ALARM = "com.galaxywatch.bezeltracker.ACTION_INTERVAL_ALARM";
    public static final long INTERVAL_10_MINUTES_MS = 10 * 60 * 1000L; // 10 минут

    @Override
    public void onReceive(Context context, Intent intent) {
        // 1. Кратковременный WakeLock для гарантированного включения экрана
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "GalaxyWatch:IntervalWakeLock"
            );
            wakeLock.acquire(4000); // на 4 секунды
        }

        // 2. Короткая вибрация часов (два импульса)
        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Паттерн вибрации: пауза 0, вибро 180мс, пауза 80мс, вибро 220мс
                long[] timings = new long[]{0, 180, 80, 220};
                int[] amplitudes = new int[]{0, 255, 0, 255};
                vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1));
            } else {
                vibrator.vibrate(300);
            }
        }

        // 3. Открытие MainActivity поверх экрана часов
        Intent activityIntent = new Intent(context, MainActivity.class);
        activityIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        context.startActivity(activityIntent);

        // 4. Планирование следующего 10-минутного интервала
        scheduleNextInterval(context);

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    /**
     * Планирование точного пробуждения часов через AlarmManager
     */
    public static void scheduleNextInterval(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, IntervalReminderReceiver.class);
        intent.setAction(ACTION_INTERVAL_ALARM);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            1001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        long triggerAt = SystemClock.elapsedRealtime() + INTERVAL_10_MINUTES_MS;

        if (alarmManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Работает даже в энергосберегающем режиме Doze на Galaxy Watch
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
            }
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/galaxywatch/bezeltracker/BootReceiver.java',
    name: 'BootReceiver.java',
    language: 'java',
    category: 'java',
    description: 'Автозапуск 10-минутного таймера при перезагрузке Samsung Galaxy Watch',
    content: `package com.galaxywatch.bezeltracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Восстанавливает 10-минутный AlarmManager при перезагрузке часов.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            
            IntervalReminderReceiver.scheduleNextInterval(context);
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/galaxywatch/bezeltracker/view/BezelCircularView.java',
    name: 'BezelCircularView.java',
    language: 'java',
    category: 'java',
    description: 'Кастомный круговой View для экрана Samsung Galaxy Watch с индикатором безеля',
    content: `package com.galaxywatch.bezeltracker.view;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;
import android.view.animation.DecelerateInterpolator;

import androidx.annotation.Nullable;

/**
 * Круговой виджет для круглого экрана часов (450x450 Super AMOLED).
 * Рисует 10 секторов активностей, маркер текущей позиции безеля,
 * и круговой таймер авто-подтверждения.
 */
public class BezelCircularView extends View {

    private static final int TOTAL_ITEMS = 10;
    private static final int[] CATEGORY_COLORS = {
        0xFF38BDF8, // 1. Проект (Sky)
        0xFFA855F7, // 2. Кодинг (Purple)
        0xFF06B6D4, // 3. Языки (Cyan)
        0xFFF59E0B, // 4. Поиск работы (Amber)
        0xFF10B981, // 5. Подработка (Emerald)
        0xFFF97316, // 6. Кулинария (Orange)
        0xFFEF4444, // 7. Спорт (Red)
        0xFF8B5CF6, // 8. Отдых (Violet)
        0xFF64748B, // 9. Быт (Slate)
        0xFFEC4899  // 10. Другое (Pink)
    };

    private Paint rimPaint;
    private Paint tickPaint;
    private Paint activeSegmentPaint;
    private Paint countdownProgressPaint;
    private Paint textPaint;

    private RectF rimBounds;
    private RectF progressBounds;

    private int selectedIndex = 0;
    private float animatedAngle = 0f;
    private float countdownProgress = 1.0f; // от 1.0 до 0.0

    private ValueAnimator angleAnimator;
    private ValueAnimator countdownAnimator;

    public BezelCircularView(Context context) {
        super(context);
        init();
    }

    public BezelCircularView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        rimBounds = new RectF();
        progressBounds = new RectF();

        rimPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        rimPaint.setStyle(Paint.Style.STROKE);
        rimPaint.setStrokeWidth(6f);
        rimPaint.setColor(0xFF27272A); // Zinc 800

        tickPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        tickPaint.setStyle(Paint.Style.STROKE);
        tickPaint.setStrokeWidth(4f);
        tickPaint.setColor(0xFF71717A);

        activeSegmentPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        activeSegmentPaint.setStyle(Paint.Style.STROKE);
        activeSegmentPaint.setStrokeWidth(12f);
        activeSegmentPaint.setStrokeCap(Paint.Cap.ROUND);

        countdownProgressPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        countdownProgressPaint.setStyle(Paint.Style.STROKE);
        countdownProgressPaint.setStrokeWidth(5f);
        countdownProgressPaint.setStrokeCap(Paint.Cap.ROUND);
        countdownProgressPaint.setColor(0xFFFFFFFF);

        textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setColor(Color.WHITE);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTextSize(24f);
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        float padding = 16f;
        rimBounds.set(padding, padding, w - padding, h - padding);

        float progressPad = 6f;
        progressBounds.set(progressPad, progressPad, w - progressPad, h - progressPad);
    }

    public void setSelectedActivityIndex(int index, boolean animate) {
        this.selectedIndex = index;
        float targetAngle = (index * 360f / TOTAL_ITEMS) - 90f; // 0 вверху

        if (animate) {
            if (angleAnimator != null && angleAnimator.isRunning()) {
                angleAnimator.cancel();
            }
            angleAnimator = ValueAnimator.ofFloat(animatedAngle, targetAngle);
            angleAnimator.setDuration(180);
            angleAnimator.setInterpolator(new DecelerateInterpolator());
            angleAnimator.addUpdateListener(animator -> {
                animatedAngle = (float) animator.getAnimatedValue();
                invalidate();
            });
            angleAnimator.start();
        } else {
            animatedAngle = targetAngle;
            invalidate();
        }
    }

    public void startCountdownProgress(long durationMs) {
        if (countdownAnimator != null && countdownAnimator.isRunning()) {
            countdownAnimator.cancel();
        }
        countdownProgress = 1.0f;
        countdownAnimator = ValueAnimator.ofFloat(1.0f, 0.0f);
        countdownAnimator.setDuration(durationMs);
        countdownAnimator.addUpdateListener(animator -> {
            countdownProgress = (float) animator.getAnimatedValue();
            invalidate();
        });
        countdownAnimator.start();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float centerX = getWidth() / 2f;
        float centerY = getHeight() / 2f;
        float radius = Math.min(centerX, centerY) - 24f;

        // 1. Базовый обод безеля
        canvas.drawCircle(centerX, centerY, radius, rimPaint);

        // 2. Деления для 10 активностей (по 36 градусов каждое)
        for (int i = 0; i < TOTAL_ITEMS; i++) {
            float angleDeg = (i * 36f) - 90f;
            float angleRad = (float) Math.toRadians(angleDeg);

            float startX = centerX + (radius - 10f) * (float) Math.cos(angleRad);
            float startY = centerY + (radius - 10f) * (float) Math.sin(angleRad);
            float endX = centerX + (radius + 6f) * (float) Math.cos(angleRad);
            float endY = centerY + (radius + 6f) * (float) Math.sin(angleRad);

            tickPaint.setColor(i == selectedIndex ? 0xFFFFFFFF : 0xFF52525B);
            canvas.drawLine(startX, startY, endX, endY, tickPaint);
        }

        // 3. Цветная активная дуга выбранной активности
        int activeColor = CATEGORY_COLORS[selectedIndex % CATEGORY_COLORS.length];
        activeSegmentPaint.setColor(activeColor);
        canvas.drawArc(rimBounds, animatedAngle - 14f, 28f, false, activeSegmentPaint);

        // 4. Кольцевой индикатор авто-подтверждения (сжимается за 1.5 секунды)
        if (countdownProgress > 0) {
            countdownProgressPaint.setColor(activeColor);
            float sweepAngle = 360f * countdownProgress;
            canvas.drawArc(progressBounds, -90f, sweepAngle, false, countdownProgressPaint);
        }
    }
}
`
  },
  {
    path: 'app/src/main/java/com/galaxywatch/bezeltracker/data/ActivityLog.java',
    name: 'ActivityLog.java',
    language: 'java',
    category: 'java',
    description: 'Room Entity для сохранения 10-минутного снапшота активности',
    content: `package com.galaxywatch.bezeltracker.data;

import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "activity_logs")
public class ActivityLog {
    @PrimaryKey(autoGenerate = true)
    public long id;

    public int activityId; // 1..10
    public String activityName;
    public long timestamp; // epoch ms
    public String timeFormatted;
}
`
  },
  {
    path: 'app/src/main/java/com/galaxywatch/bezeltracker/data/ActivityDao.java',
    name: 'ActivityDao.java',
    language: 'java',
    category: 'java',
    description: 'Room Data Access Object для истории активностей на часах',
    content: `package com.galaxywatch.bezeltracker.data;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;

import java.util.List;

@Dao
public interface ActivityDao {
    @Insert
    void insert(ActivityLog log);

    @Query("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100")
    List<ActivityLog> getRecentLogs();

    @Query("SELECT activityId, activityName, COUNT(*) as count FROM activity_logs GROUP BY activityId")
    List<ActivityStats> getActivityStats();

    class ActivityStats {
        public int activityId;
        public String activityName;
        public int count;
    }
}
`
  },
  {
    path: 'app/src/main/java/com/galaxywatch/bezeltracker/data/AppDatabase.java',
    name: 'AppDatabase.java',
    language: 'java',
    category: 'java',
    description: 'Room Database синглтон для локального хранения на часах',
    content: `package com.galaxywatch.bezeltracker.data;

import android.content.Context;

import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;

@Database(entities = {ActivityLog.class}, version = 1, exportSchema = false)
public abstract class AppDatabase extends RoomDatabase {
    private static volatile AppDatabase INSTANCE;

    public abstract ActivityDao activityDao();

    public static AppDatabase getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(
                        context.getApplicationContext(),
                        AppDatabase.class,
                        "galaxy_watch_tracker.db"
                    ).build();
                }
            }
        }
        return INSTANCE;
    }
}
`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    language: 'xml',
    category: 'manifest',
    description: 'Манифест Wear OS с разрешениями WAKE_LOCK, VIBRATE, RECEIVE_BOOT_COMPLETED и поддержкой безеля',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.galaxywatch.bezeltracker">

    <!-- Требования Wear OS и аппаратного безеля Samsung -->
    <uses-feature android:name="android.hardware.type.watch" />
    <uses-feature android:name="android.hardware.rotary" android:required="false" />

    <!-- Разрешения: вибрация, пробуждение экрана, автозапуск после перезагрузки -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:showWhenLocked="true"
            android:turnScreenOn="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- 10-минутный Alarm ресивер -->
        <receiver
            android:name=".IntervalReminderReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="com.galaxywatch.bezeltracker.ACTION_INTERVAL_ALARM" />
            </intent-filter>
        </receiver>

        <!-- Автозапуск таймера при перезагрузке часов -->
        <receiver
            android:name=".BootReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

    </application>

</manifest>
`
  },
  {
    path: 'app/src/main/res/layout/activity_main.xml',
    name: 'activity_main.xml',
    language: 'xml',
    category: 'res',
    description: 'Круговая разметка для экрана Samsung Galaxy Watch',
    content: `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000000"
    android:focusable="true"
    android:focusableInTouchMode="true">

    <!-- Круговой графический индикатор вращения безеля и авто-таймера -->
    <com.galaxywatch.bezeltracker.view.BezelCircularView
        android:id="@+id/bezel_circular_view"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <!-- Центральный блок информации -->
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:gravity="center"
        android:orientation="vertical"
        android:padding="24dp">

        <TextView
            android:id="@+id/tv_badge_label"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="ЧТО СЕЙЧАС ДЕЛАЕТЕ?"
            android:textColor="#A1A1AA"
            android:textSize="11sp"
            android:textStyle="bold"
            android:letterSpacing="0.08" />

        <TextView
            android:id="@+id/tv_current_activity"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:layout_marginBottom="8dp"
            android:gravity="center"
            android:text="1. Проект"
            android:textColor="#FFFFFF"
            android:textSize="20sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/tv_status_hint"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Покрутите безель..."
            android:textColor="#38BDF8"
            android:textSize="12sp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:text="Без нажатий: авто-выбор"
            android:textColor="#71717A"
            android:textSize="10sp" />
    </LinearLayout>

</FrameLayout>
`
  },
  {
    path: 'app/build.gradle',
    name: 'app/build.gradle',
    language: 'groovy',
    category: 'gradle',
    description: 'Gradle файл модуля приложения с Wear OS SDK и Room Database',
    content: `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.galaxywatch.bezeltracker'
    compileSdk 34

    defaultConfig {
        applicationId "com.galaxywatch.bezeltracker"
        minSdk 28   // Поддерживает Galaxy Watch 4, Watch 5, Watch 6, Watch 7
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    // Wear OS UI & Rotary Input
    implementation 'androidx.wear:wear:1.3.0'
    implementation 'com.google.android.support:wearable:2.9.0'
    compileOnly 'com.google.android.wearable:wearable:2.9.0'

    // Room Database для истории 10-минутных записей
    implementation 'androidx.room:room-runtime:2.6.1'
    annotationProcessor 'androidx.room:room-compiler:2.6.1'
}
`
  },
  {
    path: 'build.gradle',
    name: 'build.gradle (Project)',
    language: 'groovy',
    category: 'gradle',
    description: 'Корневой Gradle файл проекта Android Studio',
    content: `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`
  },
  {
    path: 'settings.gradle',
    name: 'settings.gradle',
    language: 'groovy',
    category: 'gradle',
    description: 'Настройки проекта Android Studio',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "GalaxyWatchBezelTracker"
include ':app'
`
  },
  {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    category: 'docs',
    description: 'Инструкция по установке на Samsung Galaxy Watch через Wi-Fi ADB в Android Studio',
    content: `# Samsung Galaxy Watch: Bezel Activity Tracker (Java)

Автономное Wear OS приложение на чистом **Java** для часов **Samsung Galaxy Watch 4 / 5 / 6 / 7 (включая Classic)**.

## Главная идея и функционал:
1. **Каждые 10 минут**: Часы выдают короткий вибросигнал, экран просыпается поверх блокировки.
2. **Вращение безеля (Rotary Bezel)**: Пользователь легким движением поворачивает физический или сенсорный обод (безель) часов, переключая один из 10 видов деятельности:
   1. Проект
   2. Изучение программирования
   3. Изучение иностранного языка
   4. Поиск работы
   5. Подработка
   6. Кулинария
   7. Спорт
   8. Отдых
   9. Быт
   10. Другое
3. **Авто-выбор БЕЗ нажатий (Zero-Click)**: Пользователю вообще не нужно нажимать кнопки или тапать по экрану! Достаточно покрутить безель и остановиться: через 1.5 секунды выбор автоматически фиксируется, сохраняется в локальную базу данных SQLite (Room), выдается подтверждающий вибро-клик, и экран гаснет до следующей десятиминутки.

## Быстрая автоматическая сборка APK (WSL Linux / Windows):

В корень проекта включен скрипт **\`build-apk-wsl.sh\`**, который автоматически:
1. Проверяет наличие JDK 17 (при отсутствии устанавливает).
2. Ищет установленную Android Studio / Android SDK (в том числе в Windows через \`/mnt/c/Users/.../AppData/Local/Android/Sdk\`).
3. Если Android Studio / SDK не установлены — сам скачивает официальные Google Command-Line Tools и платформу Android 34.
4. Собирает готовый APK файл \`GalaxyWatch-BezelTracker.apk\` в корень проекта.

### Запуск в WSL:
\`\`\`bash
chmod +x build-apk-wsl.sh
./build-apk-wsl.sh
\`\`\`
*(Для Windows без WSL также предусмотрен батник \`build-apk-windows.bat\`)*

---

## Как установить собранный APK на Samsung Galaxy Watch через Wi-Fi (ADB):

### Шаг 1: Включение режима разработчика на часах
1. На Galaxy Watch откройте **Настройки (Settings)** -> **О часах (About watch)** -> **Сведения о ПО (Software info)**.
2. Быстро нажмите **7 раз подряд** на пункт **Версия ПО (Software version)**.
3. Появится надпись: *"Режим разработчика включен" (Developer mode turned on)*.

### Шаг 2: Включение Wireless Debugging
1. Вернитесь в **Настройки** -> в самом низу появится **Параметры разработчика (Developer options)**.
2. Включите **Отладка по ADB (ADB debugging)**.
3. Включите **Беспроводная отладка (Wireless debugging)**.
4. Убедитесь, что часы и ваш компьютер подключены к одной Wi-Fi сети.
5. Нажмите на **Подключить новое устройство (Pair new device)**. Часы покажут IP-адрес, Порт и 6-значный код сопряжения.

### Шаг 3: Сопряжение в Android Studio
В терминале Android Studio выполните:
\`\`\`bash
adb pair 192.168.1.XX:YYYYY  # Укажите IP и порт сопряжения с экрана часов
# Введите 6-значный Pairing Code

adb connect 192.168.1.XX:ZZZZZ # Основной порт беспроводной отладки
\`\`\`

### Шаг 4: Сборка и запуск
1. Откройте этот проект в **Android Studio**.
2. В выпадающем списке целевых устройств выберите ваши часы (например, *Samsung SM-R960*).
3. Нажмите зеленую кнопку **Run (Shift+F10)**.
4. Приложение установится и запустится на часах!
`
  }
];
