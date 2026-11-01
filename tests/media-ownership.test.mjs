import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

test('una tablet compartida nunca sube los bytes de otra cuenta al almacenamiento de la sesión activa', async () => {
  let uploads = 0, uid = 'current-user', entityId = 'current-entity'
  globalThis.__ownershipSupabase = {
    auth: { getUser: async () => ({ data: { user: uid ? { id: uid } : null } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { entity_id: entityId } }) }) }) }),
    storage: { from: () => ({ upload: async path => { uploads++; return { data: { path } } } }) },
  }
  const code = ts.transpileModule(await readFile('src/lib/backend.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/import \{ supabase \} from ['"]\.\/supabase['"];?/, 'const supabase = globalThis.__ownershipSupabase')
  const { storage } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  const file = new Blob(['private evidence'], { type: 'image/jpeg' })
  try {
    for (const owner of [{ entityId, professionalId:'previous-user' }, { entityId:'previous-entity', professionalId:uid }]) {
      await assert.rejects(storage.createFile('field-photos','photo',file,owner), error => error.code === 403)
      assert.equal(uploads, 0, 'El bloqueo ocurre ANTES de transmitir el archivo')
    }
    const result = await storage.createFile('field-photos','photo',file,{entityId,professionalId:uid})
    assert.equal(uploads, 1)
    assert.ok(result.path.startsWith('current-entity/current-user/'))
    entityId = null
    await assert.rejects(storage.createFile('field-photos','photo',file,{entityId:'current-entity',professionalId:uid}), error => error.code === 403)
    assert.equal(uploads, 1)
    uid = null
    await assert.rejects(storage.createFile('field-photos','photo',file,{entityId:'current-entity',professionalId:'current-user'}), error => error.code === 401)
    assert.equal(uploads, 1)
  } finally { delete globalThis.__ownershipSupabase }
})
