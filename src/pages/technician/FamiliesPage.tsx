import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, FileText, ChevronRight, AlertCircle, Save, CheckCircle, Clock, MapPin, Plus, X } from 'lucide-react'
import { MobileTopBar, BottomNav } from '@/components/layout/BottomNav'
import { useFamilyStore, type BeneficiaryFamilyData } from '@/stores/familyStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { BeneficiaryFamily } from '@/types'

import { SERVICE_MOMENTS, type MomentConfig } from '@/config/moments'

function determineNextMoment(family: BeneficiaryFamily): MomentConfig | null {
  for (const moment of SERVICE_MOMENTS) {
    // @ts-expect-error - dynamic field access
    if (!family[moment.completionField]) {
      return moment;
    }
  }
  return null;
}

import { DynamicForm } from '@/components/forms/DynamicForm'
import { 
  EX_ANTES_SCHEMA, 
  ENCOUNTER_1_SCHEMA, 
  ENCOUNTER_2_SCHEMA, 
  ENCOUNTER_3_SCHEMA, 
  EX_POST_SCHEMA 
} from '@/lib/schemas'
import { localDB } from '@/lib/dexie-db'
import { processSyncQueue } from '@/lib/sync-engine'

const SCHEMA_MAP: Record<string, any> = {
  EX_ANTES: EX_ANTES_SCHEMA,
  ENCOUNTER_1: ENCOUNTER_1_SCHEMA,
  ENCOUNTER_2: ENCOUNTER_2_SCHEMA,
  ENCOUNTER_3: ENCOUNTER_3_SCHEMA,
  EX_POST: EX_POST_SCHEMA
}

