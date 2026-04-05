import { useState, useEffect } from 'react'
import { 
  Plus, Save, Eye, Hash, Type, AlignLeft, Calendar, Clock, 
  ChevronDown, CheckSquare, List, Radio as RadioIcon, 
  Camera, PenTool, MapPin, Layers, Calculator, Info, 
  FileText, Phone, Mail, Trash2, Settings2, GripVertical, 
  ChevronRight, ChevronLeft, Layout, Globe, X
} from 'lucide-react'
import { motion, Reorder, AnimatePresence } from 'framer-motion'
import { TopBar } from '@/components/layout/Sidebar'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { ID, Query } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { FormField, FormDefinition, FormPage, FormFieldType, ActivityType } from '@/types'

const COLORS = {
  primary: '#0038A8',   // Royal Blue
  secondary: '#D4AF37', // Gold
  accent: '#1B3A4B',    // Slate
  surface: '#F8FAFC',
  border: '#E2E8F0',
}

const FIELD_TYPES: { type: FormFieldType; label: string; icon: any; category: string }[] = [
  { type: 'text',          label: 'Texto Corto',     icon: Type,          category: 'Básico' },
  { type: 'longtext',      label: 'Texto Largo',     icon: AlignLeft,     category: 'Básico' },
  { type: 'number',        label: 'Cifra Numérica',  icon: Hash,          category: 'Básico' },
  { type: 'date',          label: 'Fecha',           icon: Calendar,      category: 'Básico' },
  { type: 'time',          label: 'Hora',            icon: Clock,         category: 'Básico' },
  { type: 'select',        label: 'Lista Desplegable', icon: ChevronDown,    category: 'Selección' },
  { type: 'multi_select',  label: 'Multiselección',  icon: List,          category: 'Selección' },
  { type: 'radio',         label: 'Botón Radial',    icon: RadioIcon,     category: 'Selección' },
  { type: 'checkbox',      label: 'Casilla Verif.',  icon: CheckSquare,   category: 'Selección' },
  { type: 'photo',         label: 'Captura Foto',    icon: Camera,        category: 'Media' },
  { type: 'signature',     label: 'Firma Digital',   icon: PenTool,       category: 'Media' },
  { type: 'gps',           label: 'Ubicación GPS',   icon: MapPin,        category: 'Geografía' },
  { type: 'municipality',  label: 'Municipio DANE',  icon: Globe,         category: 'Geografía' },
  { type: 'repeat_group',  label: 'Grupo Familiar',  icon: Layers,        category: 'Complejo' },
  { type: 'calculation',   label: 'Cálculo Auto.',   icon: Calculator,    category: 'Lógica' },
  { type: 'note',          label: 'Nota/Instruc.',   icon: Info,          category: 'Varios' },
  { type: 'file',          label: 'Archivo PDF',     icon: FileText,      category: 'Media' },
  { type: 'phone',         label: 'Teléfono',        icon: Phone,         category: 'Contacto' },
  { type: 'email',         label: 'Email',           icon: Mail,          category: 'Contacto' },
]

