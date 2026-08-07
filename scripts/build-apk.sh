#!/bin/bash
set -euo pipefail

echo "Construyendo Control G 2.0..."
npm run build
npx cap sync android

if [ -z "${JAVA_HOME:-}" ] || [ ! -x "${JAVA_HOME}/bin/java" ]; then
  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    control_g_java_home="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home)"
    export JAVA_HOME="$control_g_java_home"
  fi
fi

java -version
(
  cd android
  ./gradlew testDebugUnitTest assembleDebug
)

echo "APK listo: android/app/build/outputs/apk/debug/app-debug.apk"
