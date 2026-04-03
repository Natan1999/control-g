/**
 * Control G — Funciones de Base de Datos (Appwrite)
 * ===================================================
 * CRUD completo para todas las colecciones + funciones
 * de consulta para dashboards y el motor offline.
 */

import { ID, Query, AppwriteException } from 'appwrite';
import { databases, storage, DATABASE_ID, COLLECTION_IDS, BUCKET_IDS } from './appwrite';
import type { Models } from 'appwrite';

// ─── Re-exportar tipos útiles ─────────────────────────────────────────────────

export type AppwriteDocument = Models.Document;

// ─── Tipos de Dominio ─────────────────────────────────────────────────────────

export type OrgPlan   = 'starter' | 'professional' | 'enterprise' | 'gobierno';
export type OrgStatus = 'active' | 'suspended' | 'cancelled';

export interface Organization extends AppwriteDocument {
  name:             string;
  nit:              string | null;
  contact_name:     string | null;
  contact_email:    string;
  contact_phone:    string | null;
  address:          string | null;
  city:             string | null;
  department:       string | null;
  country:          string;
  plan:             OrgPlan;
  plan_expires_at:  string | null;
  max_users:        number;
  max_forms:        number;
  max_ocr_monthly:  number;
  max_storage_gb:   number;
  ocr_usage_current: number;
  storage_used_mb:  number;
  status:           OrgStatus;
  settings:         string;
}

export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type ProjectType   = 'socioeconomica' | 'conectividad' | 'servicios_publicos' | 'censo' | 'electoral' | 'vivienda' | 'agropecuario' | 'personalizada';

export interface Project extends AppwriteDocument {
  organization_id: string;
  coordinator_id:  string;
  name:            string;
  description:     string | null;
  type:            ProjectType;
  department_id:   string | null;
  municipality_id: string | null;
  start_date:      string | null;
  end_date:        string | null;
  target_forms:    number;
  status:          ProjectStatus;
  settings:        string;
}

export type FormStatus = 'draft' | 'published' | 'archived';

export interface Form extends AppwriteDocument {
  project_id:      string | null;
  organization_id: string;
  created_by:      string;
  name:            string;
  description:     string | null;
  version:         number;
  status:          FormStatus;
  schema:          string;
  ocr_template_map: string | null;
  printable_pdf_url: string | null;
  total_fields:    number;
}

export type ResponseStatus = 'synced' | 'in_review' | 'validated' | 'approved' | 'rejected';
export type ResponseSource  = 'digital' | 'ocr_camera' | 'ocr_pdf';

export interface FormResponse extends AppwriteDocument {
  local_id:         string;
  form_id:          string;
  form_version:     number | null;
  project_id:       string;
  organization_id:  string;
  technician_id:    string;
  zone_id:          string | null;
  data:             string;
  latitude:         number | null;
  longitude:        number | null;
  accuracy:         number | null;
  altitude:         number | null;
  status:           ResponseStatus;
  source:           ResponseSource;
  ocr_confidence:   number | null;
  ocr_field_confidences: string | null;
  rejection_reason: string | null;
  review_notes:     string | null;
  reviewed_by:      string | null;
  reviewed_at:      string | null;
  device_info:      string;
  started_at:       string | null;
  completed_at:     string | null;
  synced_at:        string | null;
}

export interface Notification extends AppwriteDocument {
  user_id: string;
  title:   string;
  body:    string;
  type:    string;
  read:    boolean;
  data:    string;
}

export interface Zone extends AppwriteDocument {
  municipality_id:    string;
  organization_id:    string | null;
  name:               string;
  type:               string;
  parent_zone_id:     string | null;
  polygon:            string | null;
  population_estimate: number | null;
  households_estimate: number | null;
  metadata:           string;
}

// ─── Helper de error ──────────────────────────────────────────────────────────

function wrapError(err: unknown, context: string): Error {
  if (err instanceof AppwriteException) {
    return new Error(`[${context}] Appwrite ${err.code}: ${err.message}`);
  }
  if (err instanceof Error) return new Error(`[${context}] ${err.message}`);
  return new Error(`[${context}] Error desconocido`);
}

