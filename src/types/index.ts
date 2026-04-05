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
