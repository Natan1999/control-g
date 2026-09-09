import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Dexie from 'dexie'
import { Building2, ArrowLeft, ClipboardList, MapPinned, Users } from 'lucide-react'
import { MapContent } from '@/pages/shared/OperationalMapPage'
import { buildMunicipalDemo, DEMO_TEAM, demoAssignedForms } from '@/lib/municipal-demo'
import FormRenderer from '@/components/forms/FormRenderer'
import type { FormDefinition } from '@/types'
import type { GeoRecord } from '@/types/gis'

interface DemoCapture { id: string; professionalId: string; formId: string; answers: Record<string, unknown>; createdAt: string }
const demoDb = new Dexie('control-g-demonstration')
demoDb.version(1).stores({ captures: 'id, professionalId' })
const base = buildMunicipalDemo()

function EvidencePreview({ value }: { value: unknown }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!(value instanceof Blob)) return
    const next = URL.createObjectURL(value)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [value])
  return url ? <img src={url} alt="Fotografía de prueba guardada localmente" className="mt-3 max-h-56 rounded-xl object-contain" /> : null
}

export default function MunicipalDemoPage() {
  const [userId, setUserId] = useState(DEMO_TEAM[0].id)
  const [form, setForm] = useState<FormDefinition | null>(null)
  const [captures, setCaptures] = useState<DemoCapture[]>([])
  const [message, setMessage] = useState('')
  const user = DEMO_TEAM.find(item => item.id === userId)!
  useEffect(() => { void demoDb.table<DemoCapture>('captures').toArray().then(setCaptures).catch(() => setMessage('No se pudo abrir el almacenamiento local de demostración.')) }, [])
  const dataset = useMemo(() => {
    const local: GeoRecord[] = captures.flatMap(capture => {
      const gps = capture.answers.gps as { latitude?: number; longitude?: number } | undefined
      if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number' || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude) || Math.abs(gps.latitude) > 90 || Math.abs(gps.longitude) > 180) return []
      return [{ id: capture.id, entityId: base.records[0].entityId, professionalId: capture.professionalId, formId: capture.formId, source: 'local', status: 'Prueba local', latitude: gps.latitude, longitude: gps.longitude, capturedAt: capture.createdAt, label: 'Captura de demostración local', isPending: true }]
    })
    return { ...base, records: [...base.records, ...local].filter(record => user.role !== 'professional' || record.professionalId === user.id) }
  }, [user, captures])
  const visibleCaptures = captures.filter(item => user.role !== 'professional' || item.professionalId === user.id)
  const bars = ['Centro', 'La Esperanza', 'Los Cedros', 'El Progreso', 'Ribera', 'Zona rural'].map(name => ({ name, count: dataset.records.filter(record => record.dimensions?.sector.value === name).length }))
  return <main id="main-content" className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-[#102c3d] px-5 py-7 text-white sm:px-10"><div className="mx-auto max-w-[1440px]">
      <Link to="/login" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/70"><ArrowLeft size={16} />Control G</Link>
      <div className="mt-4 flex flex-wrap items-center gap-5"><Building2 size={40} className="text-teal-300" /><div><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-300">Laboratorio de demostración</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Alcaldía Villa Esperanza</h1><p className="mt-2 text-sm text-white/65">Juventud, servicios públicos y decisiones territoriales.</p></div></div>
      <p className="mt-5 max-w-3xl text-xs leading-5 text-amber-100">Municipio, equipo, registros y límites ficticios. Este espacio simula los roles y guarda tus pruebas únicamente en este dispositivo; no requiere cuentas ni envía información a una entidad real.</p>
      <label className="mt-5 block text-xs font-bold">Presentar como<select aria-label="Rol de demostración" value={userId} onChange={event => { setUserId(event.target.value); setForm(null) }} className="mt-2 block min-h-12 w-full rounded-xl border border-white/20 bg-[#1e4558] px-3 text-sm sm:w-96">{DEMO_TEAM.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
    </div></header>
    <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-8"><div className="grid gap-4 md:grid-cols-3">{[
      { label: 'Caracterizaciones georreferenciadas', value: dataset.records.length, icon: MapPinned },
      { label: user.role === 'professional' ? 'Formularios asignados' : 'Equipo de campo', value: user.role === 'professional' ? demoAssignedForms(user.id).length : 3, icon: Users },
      { label: 'Pruebas guardadas en este dispositivo', value: visibleCaptures.length, icon: ClipboardList },
    ].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5"><item.icon size={20} className="text-teal-600" /><p className="mt-3 text-3xl font-black">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.label}</p></div>)}</div>
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Cobertura por sector</h2><p className="mt-1 text-xs text-slate-500">Conteos de registros ficticios visibles para el rol seleccionado.</p><div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{bars.map(bar => <div key={bar.name}><div className="mb-1 flex justify-between text-xs"><span>{bar.name}</span><strong>{bar.count}</strong></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-gradient-to-r from-teal-600 to-cyan-400" style={{ width: `${bar.count / Math.max(1, ...bars.map(item => item.count)) * 100}%` }} /></div></div>)}</div></section>
    {user.role === 'professional' && <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Capturar · mis formularios</h2><p className="mt-1 text-sm text-slate-500">Prueba la cámara, GPS opcional y almacenamiento sin conexión.</p><div className="mt-3 flex flex-wrap gap-3">{demoAssignedForms(user.id).map(item => <button key={item.id} type="button" onClick={() => setForm(item)} className="min-h-12 rounded-xl bg-[#153646] px-4 text-sm font-bold text-white">{item.title}</button>)}</div></section>}
    {message && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-900">{message}</p>}
    {form && <section className="mt-4 rounded-2xl bg-white p-4"><button type="button" className="min-h-11 px-3 text-sm font-bold" onClick={() => setForm(null)}>Cerrar captura</button><FormRenderer key={`${user.id}:${form.id}`} definition={form} embedded onSubmit={async answers => {
      const capture = { id: crypto.randomUUID(), professionalId: user.id, formId: form.id, answers, createdAt: new Date().toISOString() }
      try { await demoDb.table('captures').add(capture); setCaptures(current => [...current, capture]); setForm(null); setMessage('Prueba guardada con sus evidencias en este dispositivo. Cambia al rol de coordinación para verla en la bandeja de demostración.') } catch { setMessage('No se pudo guardar; conserva abierta la captura y revisa el almacenamiento del dispositivo.'); throw new Error('Almacenamiento no disponible') }
    }} /></section>}
    {visibleCaptures.length > 0 && <section className="mt-4 rounded-2xl bg-white p-5">
      <h2 className="font-bold">Bandeja de pruebas locales</h2>
      <p className="text-xs text-slate-500">Pruebas del dispositivo: no se envían a Supabase ni a otros dispositivos.</p>
      <ul className="mt-3 space-y-2">{visibleCaptures.map(item => <li key={item.id} className="rounded-xl border p-3 text-sm">
        <strong>{item.formId === 'demo-youth' ? 'Juventud' : 'Servicios públicos'}</strong> · {DEMO_TEAM.find(member => member.id === item.professionalId)?.fullName}
        <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.answers.gps ? 'Con GPS' : 'Sin GPS'} · {item.answers.photo instanceof Blob ? 'Foto conservada' : 'Sin foto'}</p>
        <details className="mt-2"><summary>Ver respuestas</summary>
          {Object.entries(item.answers).filter(([, value]) => typeof value === 'string' || typeof value === 'number').map(([key, value]) => <p key={key} className="mt-1 text-xs">{key}: {String(value)}</p>)}
          <EvidencePreview value={item.answers.photo} />
        </details>
      </li>)}</ul>
    </section>}
    </div>
    <MapContent demoDataset={dataset} demoUser={user} />
  </main>
}
