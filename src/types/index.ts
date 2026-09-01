// ==============================
// CONTROL G — TypeScript Types
// ==============================

export type UserRole = 'admin' | 'coordinator' | 'support' | 'professional'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type EntityStatus = 'active' | 'suspended' | 'completed'
export type ActivityType = 'ex_ante' | 'encounter_1' | 'encounter_2' | 'encounter_3' | 'ex_post'
export type ActivityStatus = 'pending' | 'completed'
export type FamilyStatus = 'pending' | 'in_progress' | 'completed'
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'
export type ObservationType = 'observation' | 'correction' | 'approval'
export type ReviewStatus = 'synced' | 'reviewed' | 'approved' | 'rejected'

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  entityId?: string
  fullName: string
  email: string
  phone?: string
  role: UserRole
  avatarUrl?: string
  signatureUrl?: string
  status: UserStatus
  lastSeenAt?: string
  lastSyncAt?: string
  createdAt: string
}

// ─── Entities ────────────────────────────────────────────────────────────────

export interface Entity {
  id: string
  name: string
  nit?: string
  contractNumber: string
  contractObject: string
  operatorName: string
  department: string
  countryCode?: string
  locale?: string
  timezone?: string
  currencyCode?: string
  defaultMapCenter?: { latitude: number; longitude: number }
  defaultMapZoom?: number
  mapPrivacyMode?: 'exact' | 'approximate' | 'aggregate'
  regionalSettings?: Record<string, unknown>
  periodStart: string
  periodEnd: string
  familiesPerMunicipality: number
  status: EntityStatus
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ─── Municipalities ───────────────────────────────────────────────────────────

export interface EntityMunicipality {
  id: string
  entityId: string
  municipalityName: string
  department: string
  countryCode?: string
  adminLevel1Code?: string
  adminLevel2Code?: string
  centerLatitude?: number
  centerLongitude?: number
  familiesTarget: number
  createdAt: string
}

// ─── Professional Assignments ─────────────────────────────────────────────────

export interface ProfessionalAssignment {
  id: string
  entityId: string
  professionalId: string
  municipalityId: string
  professionalName?: string
  municipalityName?: string
  createdAt: string
}

// ─── Families ────────────────────────────────────────────────────────────────

export interface Family {
  id: string
  entityId: string
  municipalityId: string
  professionalId: string

  // Datos cabeza de familia
  firstName: string
  secondName?: string
  firstLastname: string
  secondLastname?: string
  fullName?: string
  idDocumentType: string
  idNumber: string
  birthDate?: string
  age?: number
  phone?: string
  zone?: string
  address?: string
  directions?: string
  latitude?: number
  longitude?: number

  // Caracterización
  gender?: string
  ethnicGroup?: string
  disability?: string
  differentialFactor?: string
  dependents: number
  companionRequired: boolean
  companionName?: string
  companionDocument?: string
  companionRelationship?: string

  // Estado actividades
  exAnteStatus: ActivityStatus
  exAnteDate?: string
  exAnteActivityId?: string

  encounter1Status: ActivityStatus
  encounter1Date?: string
  encounter1Topic?: string
  encounter1ActivityId?: string

  encounter2Status: ActivityStatus
  encounter2Date?: string
  encounter2Topic?: string
  encounter2ActivityId?: string

  encounter3Status: ActivityStatus
  encounter3Date?: string
  encounter3Topic?: string
  encounter3ActivityId?: string

  exPostStatus: ActivityStatus
  exPostDate?: string
  exPostPositiveImpact?: boolean
  exPostActivityId?: string

  overallStatus: FamilyStatus
  consentGiven: boolean
  createdAt: string
  updatedAt: string

  // Joined
  municipalityName?: string
  professionalName?: string
}

// ─── Activities ───────────────────────────────────────────────────────────────

export interface Activity {
  id: string
  entityId: string
  familyId: string
  professionalId: string
  municipalityId: string

  activityType: ActivityType
  activityDate: string

  // Datos por tipo
  topic?: string
  description?: string
  positiveImpact?: boolean
  programEvaluation?: string
  professionalEvaluation?: string

  // Evidencia
  photoUrl?: string
  beneficiarySignatureUrl?: string

  // GPS
  latitude?: number
  longitude?: number

  // Sync
  localId: string
  syncedAt?: string

  // Review
  status: ReviewStatus
  reviewNotes?: string
  reviewedBy?: string
  reviewedAt?: string

