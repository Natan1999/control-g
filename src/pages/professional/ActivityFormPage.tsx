import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { MobileTopBar } from '@/components/layout/BottomNav'
import { databases, storage, DATABASE_ID, COLLECTION_IDS, BUCKET_IDS } from '@/lib/appwrite'
import { ID } from 'appwrite'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { localDB, type FamilyMember, type LocalCharacterization } from '@/lib/dexie-db'

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
  ex_ante:     'Caracterización Ex-Antes',
  encounter_1: 'Momento de Encuentro 1',
  encounter_2: 'Momento de Encuentro 2',
  encounter_3: 'Momento de Encuentro 3',
  ex_post:     'Caracterización Ex-Post',
}

const STEP_COUNT: Record<string, number> = {
  ex_ante:     4,
  encounter_1: 2,
  encounter_2: 2,
  encounter_3: 2,
  ex_post:     2,
}

// ─── Colombia departments (DIVIPOLA) ─────────────────────────────────────────

const DEPARTMENTS = [
  'Amazonas','Antioquia','Arauca','Atlántico','Bolívar','Boyacá','Caldas',
  'Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca',
  'Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño',
  'Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia',
  'Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada',
]

const MUNICIPALITIES_BY_DEPT: Record<string, string[]> = {
  'Bolívar': ['Cartagena de Indias','Mompós','El Carmen de Bolívar','Magangué','San Juan Nepomuceno',
    'Turbaco','Arjona','El Guamo','Mahates','San Jacinto','Altos del Rosario','Barranco de Loba',
    'Calamar','Cicuco','Córdoba','El Peñón','Hatillo de Loba','Margarita','Montecristo',
    'Norosí','Pinillos','Regidor','Río Viejo','San Cristóbal','San Estanislao','San Fernando',
    'San Jacinto del Cauca','San Martín de Loba','San Pablo','Santa Catalina','Santa Rosa',
    'Santa Rosa del Sur','Simití','Soplaviento','Talaigua Nuevo','Tiquisio','Villanueva','Zambrano'],
  'Cundinamarca': ['Bogotá D.C.','Soacha','Chía','Facatativá','Zipaquirá','Fusagasugá','Mosquera',
    'Madrid','Funza','Cajicá','Girardot','La Mesa','Silvania','Tocancipá','Sopó','Tabio','Tenjo'],
  'Antioquia': ['Medellín','Bello','Itagüí','Envigado','Apartadó','Turbo','Rionegro','Sabaneta',
    'Copacabana','Caldas','La Estrella','Barbosa','Girardota','Caucasia','Puerto Berrío'],
}

function getMunicipalities(dept: string): string[] {
  return MUNICIPALITIES_BY_DEPT[dept] ?? []
}

// ─── Catalog options ──────────────────────────────────────────────────────────

const TABLA_A = [
  { value: 'esposo',    label: 'Esposo(a)' },
  { value: 'hijo',      label: 'Hijo(a)' },
  { value: 'nieto',     label: 'Nieto(a)' },
  { value: 'cunado',    label: 'Cuñado(a)' },
  { value: 'suegro',    label: 'Suegro(a)' },
  { value: 'yerno',     label: 'Yerno(a)' },
  { value: 'hijastro',  label: 'Hijastro(a)' },
  { value: 'tio',       label: 'Tío(a)' },
  { value: 'primo',     label: 'Primo(a)' },
  { value: 'ninguno',   label: 'Ninguno' },
]
const TABLA_C = [
  { value: 'masculino',   label: 'Masculino' },
  { value: 'femenino',    label: 'Femenino' },
  { value: 'transgenero', label: 'Transgénero' },
  { value: 'no_informa',  label: 'No sabe / No informa' },
]
const TABLA_D = [
  { value: 'asexual',       label: 'Asexual' },
  { value: 'bisexual',      label: 'Bisexual' },
  { value: 'gay',           label: 'Gay' },
  { value: 'heterosexual',  label: 'Heterosexual' },
  { value: 'lesbiana',      label: 'Lesbiana' },
  { value: 'queer',         label: 'Queer' },
  { value: 'no_informa',    label: 'No sabe / No informa' },
]
const TABLA_E = [
  { value: 'primaria',     label: 'Primaria' },
  { value: 'secundaria',   label: 'Secundaria' },
  { value: 'tecnica',      label: 'Técnica o Tecnológica' },
  { value: 'profesional',  label: 'Profesional' },
  { value: 'postgrado',    label: 'Postgrado' },
  { value: 'no_informa',   label: 'No informa' },
]
const TABLA_F = [
  { value: 'comunidad_negra',  label: 'Comunidad Negra' },
  { value: 'afrocolombiano',   label: 'Afrocolombiano' },
  { value: 'afrodescendiente', label: 'Afrodescendiente' },
  { value: 'palenquero',       label: 'Palenquero' },
  { value: 'raizal',           label: 'Raizal' },
  { value: 'room',             label: 'Room' },
  { value: 'mestizo',          label: 'Mestizo' },
  { value: 'ninguno',          label: 'Ninguno' },
]
const TABLA_G = [
  { value: 'auditiva',    label: 'Auditiva' },
  { value: 'visual',      label: 'Visual' },
  { value: 'sordoceguera',label: 'Sordoceguera' },
  { value: 'intelectual', label: 'Intelectual' },
  { value: 'psicosocial', label: 'Psicosocial (Mental)' },
  { value: 'fisica',      label: 'Física' },
  { value: 'multiple',    label: 'Múltiple' },
  { value: 'ninguna',     label: 'Ninguna' },
]
const TABLA_H = [
  { value: 'victima',         label: 'Víctima' },
  { value: 'campesino',       label: 'Campesino' },
  { value: 'joven_rural',     label: 'Joven Rural' },
  { value: 'mujer_campesina', label: 'Mujer Campesina' },
  { value: 'mujer_rural',     label: 'Mujer Rural' },
  { value: 'mujer_pesquera',  label: 'Mujer Pesquera' },
]
const TABLA_I = [
  { value: 'desmovilizado', label: 'Desmovilizado' },
  { value: 'reincorporado', label: 'Reincorporado' },
  { value: 'reinsertado',   label: 'Reinsertado' },
  { value: 'reintegrado',   label: 'Reintegrado' },
  { value: 'ninguno',       label: 'Ninguno' },
  { value: 'no_informa',    label: 'No informa' },
]
const TABLA_J = [
  { value: 'soltero',     label: 'Soltero' },
  { value: 'casado',      label: 'Casado' },
  { value: 'union_libre', label: 'Unión Libre' },
  { value: 'separado',    label: 'Separado' },
  { value: 'divorciado',  label: 'Divorciado' },
  { value: 'viudo',       label: 'Viudo' },
]
const TABLA_K = [
  { value: 'comunitario',       label: 'Comunitario' },
  { value: 'jac',               label: 'JAC' },
  { value: 'religioso',         label: 'Religioso' },
  { value: 'politico',          label: 'Político' },
  { value: 'ambiental',         label: 'Ambiental' },
  { value: 'animalista',        label: 'Animalista' },
  { value: 'etnico',            label: 'Étnico' },
  { value: 'social',            label: 'Social' },
  { value: 'defensor_derechos', label: 'Defensor de Derechos' },
  { value: 'espiritual',        label: 'Espiritual' },
  { value: 'ninguno',           label: 'Ninguno' },
  { value: 'otro',              label: 'Otro' },
]
const TABLA_L = [
  { value: 'ti',        label: 'Tarjeta de Identidad (TI)' },
  { value: 'cc',        label: 'Cédula de Ciudadanía (CC)' },
  { value: 'ce',        label: 'Cédula de Extranjería (CE)' },
  { value: 'pasaporte', label: 'Pasaporte (PA)' },
  { value: 'rc',        label: 'Registro Civil (RC)' },
]

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B3A4B]/40 min-h-[48px]'
const selectCls = `${inputCls}`
const textareaCls = `${inputCls} resize-none`

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}
    </div>
  )
}

