#!/bin/bash

# Deep Link Testing Script for PreVue
# Usage: ./test-deep-link.sh <appId> <appName> [bundleUrl]

APP_ID=${1:-"693054e3c7db7e0a80f39ac2"}
APP_NAME=${2:-"TestApp"}
BUNDLE_URL=${3:-""}

echo "🧪 Testing Deep Link for PreVue"
echo "================================"
echo "App ID: $APP_ID"
echo "App Name: $APP_NAME"
echo "Bundle URL: $BUNDLE_URL"
echo ""

# Build deep link
if [ -z "$BUNDLE_URL" ]; then
  # Test auto-build (no bundleUrl)
  DEEP_LINK="prevue://app/preview?appId=$APP_ID&appName=$(echo $APP_NAME | sed 's/ /%20/g')"
  echo "📱 Test Type: Auto-build (no bundleUrl)"
else
  # Test with existing bundle
  ENCODED_URL=$(echo $BUNDLE_URL | sed 's/:/%3A/g' | sed 's/\//%2F/g')
  DEEP_LINK="prevue://app/preview?appId=$APP_ID&appName=$(echo $APP_NAME | sed 's/ /%20/g')&bundleUrl=$ENCODED_URL"
  echo "📱 Test Type: With bundleUrl (skip build)"
fi

echo "🔗 Deep Link: $DEEP_LINK"
echo ""

# Check if device is connected
if command -v adb &> /dev/null; then
  DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device" | wc -l)
  
  if [ $DEVICE_COUNT -eq 0 ]; then
    echo "⚠️  No Android device/emulator connected"
    echo "📋 Copy this link and test manually:"
    echo "$DEEP_LINK"
    exit 1
  fi
  
  echo "✅ Android device detected"
  echo "🚀 Opening deep link..."
  adb shell am start -a android.intent.action.VIEW -d "$DEEP_LINK"
  
  echo ""
  echo "📊 Monitoring logs (Ctrl+C to stop)..."
  echo "Looking for: PreviewScreen, apps-context, DEVPORTAL-FemuxerAPI"
  echo ""
  adb logcat -c  # Clear log
  adb logcat | grep -E "PreviewScreen|apps-context|DEVPORTAL-FemuxerAPI|MyAppsTabScreen"
else
  echo "⚠️  ADB not found. Install Android SDK Platform Tools"
  echo "📋 Copy this link and test manually:"
  echo "$DEEP_LINK"
fi





