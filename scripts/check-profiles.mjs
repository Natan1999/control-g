import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = 'control_g';
const COLLECTION_ID = 'user_profiles';

async function checkProfiles() {
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
    console.log(`Total profiles found: ${result.total}`);
    result.documents.forEach(doc => {
      console.log(`- User ID: ${doc.user_id}, Role: ${doc.role}, Name: ${doc.full_name}`);
    });
  } catch (error) {
    console.error('Error checking profiles:', error.message);
  }
}

checkProfiles();
