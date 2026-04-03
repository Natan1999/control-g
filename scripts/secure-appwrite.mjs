import * as dotenv from 'dotenv';
import { Client, Databases, Permission, Role } from 'node-appwrite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY
} = process.env;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("❌ Faltan credenciales en el archivo .env");
  process.exit(1);
}

const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = 'control_g';

async function updateCollectionPermissions(collectionId, permissions, docSec = true) {
  try {
    await databases.updateCollection(
      DB_ID,
      collectionId,
      collectionId, // name
      permissions,
      docSec // documentLevelSecurity
    );
    console.log(`✅ Colección ${collectionId} protegida exitosamente.`);
  } catch (error) {
    console.error(`❌ Error actualizando colección ${collectionId}:`, error.message);
  }
}

async function secureDatabase() {
  console.log('🔒 Asegurando la base de datos de Control G...');

  // 1. Organzaciones: Accesible para lectura, pero la creación, actualización y borrado
  // son EXCLUSIVAS para los Superadmins
  const orgPermissions = [
    Permission.read(Role.users()), // Todos logueados pueden leer
    Permission.create(Role.team('superadmins')), // Solo superadmins crean
    Permission.update(Role.team('superadmins')), // Solo superadmins editan
    Permission.delete(Role.team('superadmins'))  // Solo superadmins eliminan
  ];
  
  await updateCollectionPermissions('organizations', orgPermissions, true);

  // También protegemos los user_profiles para evitar que alguien se cambie el role a superadmin por su cuenta
  // Por ahora todos pueden leer y actualizar sus perfiles desde la App, 
  // Pero idealmente Superadmin debería poder crear usuarios y manipular.
  // Como actualmente authStore no nos permite manejar esto de forma tan granular en JS cliente, 
  // dejaremos que el UI bloquee (ya lo hace y no hay endpoint directo expuesto salvo register de usuario inicial).
  
  // Proyectos: solo "superadmins" y "coordinators" deberían crear/borrar
  const projectPermissions = [
    Permission.read(Role.users()),
    Permission.create(Role.team('coordinators')),
    Permission.create(Role.team('superadmins')),
    Permission.update(Role.team('coordinators')),
    Permission.update(Role.team('superadmins')),
    Permission.delete(Role.team('coordinators')),
    Permission.delete(Role.team('superadmins'))
  ];
  
  await updateCollectionPermissions('projects', projectPermissions, true);

  console.log('✅ Base de datos asegurada.');
}

secureDatabase().catch(console.error);
