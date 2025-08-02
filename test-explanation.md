# Test Environment Setup and Validation Guide

## Overview
This document explains the complete process of setting up a test environment for the PreVue preview system, including cloning repositories, creating fresh bundles, and validating the entire workflow.

## Prerequisites
- Android device connected via ADB
- Node.js and npm installed
- React Native development environment set up
- Git access to both repositories

## Step-by-Step Process

### 1. Create Test Environment

**Command:**
```bash
cd .. && mkdir test-preview-system && cd test-preview-system
```

**Expected Output:**
```bash
# No output - directory created silently
```

**Purpose:** Creates a clean test environment to validate the entire system from scratch.

### 2. Clone AwesomeProject Repository

**Command:**
```bash
git clone https://github.com/Vetagiri-Hrushikesh/AwesomeProject.git
```

**Expected Output:**
```bash
Cloning into 'AwesomeProject'...
remote: Enumerating objects: 139, done.
remote: Counting objects: 100% (139/139), done.
remote: Compressing objects: 100% (103/103), done.
Total 139 (delta 20), reused 139 (delta 20), pack-reused 0 (from 0)
Receiving objects: 100% (139/139), 1.45 MiB | 2.75 MiB/s, done.
Resolving deltas: 100% (20/20), done.
```

**Purpose:** Downloads the latest version of AwesomeProject from GitHub.

### 3. Clone PreVue Repository

**Command:**
```bash
git clone https://github.com/Vetagiri-Hrushikesh/PreVue.git
```

**Expected Output:**
```bash
Cloning into 'PreVue'...
remote: Enumerating objects: 198, done.
remote: Counting objects: 100% (198/198), done.
remote: Compressing objects: 100% (139/139), done.
Total 198 (delta 43), reused 189 (delta 34), pack-reused 0 (from 0)
Receiving objects: 100% (198/198), 562.56 KiB | 2.96 MiB/s, done.
Resolving deltas: 100% (43/43), done.
```

**Purpose:** Downloads the latest version of PreVue from GitHub.

### 4. Verify Directory Structure

**Command:**
```bash
ls -la
```

**Expected Output:**
```bash
total 0
drwxr-xr-x@  4 hvetagir  staff  128 Aug  2 15:54 .
drwxr-xr-x   6 hvetagir  staff  192 Aug  2 15:54 ..
drwxr-xr-x@ 25 hvetagir  staff  800 Aug  2 15:54 AwesomeProject
drwxr-xr-x@ 26 hvetagir  staff  832 Aug  2 15:54 PreVue
```

**Purpose:** Confirms both repositories are cloned as siblings in the test directory.

### 5. Install AwesomeProject Dependencies

**Command:**
```bash
cd AwesomeProject && npm install
```

**Expected Output:**
```bash
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory...
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated eslint@8.57.1: This version is no longer supported...

added 895 packages, and audited 896 packages in 4s

161 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**Purpose:** Installs all required dependencies for AwesomeProject.

### 6. Create Bundle Directory

**Command:**
```bash
mkdir -p bundles/AwesomeProject
```

**Expected Output:**
```bash
# No output - directory created silently
```

**Purpose:** Creates the directory structure for the app bundle.

### 7. Generate Fresh Bundle

**Command:**
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output bundles/AwesomeProject/complete-app.bundle --assets-dest bundles/AwesomeProject/
```

**Expected Output:**
```bash
                Welcome to Metro v0.82.5
              Fast - Scalable - Integrated

Writing bundle output to: bundles/AwesomeProject/complete-app.bundle
Done writing bundle output
```

**Purpose:** Creates a production-ready bundle of the AwesomeProject app.

### 8. Verify Bundle Creation

**Command:**
```bash
ls -la bundles/AwesomeProject/
```

**Expected Output:**
```bash
total 12312
drwxr-xr-x@ 6 hvetagir  staff      192 Aug  2 15:54 .
drwxr-xr-x@ 3 hvetagir  staff       96 Aug  2 15:54 ..
-rw-r--r--@ 1 hvetagir  staff      744 Aug  2 15:54 app-manifest.json
-rw-r--r--@ 1 hvetagir  staff  1008765 Aug  2 15:55 complete-app.bundle
-rw-r--r--@ 1 hvetagir  staff  4278755 Aug  2 15:54 complete-app.map
-rw-r--r--@ 1 hvetagir  staff  1007062 Aug  2 15:54 index.android.bundle
```

