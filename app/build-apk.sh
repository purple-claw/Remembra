#!/bin/bash
# Build Android APK with correct Java version

set -e

echo "🔧 Setting Java 21..."
export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.9-ms
export PATH=$JAVA_HOME/bin:$PATH

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
