# CONTROL G — Plan Maestro de Ejecución Técnica y Estratégica

## Plataforma Offline-First de Recolección de Datos en Campo para Caracterizaciones Territoriales

**Arquitectura, Modelo de Datos PostgreSQL/Supabase, Motor de Formularios Dinámicos, Sistema Offline-First con Sincronización Automática, Integración OCR (Gemini Vision + Tesseract.js), Empaquetado Móvil (Capacitor.js), y Roadmap de Desarrollo Sprint por Sprint**

**DRAN DIGITAL S.A.S.**
NIT: 901.359.114 — Cartagena de Indias, Colombia
Natan David Chiquillo Sarabia — Gerente General y Representante Legal

Marzo 2026 — Versión 1.0

---

# Tabla de Contenido

1. Resumen Ejecutivo
2. Arquitectura del Sistema
3. Modelo de Datos — Esquemas PostgreSQL/Supabase
4. Motor de Formularios Dinámicos (Form Builder)
5. Sistema Offline-First y Motor de Sincronización
6. Módulo OCR — Especificaciones
7. Generación de Plantillas PDF Imprimibles
8. Integración n8n — Flujos de Automatización
9. Requerimientos Funcionales por Módulo
10. Roadmap de Desarrollo — Sprints del MVP
11. Infraestructura, Costos y Presupuesto
12. Métricas de Éxito (KPIs)
13. Cronograma General — 12 Meses
14. Seguridad, Cumplimiento y Contingencia
15. Conclusión y Acciones Inmediatas

---

# 1. Resumen Ejecutivo

Control G es una plataforma SaaS que combina un motor de formularios dinámicos, una arquitectura offline-first con sincronización automática, y un módulo de OCR con inteligencia artificial, creando un ecosistema donde las organizaciones diseñan instrumentos de recolección de datos, los despliegan a equipos de campo que operan sin internet, y consolidan información territorial con trazabilidad completa. El diferencial estratégico frente a competidores como KoBoToolbox (diseñado para contextos internacionales), ODK (requiere configuración técnica avanzada), SurveyCTO (precio elevado por licencia) y Google Forms (sin capacidad offline) radica en tres pilares: offline-first nativo con auto-sync transparente, OCR integrado para digitalizar formularios en papel con IA, y jerarquía geográfica colombiana nativa alineada con DIVIPOLA del DANE.

Este documento constituye el plan maestro de ejecución técnica y estratégica de Control G, detallando la arquitectura del sistema, los esquemas completos de base de datos para todos los módulos, las integraciones con Supabase (backend), n8n (automatización), Gemini Vision AI (OCR online), Tesseract.js (OCR offline), Capacitor.js (empaquetado móvil), los requerimientos funcionales por módulo, y el roadmap de desarrollo sprint por sprint con un horizonte de 12 meses.

## 1.1 Objetivos Estratégicos

- Lanzar un MVP funcional (Auth + Form Builder + Recolección offline + Sync) en 14 semanas de desarrollo
- Cerrar 5 contratos piloto con entidades en Cartagena durante el primer mes post-lanzamiento
- Alcanzar 30 organizaciones activas en Colombia en 6 meses
- Integrar módulo OCR completo en el mes 5
- Publicar en Google Play Store y Apple App Store en el mes 4
- Alcanzar 100 organizaciones con 2,000+ técnicos activos en 12 meses
- Generar MRR de $45,000 USD/mes a escala completa

## 1.2 Stack Tecnológico

| Componente | Tecnología | Justificación |
|---|---|---|
| Frontend Web | React 18 + Vite + TypeScript + TailwindCSS | Ecosistema maduro, tipado estático, utility-first CSS |
| Componentes UI | shadcn/ui + Radix UI | Accesibles, personalizables, profesionales |
| Estado Global | Zustand | Ligero, persistencia en IndexedDB, devtools |
| Formularios | React Hook Form + Zod | Validación tipada, rendimiento en formularios complejos |
| Drag & Drop | dnd-kit | Form Builder, reordenamiento de campos |
| Gráficas | Recharts | Dashboards y reportes |
| Mapas | Leaflet + React Leaflet + leaflet-offline | Mapas con tiles descargables para uso offline |
| Backend / BaaS | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) | Serverless, realtime nativo, Row Level Security |
| Base de Datos Local | IndexedDB vía Dexie.js | Almacenamiento offline estructurado y robusto |
| Service Worker | Workbox (vite-plugin-pwa) | Caché de assets, background sync nativa |
| OCR Online | Google Gemini Vision AI | Alta precisión en manuscrita, multimodal |
| OCR Offline | Tesseract.js (WebAssembly) | Procesamiento sin conexión en el dispositivo |
| PDF Generation | jsPDF + html2canvas | Generación de plantillas imprimibles |
| Firma Digital | react-signature-canvas | Pad de firma táctil |
| QR/Barcode | html5-qrcode | Escaneo de códigos |
| Mobile | Capacitor.js 5+ | Una codebase web → APK (Android) + IPA (iOS) |
| Automatización | n8n (self-hosted en VPS) | Orquestación: notificaciones, reportes, webhooks |
| WhatsApp Bot | Baileys + PM2 en VPS Contabo | Notificaciones y soporte vía WhatsApp |
| Hosting Frontend | Vercel | CI/CD automático, edge caching, SSL |
| Hosting Backend | Supabase Cloud + Contabo VPS (n8n, bots) | Flexibilidad, costo-eficiencia |
| Monitoreo | Sentry + UptimeRobot | Errores en tiempo real, uptime 24/7 |

---

# 2. Arquitectura del Sistema

La arquitectura de Control G sigue un patrón offline-first donde el cliente (PWA/app nativa) es la fuente primaria de datos y Supabase actúa como backend de consolidación. El VPS Contabo ejecuta n8n para automatización y el bot de WhatsApp para notificaciones. El frontend React se despliega en Vercel. La comunicación entre componentes se realiza mediante la API REST de Supabase, webhooks y el canal Realtime para actualizaciones en tiempo real a dashboards.

## 2.1 Capas del Sistema

### Capa 1 — Clientes (Frontend)
- **Dashboard Web (React + Vite)**: Panel de administración para Superadmin y Coordinador. Sidebar colapsable, responsive.
- **Dashboard Asistente (React + Vite)**: Panel simplificado de supervisión de subgrupos de técnicos.
- **App Técnico (PWA + Capacitor.js)**: Aplicación mobile-first con bottom navigation bar de 5 tabs. Funciona 100% offline. Se empaqueta como APK (Android) e IPA (iOS).
- **Landing Page (controlg.app)**: Marketing, planes, registro de organizaciones.

### Capa 2 — API y Autenticación (Supabase)
- **Supabase Auth**: Registro con email/password, MFA para Coordinadores y Superadmin.
- **Row Level Security (RLS)**: Cada organización solo accede a sus datos. Cada técnico solo ve formularios de su zona asignada.
- **Edge Functions (Deno)**: Lógica serverless para procesamiento OCR, generación de reportes, webhooks de notificación.
- **API REST autogenerada (PostgREST)**: CRUD sobre todas las tablas con filtros, paginación, y selects anidados.

### Capa 3 — Procesamiento OCR (Híbrido)
- **Gemini Vision AI (online)**: Recibe imagen de formulario en papel, extrae texto con alta precisión en manuscrita.
- **Tesseract.js (offline)**: Procesamiento OCR básico sin conexión directamente en el dispositivo del técnico.
- **Pipeline de imagen**: Corrección de perspectiva, mejora de contraste, eliminación de sombras antes del OCR.

### Capa 4 — Automatización (n8n en VPS)
- **Flujos automatizados**: Notificaciones, reportes diarios, alertas de calidad de datos.
- **Webhooks Supabase**: Triggers de BD que disparan flujos en n8n.
- **Cron Jobs**: Reportes de avance, alertas de técnicos inactivos, resúmenes semanales.

### Capa 5 — Datos y Storage (Supabase)
- **PostgreSQL**: Base de datos relacional principal con RLS multi-tenant.
- **Supabase Storage**: Fotografías de campo, videos cortos, firmas digitales, plantillas PDF, documentos OCR.
- **Supabase Realtime**: Suscripciones para dashboards de coordinador (nuevos formularios, actualizaciones de avance).

## 2.2 Flujo de Recolección de Datos (End-to-End)

1. **Coordinador** diseña formulario en el Form Builder visual (drag-and-drop) y lo publica.
2. El formulario publicado queda disponible para los técnicos asignados a ese proyecto.
3. **Técnico** abre la app en campo (con o sin internet). Los formularios se cachean localmente en IndexedDB.
4. Técnico selecciona formulario e inicia el diligenciamiento. Cada campo se auto-guarda en IndexedDB inmediatamente.
5. Técnico captura fotos, videos, firma digital, geolocalización GPS — todo almacenado localmente.
6. Técnico toca "Finalizar y Enviar" → formulario pasa a estado `completed` en cola de sincronización local.
7. **Detector de conectividad** (Network API + heartbeat HTTP) detecta internet disponible.
8. **Sync Engine** se activa automáticamente: sube formularios completados en lotes comprimidos (gzip) a Supabase.
9. Cada lote confirmado con hash de integridad → estado local cambia a `synced`.
10. Multimedia (fotos, videos, firmas) se sube en paralelo a Supabase Storage.
11. **Supabase Realtime** notifica al dashboard del Coordinador del nuevo formulario recibido.
12. **Asistente** pre-valida los datos. **Coordinador** aprueba o rechaza.
13. Datos exportables a Excel, CSV, JSON, PDF.

## 2.3 Flujo de Digitalización OCR (End-to-End)

1. Coordinador publica formulario → sistema genera automáticamente un PDF imprimible con código QR.
2. Técnico descarga el PDF imprimible desde la tab "Plantillas" (disponible offline).
3. Técnico imprime el PDF y lo llena a mano en campo.
4. De vuelta, el técnico abre la tab "Escanear" y elige "Abrir Cámara" o "Subir PDF".
5. La app captura la imagen → detecta bordes → corrección de perspectiva → mejora de contraste.
6. Si hay internet: envía imagen a Gemini Vision AI para extracción de alta precisión.
7. Si NO hay internet: procesa localmente con Tesseract.js (WASM) como fallback.
8. Se presenta pantalla de revisión: imagen original arriba + datos extraídos abajo, campo por campo.
9. Cada campo tiene indicador de confianza: verde (>90%), amarillo (70-90%), rojo (<70%).
10. Técnico corrige campos con baja confianza y confirma.
11. Datos se integran al flujo normal (IndexedDB → cola de sync → Supabase).

