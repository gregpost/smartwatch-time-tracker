@echo off
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
if not "%~1"=="" if exist "%~1\sdk" set "DETECTED_SDK=%~1\sdk"
if not "%~1"=="" if "%DETECTED_SDK%"=="" if exist "%~1" set "DETECTED_SDK=%~1"

rem 2. Check ANDROID_HOME or ANDROID_SDK_ROOT environment variables
if "%DETECTED_SDK%"=="" if defined ANDROID_HOME if exist "%ANDROID_HOME%" set "DETECTED_SDK=%ANDROID_HOME%"
if "%DETECTED_SDK%"=="" if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%" set "DETECTED_SDK=%ANDROID_SDK_ROOT%"

rem 3. Check D:\ disk locations
if "%DETECTED_SDK%"=="" if exist "D:\programs\android-studio\sdk" set "DETECTED_SDK=D:\programs\android-studio\sdk"
if "%DETECTED_SDK%"=="" if exist "D:\programs\android-studio" set "DETECTED_SDK=D:\programs\android-studio"
if "%DETECTED_SDK%"=="" if exist "D:\Android\Sdk" set "DETECTED_SDK=D:\Android\Sdk"

rem 4. Check default Windows AppData SDK
if "%DETECTED_SDK%"=="" if exist "%LOCALAPPDATA%\Android\Sdk" set "DETECTED_SDK=%LOCALAPPDATA%\Android\Sdk"

if "%DETECTED_SDK%"=="" goto :sdk_not_found

echo [OK] Using Android SDK: %DETECTED_SDK%

echo [2/5] Detecting compatible Java JDK...
set "STUDIO_JDK="
if exist "%DETECTED_SDK%\..\jbr\bin\java.exe" set "STUDIO_JDK=%DETECTED_SDK%\..\jbr"
if "%STUDIO_JDK%"=="" if exist "%DETECTED_SDK%\jbr\bin\java.exe" set "STUDIO_JDK=%DETECTED_SDK%\jbr"
if "%STUDIO_JDK%"=="" if exist "D:\programs\android-studio\jbr\bin\java.exe" set "STUDIO_JDK=D:\programs\android-studio\jbr"
if "%STUDIO_JDK%"=="" if exist "D:\programs\android-studio\jre\bin\java.exe" set "STUDIO_JDK=D:\programs\android-studio\jre"

if not "%STUDIO_JDK%"=="" goto :activate_jbr
echo [INFO] JBR not found, using system Java.
goto :after_jdk

:activate_jbr
set "JAVA_HOME=%STUDIO_JDK%"
set "PATH=%STUDIO_JDK%\bin;%PATH%"
echo [OK] Activated Android Studio bundled JDK: %STUDIO_JDK%

:after_jdk
echo [3/5] Generating local.properties and checking Gradle Wrapper...
set "ESCAPED_SDK=%DETECTED_SDK:\=\\%"
echo sdk.dir=%ESCAPED_SDK%> local.properties
echo [OK] local.properties created successfully.

rem Automatically accept Android SDK licenses so Gradle can download build-tools and platforms
if not exist "%DETECTED_SDK%\licenses" mkdir "%DETECTED_SDK%\licenses" 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$l = Join-Path '%DETECTED_SDK%' 'licenses'; if (!(Test-Path $l)) { New-Item -ItemType Directory -Path $l -Force | Out-Null }; @('24333f8a63cbd82497577c687f05e4707624c43f', '8933902f0dafbf5c2929fb79c211442148169a7e', 'd56f5187479451eabf01fb78ba6ed6f316281657') | Set-Content (Join-Path $l 'android-sdk-license') -Encoding ascii; '84831b9409646a918e30573bab4c9c91346d8abd' | Set-Content (Join-Path $l 'android-sdk-preview-license') -Encoding ascii" 2>nul
echo [OK] Android SDK licenses accepted.

if not exist "gradle\wrapper" mkdir "gradle\wrapper"

rem Download gradle-wrapper.jar if missing
if exist "gradle\wrapper\gradle-wrapper.jar" goto :wrapper_ok
echo [INFO] gradle-wrapper.jar missing. Downloading from Gradle repository...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar', 'gradle\wrapper\gradle-wrapper.jar')"

:wrapper_ok
if not exist "gradle\wrapper\gradle-wrapper.jar" goto :wrapper_error
echo [OK] Gradle wrapper verified.

if not exist "settings.gradle" goto :after_settings_patch
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='settings.gradle'; (Get-Content $f) -replace 'FAIL_ON_PROJECT_REPOS', 'PREFER_SETTINGS' | Set-Content $f"
:after_settings_patch

if not exist "build.gradle" goto :after_build_patch
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='build.gradle'; $c = Get-Content $f -Raw; $c = $c -replace '(?s)allprojects\s*\{.*?\}', ''; Set-Content $f $c"
:after_build_patch

echo [4/5] Compiling APK using Gradle...
if not exist "gradlew.bat" goto :gradlew_missing

call gradlew.bat assembleDebug

echo [5/5] Verifying build output...
if exist "app\build\outputs\apk\debug\app-debug.apk" goto :build_success
goto :build_failed

:build_success
copy /y "app\build\outputs\apk\debug\app-debug.apk" "GalaxyWatch-BezelTracker.apk" > nul
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
echo   build-apk-windows.bat "D:\programs\android-studio"
echo.
pause
exit /b 1

:wrapper_error
echo [ERROR] Could not obtain gradle\wrapper\gradle-wrapper.jar.
pause
exit /b 1

:gradlew_missing
echo [ERROR] gradlew.bat not found in current folder.
pause
exit /b 1
