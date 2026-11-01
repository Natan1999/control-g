#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const pkg = JSON.parse(readFileSync('package.json','utf8'))
const revision = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const gradle = readFileSync('android/app/build.gradle','utf8')
const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1])
const sdk = '/Users/Apple/Library/Android/sdk/build-tools/36.0.0'
const files = process.argv.slice(2)
if (!files.length) files.push(`entregables/Control-G-${pkg.version}-release.apk`, `entregables/Control-G-${pkg.version}-release.aab`)
const reports = []
for (const file of files) {
  const bundle = file.endsWith('.aab')
  assert.ok(bundle || file.endsWith('.apk'),'Solo se aceptan APK o AAB locales')
  const entries = execFileSync('/usr/bin/unzip',['-Z1',file],{encoding:'utf8'}).trim().split('\n')
  assert.ok(!entries.some(name=>/(?:^|\/)(?:\.env(?:\.[^/]*)?|signing\.json|[^/]+\.(?:p12|jks|keystore))$/i.test(name)), 'Se detectó un archivo privado en el paquete')
  const root = bundle ? 'base/assets/' : 'assets/'
  const extract = entry => execFileSync('/usr/bin/unzip',['-p',file,entry],{encoding:'utf8',maxBuffer:16*1024*1024})
  const html = extract(`${root}public/index.html`)
  assert.doesNotMatch(html,/registerSW\.js/,'El APK no debe registrar el service worker web')
  const capacitor = JSON.parse(extract(`${root}capacitor.config.json`))
  assert.equal(capacitor.appId,'com.drandigital.controlg')
  assert.equal(capacitor.server?.url,undefined,'La aplicación debe cargar sus recursos locales')
  assert.equal(capacitor.android?.webContentsDebuggingEnabled,false)
  const js = entries.filter(name=>name.startsWith(`${root}public/assets/`) && name.endsWith('.js')).map(extract).join('\n')
  assert.ok(js.includes('openrouter') && js.includes('Google · Gemini'),'Faltan proveedores de IA en el paquete')
  assert.ok(js.includes('https://www.controlg.co'),'Falta el servidor de IA de producción')
  assert.ok(js.includes('Esta evidencia pertenece a otra cuenta'),'Falta la protección de propietario en la cola offline')
  assert.doesNotMatch(js,/\bsk-(?:or-v1-|proj-)[A-Za-z0-9_-]{30,}\b/,'Se detectó una credencial privada de IA')
  for (const token of js.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
    let claims
    try { claims = JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()) } catch { continue }
    assert.notEqual(claims.role,'service_role','Se detectó una clave privilegiada de Supabase')
  }
  const manifest = JSON.parse(extract(`${root}public/app-release.json`))
  assert.equal(manifest.sourceRevision,revision,'El paquete no corresponde a la revisión actual de Git')
  assert.equal(manifest.version,pkg.version)
  assert.equal(manifest.versionCode,versionCode)
  assert.equal(manifest.entryRoute,'/login')
  assert.deepEqual(manifest.aiProviders,['gemini','openai','openrouter'])
  let certificateSha256
  if (bundle) {
    execFileSync('/Library/Java/JavaVirtualMachines/jdk-19.jdk/Contents/Home/bin/jarsigner',['-verify',file],{stdio:'pipe'})
  } else {
    const signature = execFileSync(`${sdk}/apksigner`,['verify','--verbose','--print-certs',file],{encoding:'utf8',stdio:['ignore','pipe','pipe']})
    certificateSha256 = signature.match(/certificate SHA-256 digest:\s*([a-f0-9]+)/i)?.[1]
    assert.ok(certificateSha256,'No se pudo verificar el certificado del APK')
    execFileSync(`${sdk}/zipalign`,['-c','-P','16','4',file],{stdio:'pipe'})
    const info = execFileSync(`${sdk}/aapt`,['dump','badging',file],{encoding:'utf8'})
    assert.ok(info.includes("name='com.drandigital.controlg'"))
    assert.ok(info.includes(`versionName='${pkg.version}'`))
    assert.ok(info.includes(`versionCode='${versionCode}'`))
    assert.ok(info.includes("targetSdkVersion:'36'"))
    assert.doesNotMatch(info,/READ_MEDIA_IMAGES|READ_MEDIA_VIDEO|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE/)
    for (const hardware of ['location','microphone','wifi']) assert.ok(info.includes(`uses-feature-not-required: name='android.hardware.${hardware}'`),`${hardware} no debe impedir la instalación`)
  }
  const bytes = readFileSync(file)
  reports.push({path:resolve(file),version:pkg.version,versionCode,targetSdk:36,sourceRevision:revision,sizeBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),signatureVerified:true,certificateSha256,localAssets:true,aiProviders:['gemini','openai','openrouter'],privateCredentialsFound:false,ownerGuardPresent:true})
}
console.log(JSON.stringify({ok:true,artifacts:reports},null,2))
