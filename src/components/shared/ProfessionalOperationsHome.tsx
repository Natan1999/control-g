import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ClipboardList, MapPinned, CheckCircle2, Cloud } from 'lucide-react'
import { BottomNav, MobileTopBar } from '@/components/layout/BottomNav'
import { localDB } from '@/lib/dexie-db'
import { getCachedFormAssignments, getCachedForms } from '@/lib/sync-engine'
import { useAuthStore } from '@/stores/authStore'

export function ProfessionalOperationsHome({ name }: { name: string }) {
  const user = useAuthStore(state => state.user)
  const responses = useLiveQuery(() => localDB.formResponses
    .filter(item => item.entityId === user?.entityId && item.professionalId === user?.id).toArray(), [user?.entityId, user?.id])
  const forms = getCachedForms(user?.entityId)
  const assignments = getCachedFormAssignments(user?.entityId, user?.id)
    .filter(assignment => forms.some(form => form.$id === assignment.form_id))
  const completed = responses?.filter(item => item.status !== 'draft') || []
  const metrics = [
    { label: 'Formularios asignados', value: assignments.length, icon: ClipboardList },
    { label: 'Capturas en este equipo', value: completed.length, icon: CheckCircle2 },
    { label: 'Pendientes de envío', value: completed.filter(item => item.status === 'completed').length, icon: Cloud },
    { label: 'Enviadas desde este equipo', value: completed.filter(item => item.status === 'synced').length, icon: CheckCircle2 },
  ]
  return <div className="min-h-screen bg-slate-50 pb-28">
    <MobileTopBar title="Mi operación de campo" />
    <header className="bg-[#173B4C] px-5 py-8 text-white sm:px-8">
      <p className="text-xs font-bold uppercase tracking-widest text-teal-200">{name || 'Control G · Operación comercial'}</p>
      <h1 className="mt-3 text-3xl font-black">Hola, {user?.fullName?.split(' ')[0] || 'profesional'}.</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-200">Registra visitas y necesidades en los formularios que te asignó coordinación. No necesitas crear una familia para levantar información comercial.</p>
      <Link className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-bold text-[#173B4C]" to="/field/capture"><ClipboardList size={20} /> Iniciar captura</Link>
    </header>
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <section aria-label="Mi actividad en el dispositivo" className="grid grid-cols-2 gap-3">{metrics.map(metric => <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4"><metric.icon size={20} className="text-teal-700" /><p className="mt-3 text-2xl font-black text-slate-900">{responses ? metric.value : '—'}</p><p className="mt-1 text-xs leading-5 text-slate-600">{metric.label}</p></div>)}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Antes de salir a campo</h2>
        <ol className="mt-3 list-inside list-decimal space-y-3 text-sm leading-6 text-slate-600"><li>Con internet, abre Capturar y actualiza tus asignaciones.</li><li>Sin señal, diligencia y guarda el formulario. Las fotos y respuestas quedan en este dispositivo.</li><li>Al recuperar conexión, sincroniza y comprueba que el registro figure como enviado. Coordinación lo verá cuando llegue al servidor.</li></ol>
        <p className="mt-4 text-xs leading-6 text-amber-900">No desinstales la aplicación ni borres sus datos mientras existan capturas pendientes. GPS puede funcionar sin internet, pero depende del dispositivo y de la señal satelital.</p>
      </section>
      <Link to="/field/map" className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#173B4C] p-5 font-bold text-white"><MapPinned /> Abrir mapa territorial</Link>
    </main>
    <BottomNav />
  </div>
}