export default function TechFamiliesPage() {
  const { families, fetchFamilies, advanceMoment, registerFamilyOffline } = useFamilyStore()
  const { user } = useAuthStore()
  const [selectedFamily, setSelectedFamily] = useState<BeneficiaryFamily | null>(null)
  const [activeMoment, setActiveMoment] = useState<MomentConfig | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [newFamily, setNewFamily] = useState<Partial<BeneficiaryFamilyData>>({
    headFirstName: '',
    headFirstLastname: '',
    headIdNumber: '',
    vereda: '',
    address: '',
    totalMembers: 1,
    projectId: user?.projectId || ''
  })
  
  useEffect(() => {
    // Intentar cargar el primer proyecto asignado o uno por defecto
    const projectId = user?.projectId || '65f123abc' // Fallback a un ID real si existe
    fetchFamilies(projectId)
  }, [fetchFamilies, user?.projectId])

  const handleFormSubmit = async (formData: any, media: any[]) => {
    if (!selectedFamily || !activeMoment) return

    const localResponseId = `local_resp_${Date.now()}`

    // 1. Guardar Fotos/Firmas en la cola de medios local
    for (const item of media) {
       await localDB.mediaQueue.put({
          id: item.id,
          response_local_id: localResponseId,
          file: item.blob,
          name: item.name,
          type: item.type,
          bucket_id: item.id.startsWith('sig_') ? 'signatures' : 'field-photos',
          status: 'pending'
       })
    }

    // 2. Guardar la respuesta final (con los placeholders de medios)
    // El SyncEngine se encargará de reemplazar "LOCAL_MEDIA:id" por el ID real de Appwrite
    await advanceMoment(selectedFamily.id, activeMoment.id as any, { 
      ...formData, 
      projectId: selectedFamily.projectId 
    })
    
    // Disparar sincronización si hay red
    if (navigator.onLine) {
       processSyncQueue().catch(console.error)
    }

    setActiveMoment(null)
    setSelectedFamily(null)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFamily.headIdNumber || !newFamily.headFirstLastname) return

    await registerFamilyOffline({
      ...newFamily as BeneficiaryFamilyData,
      projectId: user?.projectId || '65f123abc'
    })

    setIsRegistering(false)
    setNewFamily({
        headFirstName: '',
        headFirstLastname: '',
        headIdNumber: '',
        vereda: '',
        address: '',
        totalMembers: 1,
        projectId: user?.projectId || ''
    })
  }

  // Vista de Registro de Familia
  if (isRegistering) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTopBar title="Registrar Familia" />
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
            <form onSubmit={handleRegister} className="space-y-5">
               <div className="bg-white p-5 rounded-2xl border border-border shadow-sm space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Primer Nombre</label>
                    <input 
                      required
                      type="text" 
                      value={newFamily.headFirstName}
                      onChange={e => setNewFamily({...newFamily, headFirstName: e.target.value})}
                      placeholder="Ej: Juan"
                      className="w-full px-4 py-3.5 rounded-xl border border-input focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Primer Apellido</label>
                    <input 
                      required
                      type="text" 
                      value={newFamily.headFirstLastname}
                      onChange={e => setNewFamily({...newFamily, headFirstLastname: e.target.value})}
                      placeholder="Ej: Pérez"
                      className="w-full px-4 py-3.5 rounded-xl border border-input focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Cédula de Ciudadanía</label>
                    <input 
                      required
                      type="text" 
                      value={newFamily.headIdNumber}
                      onChange={e => setNewFamily({...newFamily, headIdNumber: e.target.value})}
                      placeholder="Número de documento"
                      className="w-full px-4 py-3.5 rounded-xl border border-input focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                    />
                  </div>
               </div>

               <div className="bg-white p-5 rounded-2xl border border-border shadow-sm space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Vereda / Corregimiento</label>
                    <input 
                      type="text" 
                      value={newFamily.vereda}
                      onChange={e => setNewFamily({...newFamily, vereda: e.target.value})}
                      placeholder="Ej: Palenque"
                      className="w-full px-4 py-3.5 rounded-xl border border-input focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Dirección / Referencia</label>
                    <input 
                      type="text" 
                      value={newFamily.address}
                      onChange={e => setNewFamily({...newFamily, address: e.target.value})}
                      placeholder="Ej: Calle 5 # 10-20"
                      className="w-full px-4 py-3.5 rounded-xl border border-input focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                    />
                  </div>
               </div>

               <div className="flex gap-3 pt-2">
                 <button 
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold text-gray-500 text-sm"
                 >
                   Cancelar
                 </button>
                 <button 
                  type="submit"
                  className="flex-[2] py-4 rounded-2xl bg-brand-primary text-white font-bold text-sm shadow-lg shadow-brand-primary/20"
                 >
                   Guardar Familia
                 </button>
               </div>
            </form>
        </div>
      </div>
    )
  }

  // Vista de Formulario Real (Momentos)
  if (selectedFamily && activeMoment) {
    const currentSchema = SCHEMA_MAP[activeMoment.id] || EX_ANTES_SCHEMA

    return (
      <DynamicForm 
        schema={currentSchema} 
        initialData={{
           head_first_name: selectedFamily.headFirstName,
           head_first_lastname: selectedFamily.headFirstLastname,
           vereda: selectedFamily.vereda,
           address: selectedFamily.address
        }}
        onSubmit={handleFormSubmit}
        onCancel={() => setActiveMoment(null)}
      />
    )
  }

  // Vista de Detalles de Familia
  if (selectedFamily) {
    const nextMomentId = determineNextMoment(selectedFamily)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
          <MobileTopBar title="Detalle de Familia" />
          <div className="sticky top-[53px] z-30 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
              <button onClick={() => setSelectedFamily(null)} className="text-blue-500 text-sm font-semibold">
                  ← Volver
              </button>
              <div className="font-bold truncate text-sm">Familia {selectedFamily.headFirstLastname}</div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 pb-24 space-y-6">
              <div className="bg-white border text-center border-border p-5 rounded-2xl shadow-sm">
                  <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users size={28} />
                  </div>
                  <h2 className="font-black text-xl">{selectedFamily.headFirstName} {selectedFamily.headFirstLastname}</h2>
                  <p className="text-sm text-muted-foreground mt-1">C.C. {selectedFamily.headIdNumber}</p>
                  <div className="flex justify-center mt-3">
                      <span className="bg-secondary/10 text-secondary-foreground px-3 py-1 text-xs font-bold rounded-lg border border-secondary/20 flex items-center gap-1.5">
                        <MapPin size={12} /> {selectedFamily.vereda}
                      </span>
                  </div>
              </div>

              <div>
                  <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                      <Clock size={16} className="text-brand-primary" /> Ruta de Atención
                  </h3>
                  <div className="space-y-3">
                      {SERVICE_MOMENTS.map((moment: MomentConfig) => {
                          // @ts-expect-error Indexing with dynamic string
                          const isCompleted = selectedFamily[moment.completionField] === true
                          const isCurrent = moment.id === nextMomentId?.id
                          
                          // Icon selector based on moment ID
                          const getIcon = () => {
                            switch(moment.id) {
                              case 'EX_ANTES': return <FileText size={16} />;
                              case 'EX_POST': return <FileText size={16} />;
                              default: return <CheckCircle size={16} />;
                            }
                          }

                          return (
                              <div key={moment.id} className={cn(
                                  "p-4 rounded-xl border-2 flex items-center justify-between transition-colors",
                                  isCompleted ? "border-green-500 bg-green-50" :
                                  isCurrent ? "border-brand-primary bg-white shadow-sm" : 
                                  "border-gray-200 bg-gray-50 opacity-60"
                              )}>
                                  <div className="flex items-center gap-3">
                                      <div className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center",
                                          isCompleted ? "bg-green-500 text-white" :
                                          isCurrent ? "bg-brand-primary/10 text-brand-primary" :
                                          "bg-gray-200 text-gray-500"
                                      )}>
                                          {isCompleted ? <CheckCircle size={14} /> : getIcon()}
                                      </div>
                                      <div>
                                          <div className={cn("font-bold text-sm", isCompleted ? "text-green-800" : isCurrent ? "text-brand-primary" : "text-gray-500")}>
                                              {moment.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground font-medium mt-0.5">
                                              {isCompleted ? "Completado" : isCurrent ? "Siguiente paso" : "Bloqueado"}
                                          </div>
                                      </div>
                                  </div>
                                  {isCurrent && (
                                      <button 
                                          onClick={() => setActiveMoment(moment)}
                                          className="bg-brand-primary text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                                      >
                                          Iniciar
                                      </button>
                                  )}
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      </div>
    )
  }

  // Vista Lista de Familias
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTopBar title="Familias Asignadas" />
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
         <div className="mb-4">
             <input 
                type="search" 
                placeholder="Buscar por cédula o apellido..." 
                className="w-full px-4 py-3 rounded-xl border border-input shadow-sm focus:ring-2 focus:ring-brand-primary outline-none text-sm transition-shadow"
             />
         </div>
         <div className="space-y-3 mt-4">
            {families.map((family, i) => {
              const nextLoc = determineNextMoment(family)
              const nextMomentLabel = nextLoc?.name || "Ciclo Completo"

              return (
                  <motion.button
                      key={family.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedFamily(family)}
                      className="w-full bg-white rounded-2xl border border-border p-4 text-left shadow-sm hover:border-brand-primary/30 transition-colors"
                  >
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <h3 className="font-bold text-sm text-foreground">{family.headFirstLastname}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">Ref: {family.headFirstName}</p>
                          </div>
                          <div className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide",
                              nextLoc ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-green-50 text-green-600 border border-green-100"
                          )}>
                             {nextLoc ? `Pendiente: ${nextMomentLabel}` : "Ciclo Completo"}
                          </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mb-3">
                          <span className="flex items-center gap-1"><Users size={14}/> {family.totalMembers} miembros</span>
                          <span>CC. {family.headIdNumber}</span>
                      </div>
                      
                      {/* Progreso rápido */}
                      <div className="flex gap-1">
                          {SERVICE_MOMENTS.map((m: MomentConfig) => (
                              <div key={m.id} className={cn(
                                  "h-1.5 flex-1 rounded-full",
                                  // @ts-expect-error Indexing with dynamic string
                                  family[m.completionField] === true ? "bg-green-500" : "bg-gray-100"
                              )} />
                          ))}
                      </div>
                  </motion.button>
              )
            })}
         </div>
      </div>
      
      {/* Botón flotante para registrar */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsRegistering(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-2xl z-40"
      >
        <Plus size={28} />
      </motion.button>

      <BottomNav />
    </div>
  )
}
