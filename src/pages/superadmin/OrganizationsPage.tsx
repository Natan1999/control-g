import { useState } from 'react'
import { Plus, Search, Filter, MoreVertical, Building2, Users, FileText, HardDrive } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { StatusBadge, PageWrapper } from '@/components/shared'
import { mockOrganizations } from '@/lib/mockData'
import type { OrgPlan } from '@/types'

const planColors: Record<OrgPlan, string> = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
  gobierno: 'bg-brand-primary/10 text-brand-primary',
}

export default function OrganizationsPage() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'table' | 'grid'>('grid')

  const filtered = mockOrganizations.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.contactEmail.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageWrapper>
      <TopBar
        title="Organizaciones"
        subtitle={`${mockOrganizations.length} organizaciones registradas`}
        actions={
          <button className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors">
            <Plus size={16} /> Nueva Organización
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Search */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, NIT o email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Filter size={16} /> Filtrar
          </button>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((org, i) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-black text-xl">
                    {org.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-tight">{org.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{org.nit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${planColors[org.plan]}`}>
                    {org.plan}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={16} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground mb-4">{org.contactEmail}</div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                  <Users size={14} className="mx-auto text-brand-primary mb-1" />
                  <div className="text-sm font-bold">{Math.floor(org.maxUsers * 0.6)}</div>
                  <div className="text-[10px] text-muted-foreground">Usuarios</div>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                  <FileText size={14} className="mx-auto text-brand-secondary mb-1" />
                  <div className="text-sm font-bold">{Math.floor(org.maxForms * 0.7)}</div>
                  <div className="text-[10px] text-muted-foreground">Formularios</div>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                  <HardDrive size={14} className="mx-auto text-purple-500 mb-1" />
                  <div className="text-sm font-bold">{Math.round(org.maxStorageGb * 0.4)} GB</div>
                  <div className="text-[10px] text-muted-foreground">Storage</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <StatusBadge status={org.status} />
                <button className="text-xs text-brand-primary font-medium hover:underline">Ver detalles →</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
