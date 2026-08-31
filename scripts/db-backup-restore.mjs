#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const RESTORE_CONFIRMATION = 'RESTORE_ONLY_TO_DISPOSABLE_DATABASE'

function usage() {
  console.log(`Uso:
  npm run db:backup -- --output backups/control-g-AAAA-MM-DD.dump [--schema-only]
  npm run db:backup:verify -- --file backups/control-g-AAAA-MM-DD.dump
  npm run db:restore:drill -- --file backups/control-g-AAAA-MM-DD.dump --confirm ${RESTORE_CONFIRMATION}

Variables:
  DATABASE_URL          origen para backup
  RESTORE_DATABASE_URL  destino desechable para el ensayo de restauración`)
}

function parseArgs(values) {
  if (values[0] === '--help' || values[0] === '-h') return { command: '', schemaOnly: false, help: true }
  const parsed = { command: values[0] || '', schemaOnly: false }
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--schema-only') parsed.schemaOnly = true
    else if (value === '--output') parsed.output = values[++index]
    else if (value === '--file') parsed.file = values[++index]
    else if (value === '--confirm') parsed.confirm = values[++index]
    else if (value === '--help' || value === '-h') parsed.help = true
    else throw new Error(`Argumento no reconocido: ${value}`)
  }
  return parsed
}

function connection(variable) {
  const raw = process.env[variable]
  if (!raw) throw new Error(`Falta ${variable}.`)
  const url = new URL(raw)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error(`${variable} debe ser una URL PostgreSQL.`)
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!url.hostname || !url.username || !database) throw new Error(`${variable} no contiene host, usuario y base de datos.`)
  return {
    host: url.hostname,
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    sslmode: url.searchParams.get('sslmode') || 'require',
  }
}

function connectionArgs(value) {
  return ['--host', value.host, '--port', value.port, '--username', value.user, '--dbname', value.database, '--no-password']
}

function run(tool, args, value, capture = false) {
  const result = spawnSync(tool, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, PGPASSWORD: value?.password || '', PGSSLMODE: value?.sslmode || 'require' },
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${tool} terminó con código ${result.status}.`)
  return result.stdout || ''
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

async function backup(args) {
  if (!args.output) throw new Error('Indica --output con una ruta nueva.')
  const output = resolve(args.output)
  let outputExists = true
  try {
    await access(output)
  } catch (error) {
    if (error.code === 'ENOENT') outputExists = false
    else throw error
  }
  if (outputExists) throw new Error('El archivo de salida ya existe; usa una ruta nueva para no sobrescribir respaldos.')
  await mkdir(dirname(output), { recursive: true })
  const source = connection('DATABASE_URL')
  const dumpArgs = [
    ...connectionArgs(source),
    '--format=custom', '--compress=9', '--no-owner', '--no-privileges', '--file', output,
  ]
  if (args.schemaOnly) dumpArgs.push('--schema-only')
  run('pg_dump', dumpArgs, source)
  const info = await stat(output)
  const manifest = {
    format: 'pg_dump-custom',
    createdAt: new Date().toISOString(),
    schemaOnly: args.schemaOnly,
    source: { host: source.host, port: source.port, database: source.database },
    sizeBytes: info.size,
    sha256: await sha256(output),
  }
  await writeFile(`${output}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  console.log(`Respaldo creado y verificado estructuralmente: ${output}`)
  await verify({ file: output })
}

async function verify(args) {
  if (!args.file) throw new Error('Indica --file con el respaldo que se verificará.')
  const file = resolve(args.file)
  const listing = run('pg_restore', ['--list', file], null, true)
  if (!listing.includes('; Archive created at')) throw new Error('El archivo no tiene un catálogo pg_restore válido.')
  let manifestStatus = 'sin manifiesto'
  try {
    const manifest = JSON.parse(await readFile(`${file}.manifest.json`, 'utf8'))
    if (manifest.sha256 !== await sha256(file)) throw new Error('La huella SHA-256 no coincide con el manifiesto.')
    manifestStatus = 'SHA-256 válido'
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  console.log(`Respaldo legible por pg_restore (${manifestStatus}).`)
}

async function restoreDrill(args) {
  if (!args.file) throw new Error('Indica --file con el respaldo.')
  if (args.confirm !== RESTORE_CONFIRMATION) throw new Error(`Confirmación inválida. Usa --confirm ${RESTORE_CONFIRMATION}.`)
  const source = connection('DATABASE_URL')
  const target = connection('RESTORE_DATABASE_URL')
  if (`${source.host}:${source.port}/${source.database}` === `${target.host}:${target.port}/${target.database}`) {
    throw new Error('El destino coincide con el origen; restauración rechazada.')
  }
  if (!/^(control_g_restore_|restore_|scratch_)/i.test(target.database)) {
    throw new Error('La base destino debe comenzar por control_g_restore_, restore_ o scratch_.')
  }
  await verify(args)
  run('pg_restore', [
    ...connectionArgs(target), '--clean', '--if-exists', '--exit-on-error', '--no-owner', '--no-privileges', resolve(args.file),
  ], target)
  const validation = run('psql', [
    ...connectionArgs(target), '--no-psqlrc', '--tuples-only', '--no-align', '--command',
    "select json_build_object('public_tables', count(*), 'rls_tables', count(*) filter (where c.relrowsecurity), 'postgis', exists(select 1 from pg_extension where extname = 'postgis')) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r';",
  ], target, true).trim()
  console.log(`Ensayo de restauración aprobado en base desechable: ${validation}`)
}

const args = parseArgs(process.argv.slice(2))
if (args.help || !args.command) {
  usage()
  process.exit(args.help ? 0 : 1)
}

try {
  if (args.command === 'backup') await backup(args)
  else if (args.command === 'verify') await verify(args)
  else if (args.command === 'restore-drill') await restoreDrill(args)
  else throw new Error(`Comando no reconocido: ${args.command}`)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
