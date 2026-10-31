import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { localDB } from '@/lib/dexie-db'
import { getCachedForms } from '@/lib/sync-engine'
import { useAuthStore } from '@/stores/authStore'

export function ProfessionalOperationsReports() {
  const user = useAuthStore(state => state.user)
  const responses = useLiveQuery(() => localDB.formResponses
    .filter(item => item.entityId === user?.entityId && item.professionalId === user?.id)
    .reverse().sortBy('createdAt'), [user?.entityId, user?.id])
  const forms = new Map(getCachedForms(user?.entityId).map(form => [form.$id, form.title || form.name || 'Formulario']))
  const statusLabels = { draft: 'Borrador en este dispositivo', completed: 'Guardado · pendiente de sincronizar', synced: 'Recibido por el servidor' }
  return <div className="min-h-screen bg-slate-50 pb-28">
    <MobileTopBar title="Mis registros de campo" />
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-black text-slate-900">Seguimiento de capturas</h1>
      <p className="text-sm leading-7 text-slate-600">Este historial corresponde a tu usuario y a este dispositivo. La revisión, aprobación y los informes consolidados se consultan desde coordinación.</p>
      <Link to="/field/capture" className="inline-flex min-h-12 items-center rounded-xl bg-[#173B4C] px-5 font-bold text-white">Capturar o sincronizar</Link>
      {responses === undefined ? <p role="status">Cargando registros locales…</p> : !responses.length ? <p className="rounded-xl bg-white p-5">Aún no hay capturas guardadas en este dispositivo.</p> : <>
        <p className="text-xs text-slate-500">{responses.length} registros · mostrando los 100 más recientes</p>
        <ul className="space-y-3">{responses.slice(0, 100).map(response => <li key={response.localId} className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold text-slate-900">{forms.get(response.formId) || 'Formulario de campo'}</h2>
          <p className="mt-2 text-xs text-slate-600">{new Date(response.updatedAt).toLocaleString()} · {statusLabels[response.status]}</p>
          {response.status === 'completed' && response.lastError ? <p className="mt-3 text-xs leading-6 text-amber-900">Último intento: {response.lastError}. El registro sigue guardado localmente.</p> : null}
          <p className="mt-2 break-all text-[11px] text-slate-400">Referencia local: {response.localId}</p>
        </li>)}</ul>
      </>}
    </main>
    <BottomNav />
  </div>
}
