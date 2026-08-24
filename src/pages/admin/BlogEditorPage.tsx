import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

type SectionDraft = { title: string; body: string }
type FaqDraft = { question: string; answer: string }
type SourceDraft = { title: string; publisher: string; url: string }

const today = new Date().toISOString().slice(0, 10)
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)

export default function BlogEditorPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('Guías')
  const [country, setCountry] = useState('Colombia')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [publishedAt, setPublishedAt] = useState(today)
  const [readingMinutes, setReadingMinutes] = useState(7)
  const [keywords, setKeywords] = useState('')
  const [intro, setIntro] = useState('')
  const [sections, setSections] = useState<SectionDraft[]>([{ title: '', body: '' }])
  const [verdict, setVerdict] = useState('')
  const [faqs, setFaqs] = useState<FaqDraft[]>([{ question: '', answer: '' }])
  const [sources, setSources] = useState<SourceDraft[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  useEffect(() => {
    if (!editing || !id) return
    supabase.from('blog_posts').select('*').eq('id', id).single().then(({ data, error: loadError }) => {
      if (loadError || !data) { setError('No fue posible abrir el artículo.'); return }
      setTitle(data.title); setSlug(data.slug); setSlugEdited(true); setDescription(data.description); setExcerpt(data.excerpt)
      setCategory(data.category); setCountry(data.country); setStatus(data.status); setPublishedAt(data.published_at); setReadingMinutes(data.reading_minutes)
      setKeywords((data.keywords || []).join(', ')); setIntro((data.intro || []).join('\n\n')); setVerdict(data.verdict || '')
      setSections((data.sections || []).map((section: any) => ({ title: section.title, body: (section.paragraphs || []).join('\n\n') })))
      setFaqs(data.faqs || []); setSources(data.sources || []); setImageUrl(data.image_url || ''); setImageAlt(data.image_alt || '')
    })
  }, [editing, id])

  const seoChecks = useMemo(() => [
    { label: 'Título', value: title.length, ok: title.length >= 20 && title.length <= 60, target: '20–60' },
    { label: 'Descripción', value: description.length, ok: description.length >= 120 && description.length <= 165, target: '120–165' },
    { label: 'Extracto', value: excerpt.length, ok: excerpt.length >= 100 && excerpt.length <= 220, target: '100–220' },
  ], [title, description, excerpt])

  function updateSection(index: number, field: keyof SectionDraft, value: string) { setSections(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item)) }
  function updateFaq(index: number, field: keyof FaqDraft, value: string) { setFaqs(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item)) }
  function updateSource(index: number, field: keyof SourceDraft, value: string) { setSources(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item)) }

  async function uploadImage(file?: File) {
    if (!file || !user) return
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) { setError('La portada debe ser JPG, PNG o WebP y pesar menos de 8 MB.'); return }
    setUploading(true); setError('')
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/${Date.now()}-${slug || 'articulo'}.${extension}`
    const { error: uploadError } = await supabase.storage.from('blog-images').upload(path, file, { upsert: false })
    if (uploadError) setError('No fue posible subir la portada.')
    else setImageUrl(supabase.storage.from('blog-images').getPublicUrl(path).data.publicUrl)
    setUploading(false)
  }

  async function save() {
    setError('')
    if (!seoChecks.every(check => check.ok)) { setError('Corrija las longitudes SEO marcadas antes de guardar.'); return }
    const cleanSections = sections.filter(section => section.title.trim() && section.body.trim()).map(section => ({ title: section.title.trim(), paragraphs: section.body.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean) }))
    const cleanFaqs = faqs.filter(faq => faq.question.trim() && faq.answer.trim())
    if (!slug || intro.trim().length < 120 || cleanSections.length < 2 || (status === 'published' && cleanFaqs.length < 2)) { setError('Complete el slug, una introducción sólida, al menos dos secciones y dos preguntas para publicar.'); return }
    setSaving(true)
    const payload = {
      title: title.trim(), slug, description: description.trim(), excerpt: excerpt.trim(), category, country, status, published_at: publishedAt,
      reading_minutes: readingMinutes, keywords: keywords.split(',').map(item => item.trim()).filter(Boolean),
      whatsapp_message: `Hola, leí “${title.trim()}” en Control G. Quiero conocer la plataforma para nuestro proyecto.`,
      intro: intro.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean), sections: cleanSections, comparison: [], verdict: verdict.trim(),
      faqs: cleanFaqs, sources: sources.filter(source => source.title.trim() && source.url.trim()), image_url: imageUrl || null, image_alt: imageAlt.trim() || null,
      ...(editing ? {} : { created_by: user?.id }),
    }
    const query = editing ? supabase.from('blog_posts').update(payload).eq('id', id!) : supabase.from('blog_posts').insert(payload)
    const { error: saveError } = await query
    setSaving(false)
    if (saveError) setError(saveError.code === '23505' ? 'Ya existe un artículo con ese slug.' : saveError.message)
    else navigate('/admin/blog')
  }

  const fieldClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <TopBar title={editing ? 'Editar artículo' : 'Nuevo artículo'} subtitle="Editor conectado con Supabase" actions={<button onClick={save} disabled={saving || uploading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0038A8] px-4 text-sm font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}<span className="hidden sm:inline">Guardar</span></button>} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <button onClick={() => navigate('/admin/blog')} className="inline-flex items-center gap-2 text-sm font-black text-slate-600"><ArrowLeft size={16} /> Volver al blog</button>
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-black text-slate-900">Información editorial y SEO</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-bold">Título SEO<input value={title} onChange={event => { setTitle(event.target.value); if (!slugEdited) setSlug(slugify(event.target.value)) }} className={fieldClass} placeholder="Título claro con la intención de búsqueda principal" /></label><label className="sm:col-span-2 text-sm font-bold">Slug<input value={slug} onChange={event => { setSlug(slugify(event.target.value)); setSlugEdited(true) }} className={fieldClass} placeholder="titulo-del-articulo" /></label><label className="sm:col-span-2 text-sm font-bold">Descripción para Google<textarea value={description} onChange={event => setDescription(event.target.value)} className={`${fieldClass} min-h-24`} /></label><label className="sm:col-span-2 text-sm font-bold">Extracto para tarjetas<textarea value={excerpt} onChange={event => setExcerpt(event.target.value)} className={`${fieldClass} min-h-24`} /></label><label className="text-sm font-bold">Categoría<select value={category} onChange={event => setCategory(event.target.value)} className={fieldClass}>{['Guías','Comparativas','Caracterización social','Trabajo offline','Gestión pública'].map(option => <option key={option}>{option}</option>)}</select></label><label className="text-sm font-bold">País o región<input value={country} onChange={event => setCountry(event.target.value)} className={fieldClass} /></label><label className="sm:col-span-2 text-sm font-bold">Palabras clave<input value={keywords} onChange={event => setKeywords(event.target.value)} className={fieldClass} placeholder="separadas, por, comas" /></label></div></section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-black">Portada del artículo</h2><div className="mt-5 grid gap-5 md:grid-cols-2">{imageUrl ? <img src={imageUrl} alt={imageAlt || 'Vista previa de portada'} className="aspect-[3/2] w-full rounded-2xl object-cover" /> : <div className="flex aspect-[3/2] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400"><ImagePlus size={34} /></div>}<div><label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700">{uploading ? <Loader2 className="animate-spin" size={17} /> : <ImagePlus size={17} />} Subir imagen<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => uploadImage(event.target.files?.[0])} /></label><label className="mt-4 block text-sm font-bold">Texto alternativo<input value={imageAlt} onChange={event => setImageAlt(event.target.value)} className={fieldClass} placeholder="Describa la escena para accesibilidad" /></label><p className="mt-3 text-xs leading-5 text-slate-500">Recomendado: 1440 × 960 px, sin texto ni logos incrustados.</p></div></div></section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-black">Introducción</h2><p className="mt-1 text-xs text-slate-500">Separe los párrafos con una línea en blanco.</p><textarea value={intro} onChange={event => setIntro(event.target.value)} className={`${fieldClass} min-h-44`} /></section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Desarrollo del artículo</h2><button onClick={() => setSections(items => [...items, { title: '', body: '' }])} className="inline-flex items-center gap-1 text-sm font-black text-blue-700"><Plus size={16} /> Sección</button></div><div className="mt-5 space-y-5">{sections.map((section, index) => <div key={index} className="rounded-2xl border border-slate-200 p-4"><div className="flex gap-3"><input value={section.title} onChange={event => updateSection(index, 'title', event.target.value)} className="w-full border-0 text-base font-black outline-none" placeholder={`Título de la sección ${index + 1}`} /><button onClick={() => setSections(items => items.filter((_, i) => i !== index))} className="text-red-500" aria-label="Eliminar sección"><Trash2 size={17} /></button></div><textarea value={section.body} onChange={event => updateSection(index, 'body', event.target.value)} className={`${fieldClass} min-h-40`} placeholder="Escriba párrafos útiles, concretos y sin repetir la introducción." /></div>)}</div></section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-black">Conclusión</h2><textarea value={verdict} onChange={event => setVerdict(event.target.value)} className={`${fieldClass} min-h-28`} placeholder="Cierre claro y equilibrado del artículo." /></section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Preguntas frecuentes</h2><button onClick={() => setFaqs(items => [...items, { question: '', answer: '' }])} className="inline-flex items-center gap-1 text-sm font-black text-blue-700"><Plus size={16} /> Pregunta</button></div><div className="mt-5 space-y-4">{faqs.map((faq, index) => <div key={index} className="rounded-2xl bg-slate-50 p-4"><div className="flex gap-3"><input value={faq.question} onChange={event => updateFaq(index, 'question', event.target.value)} className="w-full bg-transparent font-black outline-none" placeholder="Pregunta" /><button onClick={() => setFaqs(items => items.filter((_, i) => i !== index))} className="text-red-500"><Trash2 size={16} /></button></div><textarea value={faq.answer} onChange={event => updateFaq(index, 'answer', event.target.value)} className={`${fieldClass} min-h-20`} placeholder="Respuesta directa" /></div>)}</div></section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Fuentes</h2><button onClick={() => setSources(items => [...items, { title: '', publisher: '', url: '' }])} className="inline-flex items-center gap-1 text-sm font-black text-blue-700"><Plus size={16} /> Fuente</button></div><div className="mt-5 space-y-4">{sources.map((source, index) => <div key={index} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"><input value={source.publisher} onChange={event => updateSource(index, 'publisher', event.target.value)} className={fieldClass} placeholder="Entidad o publicación" /><input value={source.title} onChange={event => updateSource(index, 'title', event.target.value)} className={fieldClass} placeholder="Título de la fuente" /><input value={source.url} onChange={event => updateSource(index, 'url', event.target.value)} className={`${fieldClass} sm:col-span-2`} placeholder="https://..." /><button onClick={() => setSources(items => items.filter((_, i) => i !== index))} className="justify-self-start text-xs font-black text-red-600">Eliminar fuente</button></div>)}</div></section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="font-black">Publicación</h2><label className="mt-4 block text-sm font-bold">Estado<select value={status} onChange={event => setStatus(event.target.value as typeof status)} className={fieldClass}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label><label className="mt-4 block text-sm font-bold">Fecha<input type="date" value={publishedAt} onChange={event => setPublishedAt(event.target.value)} className={fieldClass} /></label><label className="mt-4 block text-sm font-bold">Minutos de lectura<input type="number" min="1" max="60" value={readingMinutes} onChange={event => setReadingMinutes(Number(event.target.value))} className={fieldClass} /></label></section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="font-black">Control SEO</h2><div className="mt-4 space-y-3">{seoChecks.map(check => <div key={check.label} className="flex items-center justify-between text-sm"><span className="font-bold text-slate-600">{check.label}</span><span className={`rounded-full px-2.5 py-1 text-xs font-black ${check.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{check.value} / {check.target}</span></div>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">Un buen título responde una búsqueda concreta. Evite repetir la misma frase en título, extracto e introducción.</p></section>
            <button onClick={save} disabled={saving || uploading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0038A8] font-black text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar artículo</button>
          </aside>
        </div>
      </div>
    </div>
  )
}
