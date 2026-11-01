#!/usr/bin/env node
import { constants, copyFileSync, chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const original = join(root, '.android-signing')
const backupParent = join(root, 'backups', 'android-signing')
for (const path of [original, backupParent]) {
  try { execFileSync('git', ['check-ignore', '--quiet', path], { cwd:root, stdio:'pipe' }) }
  catch { throw new Error('La firma y su respaldo deben estar excluidos de Git. No se copió material privado.') }
}
const configPath = join(original, 'signing.json')
const config = JSON.parse(readFileSync(configPath, 'utf8'))
const keystore = realpathSync(config.CONTROL_G_ANDROID_KEYSTORE)
if (dirname(keystore) !== realpathSync(original)) throw new Error('La firma no está dentro de la carpeta privada esperada.')
for (const file of [configPath, keystore]) if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) throw new Error('Solo se respaldan los archivos privados esperados.')
mkdirSync(backupParent, { recursive:true, mode:0o700 })
chmodSync(backupParent, 0o700)
const date = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())
const destination = mkdtempSync(join(backupParent, `control-g-${date}-`))
chmodSync(destination, 0o700)
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex')
const files = [configPath, keystore].map(source => {
  const target = join(destination, basename(source))
  const before = digest(source)
  copyFileSync(source, target, constants.COPYFILE_EXCL)
  chmodSync(target, 0o600)
  if (digest(target) !== before || digest(source) !== before) throw new Error('El respaldo no superó la comprobación de integridad.')
  return { name:basename(source), sha256:before }
})
const keytool = [process.env.JAVA_HOME && join(process.env.JAVA_HOME,'bin','keytool'), '/Library/Java/JavaVirtualMachines/jdk-19.jdk/Contents/Home/bin/keytool', '/usr/bin/keytool'].find(path => path && existsSync(path))
if (!keytool) throw new Error('No se encontró keytool para comprobar la copia de la firma.')
const validation = spawnSync(keytool, ['-list', '-keystore', join(destination,basename(keystore)), '-storepass:env', 'CONTROL_G_BACKUP_PASSWORD', '-alias', config.CONTROL_G_ANDROID_KEY_ALIAS], {
  env:{ ...process.env, CONTROL_G_BACKUP_PASSWORD:config.CONTROL_G_ANDROID_STORE_PASSWORD }, stdio:'pipe', encoding:'utf8', timeout:30_000,
})
if (validation.status !== 0) throw new Error('La copia no superó la verificación de apertura de la firma. No se declara un respaldo válido.')
writeFileSync(join(destination,'manifest.json'), JSON.stringify({ applicationId:'com.drandigital.controlg', createdAt:new Date().toISOString(), localOnly:true, originalFolder:original, files, keystoreValidated:true }, null, 2)+'\n', { mode:0o600, flag:'wx' })
writeFileSync(join(destination,'RESTORE.txt'), 'Respaldo privado local de la firma de Control G.\nNo compartir ni subir a Git. Restaurar los dos archivos en la carpeta .android-signing original con permisos 0700/0600. signing.json conserva la ruta absoluta original; si cambia el equipo o la ubicación, debe actualizarse esa ruta de forma privada. Guardar otra copia segura fuera de este equipo: este respaldo no protege frente a pérdida del disco.\n', { mode:0o600, flag:'wx' })
console.log(JSON.stringify({ backedUp:true, location:destination, files:files.length, checksumVerified:true, keystoreValidated:true, permissions:'0700/0600', localOnly:true }))
