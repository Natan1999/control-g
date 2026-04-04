import { Client, Databases, Query } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function verifyProfiles() {
    try {
        console.log('🔍  Verificando perfiles de Control G...');
        const response = await databases.listDocuments(
            'control_g',
            'user_profiles',
            [Query.limit(10)]
        );

        console.log(`✅  Se encontraron ${response.total} perfiles.`);
        response.documents.forEach(doc => {
            console.log(`   👤  UID: ${doc.user_id.padEnd(25)} | Role: ${doc.role.padEnd(12)} | Name: ${doc.full_name.padEnd(30)} | Org: ${doc.organization_id}`);
        });
    } catch (err) {
        console.error('❌  Error verificando perfiles:', err.message);
    }
}

verifyProfiles();
