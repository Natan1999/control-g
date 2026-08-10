import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Edit2, Trash2, Eye, FileText, 
  ChevronRight, Calendar, Layers, Building2,
  AlertCircle, MoreVertical, Layout, UserCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/backend'
import { Query } from '@/lib/backend'
import { useAuthStore } from '@/stores/authStore'
import { FormDefinition } from '@/types'
import { cn } from '@/lib/utils'
import FormAssignmentDialog from '@/components/forms/FormAssignmentDialog'

const COLORS = {
  primary: '#0038A8',   // Royal Blue
  secondary: '#D4AF37', // Gold
  accent: '#1B3A4B',    // Slate
  surface: '#F8FAFC',
  border: '#E2E8F0',
}

export default function FormsListPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [forms, setForms] = useState<FormDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState('')
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({})
  const [assigningForm, setAssigningForm] = useState<(FormDefinition & { entity_id?: string; $id?: string }) | null>(null)

  const isAdmin = user?.role === 'admin'
  const basePath = isAdmin ? '/admin/forms' : '/coord/forms'

  const [entitiesMap, setEntitiesMap] = useState<Record<string, string>>({})

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      const queries = [Query.orderDesc('$createdAt')]
      
      // If coordinator, filter by entity
      if (user?.role === 'coordinator' && user.entityId) {
        queries.push(Query.equal('entity_id', user.entityId))
      }

      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, queries)
      const normalizedForms = res.documents.map((document: any) => ({
        ...document,
        id: document.$id,
        entityId: document.entity_id,
        version: document.version ?? document.v ?? 1,
      })) as FormDefinition[]
      setForms(normalizedForms)

      const assignmentQueries = [Query.limit(2000)]
      if (!isAdmin && user?.entityId) assignmentQueries.push(Query.equal('entity_id', user.entityId))
      const assignmentDocs = await databases
        .listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_ASSIGNMENTS, assignmentQueries)
        .then(result => result.documents)
        .catch(() => [])
      const counts: Record<string, number> = {}
      assignmentDocs
        .filter((assignment: any) => assignment.status === 'active')
        .forEach((assignment: any) => {
          counts[assignment.form_id] = (counts[assignment.form_id] || 0) + 1
        })
      setAssignmentCounts(counts)

      // If admin, fetch entities to show names
      if (user?.role === 'admin') {
        const entRes = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [Query.limit(100)])
        const map: Record<string, string> = {}
        entRes.documents.forEach((ent: any) => {
          map[ent.$id] = ent.name
        })
        setEntitiesMap(map)
      }
    } catch (err) {
      console.error('Error fetching forms:', err)
      setToast('Error al cargar formularios')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user?.role, user?.entityId])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este formulario? Esta acción no se puede deshacer.')) return
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.FORMS, id)
      setForms(forms.filter(f => f.id !== id))
      setToast('Formulario eliminado')
    } catch (err) {
      console.error(err)
      setToast('Error al eliminar')
    }
  }

  const filteredForms = forms.filter(f => 
    (f.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <TopBar 
        title="Gestión de Formularios"
        subtitle={isAdmin ? "Administración global de instrumentos de recolección" : "Formularios de tu entidad"}
        actions={
          <button 
            onClick={() => navigate(`${basePath}/new`)}
            aria-label="Nuevo formulario"
            className="flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-6 sm:py-2.5 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            style={{ background: COLORS.primary }}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nuevo Formulario</span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-2 text-blue-800 font-black text-xs uppercase tracking-widest">
              <UserCheck size={17} /> Flujo recomendado
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 text-xs text-slate-600">
              <div><strong className="text-slate-900">1. Diseña</strong><br />Crea o ajusta las preguntas.</div>
              <div><strong className="text-slate-900">2. Publica</strong><br />Deja el formulario listo para campo.</div>
              <div><strong className="text-slate-900">3. Asigna</strong><br />Elige exactamente quién puede diligenciarlo.</div>
              <div><strong className="text-slate-900">4. Revisa</strong><br />Consulta las respuestas recibidas.</div>
            </div>
          </div>
          
          {/* Search & Stats */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por título o tipo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
              <span>Total: <span className="text-slate-900">{forms.length}</span></span>
              <span className="w-1 h-1 bg-slate-200 rounded-full" />
              <span>Publicados: <span className="text-emerald-500">{forms.filter(f => f.status === 'published').length}</span></span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-white border border-slate-100 rounded-[32px] animate-pulse" />
              ))}
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-200 rounded-[40px]">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Layout size={32} className="text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No se encontraron formularios</h3>
              <p className="text-slate-400 text-sm max-w-xs text-center mb-8">
                Aún no has creado ningún instrumento de recolección para esta entidad.
              </p>
              <button 
                onClick={() => navigate(`${basePath}/new`)}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
              >
                Crear el primero
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredForms.map((form, idx) => (
                <motion.div
                  key={form.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all relative overflow-hidden"
                >
                  {/* Status Tag */}
                  <div className={cn(
                    "absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    form.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    {form.status === 'published' ? 'Publicado' : 'Borrador'}
                  </div>

                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText size={24} className="text-blue-600" />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{form.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <Layers size={12} />
                        {form.type}
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        v{form.version}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 group/entity hover:bg-white hover:shadow-sm transition-all">
                        <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover/entity:text-blue-500 shadow-xs border border-slate-200">
                          <Building2 size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">Entidad Propietaria</span>
                          <span className="text-[10px] font-bold text-slate-600 truncate leading-tight">
                            {entitiesMap[form.entityId] || (
                              <span className="text-slate-300 italic font-medium">Global / Cargando...</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAssigningForm(form)}
                          className="px-3 py-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                          title="Asignar a profesionales"
                        >
                          <UserCheck size={18} />
                          <span>Asignar</span>
                          {assignmentCounts[form.id] > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center">
                              {assignmentCounts[form.id]}
                            </span>
                          )}
                        </button>
                        <button 
                          onClick={() => navigate(`${basePath}/edit/${form.id}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Editar Formulario"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(form.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <button 
                        onClick={() => navigate(`${basePath}/edit/${form.id}`)}
                        className="flex items-center gap-1 text-[10px] font-black text-slate-900 uppercase tracking-widest hover:gap-2 transition-all p-2"
                      >
                        Abrir <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl z-[100] font-bold text-sm animate-bounce flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          {toast}
          <button onClick={() => setToast('')} className="ml-2 opacity-50 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {assigningForm && (
        <FormAssignmentDialog
          form={assigningForm}
          onClose={() => setAssigningForm(null)}
          onSaved={count => {
            setAssignmentCounts(current => ({ ...current, [assigningForm.id]: count }))
            setToast(`Asignación actualizada: ${count} profesionales`)
          }}
        />
      )}
    </div>
  )
}

function X({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  )
}
