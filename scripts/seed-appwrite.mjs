#!/usr/bin/env node
/**
 * Control G - Script de Seed de Appwrite
 * ========================================
 * Crea usuarios de prueba, perfiles, organización demo
 * y los 32 departamentos + 10 municipios principales de Colombia.
 *
 * IMPORTANTE: Ejecutar DESPUÉS de setup-appwrite.mjs
 *
 * Uso:
 *   node scripts/seed-appwrite.mjs
 */

import { Client, Databases, Users, Teams, ID, Query } from 'node-appwrite';
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
  console.error('❌  Faltan variables de entorno: APPWRITE_PROJECT_ID y APPWRITE_API_KEY');
  process.exit(1);
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const usersApi  = new Users(client);
const teams     = new Teams(client);

// ─── IDs constantes ──────────────────────────────────────────────────────────

const DATABASE_ID = 'control_g';

const COLLECTIONS = {
  ORGANIZATIONS:   'organizations',
  USER_PROFILES:   'user_profiles',
  DEPARTMENTS:     'departments',
  MUNICIPALITIES:  'municipalities',
  ZONES:           'zones',
  PROJECTS:        'projects',
  PROJECT_MEMBERS: 'project_members',
  FORMS:           'forms',
  BENEFICIARY_FAMILIES: 'beneficiary_families',
  FAMILY_MEMBERS:       'family_members',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const wait = (ms = 300) => new Promise(r => setTimeout(r, ms));

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

// ─── 1. Organización de prueba ────────────────────────────────────────────────

const ORG_ID = 'org_gobernacion_bolivar';

async function createTestOrganization() {
  console.log('\n🏛   Creando organización de prueba...');

  await safeCreate('Organización: Gobernación de Bolívar', () =>
    databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ORGANIZATIONS,
      ORG_ID,
      {
        name:             'Gobernación de Bolívar',
        nit:              '890480306-7',
        contact_name:     'Secretaría de Planeación',
        contact_email:    'planeacion@bolivar.gov.co',
        contact_phone:    '+57 5 6517444',
        address:          'Centro Administrativo Departamental (CAD), Turbaco',
        city:             'Turbaco',
        department:       'Bolívar',
        country:          'CO',
        plan:             'gobierno',
        max_users:        50,
        max_forms:        20,
        max_ocr_monthly:  500,
        max_storage_gb:   20,
        ocr_usage_current: 0,
        storage_used_mb:  0,
        status:           'active',
        settings:         JSON.stringify({
          locale: 'es-CO',
          timezone: 'America/Bogota',
          features: { ocr: true, offline: true, chat: true },
        }),
      }
    )
  );

  return ORG_ID;
}

// ─── 2. Usuarios de prueba ────────────────────────────────────────────────────

const TEST_USERS = [
  {
    email:    'superadmin@controlg.co',
    password: 'Control@2026!',
    name:     'Superadmin Control G',
    role:     'superadmin',
    orgId:    null,
    team:     'superadmins',
  },
  {
    email:    'coordinador@controlg.co',
    password: 'Control@2026!',
    name:     'Coordinador Bolívar',
    role:     'coordinator',
    orgId:    ORG_ID,
    team:     'coordinators',
  },
  {
    email:    'asistente@controlg.co',
    password: 'Control@2026!',
    name:     'Asistente Bolívar',
    role:     'assistant',
    orgId:    ORG_ID,
    team:     'assistants',
  },
  {
    email:    'tecnico@controlg.co',
    password: 'Control@2026!',
    name:     'Técnico Bolívar',
    role:     'technician',
    orgId:    ORG_ID,
    team:     'technicians',
  },
];

async function createTestUsers() {
  console.log('\n👤  Creando usuarios de prueba...');

  const createdUsers = [];

  for (const u of TEST_USERS) {
    let userId = null;

    // Intentar crear el usuario
    const user = await safeCreate(`Usuario: ${u.name} (${u.email})`, async () => {
      return await usersApi.create(
        ID.unique(),
        u.email,
        undefined, // phone
        u.password,
        u.name
      );
    });

    if (user) {
      userId = user.$id;
    } else {
      // Si ya existe, buscarlo por email
      try {
        const existing = await usersApi.list([Query.equal('email', u.email)]);
        if (existing.users.length > 0) {
          userId = existing.users[0].$id;
          console.log(`     → ID encontrado: ${userId}`);
        }
      } catch (e) {
        console.warn(`     → No se pudo obtener ID de ${u.email}: ${e.message}`);
      }
    }

    if (userId) {
      createdUsers.push({ ...u, userId });
    }
  }

  return createdUsers;
}

// ─── 3. Perfiles de usuario ───────────────────────────────────────────────────

