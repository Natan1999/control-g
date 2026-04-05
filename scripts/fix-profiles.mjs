#!/usr/bin/env node
import { Client, Users, Databases, ID, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const usersApi = new Users(client);
const databases = new Databases(client);
const DB = 'control_g';

const TEST_USERS = [
  { email: 'admin@drandigital.com',      name: 'Administrador DRAN Digital',     role: 'admin',        withEntity: false },
  { email: 'coordinador@funservar.org',   name: 'Coordinador General',            role: 'coordinator',  withEntity: true  },
  { email: 'apoyo@funservar.org',         name: 'Laura Marcela Peñuela Pinedo',   role: 'support',      withEntity: true  },
  { email: 'profesional1@funservar.org',  name: 'Yina Marcela Arroyo Olivares',   role: 'professional', withEntity: true  },
  { email: 'profesional2@funservar.org',  name: 'Carlos Alberto Torres Pérez',    role: 'professional', withEntity: true  },
];

async function main() {
  // Get entity
  const entityRes = await databases.listDocuments(DB, 'entities', []);
  const entityId = entityRes.documents[0]?.$id ?? null;
  console.log('Entity ID:', entityId);

  // Get all auth users
  const allUsersRes = await usersApi.list();
  const allUsers = allUsersRes.users;

  for (const u of TEST_USERS) {
    const authUser = allUsers.find(x => x.email === u.email);
    if (!authUser) { console.log('NOT FOUND:', u.email); continue; }

    const userId = authUser.$id;
    const eid = u.withEntity ? entityId : null;

    // Check if profile exists
    const existing = await databases.listDocuments(DB, 'user_profiles', [
      Query.equal('user_id', userId)
    ]);

    if (existing.documents.length > 0) {
      const doc = existing.documents[0];
      await databases.updateDocument(DB, 'user_profiles', doc.$id, {
        role: u.role,
        full_name: u.name,
        entity_id: eid,
        status: 'active',
      });
      console.log(`UPDATED: ${u.email} -> ${u.role} (profile: ${doc.$id})`);
    } else {
      const profile = await databases.createDocument(DB, 'user_profiles', ID.unique(), {
        user_id: userId,
        entity_id: eid,
        full_name: u.name,
        role: u.role,
        status: 'active',
      });
      console.log(`CREATED: ${u.email} -> ${u.role} (profile: ${profile.$id})`);
    }
  }

  console.log('\nDone. Listing final profiles:');
  const final = await databases.listDocuments(DB, 'user_profiles', []);
  for (const doc of final.documents) {
    console.log(`  ${doc.full_name} | ${doc.role} | ${doc.user_id}`);
  }
}

main().catch(e => { console.error('Error:', e?.message); process.exit(1); });