// ─── ORGANIZATIONS ────────────────────────────────────────────────────────────

export async function getOrganization(orgId: string): Promise<Organization> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.ORGANIZATIONS, orgId);
    return doc as unknown as Organization;
  } catch (err) {
    throw wrapError(err, 'getOrganization');
  }
}

export async function updateOrganization(
  orgId: string,
  data:  Partial<Omit<Organization, keyof AppwriteDocument>>
): Promise<Organization> {
  try {
    const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.ORGANIZATIONS, orgId, data);
    return doc as unknown as Organization;
  } catch (err) {
    throw wrapError(err, 'updateOrganization');
  }
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export interface ListProjectsOptions {
  organizationId?: string;
  coordinatorId?:  string;
  status?:         ProjectStatus;
  limit?:          number;
  offset?:         number;
}

export async function listProjects(opts: ListProjectsOptions = {}): Promise<{ total: number; documents: Project[] }> {
  try {
    const queries: string[] = [];
    if (opts.organizationId) queries.push(Query.equal('organization_id', opts.organizationId));
    if (opts.coordinatorId)  queries.push(Query.equal('coordinator_id',  opts.coordinatorId));
    if (opts.status)         queries.push(Query.equal('status',          opts.status));
    queries.push(Query.limit(opts.limit   ?? 25));
    queries.push(Query.offset(opts.offset ?? 0));
    queries.push(Query.orderDesc('$createdAt'));

    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.PROJECTS, queries);
    return { total: result.total, documents: result.documents as unknown as Project[] };
  } catch (err) {
    throw wrapError(err, 'listProjects');
  }
}

export async function getProject(projectId: string): Promise<Project> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.PROJECTS, projectId);
    return doc as unknown as Project;
  } catch (err) {
    throw wrapError(err, 'getProject');
  }
}

export async function createProject(
  data: Omit<Project, keyof AppwriteDocument>
): Promise<Project> {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.PROJECTS, ID.unique(), data
    );
    return doc as unknown as Project;
  } catch (err) {
    throw wrapError(err, 'createProject');
  }
}

export async function updateProject(
  projectId: string,
  data:      Partial<Omit<Project, keyof AppwriteDocument>>
): Promise<Project> {
  try {
    const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.PROJECTS, projectId, data);
    return doc as unknown as Project;
  } catch (err) {
    throw wrapError(err, 'updateProject');
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.PROJECTS, projectId);
  } catch (err) {
    throw wrapError(err, 'deleteProject');
  }
}

// ─── PROJECT MEMBERS ─────────────────────────────────────────────────────────

export async function getProjectMembers(projectId: string) {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID, COLLECTION_IDS.PROJECT_MEMBERS,
      [Query.equal('project_id', projectId), Query.equal('is_active', true), Query.limit(100)]
    );
    return result.documents;
  } catch (err) {
    throw wrapError(err, 'getProjectMembers');
  }
}

export async function addProjectMember(
  projectId:      string,
  userId:         string,
  assignedZoneId: string | null = null,
  supervisorId:   string | null = null
) {
  try {
    return await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.PROJECT_MEMBERS, ID.unique(),
      {
        project_id:       projectId,
        user_id:          userId,
        assigned_zone_id: assignedZoneId,
        supervisor_id:    supervisorId,
        is_active:        true,
        joined_at:        new Date().toISOString(),
      }
    );
  } catch (err) {
    throw wrapError(err, 'addProjectMember');
  }
}

// ─── FORMS ───────────────────────────────────────────────────────────────────

export interface ListFormsOptions {
  organizationId?: string;
  projectId?:      string;
  status?:         FormStatus;
  limit?:          number;
  offset?:         number;
}

