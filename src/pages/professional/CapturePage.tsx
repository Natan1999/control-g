import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, Camera, ClipboardList, Clock, 
  ChevronRight, Sparkles, AlertCircle, 
  FileText, History
} from 'lucide-react'
import { MobileTopBar, BottomNav } from '@/components/layout/BottomNav'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { localDB } from '@/lib/dexie-db'
import { Button } from '@/components/ui/button'

interface FormDef {
  $id: string
  name: string
  description?: string
  v: number
  updated_at?: string
}

export default function FieldCapturePage() {
  const { user } = useAuthStore()
  const { pendingCount, status: syncStatus } = useSyncStore()
  const navigate = useNavigate()
  const [forms, setForms] = useState<FormDef[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    loadForms()
    loadTodayMetrics()
  }, [])

  async function loadTodayMetrics() {
    try {
      const startOfDay = new Date().setHours(0, 0, 0, 0)
      const count = await localDB.formResponses
        .where('createdAt')
        .above(startOfDay)
        .count()
      setTodayCount(count)
    } catch (error) {
      console.error('Error loading today metrics:', error)
    }
  }

  async function loadForms() {
    setLoading(true)
    try {
      // In a real production scenario, we'd check sync-engine's local cache
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
        Query.orderDesc('$updatedAt'),
        Query.limit(50)
      ])
      setForms(res.documents as unknown as FormDef[])
    } catch (error) {
      console.error('Error loading forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredForms = forms.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24">
      <MobileTopBar title="Centro de Captura" />

      {/* Hero Header Premium */}
      <div className="bg-gradient-to-br from-[#0038A8] to-[#002868] text-white px-6 py-8 rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-[10px] uppercase tracking-[0.2em] mb-2">
            <Sparkles size={12} />
            <span>Inteligencia de Campo</span>
          </div>
          <h1 className="text-2xl font-black leading-tight">
            ¿Qué vamos a <br />
            <span className="text-[#D4AF37]">recolectar</span> hoy?
          </h1>
          <p className="text-blue-100/70 text-xs mt-3 max-w-[200px] leading-relaxed">
            Selecciona un formulario oficial para iniciar la recolección de datos.
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-6 relative z-20">
        {/* Search Bar - Premium Glassmorphism */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#0038A8]">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar formularios técnicos..."
            className="w-full pl-12 pr-4 py-4 bg-white border-0 rounded-2xl shadow-lg shadow-blue-900/5 text-sm outline-none ring-2 ring-transparent focus:ring-[#0038A8]/10 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Quick Actions & Daily Progress */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            onClick={() => navigate('/field/capture/free-photo')}
            className="col-span-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-8 h-8 bg-[#D4AF37]/5 rounded-bl-full" />
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
              <Camera size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Evidencia</span>
          </button>
          
          <div className="col-span-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 relative group overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-transparent opacity-20" />
             <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0038A8]">
                <Clock size={20} />
             </div>
             <div className="text-center">
                <div className="text-[14px] font-black text-[#0038A8]">{todayCount}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Hoy</div>
             </div>
          </div>
        </div>

        {/* Form Gallery */}
        <div className="mt-8">
          <div className="flex justify-between items-center px-1 mb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList size={16} className="text-[#0038A8]" />
              Formularios Disponibles
            </h2>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {filteredForms.length}
            </span>
          </div>

          <div className="space-y-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white h-24 rounded-[32px] border border-slate-100 animate-pulse shadow-sm" />
              ))
            ) : filteredForms.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-800 font-bold">No hay formularios</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Tu coordinador aún no ha publicado formularios para tu perfil.
                </p>
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={loadForms}
                   className="mt-4 rounded-xl border-slate-200"
                >
                  Reintentar carga
                </Button>
              </div>
            ) : (
              filteredForms.map(form => (
                <button
                  key={form.$id}
                  onClick={() => navigate(`/field/forms/${form.$id}`)}
                  className="w-full group bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 active:scale-[0.98] transition-all text-left relative overflow-hidden"
                >
                  {/* Subtle Accent */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#0038A8] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0038A8] transition-colors truncate">
                        {form.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {form.description || 'Formulario técnico de recolección de datos georreferenciados.'}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <FileText size={12} />
                          <span>v{form.v}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <Clock size={12} />
                          <span>~15 min</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[#0038A8]/5 group-hover:text-[#0038A8] transition-all flex-shrink-0">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Offline Info & Sync Status */}
        <div className="mt-8 p-6 bg-slate-900 rounded-[32px] text-white overflow-hidden relative shadow-2xl shadow-blue-900/40">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 to-transparent pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Sparkles className="text-[#D4AF37]" size={24} />
                </div>
                {pendingCount > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-black animate-pulse">
                    {pendingCount}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-1">
                  {syncStatus === 'syncing' ? 'Sincronizando...' : 'Estado Offline'}
                </div>
                <p className="text-[11px] text-blue-100/80 leading-relaxed font-medium">
                  {pendingCount > 0 
                    ? `Tienes ${pendingCount} registros pendientes por subir.` 
                    : 'Todo está sincronizado correctamente.'}
                </p>
              </div>
            </div>
            
            <div className={`w-3 h-3 rounded-full ${pendingCount > 0 ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]'}`} />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
