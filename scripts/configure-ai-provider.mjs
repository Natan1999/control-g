#!/usr/bin/env node
// Send a provider credential to the explicitly scoped Vercel project through
// stdin. Never put plaintext in command arguments, output, Git or client config.
import { readFile, lstat, unlink } from 'node:fs/promises'
import { createPrivateKey, privateDecrypt, constants } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { parse } from 'dotenv'
import { generateAiForm } from '../api/forms/generate.mjs'

const args = process.argv.slice(2)
const provider = args[0]
const value = name => args[args.indexOf(name) + 1]
if (!['openai', 'gemini'].includes(provider)) throw Error('Proveedor no admitido.')
const envName = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'
let key
let privatePath
if (provider === 'openai') {
  const path = resolve('.env.local')
  if (!(await lstat(path)).isFile() || (await lstat(path)).isSymbolicLink()) throw Error('Archivo de entorno no válido.')
  key = parse(await readFile(path)).OPENAI_API_KEY
} else {
  privatePath = resolve(value('--private-key') || '')
  const temp = resolve(tmpdir())
  if (!privatePath.startsWith(`${temp}/codex-openai-platform-`) || basename(privatePath) !== 'recipient-private-key.jwk.json' || (await lstat(privatePath)).isSymbolicLink()) throw Error('Ruta temporal no válida.')
  const privateJwk = JSON.parse(await readFile(privatePath, 'utf8'))
  key = privateDecrypt({ key: createPrivateKey({ key: privateJwk, format: 'jwk' }), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(value('--encrypted-key') || '', 'base64url')).toString('utf8')
}
key = key?.trim()
// Google can issue opaque auth-key formats in addition to legacy API keys.
if (!(provider === 'openai' ? /^sk-[A-Za-z0-9_-]+$/ : /^[A-Za-z0-9._-]{20,512}$/).test(key || '')) throw Error('No se recibió una credencial válida. No se modificó Vercel.')
if (args.includes('--verify') || args.includes('--verify-only')) {
  try {
    const result = await generateAiForm({ provider, mode: 'create', prompt: 'Prepara tres preguntas anónimas sobre satisfacción con servicios públicos en un barrio de Cartagena, Colombia. No solicites datos personales.', countryCode: 'CO', language: 'es', questionCount: 3 }, { env: { [envName]: key } })
    console.log(JSON.stringify({ verification: true, provider, model: result.model, sections: result.draft.pages.length, fields: result.draft.pages.reduce((total, page) => total + page.fields.length, 0) }))
  } catch (error) { console.log(JSON.stringify({ verification: false, provider, code: error.code || 'AI_UNAVAILABLE', upstreamStatus: error.upstreamStatus, upstreamCode: error.upstreamCode, diagnostic: error.upstreamMessage })) }
}
if (args.includes('--verify-only')) { if (privatePath) await unlink(privatePath); process.exit(0) }
const result = spawnSync('npx', ['--yes', 'vercel', 'env', 'add', envName, 'production', '--type', 'secret', '--project', 'control-g', '--scope', 'team_dtF3j195YsqT2naxGH2jbNWS', '--yes', '--non-interactive'], { input: key, encoding: 'utf8', timeout: 120_000, maxBuffer: 1024 * 1024 })
const safe = `${result.stdout || ''}${result.stderr || ''}`.replaceAll(key, '[REDACTED]').replace(/sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
if (result.status !== 0) { console.error(safe || 'No fue posible guardar la variable en Vercel.'); process.exitCode = 1 }
else {
  console.log(JSON.stringify({ configured: true, provider, envName, project: 'control-g', environment: 'production', type: 'secret' }))
  if (privatePath) await unlink(privatePath)
}
