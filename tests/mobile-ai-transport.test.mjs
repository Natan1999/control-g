import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import { isAiProvider } from '../shared/ai-providers.mjs'

test('el transporte del APK mantiene Gemini y OpenRouter en servidor, sin IA offline ni claves en el dispositivo', async () => {
  const source = await readFile('src/lib/form-ai.ts', 'utf8')
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const previousFetch = globalThis.fetch
  const state = { online:false, authCalls:0, networkCalls:0 }
  Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{ get onLine() { return state.online } } })
  globalThis.__mobileAiTransport = {
    isAiProvider, Capacitor:{ isNativePlatform:()=>true },
    supabase:{ auth:{ getSession:async()=>{ state.authCalls++; return { data:{ session:{ access_token:'synthetic-session' } } } } } },
  }
  const js = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.ES2022, target:ts.ScriptTarget.ES2022 } }).outputText
    .replace(/import \{ Capacitor \} from ['"]@capacitor\/core['"];?/, 'const { Capacitor } = globalThis.__mobileAiTransport;')
    .replace(/import \{ supabase \} from ['"]@\/lib\/supabase['"];?/, 'const { supabase } = globalThis.__mobileAiTransport;')
    .replace(/import \{ isAiProvider \} from ['"]\.\.\/\.\.\/shared\/ai-providers\.mjs['"];?/, 'const { isAiProvider } = globalThis.__mobileAiTransport;')
    .replaceAll('import.meta.env.VITE_CONTROL_G_API_URL', "''")
  const request = provider => ({ entityId:'synthetic-tenant', provider, mode:'create', prompt:'Crear cinco preguntas sintéticas sin datos personales.', countryCode:'CO', language:'es', questionCount:5, privacyConfirmed:true })
  globalThis.fetch = async (url,options) => {
    state.networkCalls++
    assert.equal(url, 'https://www.controlg.co/api/forms/generate')
    assert.equal(options.headers.Authorization, 'Bearer synthetic-session')
    assert.doesNotMatch(JSON.stringify(options), /sk-or-|AIza|OPENROUTER_API_KEY|GEMINI_API_KEY/)
    if (options.method === 'GET') return new Response(JSON.stringify({ ok:true, providers:['gemini','openai','openrouter','unknown'] }))
    const body = JSON.parse(options.body)
    assert.equal(body.privacyConfirmed, true)
    assert.ok(['gemini','openrouter'].includes(body.provider))
    return new Response(JSON.stringify({ ok:true, provider:body.provider, model:'synthetic-model', draft:{ title:'Cuestionario sintético', pages:[{ id:'page', title:'Preguntas', fields:[] }] } }))
  }
  try {
    const client = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
    await assert.rejects(client.loadAiProviders(), /necesita internet/)
    for (const provider of ['gemini','openrouter']) await assert.rejects(client.generateFormDraft(request(provider)), /formularios ya descargados/)
    assert.equal(state.authCalls, 0); assert.equal(state.networkCalls, 0)
    state.online = true
    assert.deepEqual(await client.loadAiProviders(), ['gemini','openai','openrouter'])
    for (const provider of ['gemini','openrouter']) assert.equal((await client.generateFormDraft(request(provider))).provider, provider)
    assert.equal(state.networkCalls, 3)
    state.online = false
    await assert.rejects(client.generateFormDraft(request('openrouter')), /necesita internet/)
    assert.equal(state.networkCalls, 3, 'Al perder conexión no hay reintentos ni peticiones al proveedor')
  } finally {
    globalThis.fetch = previousFetch
    if (previousNavigator) Object.defineProperty(globalThis,'navigator',previousNavigator)
    else delete globalThis.navigator
    delete globalThis.__mobileAiTransport
  }
})

test('el paquete nativo arranca en login, contiene los proveedores y no depende de una URL remota ni del service worker web', async () => {
  const config = await readFile('capacitor.config.ts','utf8')
  const entry = await readFile('src/main.tsx','utf8')
  const activity = await readFile('android/app/src/main/java/com/drandigital/controlg/MainActivity.java','utf8')
  const vite = await readFile('vite.config.ts','utf8')
  const backup = await readFile('scripts/backup-android-signing.mjs','utf8')
  const manifest = await readFile('android/app/src/main/AndroidManifest.xml','utf8')
  const build = await readFile('scripts/build-apk.sh','utf8')
  const stamp = await readFile('scripts/stamp-android-build.mjs','utf8')
  assert.match(config, /appId: 'com\.drandigital\.controlg'/)
  assert.match(config, /webDir: 'dist'/)
  assert.doesNotMatch(config, /server:\s*\{[^}]*\burl:/)
  assert.match(entry, /Capacitor\.isNativePlatform\(\)/)
  assert.match(entry, /replaceState\(null, '', '\/login'\)/)
  assert.match(activity, /LOGIN_PATH = "\/login"/)
  assert.match(vite, /injectRegister: isNativeBuild \? null : 'auto'/)
  assert.match(backup, /COPYFILE_EXCL/)
  assert.match(backup, /0o700/)
  assert.match(backup, /0o600/)
  assert.match(backup, /-storepass:env/)
  assert.doesNotMatch(backup, /console\.log\(config/)
  assert.ok(build.indexOf('node scripts/stamp-android-build.mjs') < build.indexOf('npx cap sync android'))
  assert.match(stamp, /dist\/app-release\.json/)
  assert.match(stamp, /--untracked-files=no/)
  for (const hardware of ['location', 'location.gps', 'location.network', 'microphone', 'wifi']) {
    assert.ok(manifest.includes(`android:name="android.hardware.${hardware}" android:required="false"`), `${hardware} no debe impedir instalar la captura sin georreferenciación`)
  }
})