export default function FormBuilderPage() {
  const { user } = useAuthStore()
  const [form, setForm] = useState<Partial<FormDefinition>>({
    title: 'Nueva Caracterización',
    type: 'ex_ante',
    pages: [{ id: 'p1', title: 'Página 1', fields: [] }],
    status: 'draft'
  })
  const [activePageIdx, setActivePageIdx] = useState(0)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [toast, setToast] = useState('')

  const activePage = form.pages![activePageIdx]

  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: `f_${Date.now()}`,
      type,
      label: `Nueva pregunta (${type})`,
      required: false,
      options: ['select', 'multi_select', 'radio', 'checkbox'].includes(type) 
        ? [{ label: 'Opción 1', value: 'op1' }] 
        : undefined
    }
    const newPages = [...form.pages!]
    newPages[activePageIdx].fields.push(newField)
    setForm({ ...form, pages: newPages })
    setSelectedFieldId(newField.id)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const newPages = [...form.pages!]
    newPages[activePageIdx].fields = newPages[activePageIdx].fields.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    )
    setForm({ ...form, pages: newPages })
  }

  const deleteField = (fieldId: string) => {
    const newPages = [...form.pages!]
    newPages[activePageIdx].fields = newPages[activePageIdx].fields.filter(f => f.id !== fieldId)
    setForm({ ...form, pages: newPages })
    setSelectedFieldId(null)
  }

  const addPage = () => {
    setForm({
      ...form,
      pages: [...form.pages!, { id: `p_${Date.now()}`, title: `Página ${form.pages!.length + 1}`, fields: [] }]
    })
    setActivePageIdx(form.pages!.length)
  }

  const handleSave = async () => {
    if (!user?.entityId) return
    setSaving(true)
    try {
      const payload = {
        entity_id: user.entityId,
        title: form.title,
        type: form.type,
        definition: JSON.stringify(form.pages),
        status: form.status,
        version: 1,
      }
      
      await databases.createDocument(DATABASE_ID, COLLECTION_IDS.FORMS, ID.unique(), payload)
      setToast('Formulario guardado con éxito')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      console.error(err)
      setToast('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <TopBar 
        title={form.title || 'Diseño de Formulario'}
        subtitle="Constructor universal de caracterizaciones"
        actions={
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setPreview(!preview)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              {preview ? <Layout size={18} /> : <Eye size={18} />}
              {preview ? 'Editar' : 'Vista Previa'}
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
              style={{ background: COLORS.primary }}
            >
              <Save size={18} />
              {saving ? 'Guardando...' : 'Publicar Formulario'}
            </button>
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbox */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Herramientas</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {['Básico', 'Selección', 'Media', 'Geografía', 'Lógica', 'Complejo', 'Contacto', 'Varios'].map(cat => (
              <div key={cat}>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 px-2 flex items-center gap-2">
                  <span className="w-1 h-3 bg-blue-500 rounded-full" /> {cat}
                </h4>
                <div className="grid grid-cols-1 gap-1">
                  {FIELD_TYPES.filter(t => t.category === cat).map(t => (
                    <button
                      key={t.type}
                      onClick={() => addField(t.type)}
                      className="flex items-center gap-3 p-2.5 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium text-xs group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <t.icon size={16} />
                      </div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 overflow-y-auto p-12 bg-slate-50/30">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Header Settings */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm border-t-4" style={{ borderColor: COLORS.primary }}>
               <input 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})}
                placeholder="Título del Formulario"
                className="text-2xl font-black text-slate-900 w-full focus:outline-none mb-2"
               />
               <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Descripción o instrucciones para el profesional..."
                className="text-sm text-slate-400 w-full resize-none focus:outline-none bg-transparent"
                rows={2}
               />
            </div>

            {/* Pagination Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {form.pages!.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setActivePageIdx(idx)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                    activePageIdx === idx 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {p.title}
                </button>
              ))}
              <button 
                onClick={addPage}
                className="w-10 h-10 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Field List */}
            <div className="space-y-4 min-h-[400px]">
              {activePage.fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white/50 border-2 border-dashed border-slate-200 rounded-[32px]">
                  <Layout size={40} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Arrastra o haz clic en una herramienta para comenzar</p>
                </div>
              ) : (
                <Reorder.Group axis="y" values={activePage.fields} onReorder={(newFields) => {
                  const newPages = [...form.pages!]
                  newPages[activePageIdx].fields = newFields
                  setForm({ ...form, pages: newPages })
                }} className="space-y-4">
                  {activePage.fields.map((f) => (
                    <Reorder.Item 
                      key={f.id} 
                      value={f}
                      onClick={() => setSelectedFieldId(f.id)}
                      className={`group relative bg-white p-6 rounded-3xl border transition-all cursor-pointer ${
                        selectedFieldId === f.id ? 'border-blue-500 shadow-xl shadow-blue-500/5 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="cursor-grab text-slate-200 group-hover:text-slate-400 trasition-colors">
                            <GripVertical size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {FIELD_TYPES.find(t => t.type === f.type)?.icon && (
                                <div className="text-slate-400" ><Layout size={14}/></div>
                              )}
                              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{f.type}</span>
                            </div>
                            <h4 className="font-bold text-slate-800">{f.label}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        </main>

        {/* Right Settings Sidebar */}
        <AnimatePresence>
          {selectedFieldId && (
            <motion.aside
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Settings2 size={18} className="text-slate-400" />
                  <h3 className="font-bold text-slate-900">Propiedades</h3>
                </div>
                <button onClick={() => setSelectedFieldId(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Find current field */}
                {(() => {
                  const f = activePage.fields.find(x => x.id === selectedFieldId)
                  if (!f) return null
                  return (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Etiqueta de Pregunta</label>
                        <input
                          value={f.label}
                          onChange={e => updateField(f.id, { label: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-700">Campo Obligatorio</span>
                        <button
                          onClick={() => updateField(f.id, { required: !f.required })}
                          className={`w-12 h-6 rounded-full relative transition-all ${f.required ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${f.required ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {['select', 'multi_select', 'radio', 'checkbox'].includes(f.type) && (
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Opciones</label>
                          <div className="space-y-2">
                            {f.options?.map((opt, oIdx) => (
                              <div key={oIdx} className="flex gap-2">
                                <input
                                  value={opt.label}
                                  onChange={e => {
                                    const newOpts = [...f.options!]
                                    newOpts[oIdx] = { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                                    updateField(f.id, { options: newOpts })
                                  }}
                                  placeholder={`Opción ${oIdx + 1}`}
                                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                                />
                                <button 
                                  onClick={() => {
                                    const newOpts = f.options!.filter((_, i) => i !== oIdx)
                                    updateField(f.id, { options: newOpts })
                                  }}
                                  className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newOpts = [...(f.options || []), { label: '', value: '' }]
                                updateField(f.id, { options: newOpts })
                              }}
                              className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={14} /> Añadir Opción
                            </button>
                          </div>
                        </div>
                      )}

                      {f.type === 'calculation' && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fórmula (Handlebars)</label>
                          <textarea
                            value={f.calculation}
                            onChange={e => updateField(f.id, { calculation: e.target.value })}
                            placeholder="Ej: {{valor_casa}} * 0.2"
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-mono focus:ring-2 focus:ring-blue-500/20"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl z-[100] font-bold text-sm animate-bounce flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          {toast}
        </div>
      )}
    </div>
  )
}