## 2.4 Integración Supabase — Detalle Técnico

### 2.4.1 Multi-tenancy con RLS

Cada organización es un tenant aislado. Se usa `organization_id` en todas las tablas operativas y políticas RLS para garantizar aislamiento total de datos:

```sql
-- Ejemplo: Aislamiento por organización
CREATE POLICY "org_isolation" ON projects
  FOR ALL USING (
    organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
  );

-- Ejemplo: Técnico solo ve formularios de su zona
CREATE POLICY "technician_zone_access" ON form_responses
  FOR SELECT USING (
    technician_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.project_id = form_responses.project_id
    )
  );
```

Roles de usuario dentro de cada organización:
- **superadmin**: Acceso total a todas las organizaciones (solo DRAN DIGITAL)
- **coordinator**: Gestión total dentro de su organización (proyectos, formularios, equipo, datos)
- **assistant**: Supervisión de subgrupo de técnicos, pre-validación de datos
- **technician**: Solo diligenciar formularios en su zona asignada, escaneo OCR, ver su avance

### 2.4.2 Realtime para Dashboard del Coordinador

```javascript
// Frontend: Suscripción a nuevos formularios sincronizados en tiempo real
const channel = supabase.channel('coordinator-' + projectId)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'form_responses',
    filter: 'project_id=eq.' + projectId
  }, (payload) => {
    playNotificationSound();
    incrementFormCount();
    updateZoneProgress(payload.new.zone_id);
    addToRecentTable(payload.new);
  })
  .subscribe();
```

### 2.4.3 Edge Functions

Las Edge Functions de Supabase (Deno runtime) manejan operaciones del lado del servidor:

- **process-ocr**: Recibe imagen base64, llama a Gemini Vision AI, retorna campos extraídos con confianza
- **generate-pdf-template**: Genera PDF imprimible a partir del schema JSONB del formulario
- **generate-report**: Genera reportes PDF/Excel de avance por zona/técnico/proyecto
- **send-notification**: Envía notificaciones push y/o WhatsApp vía Baileys
- **export-data**: Exporta datos filtrados a Excel/CSV/JSON con opción de anonimización
- **ai-summary**: Genera resumen ejecutivo del proyecto usando Gemini con los datos consolidados

### 2.4.4 Storage — Estructura de Buckets

| Bucket | Contenido | Acceso |
|---|---|---|
| field-photos | Fotos capturadas en formularios (webp, max 2MB) | Privado (solo org) |
| field-videos | Videos cortos de campo (mp4, max 30s/20MB) | Privado (solo org) |
| signatures | Firmas digitales (png, max 500KB) | Privado (solo org) |
| ocr-scans | Imágenes de formularios escaneados | Privado (solo org) |
| form-attachments | Archivos adjuntos de formularios (PDF, doc) | Privado (solo org) |
| pdf-templates | PDFs imprimibles generados por el sistema | Lectura por miembros del proyecto |
| exports | Reportes exportados (Excel, PDF, CSV) | Privado (expira 24h) |
| avatars | Fotos de perfil de usuarios | Público lectura |

---

# 3. Modelo de Datos — Esquemas PostgreSQL/Supabase

El modelo soporta múltiples organizaciones, proyectos y tipos de formularios desde una estructura relacional normalizada. Todas las tablas operativas incluyen `organization_id` como foreign key y están protegidas con RLS.

## 3.1 Diagrama de Relaciones (Resumen)

```
organizations (1) ──── (N) users
organizations (1) ──── (N) projects
projects (1) ──────── (N) project_zones
projects (1) ──────── (N) project_members
projects (1) ──────── (N) forms
forms (1) ─────────── (N) form_versions
forms (1) ─────────── (N) form_responses
form_responses (1) ── (N) form_response_media
zones (N) ─────────── (1) municipalities
municipalities (N) ── (1) departments
```

## 3.2 SQL de Creación — ENUMs

```sql
-- === ENUMS ===
CREATE TYPE user_role_enum AS ENUM ('superadmin', 'coordinator', 'assistant', 'technician');
CREATE TYPE org_plan_enum AS ENUM ('starter', 'professional', 'enterprise', 'gobierno');
CREATE TYPE org_status_enum AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE project_status_enum AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE project_type_enum AS ENUM (
  'socioeconomica', 'conectividad', 'servicios_publicos', 'censo',
  'electoral', 'vivienda', 'agropecuario', 'personalizada'
);
CREATE TYPE form_status_enum AS ENUM ('draft', 'published', 'archived');
CREATE TYPE response_status_enum AS ENUM ('synced', 'in_review', 'validated', 'approved', 'rejected');
CREATE TYPE response_source_enum AS ENUM ('digital', 'ocr_camera', 'ocr_pdf');
CREATE TYPE media_type_enum AS ENUM ('photo', 'video', 'signature', 'document', 'ocr_scan');
CREATE TYPE sync_status_enum AS ENUM ('success', 'partial', 'failed');
CREATE TYPE zone_type_enum AS ENUM (
  'localidad', 'comuna', 'corregimiento', 'vereda',
  'barrio', 'sector', 'manzana', 'custom'
);
CREATE TYPE chat_channel_type_enum AS ENUM ('direct', 'project', 'zone', 'group');
CREATE TYPE chat_message_type_enum AS ENUM ('text', 'voice', 'image', 'document', 'system');
CREATE TYPE notification_type_enum AS ENUM (
  'assignment', 'approval', 'rejection', 'message',
  'sync', 'system', 'alert'
);
CREATE TYPE audit_action_enum AS ENUM (
  'user.login', 'user.logout', 'user.created', 'user.updated',
  'project.created', 'project.updated',
  'form.created', 'form.published', 'form.archived',
  'response.synced', 'response.validated', 'response.approved', 'response.rejected',
  'ocr.processed', 'export.generated',
  'member.invited', 'member.removed', 'zone.assigned'
);
```

## 3.3 Tabla: organizations

Registro central de cada organización cliente en la plataforma.

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | Identificador único |
| name | VARCHAR(200) NOT NULL | Nombre de la organización |
| nit | VARCHAR(30) UNIQUE | NIT / ID tributaria colombiana |
| contact_name | VARCHAR(200) | Nombre del contacto principal |
| contact_email | VARCHAR(255) NOT NULL | Email de contacto |
| contact_phone | VARCHAR(20) | Teléfono de contacto |
| address | TEXT | Dirección física |
| city | VARCHAR(100) | Ciudad |
| department | VARCHAR(100) | Departamento |
| country | VARCHAR(2) DEFAULT 'CO' | País ISO 3166-1 |
| plan | org_plan_enum DEFAULT 'starter' | starter, professional, enterprise, gobierno |
| plan_expires_at | TIMESTAMPTZ | Vencimiento del plan |
| max_users | INTEGER DEFAULT 10 | Límite de usuarios según plan |
| max_forms | INTEGER DEFAULT 5 | Límite de formularios activos |
| max_ocr_monthly | INTEGER DEFAULT 100 | Escaneos OCR mensuales permitidos |
| max_storage_gb | INTEGER DEFAULT 5 | Almacenamiento máximo (GB) |
| ocr_usage_current | INTEGER DEFAULT 0 | Escaneos OCR usados en el mes actual |
| storage_used_mb | DECIMAL(10,2) DEFAULT 0 | Storage usado (MB) |
| status | org_status_enum DEFAULT 'active' | active, suspended, cancelled |
| settings | JSONB DEFAULT '{}' | Configuraciones personalizadas |
| created_at | TIMESTAMPTZ DEFAULT now() | Fecha de registro |
| updated_at | TIMESTAMPTZ DEFAULT now() | Última actualización |

## 3.4 Tabla: users

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY REFERENCES auth.users(id) | ID de Supabase Auth |
| organization_id | UUID REFERENCES organizations(id) | Organización (NULL para superadmin) |
| full_name | VARCHAR(200) NOT NULL | Nombre completo |
| email | VARCHAR(255) UNIQUE NOT NULL | Email |
| phone | VARCHAR(20) | Teléfono / WhatsApp |
| role | user_role_enum NOT NULL | superadmin, coordinator, assistant, technician |
| avatar_url | TEXT | URL foto de perfil |
| status | user_status_enum DEFAULT 'active' | active, inactive, suspended |
| last_seen_at | TIMESTAMPTZ | Última actividad |
| last_sync_at | TIMESTAMPTZ | Última sincronización exitosa |
| last_known_latitude | DECIMAL(10,8) | Última ubicación conocida |
| last_known_longitude | DECIMAL(11,8) | Última ubicación conocida |
| device_info | JSONB | {model, os, app_version, screen_size} |
| created_at | TIMESTAMPTZ DEFAULT now() | Registro |
| updated_at | TIMESTAMPTZ DEFAULT now() | Última actualización |

## 3.5 Tablas: departments, municipalities, zones (Jerarquía DIVIPOLA)

```sql
-- Departamentos (precargados con datos DANE: 32 departamentos + Bogotá D.C.)
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  code VARCHAR(5) UNIQUE NOT NULL,  -- Código DANE (ej: '13' para Bolívar)
  name VARCHAR(100) NOT NULL        -- Nombre oficial
);

-- Municipios (precargados: 1.123 municipios)
CREATE TABLE municipalities (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id) NOT NULL,
  code VARCHAR(8) UNIQUE NOT NULL,  -- Código DANE (ej: '13001' para Cartagena)
  name VARCHAR(150) NOT NULL
);

-- Zonas sub-municipales (creadas por proyecto, jerárquicas)
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id INTEGER REFERENCES municipalities(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id),  -- NULL = zona global del sistema
  name VARCHAR(200) NOT NULL,
  type zone_type_enum NOT NULL,
  parent_zone_id UUID REFERENCES zones(id),  -- Jerarquía: localidad > corregimiento > barrio > sector
  polygon JSONB,                              -- GeoJSON del polígono de la zona
  population_estimate INTEGER,                -- Población estimada
  households_estimate INTEGER,                -- Hogares estimados
  metadata JSONB DEFAULT '{}',                -- Datos adicionales de la zona
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_zones_municipality ON zones(municipality_id);
CREATE INDEX idx_zones_parent ON zones(parent_zone_id);
CREATE INDEX idx_zones_org ON zones(organization_id);
```

