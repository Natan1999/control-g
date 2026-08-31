#!/bin/bash
set -euo pipefail

CONTROL_G_VERSION="$(node -p "require('./package.json').version")"
echo "Construyendo Control G ${CONTROL_G_VERSION}..."
VITE_NATIVE_BUILD=true npm run build
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

control_g_apk_source="android/app/build/outputs/apk/debug/app-debug.apk"
control_g_apk_delivery="entregables/Control-G-${CONTROL_G_VERSION}-LATAM-GIS-offline-debug.apk"
mkdir -p entregables
cp "$control_g_apk_source" "$control_g_apk_delivery"

echo "APK listo: ${control_g_apk_source}"
echo "Copia entregable: ${control_g_apk_delivery}"
