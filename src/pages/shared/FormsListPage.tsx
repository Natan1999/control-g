import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Edit2, Trash2, Eye, FileText, 
  ChevronRight, Calendar, Layers, Building2,
  AlertCircle, MoreVertical, Layout
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { FormDefinition, UserRole } from '@/types'
import { cn } from '@/lib/utils'

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
      setForms(res.documents as unknown as FormDefinition[])

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
  }, [user?.role, user?.entityId])

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
            className="flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            style={{ background: COLORS.primary }}
          >
            <Plus size={18} />
            Nuevo Formulario
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
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
                      <div className="flex items-center gap-4">
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