## 3.6 Tabla: projects

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | Identificador |
| organization_id | UUID REFERENCES organizations(id) NOT NULL | Organización |
| coordinator_id | UUID REFERENCES users(id) NOT NULL | Coordinador líder |
| name | VARCHAR(200) NOT NULL | Nombre del proyecto |
| description | TEXT | Descripción |
| type | project_type_enum NOT NULL | Tipo de caracterización |
| department_id | INTEGER REFERENCES departments(id) | Departamento principal |
| municipality_id | INTEGER REFERENCES municipalities(id) | Municipio principal |
| start_date | DATE | Fecha de inicio |
| end_date | DATE | Fecha fin estimada |
| target_forms | INTEGER DEFAULT 0 | Meta total de formularios |
| status | project_status_enum DEFAULT 'draft' | Estado del proyecto |
| settings | JSONB DEFAULT '{}' | Config: geocercas, validaciones, etc. |
| created_at | TIMESTAMPTZ DEFAULT now() | Creación |
| updated_at | TIMESTAMPTZ DEFAULT now() | Actualización |

## 3.7 Tabla: project_zones

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | Identificador |
| project_id | UUID REFERENCES projects(id) ON DELETE CASCADE | Proyecto |
| zone_id | UUID REFERENCES zones(id) | Zona asignada |
| target_forms | INTEGER DEFAULT 0 | Meta de formularios para esta zona |

## 3.8 Tabla: project_members

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | Identificador |
| project_id | UUID REFERENCES projects(id) ON DELETE CASCADE | Proyecto |
| user_id | UUID REFERENCES users(id) | Usuario asignado |
| assigned_zone_id | UUID REFERENCES zones(id) | Zona asignada (para técnicos) |
| supervisor_id | UUID REFERENCES users(id) | Asistente supervisor (para técnicos) |
| is_active | BOOLEAN DEFAULT true | Activo en el proyecto |
| joined_at | TIMESTAMPTZ DEFAULT now() | Fecha de asignación |

## 3.9 Tabla: forms

Definición de formularios dinámicos. El campo `schema` contiene la estructura completa del formulario en JSONB.

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | Identificador |
| project_id | UUID REFERENCES projects(id) | Proyecto al que pertenece |
| organization_id | UUID REFERENCES organizations(id) NOT NULL | Organización |
| created_by | UUID REFERENCES users(id) | Coordinador que lo creó |
| name | VARCHAR(200) NOT NULL | Nombre del formulario |
| description | TEXT | Descripción |
| version | INTEGER DEFAULT 1 | Versión actual |
| status | form_status_enum DEFAULT 'draft' | draft, published, archived |
| schema | JSONB NOT NULL | Definición completa: campos, secciones, validaciones, lógica condicional |
| ocr_template_map | JSONB | Mapa de referencia para que el OCR identifique campos en la versión impresa |
| printable_pdf_url | TEXT | URL del PDF imprimible en Supabase Storage |
| total_fields | INTEGER DEFAULT 0 | Número total de campos (calculado) |
| created_at | TIMESTAMPTZ DEFAULT now() | Creación |
| updated_at | TIMESTAMPTZ DEFAULT now() | Actualización |

## 3.10 Tabla: form_versions

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | Identificador |
| form_id | UUID REFERENCES forms(id) ON DELETE CASCADE | Formulario |
| version | INTEGER NOT NULL | Número de versión |
| schema | JSONB NOT NULL | Schema de esa versión |
| changelog | TEXT | Descripción de cambios |
| created_by | UUID REFERENCES users(id) | Quien modificó |
| created_at | TIMESTAMPTZ DEFAULT now() | Timestamp |

## 3.11 Tabla: form_templates

Plantillas reutilizables del sistema y de la organización.

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | Identificador |
| organization_id | UUID REFERENCES organizations(id) | NULL = plantilla global del sistema |
| name | VARCHAR(200) NOT NULL | Nombre de la plantilla |
| description | TEXT | Descripción |
| category | VARCHAR(100) | Categoría: socioeconómica, conectividad, servicios_publicos, etc. |
| schema | JSONB NOT NULL | Definición del formulario |
| total_fields | INTEGER DEFAULT 0 | Campos |
| is_system | BOOLEAN DEFAULT false | Plantilla precargada por Control G |
| usage_count | INTEGER DEFAULT 0 | Veces que se ha usado como base |
| created_at | TIMESTAMPTZ DEFAULT now() | Creación |

## 3.12 Tabla: form_responses

Tabla central de datos recolectados. Cada fila es un formulario diligenciado.

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | ID en Supabase (generado al sincronizar) |
| local_id | VARCHAR(50) NOT NULL | UUID generado offline en el dispositivo |
| form_id | UUID REFERENCES forms(id) | Formulario que se diligencia |
| form_version | INTEGER | Versión del formulario al momento de diligenciar |
| project_id | UUID REFERENCES projects(id) | Proyecto |
| organization_id | UUID REFERENCES organizations(id) NOT NULL | Organización |
| technician_id | UUID REFERENCES users(id) | Técnico que diligencia |
| zone_id | UUID REFERENCES zones(id) | Zona donde se recolectó |
| data | JSONB NOT NULL | Todas las respuestas: {"field_001": "Juan Pérez", "field_002": 5, ...} |
| latitude | DECIMAL(10,8) | Coordenada GPS al momento de captura |
| longitude | DECIMAL(11,8) | Coordenada GPS |
| accuracy | DECIMAL(8,2) | Precisión GPS en metros |
| altitude | DECIMAL(10,2) | Altitud (si disponible) |
| status | response_status_enum DEFAULT 'synced' | Estado en el workflow de validación |
| source | response_source_enum DEFAULT 'digital' | digital, ocr_camera, ocr_pdf |
| ocr_confidence | DECIMAL(5,4) | Promedio de confianza OCR (0.0 a 1.0) |
| ocr_field_confidences | JSONB | Confianza por campo: {"field_001": 0.95, "field_002": 0.72} |
| rejection_reason | TEXT | Motivo de rechazo (si aplica) |
| review_notes | JSONB | Observaciones campo por campo del revisor |
| reviewed_by | UUID REFERENCES users(id) | Quien revisó |
| reviewed_at | TIMESTAMPTZ | Cuándo se revisó |
| device_info | JSONB | {model, os, app_version, screen_size, battery_level} |
| started_at | TIMESTAMPTZ | Cuando el técnico inició el formulario |
| completed_at | TIMESTAMPTZ | Cuando lo finalizó |
| synced_at | TIMESTAMPTZ | Cuando se sincronizó con la nube |
| created_at | TIMESTAMPTZ DEFAULT now() | Registro en BD |

```sql
CREATE INDEX idx_responses_project ON form_responses(project_id);
CREATE INDEX idx_responses_technician ON form_responses(technician_id);
CREATE INDEX idx_responses_zone ON form_responses(zone_id);
CREATE INDEX idx_responses_status ON form_responses(status);
CREATE INDEX idx_responses_form ON form_responses(form_id);
CREATE INDEX idx_responses_local ON form_responses(local_id);
CREATE INDEX idx_responses_created ON form_responses(created_at DESC);
```

## 3.13 Tabla: form_response_media

Archivos multimedia vinculados a respuestas de formularios.

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID PRIMARY KEY DEFAULT gen_random_uuid() | Identificador |
| response_id | UUID REFERENCES form_responses(id) ON DELETE CASCADE | Respuesta padre |
| local_response_id | VARCHAR(50) NOT NULL | local_id de la respuesta (para vincular offline) |
| field_key | VARCHAR(100) NOT NULL | Clave del campo: "field_007", "field_010" |
| media_type | media_type_enum NOT NULL | photo, video, signature, document, ocr_scan |
| storage_path | TEXT | Ruta en Supabase Storage |
| original_filename | VARCHAR(255) | Nombre del archivo original |
| mime_type | VARCHAR(100) | image/jpeg, video/mp4, etc. |
| file_size | INTEGER | Tamaño en bytes |
| width | INTEGER | Ancho en píxeles (imágenes/video) |
| height | INTEGER | Alto en píxeles |
| duration_seconds | INTEGER | Duración (solo videos) |
| synced | BOOLEAN DEFAULT false | Ya subido a Storage |
| created_at | TIMESTAMPTZ DEFAULT now() | Creación |

## 3.14 Tablas de Chat y Comunicación

```sql
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  zone_id UUID REFERENCES zones(id),
  name VARCHAR(200),
  type chat_channel_type_enum NOT NULL,  -- direct, project, zone, group
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT,
  message_type chat_message_type_enum DEFAULT 'text',
  media_url TEXT,
  local_id VARCHAR(50),  -- ID offline para sincronización
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_channel ON chat_messages(channel_id, created_at DESC);
```

## 3.15 Tablas de Auditoría y Notificaciones

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action audit_action_enum NOT NULL,
  entity_type VARCHAR(50),       -- 'form', 'response', 'user', 'project'
  entity_id UUID,
  details JSONB,                 -- Datos adicionales del evento
  ip_address VARCHAR(45),
  device_info JSONB,
  latitude DECIMAL(10,8),        -- Dónde ocurrió la acción
  longitude DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_org ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  type notification_type_enum NOT NULL,
  data JSONB,                    -- Deep linking: {project_id, form_id, response_id}
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
```

## 3.16 Tabla: sync_log

```sql
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  device_id VARCHAR(100),
  records_uploaded INTEGER DEFAULT 0,
  records_downloaded INTEGER DEFAULT 0,
  media_uploaded INTEGER DEFAULT 0,
  media_bytes_transferred BIGINT DEFAULT 0,
  duration_ms INTEGER,
  status sync_status_enum,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

# 4. Motor de Formularios Dinámicos (Form Builder)

## 4.1 Estructura del Schema JSONB

