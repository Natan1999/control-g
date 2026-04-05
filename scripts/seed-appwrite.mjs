#!/usr/bin/env node
/**
 * Control G — Seed Script
 * ========================
 * Crea usuarios de prueba con los 4 roles del nuevo dominio:
 *   admin, coordinator, support, professional
 *
 * Uso:
 *   node scripts/seed-appwrite.mjs
 */

import { Client, Databases, Users, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users     = new Users(client);
const databases = new Databases(client);

const DB_ID = 'control_g';
const PASSWORD = 'Control@2026!';

const TEST_USERS = [
  {
    email: 'admin@drandigital.com',
    name: 'Administrador DRAN Digital',
    role: 'admin',
    entityId: null,
  },
  {
    email: 'coordinador@funservar.org',
    name: 'Coordinador General',
    role: 'coordinator',
    entityId: null, // Will be set after entity creation
  },
  {
    email: 'apoyo@funservar.org',
    name: 'Laura Marcela Peñuela Pinedo',
    role: 'support',
    entityId: null,
  },
  {
    email: 'profesional1@funservar.org',
    name: 'Yina Marcela Arroyo Olivares',
    role: 'professional',
    entityId: null,
  },
  {
    email: 'profesional2@funservar.org',
    name: 'Carlos Alberto Torres Pérez',
    role: 'professional',
    entityId: null,
  },
];

async function createOrGetUser(email, password, name) {
  try {
    // Try to find existing user by listing (Appwrite doesn't have getByEmail in server SDK easily)
    const list = await users.list([`search("${email}")`]);
    if (list.users.length > 0) {
      console.log(`  ✓ User exists: ${email}`);
      return list.users[0];
    }
  } catch { /* ignore */ }

  try {
    const user = await users.create(ID.unique(), email, undefined, password, name);
    console.log(`  + Created user: ${email} (${user.$id})`);
    return user;
  } catch (e) {
    if (e?.code === 409) {
      console.log(`  ✓ User already exists: ${email}`);
      return null;
    }
    throw e;
  }
}

async function createProfile(userId, { name, role, entityId }) {
  try {
    // Check if profile already exists
    const existing = await databases.listDocuments(DB_ID, 'user_profiles', [
      `equal("user_id", "${userId}")`,
    ]);
    if (existing.documents.length > 0) {
      console.log(`  ✓ Profile exists for: ${name}`);
      return existing.documents[0];
    }
  } catch { /* ignore */ }

  try {
    const profile = await databases.createDocument(DB_ID, 'user_profiles', ID.unique(), {
      user_id:      userId,
      entity_id:    entityId,
      full_name:    name,
      role,
      status:       'active',
      signature_url: null,
    });
    console.log(`  + Created profile: ${name} (${role})`);
    return profile;
  } catch (e) {
    console.warn(`  ! Could not create profile for ${name}: ${e?.message}`);
    return null;
  }
}

async function createDemoEntity() {
  try {
    const existing = await databases.listDocuments(DB_ID, 'entities', [
      `equal("contract_number", "13-PSC-2025")`,
    ]);
    if (existing.documents.length > 0) {
      console.log(`  ✓ Demo entity exists`);
      return existing.documents[0];
    }
  } catch { /* ignore */ }

  try {
    const entity = await databases.createDocument(DB_ID, 'entities', ID.unique(), {
      name:                      'Secretaría de Seguridad de Bolívar',
      nit:                       '806.007.001',
      contract_number:           '13-PSC-2025',
      contract_object:           'Prestación de servicios para soporte en captura de información y producción de informes de caracterización ex antes, ex post y momentos de encuentro en el programa de asistencia psicosocial a líderes – Ruta de Protección',
      operator_name:             'FUNSERVAR',
      department:                'Bolívar',
      period_start:              '2025-08-04T00:00:00.000Z',
      period_end:                '2025-12-18T00:00:00.000Z',
      families_per_municipality: 35,
      status:                    'active',
    });
    console.log(`  + Created demo entity: ${entity.name} (${entity.$id})`);
    return entity;
  } catch (e) {
    console.warn(`  ! Could not create entity: ${e?.message}`);
    return null;
  }
}

async function createDemoMunicipalities(entityId) {
  const munis = ['Altos del Rosario', 'Mahates', 'San Jacinto', 'Arjona', 'Turbaco'];
  for (const name of munis) {
    try {
      await databases.createDocument(DB_ID, 'entity_municipalities', ID.unique(), {
        entity_id:         entityId,
        municipality_name: name,
        department:        'Bolívar',
        families_target:   35,
      });
      console.log(`    + Municipality: ${name}`);
    } catch (e) {
      if (e?.code !== 409) console.warn(`    ! ${name}: ${e?.message}`);
    }
  }
}

async function main() {
  console.log('\n🌱 Control G — Seed\n');
  console.log(`Contraseña de prueba: ${PASSWORD}\n`);

  // 1. Create demo entity
  console.log('Creating demo entity...');
  const entity = await createDemoEntity();
  const entityId = entity?.$id ?? null;

  if (entityId) {
    console.log('\nCreating demo municipalities...');
    await createDemoMunicipalities(entityId);
  }

  // 2. Create test users
  console.log('\nCreating test users...');
  for (const u of TEST_USERS) {
    const user = await createOrGetUser(u.email, PASSWORD, u.name);
    if (user) {
      // Assign entity to all except admin
      const eid = u.role === 'admin' ? null : entityId;
      await createProfile(user.$id, { name: u.name, role: u.role, entityId: eid });
    }
  }

  console.log('\n✅ Seed completo!\n');
  console.log('Usuarios de prueba:');
  for (const u of TEST_USERS) {
    console.log(`  ${u.role.padEnd(13)} ${u.email}  /  ${PASSWORD}`);
  }
  console.log('');
}

main().catch(e => { console.error('❌ Error:', e?.message || e); process.exit(1); });
