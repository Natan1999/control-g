import { useState, useEffect, useCallback } from 'react'
import { MapPin, Users, UserCheck, X, ChevronDown, Plus, Pencil, Trash2, UserMinus } from 'lucide-react'
import { TopBar } from '@/components/layout/Sidebar'
import { PageWrapper } from '@/components/shared'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { getDepartments, getMunicipalities, Department, Municipality } from '@/services/geographyService'
import { Search, Loader2, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// ─── Colombian departments ────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Amazonas','Antioquia','Arauca','Atlántico','Bolívar','Boyacá','Caldas',
  'Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca',
  'Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño',
  'Norte de Santander','Putumayo','Quindío','Risaralda',
  'San Andrés y Providencia','Santander','Sucre','Tolima',
  'Valle del Cauca','Vaupés','Vichada',
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface MunForm {
  municipality_name: string
  department: string
  families_target: number
  dane_code?: string
}

const EMPTY_MUN: MunForm = { municipality_name: '', department: 'Bolívar', families_target: 35, dane_code: '' }

export default function MunicipalitiesPage() {
  const { user } = useAuthStore()
  const [municipalities, setMunicipalities]   = useState<any[]>([])
  const [professionals, setProfessionals]     = useState<any[]>([])
  const [assignments, setAssignments]         = useState<any[]>([])
  const [familyCounts, setFamilyCounts]       = useState<Record<string, number>>({})
  const [loading, setLoading]                 = useState(true)

  // Mun CRUD modal
  const [munModal, setMunModal]               = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null })
  const [munForm, setMunForm]                 = useState<MunForm>(EMPTY_MUN)
  const [munSaving, setMunSaving]             = useState(false)
  const [munError, setMunError]               = useState('')

  // Assign modal
  const [assignModal, setAssignModal]         = useState<{ open: boolean; municipalityId: string; municipalityName: string }>({
    open: false, municipalityId: '', municipalityName: '',
  })
  const [selectedProfId, setSelectedProfId]   = useState('')
  const [assigning, setAssigning]             = useState(false)
  const [assignError, setAssignError]         = useState('')

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm]     = useState<{ open: boolean; mun: any | null }>({ open: false, mun: null })
  const [deleting, setDeleting]               = useState(false)

  const [toast, setToast]                     = useState('')

  // Divipola lookup state
  const [daneDepts, setDaneDepts]             = useState<Department[]>([])
  const [daneMpios, setDaneMpios]             = useState<Municipality[]>([])
  const [loadingDane, setLoadingDane]         = useState(false)
  const [showDaneLookup, setShowDaneLookup]   = useState(false)
  const [selectedDeptId, setSelectedDeptId]   = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [munRes, profRes, assignRes, famRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, [
          Query.equal('entity_id', user!.entityId!), Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, [
          Query.equal('entity_id', user!.entityId!),
          Query.equal('role', 'professional'),
          Query.limit(100),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.PROFESSIONAL_ASSIGNMENTS, [
          Query.equal('entity_id', user!.entityId!), Query.limit(500),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FAMILIES, [
          Query.equal('entity_id', user!.entityId!), Query.limit(500),
        ]),
      ])
      setMunicipalities(munRes.documents)
      setProfessionals(profRes.documents)
      setAssignments(assignRes.documents)
      const counts: Record<string, number> = {}
      famRes.documents.forEach((f: any) => {
        counts[f.municipality_id] = (counts[f.municipality_id] || 0) + 1
      })
      setFamilyCounts(counts)
    } catch (err) {
      console.error('Error cargando municipios:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.entityId, user?.fullName])

  useEffect(() => { if (user?.entityId) loadAll() }, [user?.entityId, loadAll])

  // Load DANE departments on mount
  useEffect(() => {
    const fetchDepts = async () => {
      const depts = await getDepartments()
      setDaneDepts(depts)
    }
    fetchDepts()
  }, [])

  // Load DANE municipalities when dept changes
  useEffect(() => {
    if (selectedDeptId) {
      const fetchMpios = async () => {
        setLoadingDane(true)
        const mpios = await getMunicipalities(selectedDeptId)
        setDaneMpios(mpios)
        setLoadingDane(false)
      }
      fetchMpios()
    } else {
      setDaneMpios([])
    }
  }, [selectedDeptId])

  // ─── Municipality CRUD ──────────────────────────────────────────────────────

  function openAddMun() {
    setMunForm(EMPTY_MUN)
    setMunError('')
    setMunModal({ open: true, editing: null })
  }

  function openEditMun(mun: any) {
    setMunForm({
      municipality_name: mun.municipality_name,
      department: mun.department,
      families_target: mun.families_target ?? 35,
      dane_code: mun.dane_code || '',
    })
    setMunError('')
    setMunModal({ open: true, editing: mun })
  }

  async function handleSaveMun() {
    if (!munForm.municipality_name.trim()) {
      setMunError('El nombre del municipio es obligatorio.')
      return
    }
    if (munForm.families_target < 1) {
      setMunError('La meta de familias debe ser al menos 1.')
      return
    }
    setMunSaving(true)
    setMunError('')
    try {
      const payload = {
        municipality_name: munForm.municipality_name.trim(),
        department: munForm.department,
        families_target: Number(munForm.families_target),
        dane_code: munForm.dane_code,
      }

      if (munModal.editing) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, munModal.editing.$id, payload)
        showToast('Municipio actualizado correctamente')
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, ID.unique(), {
          ...payload,
          entity_id: user!.entityId!,
        })
        showToast('Municipio agregado correctamente')
      }
      setMunModal({ open: false, editing: null })
      loadAll()
    } catch (err: any) {
      setMunError('Error al guardar: ' + (err?.message ?? 'intenta de nuevo'))
    } finally {
      setMunSaving(false)
    }
  }

  async function handleDeleteMun() {
    if (!deleteConfirm.mun) return
    setDeleting(true)
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.ENTITY_MUNICIPALITIES, deleteConfirm.mun.$id)
      // Also remove assignments for this municipality
      const relatedAssignments = assignments.filter((a: any) => a.municipality_id === deleteConfirm.mun.$id)
      await Promise.all(relatedAssignments.map((a: any) =>
        databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.PROFESSIONAL_ASSIGNMENTS, a.$id)
      ))
      showToast('Municipio eliminado')
      setDeleteConfirm({ open: false, mun: null })
      loadAll()
    } catch (err: any) {
      showToast('Error al eliminar: ' + (err?.message ?? ''))
    } finally {
      setDeleting(false)
    }
  }

  // ─── Professional assignment ────────────────────────────────────────────────

  function getAssignedProfessionals(municipalityId: string) {
    const profIds = assignments
      .filter((a: any) => a.municipality_id === municipalityId)
      .map((a: any) => a.professional_id)
    return professionals.filter((p: any) => profIds.includes(p.user_id) || profIds.includes(p.$id))
  }

  function getAssignment(municipalityId: string, profUserId: string) {
    return assignments.find((a: any) =>
      a.municipality_id === municipalityId && (a.professional_id === profUserId || a.professional_id === profUserId)
    )
  }

  function openAssignModal(municipalityId: string, municipalityName: string) {
    setAssignModal({ open: true, municipalityId, municipalityName })
    setSelectedProfId('')
    setAssignError('')
  }

  async function handleAssign() {
    if (!selectedProfId) { setAssignError('Selecciona un profesional'); return }
    setAssigning(true)
    setAssignError('')
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_IDS.PROFESSIONAL_ASSIGNMENTS, ID.unique(), {
        entity_id: user?.entityId,
        professional_id: selectedProfId,
        municipality_id: assignModal.municipalityId,
      })
      showToast('Profesional asignado correctamente')
      setAssignModal({ open: false, municipalityId: '', municipalityName: '' })
      loadAll()
    } catch (err: any) {
      setAssignError('Error al asignar: ' + (err?.message ?? ''))
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassign(assignmentId: string, profName: string) {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.PROFESSIONAL_ASSIGNMENTS, assignmentId)
      showToast(`${profName} desasignado`)
      loadAll()
    } catch { showToast('Error al desasignar') }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  // Professionals not yet assigned to this municipality (for select dropdown)
  function getUnassignedProfessionals(municipalityId: string) {
    const assigned = getAssignedProfessionals(municipalityId).map((p: any) => p.user_id)
    return professionals.filter((p: any) => !assigned.includes(p.user_id))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageWrapper>
      <TopBar
        title="Municipios"
        subtitle={`${municipalities.length} municipio${municipalities.length !== 1 ? 's' : ''} configurado${municipalities.length !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={openAddMun}
            className="flex items-center gap-2 bg-[#1B3A4B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2a5570] transition-colors"
          >
            <Plus size={16} /> Agregar municipio
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-[#1B3A4B] border-t-transparent rounded-full mr-3" />
            Cargando municipios...
          </div>
        ) : municipalities.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MapPin size={48} className="mx-auto mb-4 opacity-25" />
            <p className="font-semibold text-base">No hay municipios configurados</p>
            <p className="text-sm mt-1 mb-6">Agrega los municipios donde operará tu equipo.</p>
            <button
              onClick={openAddMun}
              className="inline-flex items-center gap-2 bg-[#1B3A4B] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2a5570] transition-colors"
            >
              <Plus size={16} /> Agregar primer municipio
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {municipalities.map((mun: any) => {
              const assigned = getAssignedProfessionals(mun.$id)
              const familiesRegistered = familyCounts[mun.$id] || 0
              const familiesTarget = mun.families_target || 0
              const pct = familiesTarget > 0 ? Math.min(100, Math.round((familiesRegistered / familiesTarget) * 100)) : 0

              return (
                <div key={mun.$id} className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#1B3A4B]/10 flex items-center justify-center flex-shrink-0">
                        <MapPin size={18} className="text-[#1B3A4B]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground text-sm leading-snug truncate">{mun.municipality_name}</h3>
                        <p className="text-xs text-muted-foreground">{mun.department}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditMun(mun)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-gray-100 hover:text-[#1B3A4B] transition-colors" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm({ open: true, mun })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Family progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users size={12} /> Familias registradas
                      </span>
                      <span className="font-semibold text-foreground">{familiesRegistered} / {familiesTarget} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#27AE60' : '#1B3A4B' }} />
                    </div>
                  </div>

                  {/* Assigned professionals */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Profesionales</p>
                    {assigned.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Sin profesionales asignados</p>
                    ) : (
                      <div className="space-y-1.5">
                        {assigned.map((p: any) => {
                          const asgn = getAssignment(mun.$id, p.user_id)
                          return (
                            <div key={p.$id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs min-w-0">
                                <div className="w-6 h-6 rounded-full bg-[#27AE60]/15 flex items-center justify-center text-[#27AE60] font-bold text-[10px] flex-shrink-0">
                                  {(p.full_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-foreground font-medium truncate">{p.full_name}</span>
                              </div>
                              {asgn && (
                                <button onClick={() => handleUnassign(asgn.$id, p.full_name)}
                                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 flex-shrink-0" title="Desasignar">
                                  <UserMinus size={12} />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Assign button */}
                  {getUnassignedProfessionals(mun.$id).length > 0 && (
                    <button
                      onClick={() => openAssignModal(mun.$id, mun.municipality_name)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#1B3A4B] text-[#1B3A4B] text-xs font-semibold hover:bg-[#1B3A4B] hover:text-white transition-colors"
                    >
                      <UserCheck size={14} /> Asignar Profesional
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#1B3A4B] text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* ─── Add/Edit Municipality Modal ─────────────────────────────────────── */}
      {munModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">{munModal.editing ? 'Editar municipio' : 'Agregar municipio'}</h2>
              <button onClick={() => setMunModal({ open: false, editing: null })} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Municipality name — free text */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Nombre del municipio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Altos del Rosario, Carmen de Bolívar..."
                  className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
                  value={munForm.municipality_name}
                  onChange={e => setMunForm(f => ({ ...f, municipality_name: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Departamento <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={munForm.department}
                    onChange={e => setMunForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-9 bg-white"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* DANE DIVIPOLA Lookup */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDaneLookup(!showDaneLookup)}
                  className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                >
                  <Globe size={14} />
                  {showDaneLookup ? 'Cerrar catálogo DANE' : 'Consultar catálogo DANE (DIVIPOLA)'}
                </button>

                {showDaneLookup && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-blue-900/60 uppercase tracking-wider mb-1">Dpto. Oficial (DANE)</label>
                      <select 
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="w-full text-xs font-bold py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 px-2"
                      >
                        <option value="">Seleccione Departamento...</option>
                        {daneDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>

                    {selectedDeptId && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-blue-900/60 uppercase tracking-wider">Municipio Oficial (DIVIPOLA)</label>
                        {loadingDane ? (
                          <div className="flex items-center gap-2 py-2 text-[10px] font-bold text-blue-400">
                            <Loader2 size={12} className="animate-spin" /> Cargando catálogo...
                          </div>
                        ) : (
                          <div className="max-h-40 overflow-y-auto border border-blue-200 rounded-lg bg-white divide-y divide-blue-50">
                            {daneMpios.length === 0 ? (
                              <div className="p-3 text-[10px] text-slate-400 italic">No se encontraron resultados</div>
                            ) : (
                              daneMpios.map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    setMunForm(f => ({
                                      ...f,
                                      municipality_name: m.name,
                                      department: daneDepts.find(d => d.id === selectedDeptId)?.name || f.department,
                                      dane_code: m.id
                                    }))
                                    setShowDaneLookup(false)
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between group"
                                >
                                  {m.name}
                                  <span className="text-[9px] text-slate-400 group-hover:text-blue-400 font-mono">{m.id}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
                
                {munForm.dane_code && !showDaneLookup && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <UserCheck size={10} />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700">Código DANE vinculado: <span className="font-mono">{munForm.dane_code}</span></span>
                  </div>
                )}
              </div>

              {/* Families target */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Meta de familias <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  className="w-full px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30"
                  value={munForm.families_target}
                  onChange={e => setMunForm(f => ({ ...f, families_target: parseInt(e.target.value) || 1 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Número de familias que se deben atender en este municipio.</p>
              </div>

              {munError && <p className="text-sm text-red-500">{munError}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMunModal({ open: false, editing: null })}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMun}
                disabled={munSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1B3A4B] text-white text-sm font-medium hover:bg-[#2a5570] transition-colors disabled:opacity-60"
              >
                {munSaving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : (munModal.editing ? 'Guardar cambios' : 'Agregar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Assign Professional Modal ────────────────────────────────────────── */}
      {assignModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Asignar profesional</h2>
              <button onClick={() => setAssignModal({ open: false, municipalityId: '', municipalityName: '' })} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Municipio: <span className="font-semibold text-foreground">{assignModal.municipalityName}</span>
            </p>
            <div className="relative mb-4">
              <select
                value={selectedProfId}
                onChange={e => setSelectedProfId(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/30 pr-9 bg-white"
              >
                <option value="">Seleccionar profesional...</option>
                {getUnassignedProfessionals(assignModal.municipalityId).map((p: any) => (
                  <option key={p.$id} value={p.user_id}>{p.full_name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {assignError && <p className="text-sm text-red-500 mb-3">{assignError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setAssignModal({ open: false, municipalityId: '', municipalityName: '' })}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={handleAssign} disabled={assigning}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1B3A4B] text-white text-sm font-medium hover:bg-[#2a5570] transition-colors disabled:opacity-60">
                {assigning ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteConfirm.open && deleteConfirm.mun && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h2 className="text-base font-bold text-center mb-2">Eliminar municipio</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              ¿Eliminar <strong>{deleteConfirm.mun.municipality_name}</strong>? También se eliminarán las asignaciones de profesionales en este municipio.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm({ open: false, mun: null })}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteMun} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60">
                {deleting ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
