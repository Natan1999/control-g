import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import legal from '../api/legal.mjs'
import { getLegalDocument, renderLegalDocument, DELETION_MAILTO } from '../shared/legal-documents.mjs'
import { validatePublicLinks } from '../scripts/seo-check.mjs'

test('privacidad y eliminación se sirven sin cuenta, scripts, seguimiento ni envíos automáticos', () => {
  for (const document of ['privacidad', 'eliminar-cuenta']) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, end(body) { this.body = body } }
    legal({ method: 'GET', query: { document } }, res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body, renderLegalDocument(document))
    assert.match(res.headers['X-Robots-Tag'], /noindex/)
    assert.match(res.body, /DRAN DIGITAL S\.A\.S\./)
    assert.match(res.body, /ceo@dran\.digital/)
    assert.match(res.body, /sin iniciar sesión|No necesitas iniciar sesión/)
    assert.doesNotMatch(res.body, /<script|<form|<iframe|google-analytics|googletagmanager|sk-or-|SERVICE_ROLE_KEY|tu-service-role-key/)
    legal({ method: 'HEAD', query: { document } }, res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body, '')
    legal({ method: 'POST', query: { document } }, res)
    assert.equal(res.statusCode, 405)
    assert.equal(res.headers.Allow, 'GET, HEAD')
  }
  assert.match(DELETION_MAILTO, /^mailto:ceo@dran\.digital\?subject=/)
  assert.doesNotMatch(DELETION_MAILTO, /body=|password|token|email=/)
})

test('el endpoint solo acepta dos documentos fijos y no refleja entradas', () => {
  for (const document of [undefined, '../.env', '<script>alert(1)</script>', ['privacidad'], 'PRIVACIDAD']) {
    assert.equal(getLegalDocument(document), null)
    const res = { setHeader() {}, end(body) { this.body = body } }
    legal({ method: 'GET', query: { document } }, res)
    assert.equal(res.statusCode, 404)
    assert.equal(res.body, 'Documento no encontrado')
  }
})

test('la política distingue audiencia 13+, datos de menores y eliminación manual sin inventar cifrado o plazos', () => {
  const html = renderLegalDocument('privacidad')
  assert.match(html, /No está dirigido a menores de 13 años/)
  assert.match(html, /usuarios de 13 a 17 años/)
  assert.match(html, /no autoriza por sí sola a recolectar información sobre ellos/)
  assert.match(html, /generador no envía automáticamente las respuestas de campo/)
  assert.match(html, /No se afirma invulnerabilidad/)
  assert.match(html, /no borr[a-z ]+por control remoto/)
  assert.match(html, /no elimina datos automáticamente/)
  assert.doesNotMatch(html, /100% seguro|certificad[oa] por|eliminamos todo en 30 días/)
})

test('ambas páginas están empaquetadas y accesibles antes del login o una restauración de sesión', () => {
  const app = readFileSync('src/App.tsx', 'utf8')
  const page = readFileSync('src/pages/legal/LegalPage.tsx', 'utf8')
  const links = readFileSync('src/components/legal/LegalLinks.tsx', 'utf8')
  assert.match(app, /!ready && !publicMarketingRoute && !publicLegalRoute/)
  for (const slug of ['privacidad', 'eliminar-cuenta']) {
    assert.ok(app.includes(`path="/${slug}"`))
    assert.ok(links.includes(`to="/${slug}"`))
  }
  assert.match(page, /shared\/legal-documents\.mjs/)
  assert.match(page, /window\.scrollTo\(0, 0\)/)
  assert.doesNotMatch(page, /fetch\(|localStorage|signOut|deleteDocument|clear\(/)
  for (const path of ['src/pages/auth/LoginPage.tsx', 'src/pages/professional/ProfilePage.tsx']) assert.match(readFileSync(path, 'utf8'), /<LegalLinks \/>/)
  const route = JSON.parse(readFileSync('vercel.json', 'utf8')).routes.find(item => item.dest === '/api/legal?document=$1')
  assert.ok(route)
})

test('los recursos legales publicados se admiten en el pie sin agregarlos al sitemap ni permitir enlaces inexistentes', () => {
  const paths = new Set(['/'])
  assert.deepEqual(validatePublicLinks({ links: ['/privacidad', '/eliminar-cuenta'] }, '/', paths), [])
  assert.equal(validatePublicLinks({ links: ['/politica-inexistente'] }, '/', paths)[0]?.code, 'LINK_NOT_PUBLISHED')
  assert.deepEqual([...paths], ['/'])
})
