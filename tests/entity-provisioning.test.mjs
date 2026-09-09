import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { loadDemoFixture } from '../scripts/lib/demo-fixture.mjs'

test('la demo es una entidad con cuentas distintas, asignaciones y respuestas completas',async()=>{
  const {accounts,bundle,entity}=await loadDemoFixture('test')
  assert.equal(accounts.length,5)
  assert.equal(new Set(accounts.map(a=>a.password)).size,5)
  assert.ok(accounts.every(a=>a.password.length>=12))
  assert.equal(entity.is_demo,true)
  assert.equal(bundle.records.length,240)
  assert.equal(bundle.territories.length,6)
  for(const record of bundle.records){
    const form=bundle.forms.find(form=>form.id===record.formId)
    assert.ok(form.professional_keys.includes(record.professionalId))
    for(const field of form.pages.flatMap(page=>page.fields).filter(field=>field.required)) {
      assert.notEqual(record.answers[field.id],undefined)
      if(field.options) assert.ok(field.options.some(option=>(typeof option==='string'?option:option.value)===record.answers[field.id]))
    }
  }
})

test('no existe entrada pública al demo ni contraseñas en el resultado persistido',async()=>{
  const app=await readFile('src/App.tsx','utf8')
  assert.match(app, /path="\/demo" element=\{<Navigate to="\/login" replace/)
  assert.ok(!app.includes('MunicipalDemoPage'))
  const config=JSON.parse(await readFile('vercel.json','utf8'))
  assert.ok(config.redirects.some(r=>r.source==='/demo'&&r.destination==='/login'))
  const sql=await readFile('supabase/migrations/202609090001_entity_provisioning.sql','utf8')
  assert.match(sql,/security definer/)
  assert.match(sql,/pg_advisory_xact_lock/)
  assert.match(sql,/auth.uid\(\)/)
  assert.match(sql,/revoke all on function/)
  const gis=await readFile('src/lib/gis-service.ts','utf8')
  assert.match(gis,/!entityResult\?\.regional_settings\?\.is_demo/)
})
