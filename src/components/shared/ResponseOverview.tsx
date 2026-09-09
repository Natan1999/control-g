import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/** Same persisted responses as the map and analytics, never simulated client data. */
export function ResponseOverview({ entityId, prefix }: { entityId?: string; prefix: string }) {
  const [state, setState] = useState<{ total: number; approved: number; located: number; forms: { title: string; count: number }[] } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    setState(null); setError('')
    if (!entityId) return
    async function load() {
      try {
        const forms = await supabase.from('forms').select('id,title').eq('entity_id', entityId!)
        if (forms.error) throw forms.error
        const count = async (filter?: 'approved' | 'located', formId?: string) => {
          let query = supabase.from('form_responses').select('id', { count: 'exact', head: true }).eq('entity_id', entityId!)
          if (filter === 'approved') query = query.eq('status', 'approved')
          if (filter === 'located') query = query.not('latitude', 'is', null).not('longitude', 'is', null)
          if (formId) query = query.eq('form_id', formId)
          const result = await query
          if (result.error) throw result.error
          return result.count || 0
        }
        const [total, approved, located, perForm] = await Promise.all([
          count(), count('approved'), count('located'),
          Promise.all((forms.data || []).map(async form => ({ title: form.title, count: await count(undefined, form.id) }))),
        ])
        if (!cancelled) setState({ total, approved, located, forms: perForm.sort((a,b) => b.count-a.count) })
      } catch { if (!cancelled) setError('No fue posible cargar las capturas. Revisa la conexión y recarga el panel.') }
    }
    void load()
    return () => { cancelled = true }
  }, [entityId])
  if (!entityId) return null
  return <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Información recolectada en campo">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Información recolectada en campo</h2><p className="text-sm text-muted-foreground">Respuestas recibidas en esta entidad, tanto de capturas online como sincronizadas.</p></div><Link className="font-semibold text-primary underline" to={`${prefix}/analytics`}>Ver gráficas e indicadores</Link></div>
    {error ? <p role="alert" className="mt-4 text-red-700">{error}</p> : !state ? <p className="mt-4 text-sm" role="status">Cargando capturas…</p> : <>
      <dl className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Respuestas recibidas',state.total],['Aprobadas',state.approved],['Georreferenciadas',state.located]].map(([label,value]) => <div className="rounded-xl bg-slate-50 p-4" key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-3xl font-bold text-primary">{value}</dd></div>)}</dl>
      <div className="space-y-3">{state.forms.map((form,index) => <div key={`${form.title}-${index}`}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{form.title}</span><strong>{form.count}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sky-600" style={{ width: `${state.total ? form.count/state.total*100 : 0}%` }} /></div></div>)}</div>
      {!state.total && <p className="text-sm">Aún no se han recibido respuestas de los formularios asignados.</p>}
    </>}
    <nav className="mt-5 flex flex-wrap gap-3"><Link to={`${prefix}/map`} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">Abrir mapa y capas</Link><Link to={`${prefix}/responses`} className="rounded-xl border px-4 py-3 text-sm font-semibold">Consultar respuestas</Link></nav>
  </section>
}
