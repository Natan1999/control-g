// ==============================
// CONTROL G — TypeScript Types
// ==============================

export type UserRole = 'superadmin' | 'coordinator' | 'assistant' | 'technician'
export type OrgPlan = 'starter' | 'professional' | 'enterprise' | 'gobierno'
export type OrgStatus = 'active' | 'suspended' | 'cancelled'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
export type FormStatus = 'draft' | 'published' | 'archived'
export type ResponseStatus = 'synced' | 'in_review' | 'validated' | 'approved' | 'rejected'
export type ResponseSource = 'digital' | 'ocr_camera' | 'ocr_pdf'
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'
export type MediaType = 'photo' | 'video' | 'signature' | 'document' | 'ocr_scan'

export type FieldType =
  | 'text_short' | 'text_long' | 'numeric' | 'single_select' | 'multi_select'
  | 'yes_no' | 'date' | 'time' | 'likert' | 'geolocation' | 'photo' | 'video'
  | 'signature' | 'file' | 'barcode_qr' | 'repeating_group' | 'calculated'
  | 'matrix' | 'section_title'

export interface Organization {
  id: string
  name: string
  nit?: string
  contactEmail: string
  contactPhone?: string
  plan: OrgPlan
  status: OrgStatus
  maxUsers: number
  maxForms: number
  maxOcrMonthly: number
  maxStorageGb: number
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  organizationId?: string
  fullName: string
  email: string
  phone?: string
  role: UserRole
  avatarUrl?: string
  status: UserStatus
  lastSeenAt?: string
  lastSyncAt?: string
  projectId?: string
  createdAt: string
}

export interface Department { id: number; code: string; name: string }
export interface Municipality { id: number; departmentId: number; code: string; name: string }

export interface Zone {
  id: string
  municipalityId: number
  organizationId?: string
  name: string
  type: 'localidad' | 'comuna' | 'corregimiento' | 'vereda' | 'barrio' | 'sector' | 'manzana' | 'custom'
  parentZoneId?: string
  polygon?: Record<string, unknown>
  createdAt: string
}

export interface Project {
  id: string
  organizationId: string
  coordinatorId: string
  name: string
  description?: string
  type: string
  departmentId?: number
  municipalityId?: number
  startDate?: string
  endDate?: string
  targetForms?: number
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  totalForms?: number
  completedForms?: number
  activeTechnicians?: number
  zones?: Zone[]
}

export interface FieldValidation {
  required?: boolean; minLength?: number; maxLength?: number
  min?: number; max?: number; pattern?: string; customMessage?: string
}

export interface FieldConditional {
  fieldId: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty'
  value: unknown
}

export interface FieldOption { value: string; label: string }

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  helpText?: string
  required?: boolean
  validations?: FieldValidation
  options?: FieldOption[]
  displayAs?: 'radio' | 'dropdown' | 'checkbox'
  maxFiles?: number
  maxFileSizeMb?: number
  conditional?: FieldConditional
  minEntries?: number
  maxEntries?: number
  addButtonText?: string
  fields?: FormField[]
  autoCapture?: boolean
  showMap?: boolean
  consentText?: string
}

export interface FormPage { id: string; title: string; description?: string; fields: FormField[] }

export interface FormSchema {
  pages: FormPage[]
  settings?: {
    allowDraftSave?: boolean; requireGps?: boolean; autoGps?: boolean
    requireSignature?: boolean; enableOcr?: boolean
  }
}

export interface Form {
  id: string; projectId: string; organizationId: string; createdBy: string
  name: string; description?: string; version: number; status: FormStatus
  schema: FormSchema; printablePdfUrl?: string; totalFields?: number
  createdAt: string; updatedAt: string
}

export interface FormResponse {
  id: string; localId: string; formId: string; formVersion: number
  projectId: string; organizationId: string; technicianId: string; zoneId?: string
  data: Record<string, unknown>; latitude?: number; longitude?: number; accuracy?: number
  status: ResponseStatus; source: ResponseSource; ocrConfidence?: number
  rejectionReason?: string; reviewedBy?: string; reviewedAt?: string
  deviceInfo?: Record<string, unknown>; startedAt?: string; completedAt?: string
  syncedAt?: string; createdAt: string
  // Joined
  technicianName?: string; formName?: string; zoneName?: string
}

export interface TeamMember {
  id: string; userId: string; projectId: string; user: User
  assignedZoneId?: string; supervisorId?: string; isActive: boolean; joinedAt: string
  formsToday?: number; lastSyncAt?: string; isOnline?: boolean; isPending?: boolean
}

export interface Notification {
  id: string; userId: string; title: string; body?: string
  type: 'assignment' | 'approval' | 'rejection' | 'message' | 'sync' | 'system' | 'alert'
  data?: Record<string, unknown>; read: boolean; createdAt: string
}

export interface KPIStat {
  label: string; value: number | string; change?: number
  changeLabel?: string; icon?: string; color?: string
}

export interface ChartDataPoint { name: string; value: number; [key: string]: unknown }

export interface FamilyMember {
  id: string;
  familyId: string;
  fullName: string;
  birthDate?: string;
  age?: number;
  
  // 15 Enfoque diferencial
  familyBond?: string;
  sex?: string;
  genderIdentity?: string;
  sexualOrientation?: string;
  educationLevel?: string;
  ethnicGroup?: string;
  disability?: string;
  specialCondition?: string;
  peaceApproach?: string;
  maritalStatus?: string;
  leadershipType?: string;
  
  idDocumentType?: string;
  idNumber?: string;
  
  emailPrimary?: string;
  phonePrimary?: string;
}

export interface BeneficiaryFamily {
  id: string;
  projectId: string;
  organizationId: string;
  zoneId?: string;
  
  headFirstName: string;
  headFirstLastname: string;
  headIdNumber?: string;
  headPhone?: string;
  
  departmentId?: number;
  municipalityId?: number;
  vereda?: string;
  address?: string;
  
  // Ciclo de Momentos (True/False + ID de la respuesta validada)
  exAntesCompleted: boolean;
  exAntesResponseId?: string;
  
  encounter1Completed: boolean;
  encounter1ResponseId?: string;
  
  encounter2Completed: boolean;
  encounter2ResponseId?: string;
  
  encounter3Completed: boolean;
  encounter3ResponseId?: string;
  
  exPostCompleted: boolean;
  exPostResponseId?: string;
  
  totalMembers: number;
  status: 'active' | 'inactive' | 'completed';
  consentGiven: boolean;
  createdAt: string;
  
  members?: FamilyMember[]; // Opcional, cargado relacionadamente
}
