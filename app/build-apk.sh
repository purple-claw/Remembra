#!/bin/bash
# Build Android APK with correct Java version

set -e

echo "🔧 Setting environment..."
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"

# Prefer user-local Node via nvm when available (Capacitor requires Node >=22)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || true
fi

find_java_home() {
  if [ -x "$HOME/.jdks/temurin-21/bin/java" ]; then
    printf '%s\n' "$HOME/.jdks/temurin-21"
    return 0
  fi

  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    printf '%s\n' "$JAVA_HOME"
    return 0
  fi

  if command -v java >/dev/null 2>&1; then
    local java_bin
    java_bin="$(readlink -f "$(command -v java)")"
    printf '%s\n' "$(cd "$(dirname "$java_bin")/.." && pwd)"
    return 0
  fi

  if command -v javac >/dev/null 2>&1; then
    local javac_bin
    javac_bin="$(readlink -f "$(command -v javac)")"
    printf '%s\n' "$(cd "$(dirname "$javac_bin")/.." && pwd)"
    return 0
  fi

  for candidate in \
    /usr/lib/jvm/* \
    "$HOME/.jdks"/* \
    /opt/android-studio/jbr \
    /opt/android-studio/jbr/bin/java
  do
    if [ -x "$candidate/bin/java" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
    if [ -x "$candidate" ] && [ "$(basename "$candidate")" = "java" ]; then
      printf '%s\n' "$(cd "$(dirname "$candidate")/.." && pwd)"
      return 0
    fi
  done

  return 1
}

JAVA_HOME="$(find_java_home || true)"
if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "❌ Unable to find a valid JDK installation."
  echo "   Install JDK 17+ and set JAVA_HOME, or place java on PATH."
  echo "   Example: export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
  exit 1
fi

export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed or not on PATH."
  echo "   Install Node.js 22+ (latest LTS) and retry."
  exit 1
fi

NODE_VERSION_RAW="$(node -v 2>/dev/null || true)"
NODE_MAJOR="${NODE_VERSION_RAW#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 22 ]; then
  echo "❌ Node.js 22+ is required (found ${NODE_VERSION_RAW:-unknown})."
  echo "   Install Node 22+ and/or run: nvm use 22"
  exit 1
fi

# Validate Java
if [ ! -f "$JAVA_HOME/bin/java" ]; then
  echo "❌ JAVA_HOME is invalid: $JAVA_HOME"
  echo "   Set JAVA_HOME to a valid JDK 17+ installation."
  exit 1
fi

# Write SDK location
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# Keep Gradle's explicit Java home in sync with the detected JDK.
if grep -q '^org\.gradle\.java\.home=' android/gradle.properties; then
  sed -i "s|^org\\.gradle\\.java\\.home=.*|org.gradle.java.home=$JAVA_HOME|" android/gradle.properties
else
  echo "org.gradle.java.home=$JAVA_HOME" >> android/gradle.properties
fi

echo "☕ Java: $("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
echo "📱 Android SDK: $ANDROID_HOME"
echo "🐢 Node.js: $NODE_VERSION_RAW"

echo "📦 Building web app..."
npm run build

echo "🔄 Syncing to Android..."
npx cap sync android

echo "🤖 Building APK..."
cd android
./gradlew assembleDebug

echo ""
echo "✅ Build complete!"
echo "📱 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
ls -lh app/build/outputs/apk/debug/app-debug.apk