Cada formulario se define como un objeto JSON almacenado en `forms.schema`. Esta estructura se utiliza para: renderizar el formulario en la app del técnico, generar el PDF imprimible, configurar el mapeo OCR, y definir las columnas de exportación.

```json
{
  "formId": "uuid-del-formulario",
  "version": 1,
  "settings": {
    "allow_draft_save": true,
    "require_gps": true,
    "auto_capture_gps": true,
    "require_signature": true,
    "enable_ocr": true,
    "max_completion_time_minutes": 120,
    "geofence_enabled": false,
    "geofence_radius_meters": 500
  },
  "pages": [
    {
      "id": "page_1",
      "title": "Identificación del Hogar",
      "description": "Datos básicos del hogar encuestado",
      "fields": [
        {
          "id": "field_001",
          "type": "text_short",
          "label": "Nombre completo del jefe de hogar",
          "placeholder": "Ingrese nombre y apellidos",
          "help_text": "Registre como aparece en el documento de identidad",
          "required": true,
          "validations": {
            "min_length": 3,
            "max_length": 100,
            "pattern": null,
            "custom_message": "El nombre debe tener al menos 3 caracteres"
          },
          "conditional": null,
          "ocr_region": {"x": 0.05, "y": 0.12, "w": 0.90, "h": 0.04}
        },
        {
          "id": "field_002",
          "type": "text_short",
          "label": "Número de cédula",
          "required": true,
          "validations": {
            "pattern": "^[0-9]{6,10}$",
            "custom_message": "Ingrese entre 6 y 10 dígitos numéricos"
          },
          "conditional": null
        },
        {
          "id": "field_003",
          "type": "numeric",
          "label": "Número de personas en el hogar",
          "required": true,
          "validations": {
            "min": 1,
            "max": 30
          },
          "conditional": null
        },
        {
          "id": "field_004",
          "type": "single_select",
          "label": "Estrato socioeconómico",
          "required": true,
          "options": [
            {"value": "1", "label": "Estrato 1"},
            {"value": "2", "label": "Estrato 2"},
            {"value": "3", "label": "Estrato 3"},
            {"value": "4", "label": "Estrato 4"},
            {"value": "5", "label": "Estrato 5"},
            {"value": "6", "label": "Estrato 6"}
          ],
          "display_as": "radio",
          "conditional": null
        },
        {
          "id": "field_005",
          "type": "yes_no",
          "label": "¿Tiene acceso a internet en el hogar?",
          "required": true,
          "conditional": null
        },
        {
          "id": "field_006",
          "type": "single_select",
          "label": "Tipo de conexión a internet",
          "required": true,
          "options": [
            {"value": "fibra", "label": "Fibra óptica"},
            {"value": "cable", "label": "Cable/DSL"},
            {"value": "movil", "label": "Datos móviles"},
            {"value": "satelital", "label": "Satelital"},
            {"value": "comunitaria", "label": "Red comunitaria"}
          ],
          "display_as": "dropdown",
          "conditional": {
            "field_id": "field_005",
            "operator": "equals",
            "value": true
          }
        },
        {
          "id": "field_007",
          "type": "multi_select",
          "label": "Servicios públicos con los que cuenta",
          "required": true,
          "options": [
            {"value": "agua", "label": "Agua potable"},
            {"value": "alcantarillado", "label": "Alcantarillado"},
            {"value": "energia", "label": "Energía eléctrica"},
            {"value": "gas", "label": "Gas natural"},
            {"value": "aseo", "label": "Recolección de basuras"}
          ],
          "conditional": null
        },
        {
          "id": "field_008",
          "type": "photo",
          "label": "Foto de la fachada de la vivienda",
          "required": false,
          "max_files": 3,
          "max_file_size_mb": 5,
          "conditional": null
        },
        {
          "id": "field_009",
          "type": "geolocation",
          "label": "Ubicación del predio",
          "required": true,
          "auto_capture": true,
          "show_map": true,
          "conditional": null
        }
      ]
    },
    {
      "id": "page_2",
      "title": "Miembros del Hogar",
      "fields": [
        {
          "id": "field_010",
          "type": "repeating_group",
          "label": "Registre cada persona que vive en el hogar",
          "min_entries": 1,
          "max_entries": 20,
          "add_button_text": "+ Agregar persona",
          "fields": [
            {
              "id": "field_010_name",
              "type": "text_short",
              "label": "Nombre completo",
              "required": true
            },
            {
              "id": "field_010_age",
              "type": "numeric",
              "label": "Edad",
              "required": true,
              "validations": {"min": 0, "max": 120}
            },
            {
              "id": "field_010_gender",
              "type": "single_select",
              "label": "Sexo",
              "required": true,
              "options": [
                {"value": "M", "label": "Masculino"},
                {"value": "F", "label": "Femenino"},
                {"value": "O", "label": "Otro"}
              ],
              "display_as": "radio"
            },
            {
              "id": "field_010_education",
              "type": "single_select",
              "label": "Nivel educativo",
              "required": false,
              "options": [
                {"value": "ninguno", "label": "Ninguno"},
                {"value": "primaria", "label": "Primaria"},
                {"value": "secundaria", "label": "Secundaria"},
                {"value": "tecnico", "label": "Técnico/Tecnológico"},
                {"value": "universitario", "label": "Universitario"},
                {"value": "posgrado", "label": "Posgrado"}
              ],
              "display_as": "dropdown"
            }
          ]
        }
      ]
    },
    {
      "id": "page_3",
      "title": "Cierre",
      "fields": [
        {
          "id": "field_011",
          "type": "text_long",
          "label": "Observaciones generales",
          "required": false,
          "validations": {"max_length": 1000}
        },
        {
          "id": "field_012",
          "type": "signature",
          "label": "Firma del encuestado",
          "required": true,
          "consent_text": "Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012"
        }
      ]
    }
  ]
}
```

## 4.2 Tipos de Campo Soportados

| type | Descripción | Renderizado en app | Renderizado en PDF imprimible |
|---|---|---|---|
| `text_short` | Texto corto (máx 255) | Input text | Línea horizontal para escribir |
| `text_long` | Texto largo | Textarea | Recuadro grande |
| `numeric` | Número con rango | Input number + teclado numérico | Casillas numéricas |
| `single_select` | Selección única | Radio buttons o dropdown | Círculos para marcar |
| `multi_select` | Selección múltiple | Checkboxes | Cuadros para marcar |
| `yes_no` | Booleano | Toggle switch | Dos opciones: Sí ○ No ○ |
| `date` | Fecha | Datepicker nativo | DD/MM/AAAA con casillas |
| `time` | Hora | Timepicker nativo | HH:MM con casillas |
| `likert` | Escala 1-5 o 1-10 | Slider o botones | Números para circular |
| `geolocation` | GPS | Botón captura + minimapa | Campo: Lat/Lon |
| `photo` | Fotografía(s) | Botón cámara + thumbnails | "[FOTO]" placeholder |
| `video` | Video corto (30s) | Botón grabar + preview | "[VIDEO]" placeholder |
| `signature` | Firma digital | Canvas táctil | Recuadro "FIRMA" |
| `file` | Archivo adjunto | Selector de archivos | "[ADJUNTO]" placeholder |
| `barcode_qr` | Código barras/QR | Cámara con scanner overlay | Campo de texto |
| `repeating_group` | Grupo que se repite N veces | Sección con "+ Agregar" | Tabla con filas |
| `calculated` | Campo calculado | Solo lectura | Solo lectura |
| `matrix` | Tabla preguntas vs opciones | Grid interactivo | Tabla impresa |
| `section_title` | Separador visual | Heading con línea | Heading en PDF |

## 4.3 Operadores de Lógica Condicional (Skip Logic)

| Operador | Descripción | Ejemplo |
|---|---|---|
| `equals` | Igual a | Campo "internet" equals true |
| `not_equals` | Diferente de | Campo "estrato" not_equals "6" |
| `greater_than` | Mayor que | Campo "edad" greater_than 18 |
| `less_than` | Menor que | Campo "personas" less_than 5 |
| `contains` | Contiene (para multi_select) | Campo "servicios" contains "agua" |
| `not_contains` | No contiene | Campo "servicios" not_contains "gas" |
| `is_empty` | Está vacío | Campo "observaciones" is_empty |
| `is_not_empty` | No está vacío | Campo "telefono" is_not_empty |

## 4.4 Plantillas Precargadas del Sistema

| ID | Nombre | Categoría | Campos | Páginas |
|---|---|---|---|---|
| TPL-001 | Caracterización Socioeconómica | socioeconómica | 32 | 5 |
| TPL-002 | Diagnóstico de Conectividad Digital | conectividad | 18 | 3 |
| TPL-003 | Servicios Públicos Domiciliarios | servicios_publicos | 15 | 2 |
| TPL-004 | Censo Comunitario de Población | censo | 28 | 4 |
| TPL-005 | Evaluación de Infraestructura de Vivienda | vivienda | 22 | 3 |
| TPL-006 | Encuesta Electoral Territorial | electoral | 16 | 3 |
| TPL-007 | Diagnóstico Agropecuario | agropecuario | 24 | 4 |

---

# 5. Sistema Offline-First y Motor de Sincronización

## 5.1 Principios de Diseño

1. **Local-first storage**: Todos los datos se almacenan primero en IndexedDB (Dexie.js). La nube es una réplica, no la fuente primaria.
2. **Auto-guardado continuo**: Cada campo modificado se persiste inmediatamente. Si la app se cierra, el progreso se conserva.
3. **Detección inteligente de conectividad**: Capacitor Network API + heartbeat HTTP propio cada 30 segundos a un endpoint de Supabase.
4. **Sincronización automática**: Cuando detecta internet, la cola se activa sin intervención del usuario.
5. **Sincronización diferencial**: Solo registros nuevos o modificados. Datos comprimidos.
6. **Resolución de conflictos**: Last-write-wins con trazabilidad (log de versión descartada).

## 5.2 Estructura IndexedDB (Dexie.js)

