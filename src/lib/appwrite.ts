/**
 * Control G — Cliente Appwrite (Frontend)
 * =========================================
 * Inicializa el SDK de Appwrite para uso en el browser.
 * Importa este archivo desde cualquier parte del frontend.
 *
 * Variables de entorno requeridas en .env:
 *   VITE_APPWRITE_ENDPOINT
 *   VITE_APPWRITE_PROJECT_ID
 */

import {
  Client,
  Account,
  Databases,
  Storage,
  Teams,
  Functions,
  Realtime,
} from 'appwrite';

// ─── Cliente ─────────────────────────────────────────────────────────────────

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

// ─── Servicios ────────────────────────────────────────────────────────────────

export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);
export const teams     = new Teams(client);
export const functions = new Functions(client);
export const realtime  = new Realtime(client);

// ─── IDs de Base de Datos ─────────────────────────────────────────────────────

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'control_g';

// ─── IDs de Colecciones ───────────────────────────────────────────────────────

export const COLLECTION_IDS = {
  ORGANIZATIONS:       'organizations',
  USER_PROFILES:       'user_profiles',
  DEPARTMENTS:         'departments',
  MUNICIPALITIES:      'municipalities',
  ZONES:               'zones',
  PROJECTS:            'projects',
  PROJECT_ZONES:       'project_zones',
  PROJECT_MEMBERS:     'project_members',
  FORMS:               'forms',
  FORM_VERSIONS:       'form_versions',
  FORM_TEMPLATES:      'form_templates',
  FORM_RESPONSES:      'form_responses',
  FORM_RESPONSE_MEDIA: 'form_response_media',
  CHAT_CHANNELS:       'chat_channels',
  CHAT_MEMBERS:        'chat_members',
  CHAT_MESSAGES:       'chat_messages',
  NOTIFICATIONS:       'notifications',
  SYNC_LOGS:           'sync_logs',
  AUDIT_LOGS:          'audit_logs',
} as const;

// ─── IDs de Buckets ───────────────────────────────────────────────────────────

export const BUCKET_IDS = {
  FIELD_PHOTOS:     'field-photos',
  FIELD_VIDEOS:     'field-videos',
  SIGNATURES:       'signatures',
  OCR_SCANS:        'ocr-scans',
  FORM_ATTACHMENTS: 'form-attachments',
  PDF_TEMPLATES:    'pdf-templates',
  EXPORTS:          'exports',
  AVATARS:          'avatars',
} as const;

// ─── IDs de Equipos ───────────────────────────────────────────────────────────

export const TEAM_IDS = {
  SUPERADMINS:  'superadmins',
  COORDINATORS: 'coordinators',
  ASSISTANTS:   'assistants',
  TECHNICIANS:  'technicians',
} as const;

// ─── Tipos derivados ─────────────────────────────────────────────────────────

export type CollectionId = typeof COLLECTION_IDS[keyof typeof COLLECTION_IDS];
export type BucketId     = typeof BUCKET_IDS[keyof typeof BUCKET_IDS];
export type TeamId       = typeof TEAM_IDS[keyof typeof TEAM_IDS];

// ─── Exportar cliente por defecto ────────────────────────────────────────────

export default client;
