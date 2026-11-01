import test from 'node:test'
import assert from 'node:assert/strict'
import { AI_PROVIDERS, isAiProvider, AI_FORM_JSON_SCHEMA, aiRequestSchema, normalizeAiDraft } from '../shared/ai-form.mjs'
import { createAiLimiter, createFormAiHandler, generateAiForm } from '../api/forms/generate.mjs'

const question = updates => ({ type:'radio', label:'¿Qué tan satisfecho está con el servicio?', description:'Piense en el último mes.', required:true, options:['Satisfecho','Ni satisfecho ni insatisfecho','Insatisfecho'], matrixRows:[], sensitive:false, sensitiveJustification:'', subFields:[], ...updates })
const draft = () => ({ title:'Encuesta de servicios públicos', description:'Instrumento anónimo de ejemplo.', pages:[{ title:'Experiencia', fields:[question()] }], warnings:['Realizar una prueba piloto.'] })
const input = updates => ({ entityId:'alcaldia-demo', provider:'openai', mode:'create', prompt:'Crear una encuesta anónima sobre acceso a servicios públicos en Cartagena.', countryCode:'CO', language:'es', questionCount:5, privacyConfirmed:true, ...updates })
const env = { OPENAI_API_KEY:'sk-prueba-no-real', GEMINI_API_KEY:'AIza-prueba-no-real' }
const auth = (updates = {}, quota = { data:{ allowed:true } }) => async () => ({ profile:{ user_id:'user-test', entity_id:'alcaldia-demo', role:'coordinator', status:'active', ...updates }, client:{ rpc:async()=>quota, from:() => ({ select:() => ({ eq:() => ({ single:async () => ({ data:{ id:'alcaldia-demo', status:'active' } }) }) }) }) } })
async function call(handler, { body = input(), method='POST', headers={} } = {}) {
  const response = { headers:{} }
  response.setHeader = (name,value) => { response.headers[name.toLowerCase()] = value }
  response.end = body => { response.body = body ? JSON.parse(body) : null }
  await handler({ method, headers:{ origin:'https://www.controlg.co', 'content-type':'application/json', ...headers }, body }, response)
  return response
}