**Purpose:** Confirms the bundle was created successfully with all necessary files.

**Key Files:**
- `complete-app.bundle` (1,008,765 bytes) - Main app bundle
- `app-manifest.json` - Bundle metadata
- `complete-app.map` - Source map for debugging

### 9. Check PreVue Assets Directory

**Command:**
```bash
cd ../PreVue && ls -la android/app/src/main/assets/
```

**Expected Output:**
```bash
total 0
drwxr-xr-x@ 3 hvetagir  staff   96 Aug  2 15:54 .
drwxr-xr-x@ 6 hvetagir  staff  192 Aug  2 15:54 ..
drwxr-xr-x@ 4 hvetagir  staff  128 Aug  2 15:54 awesome
```

**Purpose:** Shows the assets directory structure in PreVue.

### 10. View Existing Bundles

**Command:**
```bash
ls -la android/app/src/main/assets/awesome/
```

**Expected Output:**
```bash
total 3944
drwxr-xr-x@ 4 hvetagir  staff      128 Aug  2 15:54 .
drwxr-xr-x@ 3 hvetagir  staff       96 Aug  2 15:54 ..
-rw-r--r--@ 1 hvetagir  staff  1008765 Aug  2 15:54 complete-app.bundle
-rw-r--r--@ 1 hvetagir  staff  1007062 Aug  2 15:54 index.android.bundle
```

**Purpose:** Shows the current bundles in PreVue's assets.

### 11. Remove Old Bundle

**Command:**
```bash
rm android/app/src/main/assets/awesome/complete-app.bundle
```

**Expected Output:**
```bash
# No output - file removed silently
```

**Purpose:** Removes the old bundle to ensure we're using the fresh one.

### 12. Copy New Bundle

**Command:**
```bash
cp ../AwesomeProject/bundles/AwesomeProject/complete-app.bundle android/app/src/main/assets/awesome/
```

**Expected Output:**
```bash
# No output - file copied silently
```

**Purpose:** Copies the fresh bundle from AwesomeProject to PreVue's assets.

### 13. Verify Bundle Update

**Command:**
```bash
ls -la android/app/src/main/assets/awesome/
```

**Expected Output:**
```bash
total 3944
drwxr-xr-x@ 4 hvetagir  staff      128 Aug  2 15:55 .
drwxr-xr-x@ 3 hvetagir  staff       96 Aug  2 15:54 ..
-rw-r--r--@ 1 hvetagir  staff  1008765 Aug  2 15:55 complete-app.bundle
-rw-r--r--@ 1 hvetagir  staff  1007062 Aug  2 15:54 index.android.bundle
```

**Purpose:** Confirms the new bundle was copied successfully (note the timestamp change).

### 14. Install PreVue Dependencies

**Command:**
```bash
npm install
```

**Expected Output:**
```bash
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory...
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated react-native-vector-icons@10.3.0: react-native-vector-icons package has moved...
npm warn deprecated eslint@8.57.1: This version is no longer supported...

added 941 packages, and audited 942 packages in 5s

171 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**Purpose:** Installs all required dependencies for PreVue.

### 15. Clean Android Build

**Command:**
```bash
cd android && ./gradlew clean
```

**Expected Output:**
```bash
[Incubating] Problems report is available at: file:///path/to/build/reports/problems/problems-report.html

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

BUILD SUCCESSFUL in 4s
19 actionable tasks: 12 executed, 7 up-to-date
```

**Purpose:** Cleans the previous build to ensure a fresh compilation.

### 16. Build PreVue APK

**Command:**
```bash
./gradlew assembleDebug
```

**Expected Output:**
```bash
> Task :react-native-device-info:processDebugManifest
> Task :react-native-safe-area-context:processDebugManifest
> Task :react-native-vector-icons:processDebugManifest
> Task :app:compileDebugKotlin
w: file:///path/to/EmbeddedAppBridgeModule.kt:22:28 'val currentActivity: Activity?' is deprecated...

