import { useState } from 'react'
import { Plus, Calendar, MapPin, Users, TrendingUp, Filter, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { StatusBadge, ProgressRing, PageWrapper } from '@/components/shared'
import { mockProjects } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'

export default function ProjectsPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <PageWrapper>
      <TopBar
        title="Mis Proyectos"
        subtitle="Proyectos de caracterización bajo tu coordinación"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-secondary transition-colors"
          >
            <Plus size={16} /> Crear Proyecto
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Filter bar */}
        <div className="flex items-center gap-3">
          {['Todos', 'Activos', 'Borrador', 'Completados', 'Archivados'].map(f => (
            <button
              key={f}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                f === 'Todos'
                  ? 'bg-brand-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Projects grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {mockProjects.map((project, i) => {
            const pct = project.targetForms && project.completedForms
              ? Math.round((project.completedForms / project.targetForms) * 100)
              : 0

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <StatusBadge status={project.status} />
                    <h3 className="font-bold text-foreground mt-2 leading-snug">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                  </div>
                  <ProgressRing value={project.completedForms || 0} max={project.targetForms || 1} size={72} />
                </div>

                {/* Meta */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    <span>Departamento {project.departmentId}</span>
                  </div>
                  {project.startDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>{formatDate(project.startDate)} — {project.endDate ? formatDate(project.endDate) : 'Sin fecha'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Users size={12} />
                    <span>{project.activeTechnicians || 0} técnicos activos</span>
                  </div>
                  {project.targetForms && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} />
                      <span>{project.completedForms?.toLocaleString('es-CO')} / {project.targetForms.toLocaleString('es-CO')} formularios</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs bg-muted px-2 py-1 rounded-full capitalize">{project.type}</span>
                  <button className="flex items-center gap-1 text-xs text-brand-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver detalles <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            )
          })}

          {/* New project card */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => setShowModal(true)}
            className="bg-card rounded-2xl border-2 border-dashed border-border p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-brand-primary hover:text-brand-primary transition-all min-h-[240px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Plus size={24} />
            </div>
            <span className="font-medium text-sm">Crear nuevo proyecto</span>
          </motion.button>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-5">Crear Nuevo Proyecto</h2>
            <div className="space-y-4">
              {[
                { label: 'Nombre del proyecto', placeholder: 'Ej: Caracterización Socioeconómica...' },
                { label: 'Tipo de caracterización', placeholder: 'Ej: Socioeconómica, Conectividad...' },
                { label: 'Meta de formularios', placeholder: 'Ej: 5000' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-semibold mb-1.5">{f.label}</label>
                  <input placeholder={f.placeholder} className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Fecha inicio</label>
                  <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Fecha fin</label>
                  <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary transition-colors">Crear Proyecto</button>
            </div>
          </motion.div>
        </div>
      )}
    </PageWrapper>
  )
}
