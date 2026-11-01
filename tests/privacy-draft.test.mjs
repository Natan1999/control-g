import test from 'node:test'
import assert from 'node:assert/strict'
import privacyDraft, { privacyDraftHtml } from '../api/privacy-draft.mjs'

test('el enlace de revisión de privacidad es público, no indexable y no se presenta como una política aprobada',()=>{
  const response = {headers:{},setHeader(name,value){this.headers[name]=value},end(value){this.body=value}}
  privacyDraft({method:'GET'},response)
  assert.equal(response.statusCode,200)
  assert.match(response.headers['Content-Type'],/^text\/html/)
  assert.match(response.headers['X-Robots-Tag'],/noindex/)
  assert.match(response.body,/Borrador para revisión del titular/)
  assert.match(response.body,/todavía no es la política definitiva/)
  assert.match(response.body,/ceo@dran.digital/)
  assert.doesNotMatch(response.body,/<script|google-analytics|sk-or-|SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(privacyDraftHtml,/no envía automáticamente las respuestas de campo/)
  for (const method of ['POST','PUT','DELETE']) {
    privacyDraft({method},response)
    assert.equal(response.statusCode,405)
    assert.equal(response.headers.Allow,'GET, HEAD')
  }
  privacyDraft({method:'HEAD'},response)
  assert.equal(response.statusCode,200)
  assert.equal(response.body,'')
})
