#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

// This adapter never sources shell code or emits the private signing values.
let configuration
try { configuration = JSON.parse(readFileSync(new URL('../.android-signing/signing.json', import.meta.url), 'utf8')) }
catch { throw new Error('Falta la configuración local privada de firma de Control G.') }
const names = ['CONTROL_G_ANDROID_KEYSTORE', 'CONTROL_G_ANDROID_KEY_ALIAS', 'CONTROL_G_ANDROID_STORE_PASSWORD', 'CONTROL_G_ANDROID_KEY_PASSWORD']
if (names.some(name => typeof configuration[name] !== 'string' || !configuration[name])) throw new Error('La configuración de firma está incompleta.')
const env = { ...process.env, ...Object.fromEntries(names.map(name => [name, configuration[name]])) }
const result = spawnSync('bash', ['scripts/build-apk.sh', 'release'], { env, stdio: 'inherit' })
process.exitCode = result.status ?? 1
