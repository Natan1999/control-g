import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { MobileTopBar } from '@/components/layout/BottomNav'
import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = 'ex_ante' | 'encounter_1' | 'encounter_2' | 'encounter_3' | 'ex_post'

interface FamilyDoc {
  $id: string
  entity_id: string
  municipality_id: string
  professional_id: string
  first_name?: string
  first_lastname?: string
  id_number?: string
  ex_ante_status: string
  encounter_1_status: string
  encounter_2_status: string
  encounter_3_status: string
  ex_post_status: string
  ex_ante_date?: string
  encounter_1_date?: string
  encounter_2_date?: string
  encounter_3_date?: string
  ex_post_date?: string
  overall_status: string
}

const ACTIVITY_LABELS: Record<string, string> = {
  ex_ante: 'Caracterización Ex-Antes',
  encounter_1: 'Momento de Encuentro 1',
  encounter_2: 'Momento de Encuentro 2',
  encounter_3: 'Momento de Encuentro 3',
  ex_post: 'Caracterización Ex-Post',
}

// How many steps per activity type
const STEP_COUNT: Record<string, number> = {
  ex_ante: 3,
  encounter_1: 2,
  encounter_2: 2,
  encounter_3: 2,
  ex_post: 2,
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-xl font-semibold text-white text-sm max-w-[90vw] text-center ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
    >
      {message}
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <span className="text-xs text-muted-foreground font-semibold">Paso {current} de {total}</span>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i + 1 === current ? '20px' : '8px',
              background: i + 1 <= current ? '#1B3A4B' : '#D1D5DB',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Shared field components ──────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/40'
const selectCls = `${inputCls} bg-white`
const textareaCls = `${inputCls} resize-none`

// ─── Signature placeholder ────────────────────────────────────────────────────

function SignaturePlaceholder({ captured, onCapture }: { captured: boolean; onCapture: () => void }) {
  return (
    <div>
      <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 p-6 text-center min-h-[120px] flex flex-col items-center justify-center gap-2">
        {captured ? (
          <>
            <CheckCircle size={28} className="text-green-500" />
            <p className="text-sm font-semibold text-green-700">Firma registrada ✓</p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Firma del beneficiario</p>
            <p className="text-xs text-muted-foreground">Toca para capturar la firma</p>
          </>
        )}
      </div>
      {!captured && (
        <button
          type="button"
          onClick={onCapture}
          className="mt-2 w-full py-2.5 rounded-xl border border-[#1B3A4B] text-sm font-semibold transition-colors hover:bg-[#1B3A4B]/10"
          style={{ color: '#1B3A4B' }}
        >
          Capturar firma
        </button>
      )}
    </div>
  )
}

// ─── ExAnte steps ─────────────────────────────────────────────────────────────

function ExAnteStep1({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const age = data.birth_date
    ? Math.floor((Date.now() - new Date(data.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base">Datos Personales</h2>
      {[
        { key: 'first_name', label: 'Primer Nombre', required: true },
        { key: 'second_name', label: 'Segundo Nombre' },
        { key: 'first_lastname', label: 'Primer Apellido', required: true },
        { key: 'second_lastname', label: 'Segundo Apellido' },
      ].map(f => (
        <Field key={f.key} label={f.label} required={f.required}>
          <input
            type="text"
            className={inputCls}
            value={data[f.key] ?? ''}
            onChange={e => onChange({ ...data, [f.key]: e.target.value })}
          />
        </Field>
      ))}

      <Field label="Tipo de documento" required>
        <select className={selectCls} value={data.id_document_type ?? ''} onChange={e => onChange({ ...data, id_document_type: e.target.value })}>
          <option value="">Seleccionar...</option>
          {['Cédula de Ciudadanía', 'Tarjeta de Identidad', 'Pasaporte', 'Cédula Extranjería', 'Registro Civil'].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </Field>

      <Field label="Número de documento" required>
        <input type="text" className={inputCls} value={data.id_number ?? ''} onChange={e => onChange({ ...data, id_number: e.target.value })} />
      </Field>

      <Field label="Fecha de nacimiento">
        <input type="date" className={inputCls} value={data.birth_date ?? ''} onChange={e => onChange({ ...data, birth_date: e.target.value })} />
        {age !== null && age > 0 && (
          <p className="text-xs text-muted-foreground mt-1">Edad calculada: <strong>{age} años</strong></p>
        )}
      </Field>

      <Field label="Teléfono">
        <input type="tel" className={inputCls} value={data.phone ?? ''} onChange={e => onChange({ ...data, phone: e.target.value })} />
      </Field>

      <Field label="Zona" required>
        <div className="flex gap-4">
          {['Urbana', 'Rural'].map(z => (
            <label key={z} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="zone"
                value={z}
                checked={data.zone === z}
                onChange={() => onChange({ ...data, zone: z })}
                className="accent-[#1B3A4B]"
              />
              <span className="text-sm font-medium">{z}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Dirección">
        <input type="text" className={inputCls} value={data.address ?? ''} onChange={e => onChange({ ...data, address: e.target.value })} />
      </Field>

      <Field label="Indicaciones / Referencias">
        <textarea rows={2} className={textareaCls} value={data.directions ?? ''} onChange={e => onChange({ ...data, directions: e.target.value })} />
      </Field>
    </div>
  )
}

function ExAnteStep2({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const selectFields = [
    {
      key: 'gender', label: 'Género', required: true,
      options: ['Masculino', 'Femenino', 'Transgénero', 'No binario', 'No informa'],
    },
    {
      key: 'ethnic_group', label: 'Grupo Étnico',
      options: ['Afrocolombiano', 'Comunidad Negra', 'Afrodescendiente', 'Palenquero', 'Raizal', 'Room', 'Indígena', 'Mestizo', 'No reporta', 'Ninguno'],
    },
    {
      key: 'disability', label: 'Discapacidad',
      options: ['Auditiva', 'Visual', 'Sordoceguera', 'Intelectual', 'Psicosocial', 'Física', 'Múltiple', 'Ninguna'],
    },
    {
      key: 'differential_factor', label: 'Factor Diferencial',
      options: ['Víctima', 'Campesino', 'Joven Rural', 'Mujer Campesina', 'Mujer Rural', 'Mujer Pesquera', 'Desmovilizado', 'Reincorporado', 'No aplica'],
    },
  ]

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base">Caracterización Social</h2>
      {selectFields.map(f => (
        <Field key={f.key} label={f.label} required={f.required}>
          <select className={selectCls} value={data[f.key] ?? ''} onChange={e => onChange({ ...data, [f.key]: e.target.value })}>
            <option value="">Seleccionar...</option>
            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      ))}

      <Field label="Número de dependientes">
        <input
          type="number"
          min="0"
          className={inputCls}
          value={data.dependents ?? ''}
          onChange={e => onChange({ ...data, dependents: parseInt(e.target.value) || 0 })}
        />
      </Field>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-border p-4">
        <span className="text-sm font-semibold">¿Requiere acompañante?</span>
        <button
          type="button"
          onClick={() => onChange({ ...data, companion_required: !data.companion_required })}
          className={cn(
            'w-12 h-6 rounded-full transition-colors relative',
            data.companion_required ? 'bg-[#1B3A4B]' : 'bg-gray-200'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            data.companion_required ? 'translate-x-6' : 'translate-x-0.5'
          )} />
        </button>
      </div>

      {data.companion_required && (
        <div className="space-y-3 pl-4 border-l-2 border-[#1B3A4B]/30">
          {[
            { key: 'companion_name', label: 'Nombre del acompañante' },
            { key: 'companion_document', label: 'Documento del acompañante' },
            { key: 'companion_relationship', label: 'Parentesco' },
          ].map(f => (
            <Field key={f.key} label={f.label}>
              <input
                type="text"
                className={inputCls}
                value={data[f.key] ?? ''}
                onChange={e => onChange({ ...data, [f.key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Evidence step (shared for all final steps) ───────────────────────────────

function EvidenceStep({
  data,
  onChange,
  signatureCaptured,
  onCaptureSignature,
}: {
  data: any
  onChange: (d: any) => void
  signatureCaptured: boolean
  onCaptureSignature: () => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base">Evidencia</h2>

      <Field label="Fecha de la actividad" required>
        <input
          type="date"
          className={inputCls}
          value={data.activity_date ?? ''}
          onChange={e => onChange({ ...data, activity_date: e.target.value })}
        />
      </Field>

      <Field label="Fotografía de evidencia">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:text-white file:cursor-pointer"
          style={{ '--file-bg': '#1B3A4B' } as any}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onChange({ ...data, _photoFile: file })
          }}
        />
        {data._photoFile && (
          <p className="text-xs text-green-600 font-medium mt-1">Foto seleccionada: {data._photoFile.name}</p>
        )}
      </Field>

      <Field label="Firma del beneficiario">
        <SignaturePlaceholder captured={signatureCaptured} onCapture={onCaptureSignature} />
      </Field>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.consent ?? false}
          onChange={e => onChange({ ...data, consent: e.target.checked })}
          className="mt-0.5 w-4 h-4 rounded accent-[#1B3A4B]"
        />
        <span className="text-sm text-foreground leading-relaxed">
          El usuario acepta la política de tratamiento de datos personales y certifica que la información suministrada es veraz.
        </span>
      </label>
    </div>
  )
}

// ─── Encounter steps ──────────────────────────────────────────────────────────

function EncounterStep1({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base">Datos de la visita</h2>
      <Field label="Fecha de la actividad" required>
        <input type="date" className={inputCls} value={data.activity_date ?? ''} onChange={e => onChange({ ...data, activity_date: e.target.value })} />
      </Field>
      <Field label="Tema tratado">
        <input type="text" className={inputCls} placeholder="Tema tratado" value={data.topic ?? ''} onChange={e => onChange({ ...data, topic: e.target.value })} />
      </Field>
      <Field label="Temáticas desarrolladas">
        <textarea rows={4} className={textareaCls} placeholder="Describe las temáticas desarrolladas en la visita..." value={data.description ?? ''} onChange={e => onChange({ ...data, description: e.target.value })} />
      </Field>
    </div>
  )
}

// ─── ExPost steps ─────────────────────────────────────────────────────────────

function ExPostStep1({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base">Evaluación Final</h2>
      <Field label="Fecha de la actividad" required>
        <input type="date" className={inputCls} value={data.activity_date ?? ''} onChange={e => onChange({ ...data, activity_date: e.target.value })} />
      </Field>
      <Field label="¿El programa generó un impacto positivo?" required>
        <div className="flex gap-4">
          {['Sí', 'No'].map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="positive_impact"
                value={v}
                checked={data.positive_impact === (v === 'Sí')}
                onChange={() => onChange({ ...data, positive_impact: v === 'Sí' })}
                className="accent-[#1B3A4B]"
              />
              <span className="text-sm font-medium">{v}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Evaluación del programa (opcional)">
        <textarea rows={3} className={textareaCls} placeholder="Comentarios sobre el programa..." value={data.program_evaluation ?? ''} onChange={e => onChange({ ...data, program_evaluation: e.target.value })} />
      </Field>
      <Field label="Evaluación del profesional (opcional)">
        <textarea rows={3} className={textareaCls} placeholder="Autoevaluación del profesional..." value={data.professional_evaluation ?? ''} onChange={e => onChange({ ...data, professional_evaluation: e.target.value })} />
      </Field>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActivityFormPage() {
  const { familyId, activityType } = useParams<{ familyId: string; activityType: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [family, setFamily] = useState<FamilyDoc | null>(null)
  const [loadingFamily, setLoadingFamily] = useState(true)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<any>({
    activity_date: new Date().toISOString().slice(0, 10),
    consent: false,
  })
  const [signatureCaptured, setSignatureCaptured] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const actType = (activityType as ActivityType) ?? 'ex_ante'
  const totalSteps = STEP_COUNT[actType] ?? 2
  const title = ACTIVITY_LABELS[actType] ?? 'Actividad'

  useEffect(() => {
    if (!familyId) return
    setLoadingFamily(true)
    databases.getDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, familyId)
      .then(doc => setFamily(doc as unknown as FamilyDoc))
      .catch(() => setFamily(null))
      .finally(() => setLoadingFamily(false))
  }, [familyId])

  function getExistingDates(fam: FamilyDoc): string[] {
    return [fam.ex_ante_date, fam.encounter_1_date, fam.encounter_2_date, fam.encounter_3_date, fam.ex_post_date]
      .filter(Boolean) as string[]
  }

  function validateCurrentStep(): string | null {
    if (actType === 'ex_ante' && step === 1) {
      if (!formData.first_name?.trim()) return 'El primer nombre es obligatorio.'
      if (!formData.first_lastname?.trim()) return 'El primer apellido es obligatorio.'
      if (!formData.id_document_type) return 'Selecciona el tipo de documento.'
      if (!formData.id_number?.trim()) return 'El número de documento es obligatorio.'
      if (!formData.zone) return 'Selecciona la zona (Urbana / Rural).'
    }
    if (actType === 'ex_ante' && step === 2) {
      if (!formData.gender) return 'Selecciona el género.'
    }
    return null
  }

  function validateFinal(): string | null {
    if (!formData.activity_date) return 'La fecha de la actividad es obligatoria.'
    if (!formData.consent) return 'Debes confirmar el consentimiento del beneficiario.'
    if (family) {
      const existingDates = getExistingDates(family)
      if (existingDates.includes(formData.activity_date)) {
        return 'Ya existe una actividad registrada en esa fecha para esta familia. Por favor selecciona otra fecha.'
      }
    }
    return null
  }

  function handleNext() {
    const err = validateCurrentStep()
    if (err) { setToast({ message: err, type: 'error' }); return }
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  function handleBack() {
    if (step === 1) { navigate(-1); return }
    setStep(s => s - 1)
    window.scrollTo(0, 0)
  }

  async function handleSubmit() {
    const err = validateFinal()
    if (err) { setToast({ message: err, type: 'error' }); return }
    if (!family || !user?.id) return

    setSubmitting(true)
    try {
      // Build activity document fields
      const activityDoc: Record<string, any> = {
        entity_id: family.entity_id,
        family_id: family.$id,
        professional_id: user.id,
        municipality_id: family.municipality_id,
        activity_type: actType,
        activity_date: formData.activity_date,
        local_id: ID.unique(),
        status: 'synced',
      }

      // Add type-specific fields
      if (actType === 'ex_ante') {
        Object.assign(activityDoc, {
          first_name: formData.first_name,
          second_name: formData.second_name,
          first_lastname: formData.first_lastname,
          second_lastname: formData.second_lastname,
          id_document_type: formData.id_document_type,
          id_number: formData.id_number,
          birth_date: formData.birth_date,
          phone: formData.phone,
          zone: formData.zone,
          address: formData.address,
          directions: formData.directions,
          gender: formData.gender,
          ethnic_group: formData.ethnic_group,
          disability: formData.disability,
          differential_factor: formData.differential_factor,
          dependents: formData.dependents ?? 0,
          companion_required: formData.companion_required ?? false,
          companion_name: formData.companion_name,
          companion_document: formData.companion_document,
          companion_relationship: formData.companion_relationship,
        })
      } else if (['encounter_1', 'encounter_2', 'encounter_3'].includes(actType)) {
        Object.assign(activityDoc, {
          topic: formData.topic,
          description: formData.description,
        })
      } else if (actType === 'ex_post') {
        Object.assign(activityDoc, {
          positive_impact: formData.positive_impact,
          program_evaluation: formData.program_evaluation,
          professional_evaluation: formData.professional_evaluation,
        })
      }

      // Signature placeholder (base64 dummy for MVP)
      if (signatureCaptured) {
        activityDoc.beneficiary_signature_url = 'data:text/plain;base64,c2lnbmF0dXJlX2NhcHR1cmVk'
      }

      await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, ID.unique(), activityDoc)

      // Update family document
      const familyUpdates: Record<string, any> = {}
      const statusKey = `${actType}_status`
      const dateKey = `${actType}_date`
      familyUpdates[statusKey] = 'completed'
      familyUpdates[dateKey] = formData.activity_date

      // Also update family personal data if ex_ante
      if (actType === 'ex_ante') {
        if (formData.first_name) familyUpdates.first_name = formData.first_name
        if (formData.first_lastname) familyUpdates.first_lastname = formData.first_lastname
        if (formData.id_number) familyUpdates.id_number = formData.id_number
      }

      // Compute new overall_status
      const newStatuses = {
        ex_ante: actType === 'ex_ante' ? 'completed' : family.ex_ante_status,
        encounter_1: actType === 'encounter_1' ? 'completed' : family.encounter_1_status,
        encounter_2: actType === 'encounter_2' ? 'completed' : family.encounter_2_status,
        encounter_3: actType === 'encounter_3' ? 'completed' : family.encounter_3_status,
        ex_post: actType === 'ex_post' ? 'completed' : family.ex_post_status,
      }
      const allDone = Object.values(newStatuses).every(s => s === 'completed')
      const anyDone = Object.values(newStatuses).some(s => s === 'completed')
      familyUpdates.overall_status = allDone ? 'completed' : anyDone ? 'in_progress' : 'pending'

      await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, family.$id, familyUpdates)

      setToast({ message: 'Actividad registrada exitosamente', type: 'success' })
      setTimeout(() => navigate('/field/families'), 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la actividad'
      setToast({ message: msg, type: 'error' })
    }
    setSubmitting(false)
  }

  if (loadingFamily) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTopBar title={title} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Cargando familia...</div>
        </div>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTopBar title={title} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground text-sm">No se pudo cargar la información de la familia.</p>
          <button
            onClick={() => navigate('/field/families')}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: '#1B3A4B' }}
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  const familyName = `${family.first_name ?? ''} ${family.first_lastname ?? ''}`.trim()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Custom top bar with back arrow */}
      <div className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} style={{ color: '#1B3A4B' }} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-foreground truncate">{title}</div>
            {familyName && (
              <div className="text-xs text-muted-foreground truncate">{familyName}</div>
            )}
          </div>
        </div>
        <StepIndicator current={step} total={totalSteps} />
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          {/* ExAnte */}
          {actType === 'ex_ante' && step === 1 && (
            <ExAnteStep1 data={formData} onChange={setFormData} />
          )}
          {actType === 'ex_ante' && step === 2 && (
            <ExAnteStep2 data={formData} onChange={setFormData} />
          )}
          {actType === 'ex_ante' && step === 3 && (
            <EvidenceStep
              data={formData}
              onChange={setFormData}
              signatureCaptured={signatureCaptured}
              onCaptureSignature={() => setSignatureCaptured(true)}
            />
          )}

          {/* Encounters */}
          {['encounter_1', 'encounter_2', 'encounter_3'].includes(actType) && step === 1 && (
            <EncounterStep1 data={formData} onChange={setFormData} />
          )}
          {['encounter_1', 'encounter_2', 'encounter_3'].includes(actType) && step === 2 && (
            <EvidenceStep
              data={formData}
              onChange={setFormData}
              signatureCaptured={signatureCaptured}
              onCaptureSignature={() => setSignatureCaptured(true)}
            />
          )}

          {/* ExPost */}
          {actType === 'ex_post' && step === 1 && (
            <ExPostStep1 data={formData} onChange={setFormData} />
          )}
          {actType === 'ex_post' && step === 2 && (
            <EvidenceStep
              data={formData}
              onChange={setFormData}
              signatureCaptured={signatureCaptured}
              onCaptureSignature={() => setSignatureCaptured(true)}
            />
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="sticky bottom-0 bg-white border-t border-border px-4 py-3 flex gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </button>
        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-[2] py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: '#1B3A4B' }}
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-[2] py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
            style={{ background: '#27AE60' }}
          >
            {submitting ? 'Guardando...' : 'FINALIZAR'}
          </button>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
