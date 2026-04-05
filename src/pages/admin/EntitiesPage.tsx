import { useState, useEffect } from 'react'
import { Plus, Building2, X, ChevronDown, Search, MapPin, Calendar, Users, Mail, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { account, databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { ID, Query } from 'appwrite'
import { getDepartments, getMunicipalities, Department, Municipality } from '@/services/geographyService'

interface EntityForm {
  name: string;
  nit: string;
  contract_number: string;
  contract_object: string;
  operator_name: string;
  department_id: string;
  department_name: string;
  period_start: string;
  period_end: string;
  families_per_municipality: number;
  coordinator_name: string;
  coordinator_email: string;
  coordinator_password: string;
  municipalities: { id: string; name: string }[];
}

const EMPTY_FORM: EntityForm = {
  name: '', nit: '', contract_number: '', contract_object: '', operator_name: '',
  department_id: '', department_name: '', period_start: '', period_end: '',
  families_per_municipality: 35, coordinator_name: '', coordinator_email: '',
  coordinator_password: '', municipalities: [],
}

const COLORS = {
  primary: '#0038A8',   // Royal Blue
  secondary: '#D4AF37', // Gold
  accent: '#1B3A4B',    // Slate
  surface: '#F8FAFC',
}

export default function AdminEntitiesPage() {
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EntityForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  
  // Geography data
  const [departments, setDepartments] = useState<Department[]>([])
  const [availableMunicipalities, setAvailableMunicipalities] = useState<Municipality[]>([])
  const [munSearch, setMunSearch] = useState('')
  const [loadingGeography, setLoadingGeography] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { 
    setToast({ msg, type }); 
    setTimeout(() => setToast(null), 4000) 
  }

  useEffect(() => { 
    loadEntities()
    loadDepartments()
  }, [])

  async function loadDepartments() {
    try {
      const depts = await getDepartments()
      setDepartments(depts)
      // Default to Bolívar (13) if available
      const bolivar = depts.find(d => d.id === '13')
      if (bolivar) {
        setForm(f => ({ ...f, department_id: '13', department_name: 'BOLÍVAR' }))
      }
    } catch (err) {
      console.error("Error loading departments", err)
    }
  }

  async function loadMunicipalities(deptId: string) {
    if (!deptId) return
    setLoadingGeography(true)
    try {
      const muns = await getMunicipalities(deptId)
      setAvailableMunicipalities(muns)
    } catch (err) {
      console.error("Error loading municipalities", err)
    } finally {
      setLoadingGeography(false)
    }
  }

  useEffect(() => {
    if (form.department_id) {
      loadMunicipalities(form.department_id)
      const name = departments.find(d => d.id === form.department_id)?.name || ''
      setForm(f => ({ ...f, department_name: name, municipalities: [] }))
    }
  }, [form.department_id, departments])

  async function loadEntities() {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITIES, [
        Query.orderDesc('$createdAt'), 
        Query.limit(50)
      ])
      setEntities(res.documents)
    } catch { 
      setEntities([]) 
    } finally { 
      setLoading(false) 
    }
  }

  const toggleMun = (mId: string, mName: string) =>
    setForm(f => ({
      ...f,
      municipalities: f.municipalities.some(m => m.id === mId)
        ? f.municipalities.filter(x => x.id !== mId)
        : [...f.municipalities, { id: mId, name: mName }],
    }))

  async function handleSave() {
    if (!form.name || !form.contract_number || !form.period_start || !form.period_end ||
        !form.coordinator_email || !form.coordinator_name || !form.coordinator_password) {
      showToast('Completa todos los campos obligatorios (*)', 'error')
      return
    }
    if (form.coordinator_password.length < 8) {
      showToast('La contraseña del coordinador debe tener al menos 8 caracteres', 'error')
      return
    }

    setSaving(true)
    try {
      // 1. Create Appwrite Auth account for coordinator
      let coordinatorUserId = ''
      try {
        const authUser = await account.create(
          ID.unique(),
          form.coordinator_email,
          form.coordinator_password,
          form.coordinator_name,
        )
        coordinatorUserId = authUser.$id
      } catch (authErr: any) {
        // 409 = account already exists — link by email, profile created next
        if (authErr?.code !== 409) throw authErr
        showToast('Email ya registrado — creando perfil vinculado', 'success')
      }

      // 2. Create Entity
      const entity = await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, ID.unique(), {
        name: form.name,
        nit: form.nit,
        contract_number: form.contract_number,
        contract_object: form.contract_object,
        operator_name: form.operator_name,
        department: form.department_name,
        period_start: form.period_start,
        period_end: form.period_end,
        families_per_municipality: form.families_per_municipality,
        status: 'active',
        created_by: form.coordinator_email,
      })

      // 3. Create municipality records
      for (const mun of form.municipalities) {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, ID.unique(), {
          entity_id: entity.$id,
          municipality_name: mun.name,
          department: form.department_name,
          families_target: form.families_per_municipality,
          dane_code: mun.id,
        })
      }

      // 4. Create coordinator profile linked to entity
      await databases.createDocument(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, ID.unique(), {
        ...(coordinatorUserId ? { user_id: coordinatorUserId } : {}),
        full_name: form.coordinator_name,
        email: form.coordinator_email,
        role: 'coordinator',
        entity_id: entity.$id,
        status: 'active',
      })

      showToast(`Entidad "${form.name}" y coordinador creados exitosamente`)
      setShowForm(false)
      setForm(EMPTY_FORM)
      loadEntities()
    } catch (err: any) {
      showToast('Error al guardar: ' + (err?.message ?? 'intenta de nuevo'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(entity: any) {
    const newStatus = entity.status === 'active' ? 'suspended' : 'active'
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.ENTITIES, entity.$id, { status: newStatus })
      setEntities(prev => prev.map(e => e.$id === entity.$id ? { ...e, status: newStatus } : e))
      showToast(`Entidad ${newStatus === 'active' ? 'activada' : 'suspendida'}`)
    } catch { 
      showToast('Error al actualizar estado', 'error') 
    }
  }

  const filteredMuns = availableMunicipalities.filter(m => 
    m.name.toLowerCase().includes(munSearch.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <TopBar
        title="Gestión de Entidades"
        subtitle="Administra contratos, operadores y cobertura territorial"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            style={{ background: COLORS.primary }}
          >
            <Plus size={18} /> Nueva Entidad
          </button>
        }
      />

      {loading ? (
        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Sincronizando con la nube...</p>
        </div>
      ) : entities.length === 0 ? (
        <div className="mt-24 text-center max-w-sm mx-auto">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 size={40} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Sin Entidades Activas</h3>
          <p className="text-muted-foreground mb-8">Comienza registrando una entidad territorial o un contrato operador para habilitar el sistema.</p>
          <button 
            onClick={() => setShowForm(true)} 
            className="w-full px-5 py-3 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20" 
            style={{ background: COLORS.primary }}
          >
            Registrar Primera Entidad
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
          {entities.map((e: any) => (
            <motion.div 
              layout
              key={e.$id} 
              className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight truncate">{e.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          e.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {e.status === 'active' ? 'Activo' : 'Suspendido'}
                        </span>
                        <span className="text-xs text-slate-400">· {e.department}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-600 truncate">{e.contract_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">{e.families_per_municipality} Fam/Mun</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Calendar size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-500">{e.period_start} — {e.period_end}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleStatus(e)}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      e.status === 'active' 
                        ? 'border-rose-100 text-rose-500 hover:bg-rose-50' 
                        : 'border-emerald-100 text-emerald-500 hover:bg-emerald-50'
                    }`}
                    title={e.status === 'active' ? 'Suspender Entidad' : 'Activar Entidad'}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Entity Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})` }} />

              <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
                <div>
                  <h2 className="font-bold text-2xl text-slate-900">Nueva Operación</h2>
                  <p className="text-sm text-slate-500">Registra una entidad territorial y su configuración base</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info Section */}
                  <div className="md:col-span-2 flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">1</span>
                    <h4 className="font-bold text-slate-800">Información del Contratante</h4>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nombre de la Entidad Territorial *</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ej: Alcaldía Mayor de Cartagena"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">NIT / Identificación</label>
                    <input value={form.nit} onChange={e => setForm(f => ({ ...f, nit: e.target.value }))}
                      placeholder="890000XXX-1"
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Número de Contrato *</label>
                    <input value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))}
                      placeholder="CONTR-2025-001"
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                  </div>

                  <div className="md:col-span-2 mb-2 mt-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">2</span>
                    <h4 className="font-bold text-slate-800">Ubicación y Cobertura</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Departamento (DANE)</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        value={form.department_id} 
                        onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                      >
                        <option value="">Seleccionar departamento...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Meta: Familias por Municipio</label>
                    <input type="number" value={form.families_per_municipality} onChange={e => setForm(f => ({ ...f, families_per_municipality: +e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                        Municipios de Operación
                      </label>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {form.municipalities.length} Seleccionados
                      </span>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        value={munSearch} 
                        onChange={e => setMunSearch(e.target.value)}
                        placeholder="Filtrar municipios..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all" />
                    </div>
                    
                    <div className="bg-slate-50/50 rounded-2xl p-4 max-h-48 overflow-y-auto">
                      {loadingGeography ? (
                        <p className="text-center text-xs text-slate-400 py-4 italic animate-pulse">Consultando DIVIPOLA...</p>
                      ) : availableMunicipalities.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-4">Selecciona un departamento primero</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {filteredMuns.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleMun(m.id, m.name)}
                              className={`text-[11px] px-3 py-1.5 rounded-xl font-bold transition-all ${
                                form.municipalities.some(x => x.id === m.id)
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100 shadow-sm'
                              }`}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 mb-2 mt-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">3</span>
                    <h4 className="font-bold text-slate-800">Coordinador General &amp; Vigencia</h4>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nombre Completo del Coordinador *</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input value={form.coordinator_name} onChange={e => setForm(f => ({ ...f, coordinator_name: e.target.value }))}
                        placeholder="Ej: María Fernanda González"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Coordinador *</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="email" value={form.coordinator_email} onChange={e => setForm(f => ({ ...f, coordinator_email: e.target.value }))}
                        placeholder="coordinador@proyecto.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Contraseña Temporal * (mín. 8 caracteres)</label>
                    <input type="password" value={form.coordinator_password} onChange={e => setForm(f => ({ ...f, coordinator_password: e.target.value }))}
                      placeholder="Contraseña temporal segura"
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Contratista / Operador Logístico</label>
                    <input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))}
                      placeholder="Ej: Consorcio Bolívar 2025"
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Fecha de Inicio *</label>
                    <input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Fecha de Finalización *</label>
                    <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-inner" />
                  </div>

                </div>

                <div className="flex gap-4 mt-10">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-[20px] transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-[2] py-4 text-white rounded-[20px] text-sm font-bold disabled:opacity-60 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all"
                    style={{ background: COLORS.primary }}>
                    {saving ? 'Configurando Entidad...' : 'Confirmar y Crear Operación'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 z-50 border ${
              toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <Plus size={14} className="rotate-45" />
              </div>
            ) : (
              <X size={20} />
            )}
            <span className="font-bold text-sm">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
