#!/bin/bash
set -e

echo "🚀 Iniciando proceso de generación de APK para Control G..."

# 1. Limpiar y Construir el Proyecto Vite
echo "📦 Construyendo assets de producción..."
npm run build

# 2. Sincronizar con Capacitor
echo "🔄 Sincronizando con Capacitor (Android)..."
npx cap sync android

# 3. Configurar JAVA_HOME y Compilar APK con Gradle
export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-19.jdk/Contents/Home"
cd android
echo "🛠️ Compilando APK Debug con Gradle (JDK 19)..."
./gradlew assembleDebug

echo "✅ APK Generado exitosamente en: android/app/build/outputs/apk/debug/app-debug.apk"