```typescript
import Dexie, { Table } from 'dexie';

// === Interfaces ===
interface LocalFormResponse {
  localId: string;
  formId: string;
  formVersion: number;
  projectId: string;
  zoneId: string;
  data: Record<string, any>;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  altitude?: number;
  status: 'draft' | 'completed' | 'syncing' | 'synced' | 'sync_error';
  source: 'digital' | 'ocr_camera' | 'ocr_pdf';
  ocrConfidence?: number;
  ocrFieldConfidences?: Record<string, number>;
  startedAt: string;
  completedAt?: string;
  syncedAt?: string;
  syncAttempts: number;
  lastSyncError?: string;
  deviceInfo: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface LocalMedia {
  localId: string;
  responseLocalId: string;
  fieldKey: string;
  mediaType: 'photo' | 'video' | 'signature' | 'document' | 'ocr_scan';
  blob: Blob;
  thumbnailBlob?: Blob;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  synced: boolean;
  syncAttempts: number;
  createdAt: string;
}

interface SyncQueueItem {
  id: string;
  type: 'response' | 'media' | 'message';
  entityLocalId: string;
  priority: number;     // 1=alta, 5=baja. Responses=1, Media=3, Messages=4
  attempts: number;
  maxAttempts: number;   // Default: 10
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  lastError?: string;
  createdAt: string;
  nextRetryAt?: string;
}

interface CachedForm {
  id: string;
  projectId: string;
  name: string;
  description: string;
  schema: Record<string, any>;
  version: number;
  printablePdfBlob?: Blob;  // PDF descargado para uso offline
  cachedAt: string;
}

interface CachedMessage {
  localId: string;
  channelId: string;
  content: string;
  messageType: string;
  mediaBlob?: Blob;
  synced: boolean;
  createdAt: string;
}

interface CachedMapTile {
  key: string;          // "{z}/{x}/{y}"
  blob: Blob;
  cachedAt: string;
}

// === Database ===
class ControlGDatabase extends Dexie {
  formResponses!: Table<LocalFormResponse>;
  media!: Table<LocalMedia>;
  syncQueue!: Table<SyncQueueItem>;
  cachedForms!: Table<CachedForm>;
  cachedMessages!: Table<CachedMessage>;
  cachedMapTiles!: Table<CachedMapTile>;

  constructor() {
    super('ControlGDB');
    this.version(1).stores({
      formResponses: 'localId, formId, projectId, zoneId, status, createdAt',
      media: 'localId, responseLocalId, synced, mediaType',
      syncQueue: 'id, type, status, priority, createdAt, nextRetryAt',
      cachedForms: 'id, projectId',
      cachedMessages: 'localId, channelId, synced',
      cachedMapTiles: 'key',
    });
  }
}

export const db = new ControlGDatabase();
```

## 5.3 Motor de Sincronización — Pseudocódigo

```typescript
class SyncEngine {
  private isRunning = false;
  private networkStatus: 'online' | 'offline' = 'offline';

  // Inicia monitoreo de red
  async init() {
    // Capacitor Network API
    Network.addListener('networkStatusChange', (status) => {
      this.networkStatus = status.connected ? 'online' : 'offline';
      if (status.connected) this.startSync();
    });

    // Heartbeat HTTP cada 30 segundos
    setInterval(async () => {
      try {
        await fetch(SUPABASE_URL + '/rest/v1/', { method: 'HEAD' });
        if (this.networkStatus === 'offline') {
          this.networkStatus = 'online';
          this.startSync();
        }
      } catch {
        this.networkStatus = 'offline';
      }
    }, 30000);
  }

  async startSync() {
    if (this.isRunning || this.networkStatus === 'offline') return;
    this.isRunning = true;
    syncStore.setState({ status: 'syncing' });

    try {
      // 1. Subir respuestas de formularios (prioridad 1)
      const pendingResponses = await db.syncQueue
        .where({ type: 'response', status: 'pending' })
        .sortBy('createdAt');

      for (const item of pendingResponses) {
        await this.syncResponse(item);
        if (this.networkStatus === 'offline') break; // Abortar si se pierde conexión
      }

      // 2. Subir multimedia (prioridad 3)
      const pendingMedia = await db.syncQueue
        .where({ type: 'media', status: 'pending' })
        .sortBy('createdAt');

      for (const item of pendingMedia) {
        await this.syncMedia(item);
        if (this.networkStatus === 'offline') break;
      }

      // 3. Subir mensajes de chat (prioridad 4)
      const pendingMessages = await db.syncQueue
        .where({ type: 'message', status: 'pending' })
        .sortBy('createdAt');

      for (const item of pendingMessages) {
        await this.syncMessage(item);
        if (this.networkStatus === 'offline') break;
      }

      // 4. Descargar actualizaciones del servidor
      await this.downloadUpdates();

      syncStore.setState({ status: 'synced', pendingCount: 0 });
    } catch (error) {
      syncStore.setState({ status: 'error', lastError: error.message });
    } finally {
      this.isRunning = false;
    }
  }

  private async syncResponse(item: SyncQueueItem) {
    const response = await db.formResponses.get(item.entityLocalId);
    if (!response) return;

    try {
      // Subir a Supabase
      const { data, error } = await supabase
        .from('form_responses')
        .insert({
          local_id: response.localId,
          form_id: response.formId,
          form_version: response.formVersion,
          project_id: response.projectId,
          zone_id: response.zoneId,
          technician_id: currentUserId,
          organization_id: currentOrgId,
          data: response.data,
          latitude: response.latitude,
          longitude: response.longitude,
          accuracy: response.accuracy,
          source: response.source,
          ocr_confidence: response.ocrConfidence,
          ocr_field_confidences: response.ocrFieldConfidences,
          device_info: response.deviceInfo,
          started_at: response.startedAt,
          completed_at: response.completedAt,
          synced_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // Marcar como sincronizado localmente
      await db.formResponses.update(item.entityLocalId, {
        status: 'synced',
        syncedAt: new Date().toISOString(),
      });
      await db.syncQueue.update(item.id, { status: 'completed' });

    } catch (error) {
      const attempts = item.attempts + 1;
      await db.syncQueue.update(item.id, {
        attempts,
        status: attempts >= item.maxAttempts ? 'failed' : 'pending',
        lastError: error.message,
        nextRetryAt: new Date(Date.now() + Math.pow(2, attempts) * 1000).toISOString(),
      });
    }
  }

  private async downloadUpdates() {
    // Descargar nuevos formularios publicados
    const lastSync = await getLastSyncTimestamp();
    const { data: newForms } = await supabase
      .from('forms')
      .select('*')
      .eq('status', 'published')
      .gt('updated_at', lastSync);

    for (const form of newForms || []) {
      await db.cachedForms.put({
        id: form.id,
        projectId: form.project_id,
        name: form.name,
        description: form.description,
        schema: form.schema,
        version: form.version,
        cachedAt: new Date().toISOString(),
      });
    }

    // Descargar notificaciones
    // Descargar mensajes de chat nuevos
    // Descargar asignaciones de zona actualizadas
  }
}
```

## 5.4 Indicadores de Estado UI

| Estado | Ícono | Color | Texto | Ubicación |
|---|---|---|---|---|
| Sincronizado | Nube + check | Verde #27AE60 | "Sincronizado" | Barra superior (siempre visible) |
| Sincronizando | Nube + flecha animada | Naranja #F39C12 | "Sincronizando..." + barra progreso | Barra superior |
| Sin conexión | Nube + X + badge numérico | Rojo #E74C3C | "Sin conexión (N pendientes)" | Barra superior |
| Error de sync | Nube + exclamación | Rojo #E74C3C | "Error de sync — Reintentar" | Barra superior + Mi Perfil |

## 5.5 Capacidad de Almacenamiento

- IndexedDB soporta hasta ~1GB en la mayoría de dispositivos móviles (más en desktop).
- Con fotos comprimidas a WebP (200-500KB cada una), un técnico puede almacenar ~2,000 formularios con fotos antes de alcanzar límites.
- El sistema monitorea el espacio usado y alerta cuando supera el 80% del límite estimado.
- En Mi Perfil se muestra: "Espacio usado: 340 MB / ~1,000 MB".

---

# 6. Módulo OCR — Especificaciones

## 6.1 Arquitectura del Motor OCR

### Online (Gemini Vision AI)
- **Endpoint**: Gemini 1.5 Flash (balance costo/precisión) o Gemini 1.5 Pro (máxima precisión)
- **Input**: Imagen base64 + schema del formulario (campos esperados con tipo y etiqueta)
- **Output**: JSON con campo_id, valor_extraído, confianza (0.0-1.0)
- **Costo estimado**: ~$0.01-0.03 USD por escaneo

### Offline (Tesseract.js)
- **Runtime**: WebAssembly (WASM) compilado, ~2MB de modelo
- **Idioma**: Español (spa.traineddata precargado)
- **Precisión**: Menor que Gemini en manuscrita, aceptable para texto impreso
- **Tiempo**: 3-8 segundos por página en dispositivo de gama media

## 6.2 Prompt Template para Gemini Vision AI

```
SYSTEM: Eres un sistema OCR especializado en extraer datos de formularios
de caracterización territorial diligenciados a mano en Colombia.

FORMULARIO ESPERADO: {nombre_formulario}
CAMPOS A EXTRAER:
{lista de campos con id, label, tipo, opciones (si aplica)}

INSTRUCCIONES:
1. Analiza la imagen del formulario.
2. Para cada campo, extrae el valor escrito/marcado.
3. Para campos de selección (radio/checkbox), identifica cuál opción está marcada.
4. Si un campo está vacío, retorna null.
5. Asigna un nivel de confianza (0.0-1.0) a cada campo.
6. Usa español colombiano para nombres y direcciones.

Responde ÚNICAMENTE con JSON válido:
{
  "fields": [
    {"field_id": "field_001", "value": "Juan Carlos Pérez", "confidence": 0.92},
    {"field_id": "field_002", "value": "1047382956", "confidence": 0.88},
    {"field_id": "field_003", "value": 5, "confidence": 0.95},
    {"field_id": "field_004", "value": "2", "confidence": 0.85},
    {"field_id": "field_005", "value": true, "confidence": 0.90}
  ],
  "overall_confidence": 0.90,
  "warnings": ["Campo field_002 parcialmente ilegible"]
}
```

## 6.3 Pipeline de Procesamiento de Imagen

