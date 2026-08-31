import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const DATABASE_ID = 'public'

export const COLLECTION_IDS = {
  ENTITIES:                 'entities',
  ENTITY_MUNICIPALITIES:    'entity_municipalities',
  USER_PROFILES:            'user_profiles',
  PROFESSIONAL_ASSIGNMENTS: 'professional_assignments',
  FORM_ASSIGNMENTS:         'form_assignments',
  FAMILIES:                 'families',
  ACTIVITIES:               'activities',
  OBSERVATIONS:             'observations',
  AUDIT_LOG:                'audit_log',
  SYNC_LOG:                 'sync_log',
  FORMS:                    'forms',
  FORM_VERSIONS:            'form_versions',
  FORM_RESPONSES:           'form_responses',
  MAP_LAYERS:               'map_layers',
  SPATIAL_FEATURES:         'spatial_features',
  COUNTRY_PROFILES:         'country_profiles',
  JURISDICTIONS:            'jurisdictions',
  EVIDENCE_FILES:           'evidence_files',
  INDICATOR_DEFINITIONS:    'indicator_definitions',
  INDICATOR_SNAPSHOTS:      'indicator_snapshots',
  REPORT_RUNS:              'report_runs',
  ARCGIS_CONNECTIONS:       'arcgis_connections',
  ARCGIS_FIELD_MAPPINGS:    'arcgis_field_mappings',
  ARCGIS_JOBS:              'arcgis_jobs',
  CONSENT_RECORDS:          'consent_records',
  RETENTION_POLICIES:       'retention_policies',
  RETENTION_RUNS:           'retention_runs',
  SENSITIVE_ACCESS_LOG:     'sensitive_access_log',
  BLOG_POSTS:               'blog_posts',
} as const

export const BUCKET_IDS = {
  FIELD_PHOTOS: 'field-photos',
  SIGNATURES:   'signatures',
  AVATARS:      'avatars',
  EXPORTS:      'exports',
  BLOG_IMAGES:  'blog-images',
} as const

type QueryInstruction =
  | { kind: 'equal'; field: string; value: unknown }
  | { kind: 'limit'; value: number }
  | { kind: 'order'; field: string; ascending: boolean }

const columnName = (field: string) => {
  if (field === '$id') return 'id'
  if (field === '$createdAt') return 'created_at'
  if (field === '$updatedAt') return 'updated_at'
  return field
}

export const Query = {
  equal: (field: string, value: unknown): QueryInstruction => ({ kind: 'equal', field, value }),
  limit: (value: number): QueryInstruction => ({ kind: 'limit', value }),
  orderDesc: (field: string): QueryInstruction => ({ kind: 'order', field, ascending: false }),
  orderAsc: (field: string): QueryInstruction => ({ kind: 'order', field, ascending: true }),
}

export const ID = {
  unique: () => crypto.randomUUID(),
}

export class BackendError extends Error {
  code: number | string
  details?: string

  constructor(message: string, code: number | string = 500, details?: string) {
    super(message)
    this.name = 'BackendError'
    this.code = code
    this.details = details
  }
}

function throwBackendError(error: PostgrestError | null): never {
  const status = error?.code === '23505' ? 409 : error?.code || 500
  throw new BackendError(error?.message || 'Error de comunicación con Supabase.', status, error?.details)
}

function cleanPayload(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key, value]) => !key.startsWith('$') && value !== undefined)
      .map(([key, value]) => [columnName(key), value])
  )
}

function decorateDocument<T extends Record<string, any>>(row: T) {
  return {
    ...row,
    $id: row.id,
    $createdAt: row.created_at,
    $updatedAt: row.updated_at,
  }
}

function applyQueries(builder: any, instructions: QueryInstruction[]) {
  let query = builder
  let limit = 100

  for (const instruction of instructions) {
    if (instruction.kind === 'equal') {
      const field = columnName(instruction.field)
      query = Array.isArray(instruction.value)
        ? query.in(field, instruction.value)
        : query.eq(field, instruction.value)
    } else if (instruction.kind === 'order') {
      query = query.order(columnName(instruction.field), { ascending: instruction.ascending })
    } else if (instruction.kind === 'limit') {
      limit = Math.max(1, instruction.value)
    }
  }

  return query.range(0, limit - 1)
}