test('el esquema de solicitudes valida finalidad, país, proveedor, tamaño, consentimiento y modo de revisión', () => {
  assert.equal(aiRequestSchema.safeParse(input()).success, true)
  for (const updates of [{ privacyConfirmed:false }, { countryCode:'US' }, { provider:'otro' }, { questionCount:100 }, { prompt:'corto' }, { prompt:'x'.repeat(8001) }, { mode:'revise' }, { entityId:'../../admin' }, { answers:{ private:true } }]) assert.equal(aiRequestSchema.safeParse(input(updates)).success, false)
})
test('el esquema para el proveedor exige todos los campos y no admite propiedades extra ni código', () => {
  assert.equal(AI_FORM_JSON_SCHEMA.additionalProperties, false)
  assert.deepEqual(AI_FORM_JSON_SCHEMA.required, ['title','description','pages','warnings'])
  const fields = AI_FORM_JSON_SCHEMA.properties.pages.items.properties.fields.items
  assert.equal(fields.additionalProperties, false)
  assert.equal(fields.properties.type.enum.includes('calculation'), false)
  assert.equal(fields.properties.subFields.items.properties.type.enum.includes('repeat_group'), false)
})
test('la normalización crea IDs propios y solo conserva propiedades de instrumento permitidas', () => {
  let sequence = 0
  const normalized = normalizeAiDraft(draft(), { id:() => String(++sequence) })
  assert.equal(normalized.pages[0].fields[0].id.startsWith('ai_'), true)
  assert.equal(normalized.pages[0].fields[0].options[0].value, 'option_1')
  assert.equal(normalized.warnings.length, 2)
  const malformed = draft(); malformed.pages[0].fields[0].answers = { private:true }
  assert.throws(() => normalizeAiDraft(malformed))
})
test('los campos sensibles son voluntarios y los medios conservan límites offline seguros', () => {
  const raw = draft(); raw.pages[0].fields = [question({ type:'phone', label:'Teléfono de contacto', options:[] }), question({ type:'audio', options:[] }), question({ type:'file', options:[] })]
  const fields = normalizeAiDraft(raw, { countryCode:'MX', id:() => String(Math.random()) }).pages[0].fields
  assert.equal(fields[0].sensitive, true); assert.equal(fields[0].required, false)
  assert.equal(fields[0].validationCountryCode, 'MX'); assert.equal(fields[1].maxDurationSeconds, 120)
  assert.equal(fields[2].acceptedFileTypes, 'application/pdf')
})
test('opciones incompletas, duplicadas, matrices sin filas y grupos vacíos se rechazan', () => {
  for (const updates of [{ options:['Una'] }, { options:['Sí','sí'] }, { type:'matrix', matrixRows:[] }, { type:'repeat_group', options:[] }, { subFields:[question({ subFields:undefined })] }]) {
    const raw = draft(); raw.pages[0].fields[0] = question(updates)
    assert.throws(() => normalizeAiDraft(raw))
  }
})
test('la IA conserva evidencia en campos independientes y rechaza medios dentro de grupos repetibles', () => {
  const fields = AI_FORM_JSON_SCHEMA.properties.pages.items.properties.fields.items
  const leaf = type => {
    const value = question({ type, options:[] })
    delete value.subFields
    return value
  }
  for (const type of ['photo', 'audio', 'signature', 'file']) {
    assert.ok(fields.properties.type.enum.includes(type))
    assert.ok(!fields.properties.subFields.items.properties.type.enum.includes(type))
    const raw = draft()
    raw.pages[0].fields = [question({ type:'repeat_group', options:[], subFields:[leaf(type)] })]
    assert.throws(() => normalizeAiDraft(raw), error => error.issues?.some(issue => issue.code === 'invalid_enum_value' && issue.path.includes('subFields')))
  }
  const raw = draft()
  raw.pages[0].fields = [question({ type:'repeat_group', options:[], subFields:[leaf('text')] })]
  assert.ok(normalizeAiDraft(raw).warnings.some(warning => /fuera de los grupos repetibles/.test(warning)))
})
test('el proveedor OpenAI recibe JSON Schema, store:false, clave en header y ningún secreto en la respuesta', async () => {
  let observed
  const result = await generateAiForm(input(), { env, fetchImpl:async (url,options) => { observed={ url,options,body:JSON.parse(options.body) }; return new Response(JSON.stringify({ status:'completed', output:[{ type:'message', content:[{ type:'output_text', text:JSON.stringify(draft()) }] }] })) } })
  assert.equal(observed.url, 'https://api.openai.com/v1/responses')
  assert.equal(observed.body.store, false); assert.equal(observed.body.text.format.strict, true)
  assert.equal(observed.options.headers.Authorization, `Bearer ${env.OPENAI_API_KEY}`)
  assert.equal(observed.body.max_output_tokens, 10000)
  assert.equal(JSON.stringify(result).includes(env.OPENAI_API_KEY), false)
})
test('Gemini usa clave de servidor en header y valida la salida JSON antes de devolver el borrador', async () => {
  let observed
  const result = await generateAiForm(input({ provider:'gemini' }), { env, fetchImpl:async (url,options) => { observed={url,options,body:JSON.parse(options.body)}; return new Response(JSON.stringify({ candidates:[{ finishReason:'STOP', content:{ parts:[{ text:JSON.stringify(draft()) }] } }] })) } })
  assert.equal(observed.url.includes('key='), false)
  assert.equal(observed.options.headers['x-goog-api-key'], env.GEMINI_API_KEY)
  assert.equal(observed.body.generationConfig.responseMimeType, 'application/json')
  assert.equal(result.provider, 'gemini')
})
test('OpenRouter es un proveedor adicional para crear, importar y revisar sin cambiar el orden de Gemini', () => {
  assert.deepEqual(AI_PROVIDERS, ['gemini', 'openai', 'openrouter'])
  assert.equal(Object.isFrozen(AI_PROVIDERS), true)
  assert.equal(isAiProvider('openrouter'), true)
  for (const value of ['__proto__', 'constructor', 'https://otro.example', null, {}]) assert.equal(isAiProvider(value), false)
  for (const mode of ['create', 'import', 'revise']) assert.equal(aiRequestSchema.safeParse(input({ provider:'openrouter', mode, ...(mode === 'revise' ? { currentDraft:JSON.stringify(draft()) } : {}) })).success, true)
  for (const extra of [{ model:'openrouter/auto' }, { apiKey:'clave-no-real' }, { baseURL:'https://otro.example' }]) assert.equal(aiRequestSchema.safeParse(input({ provider:'openrouter', ...extra })).success, false)
})
test('OpenRouter usa solo su propia clave, endpoint fijo, JSON Schema y enrutamiento restringido', async () => {
  const allEnv = { ...env, OPENROUTER_API_KEY:'sk-or-prueba-no-real' }
  let observed, calls = 0
  const result = await generateAiForm(input({ provider:'openrouter' }), { env:allEnv, fetchImpl:async (url,options) => {
    calls++; observed={url,options,body:JSON.parse(options.body)}
    return new Response(JSON.stringify({ choices:[{ finish_reason:'stop', message:{ role:'assistant', content:JSON.stringify(draft()) } }] }))
  } })
  assert.equal(calls, 1)
  assert.equal(observed.url, 'https://openrouter.ai/api/v1/chat/completions')
  assert.equal(observed.options.redirect, 'error')
  assert.equal(observed.options.headers.Authorization, `Bearer ${allEnv.OPENROUTER_API_KEY}`)
  assert.equal(observed.options.headers['x-goog-api-key'], undefined)
  assert.equal(observed.options.headers['HTTP-Referer'], 'https://www.controlg.co')
  assert.equal(observed.options.headers['X-OpenRouter-Title'], 'Control G')
  assert.equal(observed.body.model, 'openai/gpt-4.1-mini')
  assert.equal(observed.body.stream, false)
  assert.equal(observed.body.max_tokens, 10000)
  assert.equal(observed.body.messages[0].role, 'system')
  assert.equal(observed.body.messages[1].role, 'user')
  assert.match(observed.body.messages[1].content, /SOLICITUD DEL USUARIO/)
  assert.equal(observed.body.response_format.type, 'json_schema')
  assert.equal(observed.body.response_format.json_schema.strict, true)
  assert.deepEqual(observed.body.response_format.json_schema.schema, AI_FORM_JSON_SCHEMA)
  assert.deepEqual(observed.body.provider, { require_parameters:true, data_collection:'deny', allow_fallbacks:false })
  assert.equal(result.provider, 'openrouter')
  assert.equal(result.model, 'openai/gpt-4.1-mini')
  assert.match(result.draft.pages[0].fields[0].id, /^ai_/)
  for (const key of Object.values(allEnv)) assert.equal(JSON.stringify(result).includes(key), false)
})
test('el modelo de OpenRouter solo se configura en el servidor y no puede alterar el endpoint', async () => {
  for (const model of ['openai/gpt-4.1-mini', 'google/gemini-2.5-flash-lite', 'vendor/model:free']) {
    const result = await generateAiForm(input({ provider:'openrouter' }), { env:{ OPENROUTER_API_KEY:'synthetic', OPENROUTER_FORM_MODEL:model }, fetchImpl:async (url,options) => {
      assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions')
      assert.equal(JSON.parse(options.body).model, model)
      return new Response(JSON.stringify({ choices:[{ finish_reason:'stop', message:{ content:JSON.stringify(draft()) } }] }))
    } })
    assert.equal(result.model, model)
  }
  for (const model of ['https://otro.example/model', 'model', '../model/extra', 'vendor/model?key=bad', 'vendor/model\n', `vendor/${'x'.repeat(160)}`]) {
    await assert.rejects(generateAiForm(input({ provider:'openrouter' }), { env:{ OPENROUTER_API_KEY:'synthetic', OPENROUTER_FORM_MODEL:model }, fetchImpl:()=>assert.fail() }), error=>error.code === 'SERVER_NOT_CONFIGURED')
  }
})
test('OpenRouter rechaza truncamiento, bloqueos, herramientas, respuestas vacías y JSON fuera del esquema', async () => {
  const complete = { finish_reason:'stop', message:{ content:JSON.stringify(draft()) } }
  for (const choice of [
    { ...complete, finish_reason:'length' }, { ...complete, finish_reason:'content_filter' },
    { ...complete, message:{ ...complete.message, refusal:'No disponible' } },
    { ...complete, message:{ ...complete.message, tool_calls:[{ type:'function' }] } },
    { ...complete, message:{ content:'' } }, { ...complete, message:{ content:'{}' } },
    { ...complete, message:{ content:'```json\n{}\n```' } }, { ...complete, message:{ content:[] } },
  ]) await assert.rejects(generateAiForm(input({ provider:'openrouter' }), { env:{ OPENROUTER_API_KEY:'synthetic' }, fetchImpl:async()=>new Response(JSON.stringify({ choices:[choice] })) }), error=>error.code === 'AI_OUTPUT_INVALID')
})
test('los errores y la falta de saldo de OpenRouter no filtran claves ni prueban Gemini automáticamente', async () => {
  const allEnv = { ...env, OPENROUTER_API_KEY:'sk-or-prueba-no-real' }
  for (const [status,code] of [[402,'AI_QUOTA'],[429,'AI_QUOTA'],[401,'AI_UNAVAILABLE'],[503,'AI_UNAVAILABLE']]) {
    for (const httpStatus of [status, 200]) {
      let calls = 0
      await assert.rejects(generateAiForm(input({ provider:'openrouter' }), { env:allEnv, fetchImpl:async url=> {
        calls++; assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions')
        return new Response(JSON.stringify({ error:{ code:status, message:`Error ${allEnv.OPENROUTER_API_KEY}` } }), { status:httpStatus })
      } }), error=>error.code === code && error.status === (code === 'AI_QUOTA' ? 429 : 502) && !JSON.stringify(error).includes(allEnv.OPENROUTER_API_KEY))
      assert.equal(calls, 1)
    }
  }
  await assert.rejects(generateAiForm(input({ provider:'openrouter' }), { env, fetchImpl:()=>assert.fail() }), error=>error.code === 'PROVIDER_NOT_CONFIGURED')
  await assert.rejects(generateAiForm(input({ provider:'constructor' }), { env:allEnv, fetchImpl:()=>assert.fail() }), error=>error.code === 'INPUT_INVALID')
})
test('con OpenRouter configurado, Gemini conserva endpoint, modelo, clave y contrato anteriores', async () => {
  let observed
  const result = await generateAiForm(input({ provider:'gemini' }), { env:{ ...env, OPENROUTER_API_KEY:'synthetic-openrouter', OPENROUTER_FORM_MODEL:'vendor/custom', GEMINI_FORM_MODEL:'gemini-test' }, fetchImpl:async (url,options)=> {
    observed={url,options,body:JSON.parse(options.body)}
    return new Response(JSON.stringify({ candidates:[{ finishReason:'STOP', content:{ parts:[{ thought:true, text:'No devolver razonamiento' }, { text:JSON.stringify(draft()) }] } }] }))
  } })
  assert.equal(observed.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent')
  assert.deepEqual(observed.options.headers, { 'Content-Type':'application/json', 'x-goog-api-key':env.GEMINI_API_KEY })
  assert.equal(observed.body.generationConfig.maxOutputTokens, 10000)
  assert.deepEqual(observed.body.generationConfig.responseJsonSchema, AI_FORM_JSON_SCHEMA)
  assert.equal(observed.body.response_format, undefined)
  assert.equal(result.provider, 'gemini')
  assert.equal(result.model, 'gemini-test')
})
test('errores del proveedor, cuota, salidas truncadas y formatos inválidos nunca se presentan como encuestas válidas', async () => {
  for (const [response,expected] of [[new Response('detalle secreto',{status:429}),'AI_QUOTA'],[new Response('detalle secreto',{status:401}),'AI_UNAVAILABLE'],[new Response(JSON.stringify({ status:'incomplete', output:[] })),'AI_OUTPUT_INVALID'],[new Response('no-json'),'AI_OUTPUT_INVALID']]) {
    await assert.rejects(generateAiForm(input(), {env,fetchImpl:async()=>response}), error=>error.code===expected && !error.message.includes('secreto'))
  }
  await assert.rejects(generateAiForm(input(),{env:{},fetchImpl:()=>assert.fail()}),error=>error.code==='PROVIDER_NOT_CONFIGURED')
})
test('orígenes extraños y peticiones anónimas no pueden gastar cuota de IA', async () => {
  let generated = 0
  const handler = createFormAiHandler({ env, generate:async()=>{ generated++; return {} } })
  assert.equal((await call(handler,{headers:{origin:'https://otro.example'}})).statusCode,403)
  assert.equal((await call(handler)).statusCode,401)
  assert.equal(generated,0)
})
test('el usuario de campo y la entidad de otra organización no pueden generar formularios', async () => {
  const handler = createFormAiHandler({env,authenticateRequest:auth(),generate:()=>assert.fail()})
  assert.equal((await call(handler,{body:input({entityId:'otra-entidad'})})).statusCode,403)
  const invalid = createFormAiHandler({env,authenticateRequest:async()=>{throw Object.assign(Error(),{code:'FORBIDDEN',status:403})},generate:()=>assert.fail()})
  assert.equal((await call(invalid)).statusCode,403)
})
test('la autenticación real del SDK consulta al usuario y su perfil antes de permitir IA', async () => {
  const originalFetch = globalThis.fetch
  let profile = { user_id:'19c3da88-785b-4989-b76a-a194061e8657', entity_id:'alcaldia-demo', role:'professional', status:'active' }
  const paths = []
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname
    paths.push(path)
    assert.match(new Headers(options.headers).get('authorization'), /^Bearer synthetic-token$/)
    if (path === '/auth/v1/user') return new Response(JSON.stringify({ id:profile.user_id }), { headers:{'content-type':'application/json'} })
    if (path === '/rest/v1/user_profiles') return new Response(JSON.stringify(profile), { headers:{'content-type':'application/json'} })
    assert.fail(`Unexpected request ${path}`)
  }
  try {
    const handler = createFormAiHandler({env:{ ...env, SUPABASE_URL:'https://supabase.invalid', SUPABASE_ANON_KEY:'synthetic-anon' }, generate:()=>assert.fail()})
    assert.equal((await call(handler,{method:'GET',headers:{authorization:'Bearer synthetic-token'}})).statusCode,403)
    profile = { ...profile, role:'coordinator' }
    assert.equal((await call(handler,{method:'GET',headers:{authorization:'Bearer synthetic-token'}})).statusCode,200)
    profile = { ...profile, status:'inactive' }
    assert.equal((await call(handler,{method:'GET',headers:{authorization:'Bearer synthetic-token'}})).statusCode,403)
    assert.ok(paths.includes('/auth/v1/user')); assert.ok(paths.includes('/rest/v1/user_profiles'))
  } finally { globalThis.fetch = originalFetch }
})
test('la ruta devuelve proveedores configurados sin claves y genera solo para una entidad activa', async () => {
  const handler = createFormAiHandler({env,authenticateRequest:auth(),generate:async()=>({draft:normalizeAiDraft(draft()),provider:'openai',model:'modelo-test'})})
  const status = await call(handler,{method:'GET'})
  assert.deepEqual(status.body.providers,['gemini','openai'])
  assert.equal(JSON.stringify(status.body).includes('prueba-no-real'),false)
  const generated = await call(handler)
  assert.equal(generated.statusCode,200); assert.equal(generated.body.ok,true)
  assert.equal(generated.headers['cache-control'],'no-store'); assert.match(generated.headers['x-robots-tag'],/noindex/)
})
test('la ruta anuncia OpenRouter sin secretos y exige su clave, permisos y cuota compartida antes de generar', async () => {
  const allEnv = { ...env, OPENROUTER_API_KEY:'sk-or-prueba-no-real' }
  let generated = 0, reserved = 0, released = 0
  const handler = createFormAiHandler({ env:allEnv, authenticateRequest:auth(), reserve:()=>{ reserved++; return ()=>{ released++ } }, generate:async(request,{env:passedEnv})=> {
    generated++; assert.equal(request.provider, 'openrouter'); assert.equal(passedEnv, allEnv)
    return { draft:normalizeAiDraft(draft()), provider:'openrouter', model:'vendor/model' }
  } })
  const status = await call(handler, { method:'GET' })
  assert.deepEqual(status.body.providers, ['gemini','openai','openrouter'])
  assert.equal(JSON.stringify(status.body).includes('prueba-no-real'), false)
  const created = await call(handler, { body:input({ provider:'openrouter' }) })
  assert.equal(created.statusCode, 200); assert.equal(created.body.provider, 'openrouter')
  assert.equal(generated, 1); assert.equal(reserved, 1); assert.equal(released, 1)
  assert.equal((await call(handler, { body:input({ provider:'openrouter', entityId:'otra-entidad' }) })).statusCode, 403)
  assert.equal(generated, 1)
  const missing = createFormAiHandler({ env, authenticateRequest:auth(), generate:()=>assert.fail(), reserve:()=>assert.fail() })
  assert.equal((await call(missing, { body:input({ provider:'openrouter' }) })).statusCode, 503)
  for (const quota of [{ error:{message:'AI_RATE_LIMITED'} }, { data:{allowed:false} }]) {
    const blocked = createFormAiHandler({ env:allEnv, authenticateRequest:auth({},quota), generate:()=>assert.fail() })
    assert.ok([429,503].includes((await call(blocked, { body:input({ provider:'openrouter' }) })).statusCode))
  }
  const isolated = createFormAiHandler({ env:allEnv, authenticateRequest:auth(), generate:async()=>{ throw Object.assign(Error('secret-detail'),{code:'AI_QUOTA',status:429,upstreamMessage:allEnv.OPENROUTER_API_KEY}) } })
  const failed = await call(isolated, { body:input({provider:'openrouter'}) })
  assert.equal(failed.statusCode, 429); assert.equal(failed.body.code, 'AI_QUOTA')
  assert.equal(JSON.stringify(failed.body).includes(allEnv.OPENROUTER_API_KEY), false)
  assert.equal(failed.headers['retry-after'], '60')
})
test('el endpoint valida JSON, tamaño y confirmación antes de llamar al proveedor', async () => {
  const handler = createFormAiHandler({env,authenticateRequest:auth(),generate:()=>assert.fail()})
  assert.equal((await call(handler,{body:'{' })).statusCode,400)
  assert.equal((await call(handler,{body:'x'.repeat(60001)})).statusCode,413)
  assert.equal((await call(handler,{body:input({privacyConfirmed:false})})).statusCode,400)
  assert.equal((await call(handler,{headers:{'content-type':'text/plain'}})).statusCode,415)
  assert.equal((await call(handler,{method:'PUT'})).statusCode,405)
})
test('el presupuesto compartido es obligatorio y un fallo de RPC nunca permite gastar en el proveedor', async () => {
  for (const [quota,status] of [[{error:{message:'AI_RATE_LIMITED'}},429],[{error:{message:'AI_ENTITY_FORBIDDEN'}},403],[{error:{message:'function missing'}},503],[{data:{allowed:false}},503]]) {
    const handler=createFormAiHandler({env,authenticateRequest:auth({},quota),generate:()=>assert.fail()})
    assert.equal((await call(handler)).statusCode,status)
  }
})
test('el limitador acota ráfagas, concurrencia y consumo por instancia y libera sin duplicar', () => {
  let now=0; const reserve=createAiLimiter({now:()=>now})
  const release=reserve('usuario')
  assert.throws(()=>reserve('usuario'),error=>error.code==='AI_BUSY')
  release(); release()
  reserve('usuario')(); reserve('usuario')()
  assert.throws(()=>reserve('usuario'),error=>error.code==='RATE_LIMITED')
  now=60001; reserve('usuario')()
})
test('la aplicación conserva el flujo editorial y el asistente no guarda ni publica por sí solo', async () => {
  const { readFile } = await import('node:fs/promises')
  const component=await readFile('src/components/forms/AiFormAssistant.tsx','utf8')
  const client=await readFile('src/lib/form-ai.ts','utf8')
  assert.doesNotMatch(component,/\.from\(|saveDraft\(|transition\(/)
  assert.match(component,/mode="simulation"/)
  assert.match(component,/privacyConfirmed: true/)
  assert.doesNotMatch(client,/import\.meta\.env\.(?:OPENAI|GEMINI|OPENROUTER)_API_KEY/)
  assert.match(component,/useState<AiProvider>\('gemini'\)/)
  assert.match(component,/openrouter: 'OpenRouter'/)
  assert.match(component,/No cambiaremos a Gemini ni a otro modelo autom[áa]ticamente/)
})