export async function listForms(opts: ListFormsOptions = {}): Promise<{ total: number; documents: Form[] }> {
  try {
    const queries: string[] = [];
    if (opts.organizationId) queries.push(Query.equal('organization_id', opts.organizationId));
    if (opts.projectId)      queries.push(Query.equal('project_id',      opts.projectId));
    if (opts.status)         queries.push(Query.equal('status',          opts.status));
    queries.push(Query.limit(opts.limit   ?? 25));
    queries.push(Query.offset(opts.offset ?? 0));
    queries.push(Query.orderDesc('$createdAt'));

    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, queries);
    return { total: result.total, documents: result.documents as unknown as Form[] };
  } catch (err) {
    throw wrapError(err, 'listForms');
  }
}

export async function getForm(formId: string): Promise<Form> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.FORMS, formId);
    return doc as unknown as Form;
  } catch (err) {
    throw wrapError(err, 'getForm');
  }
}

export async function createForm(
  data: Omit<Form, keyof AppwriteDocument>
): Promise<Form> {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.FORMS, ID.unique(), data
    );
    return doc as unknown as Form;
  } catch (err) {
    throw wrapError(err, 'createForm');
  }
}

export async function updateForm(
  formId: string,
  data:   Partial<Omit<Form, keyof AppwriteDocument>>
): Promise<Form> {
  try {
    const doc = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.FORMS, formId, data);
    return doc as unknown as Form;
  } catch (err) {
    throw wrapError(err, 'updateForm');
  }
}

export async function publishForm(formId: string): Promise<Form> {
  return updateForm(formId, { status: 'published' });
}

export async function archiveForm(formId: string): Promise<Form> {
  return updateForm(formId, { status: 'archived' });
}

// ─── FORM RESPONSES ───────────────────────────────────────────────────────────

export interface ListResponsesOptions {
  organizationId?: string;
  projectId?:      string;
  formId?:         string;
  technicianId?:   string;
  zoneId?:         string;
  status?:         ResponseStatus;
  dateFrom?:       string;
  dateTo?:         string;
  limit?:          number;
  offset?:         number;
}

export async function listFormResponses(
  opts: ListResponsesOptions = {}
): Promise<{ total: number; documents: FormResponse[] }> {
  try {
    const queries: string[] = [];
    if (opts.organizationId) queries.push(Query.equal('organization_id', opts.organizationId));
    if (opts.projectId)      queries.push(Query.equal('project_id',      opts.projectId));
    if (opts.formId)         queries.push(Query.equal('form_id',         opts.formId));
    if (opts.technicianId)   queries.push(Query.equal('technician_id',   opts.technicianId));
    if (opts.zoneId)         queries.push(Query.equal('zone_id',         opts.zoneId));
    if (opts.status)         queries.push(Query.equal('status',          opts.status));
    if (opts.dateFrom)       queries.push(Query.greaterThanEqual('$createdAt', opts.dateFrom));
    if (opts.dateTo)         queries.push(Query.lessThanEqual('$createdAt',    opts.dateTo));
    queries.push(Query.limit(opts.limit   ?? 50));
    queries.push(Query.offset(opts.offset ?? 0));
    queries.push(Query.orderDesc('$createdAt'));

    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, queries);
    return { total: result.total, documents: result.documents as unknown as FormResponse[] };
  } catch (err) {
    throw wrapError(err, 'listFormResponses');
  }
}

export async function getFormResponse(responseId: string): Promise<FormResponse> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, responseId);
    return doc as unknown as FormResponse;
  } catch (err) {
    throw wrapError(err, 'getFormResponse');
  }
}

export async function createFormResponse(
  data: Omit<FormResponse, keyof AppwriteDocument>
): Promise<FormResponse> {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, ID.unique(),
      { ...data, synced_at: new Date().toISOString() }
    );
    return doc as unknown as FormResponse;
  } catch (err) {
    throw wrapError(err, 'createFormResponse');
  }
}

/**
 * Sube múltiples respuestas de una sola vez (sincronización offline).
 * Retorna { synced, failed } con los resultados.
 */