[Incubating] Problems report is available at: file:///path/to/build/reports/problems/problems-report.html

BUILD SUCCESSFUL in 12s
239 actionable tasks: 229 executed, 10 up-to-date
```

**Purpose:** Compiles PreVue with the new bundle and native bridge modules.

**Key Points:**
- Build should complete successfully
- Warnings about deprecated APIs are normal
- 239 tasks executed indicates full compilation

### 17. Install APK on Device

**Command:**
```bash
adb -s FM7TOVTSXKYPN7SC install -r app/build/outputs/apk/debug/app-debug.apk
```

**Expected Output:**
```bash
Performing Streamed Install
Success
```

**Purpose:** Installs the updated PreVue app on the connected Android device.

**Note:** Replace `FM7TOVTSXKYPN7SC` with your device's serial number.

### 18. Start PreVue App

**Command:**
```bash
adb -s FM7TOVTSXKYPN7SC shell am start -n com.prevue/.MainActivity
```

**Expected Output:**
```bash
Starting: Intent { cmp=com.prevue/.MainActivity }
```

**Purpose:** Launches the PreVue app on the device.

## Final Verification

### 19. Verify Directory Structure

**Command:**
```bash
cd .. && pwd && ls -la
```

**Expected Output:**
```bash
/Users/hvetagir/maigha/APPPREVIEW/AppDislayedThroughAppTSX/test-preview-system
total 0
drwxr-xr-x@  4 hvetagir  staff  128 Aug  2 15:54 .
drwxr-xr-x   6 hvetagir  staff  192 Aug  2 15:54 ..
drwxr-xr-x@ 26 hvetagir  staff  832 Aug  2 15:55 AwesomeProject
drwxr-xr-x@ 27 hvetagir  staff  864 Aug  2 15:56 PreVue
```

**Purpose:** Confirms the final test environment structure.

## Expected Test Results

### ✅ Successful Test Outcomes:

1. **PreVue App Launches** - App opens without crashes
2. **Navigation Works** - Can navigate between screens
3. **AwesomeProject Preview** - Can access AwesomeProject preview
4. **Touch Interactions** - All buttons and UI elements respond to touch
5. **Scrolling Works** - Content scrolls smoothly
6. **Camera Access** - "Test Camera Access" button opens camera
7. **Gallery Access** - "Test Gallery Access" button opens gallery picker
8. **No Error Messages** - No "event target to be a number" errors

### 🔍 What to Test on Device:

1. **Open PreVue** → Should launch successfully
2. **Navigate to "AwesomeProject"** → Should load the embedded app
3. **Test Scrolling** → Should scroll smoothly through content
4. **Test Touch** → Should respond to all button presses
5. **Test Camera** → Should open device camera
6. **Test Gallery** → Should open gallery picker
7. **Test Navigation** → Should navigate between different sections

## Troubleshooting

### Common Issues and Solutions:

1. **Build Fails**
   - Ensure all dependencies are installed
   - Check Android SDK and build tools
   - Verify Gradle version compatibility

2. **APK Installation Fails**
   - Check device connection: `adb devices`
   - Ensure device has enough storage
   - Try uninstalling previous version first

3. **App Crashes on Launch**
   - Check logcat: `adb logcat | grep -i prevue`
   - Verify bundle file exists and is valid
   - Check native module compilation

4. **Camera/Gallery Not Working**
   - Ensure app has permissions
   - Check bridge module compilation
   - Verify intent handling

## Summary

This test process validates the complete workflow from fresh repository clones to a fully functional preview system. It ensures that:

- ✅ Bundle creation works correctly
- ✅ Bundle integration is seamless
- ✅ Native bridge functionality is operational
- ✅ Touch and scroll interactions work
- ✅ Camera and gallery access function properly
- ✅ The entire system is production-ready

The test environment provides a clean slate to verify that the PreVue system can be deployed and used by anyone following the same process. 