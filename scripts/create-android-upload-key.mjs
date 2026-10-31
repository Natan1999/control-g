#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'

// Run only after the owner approves this exact private destination. No existing
// key/credential is overwritten and no secret is printed or passed as an argv.
if (process.argv[2] !== '--create') throw new Error('Requiere autorización del propietario y el argumento --create.')
const root = process.cwd()
if (!existsSync(join(root, 'android/app/build.gradle'))) throw new Error('Ejecuta desde el repositorio Control G.')
const directory = resolve(root, '.android-signing')
if (existsSync(directory)) throw new Error('Ya existe .android-signing. No se reemplazó ninguna firma.')
const ignored = spawnSync('git', ['check-ignore', '--quiet', '.android-signing/signing.json'], { cwd: root })
if (ignored.status !== 0) throw new Error('La carpeta de firma debe estar excluida de Git antes de crear credenciales.')
mkdirSync(directory, { mode: 0o700 })
chmodSync(directory, 0o700)
const keyPath = join(directory, 'control-g-upload.p12')
const password = randomBytes(36).toString('base64url')
const keyAlias = 'controlg-upload'
const studioKeytool = '/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool'
const keytool = existsSync(studioKeytool) ? studioKeytool : 'keytool'
const result = spawnSync(keytool, [
  '-genkeypair', '-noprompt', '-keystore', keyPath, '-storetype', 'PKCS12',
  '-storepass:env', 'CONTROL_G_KEY_CREATION_SECRET', '-keypass:env', 'CONTROL_G_KEY_CREATION_SECRET',
  '-alias', keyAlias, '-keyalg', 'RSA', '-keysize', '4096', '-sigalg', 'SHA256withRSA',
  '-validity', '10000', '-dname', 'CN=Control G, OU=Mobile, O=DRAN Digital, C=CO',
], { env: { ...process.env, CONTROL_G_KEY_CREATION_SECRET: password }, stdio: 'pipe' })
if (result.status !== 0) throw new Error('No se pudo crear la firma. Revisa la instalación oficial de Java; no se imprimieron contraseñas.')
chmodSync(keyPath, 0o600)
writeFileSync(join(directory, 'signing.json'), JSON.stringify({
  CONTROL_G_ANDROID_KEYSTORE: keyPath, CONTROL_G_ANDROID_KEY_ALIAS: keyAlias,
  CONTROL_G_ANDROID_STORE_PASSWORD: password, CONTROL_G_ANDROID_KEY_PASSWORD: password,
}, null, 2), { mode: 0o600, flag: 'wx' })
console.log('Firma de subida creada en .android-signing (privada y excluida de Git).')
console.log('Respalda la carpeta en un destino seguro antes de publicar. No envíes sus archivos por chat ni al repositorio.')
