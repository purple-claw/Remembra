#!/bin/bash
# Build Android APK with correct Java version

set -e

echo "🔧 Setting environment..."
export JAVA_HOME="${JAVA_HOME:-$HOME/.jdks/temurin-21}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# Validate Java
if [ ! -f "$JAVA_HOME/bin/java" ]; then
  echo "❌ JAVA_HOME is invalid: $JAVA_HOME"
  echo "   Set JAVA_HOME to a valid JDK 17+ installation."
  exit 1
fi

# Write SDK location
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

echo "☕ Java: $("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
echo "📱 Android SDK: $ANDROID_HOME"

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