1. **Captura**: Cámara nativa vía Capacitor con overlay de guía de bordes.
2. **Detección de bordes**: Algoritmo Canny edge detection (canvas + JavaScript).
3. **Corrección de perspectiva**: Transformación de 4 puntos (homografía).
4. **Binarización**: Conversión a escala de grises → umbral adaptativo.
5. **Eliminación de sombras**: Resta de fondo estimado.
6. **Deskew**: Corrección de inclinación por análisis de Hough.
7. **Recorte**: Eliminación de márgenes excesivos.
8. **Output**: Imagen procesada lista para OCR (JPEG, 300 DPI equivalente).

## 6.4 Registro de Plantillas OCR

Cuando el Coordinador publica un formulario, el sistema genera automáticamente un `ocr_template_map` en la tabla `forms` que mapea las coordenadas relativas de cada campo en el PDF imprimible:

```json
{
  "page_count": 3,
  "pages": [
    {
      "page": 1,
      "qr_position": {"x": 0.85, "y": 0.02, "w": 0.12, "h": 0.06},
      "fields": [
        {"field_id": "field_001", "region": {"x": 0.05, "y": 0.15, "w": 0.90, "h": 0.04}},
        {"field_id": "field_002", "region": {"x": 0.05, "y": 0.22, "w": 0.40, "h": 0.04}}
      ]
    }
  ]
}
```

El código QR impreso en cada página del PDF contiene el `form_id` + `version` + `page_number`, permitiendo al sistema identificar automáticamente qué formulario se está escaneando.

---

# 7. Generación de Plantillas PDF Imprimibles

## 7.1 Contenido del PDF Generado

- **Header**: Logo Control G + nombre del formulario + nombre del proyecto + versión + fecha.
- **Código QR**: En esquina superior derecha con `{form_id}:{version}:{page}`.
- **Campos renderizados**:
  - `text_short`: Etiqueta + línea horizontal para escribir.
  - `text_long`: Etiqueta + recuadro de múltiples líneas.
  - `numeric`: Etiqueta + casillas individuales para dígitos.
  - `single_select`: Etiqueta + opciones con círculos para marcar (○ Opción A ○ Opción B).
  - `multi_select`: Etiqueta + opciones con cuadros para marcar (☐ Opción A ☐ Opción B).
  - `yes_no`: Etiqueta + ○ Sí ○ No.
  - `date`: Etiqueta + casillas DD / MM / AAAA.
  - `signature`: Etiqueta + recuadro grande "FIRMA".
  - `repeating_group`: Tabla con columnas por subcampo y filas numeradas.
- **Footer**: "Control G — {organización} — Página X de Y — No alterar este documento".
- **Instrucciones**: Texto al inicio explicando cómo diligenciar (marcar con X, escribir con letra clara).

## 7.2 Tecnología

- **jsPDF** para generación del PDF.
- **html2canvas** como fallback para layouts complejos.
- El PDF se genera en el Edge Function `generate-pdf-template` de Supabase.
- Se almacena en Supabase Storage bucket `pdf-templates`.
- El técnico puede descargarlo offline desde la tab "Plantillas".

---

# 8. Integración n8n — Flujos de Automatización

n8n se ejecuta self-hosted en el VPS Contabo junto con el bot de WhatsApp. Orquesta todos los flujos de notificación, reportes y automatización del sistema.

## 8.1 Flujo: Onboarding de Nueva Organización

**Trigger**: INSERT en tabla `organizations`

1. Webhook recibe datos de la nueva organización.
2. Crear registro de suscripción con trial de 30 días.
3. Precargar departamentos y municipios disponibles.
4. Enviar email de bienvenida con guía de primeros pasos.
5. Enviar WhatsApp al contacto principal con instrucciones.
6. Programar secuencia de tips: Día 1, Día 3, Día 7.

## 8.2 Flujo: Notificación de Formulario Sincronizado

**Trigger**: INSERT en tabla `form_responses`

1. Consultar datos del formulario, técnico y zona.
2. Enviar notificación push al Asistente supervisor del técnico.
3. Actualizar contadores de avance en cache.
4. Si el formulario tiene `source = 'ocr_camera'` o `'ocr_pdf'`, marcar para revisión prioritaria.

## 8.3 Flujo: Reporte Diario de Avance (Cron 7 PM)

1. Para cada proyecto activo: consultar formularios del día.
2. Calcular métricas: total del día, por zona, por técnico, % avance vs meta.
3. Generar resumen de texto.
4. Enviar WhatsApp al Coordinador con resumen.
5. Si avance < 50% de la meta diaria: incluir alerta.

## 8.4 Flujo: Alerta de Técnico Inactivo (Cron cada 4 horas)

1. Consultar técnicos que no han sincronizado en las últimas 8 horas durante horario laboral.
2. Enviar alerta al Asistente supervisor.
3. Si supera 24 horas: escalar al Coordinador.

## 8.5 Flujo: Alerta de Calidad de Datos

**Trigger**: UPDATE en `form_responses` donde `status = 'rejected'`

1. Notificar al técnico vía push y WhatsApp sobre el rechazo.
2. Incluir motivo de rechazo y campos a corregir.
3. Si un técnico acumula >3 rechazos en un día: alertar al Asistente.

## 8.6 Flujo: Exportación Programada (Cron semanal)

1. Para proyectos con exportación automática configurada.
2. Generar Excel/CSV con datos de la semana.
3. Subir a Storage bucket `exports`.
4. Enviar link de descarga al Coordinador por email.

## 8.7 Resumen de Todos los Flujos n8n

| Flujo | Trigger | Frecuencia | Prioridad |
|---|---|---|---|
| Onboarding organización | DB Webhook (organizations INSERT) | Evento | Alta |
| Notificación formulario sincronizado | DB Webhook (form_responses INSERT) | Evento | Alta |
| Reporte diario de avance | Cron | Diario 7PM | Media |
| Alerta técnico inactivo | Cron | Cada 4 horas | Media |
| Alerta calidad datos (rechazo) | DB Webhook (form_responses UPDATE) | Evento | Alta |
| Exportación programada | Cron | Semanal | Media |
| Resumen semanal al coordinador | Cron | Lunes 8AM | Media |
| Resumen ejecutivo IA mensual | Cron | 1ro de cada mes | Baja |
| Alerta de almacenamiento bajo | Cron | Diario | Media |
| Renovación/expiración de plan | Cron | Diario | Alta |

---

# 9. Requerimientos Funcionales por Módulo

## 9.1 Autenticación y Usuarios

| ID | Requerimiento | Prioridad | Sprint |
|---|---|---|---|
| AUTH-01 | Login con email/password vía Supabase Auth | Alta | 1 |
| AUTH-02 | Registro de organización con formulario de onboarding | Alta | 1 |
| AUTH-03 | Rutas protegidas por rol (superadmin, coordinator, assistant, technician) | Alta | 1 |
| AUTH-04 | MFA obligatorio para coordinator y superadmin | Media | 4 |
| AUTH-05 | Recuperación de contraseña por email | Alta | 1 |
| AUTH-06 | Sesión persistente para técnicos (no re-login al reabrir app) | Alta | 1 |
| AUTH-07 | Invitación de usuarios por email desde el Coordinador | Alta | 2 |
| AUTH-08 | Bloqueo de cuenta tras 5 intentos fallidos | Media | 3 |

## 9.2 Form Builder (Coordinador)

| ID | Requerimiento | Prioridad | Sprint |
|---|---|---|---|
| FB-01 | Constructor visual drag-and-drop con 3 paneles | Alta | 3 |
| FB-02 | 19 tipos de campo funcionales | Alta | 3 |
| FB-03 | Panel de propiedades dinámico según campo seleccionado | Alta | 3 |
| FB-04 | Validaciones configurables (obligatoriedad, rangos, regex, cédula) | Alta | 3 |
| FB-05 | Lógica condicional (skip logic) entre campos | Alta | 3 |
| FB-06 | Organización en páginas/secciones con tabs | Alta | 3 |
| FB-07 | Grupo repetitivo funcional (min/max entradas) | Alta | 4 |
| FB-08 | Vista previa mobile en modal | Alta | 3 |
| FB-09 | Guardar como borrador | Alta | 3 |
| FB-10 | Publicar formulario (disponible para técnicos) | Alta | 3 |
| FB-11 | Generar PDF imprimible automáticamente al publicar | Alta | 5 |
| FB-12 | Versionamiento con historial y rollback | Media | 4 |
| FB-13 | Plantillas precargadas del sistema (7 plantillas) | Media | 4 |
| FB-14 | Duplicar formulario existente | Media | 4 |

## 9.3 Recolección de Datos (Técnico)

| ID | Requerimiento | Prioridad | Sprint |
|---|---|---|---|
| REC-01 | Renderizado dinámico de formularios desde schema JSONB | Alta | 4 |
| REC-02 | Todos los tipos de campo funcionales en mobile | Alta | 4 |
| REC-03 | Auto-guardado en IndexedDB tras cada campo modificado | Alta | 4 |
| REC-04 | Navegación por pasos (stepper) entre páginas | Alta | 4 |
| REC-05 | Validaciones en runtime con errores visuales | Alta | 4 |
| REC-06 | Lógica condicional en runtime | Alta | 4 |
| REC-07 | Captura de fotos (cámara nativa, múltiples, thumbnail) | Alta | 4 |
| REC-08 | Captura de video corto (máx 30 seg, preview) | Media | 4 |
| REC-09 | Firma digital (canvas táctil, limpiar, confirmar) | Alta | 4 |
| REC-10 | Geolocalización automática (GPS nativo, minimapa) | Alta | 4 |
| REC-11 | Escaneo de código QR/barras | Media | 5 |
| REC-12 | Grupo repetitivo: "+ Agregar persona", duplica campos | Alta | 4 |
| REC-13 | Botón "Finalizar y Enviar" → cola de sincronización | Alta | 4 |
| REC-14 | Funcionamiento 100% offline sin degradación | Alta | 4 |
| REC-15 | Dashboard del técnico con KPIs y avance | Alta | 4 |

## 9.4 Sincronización

