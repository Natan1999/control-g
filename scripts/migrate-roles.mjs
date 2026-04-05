#!/usr/bin/env node
/**
 * Control G — Migration: Update user_profiles.role enum values
 * Run once to update the role enum from old values to new values.
 */

import { Client, Databases } from 'node-appwrite';
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
const DB_ID = 'control_g';
const COLL = 'user_profiles';

async function main() {
  console.log('Migrating role attribute in user_profiles...');

  // 1. Delete old role attribute
  try {
    await databases.deleteAttribute(DB_ID, COLL, 'role');
    console.log('  ✓ Deleted old role attribute');
    // Wait for Appwrite to process the deletion
    await new Promise(r => setTimeout(r, 3000));
  } catch (e) {
    console.log('  ! Could not delete role attribute:', e?.message);
  }

  // 2. Recreate with new enum values
  try {
    await databases.createEnumAttribute(DB_ID, COLL, 'role',
      ['admin', 'coordinator', 'support', 'professional'],
      true, 'professional'
    );
    console.log('  ✓ Created new role attribute with values: admin, coordinator, support, professional');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log('  ! Could not create role attribute:', e?.message);
  }

  // 3. Update existing admin profile to role=admin
  try {
    const res = await databases.listDocuments(DB_ID, COLL, []);
    console.log(`\nUpdating ${res.documents.length} existing profiles...`);
    for (const doc of res.documents) {
      const oldRole = doc.role;
      const newRole =
        oldRole === 'superadmin'  ? 'admin' :
        oldRole === 'assistant'   ? 'support' :
        oldRole === 'technician'  ? 'professional' :
        oldRole; // coordinator stays coordinator
      if (newRole !== oldRole) {
        try {
          await databases.updateDocument(DB_ID, COLL, doc.$id, { role: newRole });
          console.log(`  ✓ ${doc.full_name}: ${oldRole} → ${newRole}`);
        } catch (e) {
          console.log(`  ! Could not update ${doc.full_name}: ${e?.message}`);
        }
      } else {
        console.log(`  ✓ ${doc.full_name}: ${oldRole} (no change needed)`);
      }
    }
  } catch (e) {
    console.log('  ! Could not list profiles:', e?.message);
  }

  console.log('\n✅ Migration complete. Re-run seed: node scripts/seed-appwrite.mjs\n');
}

main().catch(e => { console.error('❌', e?.message); process.exit(1); });