export async function bulkSyncResponses(
  responses: Array<Omit<FormResponse, keyof AppwriteDocument>>
): Promise<{ synced: FormResponse[]; failed: Array<{ local_id: string; error: string }> }> {
  const synced: FormResponse[]                            = [];
  const failed: Array<{ local_id: string; error: string }> = [];

  for (const resp of responses) {
    try {
      // Verificar si ya fue sincronizada por local_id
      const existing = await databases.listDocuments(
        DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES,
        [Query.equal('local_id', resp.local_id), Query.limit(1)]
      );

      if (existing.documents.length > 0) {
        synced.push(existing.documents[0] as unknown as FormResponse);
        continue;
      }

      const created = await createFormResponse(resp);
      synced.push(created);
    } catch (err) {
      failed.push({
        local_id: resp.local_id,
        error:    err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  }

  return { synced, failed };
}

export async function reviewFormResponse(
  responseId:     string,
  reviewerId:     string,
  status:         'approved' | 'rejected',
  notes?:         string,
  rejectionReason?: string
): Promise<FormResponse> {
  try {
    const doc = await databases.updateDocument(
      DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, responseId,
      {
        status,
        reviewed_by:      reviewerId,
        reviewed_at:      new Date().toISOString(),
        review_notes:     notes     ? JSON.stringify({ text: notes }) : null,
        rejection_reason: rejectionReason ?? null,
      }
    );
    return doc as unknown as FormResponse;
  } catch (err) {
    throw wrapError(err, 'reviewFormResponse');
  }
}

// ─── ZONES ────────────────────────────────────────────────────────────────────

export async function listZones(
  municipalityId?:  string,
  organizationId?:  string,
  limit = 100
): Promise<Zone[]> {
  try {
    const queries: string[] = [];
    if (municipalityId) queries.push(Query.equal('municipality_id', municipalityId));
    if (organizationId) queries.push(Query.equal('organization_id', organizationId));
    queries.push(Query.limit(limit));
    queries.push(Query.orderAsc('name'));

    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ZONES, queries);
    return result.documents as unknown as Zone[];
  } catch (err) {
    throw wrapError(err, 'listZones');
  }
}

export async function createZone(
  data: Omit<Zone, keyof AppwriteDocument>
): Promise<Zone> {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.ZONES, ID.unique(), data
    );
    return doc as unknown as Zone;
  } catch (err) {
    throw wrapError(err, 'createZone');
  }
}

// ─── DEPARTMENTS & MUNICIPALITIES ─────────────────────────────────────────────

export async function listDepartments() {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID, COLLECTION_IDS.DEPARTMENTS,
      [Query.orderAsc('name'), Query.limit(50)]
    );
    return result.documents;
  } catch (err) {
    throw wrapError(err, 'listDepartments');
  }
}

export async function listMunicipalities(departmentId: string) {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES,
      [Query.equal('department_id', departmentId), Query.orderAsc('name'), Query.limit(300)]
    );
    return result.documents;
  } catch (err) {
    throw wrapError(err, 'listMunicipalities');
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function listNotifications(
  userId: string,
  onlyUnread = false,
  limit = 30
): Promise<Notification[]> {
  try {
    const queries: string[] = [Query.equal('user_id', userId)];
    if (onlyUnread) queries.push(Query.equal('read', false));
    queries.push(Query.orderDesc('$createdAt'));
    queries.push(Query.limit(limit));

    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.NOTIFICATIONS, queries);
    return result.documents as unknown as Notification[];
  } catch (err) {
    throw wrapError(err, 'listNotifications');
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await databases.updateDocument(
      DATABASE_ID, COLLECTION_IDS.NOTIFICATIONS, notificationId, { read: true }
    );
  } catch (err) {
    throw wrapError(err, 'markNotificationRead');
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const unread = await listNotifications(userId, true, 100);
    await Promise.all(unread.map(n => markNotificationRead(n.$id)));
  } catch (err) {
    throw wrapError(err, 'markAllNotificationsRead');
  }
}

