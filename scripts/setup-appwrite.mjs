#!/usr/bin/env node
/**
 * Control G - Script de Setup de Appwrite (v2 — compatible con Appwrite 1.8.x)
 * ==============================================================================
 * Crea la base de datos, colecciones, atributos, índices,
 * buckets de storage y equipos de roles en Appwrite.
 *
 * Uso:
 *   node scripts/setup-appwrite.mjs
 */

import { Client, Databases, Storage, Teams, Permission, Role, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// ─── Configuración ───────────────────────────────────────────────────────────

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;

if (!PROJECT_ID || !API_KEY) {
  console.error('❌  Faltan: APPWRITE_PROJECT_ID y APPWRITE_API_KEY en .env');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage   = new Storage(client);
const teams     = new Teams(client);

// ─── IDs ─────────────────────────────────────────────────────────────────────

const DATABASE_ID = 'control_g';

const C = {
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
};

const BUCKETS = {
  FIELD_PHOTOS:     'field-photos',
  FIELD_VIDEOS:     'field-videos',
  SIGNATURES:       'signatures',
  OCR_SCANS:        'ocr-scans',
  FORM_ATTACHMENTS: 'form-attachments',
  PDF_TEMPLATES:    'pdf-templates',
  EXPORTS:          'exports',
  AVATARS:          'avatars',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const wait = (ms = 700) => new Promise(r => setTimeout(r, ms));

let totalOk = 0;
let totalSkip = 0;

async function safe(label, fn) {
  try {
    await fn();
    totalOk++;
    process.stdout.write(`  ✔  ${label}\n`);
  } catch (err) {
    const code = err?.code;
    const msg  = err?.message || '';
    if (code === 409 || msg.includes('already exists') || msg.includes('duplicate')) {
      totalSkip++;
      process.stdout.write(`  ⚠  ${label} (ya existe)\n`);
    } else {
      process.stdout.write(`  ✖  ${label} → ${msg}\n`);
      throw err;
    }
  }
}

// Atributos — NOTA: Appwrite 1.8.x no acepta default en atributos required.
// Usamos required=false cuando queremos default, required=true cuando no hay default.

async function str(col, key, size, required = false, def = null) {
  await safe(`str ${key}`, () =>
    databases.createStringAttribute(DATABASE_ID, col, key, size, required,
      required ? undefined : (def ?? undefined), false)
  );
  await wait();
}

async function enm(col, key, values, required = false, def = null) {
  await safe(`enum ${key}`, () =>
    databases.createEnumAttribute(DATABASE_ID, col, key, values, required,
      required ? undefined : (def ?? undefined), false)
  );
  await wait();
}

async function int(col, key, required = false, min = null, max = null, def = null) {
  await safe(`int ${key}`, () =>
    databases.createIntegerAttribute(DATABASE_ID, col, key, required,
      min ?? undefined, max ?? undefined,
      required ? undefined : (def ?? undefined), false)
  );
  await wait();
}

async function flt(col, key, required = false, min = null, max = null, def = null) {
  await safe(`float ${key}`, () =>
    databases.createFloatAttribute(DATABASE_ID, col, key, required,
      min ?? undefined, max ?? undefined,
      required ? undefined : (def ?? undefined), false)
  );
  await wait();
}

async function bol(col, key, required = false, def = null) {
  await safe(`bool ${key}`, () =>
    databases.createBooleanAttribute(DATABASE_ID, col, key, required,
      required ? undefined : (def ?? undefined), false)
  );
  await wait();
}

async function dtt(col, key, required = false) {
  await safe(`datetime ${key}`, () =>
    databases.createDatetimeAttribute(DATABASE_ID, col, key, required, undefined, false)
  );
  await wait();
}

async function idx(col, key, type, attrs, orders) {
  await wait(1200); // Esperar a que los atributos estén listos
  await safe(`index ${key}`, () =>
    databases.createIndex(DATABASE_ID, col, key, type, attrs, orders)
  );
  await wait(600);
}

async function col(id, name) {
  const perms = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];
  await safe(`Colección "${name}"`, () =>
    databases.createCollection(DATABASE_ID, id, name, perms, false, true)
  );
}

// ─── 1. Database ─────────────────────────────────────────────────────────────

async function createDatabase() {
  console.log('\n📦  Creando base de datos...');
  await safe(`Database "${DATABASE_ID}"`, () =>
    databases.create(DATABASE_ID, 'Control G')
  );
}

// ─── 2. Colecciones ──────────────────────────────────────────────────────────

async function createCollections() {
  console.log('\n🗂   Creando colecciones y atributos...\n');

  // ── organizations ──────────────────────────────────────────────────────────
  console.log('  → organizations');
  await col(C.ORGANIZATIONS, 'organizations');
  await str(C.ORGANIZATIONS, 'name',             200, true);
  await str(C.ORGANIZATIONS, 'nit',              30);
  await str(C.ORGANIZATIONS, 'contact_name',     200);
  await str(C.ORGANIZATIONS, 'contact_email',    255, true);
  await str(C.ORGANIZATIONS, 'contact_phone',    20);
  await str(C.ORGANIZATIONS, 'address',          500);
  await str(C.ORGANIZATIONS, 'city',             100);
  await str(C.ORGANIZATIONS, 'department',       100);
  await str(C.ORGANIZATIONS, 'country',          2,   false, 'CO');
  await enm(C.ORGANIZATIONS, 'plan',             ['starter','professional','enterprise','gobierno'], false, 'starter');
  await dtt(C.ORGANIZATIONS, 'plan_expires_at');
  await int(C.ORGANIZATIONS, 'max_users',        false, 0, null, 10);
  await int(C.ORGANIZATIONS, 'max_forms',        false, 0, null, 5);
  await int(C.ORGANIZATIONS, 'max_ocr_monthly',  false, 0, null, 100);
  await int(C.ORGANIZATIONS, 'max_storage_gb',   false, 0, null, 5);
  await int(C.ORGANIZATIONS, 'ocr_usage_current',false, 0, null, 0);
  await flt(C.ORGANIZATIONS, 'storage_used_mb',  false, 0, null, 0);
  await enm(C.ORGANIZATIONS, 'status',           ['active','suspended','cancelled'], false, 'active');
  await str(C.ORGANIZATIONS, 'settings',         65535, false, '{}');
  await idx(C.ORGANIZATIONS, 'idx_org_status',   'key', ['status'], ['ASC']);

  // ── user_profiles ──────────────────────────────────────────────────────────
  console.log('\n  → user_profiles');
  await col(C.USER_PROFILES, 'user_profiles');
  await str(C.USER_PROFILES, 'user_id',               36,  true);
  await str(C.USER_PROFILES, 'organization_id',       36);
  await str(C.USER_PROFILES, 'full_name',             200, true);
  await str(C.USER_PROFILES, 'phone',                 20);
  await enm(C.USER_PROFILES, 'role',                  ['superadmin','coordinator','assistant','technician'], false, 'technician');
  await str(C.USER_PROFILES, 'avatar_url',            500);
  await enm(C.USER_PROFILES, 'status',               ['active','inactive','suspended'], false, 'active');
  await dtt(C.USER_PROFILES, 'last_seen_at');
  await dtt(C.USER_PROFILES, 'last_sync_at');
  await flt(C.USER_PROFILES, 'last_known_latitude');
  await flt(C.USER_PROFILES, 'last_known_longitude');
  await str(C.USER_PROFILES, 'device_info',           65535, false, '{}');
  await idx(C.USER_PROFILES, 'idx_up_user_id',        'unique', ['user_id'],         ['ASC']);
  await idx(C.USER_PROFILES, 'idx_up_org_id',         'key',    ['organization_id'], ['ASC']);

  // ── departments ────────────────────────────────────────────────────────────
  console.log('\n  → departments');
  await col(C.DEPARTMENTS, 'departments');
  await str(C.DEPARTMENTS, 'code', 5,   true);
  await str(C.DEPARTMENTS, 'name', 100, true);
  await idx(C.DEPARTMENTS, 'idx_dep_code', 'unique', ['code'], ['ASC']);

  // ── municipalities ─────────────────────────────────────────────────────────
  console.log('\n  → municipalities');
  await col(C.MUNICIPALITIES, 'municipalities');
  await str(C.MUNICIPALITIES, 'department_id', 36,  true);
  await str(C.MUNICIPALITIES, 'code',          8,   true);
  await str(C.MUNICIPALITIES, 'name',          150, true);
  await idx(C.MUNICIPALITIES, 'idx_mun_dept',  'key',    ['department_id'], ['ASC']);
  await idx(C.MUNICIPALITIES, 'idx_mun_code',  'unique', ['code'],          ['ASC']);

  // ── zones ──────────────────────────────────────────────────────────────────
  console.log('\n  → zones');
  await col(C.ZONES, 'zones');
  await str(C.ZONES, 'municipality_id',     36,    true);
  await str(C.ZONES, 'organization_id',     36);
  await str(C.ZONES, 'name',                200,   true);
  await enm(C.ZONES, 'type',                ['localidad','comuna','corregimiento','vereda','barrio','sector','manzana','custom'], false, 'sector');
  await str(C.ZONES, 'parent_zone_id',      36);
  await str(C.ZONES, 'polygon',             65535);
  await int(C.ZONES, 'population_estimate', false, 0);
  await int(C.ZONES, 'households_estimate', false, 0);
  await str(C.ZONES, 'metadata',            65535, false, '{}');
  await idx(C.ZONES, 'idx_zon_mun',         'key', ['municipality_id'], ['ASC']);
  await idx(C.ZONES, 'idx_zon_org',         'key', ['organization_id'], ['ASC']);

  // ── projects ───────────────────────────────────────────────────────────────
  console.log('\n  → projects');
  await col(C.PROJECTS, 'projects');
  await str(C.PROJECTS, 'organization_id', 36,  true);
  await str(C.PROJECTS, 'coordinator_id',  36,  true);
  await str(C.PROJECTS, 'name',            200, true);
  await str(C.PROJECTS, 'description',     2000);
  await enm(C.PROJECTS, 'type',           ['socioeconomica','conectividad','servicios_publicos','censo','electoral','vivienda','agropecuario','personalizada'], false, 'personalizada');
  await str(C.PROJECTS, 'department_id',  36);
  await str(C.PROJECTS, 'municipality_id',36);
  await str(C.PROJECTS, 'start_date',     10);
  await str(C.PROJECTS, 'end_date',       10);
  await int(C.PROJECTS, 'target_forms',   false, 0, null, 0);
  await enm(C.PROJECTS, 'status',         ['draft','active','paused','completed','archived'], false, 'draft');
  await str(C.PROJECTS, 'settings',       65535, false, '{}');
  await idx(C.PROJECTS, 'idx_prj_org',    'key', ['organization_id'], ['ASC']);
  await idx(C.PROJECTS, 'idx_prj_coord',  'key', ['coordinator_id'],  ['ASC']);
  await idx(C.PROJECTS, 'idx_prj_status', 'key', ['status'],          ['ASC']);

  // ── project_zones ──────────────────────────────────────────────────────────
  console.log('\n  → project_zones');
  await col(C.PROJECT_ZONES, 'project_zones');
  await str(C.PROJECT_ZONES, 'project_id',   36, true);
  await str(C.PROJECT_ZONES, 'zone_id',      36, true);
  await int(C.PROJECT_ZONES, 'target_forms', false, 0, null, 0);
  await idx(C.PROJECT_ZONES, 'idx_pz_proj',  'key', ['project_id'], ['ASC']);

  // ── project_members ────────────────────────────────────────────────────────
  console.log('\n  → project_members');
  await col(C.PROJECT_MEMBERS, 'project_members');
  await str(C.PROJECT_MEMBERS, 'project_id',       36, true);
  await str(C.PROJECT_MEMBERS, 'user_id',          36, true);
  await str(C.PROJECT_MEMBERS, 'assigned_zone_id', 36);
  await str(C.PROJECT_MEMBERS, 'supervisor_id',    36);
  await bol(C.PROJECT_MEMBERS, 'is_active',        false, true);
  await dtt(C.PROJECT_MEMBERS, 'joined_at',        true);
  await idx(C.PROJECT_MEMBERS, 'idx_pm_proj',      'key', ['project_id'], ['ASC']);
  await idx(C.PROJECT_MEMBERS, 'idx_pm_user',      'key', ['user_id'],    ['ASC']);

  // ── forms ──────────────────────────────────────────────────────────────────
  console.log('\n  → forms');
  await col(C.FORMS, 'forms');
  await str(C.FORMS, 'project_id',        36);
  await str(C.FORMS, 'organization_id',   36,    true);
  await str(C.FORMS, 'created_by',        36,    true);
  await str(C.FORMS, 'name',              200,   true);
  await str(C.FORMS, 'description',       2000);
  await int(C.FORMS, 'version',           false, 1, null, 1);
  await enm(C.FORMS, 'status',           ['draft','published','archived'], false, 'draft');
  await str(C.FORMS, 'schema',            65535, true);
  await str(C.FORMS, 'ocr_template_map',  65535);
  await str(C.FORMS, 'printable_pdf_url', 500);
  await int(C.FORMS, 'total_fields',      false, 0, null, 0);
  await idx(C.FORMS, 'idx_frm_org',       'key', ['organization_id'], ['ASC']);
  await idx(C.FORMS, 'idx_frm_proj',      'key', ['project_id'],      ['ASC']);

  // ── form_versions ──────────────────────────────────────────────────────────
  console.log('\n  → form_versions');
  await col(C.FORM_VERSIONS, 'form_versions');
  await str(C.FORM_VERSIONS, 'form_id',    36,    true);
  await int(C.FORM_VERSIONS, 'version',    true,  1);
  await str(C.FORM_VERSIONS, 'schema',     65535, true);
  await str(C.FORM_VERSIONS, 'changelog',  1000);
  await str(C.FORM_VERSIONS, 'created_by', 36,    true);
  await idx(C.FORM_VERSIONS, 'idx_fv_form', 'key', ['form_id'], ['ASC']);

  // ── form_templates ─────────────────────────────────────────────────────────
  console.log('\n  → form_templates');
  await col(C.FORM_TEMPLATES, 'form_templates');
  await str(C.FORM_TEMPLATES, 'organization_id', 36);
  await str(C.FORM_TEMPLATES, 'name',            200,   true);
  await str(C.FORM_TEMPLATES, 'description',     2000);
  await str(C.FORM_TEMPLATES, 'category',        100);
  await str(C.FORM_TEMPLATES, 'schema',          65535, true);
  await int(C.FORM_TEMPLATES, 'total_fields',    false, 0, null, 0);
  await bol(C.FORM_TEMPLATES, 'is_system',       false, false);
  await int(C.FORM_TEMPLATES, 'usage_count',     false, 0, null, 0);
  await idx(C.FORM_TEMPLATES, 'idx_ft_org',      'key', ['organization_id'], ['ASC']);

  // ── form_responses ─────────────────────────────────────────────────────────
  console.log('\n  → form_responses');
  await col(C.FORM_RESPONSES, 'form_responses');
  await str(C.FORM_RESPONSES, 'local_id',              50,    true);
  await str(C.FORM_RESPONSES, 'form_id',               36,    true);
  await int(C.FORM_RESPONSES, 'form_version',          false, 1);
  await str(C.FORM_RESPONSES, 'project_id',            36,    true);
  await str(C.FORM_RESPONSES, 'organization_id',       36,    true);
  await str(C.FORM_RESPONSES, 'technician_id',         36,    true);
  await str(C.FORM_RESPONSES, 'zone_id',               36);
  await str(C.FORM_RESPONSES, 'data',                  65535, true);
  await flt(C.FORM_RESPONSES, 'latitude');
  await flt(C.FORM_RESPONSES, 'longitude');
  await flt(C.FORM_RESPONSES, 'accuracy');
  await flt(C.FORM_RESPONSES, 'altitude');
  await enm(C.FORM_RESPONSES, 'status',               ['synced','in_review','validated','approved','rejected'], false, 'synced');
  await enm(C.FORM_RESPONSES, 'source',               ['digital','ocr_camera','ocr_pdf'], false, 'digital');
  await flt(C.FORM_RESPONSES, 'ocr_confidence');
  await str(C.FORM_RESPONSES, 'ocr_field_confidences', 65535);
  await str(C.FORM_RESPONSES, 'rejection_reason',      1000);
  await str(C.FORM_RESPONSES, 'review_notes',          65535);
  await str(C.FORM_RESPONSES, 'reviewed_by',           36);
  await dtt(C.FORM_RESPONSES, 'reviewed_at');
  await str(C.FORM_RESPONSES, 'device_info',           65535, false, '{}');
  await dtt(C.FORM_RESPONSES, 'started_at');
  await dtt(C.FORM_RESPONSES, 'completed_at');
  await dtt(C.FORM_RESPONSES, 'synced_at');
  await idx(C.FORM_RESPONSES, 'idx_fr_org',            'key',    ['organization_id'], ['ASC']);
  await idx(C.FORM_RESPONSES, 'idx_fr_proj',           'key',    ['project_id'],      ['ASC']);
  await idx(C.FORM_RESPONSES, 'idx_fr_tech',           'key',    ['technician_id'],   ['ASC']);
  await idx(C.FORM_RESPONSES, 'idx_fr_status',         'key',    ['status'],          ['ASC']);
  await idx(C.FORM_RESPONSES, 'idx_fr_local',          'unique', ['local_id'],        ['ASC']);

  // ── form_response_media ────────────────────────────────────────────────────
  console.log('\n  → form_response_media');
  await col(C.FORM_RESPONSE_MEDIA, 'form_response_media');
  await str(C.FORM_RESPONSE_MEDIA, 'response_id',       36,  true);
  await str(C.FORM_RESPONSE_MEDIA, 'local_response_id', 50);
  await str(C.FORM_RESPONSE_MEDIA, 'field_key',         100, true);
  await enm(C.FORM_RESPONSE_MEDIA, 'media_type',        ['photo','video','signature','document','ocr_scan'], false, 'photo');
  await str(C.FORM_RESPONSE_MEDIA, 'storage_path',      500);
  await str(C.FORM_RESPONSE_MEDIA, 'original_filename', 255);
  await str(C.FORM_RESPONSE_MEDIA, 'mime_type',         100);
  await int(C.FORM_RESPONSE_MEDIA, 'file_size',         false, 0);
  await bol(C.FORM_RESPONSE_MEDIA, 'synced',            false, false);
  await idx(C.FORM_RESPONSE_MEDIA, 'idx_frm2_resp',     'key', ['response_id'], ['ASC']);

  // ── chat_channels ──────────────────────────────────────────────────────────
  console.log('\n  → chat_channels');
  await col(C.CHAT_CHANNELS, 'chat_channels');
  await str(C.CHAT_CHANNELS, 'organization_id', 36,  true);
  await str(C.CHAT_CHANNELS, 'project_id',      36);
  await str(C.CHAT_CHANNELS, 'zone_id',         36);
  await str(C.CHAT_CHANNELS, 'name',            200);
  await enm(C.CHAT_CHANNELS, 'type',           ['direct','project','zone','group'], false, 'project');
  await idx(C.CHAT_CHANNELS, 'idx_cc_org',     'key', ['organization_id'], ['ASC']);

  // ── chat_members ───────────────────────────────────────────────────────────
  console.log('\n  → chat_members');
  await col(C.CHAT_MEMBERS, 'chat_members');
  await str(C.CHAT_MEMBERS, 'channel_id',   36, true);
  await str(C.CHAT_MEMBERS, 'user_id',      36, true);
  await dtt(C.CHAT_MEMBERS, 'last_read_at');
  await dtt(C.CHAT_MEMBERS, 'joined_at',    true);
  await idx(C.CHAT_MEMBERS, 'idx_cme_chan', 'key', ['channel_id'], ['ASC']);
  await idx(C.CHAT_MEMBERS, 'idx_cme_user', 'key', ['user_id'],   ['ASC']);

  // ── chat_messages ──────────────────────────────────────────────────────────
  console.log('\n  → chat_messages');
  await col(C.CHAT_MESSAGES, 'chat_messages');
  await str(C.CHAT_MESSAGES, 'channel_id',   36, true);
  await str(C.CHAT_MESSAGES, 'sender_id',    36, true);
  await str(C.CHAT_MESSAGES, 'content',      5000);
  await enm(C.CHAT_MESSAGES, 'message_type',['text','voice','image','document','system'], false, 'text');
  await str(C.CHAT_MESSAGES, 'media_url',    500);
  await str(C.CHAT_MESSAGES, 'local_id',     50);
  await idx(C.CHAT_MESSAGES, 'idx_cms_chan', 'key', ['channel_id'], ['ASC']);

  // ── notifications ──────────────────────────────────────────────────────────
  console.log('\n  → notifications');
  await col(C.NOTIFICATIONS, 'notifications');
  await str(C.NOTIFICATIONS, 'user_id',   36,   true);
  await str(C.NOTIFICATIONS, 'title',     200,  true);
  await str(C.NOTIFICATIONS, 'body',      1000, true);
  await enm(C.NOTIFICATIONS, 'type',     ['assignment','approval','rejection','message','sync','system','alert'], false, 'system');
  await bol(C.NOTIFICATIONS, 'read',     false, false);
  await str(C.NOTIFICATIONS, 'data',     65535, false, '{}');
  await idx(C.NOTIFICATIONS, 'idx_not_user', 'key', ['user_id'], ['ASC']);
  await idx(C.NOTIFICATIONS, 'idx_not_read', 'key', ['read'],    ['ASC']);

  // ── sync_logs ──────────────────────────────────────────────────────────────
  console.log('\n  → sync_logs');
  await col(C.SYNC_LOGS, 'sync_logs');
  await str(C.SYNC_LOGS, 'device_id',       100, true);
  await str(C.SYNC_LOGS, 'user_id',         36,  true);
  await str(C.SYNC_LOGS, 'organization_id', 36,  true);
  await int(C.SYNC_LOGS, 'forms_synced',    false, 0, null, 0);
  await int(C.SYNC_LOGS, 'media_synced',    false, 0, null, 0);
  await enm(C.SYNC_LOGS, 'status',         ['success','partial','failed'], false, 'success');
  await str(C.SYNC_LOGS, 'error_details',   2000);
  await dtt(C.SYNC_LOGS, 'started_at',      true);
  await dtt(C.SYNC_LOGS, 'completed_at');
  await idx(C.SYNC_LOGS, 'idx_sl_user',     'key', ['user_id'],         ['ASC']);
  await idx(C.SYNC_LOGS, 'idx_sl_org',      'key', ['organization_id'], ['ASC']);

  // ── audit_logs ─────────────────────────────────────────────────────────────
  console.log('\n  → audit_logs');
  await col(C.AUDIT_LOGS, 'audit_logs');
  await str(C.AUDIT_LOGS, 'organization_id', 36);
  await str(C.AUDIT_LOGS, 'user_id',         36,  true);
  await str(C.AUDIT_LOGS, 'action',          100, true);
  await str(C.AUDIT_LOGS, 'resource_type',   100);
  await str(C.AUDIT_LOGS, 'resource_id',     36);
  await str(C.AUDIT_LOGS, 'metadata',        65535, false, '{}');
  await str(C.AUDIT_LOGS, 'ip_address',      45);
  await idx(C.AUDIT_LOGS, 'idx_al_org',      'key', ['organization_id'], ['ASC']);
  await idx(C.AUDIT_LOGS, 'idx_al_user',     'key', ['user_id'],         ['ASC']);
  await idx(C.AUDIT_LOGS, 'idx_al_action',   'key', ['action'],          ['ASC']);
}

// ─── 3. Storage Buckets ───────────────────────────────────────────────────────

async function createStorageBuckets() {
  console.log('\n🪣  Creando storage buckets...');

  const MB = 1024 * 1024;
  const priv = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];
  const pub = [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  const cfg = [
    { id: BUCKETS.FIELD_PHOTOS,     name: 'Field Photos',     perms: priv,  max: 2 * MB,          ext: ['jpg','jpeg','png','webp'] },
    { id: BUCKETS.FIELD_VIDEOS,     name: 'Field Videos',     perms: priv,  max: 20 * MB,         ext: ['mp4','mov','webm'] },
    { id: BUCKETS.SIGNATURES,       name: 'Signatures',       perms: priv,  max: 524288,          ext: ['png'] },
    { id: BUCKETS.OCR_SCANS,        name: 'OCR Scans',        perms: priv,  max: 5 * MB,          ext: ['jpg','jpeg','png','pdf'] },
    { id: BUCKETS.FORM_ATTACHMENTS, name: 'Form Attachments', perms: priv,  max: 10 * MB,         ext: ['jpg','jpeg','png','pdf','doc','docx'] },
    { id: BUCKETS.PDF_TEMPLATES,    name: 'PDF Templates',    perms: pub,   max: 5 * MB,          ext: ['pdf'] },
    { id: BUCKETS.EXPORTS,          name: 'Exports',          perms: priv,  max: 20 * MB,         ext: ['pdf','xlsx','csv','zip'] },
    { id: BUCKETS.AVATARS,          name: 'Avatars',          perms: pub,   max: 1 * MB,          ext: ['jpg','jpeg','png','webp'] },
  ];

  for (const b of cfg) {
    await safe(`Bucket "${b.name}"`, () =>
      storage.createBucket(b.id, b.name, b.perms, false, true, b.max, b.ext, 'none', true, false)
    );
  }
}

// ─── 4. Teams ─────────────────────────────────────────────────────────────────

async function createTeams() {
  console.log('\n👥  Creando equipos de roles...');
  const ts = [
    { id: 'superadmins',  name: 'Superadmins'  },
    { id: 'coordinators', name: 'Coordinators' },
    { id: 'assistants',   name: 'Assistants'   },
    { id: 'technicians',  name: 'Technicians'  },
  ];
  for (const t of ts) {
    await safe(`Team "${t.name}"`, () => teams.create(t.id, t.name));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Control G — Appwrite Setup v2          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n🔗  Endpoint : ${ENDPOINT}`);
  console.log(`🆔  Project  : ${PROJECT_ID}`);

  const t0 = Date.now();
  try {
    await createDatabase();
    await createCollections();
    await createStorageBuckets();
    await createTeams();

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   ✅  Setup completado exitosamente      ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`\n⏱   Tiempo: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    console.log(`📊  Creados: ${totalOk}  |  Ya existían: ${totalSkip}`);
    console.log('\n🔜  Siguiente: node scripts/seed-appwrite.mjs\n');
  } catch (err) {
    console.error('\n❌  Error durante el setup:', err?.message || err);
    process.exit(1);
  }
}

main();
