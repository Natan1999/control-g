import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint('https://backend-platform-appwrite.up3elz.easypanel.host/v1')
  .setProject('69cfed060018badc54b4')
  .setKey('standard_8e8fd98b9f5b9de77f2e92e78b8731371f21048eae5946b8245c53f1b1b3c4bf094ca1b15be99118cd4826bf91127b96b78acf44332728f3297ef8a846caecb595d8cf519a83911b1fe82947ea81c06598102d9a385e33694cede0e5cace2ee30778cfe4febc0261be9d405ea3f0ca158ca2b3c4c49eef8968116039122add38');

const databases = new Databases(client);
const DATABASE_ID = 'control_g';

const DANE_DEPARTMENTS = [
  { code: '05', name: 'Antioquia' },
  { code: '08', name: 'Atlántico' },
  { code: '11', name: 'Bogotá D.C.' },
  { code: '13', name: 'Bolívar' },
  { code: '15', name: 'Boyacá' },
  { code: '17', name: 'Caldas' },
  { code: '18', name: 'Caquetá' },
  { code: '19', name: 'Cauca' },
  { code: '20', name: 'Cesar' },
  { code: '23', name: 'Córdoba' },
  { code: '25', name: 'Cundinamarca' },
  { code: '27', name: 'Chocó' },
  { code: '41', name: 'Huila' },
  { code: '44', name: 'La Guajira' },
  { code: '47', name: 'Magdalena' },
  { code: '50', name: 'Meta' },
  { code: '52', name: 'Nariño' },
  { code: '54', name: 'Norte de Santander' },
  { code: '63', name: 'Quindío' },
  { code: '66', name: 'Risaralda' },
  { code: '68', name: 'Santander' },
  { code: '70', name: 'Sucre' },
  { code: '73', name: 'Tolima' },
  { code: '76', name: 'Valle del Cauca' },
  { code: '81', name: 'Arauca' },
  { code: '85', name: 'Casanare' },
  { code: '86', name: 'Putumayo' },
  { code: '88', name: 'San Andrés y Providencia' },
  { code: '91', name: 'Amazonas' },
  { code: '94', name: 'Guainía' },
  { code: '95', name: 'Guaviare' },
  { code: '97', name: 'Vaupés' },
  { code: '99', name: 'Vichada' }
];

async function cleanupAndSync() {
  console.log('🚀 Iniciando limpieza de base de datos geográfica...');

  try {
    // 1. ELIMINAR MUNICIPIOS
    console.log('\n🗑️ Limpiando municipios...');
    let munsRes = await databases.listDocuments(DATABASE_ID, 'municipalities', [Query.limit(100)]);
    while (munsRes.documents.length > 0) {
      console.log(`   Eliminando bloque de ${munsRes.documents.length} municipios...`);
      for (const m of munsRes.documents) {
        await databases.deleteDocument(DATABASE_ID, 'municipalities', m.$id);
      }
      munsRes = await databases.listDocuments(DATABASE_ID, 'municipalities', [Query.limit(100)]);
    }
    console.log('✅ Municipios eliminados.');

    // 2. ELIMINAR DEPARTAMENTOS
    console.log('\n🗑️ Limpiando departamentos...');
    let deptsRes = await databases.listDocuments(DATABASE_ID, 'departments', [Query.limit(100)]);
    while (deptsRes.documents.length > 0) {
      console.log(`   Eliminando bloque de ${deptsRes.documents.length} departamentos...`);
      for (const d of deptsRes.documents) {
        await databases.deleteDocument(DATABASE_ID, 'departments', d.$id);
      }
      deptsRes = await databases.listDocuments(DATABASE_ID, 'departments', [Query.limit(100)]);
    }
    console.log('✅ Departamentos eliminados.');

    // 3. INSERTAR DEPARTAMENTOS OFICIALES (DANE)
    console.log('\n🗺️ Insertando departamentos oficiales (33)...');
    for (const d of DANE_DEPARTMENTS) {
      const docId = `dept_${d.code}`;
      await databases.createDocument(DATABASE_ID, 'departments', docId, {
        name: d.name,
        code: d.code
      });
      console.log(`   → ${d.name} (${d.code})`);
    }
    console.log('✅ Sincronización limpia completada.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

cleanupAndSync();