export async function createNotification(data: {
  user_id: string;
  title:   string;
  body:    string;
  type:    Notification['type'];
  data?:   Record<string, unknown>;
}): Promise<Notification> {
  try {
    const doc = await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.NOTIFICATIONS, ID.unique(),
      {
        user_id: data.user_id,
        title:   data.title,
        body:    data.body,
        type:    data.type,
        read:    false,
        data:    JSON.stringify(data.data ?? {}),
      }
    );
    return doc as unknown as Notification;
  } catch (err) {
    throw wrapError(err, 'createNotification');
  }
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────

export async function listChatMessages(channelId: string, limit = 50, before?: string) {
  try {
    const queries: string[] = [Query.equal('channel_id', channelId)];
    if (before) queries.push(Query.lessThan('$createdAt', before));
    queries.push(Query.orderDesc('$createdAt'));
    queries.push(Query.limit(limit));

    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, queries);
    return result.documents;
  } catch (err) {
    throw wrapError(err, 'listChatMessages');
  }
}

export async function sendChatMessage(data: {
  channel_id:   string;
  sender_id:    string;
  content?:     string;
  message_type: 'text' | 'voice' | 'image' | 'document' | 'system';
  media_url?:   string;
  local_id?:    string;
}) {
  try {
    return await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, ID.unique(), data
    );
  } catch (err) {
    throw wrapError(err, 'sendChatMessage');
  }
}

export async function getOrCreateDirectChannel(
  organizationId: string,
  userAId:        string,
  userBId:        string
) {
  try {
    // Buscar canal directo existente entre los dos usuarios
    const channels = await databases.listDocuments(
      DATABASE_ID, COLLECTION_IDS.CHAT_CHANNELS,
      [
        Query.equal('organization_id', organizationId),
        Query.equal('type', 'direct'),
        Query.limit(50),
      ]
    );

    // Verificar membresías para encontrar el canal correcto
    for (const channel of channels.documents) {
      const members = await databases.listDocuments(
        DATABASE_ID, COLLECTION_IDS.CHAT_MEMBERS,
        [Query.equal('channel_id', channel.$id), Query.limit(10)]
      );
      const memberIds = members.documents.map((m: AppwriteDocument) => (m as unknown as { user_id: string }).user_id);
      if (memberIds.includes(userAId) && memberIds.includes(userBId)) {
        return channel;
      }
    }

    // Crear nuevo canal directo
    const newChannel = await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.CHAT_CHANNELS, ID.unique(),
      { organization_id: organizationId, type: 'direct' }
    );

    // Agregar miembros
    for (const userId of [userAId, userBId]) {
      await databases.createDocument(
        DATABASE_ID, COLLECTION_IDS.CHAT_MEMBERS, ID.unique(),
        { channel_id: newChannel.$id, user_id: userId, joined_at: new Date().toISOString() }
      );
    }

    return newChannel;
  } catch (err) {
    throw wrapError(err, 'getOrCreateDirectChannel');
  }
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────

export async function uploadFieldPhoto(file: File): Promise<{ fileId: string; url: string }> {
  try {
    const uploaded = await storage.createFile(BUCKET_IDS.FIELD_PHOTOS, ID.unique(), file);
    const url = storage.getFilePreview(BUCKET_IDS.FIELD_PHOTOS, uploaded.$id).toString();
    return { fileId: uploaded.$id, url };
  } catch (err) {
    throw wrapError(err, 'uploadFieldPhoto');
  }
}

export async function uploadAvatar(file: File): Promise<{ fileId: string; url: string }> {
  try {
    const uploaded = await storage.createFile(BUCKET_IDS.AVATARS, ID.unique(), file);
    const url = storage.getFileView(BUCKET_IDS.AVATARS, uploaded.$id).toString();
    return { fileId: uploaded.$id, url };
  } catch (err) {
    throw wrapError(err, 'uploadAvatar');
  }
}

export async function uploadSignature(file: File): Promise<{ fileId: string; url: string }> {
  try {
    const uploaded = await storage.createFile(BUCKET_IDS.SIGNATURES, ID.unique(), file);
    const url = storage.getFileView(BUCKET_IDS.SIGNATURES, uploaded.$id).toString();
    return { fileId: uploaded.$id, url };
  } catch (err) {
    throw wrapError(err, 'uploadSignature');
  }
}

