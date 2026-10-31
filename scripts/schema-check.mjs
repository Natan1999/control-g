#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractHtmlFacts, mapConcurrent } from './seo-check.mjs'
import { fetchSeoDocument } from './seo-probe.mjs'
import { validatePublicUrl } from './submit-indexnow.mjs'
import { validateStructuredData, checkSharedIdentities } from './lib/structured-data-validation.mjs'

export async function checkSchemas({ live = false, distDir = resolve('dist'), expectedRevision = process.env.SEO_EXPECTED_REVISION } = {}) {
  const get = async path => {
    if (!live) return readFile(join(distDir, path === '/' ? 'index.html' : path.endsWith('.json') ? path : `${path}/index.html`), 'utf8')
    const response = await fetchSeoDocument(`https://www.controlg.co${path}`)
    if (response.status !== 200) throw Error(`HTTP ${response.status}`)
    return response.body
  }
  const manifest = JSON.parse(await get('/seo-manifest.json'))
  if (manifest.site !== 'https://www.controlg.co' || !Array.isArray(manifest.pages) || !manifest.pages.length) throw Error('Manifiesto público inválido.')
  for (const path of manifest.pages) validatePublicUrl(`https://www.controlg.co${path}`)
  if (new Set(manifest.pages).size !== manifest.pages.length) throw Error('El manifiesto repite rutas públicas.')
  const report = { ok: false, mode: live ? 'production' : 'build', sourceRevision: manifest.sourceRevision, pages: manifest.pages.length, articles: 0, errors: [], warnings: [], googleNotes: ['La aplicación no publica precios o valoraciones: no inventar offers ni aggregateRating para eliminar avisos opcionales de Google.'] }
  if (expectedRevision && expectedRevision !== manifest.sourceRevision) report.errors.push({ path: '/seo-manifest.json', code: 'REVISION_MISMATCH', message: 'La revisión publicada no coincide con la esperada.' })
  const documents = await mapConcurrent(manifest.pages, async path => {
    try {
      const html = await get(path), facts = extractHtmlFacts(html)
      if (facts.schemas.length !== 1) throw Error('Se requiere exactamente un bloque JSON-LD público.')
      const schema = JSON.parse(facts.schemas[0])
      const visibleText = html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
      const result = validateStructuredData(schema, { path, facts, visibleText, html })
      report.errors.push(...result.errors); report.warnings.push(...result.warnings)
      if (path.startsWith('/blog/')) report.articles++
      return { path, schema }
    } catch (error) { report.errors.push({ path, code: 'SCHEMA_DOCUMENT', message: error.message }); return { path } }
  }, 6)
  report.errors.push(...checkSharedIdentities(documents))
  report.ok = report.errors.length === 0
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await checkSchemas({ live: process.argv.includes('--live') })
    console.log(JSON.stringify(report, null, 2))
    if (!report.ok) process.exitCode = 1
  } catch (error) { console.error(`No se pudo validar el marcado: ${error.message}`); process.exitCode = 1 }
}
