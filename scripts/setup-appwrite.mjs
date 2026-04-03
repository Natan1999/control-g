#!/usr/bin/env node
/**
 * Control G - Script de Setup de Appwrite
 * ========================================
 * Crea la base de datos, colecciones, atributos, índices,
 * buckets de storage y equipos de roles en Appwrite.
 *
 * Uso:
 *   node scripts/setup-appwrite.mjs
 *
 * Variables de entorno requeridas (en .env o en el shell):
 *   APPWRITE_ENDPOINT   — https://cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID — ID del proyecto en Appwrite
 *   APPWRITE_API_KEY    — API Key con permisos de admin
 */

import { Client, Databases, Storage, Teams, Permission, Role, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar .env desde la raíz del proyecto
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// ─── Configuración ───────────────────────────────────────────────────────────

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;

if (!PROJECT_ID || !API_KEY) {
  console.error('❌  Faltan variables de entorno: APPWRITE_PROJECT_ID y APPWRITE_API_KEY');
  console.error('    Copia .env.example a .env y completa los valores.');
  process.exit(1);
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage   = new Storage(client);
const teams     = new Teams(client);

// ─── IDs constantes ──────────────────────────────────────────────────────────

const DATABASE_ID = 'control_g';

const COLLECTIONS = {
  ORGANIZATIONS:        'organizations',
  USER_PROFILES:        'user_profiles',
  DEPARTMENTS:          'departments',
  MUNICIPALITIES:       'municipalities',
  ZONES:                'zones',
  PROJECTS:             'projects',
  PROJECT_ZONES:        'project_zones',
  PROJECT_MEMBERS:      'project_members',
  FORMS:                'forms',
  FORM_VERSIONS:        'form_versions',
  FORM_TEMPLATES:       'form_templates',
  FORM_RESPONSES:       'form_responses',
  FORM_RESPONSE_MEDIA:  'form_response_media',
  CHAT_CHANNELS:        'chat_channels',
  CHAT_MEMBERS:         'chat_members',
  CHAT_MESSAGES:        'chat_messages',
  NOTIFICATIONS:        'notifications',
  SYNC_LOGS:            'sync_logs',
  AUDIT_LOGS:           'audit_logs',
};

const BUCKETS = {
  FIELD_PHOTOS:      'field-photos',
  FIELD_VIDEOS:      'field-videos',
  SIGNATURES:        'signatures',
  OCR_SCANS:         'ocr-scans',
  FORM_ATTACHMENTS:  'form-attachments',
  PDF_TEMPLATES:     'pdf-templates',
  EXPORTS:           'exports',
  AVATARS:           'avatars',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Pausa para dar tiempo a Appwrite de procesar los atributos */
const wait = (ms = 600) => new Promise(r => setTimeout(r, ms));

/**
 * Ejecuta una función de creación y maneja el error 409 (ya existe)
 * de forma silenciosa. Cualquier otro error se relanza.
 */
async function safeCreate(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✔  ${label}`);
    return result;
  } catch (err) {
    if (err?.code === 409 || err?.message?.includes('already exists') || err?.message?.includes('duplicate')) {
      console.log(`  ⚠  ${label} (ya existía, omitido)`);
      return null;
    }
    console.error(`  ✖  ${label} → ${err?.message}`);
    throw err;
  }
}

// ─── 1. Database ─────────────────────────────────────────────────────────────

async function createDatabase() {
  console.log('\n📦  Creando base de datos...');
  await safeCreate(`Database "${DATABASE_ID}"`, () =>
    databases.create(DATABASE_ID, 'control_g')
  );
}

// ─── 2. Colecciones + Atributos ──────────────────────────────────────────────

/**
 * Crea una colección con permisos y retorna su ID.
 * Si ya existe, retorna el ID sin fallar.
 */
async function createCollection(collectionId, name, permissions) {
  return safeCreate(`Colección "${name}"`, () =>
    databases.createCollection(
      DATABASE_ID,
      collectionId,
      name,
      permissions,
      false, // documentSecurity
      true   // enabled
    )
  );
}

// ── Atributos helpers ────────────────────────────────────────────────────────

async function str(col, key, size, required = false, def = null, array = false) {
  await safeCreate(`  attr string ${key}`, () =>
    databases.createStringAttribute(DATABASE_ID, col, key, size, required, def, array)
  );
  await wait();
}

async function enm(col, key, values, required = false, def = null, array = false) {
  await safeCreate(`  attr enum ${key}`, () =>
    databases.createEnumAttribute(DATABASE_ID, col, key, values, required, def, array)
  );
  await wait();
}

async function int(col, key, required = false, min = null, max = null, def = null, array = false) {
  await safeCreate(`  attr integer ${key}`, () =>
    databases.createIntegerAttribute(DATABASE_ID, col, key, required, min, max, def, array)
  );
  await wait();
}

async function flt(col, key, required = false, min = null, max = null, def = null, array = false) {
  await safeCreate(`  attr float ${key}`, () =>
    databases.createFloatAttribute(DATABASE_ID, col, key, required, min, max, def, array)
  );
  await wait();
}

async function bol(col, key, required = false, def = null, array = false) {
  await safeCreate(`  attr boolean ${key}`, () =>
    databases.createBooleanAttribute(DATABASE_ID, col, key, required, def, array)
  );
  await wait();
}

async function dtt(col, key, required = false, def = null, array = false) {
  await safeCreate(`  attr datetime ${key}`, () =>
    databases.createDatetimeAttribute(DATABASE_ID, col, key, required, def, array)
  );
  await wait();
}

async function idx(col, key, type, attrs, orders) {
  // Pequeña espera extra para que los atributos estén listos
  await wait(1000);
  await safeCreate(`  index ${key}`, () =>
    databases.createIndex(DATABASE_ID, col, key, type, attrs, orders)
  );
  await wait(500);
}

// ─────────────────────────────────────────────────────────────────────────────

async function createCollections() {
  console.log('\n🗂   Creando colecciones...');

  const authUsers = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  // ── organizations ──────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.ORGANIZATIONS, 'organizations', authUsers);
  const org = COLLECTIONS.ORGANIZATIONS;
  await str(org, 'name',            200, true);
  await str(org, 'nit',             30);
  await str(org, 'contact_name',    200);
  await str(org, 'contact_email',   255, true);
  await str(org, 'contact_phone',   20);
  await str(org, 'address',         500);
  await str(org, 'city',            100);
  await str(org, 'department',      100);
  await str(org, 'country',         2,   false, 'CO');
  await enm(org, 'plan',            ['starter','professional','enterprise','gobierno'], true, 'starter');
  await dtt(org, 'plan_expires_at');
  await int(org, 'max_users',       false, 0, null, 10);
  await int(org, 'max_forms',       false, 0, null, 5);
  await int(org, 'max_ocr_monthly', false, 0, null, 100);
  await int(org, 'max_storage_gb',  false, 0, null, 5);
  await int(org, 'ocr_usage_current', false, 0, null, 0);
  await flt(org, 'storage_used_mb', false, 0, null, 0);
  await enm(org, 'status',          ['active','suspended','cancelled'], true, 'active');
  await str(org, 'settings',        65535, false, '{}');
  await idx(org, 'idx_org_status',  'key', ['status'], ['ASC']);

  // ── user_profiles ──────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.USER_PROFILES, 'user_profiles', authUsers);
  const up = COLLECTIONS.USER_PROFILES;
  await str(up, 'user_id',              36,  true);
  await str(up, 'organization_id',      36);
  await str(up, 'full_name',            200, true);
  await str(up, 'phone',                20);
  await enm(up, 'role',                 ['superadmin','coordinator','assistant','technician'], true, 'technician');
  await str(up, 'avatar_url',           500);
  await enm(up, 'status',              ['active','inactive','suspended'], true, 'active');
  await dtt(up, 'last_seen_at');
  await dtt(up, 'last_sync_at');
  await flt(up, 'last_known_latitude');
  await flt(up, 'last_known_longitude');
  await str(up, 'device_info',          65535, false, '{}');
  await idx(up, 'idx_up_user_id',       'key',    ['user_id'],         ['ASC']);
  await idx(up, 'idx_up_org_id',        'key',    ['organization_id'], ['ASC']);

  // ── departments ────────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.DEPARTMENTS, 'departments', authUsers);
  const dep = COLLECTIONS.DEPARTMENTS;
  await str(dep, 'code', 5,   true);
  await str(dep, 'name', 100, true);
  await idx(dep, 'idx_dep_code', 'unique', ['code'], ['ASC']);

  // ── municipalities ─────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.MUNICIPALITIES, 'municipalities', authUsers);
  const mun = COLLECTIONS.MUNICIPALITIES;
  await str(mun, 'department_id', 36,  true);
  await str(mun, 'code',          8,   true);
  await str(mun, 'name',          150, true);
  await idx(mun, 'idx_mun_dept',  'key',    ['department_id'], ['ASC']);
  await idx(mun, 'idx_mun_code',  'key',    ['code'],          ['ASC']);

  // ── zones ──────────────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.ZONES, 'zones', authUsers);
  const zon = COLLECTIONS.ZONES;
  await str(zon, 'municipality_id',      36,    true);
  await str(zon, 'organization_id',      36);
  await str(zon, 'name',                 200,   true);
  await enm(zon, 'type',                 ['localidad','comuna','corregimiento','vereda','barrio','sector','manzana','custom'], true, 'sector');
  await str(zon, 'parent_zone_id',       36);
  await str(zon, 'polygon',              65535);
  await int(zon, 'population_estimate',  false, 0);
  await int(zon, 'households_estimate',  false, 0);
  await str(zon, 'metadata',             65535, false, '{}');
  await idx(zon, 'idx_zon_mun',          'key', ['municipality_id'],  ['ASC']);
  await idx(zon, 'idx_zon_org',          'key', ['organization_id'],  ['ASC']);

  // ── projects ───────────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.PROJECTS, 'projects', authUsers);
  const prj = COLLECTIONS.PROJECTS;
  await str(prj, 'organization_id',  36,  true);
  await str(prj, 'coordinator_id',   36,  true);
  await str(prj, 'name',             200, true);
  await str(prj, 'description',      2000);
  await enm(prj, 'type',             ['socioeconomica','conectividad','servicios_publicos','censo','electoral','vivienda','agropecuario','personalizada'], true, 'personalizada');
  await str(prj, 'department_id',    36);
  await str(prj, 'municipality_id',  36);
  await str(prj, 'start_date',       10);
  await str(prj, 'end_date',         10);
  await int(prj, 'target_forms',     false, 0, null, 0);
  await enm(prj, 'status',           ['draft','active','paused','completed','archived'], true, 'draft');
  await str(prj, 'settings',         65535, false, '{}');
  await idx(prj, 'idx_prj_org',      'key', ['organization_id'], ['ASC']);
  await idx(prj, 'idx_prj_status',   'key', ['status'],          ['ASC']);

  // ── project_zones ──────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.PROJECT_ZONES, 'project_zones', authUsers);
  const pz = COLLECTIONS.PROJECT_ZONES;
  await str(pz, 'project_id',   36, true);
  await str(pz, 'zone_id',      36, true);
  await int(pz, 'target_forms', false, 0, null, 0);
  await idx(pz, 'idx_pz_proj',  'key', ['project_id'], ['ASC']);

  // ── project_members ────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.PROJECT_MEMBERS, 'project_members', authUsers);
  const pm = COLLECTIONS.PROJECT_MEMBERS;
  await str(pm, 'project_id',       36, true);
  await str(pm, 'user_id',          36, true);
  await str(pm, 'assigned_zone_id', 36);
  await str(pm, 'supervisor_id',    36);
  await bol(pm, 'is_active',        false, true);
  await dtt(pm, 'joined_at',        true);
  await idx(pm, 'idx_pm_proj',      'key', ['project_id'], ['ASC']);
  await idx(pm, 'idx_pm_user',      'key', ['user_id'],    ['ASC']);

  // ── forms ──────────────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.FORMS, 'forms', authUsers);
  const frm = COLLECTIONS.FORMS;
  await str(frm, 'project_id',         36);
  await str(frm, 'organization_id',    36,    true);
  await str(frm, 'created_by',         36,    true);
  await str(frm, 'name',               200,   true);
  await str(frm, 'description',        2000);
  await int(frm, 'version',            false, 1, null, 1);
  await enm(frm, 'status',             ['draft','published','archived'], true, 'draft');
  await str(frm, 'schema',             65535, true);
  await str(frm, 'ocr_template_map',   65535);
  await str(frm, 'printable_pdf_url',  500);
  await int(frm, 'total_fields',       false, 0, null, 0);
  await idx(frm, 'idx_frm_org',        'key', ['organization_id'], ['ASC']);
  await idx(frm, 'idx_frm_proj',       'key', ['project_id'],      ['ASC']);

  // ── form_versions ──────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.FORM_VERSIONS, 'form_versions', authUsers);
  const fv = COLLECTIONS.FORM_VERSIONS;
  await str(fv, 'form_id',    36,    true);
  await int(fv, 'version',    true,  1);
  await str(fv, 'schema',     65535, true);
  await str(fv, 'changelog',  1000);
  await str(fv, 'created_by', 36,    true);
  await idx(fv, 'idx_fv_form', 'key', ['form_id'], ['ASC']);

  // ── form_templates ─────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.FORM_TEMPLATES, 'form_templates', authUsers);
  const ft = COLLECTIONS.FORM_TEMPLATES;
  await str(ft, 'organization_id', 36);
  await str(ft, 'name',            200,   true);
  await str(ft, 'description',     2000);
  await str(ft, 'category',        100);
  await str(ft, 'schema',          65535, true);
  await int(ft, 'total_fields',    false, 0, null, 0);
  await bol(ft, 'is_system',       false, false);
  await int(ft, 'usage_count',     false, 0, null, 0);
  await idx(ft, 'idx_ft_org',      'key', ['organization_id'], ['ASC']);
  await idx(ft, 'idx_ft_system',   'key', ['is_system'],       ['ASC']);

  // ── form_responses ─────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.FORM_RESPONSES, 'form_responses', authUsers);
  const fr = COLLECTIONS.FORM_RESPONSES;
  await str(fr, 'local_id',             50,    true);
  await str(fr, 'form_id',              36,    true);
  await int(fr, 'form_version',         false, 1);
  await str(fr, 'project_id',           36,    true);
  await str(fr, 'organization_id',      36,    true);
  await str(fr, 'technician_id',        36,    true);
  await str(fr, 'zone_id',              36);
  await str(fr, 'data',                 65535, true);
  await flt(fr, 'latitude');
  await flt(fr, 'longitude');
  await flt(fr, 'accuracy');
  await flt(fr, 'altitude');
  await enm(fr, 'status',               ['synced','in_review','validated','approved','rejected'], true, 'synced');
  await enm(fr, 'source',              ['digital','ocr_camera','ocr_pdf'], true, 'digital');
  await flt(fr, 'ocr_confidence');
  await str(fr, 'ocr_field_confidences', 65535);
  await str(fr, 'rejection_reason',      1000);
  await str(fr, 'review_notes',          65535);
  await str(fr, 'reviewed_by',           36);
  await dtt(fr, 'reviewed_at');
  await str(fr, 'device_info',           65535, false, '{}');
  await dtt(fr, 'started_at');
  await dtt(fr, 'completed_at');
  await dtt(fr, 'synced_at');
  await idx(fr, 'idx_fr_org',           'key',    ['organization_id'], ['ASC']);
  await idx(fr, 'idx_fr_proj',          'key',    ['project_id'],      ['ASC']);
  await idx(fr, 'idx_fr_tech',          'key',    ['technician_id'],   ['ASC']);
  await idx(fr, 'idx_fr_status',        'key',    ['status'],          ['ASC']);
  await idx(fr, 'idx_fr_local_id',      'unique', ['local_id'],        ['ASC']);

  // ── form_response_media ────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.FORM_RESPONSE_MEDIA, 'form_response_media', authUsers);
  const frm2 = COLLECTIONS.FORM_RESPONSE_MEDIA;
  await str(frm2, 'response_id',        36,  true);
  await str(frm2, 'local_response_id',  50,  true);
  await str(frm2, 'field_key',          100, true);
  await enm(frm2, 'media_type',         ['photo','video','signature','document','ocr_scan'], true, 'photo');
  await str(frm2, 'storage_path',       500);
  await str(frm2, 'original_filename',  255);
  await str(frm2, 'mime_type',          100);
  await int(frm2, 'file_size',          false, 0);
  await int(frm2, 'width',              false, 0);
  await int(frm2, 'height',             false, 0);
  await int(frm2, 'duration_seconds',   false, 0);
  await bol(frm2, 'synced',             false, false);
  await idx(frm2, 'idx_frm2_resp',      'key', ['response_id'], ['ASC']);

  // ── chat_channels ──────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.CHAT_CHANNELS, 'chat_channels', authUsers);
  const cc = COLLECTIONS.CHAT_CHANNELS;
  await str(cc, 'organization_id', 36,  true);
  await str(cc, 'project_id',      36);
  await str(cc, 'zone_id',         36);
  await str(cc, 'name',            200);
  await enm(cc, 'type',            ['direct','project','zone','group'], true, 'project');
  await idx(cc, 'idx_cc_org',      'key', ['organization_id'], ['ASC']);

  // ── chat_members ───────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.CHAT_MEMBERS, 'chat_members', authUsers);
  const cme = COLLECTIONS.CHAT_MEMBERS;
  await str(cme, 'channel_id',   36, true);
  await str(cme, 'user_id',      36, true);
  await dtt(cme, 'last_read_at');
  await dtt(cme, 'joined_at',    true);
  await idx(cme, 'idx_cme_chan', 'key', ['channel_id'], ['ASC']);
  await idx(cme, 'idx_cme_user', 'key', ['user_id'],    ['ASC']);

  // ── chat_messages ──────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.CHAT_MESSAGES, 'chat_messages', authUsers);
  const cms = COLLECTIONS.CHAT_MESSAGES;
  await str(cms, 'channel_id',   36, true);
  await str(cms, 'sender_id',    36, true);
  await str(cms, 'content',      5000);
  await enm(cms, 'message_type', ['text','voice','image','document','system'], true, 'text');
  await str(cms, 'media_url',    500);
  await str(cms, 'local_id',     50);
  await idx(cms, 'idx_cms_chan', 'key', ['channel_id'], ['ASC']);

  // ── notifications ──────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.NOTIFICATIONS, 'notifications', authUsers);
  const not = COLLECTIONS.NOTIFICATIONS;
  await str(not, 'user_id',  36,    true);
  await str(not, 'title',    200,   true);
  await str(not, 'body',     1000,  true);
  await enm(not, 'type',     ['assignment','approval','rejection','message','sync','system','alert'], true, 'system');
  await bol(not, 'read',     false, false);
  await str(not, 'data',     65535, false, '{}');
  await idx(not, 'idx_not_user',  'key', ['user_id'], ['ASC']);
  await idx(not, 'idx_not_read',  'key', ['read'],    ['ASC']);

  // ── sync_logs ──────────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.SYNC_LOGS, 'sync_logs', authUsers);
  const sl = COLLECTIONS.SYNC_LOGS;
  await str(sl, 'device_id',      100, true);
  await str(sl, 'user_id',        36,  true);
  await str(sl, 'organization_id', 36, true);
  await int(sl, 'forms_synced',   false, 0, null, 0);
  await int(sl, 'media_synced',   false, 0, null, 0);
  await enm(sl, 'status',         ['success','partial','failed'], true, 'success');
  await str(sl, 'error_details',  2000);
  await dtt(sl, 'started_at',     true);
  await dtt(sl, 'completed_at');
  await idx(sl, 'idx_sl_user',    'key', ['user_id'],         ['ASC']);
  await idx(sl, 'idx_sl_org',     'key', ['organization_id'], ['ASC']);

  // ── audit_logs ─────────────────────────────────────────────────────────────
  await createCollection(COLLECTIONS.AUDIT_LOGS, 'audit_logs', authUsers);
  const al = COLLECTIONS.AUDIT_LOGS;
  await str(al, 'organization_id', 36);
  await str(al, 'user_id',         36,  true);
  await str(al, 'action',          100, true);
  await str(al, 'resource_type',   100);
  await str(al, 'resource_id',     36);
  await str(al, 'metadata',        65535, false, '{}');
  await str(al, 'ip_address',      45);
  await idx(al, 'idx_al_org',      'key', ['organization_id'], ['ASC']);
  await idx(al, 'idx_al_user',     'key', ['user_id'],         ['ASC']);
  await idx(al, 'idx_al_action',   'key', ['action'],          ['ASC']);
}

// ─── 3. Storage Buckets ───────────────────────────────────────────────────────

async function createStorageBuckets() {
  console.log('\n🪣  Creando storage buckets...');

  const MB = 1024 * 1024;

  // Privado — solo usuarios autenticados
  const privatePerms = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  // Semi-público — cualquiera puede leer, auth puede crear
  const semiPublicPerms = [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  // Público — cualquiera puede leer (avatares)
  const publicPerms = [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  const bucketsConfig = [
    {
      id: BUCKETS.FIELD_PHOTOS,
      name: 'Field Photos',
      permissions: privatePerms,
      maxSize: 2 * MB,
      extensions: ['jpg', 'jpeg', 'png', 'webp'],
    },
    {
      id: BUCKETS.FIELD_VIDEOS,
      name: 'Field Videos',
      permissions: privatePerms,
      maxSize: 20 * MB,
      extensions: ['mp4', 'mov', 'webm'],
    },
    {
      id: BUCKETS.SIGNATURES,
      name: 'Signatures',
      permissions: privatePerms,
      maxSize: Math.round(0.5 * MB),
      extensions: ['png'],
    },
    {
      id: BUCKETS.OCR_SCANS,
      name: 'OCR Scans',
      permissions: privatePerms,
      maxSize: 5 * MB,
      extensions: ['jpg', 'jpeg', 'png', 'pdf'],
    },
    {
      id: BUCKETS.FORM_ATTACHMENTS,
      name: 'Form Attachments',
      permissions: privatePerms,
      maxSize: 10 * MB,
      extensions: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
    },
    {
      id: BUCKETS.PDF_TEMPLATES,
      name: 'PDF Templates',
      permissions: semiPublicPerms,
      maxSize: 5 * MB,
      extensions: ['pdf'],
    },
    {
      id: BUCKETS.EXPORTS,
      name: 'Exports',
      permissions: privatePerms,
      maxSize: 20 * MB,
      extensions: ['pdf', 'xlsx', 'csv', 'zip'],
    },
    {
      id: BUCKETS.AVATARS,
      name: 'Avatars',
      permissions: publicPerms,
      maxSize: 1 * MB,
      extensions: ['jpg', 'jpeg', 'png', 'webp'],
    },
  ];

  for (const b of bucketsConfig) {
    await safeCreate(`Bucket "${b.name}"`, () =>
      storage.createBucket(
        b.id,
        b.name,
        b.permissions,
        false,        // fileSecurity
        true,         // enabled
        b.maxSize,
        b.extensions,
        'none',       // compression
        true,         // encryption
        false         // antivirus
      )
    );
  }
}

// ─── 4. Teams ─────────────────────────────────────────────────────────────────

async function createTeams() {
  console.log('\n👥  Creando equipos de roles...');

  const roleTeams = [
    { id: 'superadmins',  name: 'Superadmins'  },
    { id: 'coordinators', name: 'Coordinators' },
    { id: 'assistants',   name: 'Assistants'   },
    { id: 'technicians',  name: 'Technicians'  },
  ];

  for (const t of roleTeams) {
    await safeCreate(`Team "${t.name}"`, () =>
      teams.create(t.id, t.name)
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Control G — Appwrite Setup                 ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n🔗  Endpoint : ${ENDPOINT}`);
  console.log(`🆔  Project  : ${PROJECT_ID}`);

  const start = Date.now();

  try {
    await createDatabase();
    await createCollections();
    await createStorageBuckets();
    await createTeams();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║   ✅  Setup completado exitosamente          ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`\n⏱   Tiempo total: ${elapsed}s`);
    console.log('\n📋  Resumen:');
    console.log(`   • Base de datos : control_g`);
    console.log(`   • Colecciones   : ${Object.keys(COLLECTIONS).length}`);
    console.log(`   • Buckets       : ${Object.keys(BUCKETS).length}`);
    console.log(`   • Equipos       : 4 (superadmins, coordinators, assistants, technicians)`);
    console.log('\n🔜  Siguiente paso:');
    console.log('   node scripts/seed-appwrite.mjs\n');
  } catch (err) {
    console.error('\n❌  Error durante el setup:', err?.message || err);
    console.error('    Revisa tus credenciales en .env y vuelve a intentarlo.');
    process.exit(1);
  }
}

main();