export const databases = {
  async listDocuments(_databaseId: string, collectionId: string, queries: QueryInstruction[] = []) {
    const base = supabase.from(collectionId).select('*', { count: 'exact' })
    const { data, error, count } = await applyQueries(base, queries)
    if (error) throwBackendError(error)
    return {
      documents: (data || []).map((row: Record<string, any>) => decorateDocument(row)),
      total: count || 0,
    }
  },

  async getDocument(_databaseId: string, collectionId: string, documentId: string) {
    const { data, error } = await supabase.from(collectionId).select('*').eq('id', documentId).single()
    if (error) throwBackendError(error)
    return decorateDocument(data)
  },

  async createDocument(
    _databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>,
  ) {
    const id = documentId === 'unique()' ? ID.unique() : documentId
    const payload = { id, ...cleanPayload(data) }
    const { data: created, error } = await supabase.from(collectionId).insert(payload).select('*').single()
    if (error) throwBackendError(error)
    return decorateDocument(created)
  },

  async updateDocument(
    _databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>,
  ) {
    const { data: updated, error } = await supabase
      .from(collectionId)
      .update(cleanPayload(data))
      .eq('id', documentId)
      .select('*')
      .single()
    if (error) throwBackendError(error)
    return decorateDocument(updated)
  },

  async deleteDocument(_databaseId: string, collectionId: string, documentId: string) {
    const { error } = await supabase.from(collectionId).delete().eq('id', documentId)
    if (error) throwBackendError(error)
    return {}
  },
}

function safeFilename(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
}

export const storage = {
  async createFile(bucketId: string, fileId: string, file: File | Blob) {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new BackendError('Debes iniciar sesión para subir archivos.', 401)
    const { data: profile } = await supabase
      .from(COLLECTION_IDS.USER_PROFILES)
      .select('entity_id')
      .eq('user_id', authData.user.id)
      .single()
    const originalName = file instanceof File ? file.name : 'archivo.bin'
    const path = `${profile?.entity_id || 'global'}/${authData.user.id}/${fileId}/${safeFilename(originalName)}`
    const { data, error } = await supabase.storage.from(bucketId).upload(path, file, {
      // A deterministic path plus upsert makes media recovery idempotent if the
      // app closes after the upload but before IndexedDB records completion.
      upsert: true,
      contentType: file.type || undefined,
    })
    if (error) throw new BackendError(error.message, 500)
    return { $id: data.path, path: data.path }
  },

  async createSignedUrl(bucketId: string, path: string, expiresIn = 3600) {
    const { data, error } = await supabase.storage.from(bucketId).createSignedUrl(path, expiresIn)
    if (error) throw new BackendError(error.message, 500)
    return data.signedUrl
  },
}

export interface ManagedUserOptions {
  role?: 'admin' | 'coordinator' | 'support' | 'professional'
  entityId?: string | null
}

export const account = {
  async create(
    _userId: string,
    email: string,
    password: string,
    name: string,
    options: ManagedUserOptions = {},
  ) {
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
      p_full_name: name.trim(),
      p_role: options.role || 'professional',
      p_entity_id: options.entityId ?? null,
    })
    if (error) throw new BackendError(error.message, 500)
    if (data?.error) throw new BackendError(data.error, data.status || 400)
    return { $id: data.user.id, email: data.user.email, name: data.user.user_metadata?.full_name || name }
  },
}

export const governance = {
  async recordSensitiveAccess(input: {
    action: string
    resourceType: string
    resourceId?: string
    purpose: string
    metadata?: Record<string, unknown>
  }) {
    const { data, error } = await supabase.rpc('record_sensitive_access', {
      p_action: input.action,
      p_resource_type: input.resourceType,
      p_resource_id: input.resourceId || null,
      p_purpose: input.purpose,
      p_metadata: input.metadata || {},
    })
    if (error) throw new BackendError(error.message, 500)
    return data as string
  },

  async runRetentionPolicy(input: { policyId: string; execute?: boolean; confirmation?: string }) {
    const { data, error } = await supabase.rpc('run_retention_policy', {
      p_policy_id: input.policyId,
      p_execute: Boolean(input.execute),
      p_confirmation: input.confirmation || null,
    })
    if (error) throw new BackendError(error.message, 500)
    return data as {
      run_id: string
      status: 'completed' | 'review_required' | 'requires_manual_workflow' | 'failed'
      eligible_count: number
      affected_count: number
      cutoff_at: string
      mode: 'preview' | 'execute'
      action: 'review' | 'anonymize' | 'delete'
    }
  },
}

export const analyticsOperations = {
  async runSnapshots(entityId: string, cutoffAt: string, filterContext: Record<string, unknown>) {
    const { data, error } = await supabase.rpc('run_indicator_snapshots', {
      p_entity_id: entityId,
      p_cutoff_at: cutoffAt,
      p_filter_context: filterContext,
    })
    if (error) throw new BackendError(error.message, 500)
    return data as { entity_id: string; cutoff_at: string; snapshot_count: number; engine: string }
  },
}

export type CollectionId = typeof COLLECTION_IDS[keyof typeof COLLECTION_IDS]
export type BucketId = typeof BUCKET_IDS[keyof typeof BUCKET_IDS]
