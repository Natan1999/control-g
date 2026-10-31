#!/bin/bash
set -euo pipefail

CONTROL_G_VERSION="$(node -p "require('./package.json').version")"
control_g_build_mode="${1:-debug}"
if [ "$control_g_build_mode" != debug ] && [ "$control_g_build_mode" != release ]; then
  echo 'Modo válido: debug o release.' >&2
  exit 1
fi
if [ "$control_g_build_mode" = release ]; then
  for control_g_signing_var in CONTROL_G_ANDROID_KEYSTORE CONTROL_G_ANDROID_KEY_ALIAS CONTROL_G_ANDROID_STORE_PASSWORD CONTROL_G_ANDROID_KEY_PASSWORD; do
    if [ -z "${!control_g_signing_var:-}" ]; then
      echo "Falta ${control_g_signing_var}; no se genera una aplicación sin firma de publicación." >&2
      exit 1
    fi
  done
  if [ ! -f "$CONTROL_G_ANDROID_KEYSTORE" ]; then
    echo 'No existe el archivo de firma configurado.' >&2
    exit 1
  fi
fi
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
  if [ "$control_g_build_mode" = release ]; then
    ./gradlew testReleaseUnitTest assembleRelease bundleRelease
  else
    ./gradlew testDebugUnitTest assembleDebug
  fi
)

if [ "$control_g_build_mode" = release ]; then
  mkdir -p entregables
  cp android/app/build/outputs/apk/release/app-release.apk "entregables/Control-G-${CONTROL_G_VERSION}-release.apk"
  cp android/app/build/outputs/bundle/release/app-release.aab "entregables/Control-G-${CONTROL_G_VERSION}-release.aab"
  echo "APK y AAB de publicación firmados en entregables/ (versión ${CONTROL_G_VERSION})."
  exit 0
fi

control_g_apk_source="android/app/build/outputs/apk/debug/app-debug.apk"
control_g_apk_delivery="entregables/Control-G-${CONTROL_G_VERSION}-LATAM-GIS-offline-debug.apk"
mkdir -p entregables
cp "$control_g_apk_source" "$control_g_apk_delivery"

echo "APK listo: ${control_g_apk_source}"
echo "Copia entregable: ${control_g_apk_delivery}"