async function createUserProfiles(users) {
  console.log('\n📋  Creando perfiles de usuario...');

  for (const u of users) {
    if (!u.userId) continue;

    await safeCreate(`Perfil: ${u.name}`, () =>
      databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        ID.unique(),
        {
          user_id:         u.userId,
          organization_id: u.orgId || null,
          full_name:       u.name,
          role:            u.role,
          status:          'active',
          device_info:     JSON.stringify({ seeded: true }),
        }
      )
    );
    await wait(200);
  }
}

// ─── 4. Añadir usuarios a equipos ─────────────────────────────────────────────

async function addUsersToTeams(users) {
  console.log('\n👥  Asignando usuarios a equipos...');

  for (const u of users) {
    if (!u.userId || !u.team) continue;

    await safeCreate(`${u.name} → team:${u.team}`, () =>
      teams.createMembership(
        u.team,
        ['member'],       // roles dentro del equipo
        undefined,        // url (no requerido con API key)
        u.userId,
        undefined,        // phone
        undefined,        // email (ya es miembro)
        u.name
      )
    );
    await wait(300);
  }
}

// ─── 5. Departamentos de Colombia ─────────────────────────────────────────────

const DEPARTAMENTOS = [
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
  { code: '99', name: 'Vichada' },
];

// Map para guardar IDs de departamentos
const deptIdMap = {};

async function seedDepartments() {
  console.log('\n🗺   Insertando departamentos de Colombia...');

  for (const dept of DEPARTAMENTOS) {
    const docId = `dept_${dept.code}`;
    const doc = await safeCreate(`Departamento: ${dept.name}`, () =>
      databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.DEPARTMENTS,
        docId,
        { code: dept.code, name: dept.name }
      )
    );
    deptIdMap[dept.code] = docId;
    await wait(150);
  }

  return deptIdMap;
}

// ─── 6. Municipios principales ─────────────────────────────────────────────────

const MUNICIPIOS = [
  // Bolívar
  { deptCode: '13', code: '13001', name: 'Cartagena de Indias' },
  { deptCode: '13', code: '13006', name: 'Achí' },
  { deptCode: '13', code: '13030', name: 'Altos del Rosario' },
  // Antioquia
  { deptCode: '05', code: '05001', name: 'Medellín' },
  { deptCode: '05', code: '05088', name: 'Bello' },
  { deptCode: '05', code: '05266', name: 'Envigado' },
  // Bogotá
  { deptCode: '11', code: '11001', name: 'Bogotá D.C.' },
  // Valle del Cauca
  { deptCode: '76', code: '76001', name: 'Cali' },
  { deptCode: '76', code: '76109', name: 'Buenaventura' },
  // Atlántico
  { deptCode: '08', code: '08001', name: 'Barranquilla' },
  { deptCode: '08', code: '08078', name: 'Barranquilla (Localidad Riomar)' },
  // Santander
  { deptCode: '68', code: '68001', name: 'Bucaramanga' },
  // Cundinamarca
  { deptCode: '25', code: '25175', name: 'Chía' },
  { deptCode: '25', code: '25290', name: 'Fusagasugá' },
  // Meta
  { deptCode: '50', code: '50001', name: 'Villavicencio' },
  // Nariño
  { deptCode: '52', code: '52001', name: 'Pasto' },
  // Córdoba
  { deptCode: '23', code: '23001', name: 'Montería' },
  // Huila
  { deptCode: '41', code: '41001', name: 'Neiva' },
  // Tolima
  { deptCode: '73', code: '73001', name: 'Ibagué' },
  // Risaralda
  { deptCode: '66', code: '66001', name: 'Pereira' },
];

async function seedMunicipalities(deptIdMap) {
  console.log('\n🏙   Insertando municipios principales...');

  for (const mun of MUNICIPIOS) {
    const deptId = deptIdMap[mun.deptCode] || `dept_${mun.deptCode}`;
    const docId  = `mun_${mun.code}`;

    await safeCreate(`Municipio: ${mun.name}`, () =>
      databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MUNICIPALITIES,
        docId,
        {
          department_id: deptId,
          code:          mun.code,
          name:          mun.name,
        }
      )
    );
    await wait(150);
  }
}