function Sel({ options, value, onChange, placeholder }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <select className={selectCls} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder ?? 'Seleccionar...'}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-24 left-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl font-semibold text-white text-sm text-center ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

function StepIndicator({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1" style={{ width: `${100 / total}%` }}>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
              i + 1 < step  ? 'bg-[#1B3A4B] border-[#1B3A4B] text-white' :
              i + 1 === step ? 'bg-white border-[#1B3A4B] text-[#1B3A4B]' :
                               'bg-white border-gray-300 text-gray-400'
            )}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span className={cn('text-[9px] font-semibold text-center leading-tight', i + 1 === step ? 'text-[#1B3A4B]' : 'text-gray-400')}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-gray-200 rounded-full">
        <div
          className="absolute left-0 top-0 h-1 rounded-full bg-[#1B3A4B] transition-all duration-500"
          style={{ width: `${((step - 1) / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ─── EX-ANTE STEP 1 — Ubicación ──────────────────────────────────────────────

interface ExAnteData {
  department: string
  municipalityName: string
  corregimiento: string
  vereda: string
  address: string
  activityDate: string
  headFirstName: string
  headSecondName: string
  headFirstLastname: string
  headSecondLastname: string
  headFamilyRole: string
  members: FamilyMember[]
  consentAccepted: boolean
}

function ExAnteStep1Location({ data, onChange, defaultDept }: { data: ExAnteData; onChange: (d: ExAnteData) => void; defaultDept?: string }) {
  const munis = getMunicipalities(data.department || defaultDept || '')

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base text-gray-900">Paso 1 — Ubicación Geográfica</h2>

      <Field label="Departamento" required>
        <select className={selectCls} value={data.department} onChange={e => onChange({ ...data, department: e.target.value, municipalityName: '' })}>
          <option value="">Seleccionar...</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>

      <Field label="Municipio" required>
        <select className={selectCls} value={data.municipalityName} onChange={e => onChange({ ...data, municipalityName: e.target.value })}>
          <option value="">Seleccionar...</option>
          {munis.map(m => <option key={m} value={m}>{m}</option>)}
          {munis.length === 0 && data.department && (
            <option value={data.department}>{data.department}</option>
          )}
        </select>
      </Field>

      <Field label="Corregimiento" hint="Escriba el nombre del corregimiento, si aplica">
        <input type="text" className={inputCls} maxLength={200} value={data.corregimiento} onChange={e => onChange({ ...data, corregimiento: e.target.value })} />
      </Field>

      <Field label="Vereda" hint="Escriba el nombre de la vereda, si aplica">
        <input type="text" className={inputCls} maxLength={200} value={data.vereda} onChange={e => onChange({ ...data, vereda: e.target.value })} />
      </Field>

      <Field label="Dirección" required hint="Dirección o descripción de cómo llegar al hogar">
        <input type="text" className={inputCls} maxLength={300} value={data.address} onChange={e => onChange({ ...data, address: e.target.value })} />
      </Field>

      <Field label="Fecha de la caracterización" required>
        <input
          type="date"
          className={inputCls}
          value={data.activityDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => onChange({ ...data, activityDate: e.target.value })}
        />
      </Field>
    </div>
  )
}

// ─── EX-ANTE STEP 2 — Cabeza de familia ──────────────────────────────────────

function ExAnteStep2Head({ data, onChange }: { data: ExAnteData; onChange: (d: ExAnteData) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base text-gray-900">Paso 2 — Cabeza de Familia</h2>

      <Field label="Primer Nombre" required hint="Como aparece en el documento de identidad">
        <input type="text" className={inputCls} maxLength={100} value={data.headFirstName} onChange={e => onChange({ ...data, headFirstName: e.target.value })} />
      </Field>

      <Field label="Segundo Nombre">
        <input type="text" className={inputCls} maxLength={100} value={data.headSecondName} onChange={e => onChange({ ...data, headSecondName: e.target.value })} />
      </Field>

      <Field label="Primer Apellido" required>
        <input type="text" className={inputCls} maxLength={100} value={data.headFirstLastname} onChange={e => onChange({ ...data, headFirstLastname: e.target.value })} />
      </Field>

      <Field label="Segundo Apellido">
        <input type="text" className={inputCls} maxLength={100} value={data.headSecondLastname} onChange={e => onChange({ ...data, headSecondLastname: e.target.value })} />
      </Field>

      <Field label="Rol en el Núcleo Familiar" required hint="Seleccione el rol de esta persona en la familia">
        <div className="space-y-2">
          {[
            { value: 'padre_cabeza',    label: 'Padre Cabeza de Familia' },
            { value: 'madre_cabeza',    label: 'Madre Cabeza de Familia' },
            { value: 'cuidador_cabeza', label: 'Cuidador Cabeza de Familia' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 min-h-[48px]">
              <input
                type="radio"
                name="headFamilyRole"
                value={opt.value}
                checked={data.headFamilyRole === opt.value}
                onChange={() => onChange({ ...data, headFamilyRole: opt.value })}
                className="accent-[#1B3A4B] w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-900">{opt.label}</span>
            </label>
          ))}
        </div>
      </Field>
    </div>
  )
}

// ─── EX-ANTE STEP 3 — Miembros del hogar ─────────────────────────────────────

function newMember(): FamilyMember {
  return {
    id: crypto.randomUUID(),
    familyBond: '',
    sex: 'hombre',
    genderIdentity: '',
    sexualOrientation: '',
    educationLevel: '',
    ethnicGroup: '',
    disability: '',
    specialCondition: '',
    peaceApproach: '',
    maritalStatus: '',
    leadershipType: null,
    birthDate: '',
    calculatedAge: 0,
    idDocumentType: '',
    idNumber: '',
    emailPrimary: null,
    emailSecondary: null,
    phonePrimary: null,
    phoneSecondary: null,
  }
}

function calcAge(birthDate: string): number {
  if (!birthDate) return 0
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return Math.max(0, age)
}

function MemberCard({
  member, index, total, onChange, onDelete, errors,
}: {
  member: FamilyMember
  index: number
  total: number
  onChange: (m: FamilyMember) => void
  onDelete: () => void
  errors: Record<string, string>
}) {
  const [expanded, setExpanded] = useState(true)
  const [socialOpen, setSocialOpen] = useState(false)
  const [extraOpen, setExtraOpen] = useState(false)

  function upd(partial: Partial<FamilyMember>) {
    const updated = { ...member, ...partial }
    if (partial.birthDate !== undefined) {
      updated.calculatedAge = calcAge(partial.birthDate ?? '')
    }
    onChange(updated)
  }

  const displayName = member.idNumber
    ? `Miembro ${index + 1} — Doc: ${member.idNumber}`
    : `Miembro ${index + 1} de ${total}`

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0">
          {expanded ? <ChevronUp size={16} className="text-gray-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />}
          <span className="text-sm font-semibold text-gray-900 truncate">{displayName}</span>
        </button>
        {total > 1 && (
          <button type="button" onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 flex-shrink-0">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Datos básicos */}
          <p className="text-xs font-bold text-[#1B3A4B] uppercase tracking-wider">Datos Básicos</p>

          <Field label="Vínculo con la Cabeza de Familia" required error={errors[`${member.id}_familyBond`]}>
            <Sel options={TABLA_A} value={member.familyBond} onChange={v => upd({ familyBond: v })} />
          </Field>

          <Field label="Sexo" required>
            <div className="flex gap-4">
              {[{ value: 'hombre', label: 'Hombre' }, { value: 'mujer', label: 'Mujer' }].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer min-h-[48px]">
                  <input type="radio" name={`sex_${member.id}`} value={opt.value}
                    checked={member.sex === opt.value} onChange={() => upd({ sex: opt.value as 'hombre' | 'mujer' })}
                    className="accent-[#1B3A4B] w-4 h-4" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Tipo de Documento" required error={errors[`${member.id}_idDocumentType`]}>
            <Sel options={TABLA_L} value={member.idDocumentType} onChange={v => upd({ idDocumentType: v })} />
          </Field>

          <Field label="Número de Documento" required hint="Solo números, sin puntos ni espacios" error={errors[`${member.id}_idNumber`]}>
            <input type="text" inputMode="numeric" className={inputCls} maxLength={15}
              value={member.idNumber} onChange={e => upd({ idNumber: e.target.value.replace(/\D/g, '') })} />
          </Field>

          <Field label="Fecha de Nacimiento" required error={errors[`${member.id}_birthDate`]}>
            <input type="date" className={inputCls}
              max={new Date().toISOString().split('T')[0]}
              value={member.birthDate}
              onChange={e => upd({ birthDate: e.target.value })} />
            {member.calculatedAge > 0 && (
              <p className="text-xs text-gray-500 mt-1">Edad calculada: <strong>{member.calculatedAge} años</strong></p>
            )}
          </Field>

          {/* Caracterización social — colapsable */}
          <button type="button" onClick={() => setSocialOpen(!socialOpen)}
            className="flex items-center justify-between w-full py-2 border-t border-gray-100">
            <span className="text-xs font-bold text-[#1B3A4B] uppercase tracking-wider">Caracterización Social</span>
            {socialOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>

          {socialOpen && (
            <div className="space-y-4 pl-2">
              <Field label="Identidad de Género" required error={errors[`${member.id}_genderIdentity`]}>
                <Sel options={TABLA_C} value={member.genderIdentity} onChange={v => upd({ genderIdentity: v })} />
              </Field>
              <Field label="Orientación Sexual" required error={errors[`${member.id}_sexualOrientation`]}>
                <Sel options={TABLA_D} value={member.sexualOrientation} onChange={v => upd({ sexualOrientation: v })} />
              </Field>
              <Field label="Enfoque Diferencial Poblacional" required error={errors[`${member.id}_ethnicGroup`]}>
                <Sel options={TABLA_F} value={member.ethnicGroup} onChange={v => upd({ ethnicGroup: v })} />
              </Field>
              <Field label="Discapacidad" required error={errors[`${member.id}_disability`]}>
                <Sel options={TABLA_G} value={member.disability} onChange={v => upd({ disability: v })} />
              </Field>
              <Field label="Condición Especial" required error={errors[`${member.id}_specialCondition`]}>
                <Sel options={TABLA_H} value={member.specialCondition} onChange={v => upd({ specialCondition: v })} />
              </Field>
              <Field label="Enfoque de Paz" required error={errors[`${member.id}_peaceApproach`]}>
                <Sel options={TABLA_I} value={member.peaceApproach} onChange={v => upd({ peaceApproach: v })} />
              </Field>
            </div>
          )}

          {/* Datos complementarios — colapsable */}
          <button type="button" onClick={() => setExtraOpen(!extraOpen)}
            className="flex items-center justify-between w-full py-2 border-t border-gray-100">
            <span className="text-xs font-bold text-[#1B3A4B] uppercase tracking-wider">Datos Complementarios</span>
            {extraOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>

          {extraOpen && (
            <div className="space-y-4 pl-2">
              <Field label="Nivel Escolar" required error={errors[`${member.id}_educationLevel`]}>
                <Sel options={TABLA_E} value={member.educationLevel} onChange={v => upd({ educationLevel: v })} />
              </Field>
              <Field label="Estado Civil" required error={errors[`${member.id}_maritalStatus`]}>
                <Sel options={TABLA_J} value={member.maritalStatus} onChange={v => upd({ maritalStatus: v })} />
              </Field>
              <Field label="Liderazgo">
                <Sel options={TABLA_K} value={member.leadershipType ?? ''} onChange={v => upd({ leadershipType: v || null })} />
              </Field>
              <Field label="Correo Electrónico" hint="Formato: usuario@correo.com">
                <input type="email" className={inputCls} value={member.emailPrimary ?? ''}
                  onChange={e => upd({ emailPrimary: e.target.value || null })} placeholder="Correo principal" />
                <input type="email" className={`${inputCls} mt-2`} value={member.emailSecondary ?? ''}
                  onChange={e => upd({ emailSecondary: e.target.value || null })} placeholder="Correo secundario (opcional)" />
              </Field>
              <Field label="Teléfono Celular" hint="Debe empezar con 3 y tener 10 dígitos" error={errors[`${member.id}_phone`]}>
                <input type="tel" inputMode="numeric" className={inputCls} maxLength={10}
                  value={member.phonePrimary ?? ''}
                  onChange={e => upd({ phonePrimary: e.target.value.replace(/\D/g, '') || null })}
                  placeholder="Teléfono principal" />
                <input type="tel" inputMode="numeric" className={`${inputCls} mt-2`} maxLength={10}
                  value={member.phoneSecondary ?? ''}
                  onChange={e => upd({ phoneSecondary: e.target.value.replace(/\D/g, '') || null })}
                  placeholder="Teléfono secundario (opcional)" />
              </Field>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExAnteStep3Members({ data, onChange }: { data: ExAnteData; onChange: (d: ExAnteData) => void }) {
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({})

  function addMember() {
    if (data.members.length >= 20) return
    onChange({ ...data, members: [...data.members, newMember()] })
  }

  function updateMember(index: number, m: FamilyMember) {
    const updated = [...data.members]
    updated[index] = m
    onChange({ ...data, members: updated })
  }

  function deleteMember(index: number) {
    const updated = data.members.filter((_, i) => i !== index)
    onChange({ ...data, members: updated })
  }

  // Expose validation via ref would be complex; instead validate inline
  useEffect(() => {
    const errs: Record<string, string> = {}
    const docNums = new Set<string>()
    for (const m of data.members) {
      if (!m.familyBond) errs[`${m.id}_familyBond`] = 'Seleccione el vínculo'
      if (!m.idDocumentType) errs[`${m.id}_idDocumentType`] = 'Seleccione tipo de documento'
      if (!m.idNumber || !/^\d{4,15}$/.test(m.idNumber)) errs[`${m.id}_idNumber`] = 'Solo números, 4-15 dígitos'
      else if (docNums.has(m.idNumber)) errs[`${m.id}_idNumber`] = 'Este número ya fue registrado'
      else docNums.add(m.idNumber)
      if (!m.birthDate) errs[`${m.id}_birthDate`] = 'Ingrese la fecha de nacimiento'
      if (m.phonePrimary && !/^3\d{9}$/.test(m.phonePrimary)) errs[`${m.id}_phone`] = 'El celular debe empezar con 3 y tener 10 dígitos'
    }
    setMemberErrors(errs)
  }, [data.members])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base text-gray-900">Paso 3 — Miembros del Hogar</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{data.members.length} miembro{data.members.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xs text-gray-500">Registre a cada miembro del hogar. Incluya también al cabeza de familia.</p>

      {data.members.map((member, i) => (
        <MemberCard
          key={member.id}
          member={member}
          index={i}
          total={data.members.length}
          onChange={m => updateMember(i, m)}
          onDelete={() => deleteMember(i)}
          errors={memberErrors}
        />
      ))}

      {data.members.length < 20 && (
        <button
          type="button"
          onClick={addMember}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-[#1B3A4B]/30 text-sm font-semibold text-[#1B3A4B] hover:bg-[#1B3A4B]/5 transition-colors min-h-[48px]"
        >
          <Plus size={18} />
          Agregar otro miembro del hogar
        </button>
      )}
    </div>
  )
}

// ─── EX-ANTE STEP 4 — Consentimiento y Firma ─────────────────────────────────

function ExAnteStep4Consent({ data, onChange, sigRef }: {
  data: ExAnteData
  onChange: (d: ExAnteData) => void
  sigRef: React.RefObject<SignatureCanvas | null>
}) {
  const [sigEmpty, setSigEmpty] = useState(true)

  function handleClear() {
    sigRef.current?.clear()
    setSigEmpty(true)
  }

  function handleSignEnd() {
    setSigEmpty(sigRef.current?.isEmpty() ?? true)
  }

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-base text-gray-900">Paso 4 — Consentimiento y Firma</h2>

      {/* Texto de consentimiento */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs text-blue-900 leading-relaxed">
          En cumplimiento de la <strong>Ley 1581 de 2012</strong> y su Decreto Reglamentario 1377 de 2013,
          autorizo el tratamiento de mis datos personales y los de los miembros de mi hogar.
          La información suministrada es veraz y puede ser verificada.
          Autorizo el uso de registros fotográficos como evidencia de las actividades realizadas.
        </p>
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl border border-gray-200 hover:bg-gray-50">
        <input
          type="checkbox"
          checked={data.consentAccepted}
          onChange={e => onChange({ ...data, consentAccepted: e.target.checked })}
          className="mt-0.5 w-5 h-5 rounded accent-[#1B3A4B] flex-shrink-0"
        />
        <span className="text-sm text-gray-900 leading-relaxed">
          El usuario acepta la política de tratamiento de datos personales y certifica que la
          información suministrada es veraz.
        </span>
      </label>

      {/* Signature pad */}
      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
          Firma del Beneficiario <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">Pida al miembro de la familia que firme aquí con su dedo</p>
        <div className="border-2 border-gray-300 rounded-2xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
          <SignatureCanvas
            ref={sigRef as React.RefObject<SignatureCanvas>}
            canvasProps={{ width: 340, height: 160, className: 'w-full' }}
            backgroundColor="white"
            onEnd={handleSignEnd}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          {!sigEmpty ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
              <CheckCircle size={14} /> Firma registrada
            </span>
          ) : (
            <span className="text-xs text-gray-400">Dibuje la firma en el recuadro</span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 min-h-[36px]"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ENCOUNTER STEPS ──────────────────────────────────────────────────────────

function EncounterStep1({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base text-gray-900">Datos de la visita</h2>
      <Field label="Fecha de la actividad" required>
        <input type="date" className={inputCls} value={data.activity_date ?? ''}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => onChange({ ...data, activity_date: e.target.value })} />
      </Field>
      <Field label="Tema tratado">
        <input type="text" className={inputCls} placeholder="Tema tratado en esta visita"
          value={data.topic ?? ''} onChange={e => onChange({ ...data, topic: e.target.value })} />
      </Field>
      <Field label="Temáticas desarrolladas">
        <textarea rows={4} className={textareaCls} placeholder="Describe las temáticas desarrolladas..."
          value={data.description ?? ''} onChange={e => onChange({ ...data, description: e.target.value })} />
      </Field>
    </div>
  )
}

function EvidenceStep({ data, onChange, sigRef }: { data: any; onChange: (d: any) => void; sigRef: React.RefObject<SignatureCanvas | null> }) {
  const [sigEmpty, setSigEmpty] = useState(true)

  function handleClear() { sigRef.current?.clear(); setSigEmpty(true) }
  function handleSignEnd() { setSigEmpty(sigRef.current?.isEmpty() ?? true) }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base text-gray-900">Evidencia</h2>

      <Field label="Fotografía de evidencia">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#1B3A4B] file:text-white cursor-pointer min-h-[48px]"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onChange({ ...data, _photoFile: file })
          }}
        />
        {data._photoFile && <p className="text-xs text-green-600 font-medium mt-1">Foto: {data._photoFile.name}</p>}
      </Field>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
          Firma del Beneficiario
        </label>
        <p className="text-xs text-gray-500 mb-3">Firma con el dedo en el recuadro</p>
        <div className="border-2 border-gray-300 rounded-2xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
          <SignatureCanvas
            ref={sigRef as React.RefObject<SignatureCanvas>}
            canvasProps={{ width: 340, height: 140, className: 'w-full' }}
            backgroundColor="white"
            onEnd={handleSignEnd}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          {!sigEmpty ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700"><CheckCircle size={14} /> Firma registrada</span>
          ) : (
            <span className="text-xs text-gray-400">Dibuje la firma</span>
          )}
          <button type="button" onClick={handleClear} className="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100">Limpiar</button>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.consent ?? false}
          onChange={e => onChange({ ...data, consent: e.target.checked })}
          className="mt-0.5 w-5 h-5 rounded accent-[#1B3A4B] flex-shrink-0"
        />
        <span className="text-sm text-gray-900 leading-relaxed">
          El usuario acepta la política de tratamiento de datos personales y certifica que la información suministrada es veraz.
        </span>
      </label>
    </div>
  )
}

// ─── EX-POST STEP ─────────────────────────────────────────────────────────────

function ExPostStep1({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-base text-gray-900">Evaluación Final</h2>
      <Field label="Fecha de la actividad" required>
        <input type="date" className={inputCls} value={data.activity_date ?? ''}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => onChange({ ...data, activity_date: e.target.value })} />
      </Field>
      <Field label="¿El programa generó un impacto positivo?" required>
        <div className="flex gap-4">
          {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }].map(({ v, l }) => (
            <label key={l} className="flex items-center gap-2 cursor-pointer min-h-[48px]">
              <input type="radio" name="positive_impact" checked={data.positive_impact === v}
                onChange={() => onChange({ ...data, positive_impact: v })}
                className="accent-[#1B3A4B] w-4 h-4" />
              <span className="text-sm font-medium">{l}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Evaluación del programa">
        <textarea rows={3} className={textareaCls} placeholder="Comentarios sobre el programa..."
          value={data.program_evaluation ?? ''} onChange={e => onChange({ ...data, program_evaluation: e.target.value })} />
      </Field>
      <Field label="Autoevaluación del Profesional">
        <textarea rows={3} className={textareaCls} placeholder="Autoevaluación..."
          value={data.professional_evaluation ?? ''} onChange={e => onChange({ ...data, professional_evaluation: e.target.value })} />
      </Field>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const EX_ANTE_STEP_LABELS = ['Ubicación', 'Cabeza', 'Miembros', 'Consentimiento']

function initExAnteData(): ExAnteData {
  return {
    department: '',
    municipalityName: '',
    corregimiento: '',
    vereda: '',
    address: '',
    activityDate: new Date().toISOString().split('T')[0],
    headFirstName: '',
    headSecondName: '',
    headFirstLastname: '',
    headSecondLastname: '',
    headFamilyRole: '',
    members: [newMember()],
    consentAccepted: false,
  }
}

export default function ActivityFormPage() {
  const { familyId, activityType } = useParams<{ familyId: string; activityType: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [family, setFamily] = useState<FamilyDoc | null>(null)
  const [loadingFamily, setLoadingFamily] = useState(true)
  const [step, setStep] = useState(1)

  // ExAnte data (structured)
  const [exAnteData, setExAnteData] = useState<ExAnteData>(initExAnteData)
  // Other activity data (flat)
  const [formData, setFormData] = useState<any>({
    activity_date: new Date().toISOString().split('T')[0],
    consent: false,
  })

  const sigRef = useRef<SignatureCanvas | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [autoSaveMsg, setAutoSaveMsg] = useState('')

  const actType = (activityType as ActivityType) ?? 'ex_ante'
  const totalSteps = STEP_COUNT[actType] ?? 2
  const title = ACTIVITY_LABELS[actType] ?? 'Actividad'

  useEffect(() => {
    if (!familyId) return
    setLoadingFamily(true)
    databases.getDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, familyId)
      .then(doc => {
        const fam = doc as unknown as FamilyDoc
        setFamily(fam)
        // Preselect entity's department/municipality for ex_ante
        if (actType === 'ex_ante') {
          setExAnteData(d => ({
            ...d,
            department: (fam as any).department ?? '',
          }))
        }
      })
      .catch(() => setFamily(null))
      .finally(() => setLoadingFamily(false))
  }, [familyId, actType])

  // Auto-save to IndexedDB when ex_ante data changes
  const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback(() => {
    if (actType !== 'ex_ante' || !familyId || !user?.id) return
    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current)
    autosaveTimeout.current = setTimeout(async () => {
      try {
        const draft: LocalCharacterization = {
          localId: `draft_${familyId}`,
          familyId,
          entityId: family?.entity_id ?? '',
          municipalityId: family?.municipality_id ?? null,
          professionalId: user.id,
          department: exAnteData.department,
          municipalityName: exAnteData.municipalityName,
          corregimiento: exAnteData.corregimiento || null,
          vereda: exAnteData.vereda || null,
          address: exAnteData.address,
          activityDate: exAnteData.activityDate,
          headFirstName: exAnteData.headFirstName,
          headSecondName: exAnteData.headSecondName || null,
          headFirstLastname: exAnteData.headFirstLastname,
          headSecondLastname: exAnteData.headSecondLastname || null,
          headFamilyRole: exAnteData.headFamilyRole as LocalCharacterization['headFamilyRole'],
          members: exAnteData.members,
          consentAccepted: exAnteData.consentAccepted,
          beneficiarySignatureDataUrl: null,
          latitude: null,
          longitude: null,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncedAt: null,
        }
        await localDB.characterizations.put(draft)
        setAutoSaveMsg('Guardado automáticamente ✓')
        setTimeout(() => setAutoSaveMsg(''), 2000)
      } catch { /* silent */ }
    }, 500)
  }, [actType, familyId, user?.id, family, exAnteData])

  useEffect(() => { autoSave() }, [exAnteData, autoSave])

  // Auto-save encounter/ex-post formData to localStorage (simpler — no signatures/blobs)
  const encounterSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (actType === 'ex_ante' || !familyId) return
    if (encounterSaveTimeout.current) clearTimeout(encounterSaveTimeout.current)
    encounterSaveTimeout.current = setTimeout(() => {
      try {
        const key = `cg_draft_${actType}_${familyId}`
        const toSave = { ...formData, _photoFile: undefined } // exclude File object
        localStorage.setItem(key, JSON.stringify(toSave))
        setAutoSaveMsg('Guardado automáticamente ✓')
        setTimeout(() => setAutoSaveMsg(''), 2000)
      } catch { /* silent */ }
    }, 500)
  }, [formData, actType, familyId])

  // Restore encounter draft on mount
  useEffect(() => {
    if (actType === 'ex_ante' || !familyId) return
    try {
      const key = `cg_draft_${actType}_${familyId}`
      const raw = localStorage.getItem(key)
      if (raw) {
        const saved = JSON.parse(raw)
        setFormData((prev: any) => ({ ...prev, ...saved }))
      }
    } catch { /* silent */ }
  }, [actType, familyId])

  // Restore draft on mount
  useEffect(() => {
    if (actType !== 'ex_ante' || !familyId) return
    localDB.characterizations.get(`draft_${familyId}`).then(draft => {
      if (draft && draft.status === 'draft') {
        setExAnteData({
          department: draft.department,
          municipalityName: draft.municipalityName,
          corregimiento: draft.corregimiento ?? '',
          vereda: draft.vereda ?? '',
          address: draft.address,
          activityDate: draft.activityDate,
          headFirstName: draft.headFirstName,
          headSecondName: draft.headSecondName ?? '',
          headFirstLastname: draft.headFirstLastname,
          headSecondLastname: draft.headSecondLastname ?? '',
          headFamilyRole: draft.headFamilyRole ?? '',
          members: draft.members.length > 0 ? draft.members : [newMember()],
          consentAccepted: draft.consentAccepted,
        })
      }
    }).catch(() => {})
  }, [actType, familyId])

  function getExistingDates(fam: FamilyDoc): string[] {
    return [fam.ex_ante_date, fam.encounter_1_date, fam.encounter_2_date,
            fam.encounter_3_date, fam.ex_post_date].filter(Boolean) as string[]
  }

  function validateExAnteStep(): string | null {
    if (step === 1) {
      if (!exAnteData.department) return 'Selecciona el departamento.'
      if (!exAnteData.municipalityName) return 'Selecciona el municipio.'
      if (!exAnteData.address.trim()) return 'La dirección es necesaria.'
      if (!exAnteData.activityDate) return 'La fecha es obligatoria.'
    }
    if (step === 2) {
      if (!exAnteData.headFirstName.trim() || exAnteData.headFirstName.trim().length < 2) return 'Ingrese el primer nombre.'
      if (!exAnteData.headFirstLastname.trim() || exAnteData.headFirstLastname.trim().length < 2) return 'Ingrese el primer apellido.'
      if (!exAnteData.headFamilyRole) return 'Selecciona el rol en el núcleo familiar.'
    }
    if (step === 3) {
      const docNums = new Set<string>()
      for (const m of exAnteData.members) {
        if (!m.familyBond) return 'Complete el vínculo familiar de todos los miembros.'
        if (!m.idDocumentType) return 'Complete el tipo de documento de todos los miembros.'
        if (!m.idNumber || !/^\d{4,15}$/.test(m.idNumber)) return 'Número de documento inválido en algún miembro (4-15 dígitos).'
        if (docNums.has(m.idNumber)) return `Número de documento duplicado: ${m.idNumber}`
        docNums.add(m.idNumber)
        if (!m.birthDate) return 'Ingrese la fecha de nacimiento de todos los miembros.'
      }
    }
    if (step === 4) {
      if (!exAnteData.consentAccepted) return 'Es necesario aceptar el tratamiento de datos.'
      if (!sigRef.current || sigRef.current.isEmpty()) return 'La firma del beneficiario es necesaria.'
      if (family) {
        const existing = getExistingDates(family)
        if (existing.includes(exAnteData.activityDate)) return 'Ya existe una actividad en esa fecha. Selecciona otra.'
      }
    }
    return null
  }

  function validateEncounterStep(): string | null {
    if (!formData.activity_date) return 'La fecha de la actividad es obligatoria.'
    if (step === totalSteps) {
      if (!formData.consent) return 'Debes confirmar el consentimiento del beneficiario.'
      if (family) {
        const existing = getExistingDates(family)
        if (existing.includes(formData.activity_date)) return 'Ya existe una actividad en esa fecha. Selecciona otra.'
      }
    }
    return null
  }

  function handleNext() {
    const err = actType === 'ex_ante' ? validateExAnteStep() : validateEncounterStep()
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
    const err = actType === 'ex_ante' ? validateExAnteStep() : validateEncounterStep()
    if (err) { setToast({ message: err, type: 'error' }); return }
    if (!family || !user?.id) return

    setSubmitting(true)
    try {
      let signatureDataUrl: string | null = null
      if (sigRef.current && !sigRef.current.isEmpty()) {
        signatureDataUrl = sigRef.current.toDataURL('image/png')
      }

      // Upload photo if present (encounters/ex-post)
      let photoUrl: string | null = null
      const photoFile = formData._photoFile as File | undefined
      if (photoFile && navigator.onLine) {
        try {
          const uploaded = await storage.createFile(
            BUCKET_IDS.FIELD_PHOTOS,
            ID.unique(),
            photoFile
          )
          photoUrl = uploaded.$id
        } catch { /* photo upload failure is non-blocking */ }
      } else if (photoFile && !navigator.onLine) {
        // Queue photo for upload when online
        try {
          await localDB.mediaQueue.add({
            id: ID.unique(),
            activityLocalId: 'pending',
            file: photoFile,
            name: photoFile.name,
            mimeType: photoFile.type,
            bucketId: BUCKET_IDS.FIELD_PHOTOS,
            status: 'pending',
          })
        } catch { /* silent */ }
      }

      const activityDoc: Record<string, any> = {
        entity_id: family.entity_id,
        family_id: family.$id,
        professional_id: user.id,
        municipality_id: family.municipality_id,
        activity_type: actType,
        activity_date: actType === 'ex_ante' ? exAnteData.activityDate : formData.activity_date,
        local_id: ID.unique(),
        status: 'synced',
      }

      if (actType === 'ex_ante') {
        Object.assign(activityDoc, {
          description: JSON.stringify({
            location: {
              department: exAnteData.department,
              municipality: exAnteData.municipalityName,
              corregimiento: exAnteData.corregimiento,
              vereda: exAnteData.vereda,
              address: exAnteData.address,
            },
            head: {
              firstName: exAnteData.headFirstName,
              secondName: exAnteData.headSecondName,
              firstLastname: exAnteData.headFirstLastname,
              secondLastname: exAnteData.headSecondLastname,
              familyRole: exAnteData.headFamilyRole,
            },
            members: exAnteData.members,
          }),
          beneficiary_signature_url: signatureDataUrl ?? undefined,
        })
      } else if (['encounter_1', 'encounter_2', 'encounter_3'].includes(actType)) {
        Object.assign(activityDoc, {
          topic: formData.topic,
          description: formData.description,
          photo_url: photoUrl ?? undefined,
          beneficiary_signature_url: signatureDataUrl ?? undefined,
        })
      } else if (actType === 'ex_post') {
        Object.assign(activityDoc, {
          positive_impact: formData.positive_impact,
          program_evaluation: formData.program_evaluation,
          professional_evaluation: formData.professional_evaluation,
          photo_url: photoUrl ?? undefined,
          beneficiary_signature_url: signatureDataUrl ?? undefined,
        })
      }

      // Build family status updates
      const familyUpdates: Record<string, any> = {}
      familyUpdates[`${actType}_status`] = 'completed'
      familyUpdates[`${actType}_date`] = actType === 'ex_ante' ? exAnteData.activityDate : formData.activity_date

      if (actType === 'ex_ante') {
        familyUpdates.first_name = exAnteData.headFirstName
        familyUpdates.first_lastname = exAnteData.headFirstLastname
      }

      const newStatuses = {
        ex_ante:     actType === 'ex_ante'     ? 'completed' : family.ex_ante_status,
        encounter_1: actType === 'encounter_1' ? 'completed' : family.encounter_1_status,
        encounter_2: actType === 'encounter_2' ? 'completed' : family.encounter_2_status,
        encounter_3: actType === 'encounter_3' ? 'completed' : family.encounter_3_status,
        ex_post:     actType === 'ex_post'     ? 'completed' : family.ex_post_status,
      }
      const allDone = Object.values(newStatuses).every(s => s === 'completed')
      const anyDone = Object.values(newStatuses).some(s => s === 'completed')
      familyUpdates.overall_status = allDone ? 'completed' : anyDone ? 'in_progress' : 'pending'

      if (navigator.onLine) {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.ACTIVITIES, ID.unique(), activityDoc)
        await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FAMILIES, family.$id, familyUpdates)
      } else {
        // Queue activity + family update for later sync
        const queue = JSON.parse(localStorage.getItem('cg_offline_queue') ?? '[]')
        queue.push({
          type: 'activity',
          id: ID.unique(),
          data: activityDoc,
          familyId: family.$id,
          familyUpdate: familyUpdates,
        })
        localStorage.setItem('cg_offline_queue', JSON.stringify(queue))

        // Update local cache immediately so the UI reflects the change
        const cacheKey = `cg_families_${family.entity_id}`
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) ?? '[]')
          const idx = cached.findIndex((f: any) => f.$id === family.$id)
          if (idx >= 0) {
            cached[idx] = { ...cached[idx], ...familyUpdates }
            localStorage.setItem(cacheKey, JSON.stringify(cached))
          }
        } catch { /* silent */ }
      }

      // Delete draft
      if (actType === 'ex_ante') {
        await localDB.characterizations.delete(`draft_${familyId}`)
      } else {
        localStorage.removeItem(`cg_draft_${actType}_${familyId}`)
      }

      setToast({ message: '¡Listo! Actividad registrada exitosamente.', type: 'success' })
      setTimeout(() => navigate('/field/families'), 1800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setToast({ message: msg, type: 'error' })
    }
    setSubmitting(false)
  }

  // ─── Loading / error states ───────────────────────────────────────────────

  if (loadingFamily) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTopBar title={title} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Cargando...</div>
        </div>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTopBar title={title} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-gray-400 text-sm">No se pudo cargar la información de la familia.</p>
          <button onClick={() => navigate('/field/families')}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: '#1B3A4B' }}>Volver</button>
        </div>
      </div>
    )
  }

  const familyName = `${family.first_name ?? ''} ${family.first_lastname ?? ''}`.trim()

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={handleBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} style={{ color: '#1B3A4B' }} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-gray-900 truncate">{title}</div>
            {familyName && <div className="text-xs text-gray-500 truncate">{familyName}</div>}
          </div>
        </div>

        {actType === 'ex_ante' ? (
          <StepIndicator step={step} total={4} labels={EX_ANTE_STEP_LABELS} />
        ) : (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="h-1.5 rounded-full flex-1 transition-all"
                  style={{ background: i + 1 <= step ? '#1B3A4B' : '#E5E7EB' }} />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Paso {step} de {totalSteps}</p>
          </div>
        )}
      </div>

      {/* Auto-save indicator */}
      {autoSaveMsg && (
        <div className="bg-green-50 border-b border-green-100 px-4 py-1.5 text-center">
          <span className="text-xs text-green-700 font-medium">{autoSaveMsg}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-32">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">

          {/* ExAnte steps */}
          {actType === 'ex_ante' && step === 1 && (
            <ExAnteStep1Location data={exAnteData} onChange={setExAnteData} defaultDept={(family as any).department} />
          )}
          {actType === 'ex_ante' && step === 2 && (
            <ExAnteStep2Head data={exAnteData} onChange={setExAnteData} />
          )}
          {actType === 'ex_ante' && step === 3 && (
            <ExAnteStep3Members data={exAnteData} onChange={setExAnteData} />
          )}
          {actType === 'ex_ante' && step === 4 && (
            <ExAnteStep4Consent data={exAnteData} onChange={setExAnteData} sigRef={sigRef} />
          )}

          {/* Encounter steps */}
          {['encounter_1', 'encounter_2', 'encounter_3'].includes(actType) && step === 1 && (
            <EncounterStep1 data={formData} onChange={setFormData} />
          )}
          {['encounter_1', 'encounter_2', 'encounter_3'].includes(actType) && step === 2 && (
            <EvidenceStep data={formData} onChange={setFormData} sigRef={sigRef} />
          )}

          {/* ExPost steps */}
          {actType === 'ex_post' && step === 1 && (
            <ExPostStep1 data={formData} onChange={setFormData} />
          )}
          {actType === 'ex_post' && step === 2 && (
            <EvidenceStep data={formData} onChange={setFormData} sigRef={sigRef} />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 z-50">
        <button type="button" onClick={handleBack}
          className="flex-1 py-3.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[48px]">
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </button>
        {step < totalSteps ? (
          <button type="button" onClick={handleNext}
            className="flex-[2] py-3.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[48px]"
            style={{ background: '#1B3A4B' }}>
            Siguiente →
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-[2] py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity min-h-[48px]"
            style={{ background: '#27AE60' }}>
            {submitting ? 'Guardando...' : 'FINALIZAR'}
          </button>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
