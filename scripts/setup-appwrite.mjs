#!/usr/bin/env node
/**
 * Control G — Script de Setup de Appwrite
 * =========================================
 * Crea la base de datos, colecciones y atributos para el nuevo dominio:
 * entities, entity_municipalities, user_profiles, professional_assignments,
 * families, activities, observations, audit_log, sync_log
 *
 * Uso:
 *   node scripts/setup-appwrite.mjs
 */

import { Client, Databases, Storage, Permission, Role } from 'node-appwrite';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage   = new Storage(client);

const DB_ID = 'control_g';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createOrGetDatabase() {
  try {
    return await databases.get(DB_ID);
  } catch {
    console.log(`Creating database: ${DB_ID}`);
    return await databases.create(DB_ID, 'Control G');
  }
}

async function createOrGetCollection(collectionId, name) {
  try {
    const existing = await databases.getCollection(DB_ID, collectionId);
    console.log(`  ✓ Collection exists: ${collectionId}`);
    return existing;
  } catch {
    console.log(`  + Creating collection: ${collectionId}`);
    return await databases.createCollection(DB_ID, collectionId, name, [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ]);
  }
}

async function attr(type, collId, key, opts = {}) {
  try {
    const { required = false, defaultValue = null, size, min, max, elements } = opts;
    if (type === 'string') await databases.createStringAttribute(DB_ID, collId, key, size || 500, required, defaultValue);
    else if (type === 'text')    await databases.createStringAttribute(DB_ID, collId, key, 65535, required, defaultValue);
    else if (type === 'integer') await databases.createIntegerAttribute(DB_ID, collId, key, required, min, max, defaultValue);
    else if (type === 'float')   await databases.createFloatAttribute(DB_ID, collId, key, required, min, max, defaultValue);
    else if (type === 'boolean') await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultValue);
    else if (type === 'datetime')await databases.createDatetimeAttribute(DB_ID, collId, key, required, defaultValue);
    else if (type === 'enum')    await databases.createEnumAttribute(DB_ID, collId, key, elements, required, defaultValue);
    await new Promise(r => setTimeout(r, 300));
  } catch (e) {
    if (e?.code !== 409) console.warn(`  ! attr ${key}: ${e?.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Control G — Appwrite Setup\n');

  await createOrGetDatabase();

  // ── 1. entities ──────────────────────────────────────────────────────────────
  await createOrGetCollection('entities', 'Entities');
  await attr('string',  'entities', 'name',                     { required: true, size: 300 });
  await attr('string',  'entities', 'nit',                      { size: 30 });
  await attr('string',  'entities', 'contract_number',          { required: true, size: 50 });
  await attr('text',    'entities', 'contract_object');
  await attr('string',  'entities', 'operator_name',            { required: true, size: 200 });
  await attr('string',  'entities', 'department',               { required: true, size: 100 });
  await attr('datetime','entities', 'period_start',             { required: true });
  await attr('datetime','entities', 'period_end',               { required: true });
  await attr('integer', 'entities', 'families_per_municipality',{ defaultValue: 35 });
  await attr('enum',    'entities', 'status',                   { elements: ['active','suspended','completed'], defaultValue: 'active' });
  await attr('string',  'entities', 'created_by',               { size: 50 });

  // ── 2. entity_municipalities ─────────────────────────────────────────────────
  await createOrGetCollection('entity_municipalities', 'Entity Municipalities');
  await attr('string',  'entity_municipalities', 'entity_id',         { required: true, size: 50 });
  await attr('string',  'entity_municipalities', 'municipality_name',  { required: true, size: 200 });
  await attr('string',  'entity_municipalities', 'department',         { required: true, size: 100 });
  await attr('integer', 'entity_municipalities', 'families_target',    { defaultValue: 35 });

  // ── 3. user_profiles ─────────────────────────────────────────────────────────
  await createOrGetCollection('user_profiles', 'User Profiles');
  await attr('string',  'user_profiles', 'user_id',      { required: true, size: 50 });
  await attr('string',  'user_profiles', 'entity_id',    { size: 50 });
  await attr('string',  'user_profiles', 'full_name',    { required: true, size: 200 });
  await attr('string',  'user_profiles', 'phone',        { size: 20 });
  await attr('enum',    'user_profiles', 'role',         { required: true, elements: ['admin','coordinator','support','professional'], defaultValue: 'professional' });
  await attr('string',  'user_profiles', 'avatar_url',   { size: 500 });
  await attr('string',  'user_profiles', 'signature_url',{ size: 500 });
  await attr('enum',    'user_profiles', 'status',       { elements: ['active','inactive','suspended'], defaultValue: 'active' });
  await attr('datetime','user_profiles', 'last_seen_at');
  await attr('datetime','user_profiles', 'last_sync_at');

  // ── 4. professional_assignments ──────────────────────────────────────────────
  await createOrGetCollection('professional_assignments', 'Professional Assignments');
  await attr('string', 'professional_assignments', 'entity_id',        { required: true, size: 50 });
  await attr('string', 'professional_assignments', 'professional_id',  { required: true, size: 50 });
  await attr('string', 'professional_assignments', 'municipality_id',  { required: true, size: 50 });

  // ── 5. families ──────────────────────────────────────────────────────────────
  await createOrGetCollection('families', 'Families');
  await attr('string',  'families', 'entity_id',        { required: true, size: 50 });
  await attr('string',  'families', 'municipality_id',  { required: true, size: 50 });
  await attr('string',  'families', 'professional_id',  { required: true, size: 50 });
  // Datos personales
  await attr('string',  'families', 'first_name',       { required: true, size: 100 });
  await attr('string',  'families', 'second_name',      { size: 100 });
  await attr('string',  'families', 'first_lastname',   { required: true, size: 100 });
  await attr('string',  'families', 'second_lastname',  { size: 100 });
  await attr('enum',    'families', 'id_document_type', { elements: ['CC','TI','CE','PA','RC','PEP','PPT'], defaultValue: 'CC' });
  await attr('string',  'families', 'id_number',        { required: true, size: 30 });
  await attr('string',  'families', 'birth_date',       { size: 20 });
  await attr('integer', 'families', 'age');
  await attr('string',  'families', 'phone',            { size: 20 });
  await attr('enum',    'families', 'zone',             { elements: ['Urbana','Rural'] });
  await attr('string',  'families', 'address',          { size: 300 });
  await attr('string',  'families', 'directions',       { size: 300 });
  await attr('float',   'families', 'latitude',         { min: -90, max: 90 });
  await attr('float',   'families', 'longitude',        { min: -180, max: 180 });
  // Caracterización
  await attr('string',  'families', 'gender',              { size: 30 });
  await attr('string',  'families', 'ethnic_group',        { size: 50 });
  await attr('string',  'families', 'disability',          { size: 50 });
  await attr('string',  'families', 'differential_factor', { size: 100 });
  await attr('integer', 'families', 'dependents',          { defaultValue: 0 });
  await attr('boolean', 'families', 'companion_required',  { defaultValue: false });
  await attr('string',  'families', 'companion_name',      { size: 200 });
  await attr('string',  'families', 'companion_document',  { size: 30 });
  await attr('string',  'families', 'companion_relationship', { size: 100 });
  // Estado actividades
  await attr('enum',    'families', 'ex_ante_status',      { elements: ['pending','completed'], defaultValue: 'pending' });
  await attr('string',  'families', 'ex_ante_date',        { size: 20 });
  await attr('string',  'families', 'ex_ante_activity_id', { size: 50 });
  await attr('enum',    'families', 'encounter_1_status',  { elements: ['pending','completed'], defaultValue: 'pending' });
  await attr('string',  'families', 'encounter_1_date',    { size: 20 });
  await attr('string',  'families', 'encounter_1_topic',   { size: 200 });
  await attr('string',  'families', 'encounter_1_activity_id', { size: 50 });
  await attr('enum',    'families', 'encounter_2_status',  { elements: ['pending','completed'], defaultValue: 'pending' });
  await attr('string',  'families', 'encounter_2_date',    { size: 20 });
  await attr('string',  'families', 'encounter_2_topic',   { size: 200 });
  await attr('string',  'families', 'encounter_2_activity_id', { size: 50 });
  await attr('enum',    'families', 'encounter_3_status',  { elements: ['pending','completed'], defaultValue: 'pending' });
  await attr('string',  'families', 'encounter_3_date',    { size: 20 });
  await attr('string',  'families', 'encounter_3_topic',   { size: 200 });
  await attr('string',  'families', 'encounter_3_activity_id', { size: 50 });
  await attr('enum',    'families', 'ex_post_status',      { elements: ['pending','completed'], defaultValue: 'pending' });
  await attr('string',  'families', 'ex_post_date',        { size: 20 });
  await attr('boolean', 'families', 'ex_post_positive_impact');
  await attr('string',  'families', 'ex_post_activity_id', { size: 50 });
  await attr('enum',    'families', 'overall_status',      { elements: ['pending','in_progress','completed'], defaultValue: 'pending' });
  await attr('boolean', 'families', 'consent_given',       { defaultValue: false });

  // ── 6. activities ────────────────────────────────────────────────────────────
  await createOrGetCollection('activities', 'Activities');
  await attr('string',  'activities', 'entity_id',           { required: true, size: 50 });
  await attr('string',  'activities', 'family_id',           { required: true, size: 50 });
  await attr('string',  'activities', 'professional_id',     { required: true, size: 50 });
  await attr('string',  'activities', 'municipality_id',     { required: true, size: 50 });
  await attr('enum',    'activities', 'activity_type',       { required: true, elements: ['ex_ante','encounter_1','encounter_2','encounter_3','ex_post'] });
  await attr('string',  'activities', 'activity_date',       { required: true, size: 20 });
  await attr('string',  'activities', 'topic',               { size: 200 });
  await attr('text',    'activities', 'description');
  await attr('boolean', 'activities', 'positive_impact');
  await attr('text',    'activities', 'program_evaluation');
  await attr('text',    'activities', 'professional_evaluation');
  await attr('string',  'activities', 'photo_url',           { size: 500 });
  await attr('text',    'activities', 'beneficiary_signature_url');
  await attr('float',   'activities', 'latitude',            { min: -90, max: 90 });
  await attr('float',   'activities', 'longitude',           { min: -180, max: 180 });
  await attr('string',  'activities', 'local_id',            { required: true, size: 50 });
  await attr('datetime','activities', 'synced_at');
  await attr('enum',    'activities', 'status',              { elements: ['synced','reviewed','approved','rejected'], defaultValue: 'synced' });
  await attr('text',    'activities', 'review_notes');
  await attr('string',  'activities', 'reviewed_by',         { size: 50 });
  await attr('datetime','activities', 'reviewed_at');

  // ── 7. observations ──────────────────────────────────────────────────────────
  await createOrGetCollection('observations', 'Observations');
  await attr('string',  'observations', 'entity_id',      { required: true, size: 50 });
  await attr('string',  'observations', 'from_user_id',   { required: true, size: 50 });
  await attr('string',  'observations', 'to_user_id',     { required: true, size: 50 });
  await attr('string',  'observations', 'family_id',      { size: 50 });
  await attr('string',  'observations', 'activity_id',    { size: 50 });
  await attr('text',    'observations', 'content',        );
  await attr('enum',    'observations', 'type',           { elements: ['observation','correction','approval'], defaultValue: 'observation' });
  await attr('boolean', 'observations', 'read',           { defaultValue: false });

  // ── 8. audit_log ─────────────────────────────────────────────────────────────
  await createOrGetCollection('audit_log', 'Audit Log');
  await attr('string',  'audit_log', 'entity_id',    { size: 50 });
  await attr('string',  'audit_log', 'user_id',      { size: 50 });
  await attr('string',  'audit_log', 'action',       { required: true, size: 100 });
  await attr('string',  'audit_log', 'entity_type',  { size: 50 });
  await attr('string',  'audit_log', 'entity_ref_id',{ size: 50 });
  await attr('text',    'audit_log', 'details');

  // ── 9. sync_log ──────────────────────────────────────────────────────────────
  await createOrGetCollection('sync_log', 'Sync Log');
  await attr('string',  'sync_log', 'user_id',          { required: true, size: 50 });
  await attr('integer', 'sync_log', 'records_uploaded', { defaultValue: 0 });
  await attr('integer', 'sync_log', 'media_uploaded',   { defaultValue: 0 });
  await attr('integer', 'sync_log', 'duration_ms');
  await attr('string',  'sync_log', 'status',           { size: 20 });

  // ── Storage Buckets ───────────────────────────────────────────────────────────
  for (const [id, name] of [['field-photos','Field Photos'],['signatures','Signatures'],['avatars','Avatars'],['exports','Exports']]) {
    try {
      await storage.getBucket(id);
      console.log(`  ✓ Bucket exists: ${id}`);
    } catch {
      console.log(`  + Creating bucket: ${id}`);
      await storage.createBucket(id, name, [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
      ], false, undefined, undefined, ['jpg','jpeg','png','pdf','webp']);
    }
  }

  console.log('\n✅ Setup completo. Ejecuta ahora: node scripts/seed-appwrite.mjs\n');
}

main().catch(e => { console.error('❌ Error:', e?.message || e); process.exit(1); });