// ─── 7. Zonas de ejemplo para Bolívar ───────────────────────────────────────
async function seedZonesBolivar() {
  console.log('\n📍  Insertando zonas de ejemplo (Bolívar)...');

  const zonas = [
    { name: 'Arjona - Centro',       type: 'sector' },
    { name: 'Arjona - Las Nieves',   type: 'barrio'    },
    { name: 'Turbaco - La Granja',   type: 'barrio'    },
    { name: 'Turbaco - El Rosario',   type: 'barrio'    },
    { name: 'Mahates - Centro',      type: 'corregimiento' },
    { name: 'Villanueva',            type: 'corregimiento' },
    { name: 'Santa Rosa',            type: 'corregimiento' },
  ];

  for (const zona of zonas) {
    await safeCreate(`Zona: ${zona.name}`, () =>
      databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.ZONES,
        ID.unique(),
        {
          municipality_id:    CARTAGENA_MUN_ID,
          organization_id:    ORG_ID,
          name:               zona.name,
          type:               zona.type,
          metadata:           JSON.stringify({ seeded: true }),
        }
      )
    );
    await wait(150);
  }
}

// ─── 8. Proyecto demo ─────────────────────────────────────────────────────────

async function seedDemoProject(coordinatorUserId) {
  console.log('\n📁  Creando proyecto demo (Bolívar)...');

  const project = await safeCreate('Proyecto: Caracterización Socioeconómica Bolívar 2026', () =>
    databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      'proj_demo_bolivar_2026',
      {
        organization_id:  ORG_ID,
        coordinator_id:   coordinatorUserId || 'unknown',
        name:             'Caracterización Socioeconómica Bolívar 2026',
        description:      'Levantamiento de información socioeconómica en los municipios prioritarios de Bolívar para el plan de desarrollo departamental.',
        type:             'socioeconomica',
        department_id:    'dept_13',
        municipality_id:  'mun_13052', // Arjona
        start_date:       '2026-04-01',
        end_date:         '2026-12-31',
        target_forms:     10000,
        status:           'active',
        settings:         JSON.stringify({
          allow_offline: true,
          require_gps:   true,
          require_photo: false,
        }),
      }
    )
  );

  return project;
}

// ─── 9. Formulario demo ───────────────────────────────────────────────────────

async function seedDemoForm(coordinatorUserId) {
  console.log('\n📝  Creando formulario demo (Gobernación Bolívar)...');

  const schema = {
    version: 1,
    sections: [
      {
        id:     'sec_identificacion',
        title:  'Identificación del Hogar (Gobernación de Bolívar)',
        fields: [
          { id: 'f_direccion',   type: 'text',     label: 'Dirección',           required: true  },
          { id: 'f_municipio',   type: 'select',   label: 'Municipio de Bolívar', required: true, options: ['Turbaco', 'Arjona', 'Santa Rosa', 'Mahates'] },
          { id: 'f_estrato',     type: 'select',   label: 'Estrato',             required: true,  options: ['1','2','3','4','5','6'] },
          { id: 'f_num_personas', type: 'number',  label: 'Número de personas',  required: true,  min: 1, max: 20 },
        ],
      },
      {
        id:     'sec_vivienda',
        title:  'Condiciones de Vivienda',
        fields: [
          { id: 'f_tipo_vivienda',  type: 'select',   label: 'Tipo de vivienda', required: true,  options: ['Casa', 'Apartamento', 'Cuarto', 'Otro'] },
          { id: 'f_tenencia',       type: 'select',   label: 'Tenencia',         required: true,  options: ['Propia', 'Arrendada', 'Familiar', 'Otra'] },
          { id: 'f_material_piso',  type: 'select',   label: 'Material del piso', required: false, options: ['Madera', 'Cemento', 'Baldosa', 'Tierra', 'Otro'] },
          { id: 'f_foto_fachada',   type: 'photo',    label: 'Foto fachada',     required: false },
        ],
      },
      {
        id:     'sec_servicios',
        title:  'Servicios Públicos',
        fields: [
          { id: 'f_agua',     type: 'checkbox', label: 'Agua potable',    required: false },
          { id: 'f_energia',  type: 'checkbox', label: 'Energía eléctrica', required: false },
          { id: 'f_gas',      type: 'checkbox', label: 'Gas natural',      required: false },
          { id: 'f_internet', type: 'checkbox', label: 'Internet',         required: false },
        ],
      },
      {
        id:     'sec_georef',
        title:  'Georreferenciación',
        fields: [
          { id: 'f_gps',     type: 'gps',       label: 'Coordenadas GPS', required: false },
          { id: 'f_firma',   type: 'signature', label: 'Firma del encuestado', required: false },
          { id: 'f_obs',     type: 'textarea',  label: 'Observaciones',   required: false },
        ],
      },
    ],
  };

  await safeCreate('Formulario: Encuesta Socioeconómica Hogar', () =>
    databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.FORMS,
      'form_demo_socioeconomico',
      {
        project_id:       'proj_demo_cartagena_2026',
        organization_id:  ORG_ID,
        created_by:       coordinatorUserId || 'unknown',
        name:             'Encuesta Socioeconómica de Hogar',
        description:      'Formulario principal para el levantamiento socioeconómico de hogares en Cartagena.',
        version:          1,
        status:           'published',
        schema:           JSON.stringify(schema),
        total_fields:     14,
      }
    )
  );
}

