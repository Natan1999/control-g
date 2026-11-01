#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { AI_PROVIDERS } from '../shared/ai-providers.mjs'

// Native builds deliberately omit the web SEO manifest. Keep a separate public,
// credential-free provenance record inside the APK/AAB instead.
const pkg = JSON.parse(readFileSync('package.json','utf8'))
const gradle = readFileSync('android/app/build.gradle','utf8')
const sourceRevision = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const dirty = execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim()
if (dirty) throw new Error('Registra los cambios del código antes de generar un paquete Android verificable.')
if (!/^[a-f0-9]{40}$/.test(sourceRevision)) throw new Error('No se pudo determinar la revisión Android.')
writeFileSync('dist/app-release.json', JSON.stringify({
  applicationId:'com.drandigital.controlg', version:pkg.version,
  versionCode:Number(gradle.match(/versionCode\s+(\d+)/)?.[1]), sourceRevision,
  aiProviders:AI_PROVIDERS, entryRoute:'/login', bundledAssets:true,
}, null, 2)+'\n')
console.log(`Paquete Android trazable: ${pkg.version} · ${sourceRevision.slice(0,8)}`)