  createdAt: string
}

// ─── Observations ─────────────────────────────────────────────────────────────

export interface Observation {
  id: string
  entityId: string
  fromUserId: string
  toUserId: string
  familyId?: string
  activityId?: string
  content: string
  type: ObservationType
  read: boolean
  createdAt: string
  fromUserName?: string
}

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface KPIStat {
  label: string
  value: number | string
  change?: number
  changeLabel?: string
  icon?: string
  color?: string
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: unknown
}

export interface ProfessionalProgress {
  professionalId: string
  professionalName: string
  municipalities: string[]
  familiesTarget: number
  exAnte: number
  encounter1: number
  encounter2: number
  encounter3: number
  exPost: number
  percentageComplete: number
  lastSyncAt?: string
}

export interface MunicipalityProgress {
  municipalityId: string
  municipalityName: string
  familiesTarget: number
  familiesRegistered: number
  familiesCompleted: number
  percentageComplete: number
  professionals: string[]
}
// ─── Forms & Universal Builder ───────────────────────────────────────────────

export type FormFieldType = 
  | 'text' | 'longtext' | 'number' | 'currency' | 'date' | 'time'
  | 'select' | 'multi_select' | 'radio' | 'checkbox'
  | 'matrix' | 'photo' | 'audio' | 'signature' | 'gps' | 'repeat_group'
  | 'geotrace' | 'geoshape'
  | 'calculation' | 'note' | 'file' | 'phone' | 'email' | 'municipality'

export type FormVisibilityOperator =
  | '==' | '!=' | 'contains' | 'not_contains'
  | '>' | '>=' | '<' | '<='
  | 'is_empty' | 'is_not_empty'

export interface FormValidationRules {
  pattern?: string
  message?: string
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
}

export type FormValidationProfile = 'national_id' | 'phone_latam' | 'postal_code'

export interface FormFieldTranslation {
  label?: string
  description?: string
  placeholder?: string
  options?: Record<string, string>
  matrixRows?: Record<string, string>
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  description?: string
  placeholder?: string
  required: boolean
  options?: { label: string; value: string }[] // For select, radio, etc.
  matrixRows?: { label: string; value: string }[]
  subFields?: FormField[] // For repeat_group recursive logic
  validation?: string // Regex heredada; se conserva para formularios publicados previamente.
  validationRules?: FormValidationRules
  validationProfile?: FormValidationProfile
  validationCountryCode?: string
  calculation?: string // Formula like {{field_a}} + {{field_b}}
  sensitive?: boolean
  sensitiveJustification?: string
  maxFileSizeMb?: number
  maxDurationSeconds?: number
  acceptedFileTypes?: string
  currencyCode?: string
  translations?: Record<string, FormFieldTranslation>
  visibilityLogic?: {
    fieldId: string
    operator: FormVisibilityOperator
    value?: any
  }
}

export interface FormPage {
  id: string
  title: string
  description?: string
  translations?: Record<string, { title?: string; description?: string }>
  fields: FormField[]
}

export interface FormDefinition {
  id: string
  entityId: string
  title: string
  description?: string
  type: ActivityType
  pages: FormPage[]
  status: 'draft' | 'published' | 'retired'
  version: number
  createdAt: string
  updatedAt: string
}

export type FormEditorialStatus =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'withdrawn'

export interface FormChangeRequest {
  id: string
  formId: string
  entityId: string
  baseVersion: number
  publishedVersion?: number
  title: string
  description?: string
  type: ActivityType
  definition: string
  definitionSha256: string
  status: FormEditorialStatus
  revision: number
  createdBy: string
  submittedBy?: string
  submittedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  publishedBy?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface FormResponse {
  id: string
  formId: string
  entityId: string
  familyId: string
  professionalId: string
  municipalityId: string
  data: Record<string, any> // Answers indexed by field.id
  gps?: { lat: number; lng: number }
  status: ReviewStatus
  localId?: string // For Dexie sync
  syncedAt?: string
  createdAt: string
}

export interface FormAssignment {
  id: string
  entityId: string
  formId: string
  professionalId: string
  assignedBy?: string
  status: 'active' | 'inactive'
  startsAt?: string
  endsAt?: string
  priority?: 1 | 2 | 3 | 4 | 5
  quota?: number
  completedCount?: number
  territoryId?: string
  groupCode?: string
  instructions?: string
  createdAt: string
  updatedAt: string
}
