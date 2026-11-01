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
  const demoRoute = config.routes.find(route => route.src && new RegExp(route.src).test('/demo') && route.status === 307)
  assert.equal(demoRoute?.headers.Location, '/login')
  const sql=await readFile('supabase/migrations/202609090001_entity_provisioning.sql','utf8')
  assert.match(sql,/security definer/)
  assert.match(sql,/pg_advisory_xact_lock/)
  assert.match(sql,/auth.uid\(\)/)
  assert.match(sql,/revoke all on function/)
  const gis=await readFile('src/lib/gis-service.ts','utf8')
  assert.match(gis,/!entityResult\?\.regional_settings\?\.is_demo/)
  const vite=await readFile('vite.config.ts','utf8')
  assert.ok(!vite.includes("cacheName: 'control-g-supabase-read-cache'"))
  assert.match(vite,/sw-privacy-cleanup\.js/)
  const cleanup=await readFile('public/sw-privacy-cleanup.js','utf8')
  assert.match(cleanup,/caches.delete\('control-g-supabase-read-cache'\)/)
  assert.ok(!cleanup.includes('deleteDatabase'))
})

test('la revisión de Play tiene solo dos cuentas, un instrumento asignado y un control sin asignar',async()=>{
  const {builder}=await loadDemoFixture('play-review')
  const accounts=builder.generateReviewAccounts('isolated')
  assert.deepEqual(accounts.map(account=>account.role),['coordinator','professional'])
  assert.equal(new Set(accounts.map(account=>account.email)).size,2)
  assert.equal(new Set(accounts.map(account=>account.password)).size,2)
  assert.ok(accounts.every(account=>account.password.length>=20 && account.email.includes('play-isolated')))
  const professional=accounts.find(account=>account.role==='professional')
  const bundle=builder.buildReviewProvisionBundle(professional.key)
  assert.equal(bundle.forms.length,2)
  assert.equal(bundle.records.length,24)
  assert.equal(bundle.forms.filter(form=>form.professional_keys.includes(professional.key)).length,1)
  assert.equal(bundle.forms.filter(form=>form.professional_keys.length===0).length,1)
  for(const record of bundle.records){
    const form=bundle.forms.find(form=>form.id===record.formId)
    assert.equal(record.professionalId,professional.key)
    assert.ok(form.professional_keys.includes(professional.key))
    assert.ok(bundle.territories.some(territory=>territory.name===record.territory))
    for(const field of form.pages.flatMap(page=>page.fields).filter(field=>field.required)) {
      assert.notEqual(record.answers[field.id],undefined)
      if(field.options) assert.ok(field.options.some(option=>option.value===record.answers[field.id]))
    }
  }
  const fields=bundle.forms[0].pages.flatMap(page=>page.fields)
  for(const type of ['gps','photo','signature','audio','file']) assert.ok(fields.some(field=>field.type===type && !field.required))
  assert.ok(fields.some(field=>field.type==='longtext'))
  assert.throws(()=>builder.buildReviewProvisionBundle(''),/Falta el profesional/)
})
