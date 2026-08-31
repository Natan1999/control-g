#!/usr/bin/env node
import { readFile, realpath } from 'node:fs/promises'
import { resolve, relative, sep } from 'node:path'

const [migrationPath] = process.argv.slice(2)
const dashboardUrl = process.env.SUPABASE_DASHBOARD_URL || process.env.SUPABASE_URL
const username = process.env.DASHBOARD_USERNAME
const password = process.env.DASHBOARD_PASSWORD
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!migrationPath || !dashboardUrl || !username || !password || !serviceRole) {
  console.error('Uso: define SUPABASE_DASHBOARD_URL, DASHBOARD_USERNAME, DASHBOARD_PASSWORD y SUPABASE_SERVICE_ROLE_KEY; luego indica un archivo de supabase/migrations/.')
  process.exit(1)
}

const migrationsRoot = await realpath(resolve('supabase/migrations'))
const requested = await realpath(resolve(migrationPath))
const scopedPath = relative(migrationsRoot, requested)
if (!scopedPath || scopedPath.startsWith(`..${sep}`) || scopedPath === '..' || !requested.endsWith('.sql')) {
  throw new Error('Solo se permiten archivos SQL dentro de supabase/migrations/.')
}

const sql = await readFile(requested, 'utf8')
const authorization = Buffer.from(`${username}:${password}`).toString('base64')
const response = await fetch(`${dashboardUrl.replace(/\/$/, '')}/pg/query`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${authorization}`,
    apikey: serviceRole,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: `begin;\n${sql}\ncommit;`, read_only: false }),
})
const text = await response.text()
if (!response.ok) throw new Error(`La migración falló (${response.status}): ${text}`)
console.log(`Migración aplicada: ${scopedPath}`)
if (text && text !== '[]') console.log(text)
