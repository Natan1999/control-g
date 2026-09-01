import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function importTypeScriptModule(path) {
  const source = await readFile(path, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}

const policy = await importTypeScriptModule('src/lib/password-policy.ts')

test('la política de contraseña institucional exige longitud y complejidad', () => {
  assert.match(policy.validateSecurePassword('Corta1!'), /12/)
  assert.match(policy.validateSecurePassword('SINMINUSCULA1!'), /minúscula/)
  assert.match(policy.validateSecurePassword('sinmayuscula1!'), /mayúscula/)
  assert.match(policy.validateSecurePassword('SinNumeros!!xx'), /número/)
  assert.match(policy.validateSecurePassword('SinSimbolo1234'), /símbolo/)
  assert.equal(policy.validateSecurePassword('ControlG-2026!'), null)
})

test('el login y las rutas públicas ofrecen recuperación completa por Supabase', async () => {
  const [app, login, recovery, auth, admin, coordinator, professional, vercel] = await Promise.all([
    readFile('src/App.tsx', 'utf8'),
    readFile('src/pages/auth/LoginPage.tsx', 'utf8'),
    readFile('src/pages/auth/PasswordRecoveryPage.tsx', 'utf8'),
    readFile('src/lib/auth.ts', 'utf8'),
    readFile('src/pages/admin/SettingsPage.tsx', 'utf8'),
    readFile('src/pages/coordinator/SettingsPage.tsx', 'utf8'),
    readFile('src/pages/professional/ProfilePage.tsx', 'utf8'),
    readFile('vercel.json', 'utf8'),
  ])

  assert.match(app, /path="\/recuperar-contrasena"/)
  assert.match(app, /path="\/restablecer-contrasena"/)
  assert.match(login, /¿Olvidaste tu contraseña\?/)
  assert.match(recovery, /sendPasswordRecovery/)
  assert.match(recovery, /completePasswordRecovery/)
  assert.match(recovery, /PASSWORD_RECOVERY/)
  assert.match(auth, /signInWithPassword\(\{[\s\S]*password: currentPassword/)
  assert.match(auth, /resetPasswordForEmail/)
  assert.match(admin, /validateSecurePassword/)
  assert.match(coordinator, /validateSecurePassword/)
  assert.match(professional, /await updatePassword/)
  assert.doesNotMatch(professional, /disponible próximamente/)
  assert.match(vercel, /"source": "\/recuperar-contrasena"[\s\S]*?"X-Robots-Tag"[\s\S]*?"noindex/)
  assert.match(vercel, /"source": "\/restablecer-contrasena"[\s\S]*?"Cache-Control"[\s\S]*?"no-store/)
})

test('la recuperación operativa del superadministrador no imprime ni persiste la clave temporal', async () => {
  const [script, pkg] = await Promise.all([
    readFile('scripts/reset-superadmin-password.mjs', 'utf8'),
    readFile('package.json', 'utf8'),
  ])
  assert.match(pkg, /"admin:recover": "node scripts\/reset-superadmin-password\.mjs"/)
  assert.match(script, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(script, /profile\.role !== 'admin'/)
  assert.match(script, /profile\.entity_id !== null/)
  assert.match(script, /auth\.admin\.updateUserById/)
  assert.match(script, /spawnSync\('pbcopy'/)
  assert.doesNotMatch(script, /console\.log\([^\n]*temporaryPassword/)
  assert.doesNotMatch(script, /writeFile/)
})
