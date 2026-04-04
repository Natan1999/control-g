import { useState, useEffect } from 'react'
import { Plus, Calendar, MapPin, Users, TrendingUp, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { ID } from 'appwrite'
import { TopBar } from '@/components/layout/Sidebar'
import { StatusBadge, ProgressRing, PageWrapper } from '@/components/shared'
import { listProjects } from '@/lib/appwrite-db'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const PROJECT_TYPES = [
  { value: 'socioeconomica', label: 'Caracterización Socioeconómica' },
  { value: 'conectividad', label: 'Diagnóstico de Conectividad' },
  { value: 'servicios_publicos', label: 'Servicios Públicos' },
  { value: 'censo', label: 'Censo de Población' },
  { value: 'electoral', label: 'Electoral' },
  { value: 'vivienda', label: 'Vivienda' },
  { value: 'agropecuario', label: 'Agropecuario' },
  { value: 'personalizada', label: 'Personalizada' },
]

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'draft', label: 'Borrador' },
  { key: 'completed', label: 'Completados' },
  { key: 'archived', label: 'Archivados' },
]

export default function ProjectsPage() {
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const { user } = useAuthStore()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    name: '',
    type: 'socioeconomica' as const,
    target_forms: '',
    start_date: '',
    end_date: '',
    description: '',
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProjects() {
      if (!user?.organizationId) return
      try {
        setLoading(true)
        const res = await listProjects({ organizationId: user.organizationId, coordinatorId: user.id })

        const mapped = res.documents.map((doc: any) => ({
          id: doc.$id,
          name: doc.name,
          description: doc.description,
          status: doc.status,
          departmentId: doc.department_id || 'Bolívar',
          startDate: doc.start_date,
          endDate: doc.end_date,
          targetForms: doc.target_forms || 0,
          completedForms: doc.completed_forms || 0,
          activeTechnicians: doc.active_technicians || 0,
          type: doc.type || 'Socioeconómica'
        }))
        setProjects(mapped)
      } catch (err) {
        console.error('Error fetching projects', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [user])

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('El nombre del proyecto es requerido'); return }
    setCreating(true)
    setError('')
    try {
      const doc = await databases.createDocument(DATABASE_ID, COLLECTION_IDS.PROJECTS, ID.unique(), {
        name: form.name,
        type: form.type,
        target_forms: parseInt(form.target_forms) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        description: form.description || null,
        status: 'draft',
        organization_id: user?.organizationId || '',
        coordinator_id: user?.id || '',
        settings: '{}'
      })
      setProjects(prev => [{
        id: doc.$id,
        name: doc.name,
        description: doc.description,
        status: doc.status,
        departmentId: 'Bolívar',
        startDate: doc.start_date,
        endDate: doc.end_date,
        targetForms: doc.target_forms,
        completedForms: 0,
        activeTechnicians: 0,
        type: doc.type
      }, ...prev])
      setShowModal(false)
      setForm({ name: '', type: 'socioeconomica', target_forms: '', start_date: '', end_date: '', description: '' })
    } catch {
      setError('Error al crear el proyecto. Verifica la conexión.')
    } finally {
      setCreating(false)
    }
  }

  const filteredProjects = statusFilter === 'all'
    ? projects
    : projects.filter(p => p.status === statusFilter)

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
        <div className="flex items-center gap-3 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-brand-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Projects grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((project, i) => {
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
                  {project.targetForms > 0 && (
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

          {loading && projects.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">Cargando proyectos...</div>
          )}

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
              <div>
                <label className="block text-sm font-semibold mb-1.5">Nombre del proyecto</label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Caracterización Socioeconómica Bolívar 2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Tipo de caracterización</label>
                <select
                  value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value as typeof form.type }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  {PROJECT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Meta de formularios</label>
                <input
                  type="number"
                  value={form.target_forms}
                  onChange={e => setForm(prev => ({ ...prev, target_forms: e.target.value }))}
                  placeholder="Ej: 5000"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Descripción (opcional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del proyecto..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Fecha inicio</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Fecha fin</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 font-medium">{error}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setError('') }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary transition-colors disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Creando...
                  </>
                ) : 'Crear Proyecto'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </PageWrapper>
  )
}