// ─── 10. Familias de prueba ───────────────────────────────────────────────────

async function seedTestFamilies(projectId) {
  console.log('\n👨‍👩‍👧‍👦  Creando familias de prueba (Gobernación Bolívar)...');

  const FAMILIAS = [
    {
      id: 'fam_001',
      headFirstName: 'Juan',
      headFirstLastname: 'Pérez',
      headIdNumber: '12345678',
      headPhone: '3001234567',
      address: 'Calle 10 # 5-20, Barrio El Socorro',
      zone: 'Sector 1',
      members: [
        { name: 'Maria Pérez', bond: 'Hija', age: 10 },
        { name: 'Rosa Garcia', bond: 'Esposa', age: 35 }
      ]
    },
    {
      id: 'fam_002',
      headFirstName: 'Marta',
      headFirstLastname: 'Suárez',
      headIdNumber: '87654321',
      headPhone: '3109876543',
      address: 'Carrera 5 # 12-40, Corregimiento Bayunca',
      zone: 'Sector 2',
      members: [
        { name: 'Lucas Suárez', bond: 'Hijo', age: 5 }
      ]
    }
  ];

  for (const f of FAMILIAS) {
    await safeCreate(`Familia: ${f.headFirstName} ${f.headFirstLastname}`, async () => {
      // 1. Crear documento de familia
      const family = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.BENEFICIARY_FAMILIES,
        f.id,
        {
          project_id:       projectId,
          organization_id:  ORG_ID,
          zone_id:          'unknown',
          head_first_name:  f.headFirstName,
          head_first_lastname: f.headFirstLastname,
          head_id_number:   f.headIdNumber,
          head_phone:       f.headPhone,
          address:          f.address,
          vereda:           f.zone,
          status:           'active',
          ex_antes_completed: false,
          encounter1_completed: false,
          encounter2_completed: false,
          encounter3_completed: false,
          ex_post_completed:    false,
          consent_given:        true,
          total_members:        f.members.length + 1
        }
      );

      // 2. Crear miembros (incluyendo al jefe)
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.FAMILY_MEMBERS,
        ID.unique(),
        {
          family_id: f.id,
          full_name: `${f.headFirstName} ${f.headFirstLastname}`,
          id_number: f.headIdNumber,
          is_head:   true
        }
      );

      for (const m of f.members) {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.FAMILY_MEMBERS,
          ID.unique(),
          {
            family_id: f.id,
            full_name: m.name,
            family_bond: m.bond,
            age:       m.age,
            is_head:   false
          }
        );
      }

      return family;
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Control G — Appwrite Seed                  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n🔗  Endpoint : ${ENDPOINT}`);
  console.log(`🆔  Project  : ${PROJECT_ID}`);

  const start = Date.now();

  try {
    // Crear organización primero
    await createTestOrganization();

    // Crear usuarios
    const users = await createTestUsers();

    // Crear perfiles
    await createUserProfiles(users);

    // Asignar equipos
    await addUsersToTeams(users);

    // Datos geográficos
    const deptIds = await seedDepartments();
    await seedMunicipalities(deptIds);
    await seedZonesBolivar();

    // Datos de proyecto
    const coordinatorUser = users.find(u => u.role === 'coordinator');
    const project = await seedDemoProject(coordinatorUser?.userId);
    await seedDemoForm(coordinatorUser?.userId);
    
    if (project) {
        await seedTestFamilies(project.$id);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║   ✅  Seed completado exitosamente           ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`\n⏱   Tiempo total: ${elapsed}s`);
    console.log('\n📋  Datos creados:');
    console.log('   • 1 organización (Gobernación de Bolívar)');
    console.log('   • 4 usuarios de prueba');
    console.log('   • 4 perfiles de usuario');
    console.log(`   • ${DEPARTAMENTOS.length} departamentos de Colombia`);
    console.log(`   • ${MUNICIPIOS.length} municipios principales`);
    console.log('   • 8 zonas de Cartagena (Demo)');
    console.log('   • 1 proyecto demo Bolívar');
    console.log('   • 1 formulario demo publicado Bolívar');
    console.log('\n🔑  Credenciales de prueba:');
    for (const u of TEST_USERS) {
      console.log(`   • ${u.role.padEnd(12)} ${u.email}  /  ${u.password}`);
    }
    console.log('');
  } catch (err) {
    console.error('\n❌  Error durante el seed:', err?.message || err);
    process.exit(1);
  }
}

main();
