# Remembra Build Guide

## Prerequisites

### For Web Build
- Node.js 18+
- npm

### For Android APK
- **Java JDK 17 or 21** (LTS versions recommended, Java 25+ not yet fully supported)
- Android Studio with SDK 34+
- Android SDK Build-Tools
- Android SDK Platform-Tools

**Important:** If you have Java 25 installed, you must use Java 17 or 21 for Android builds. See the troubleshooting section below.

---

## Web Production Build

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build for production:**
   ```bash
   npm run build
   ```

3. **Output:** The production build is in the `dist/` folder.

4. **Deploy:** Upload `dist/` to any static hosting (Vercel, Netlify, etc.)

---

## Android APK Build

### Step 1: Build the Web App
```bash
npm run build
```

### Step 2: Sync to Android
```bash
npx cap sync android
```

### Step 3: Open in Android Studio
```bash
npx cap open android
```

### Step 4: Build APK in Android Studio
1. Wait for Gradle sync to complete
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 5: Build Release APK (Signed)
1. Go to **Build > Generate Signed Bundle / APK**
2. Choose **APK**
3. Create or select a keystore
4. Build Release APK

---

## Quick Commands

```bash
# Build web and sync to Android
npm run build && npx cap sync android

# Open Android Studio
npx cap open android

# Run on connected Android device
npx cap run android

# Build APK directly with Gradle (requires Java 17 or 21)
cd android
./gradlew assembleDebug        # Debug APK
./gradlew assembleRelease      # Release APK (requires signing)
./gradlew clean                # Clean build cache

# One-command build (uses helper script)
./build-apk.sh
```

### Build APK with Gradle Wrapper (Command Line)

If you prefer to build from command line without Android Studio:

1. **Ensure Java 17 or 21 is active:**
   ```bash
   # Check current Java version
   java -version
   
   # If using Java 25, switch to Java 21
   export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.9-ms
   export PATH=$JAVA_HOME/bin:$PATH
   ```

2. **Build web app and sync:**
   ```bash
   npm run build
   npx cap sync android
   ```

3. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

4. **APK location:**
   - Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `android/app/build/outputs/apk/release/app-release.apk`

**OR use the automated script:**
```bash
./build-apk.sh
```

---

## Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GROQ_API_KEY=your-groq-key
```

---

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL from `supabase/schema.sql` in the SQL Editor
3. Enable Email Auth in Authentication settings
4. Copy credentials to `.env`

---

## Troubleshooting

### "Unsupported class file major version 69" error
This means Gradle is trying to use Java 25, which isn't fully supported yet. **Solution:**

```bash
# Switch to Java 21
export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.9-ms
export PATH=$JAVA_HOME/bin:$PATH

# Verify
java -version  # Should show 21.x.x

# Then rebuild
cd android
./gradlew clean assembleDebug
```

To make this permanent, add the export commands to your `~/.bashrc` or `~/.zshrc`.

### Data not saving to Supabase
- Make sure you're **signed in** (not in Demo Mode)
- Check browser console for errors
- Verify `.env` credentials are correct

### Android build fails
- Ensure Java JDK 17 or 21 is installed and active
- Run `npx cap doctor` to diagnose issues
- Update Android Studio and SDK
- Try `./gradlew clean` then rebuild

### App not updating after changes
1. Run `npm run build`
2. Run `npx cap sync android`
3. Rebuild in Android Studio
