import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { build, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchPublicBlog, mergePublicPosts } from './lib/public-blog.mjs'
import { cleanMarketingShell, renderMarketingDocument, buildSitemap, buildRss, buildLlms, publicPagePaths } from './lib/marketing-html.mjs'

if (process.env.VITE_NATIVE_BUILD === 'true') {
  console.log('SEO estático omitido en la compilación nativa de Capacitor.')
  process.exit(0)
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root,'dist')
// The public React components serve people, prerender and the live editorial CMS.
await build({
  configFile:false, root, plugins:[react()], publicDir:false,
  // Ship the renderer's dependencies with it. File tracing an explicitly
  // included generated module does not reliably include nested package exports.
  ssr:{noExternal:true},
  resolve:{alias:{'@':join(root,'src')}},
  build:{ssr:join(root,'src/entry-marketing.tsx'),outDir:join(root,'.server'),emptyOutDir:true,minify:false,rollupOptions:{output:{entryFileNames:'marketing.mjs'}}},
})
const renderer = await import(`${join(root,'.server/marketing.mjs')}?build=${Date.now()}`)
const env = {...loadEnv('production',root,''),...process.env}
let remote = {posts:[],available:false}
try { remote = await fetchPublicBlog({env}) } catch { console.warn('Se conservó la base editorial local; el CMS público no respondió durante esta compilación.') }
const posts = mergePublicPosts(renderer.BLOG_POSTS,remote.posts)
const pages = renderer.SEO_PAGES
const shell = cleanMarketingShell(await readFile(join(dist,'index.html'),'utf8'))
await writeFile(join(dist,'marketing-shell.html'),shell)
await writeFile(join(dist,'seo-blog-snapshot.json'),JSON.stringify(remote.posts))

// data-seo-static is the actual public UI, never a crawler-only version.
for (const path of publicPagePaths(pages,posts)) {
  const output = path==='/' ? join(dist,'index.html') : join(dist,path,'index.html')
  await mkdir(dirname(output),{recursive:true})
  await writeFile(output,renderMarketingDocument(shell,renderer.renderMarketingRoute(path,posts),renderer.marketingMetadata(path,posts),remote.posts))
}
await writeFile(join(dist,'404.html'),renderMarketingDocument(shell,renderer.renderMarketingRoute('/404',posts),null))
const sitemap = buildSitemap(pages,posts)
await writeFile(join(dist,'sitemap.xml'),sitemap)
await writeFile(join(root,'public/sitemap.xml'),sitemap)
await writeFile(join(dist,'rss.xml'),buildRss(posts))
for(const [name,body] of [['llms.txt',buildLlms(pages,posts)],['llms-full.txt',buildLlms(pages,posts,true)]]) {
  await writeFile(join(dist,name),body)
  await writeFile(join(root,'public',name),body)
}
let sourceRevision = process.env.SOURCE_REVISION || process.env.VERCEL_GIT_COMMIT_SHA || ''
if(!sourceRevision) { try { sourceRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim() } catch { sourceRevision='unknown' } }
await writeFile(join(dist,'seo-manifest.json'),JSON.stringify({
  site:'https://www.controlg.co',sourceRevision,generatedAt:new Date().toISOString(),
  pages:publicPagePaths(pages,posts),articles:posts.length,countries:pages.filter(page=>page.countryCode).length,
  cmsAtBuild:remote.available,rendering:'shared-react-components',
},null,2))

console.log(`SEO generado con componentes reales: ${pages.length} páginas, ${posts.length} artículos y 1 índice editorial; sitemap y catálogo preparados.`)
