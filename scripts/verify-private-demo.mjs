import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
config({path:'.env.local',quiet:true})
const access = JSON.parse(await readFile('tmp/villa-esperanza-demo-access.json','utf8'))
const makeClient = () => createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
for (const account of access.accounts) {
  const client = makeClient()
  const {error} = await client.auth.signInWithPassword({email:account.email,password:account.password})
  assert.ifError(error)
  const {data:responses,error:readError} = await client.from('form_responses').select('id,entity_id,form_id,answers,latitude').limit(1000)
  assert.ifError(readError)
  assert.equal(responses.length,account.role==='professional'?80:240)
  assert.ok(responses.every(row => row.entity_id===access.result.entity_id && row.latitude !== null))
  const {data:forms,error:formError} = await client.from('forms').select('id,definition').eq('entity_id',access.result.entity_id)
  assert.ifError(formError)
  for (const form of forms) {
    const pages = JSON.parse(form.definition)
    assert.ok(Array.isArray(pages) && pages.length)
    for (const row of responses.filter(row=>row.form_id===form.id)) {
      for (const field of pages.flatMap(page=>page.fields).filter(field=>field.required)) {
        assert.ok(row.answers[field.id] !== undefined, `Missing required answer ${field.id}`)
        if (field.options) assert.ok(field.options.some(option=>(typeof option==='string'?option:option.value)===row.answers[field.id]),`Invalid option ${field.id}`)
      }
    }
  }
  const {data:layers,error:layerError} = await client.from('map_layers').select('id').eq('entity_id',access.result.entity_id)
  assert.ifError(layerError)
  assert.equal(layers.length,3)
  console.log(`${account.role}: login válido, ${responses.length} respuestas propias, ${forms.length} formularios visibles, 3 capas.`)
  await client.auth.signOut()
}
const anonymous = await makeClient().from('form_responses').select('id').eq('entity_id',access.result.entity_id)
assert.ok(anonymous.error || anonymous.data.length===0)
console.log('Acceso anónimo: sin respuestas. Todos los controles pasaron.')
