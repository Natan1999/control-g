import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit3, Eye, FileText, Plus, Search, Trash2 } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { supabase } from '@/lib/supabase'
import { BLOG_POSTS, normalizeBlogRow, type BlogPost } from '@/lib/blog'

export default function BlogManagerPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('blog_posts').select('*').order('updated_at', { ascending: false })
    if (error) setMessage(error.message.includes('blog_posts') ? 'La migración editorial todavía no está aplicada en Supabase.' : 'No fue posible cargar los artículos.')
    setPosts((data || []).map(normalizeBlogRow))
    setLoading(false)
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  const filtered = useMemo(() => posts.filter(post => `${post.title} ${post.category} ${post.country}`.toLowerCase().includes(search.toLowerCase())), [posts, search])

  async function removePost(post: BlogPost) {
    if (!post.id || !confirm(`¿Eliminar “${post.title}”? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('blog_posts').delete().eq('id', post.id)
    if (error) setMessage('No fue posible eliminar el artículo.')
    else setPosts(current => current.filter(item => item.id !== post.id))
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <TopBar title="Blog y contenidos" subtitle="Cree artículos profesionales y controle su publicación" actions={<button onClick={() => navigate('/admin/blog/new')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0038A8] px-4 text-sm font-black text-white shadow-lg shadow-blue-500/15"><Plus size={17} /><span className="hidden sm:inline">Nuevo artículo</span></button>} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Artículos de base</p><p className="mt-2 text-3xl font-black text-[#102d3e]">{BLOG_POSTS.length}</p><p className="mt-1 text-xs text-slate-500">Guías y comparativas incluidas en el sitio.</p></div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Creados desde el panel</p><p className="mt-2 text-3xl font-black text-[#102d3e]">{posts.length}</p><p className="mt-1 text-xs text-slate-500">Contenido guardado en Supabase.</p></div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Publicados</p><p className="mt-2 text-3xl font-black text-emerald-600">{posts.filter(post => post.status === 'published').length}</p><p className="mt-1 text-xs text-slate-500">Visibles inmediatamente en el blog.</p></div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900"><strong>Flujo editorial:</strong> redacte con una intención de búsqueda clara, complete la descripción SEO, agregue portada y fuentes, revise la vista previa y publique. Los borradores nunca aparecen en el sitio público.</section>

          {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{message}</div>}

          <div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por título, categoría o país" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></div>

          {loading ? <div className="grid gap-5 md:grid-cols-2">{[1,2,3,4].map(item => <div key={item} className="h-44 animate-pulse rounded-3xl bg-white" />)}</div> : filtered.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><FileText className="mx-auto text-slate-300" size={38} /><h2 className="mt-5 text-xl font-black text-slate-900">Aún no hay artículos creados desde el panel</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Los {BLOG_POSTS.length} contenidos iniciales siguen publicados. Cree el próximo artículo aquí para administrarlo desde Supabase.</p><button onClick={() => navigate('/admin/blog/new')} className="mt-6 rounded-xl bg-[#0038A8] px-5 py-3 text-sm font-black text-white">Crear primer artículo</button></div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">{filtered.map(post => <article key={post.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700' : post.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{post.status === 'published' ? 'Publicado' : post.status === 'draft' ? 'Borrador' : 'Archivado'}</span><h2 className="mt-4 text-lg font-black leading-snug text-slate-900">{post.title}</h2><p className="mt-2 text-sm text-slate-500">{post.category} · {post.country} · {post.readingMinutes} min</p></div></div><div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button onClick={() => navigate(`/admin/blog/edit/${post.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"><Edit3 size={14} /> Editar</button>{post.status === 'published' && <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"><Eye size={14} /> Ver publicado</a>}<button onClick={() => removePost(post)} className="ml-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"><Trash2 size={14} /> Eliminar</button></div></article>)}</div>
          )}
        </div>
      </div>
    </div>
  )
}
