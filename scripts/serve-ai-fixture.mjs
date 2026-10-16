// Explicit opt-in development harness. Never included in App routes or dist.
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const root = process.cwd()
const server = await createServer({
  configFile: false, plugins: [react()], publicDir: false,
  resolve: { alias: [
    { find: '@/lib/form-ai', replacement: resolve(root, 'tests/fixtures/ai-assistant-client.mjs') },
    { find: '@', replacement: resolve(root, 'src') },
  ] },
  server: { host: '127.0.0.1', port: 5178, strictPort: true },
})
await server.listen()
console.log('QA sintético: http://127.0.0.1:5178/tests/fixtures/ai-assistant.html')
