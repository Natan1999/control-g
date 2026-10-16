import assert from 'node:assert/strict'
import test from 'node:test'
import { colombiaCalendarDate, fetchPublicBlog, publicBlogPost } from '../scripts/lib/public-blog.mjs'

const row = overrides => ({
  status: 'published', slug: 'guia-publica', title: 'Guía pública', published_at: '2026-10-15',
  updated_at: '2026-10-15T15:00:00Z', intro: ['Preparación'], sections: [{ title: 'Campo', paragraphs: ['Prueba'] }],
  created_by: 'creador-interno', entity_id: 'entidad-interna', access_token: 'token-no-publicar',
  ...overrides,
})

test('la fecha editorial permanece en Colombia durante las primeras cinco horas UTC', () => {
  assert.equal(colombiaCalendarDate(new Date('2026-10-16T00:01:00Z')), '2026-10-15')
  assert.equal(colombiaCalendarDate(new Date('2026-10-16T04:59:59Z')), '2026-10-15')
  assert.equal(colombiaCalendarDate(new Date('2026-10-16T05:00:00Z')), '2026-10-16')
  assert.equal(publicBlogPost(row({ published_at: '2026-10-16' }), { today: '2026-10-15' }), null)
  assert.equal(publicBlogPost(row({ published_at: '2026-10-16' }), { today: '2026-10-16' }).slug, 'guia-publica')
})

test('la proyección pública excluye borradores archivos y datos internos', () => {
  assert.equal(publicBlogPost(row({ status: 'archived' })), null)
  assert.equal(publicBlogPost(row({ status: 'draft' })), null)
  const result = publicBlogPost(row(), { today: '2026-10-15' })
  assert.equal(result.created_by, undefined)
  assert.equal(result.entity_id, undefined)
  assert.equal(result.access_token, undefined)
})

test('el catálogo aplica el mismo corte colombiano a todas las filas y usa solo clave anónima', async () => {
  const result = await fetchPublicBlog({
    env: { VITE_SUPABASE_URL: 'https://public.example', VITE_SUPABASE_ANON_KEY: 'clave-anonima' },
    today: '2026-10-15',
    fetcher: async (url, options) => {
      assert.equal(url.searchParams.get('status'), 'eq.published')
      assert.equal(options.headers.Authorization, 'Bearer clave-anonima')
      assert.doesNotMatch(url.searchParams.get('select'), /created_by|entity_id|access_token/)
      return Response.json([row(), row({ slug: 'guia-manana', published_at: '2026-10-16' })])
    },
  })
  assert.equal(result.available, true)
  assert.deepEqual(result.posts.map(post => post.slug), ['guia-publica'])
})
