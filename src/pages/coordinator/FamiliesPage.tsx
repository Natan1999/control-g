import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Filter, Search, UserPlus, CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper, StatusBadge } from '@/components/shared'
import { useFamilyStore } from '@/stores/familyStore'
import { useAuthStore } from '@/stores/authStore'
import type { BeneficiaryFamily } from '@/types'

// Componente para visualizar los 5 momentos
function MomentTracker({ family }: { family: BeneficiaryFamily }) {
  const steps = [
    { key: 'exAntesCompleted', label: '1. Ex-Antes', icon: '📝' },
    { key: 'encounter1Completed', label: '2. Taller 1', icon: '🫂' },
    { key: 'encounter2Completed', label: '3. Taller 2', icon: '🫂' },
    { key: 'encounter3Completed', label: '4. Taller 3', icon: '🫂' },
    { key: 'exPostCompleted', label: '5. Ex-Post', icon: '📊' },
  ]

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-1">
      {steps.map((step, i) => {
        const isCompleted = family[step.key as keyof BeneficiaryFamily] as boolean
        return (
          <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
            <div 
              className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isCompleted 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
              title={step.label}
            >
              {isCompleted ? <CheckCircle2 size={12} className="text-blue-600" /> : <Circle size={12} />}
              <span className="hidden xl:inline">{step.label}</span>
              <span className="xl:hidden">{step.icon}</span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight size={12} className="text-gray-300" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function FamiliesPageCoord() {
  const { families, fetchFamilies } = useFamilyStore()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    // Para simplificar, asumimos projectId fijo en mock
    if (user?.organizationId) {
      fetchFamilies('proj_001')
    }
  }, [user, fetchFamilies])

  const filtered = families.filter(f => {
    const matchSearch = (f.headFirstName + ' ' + f.headFirstLastname).toLowerCase().includes(search.toLowerCase()) || f.headIdNumber?.includes(search)
    return matchSearch
  })

  return (
    <PageWrapper>
      <TopBar
        title="Familias Beneficiarias"
        subtitle="Monitoreo del ciclo de momentos de servicio por hogar."
        actions={
          <button className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-sm shadow-brand-primary/20">
            <UserPlus size={16} /> Agregar Familia Real
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cédula o nombre..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
          </div>
          <div className="flex items-center gap-2">
             <Filter size={15} className="text-muted-foreground" />
             <button className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-brand-primary text-white">Todos</button>
          </div>
        </div>

        {/* Lista de familias */}
        <div className="space-y-3">
          {filtered.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all p-5 overflow-hidden">
              <div className="flex items-start justify-between">
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-snug">
                       Familia: {f.headFirstName} {f.headFirstLastname}
                    </h3>
                    <div className="text-xs font-semibold text-muted-foreground/80 mt-1 mb-2">
                       CC. {f.headIdNumber} • Zona: {f.vereda} • Integrantes: {f.totalMembers}
                    </div>
                    
                    {/* Renderización de los 5 Momentos */}
                    <div className="mt-3">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Ruta de Atención:</span>
                       <MomentTracker family={f} />
                    </div>
                  </div>
                </div>

                <StatusBadge status={f.status} />

              </div>
              
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No se encontraron familias</p>
              <p className="text-sm mt-1">Acorde al filtro ingresado.</p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