| ID | Requerimiento | Prioridad | Sprint |
|---|---|---|---|
| SYNC-01 | Detección de conectividad (Network API + heartbeat) | Alta | 5 |
| SYNC-02 | Cola de sincronización con prioridades | Alta | 5 |
| SYNC-03 | Sincronización automática al detectar internet | Alta | 5 |
| SYNC-04 | Subida de multimedia (fotos, videos, firmas) a Storage | Alta | 5 |
| SYNC-05 | Confirmación con hash de integridad | Alta | 5 |
| SYNC-06 | Reintentos con backoff exponencial | Alta | 5 |
| SYNC-07 | Indicador visual permanente en barra superior | Alta | 5 |
| SYNC-08 | Sync manual desde Mi Perfil | Media | 5 |
| SYNC-09 | Descarga de actualizaciones del servidor | Alta | 5 |
| SYNC-10 | Notificación push al completar sincronización | Media | 5 |

## 9.5 OCR

| ID | Requerimiento | Prioridad | Sprint |
|---|---|---|---|
| OCR-01 | Tab "Escanear" con opciones cámara y subir PDF | Alta | 6 |
| OCR-02 | Corrección de perspectiva y mejora de imagen | Alta | 6 |
| OCR-03 | Integración Gemini Vision AI (online) | Alta | 6 |
| OCR-04 | Integración Tesseract.js (offline fallback) | Media | 6 |
| OCR-05 | Pantalla de revisión: imagen + datos extraídos | Alta | 6 |
| OCR-06 | Indicadores de confianza por campo (verde/amarillo/rojo) | Alta | 6 |
| OCR-07 | Corrección manual de campos | Alta | 6 |
| OCR-08 | Procesamiento por lotes (múltiples páginas) | Media | 7 |

## 9.6 Dashboard y Reportes (Coordinador)

| ID | Requerimiento | Prioridad | Sprint |
|---|---|---|---|
| DASH-01 | KPIs: formularios diseñados, diligenciados, técnicos activos, % avance | Alta | 7 |
| DASH-02 | Gráfica avance por zona (barras horizontales) | Alta | 7 |
| DASH-03 | Gráfica recolección diaria (líneas, 30 días) | Media | 7 |
| DASH-04 | Tabla formularios recientes con acciones | Alta | 7 |
| DASH-05 | Mapa interactivo con polígonos de zona y puntos de formularios | Alta | 7 |
| DASH-06 | Ubicación en tiempo real de técnicos conectados | Media | 7 |
| DASH-07 | Mapa de calor de cobertura | Media | 8 |
| DASH-08 | Reportes de productividad por técnico | Media | 8 |
| DASH-09 | Indicadores de calidad de datos | Media | 8 |

## 9.7 Exportación

| ID | Requerimiento | Prioridad | Sprint |
|---|---|---|---|
| EXP-01 | Exportar a Excel (.xlsx) con filtros aplicados | Alta | 8 |
| EXP-02 | Exportar a CSV | Alta | 8 |
| EXP-03 | Exportar a JSON | Media | 8 |
| EXP-04 | Exportar a PDF (reporte con gráficas) | Media | 9 |
| EXP-05 | Selección de campos a incluir | Media | 8 |
| EXP-06 | Opción de anonimizar datos personales | Media | 8 |

## 9.8 Chat y Comunicación

| ID | Requerimiento | Prioridad | Sprint |
|---|---|---|---|
| CHAT-01 | Chat directo entre usuarios del proyecto | Media | 8 |
| CHAT-02 | Canales por proyecto y por zona | Media | 8 |
| CHAT-03 | Mensajes de texto y voz | Media | 8 |
| CHAT-04 | Funciona offline (cola de mensajes) | Media | 8 |
| CHAT-05 | Indicador de no leídos | Media | 8 |

---

# 10. Roadmap de Desarrollo — Sprints del MVP

El MVP se desarrolla en 7 sprints de 2 semanas (14 semanas total). Equipo mínimo: 2 desarrolladores full-stack + 1 diseñador UI/UX.

## Sprint 1 (Sem 1-2): Fundación

| Tarea | Hrs Est. |
|---|---|
| Crear proyecto Supabase: PostgreSQL, Auth, Storage, Realtime | 4 |
| Migraciones SQL: ENUMs + todas las tablas core (secciones 3.2-3.16) | 12 |
| Configurar RLS policies en todas las tablas | 8 |
| Carga de datos DIVIPOLA (32 departamentos + 1,123 municipios) | 4 |
| Proyecto React + Vite + TypeScript + TailwindCSS + shadcn/ui | 4 |
| Configurar React Router v6 con rutas protegidas por rol | 4 |
| Auth: login, registro, recuperación de contraseña con Supabase | 8 |
| Configurar Zustand stores (auth, sync, notifications) | 4 |
| Configurar Dexie.js (IndexedDB) con todos los stores offline | 6 |
| Configurar Capacitor.js (init, plugins: camera, geolocation, network) | 4 |
| VPS Contabo: Node.js, PM2, nginx, SSL, n8n | 6 |
| Deploy frontend en Vercel (CI/CD desde GitHub) | 2 |
| Sistema de diseño: paleta, tipografía, componentes base | 8 |

## Sprint 2 (Sem 3-4): Layouts y CRUD Base

| Tarea | Hrs Est. |
|---|---|
| Layout Superadmin: sidebar completo, barra superior, responsive | 8 |
| Layout Coordinador: sidebar con todas las secciones | 8 |
| Layout Asistente: sidebar simplificado | 4 |
| Layout Técnico: **bottom navigation bar 5 tabs** (mobile-first) | 10 |
| Indicador de conexión/sincronización en barra superior (todas las vistas) | 4 |
| CRUD Organizaciones (Superadmin) | 8 |
| CRUD Usuarios (invitar, asignar rol, activar/desactivar) | 8 |
| Gestión de zonas sub-municipales (CRUD) | 6 |
| CRUD Proyectos (crear, editar, asignar zonas, asignar miembros) | 10 |
| Onboarding: formulario de registro de organización | 6 |

## Sprint 3 (Sem 5-6): Form Builder

| Tarea | Hrs Est. |
|---|---|
| Layout 3 paneles: campos (izq), canvas (centro), propiedades (der) | 10 |
| Drag & drop con dnd-kit: arrastrar campos al canvas | 12 |
| Renderizado de todos los tipos de campo básicos en canvas | 10 |
| Panel de propiedades dinámico según campo seleccionado | 8 |
| Validaciones configurables en propiedades | 6 |
| Lógica condicional (skip logic) configurable | 8 |
| Organización en páginas con tabs | 6 |
| Vista previa mobile en modal | 6 |
| Guardar borrador en Supabase (schema JSONB) | 4 |
| Publicar formulario (cambio de estado + disponible para técnicos) | 4 |

## Sprint 4 (Sem 7-8): Recolección Offline

| Tarea | Hrs Est. |
|---|---|
| Renderizador dinámico de formularios (lee schema, renderiza campos) | 14 |
| Campos multimedia: foto (cámara nativa), video, firma digital | 12 |
| Campo geolocalización: Capacitor GPS + minimapa Leaflet | 6 |
| Grupo repetitivo funcional ("+ Agregar persona") | 8 |
| Auto-guardado en IndexedDB (cada campo modificado) | 6 |
| Navegación por pasos (stepper) entre páginas del formulario | 4 |
| Validaciones en runtime con errores visuales rojos | 4 |
| Lógica condicional en runtime (mostrar/ocultar campos) | 4 |
| "Finalizar y Enviar" → estado completed → cola de sync | 4 |
| Dashboard técnico: KPIs, últimos formularios, botón iniciar | 8 |
| Tab Mi Perfil: estadísticas, historial, espacio usado | 6 |
| Versionamiento de formularios + plantillas precargadas (7) | 6 |

## Sprint 5 (Sem 9-10): Motor de Sincronización

| Tarea | Hrs Est. |
|---|---|
| Detección de conectividad (Capacitor Network + heartbeat) | 6 |
| Cola de sincronización con prioridades en IndexedDB | 8 |
| Sync automática: subida de form_responses a Supabase | 10 |
| Subida de multimedia a Supabase Storage | 8 |
| Confirmación con hash, reintentos con backoff exponencial | 6 |
| Descarga de actualizaciones del servidor | 6 |
| Indicador visual de sync en barra superior (verde/naranja/rojo) | 4 |
| Sync manual desde Mi Perfil | 2 |
| Notificación push al completar sync | 3 |
| Configurar PWA con Workbox (caché de assets, background sync) | 6 |
| Escaneo de código QR/barras (html5-qrcode) | 4 |
| Generación de PDF imprimible desde schema (jsPDF) | 8 |
| Tab "Plantillas" del técnico: lista, descargar PDF | 4 |

## Sprint 6 (Sem 11-12): OCR + Validación de Datos

| Tarea | Hrs Est. |
|---|---|
| Tab "Escanear" del técnico: UI con cámara y subir PDF | 6 |
| Pipeline de imagen: bordes, perspectiva, contraste, binarización | 10 |
| Edge Function: integración Gemini Vision AI | 8 |
| Integración Tesseract.js (WASM) como fallback offline | 6 |
| Mapeo campo-a-campo (schema → datos extraídos) | 6 |
| Pantalla de revisión OCR: imagen + datos + confianza | 8 |
| Corrección manual de campos + confirmar digitalización | 4 |
| Workflow de validación: Asistente pre-valida, Coordinador aprueba/rechaza | 8 |
| Vista "Datos Recolectados" del Coordinador con tabla, filtros, acciones | 10 |
| Vista detalle de formulario: respuestas + fotos + minimapa | 6 |

## Sprint 7 (Sem 13-14): Dashboards, Mapas, Empaquetado

| Tarea | Hrs Est. |
|---|---|
| Dashboard Superadmin: KPIs, mapa de Colombia, tabla organizaciones | 8 |
| Dashboard Coordinador: KPIs, gráficas Recharts, tabla recientes | 10 |
| Dashboard Asistente: KPIs subgrupo, lista pendientes | 6 |
| Mapa interactivo Leaflet: polígonos de zonas, puntos de formularios | 10 |
| Ubicación de técnicos en mapa (Supabase Realtime) | 4 |
| Exportación: Excel (.xlsx), CSV, JSON | 8 |
| Build APK Android con Capacitor | 4 |
| Build IPA iOS con Capacitor | 4 |
| Splash screen + app icon + branding nativo | 3 |
| Testing integral: offline, sync, OCR, responsive | 12 |
| Corrección de bugs | 10 |
| Deploy producción (Vercel + Supabase + VPS) | 4 |