export async function uploadOcrScan(file: File): Promise<{ fileId: string; url: string }> {
  try {
    const uploaded = await storage.createFile(BUCKET_IDS.OCR_SCANS, ID.unique(), file);
    const url = storage.getFileView(BUCKET_IDS.OCR_SCANS, uploaded.$id).toString();
    return { fileId: uploaded.$id, url };
  } catch (err) {
    throw wrapError(err, 'uploadOcrScan');
  }
}

export function getFileUrl(bucketId: string, fileId: string): string {
  return storage.getFileView(bucketId, fileId).toString();
}

export function getFilePreviewUrl(
  bucketId: string,
  fileId:   string,
  width = 400,
  height = 400
): string {
  return storage.getFilePreview(bucketId, fileId, width, height).toString();
}

// ─── SYNC LOGS ────────────────────────────────────────────────────────────────

export async function createSyncLog(data: {
  device_id:       string;
  user_id:         string;
  organization_id: string;
  forms_synced:    number;
  media_synced:    number;
  status:          'success' | 'partial' | 'failed';
  error_details?:  string;
  started_at:      string;
  completed_at?:   string;
}) {
  try {
    return await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.SYNC_LOGS, ID.unique(), data
    );
  } catch (err) {
    throw wrapError(err, 'createSyncLog');
  }
}

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  organization_id?: string;
  user_id:          string;
  action:           string;
  resource_type?:   string;
  resource_id?:     string;
  metadata?:        Record<string, unknown>;
  ip_address?:      string;
}) {
  try {
    return await databases.createDocument(
      DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, ID.unique(),
      { ...data, metadata: JSON.stringify(data.metadata ?? {}) }
    );
  } catch (err) {
    // Los audit logs nunca deben romper el flujo principal
    console.warn('[createAuditLog] Error silenciado:', err);
    return null;
  }
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalProjects:   number;
  activeProjects:  number;
  totalResponses:  number;
  pendingReview:   number;
  approvedToday:   number;
  totalForms:      number;
}

export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalProjects,
      activeProjects,
      totalResponses,
      pendingReview,
      approvedToday,
      totalForms,
    ] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.PROJECTS, [
        Query.equal('organization_id', organizationId), Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.PROJECTS, [
        Query.equal('organization_id', organizationId),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
        Query.equal('organization_id', organizationId), Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
        Query.equal('organization_id', organizationId),
        Query.equal('status', 'in_review'),
        Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
        Query.equal('organization_id', organizationId),
        Query.equal('status', 'approved'),
        Query.greaterThanEqual('reviewed_at', today.toISOString()),
        Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORMS, [
        Query.equal('organization_id', organizationId), Query.limit(1),
      ]),
    ]);

    return {
      totalProjects:  totalProjects.total,
      activeProjects: activeProjects.total,
      totalResponses: totalResponses.total,
      pendingReview:  pendingReview.total,
      approvedToday:  approvedToday.total,
      totalForms:     totalForms.total,
    };
  } catch (err) {
    throw wrapError(err, 'getDashboardStats');
  }
}

/**
 * Obtiene el progreso de un proyecto (respuestas / meta).
 */
export async function getProjectProgress(projectId: string): Promise<{
  target:   number;
  synced:   number;
  approved: number;
  progress: number;
}> {
  try {
    const project = await getProject(projectId);
    const [syncedResult, approvedResult] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
        Query.equal('project_id', projectId),
        Query.equal('status', 'synced'),
        Query.limit(1),
      ]),
      databases.listDocuments(DATABASE_ID, COLLECTION_IDS.FORM_RESPONSES, [
        Query.equal('project_id', projectId),
        Query.equal('status', 'approved'),
        Query.limit(1),
      ]),
    ]);

    const target   = project.target_forms || 1;
    const synced   = syncedResult.total;
    const approved = approvedResult.total;
    const progress = Math.min(100, Math.round((approved / target) * 100));

    return { target, synced, approved, progress };
  } catch (err) {
    throw wrapError(err, 'getProjectProgress');
  }
}
