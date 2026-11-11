#!/usr/bin/env bash
# ==============================================================================
# Скрипт автоматической сборки APK для Samsung Galaxy Watch (Wear OS)
# Разработан специально для WSL (Ubuntu/Debian) и Linux.
#
# Использование:
#   ./build-apk-wsl.sh
#   ИЛИ с указанием пути к SDK (поддерживает формат Windows и WSL):
#   ./build-apk-wsl.sh "D:\programs\android-studio"
#   ./build-apk-wsl.sh /mnt/d/programs/android-studio
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}  Galaxy Watch Bezel Tracker — Сборка APK в WSL (Linux)             ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# Переходим в директорию скрипта (корень проекта)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Функция конвертации Windows-пути (D:\path или d:/path) в путь WSL (/mnt/d/path)
convert_win_to_wsl() {
    local input_path="$1"
    # Удаляем кавычки и пробелы по краям
    input_path=$(echo "$input_path" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')

    if [[ "$input_path" =~ ^([a-zA-Z]):[\\/](.*) ]]; then
        local drive_letter="${BASH_REMATCH[1],,}" # переводим букву диска в нижний регистр
        local rest_path="${BASH_REMATCH[2]//\\//}" # заменяем все обратные слэши на прямые
        echo "/mnt/${drive_letter}/${rest_path}"
    elif command -v wslpath &> /dev/null && [[ "$input_path" =~ ^[a-zA-Z]: ]]; then
        wslpath -u "$input_path" 2>/dev/null || echo "$input_path"
    else
        echo "$input_path"
    fi
}

echo -e "\n${YELLOW}[1/5] Проверка окружения и Java...${NC}"

# 1. Проверка Java
if ! command -v javac &> /dev/null; then
    echo -e "${YELLOW}JDK не найден. Устанавливаем OpenJDK 17...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y openjdk-17-jdk wget unzip curl
    else
        echo -e "${RED}Ошибка: Пакетный менеджер apt-get не найден. Установите OpenJDK 17 вручную.${NC}"
        exit 1
    fi
else
    JAVA_VER=$(javac -version 2>&1 | awk '{print $2}')
    echo -e "${GREEN}✓ Java обнаружена: version ${JAVA_VER}${NC}"
fi

# 2. Определение пути к Android SDK
echo -e "\n${YELLOW}[2/5] Определение пути к Android Studio / Android SDK...${NC}"

DETECTED_SDK=""

# Вариант А: Пользователь передал путь аргументом командной строки:
# ./build-apk-wsl.sh "D:\programs\android-studio"
if [ -n "$1" ]; then
    CUSTOM_ARG_PATH=$(convert_win_to_wsl "$1")
    echo -e "${CYAN}Проверка переданного аргумента: $1 -> ${CUSTOM_ARG_PATH}${NC}"
    if [ -d "$CUSTOM_ARG_PATH" ]; then
        # Проверяем, не лежит ли SDK во вложенной папке sdk
        if [ -d "$CUSTOM_ARG_PATH/sdk" ]; then
            DETECTED_SDK="$CUSTOM_ARG_PATH/sdk"
        elif [ -d "$CUSTOM_ARG_PATH/Sdk" ]; then
            DETECTED_SDK="$CUSTOM_ARG_PATH/Sdk"
        else
            DETECTED_SDK="$CUSTOM_ARG_PATH"
        fi
        echo -e "${GREEN}✓ Использован переданный путь: ${DETECTED_SDK}${NC}"
    else
        echo -e "${RED}Внимание: Указанная папка не найдена: ${CUSTOM_ARG_PATH}${NC}"
        echo -e "${YELLOW}Продолжаем поиск по стандартным путям...${NC}"
    fi
fi

# Вариант Б: Проверяем переменные окружения ANDROID_HOME / ANDROID_SDK_ROOT
if [ -z "$DETECTED_SDK" ]; then
    if [ -n "$ANDROID_HOME" ]; then
        CONV_PATH=$(convert_win_to_wsl "$ANDROID_HOME")
        if [ -d "$CONV_PATH" ]; then DETECTED_SDK="$CONV_PATH"; fi
    elif [ -n "$ANDROID_SDK_ROOT" ]; then
        CONV_PATH=$(convert_win_to_wsl "$ANDROID_SDK_ROOT")
        if [ -d "$CONV_PATH" ]; then DETECTED_SDK="$CONV_PATH"; fi
    fi
fi

# Вариант В: Проверяем существующий local.properties в проекте
if [ -z "$DETECTED_SDK" ] && [ -f "local.properties" ]; then
    PROP_DIR=$(grep -E '^sdk.dir=' local.properties | cut -d'=' -f2- | tr -d '\r')
    if [ -n "$PROP_DIR" ]; then
        CONV_DIR=$(convert_win_to_wsl "$PROP_DIR")
        if [ -d "$CONV_DIR" ]; then
            DETECTED_SDK="$CONV_DIR"
            echo -e "${GREEN}✓ Путь прочитан из local.properties: ${DETECTED_SDK}${NC}"
        fi
    fi
fi

# Вариант Г: Проверяем путь D:\programs\android-studio и его подпапки
if [ -z "$DETECTED_SDK" ]; then
    POSSIBLE_D_PATHS=(
        "/mnt/d/programs/android-studio/sdk"
        "/mnt/d/programs/android-studio/Sdk"
        "/mnt/d/programs/android-studio"
        "/mnt/d/Android/Sdk"
        "/mnt/d/Android/sdk"
        "/mnt/d/android-sdk"
        "/mnt/d/programs/Android/Sdk"
    )
    for p in "${POSSIBLE_D_PATHS[@]}"; do
        if [ -d "$p" ]; then
            DETECTED_SDK="$p"
            echo -e "${GREEN}✓ Найден SDK на диске D:: ${DETECTED_SDK}${NC}"
            break
        fi
    done
fi

# Вариант Д: Проверяем стандартный путь в Windows AppData пользователя
if [ -z "$DETECTED_SDK" ]; then
    for win_user_sdk in /mnt/c/Users/*/AppData/Local/Android/Sdk; do
        if [ -d "$win_user_sdk" ]; then
            DETECTED_SDK="$win_user_sdk"
            echo -e "${GREEN}✓ Найден стандартный SDK Windows: ${DETECTED_SDK}${NC}"
            break
        fi
    done
fi

# Вариант Е: Проверяем домашнюю папку Linux / WSL
if [ -z "$DETECTED_SDK" ]; then
    if [ -d "$HOME/Android/Sdk" ]; then
        DETECTED_SDK="$HOME/Android/Sdk"
    elif [ -d "$HOME/android-sdk" ]; then
        DETECTED_SDK="$HOME/android-sdk"
    fi
fi

# Проверка: является ли DETECTED_SDK самой программой Android Studio или папкой SDK
if [ -n "$DETECTED_SDK" ]; then
    # Если внутри есть bin/studio64.exe или studio.sh, но НЕТ platforms/platform-tools
    if [ -f "$DETECTED_SDK/bin/studio64.exe" ] || [ -f "$DETECTED_SDK/bin/studio.sh" ]; then
        if [ ! -d "$DETECTED_SDK/platforms" ] && [ ! -d "$DETECTED_SDK/platform-tools" ]; then
            echo -e "${YELLOW}Примечание:${NC} В '${DETECTED_SDK}' находится сама среда Android Studio."
            if [ -d "$DETECTED_SDK/sdk" ]; then
                DETECTED_SDK="$DETECTED_SDK/sdk"
                echo -e "${GREEN}✓ Найдена вложенная папка SDK: ${DETECTED_SDK}${NC}"
            fi
        fi
    fi
fi

# 3. Если SDK так и не найден — скачиваем официальный Android SDK автономно
if [ -z "$DETECTED_SDK" ]; then
    echo -e "${YELLOW}Android SDK не обнаружен. Скачиваем официальные Google Android Command-Line Tools...${NC}"
    TARGET_SDK_DIR="$HOME/android-sdk"
    mkdir -p "$TARGET_SDK_DIR/cmdline-tools"

    CMDLINE_ZIP_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    ZIP_FILE="/tmp/cmdline-tools.zip"

    if [ ! -d "$TARGET_SDK_DIR/cmdline-tools/latest" ]; then
        echo -e "${CYAN}Скачивание компонентов с Google Repository...${NC}"
        wget -q --show-progress "$CMDLINE_ZIP_URL" -O "$ZIP_FILE"
        echo -e "${CYAN}Распаковка...${NC}"
        unzip -q "$ZIP_FILE" -d "$TARGET_SDK_DIR/cmdline-tools"
        mv "$TARGET_SDK_DIR/cmdline-tools/cmdline-tools" "$TARGET_SDK_DIR/cmdline-tools/latest"
        rm -f "$ZIP_FILE"
    fi

    DETECTED_SDK="$TARGET_SDK_DIR"
    export PATH="$DETECTED_SDK/cmdline-tools/latest/bin:$PATH"

    echo -e "${CYAN}Принятие лицензий и установка Android Platform 34...${NC}"
    yes | sdkmanager --licenses > /dev/null 2>&1 || true
    sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
else
    echo -e "${GREEN}✓ Будет использован Android SDK: ${DETECTED_SDK}${NC}"
fi

export ANDROID_HOME="$DETECTED_SDK"
export ANDROID_SDK_ROOT="$DETECTED_SDK"

# 4. Настройка local.properties
echo -e "\n${YELLOW}[3/5] Настройка конфигурации local.properties...${NC}"
echo "sdk.dir=$DETECTED_SDK" > local.properties
echo -e "${GREEN}✓ local.properties сформирован (sdk.dir=${DETECTED_SDK})${NC}"

# Проверяем наличие gradle wrapper
if [ ! -f "./gradlew" ]; then
    echo -e "${YELLOW}Файл gradlew не найден. Генерируем Gradle обертку...${NC}"
    if command -v gradle &> /dev/null; then
        gradle wrapper
    else
        sudo apt-get install -y gradle
        gradle wrapper
    fi
fi
mkdir -p gradle/wrapper
if [ ! -f "gradle/wrapper/gradle-wrapper.jar" ]; then
    echo -e "${CYAN}Скачивание gradle-wrapper.jar...${NC}"
    wget -q --show-progress "https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar" -O "gradle/wrapper/gradle-wrapper.jar" 2>/dev/null || curl -sSL "https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar" -o "gradle/wrapper/gradle-wrapper.jar"
fi
chmod +x ./gradlew

# 5. Запуск компиляции APK
echo -e "\n${YELLOW}[4/5] Запуск компиляции APK для Samsung Galaxy Watch...${NC}"
./gradlew assembleDebug --no-daemon

# 6. Проверка результата
echo -e "\n${YELLOW}[5/5] Финализация...${NC}"

APK_SOURCE="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_SOURCE" ]; then
    TARGET_APK="./GalaxyWatch-BezelTracker.apk"
    cp "$APK_SOURCE" "$TARGET_APK"

    echo -e "\n${GREEN}====================================================================${NC}"
    echo -e "${GREEN}✓ СБОРКА УСПЕШНО ЗАВЕРШЕНА!                                         ${NC}"
    echo -e "${GREEN}====================================================================${NC}"
    echo -e "Готовый установочный файл APK:"
    echo -e "  -> ${CYAN}${SCRIPT_DIR}/GalaxyWatch-BezelTracker.apk${NC}"
    echo -e "\n${YELLOW}Команды для установки на часы через Wi-Fi:${NC}"
    echo -e "  1. ${CYAN}adb connect <IP_ЧАСОВ>:<ПОРТ>${NC}"
    echo -e "  2. ${CYAN}adb install GalaxyWatch-BezelTracker.apk${NC}"
    echo -e "${GREEN}====================================================================${NC}"
else
    echo -e "${RED}Ошибка: Файл APK не найден после сборки. Проверьте вывод gradle выше.${NC}"
    exit 1
fi