---

# 11. Infraestructura, Costos y Presupuesto

## 11.1 Infraestructura de Producción

| Servicio | Proveedor | Costo/Mes (USD) |
|---|---|---|
| BD + Auth + Realtime + Storage | Supabase Pro | $25 |
| VPS para n8n + WhatsApp Bot | Contabo VPS M (6 vCPU, 16GB RAM) | $12 |
| Frontend Hosting | Vercel Pro | $20 |
| Dominio controlg.app | Namecheap | $1 (anualizado) |
| API IA OCR (Gemini Vision) | Google AI Studio (pay-per-use) | $20-50 |
| Monitoreo | Sentry Free + UptimeRobot Free | $0 |
| Email transaccional | Resend Free (3K emails/mes) | $0 |

**Total mensual:** $78 - $108 USD

## 11.2 Presupuesto Primeros 6 Meses

| Concepto | Estimado (USD) |
|---|---|
| Desarrollo MVP (14 semanas, 2-3 devs + 1 diseñador) | $10,000 - $18,000 |
| Infraestructura (6 meses) | $648 |
| Dominio + branding + identidad visual | $200 - $500 |
| Cuenta Google Play ($25) + Apple Developer ($99/año) | $124 |
| Marketing lanzamiento | $300 - $800 |
| Legal: marca, términos de servicio, habeas data | $300 - $600 |
| Contingencia (15%) | $1,700 - $3,100 |

**Total estimado 6 meses:** $13,272 - $23,772 USD

## 11.3 Escalamiento

| Hito | Organizaciones | Técnicos | Infraestructura | Costo Adicional |
|---|---|---|---|---|
| Lanzamiento | 1-10 | 1-100 | Config actual | $78-108/mes |
| Tracción | 10-30 | 100-500 | Supabase Pro upgrade | +$50/mes |
| Crecimiento | 30-100 | 500-2,000 | Supabase Team + 2do VPS | +$500/mes |
| Escala | 100-500 | 2,000-10,000 | VPS dedicado, replica BD | +$300/mes |
| Nacional | 500+ | 10,000+ | Multi-región, CDN | +$2,000/mes |

---

# 12. Métricas de Éxito (KPIs)

## 12.1 Fase MVP (Meses 1-3)

| KPI | Meta | Medición |
|---|---|---|
| Organizaciones registradas | 10 | COUNT organizations |
| Proyectos activos | 15 | projects WHERE status='active' |
| Técnicos activos (>5 formularios/semana) | 50 | Query semanal |
| Formularios recolectados/semana | 500 | form_responses count semanal |
| Tasa de sync exitosa | >95% | sync_log WHERE status='success' / total |
| Tiempo de sync (100 formularios + fotos) | <5 min en 4G | Medición de duración |
| Crash rate móvil | <1% | Sentry |
| Onboarding time (registro → primer formulario publicado) | <30 min | Medición de eventos |

## 12.2 Crecimiento (Meses 4-6)

| KPI | Meta | Medición |
|---|---|---|
| Organizaciones registradas | 30 | COUNT organizations |
| Conversión trial → pago | >30% | subscriptions activas / total |
| MRR | $5,000 USD | SUM suscripciones |
| Formularios/día (total) | 200+ | Query diaria |
| Escaneos OCR/mes | 500+ | form_responses WHERE source LIKE 'ocr%' |
| Precisión OCR promedio | >85% | AVG ocr_confidence |
| Churn mensual | <10% | Cancelaciones / total activos |

## 12.3 Expansión (Meses 7-12)

| KPI | Meta | Medición |
|---|---|---|
| Organizaciones totales | 100+ | Múltiples departamentos |
| MRR | $20,000 USD | Suscripciones |
| Técnicos activos | 2,000+ | users WHERE role='technician' AND activos |
| Formularios recolectados (acumulado) | 500,000+ | COUNT form_responses |
| Departamentos con presencia | 10+ | DISTINCT department en projects |
| Retención 6 meses | >70% | Análisis de cohortes |
| NPS | >50 | Encuesta periódica |

---

# 13. Cronograma General — 12 Meses

| Mes | Desarrollo | Go-to-Market | Meta |
|---|---|---|---|
| 1-2 | Fundación + Layouts + CRUD + Form Builder | Branding, material comercial | 0 (dev) |
| 3 | Recolección offline + Sync engine | Piloto 3 entidades en Cartagena | 3 |
| 4 | OCR + Validación + PDF imprimible + APK | Lanzamiento comercial Cartagena | 8 |
| 5 | Dashboards + Mapas + Exportación | Vendedores activos, alianzas con alcaldías | 15 |
| 6 | Chat + Auditoría + Mejoras | Expansión Bolívar y Atlántico | 30 |
| 7 | Optimización OCR + Geocercas | Inicio Barranquilla | 45 |
| 8 | Reportes avanzados + IA insights | Marketing Costa Caribe | 60 |
| 9 | Marketplace de plantillas + API pública | Alianzas ONGs y cooperación | 75 |
| 10 | White-label + Multi-idioma | Expansión Antioquia | 85 |
| 11 | Asesor IA de calidad de datos | Casos de éxito, PR | 95 |
| 12 | Auditoría avanzada + DANE export | Preparar ronda de inversión | 100+ |

## 13.1 Hitos Críticos

| Hito | Fecha | Criterio |
|---|---|---|
| MVP funcional | Semana 14 | Form Builder + Recolección offline + Sync end-to-end |
| Primer proyecto real | Mes 3 | Organización usando la plataforma diariamente |
| APK en Google Play | Mes 4 | App publicada y descargable |
| OCR funcional | Mes 4 | Escaneo → extracción → validación end-to-end |
| 30 organizaciones | Mes 6 | 30 orgs, 200+ técnicos activos |
| $5K MRR | Mes 6 | Ingresos recurrentes $5K USD |
| 100 organizaciones | Mes 12 | 100 orgs en 10+ departamentos |

---

# 14. Seguridad, Cumplimiento y Contingencia

## 14.1 Seguridad de Datos

- HTTPS/TLS 1.3 en todos los endpoints.
- Cifrado AES-256 de base de datos local en cada dispositivo.
- PostgreSQL con cifrado de disco (Supabase managed).
- Row Level Security (RLS): aislamiento total entre organizaciones.
- JWT con expiración 1h, refresh tokens con rotación.
- MFA obligatorio para coordinator y superadmin.
- Sanitización de inputs contra SQL injection y XSS.
- Rate limiting API: 100 req/min por usuario.
- Fotos, videos y firmas cifrados en tránsito y en reposo.

## 14.2 Cumplimiento Legal Colombia

- **Ley 1581/2012** (Protección de Datos Personales): política de privacidad, consentimiento informado (firma digital en formularios), derecho de eliminación.
- **Habeas Data**: procedimiento de consulta y corrección de datos personales recolectados.
- **Ley 1712/2014** (Transparencia): formatos de exportación compatibles con datos abiertos de Colombia.
- **Términos de servicio** y **política de cookies**.
- **Consentimiento informado**: cada formulario incluye texto de autorización de tratamiento de datos con firma obligatoria.

## 14.3 Plan de Contingencia

| Riesgo | Mitigación |
|---|---|
| Pérdida de datos offline | Auto-guardado continuo en IndexedDB. Datos persisten incluso si la app se cierra. |
| Fallo de sincronización | Reintentos automáticos con backoff exponencial (hasta 10 intentos). Cola persistente. |
| Dispositivo del técnico se daña/pierde | Datos sincronizados previamente están en Supabase. Datos no sincronizados se pierden (riesgo aceptado, mitigado con sync frecuente). |
| Caída de Supabase | Datos locales intactos. Sync se reanuda automáticamente al restablecer servicio. |
| Bloqueo de Gemini Vision API | Tesseract.js como fallback offline. OCR con menor precisión pero funcional. |
| Rechazo de App Store (Apple) | Cumplir guías de revisión: permisos de cámara/GPS justificados, política de privacidad visible, no uso de APIs privadas. |
| Cambio en DIVIPOLA del DANE | Actualización de datos por migración SQL, notificación a organizaciones afectadas. |

---

# 15. Conclusión y Acciones Inmediatas

Control G tiene el potencial de convertirse en la infraestructura estándar de recolección de datos territoriales en Colombia. La combinación de formularios dinámicos, operación offline-first con sincronización automática, OCR con inteligencia artificial, y una jerarquía geográfica nativa colombiana, crea un ecosistema donde la organización diseña una vez, el técnico captura en cualquier lugar, y el coordinador consolida en tiempo real.

La ejecución exitosa depende de tres factores: lanzar rápido con un MVP que demuestre el offline-first como diferencial innegable, dominar Cartagena y Bolívar primero como territorio conocido, y construir el efecto de red donde cada organización satisfecha referencia a la siguiente.

El ecosistema de DRAN DIGITAL se fortalece con Control G: los datos de caracterización alimentan las estrategias electorales de VOTOMAP, los diagnósticos agropecuarios potencian CAMGO, los mapeos comunitarios enriquecen BolívarMágico, y la infraestructura técnica compartida (Supabase, Contabo, n8n, Vercel) reduce costos de toda la compañía.

## 15.1 Acciones Semana 1

1. Crear proyecto Supabase y ejecutar migraciones SQL completas (secciones 3.2-3.16).
2. Configurar VPS Contabo con Node.js, PM2, nginx, n8n.
3. Iniciar proyecto React + Vite + TypeScript + TailwindCSS + shadcn/ui.
4. Configurar Capacitor.js con plugins (camera, geolocation, network, filesystem).
5. Configurar Dexie.js con todos los stores de IndexedDB (sección 5.2).
6. Registrar dominio controlg.app.
7. Implementar login + rutas protegidas por rol.
8. Comenzar layout del bottom navigation bar del técnico.
9. Identificar 3 organizaciones piloto en Cartagena.
10. Definir branding: logo, colores, identidad visual de Control G.

---

**CONTROL G — La plataforma de recolección de datos que funciona donde no hay internet**

DRAN DIGITAL S.A.S. — Cartagena de Indias, Colombia — 2026

*Documento confidencial. Todos los derechos reservados.*