# CONTROL G — Prompt Completo de Desarrollo

## Plataforma Inteligente de Recolección de Datos en Campo para Caracterizaciones Territoriales en Colombia

---

## ÍNDICE

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Estructura de Base de Datos](#4-estructura-de-base-de-datos)
5. [Sistema de Roles y Permisos](#5-sistema-de-roles-y-permisos)
6. [Jerarquía Geográfica](#6-jerarquía-geográfica)
7. [Módulo de Autenticación](#7-módulo-de-autenticación)
8. [Vista Superadministrador](#8-vista-superadministrador)
9. [Vista Coordinador](#9-vista-coordinador)
10. [Motor de Formularios Dinámicos (Form Builder)](#10-motor-de-formularios-dinámicos-form-builder)
11. [Vista Asistente de Coordinador](#11-vista-asistente-de-coordinador)
12. [Vista Técnico de Campo](#12-vista-técnico-de-campo)
13. [Sistema Offline-First y Sincronización](#13-sistema-offline-first-y-sincronización)
14. [Módulo OCR](#14-módulo-ocr)
15. [Generación de Plantillas PDF Imprimibles](#15-generación-de-plantillas-pdf-imprimibles)
16. [Módulo de Chat y Comunicación](#16-módulo-de-chat-y-comunicación)
17. [Dashboard Analítico y Reportes](#17-dashboard-analítico-y-reportes)
18. [Módulo de Geolocalización y Mapas](#18-módulo-de-geolocalización-y-mapas)
19. [Módulo de Exportación e Integración](#19-módulo-de-exportación-e-integración)
20. [Módulo de Auditoría](#20-módulo-de-auditoría)
21. [Seguridad y Protección de Datos](#21-seguridad-y-protección-de-datos)
22. [Diseño UI/UX y Sistema de Diseño](#22-diseño-uiux-y-sistema-de-diseño)
23. [Empaquetado Móvil (APK / iOS)](#23-empaquetado-móvil-apk--ios)
24. [Plan de Implementación Paso a Paso](#24-plan-de-implementación-paso-a-paso)
25. [Datos de Ejemplo](#25-datos-de-ejemplo)
26. [Criterios de Aceptación](#26-criterios-de-aceptación)

---

## 1. Visión General del Proyecto

### ¿Qué es Control G?

**Control G** es una plataforma web progresiva (PWA) empaquetable como aplicación nativa (Android APK e iOS IPA) diseñada para la recolección, gestión y análisis de datos en campo durante procesos de caracterización territorial en Colombia.

### Problema que resuelve

Los procesos de caracterización territorial en Colombia se ejecutan en zonas rurales, corregimientos y barrios periféricos donde la conectividad a internet es inexistente o intermitente. Los técnicos usan formularios en papel que se digitan manualmente, generando errores, demoras y pérdida de información. Los coordinadores no tienen visibilidad del avance en tiempo real.

### Propuesta de valor

- **Offline-first**: Funciona completamente sin internet. Los datos se almacenan localmente y se sincronizan automáticamente cuando se detecta conectividad.
- **Formularios dinámicos**: El coordinador diseña formularios personalizados con un constructor visual drag-and-drop sin necesidad de programación.
- **OCR integrado**: Digitaliza formularios diligenciados a mano en papel mediante inteligencia artificial.
- **Plantillas imprimibles**: Los formularios digitales generan automáticamente una versión PDF descargable para imprimir y llenar a mano.
- **Captura multimedia offline**: Fotos y videos cortos se capturan sin conexión y se suben automáticamente a la nube.
- **Jerarquía geográfica colombiana nativa**: Departamentos, municipios, corregimientos, veredas, barrios alineados con DIVIPOLA del DANE.
- **4 roles operativos**: Superadministrador, Coordinador, Asistente de Coordinador y Técnico de Campo.

### Propiedad

- **Empresa**: DRAN DIGITAL S.A.S.
- **NIT**: 901.359.114
- **Sede**: Cartagena de Indias, Colombia

---

## 2. Stack Tecnológico

### Frontend

| Componente | Tecnología | Justificación |
|---|---|---|
| Framework | React 18+ con Vite | Rendimiento, ecosistema maduro, hot reload |
| Lenguaje | TypeScript estricto | Tipado estático, menos bugs en producción |
| Estado global | Zustand | Ligero, compatible con persistencia offline |
| Estilos | Tailwind CSS 3+ | Utility-first, responsive, diseño consistente |
| Componentes UI | shadcn/ui + Radix UI | Accesibles, personalizables, profesionales |
| Iconos | Lucide React | Consistentes, ligeros, amplio catálogo |
| Formularios | React Hook Form + Zod | Validación tipada, rendimiento |
| Drag and Drop | dnd-kit | Form Builder, reordenamiento de campos |
| Gráficas | Recharts | Dashboards, reportes |
| Mapas | Leaflet + React Leaflet | Mapas offline con tiles descargables |
| Animaciones | Framer Motion | Transiciones, micro-interacciones |
| Router | React Router v6 | Navegación SPA, rutas protegidas por rol |
| PWA | Workbox (vite-plugin-pwa) | Service Worker, caché, background sync |
| PDF | jsPDF + html2canvas | Generación de plantillas imprimibles |
| QR/Barcode | html5-qrcode | Escaneo de códigos |
| Firma digital | react-signature-canvas | Pad de firma táctil |

### Backend (BaaS)

| Componente | Tecnología | Justificación |
|---|---|---|
| Base de datos | Supabase (PostgreSQL) | Auth, Realtime, Storage, Row Level Security |
| Autenticación | Supabase Auth | JWT, MFA, OAuth, email/password |
| Storage | Supabase Storage | Fotos, videos, documentos, backups |
| Realtime | Supabase Realtime | Suscripciones en vivo para dashboards |
| Edge Functions | Supabase Edge Functions (Deno) | Lógica servidor: OCR, reportes, webhooks |

### Base de Datos Local (Offline)

| Componente | Tecnología | Justificación |
|---|---|---|
| Storage local | IndexedDB vía Dexie.js | Almacenamiento estructurado offline robusto |
| Sync engine | Custom (TypeScript) | Control total del flujo de sincronización |
| Caché de assets | Workbox | Service Worker para recursos estáticos |
| Tiles de mapa offline | leaflet-offline | Descarga y caché de tiles de mapa |

### OCR

| Componente | Tecnología | Justificación |
|---|---|---|
| OCR online (principal) | Google Gemini Vision AI | Alta precisión en manuscrita, multimodal |
| OCR offline (fallback) | Tesseract.js (WASM) | Procesamiento sin conexión en el dispositivo |

### Empaquetado Móvil

| Componente | Tecnología | Justificación |
|---|---|---|
| Bridge nativo | Capacitor.js 5+ | PWA → APK (Android) / IPA (iOS) |
| Cámara | @capacitor/camera | Acceso nativo a cámara |
| Geolocalización | @capacitor/geolocation | GPS nativo de alta precisión |
| Filesystem | @capacitor/filesystem | Almacenamiento de archivos locales |
| Network | @capacitor/network | Detección de estado de red |
| Push notifications | @capacitor/push-notifications | Notificaciones nativas |
| Splash screen | @capacitor/splash-screen | Pantalla de carga nativa |
| Status bar | @capacitor/status-bar | Control de barra de estado |
| App | @capacitor/app | Ciclo de vida de la app |

### Infraestructura

| Componente | Tecnología | Justificación |
|---|---|---|
| Hosting frontend | Vercel | CDN global, deploy automático desde Git |
| Hosting backend | Supabase Cloud (o self-hosted en Contabo VPS + Dokploy) | Flexibilidad |
| Automatización | n8n (self-hosted) | Workflows, alertas, integraciones |
| WhatsApp Bot | Baileys + PM2 en Contabo VPS | Notificaciones vía WhatsApp |
| Dominio | controlg.app (o similar) | Identidad de producto |

---

## 3. Arquitectura del Sistema

### Diagrama de arquitectura de alto nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (PWA / App Nativa)               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  React + TS  │  │  Zustand     │  │  IndexedDB         │    │
│  │  (Vite)      │  │  (Estado)    │  │  (Dexie.js)        │    │
│  └──────┬───────┘  └──────┬───────┘  │  - Formularios     │    │
│         │                 │          │  - Respuestas       │    │
│  ┌──────┴─────────────────┴───┐      │  - Fotos/Videos    │    │
│  │      Service Worker        │      │  - Cola de sync    │    │
│  │      (Workbox)             │◄────►│  - Tiles de mapa   │    │
│  └──────────┬─────────────────┘      └────────────────────┘    │
│             │                                                   │
│  ┌──────────┴─────────────────┐                                │
│  │   Capacitor.js Bridge      │                                │
│  │   (Cámara, GPS, Network,   │                                │
│  │    Filesystem, Push)        │                                │
│  └──────────┬─────────────────┘                                │
└─────────────┼──────────────────────────────────────────────────┘
              │ HTTPS / TLS 1.3
              │ (Solo cuando hay conexión)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE CLOUD                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Auth        │  │  PostgreSQL  │  │  Storage            │    │
│  │  (JWT, MFA)  │  │  (RLS)       │  │  (Fotos, Videos,   │    │
│  └──────────────┘  └──────────────┘  │   PDFs, Archivos)  │    │
│                                      └────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  Realtime    │  │  Edge Fns    │                            │
│  │  (WebSocket) │  │  (Deno)      │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Gemini      │  │  n8n         │  │  WhatsApp Bot      │    │
│  │  Vision AI   │  │  (Workflows) │  │  (Baileys + PM2)   │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo offline-first

```
TÉCNICO EN CAMPO (SIN INTERNET)
        │
        ▼
[Diligencia formulario] → [Auto-guardado en IndexedDB]
[Toma fotos/videos]     → [Almacena en IndexedDB/Filesystem]
[Captura GPS]           → [Guarda coordenadas locales]
        │
        ▼
[Cola de sincronización local]
        │
        │  ← Detección automática de conectividad
        │     (Network API + heartbeat propio)
        ▼
CUANDO DETECTA INTERNET:
        │
        ▼
[Sync engine activa] → [Comprime datos (gzip)]
        │              → [Sube por lotes ordenados cronológicamente]
        │              → [Cada lote confirmado con hash de integridad]
        │              → [Estado local → "sincronizado"]
        ▼
[Descarga actualizaciones] → [Nuevos formularios]
                           → [Asignaciones de zona]
                           → [Mensajes del coordinador]
```

---

## 4. Estructura de Base de Datos

### Tablas principales en Supabase (PostgreSQL)

```sql
-- ══════════════════════════════════════
-- ORGANIZACIONES Y USUARIOS
-- ══════════════════════════════════════

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nit TEXT UNIQUE,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise', 'gobierno')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  max_users INTEGER DEFAULT 10,
  max_forms INTEGER DEFAULT 5,
  max_ocr_monthly INTEGER DEFAULT 100,
  max_storage_gb INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'coordinator', 'assistant', 'technician')),
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_seen_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- JERARQUÍA GEOGRÁFICA (DIVIPOLA)
-- ══════════════════════════════════════

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- Código DANE
  name TEXT NOT NULL
);

CREATE TABLE municipalities (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id),
  code TEXT UNIQUE NOT NULL, -- Código DANE
  name TEXT NOT NULL
);

CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id INTEGER REFERENCES municipalities(id),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('localidad', 'comuna', 'corregimiento', 'vereda', 'barrio', 'sector', 'manzana', 'custom')),
  parent_zone_id UUID REFERENCES zones(id), -- Jerarquía sub-municipal
  polygon JSONB, -- GeoJSON del polígono de la zona
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- PROYECTOS
-- ══════════════════════════════════════

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  coordinator_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('socioeconomica', 'conectividad', 'servicios_publicos', 'censo', 'electoral', 'vivienda', 'agropecuario', 'personalizada')),
  department_id INTEGER REFERENCES departments(id),
  municipality_id INTEGER REFERENCES municipalities(id),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id),
  target_forms INTEGER DEFAULT 0 -- Meta de formularios para esta zona
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  assigned_zone_id UUID REFERENCES zones(id),
  supervisor_id UUID REFERENCES users(id), -- Para técnicos: su asistente supervisor
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- FORMULARIOS DINÁMICOS
-- ══════════════════════════════════════

CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  created_by UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  schema JSONB NOT NULL, -- Definición completa del formulario (campos, secciones, validaciones, lógica condicional)
  printable_pdf_url TEXT, -- URL del PDF generado para imprimir
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  schema JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id), -- NULL = plantilla global del sistema
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  schema JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false, -- Plantillas precargadas por Control G
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- RESPUESTAS / DATOS RECOLECTADOS
-- ══════════════════════════════════════

CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id),
  project_id UUID REFERENCES projects(id),
  technician_id UUID REFERENCES users(id),
  zone_id UUID REFERENCES zones(id),
  local_id TEXT NOT NULL, -- ID generado offline en el dispositivo
  data JSONB NOT NULL, -- Todas las respuestas del formulario
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION, -- Precisión GPS en metros
  status TEXT DEFAULT 'synced' CHECK (status IN ('synced', 'in_review', 'validated', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  device_info JSONB, -- {model, os, app_version, screen_size}
  source TEXT DEFAULT 'digital' CHECK (source IN ('digital', 'ocr_camera', 'ocr_pdf')),
  ocr_confidence DOUBLE PRECISION, -- Promedio de confianza OCR (0-1)
  started_at TIMESTAMPTZ, -- Cuando el técnico inició el formulario
  completed_at TIMESTAMPTZ, -- Cuando lo finalizó
  synced_at TIMESTAMPTZ, -- Cuando se sincronizó con la nube
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_response_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL, -- Clave del campo en el schema
  media_type TEXT CHECK (media_type IN ('photo', 'video', 'signature', 'document', 'ocr_scan')),
  storage_path TEXT NOT NULL, -- Ruta en Supabase Storage
  file_size INTEGER,
  mime_type TEXT,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- CHAT Y COMUNICACIÓN
-- ══════════════════════════════════════

CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  zone_id UUID REFERENCES zones(id),
  name TEXT,
  type TEXT CHECK (type IN ('direct', 'project', 'zone', 'group')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'document', 'system')),
  media_url TEXT,
  local_id TEXT, -- ID offline para sincronización
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- AUDITORÍA
-- ══════════════════════════════════════

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'form.created', 'response.synced', 'user.login', etc.
  entity_type TEXT, -- 'form', 'response', 'user', 'project', etc.
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- NOTIFICACIONES
-- ══════════════════════════════════════

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT,
  type TEXT CHECK (type IN ('assignment', 'approval', 'rejection', 'message', 'sync', 'system', 'alert')),
  data JSONB, -- Datos adicionales para deep linking
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════
-- SINCRONIZACIÓN
-- ══════════════════════════════════════

CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  device_id TEXT,
  records_uploaded INTEGER DEFAULT 0,
  records_downloaded INTEGER DEFAULT 0,
  media_uploaded INTEGER DEFAULT 0,
  bytes_transferred BIGINT DEFAULT 0,
  duration_ms INTEGER,
  status TEXT CHECK (status IN ('success', 'partial', 'failed')),
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Estructura del schema JSONB de formularios

```json
{
  "pages": [
    {
      "id": "page_1",
      "title": "Datos del Hogar",
      "fields": [
        {
          "id": "field_001",
          "type": "text_short",
          "label": "Nombre completo del jefe de hogar",
          "placeholder": "Ingrese nombre y apellidos",
          "required": true,
          "validations": {
            "min_length": 3,
            "max_length": 100
          }
        },
        {
          "id": "field_002",
          "type": "numeric",
          "label": "Número de personas en el hogar",
          "required": true,
          "validations": {
            "min": 1,
            "max": 30
          }
        },
        {
          "id": "field_003",
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
          ]
        },
        {
          "id": "field_004",
          "type": "yes_no",
          "label": "¿Tiene acceso a internet en el hogar?",
          "required": true
        },
        {
          "id": "field_005",
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
          "conditional": {
            "field_id": "field_004",
            "operator": "equals",
            "value": true
          }
        },
        {
          "id": "field_006",
          "type": "multi_select",
          "label": "Servicios públicos con los que cuenta",
          "required": true,
          "options": [
            {"value": "agua", "label": "Agua potable"},
            {"value": "alcantarillado", "label": "Alcantarillado"},
            {"value": "energia", "label": "Energía eléctrica"},
            {"value": "gas", "label": "Gas natural"},
            {"value": "aseo", "label": "Recolección de basuras"}
          ]
        },
        {
          "id": "field_007",
          "type": "photo",
          "label": "Foto de la fachada de la vivienda",
          "required": false,
          "max_photos": 3
        },
        {
          "id": "field_008",
          "type": "geolocation",
          "label": "Ubicación del predio",
          "required": true,
          "auto_capture": true
        },
        {
          "id": "field_009",
          "type": "repeating_group",
          "label": "Miembros del hogar",
          "min_entries": 1,
          "max_entries": 20,
          "fields": [
            {
              "id": "field_009_name",
              "type": "text_short",
              "label": "Nombre completo",
              "required": true
            },
            {
              "id": "field_009_id",
              "type": "text_short",
              "label": "Número de cédula",
              "required": false,
              "validations": {"pattern": "^[0-9]{6,10}$"}
            },
            {
              "id": "field_009_age",
              "type": "numeric",
              "label": "Edad",
              "required": true,
              "validations": {"min": 0, "max": 120}
            },
            {
              "id": "field_009_gender",
              "type": "single_select",
              "label": "Sexo",
              "required": true,
              "options": [
                {"value": "M", "label": "Masculino"},
                {"value": "F", "label": "Femenino"},
                {"value": "O", "label": "Otro"}
              ]
            }
          ]
        },
        {
          "id": "field_010",
          "type": "signature",
          "label": "Firma del encuestado",
          "required": true
        }
      ]
    }
  ]
}
```

### Tipos de campo soportados

| type | Descripción | Renderizado |
|---|---|---|
| `text_short` | Texto corto (máx 255 chars) | Input text |
| `text_long` | Texto largo | Textarea |
| `numeric` | Número con rango | Input number |
| `single_select` | Selección única | Radio buttons o dropdown |
| `multi_select` | Selección múltiple | Checkboxes |
| `yes_no` | Booleano | Toggle switch |
| `date` | Fecha | Datepicker nativo |
| `time` | Hora | Timepicker nativo |
| `likert` | Escala numérica | Slider o botones 1-5 / 1-10 |
| `geolocation` | Coordenadas GPS | Botón captura + minimapa |
| `photo` | Fotografía | Botón cámara + thumbnail |
| `video` | Video corto (máx 30s) | Botón grabar + preview |
| `signature` | Firma digital | Canvas táctil |
| `file` | Archivo adjunto | Selector de archivos |
| `barcode_qr` | Código barras/QR | Cámara con overlay scanner |
| `repeating_group` | Grupo que se repite N veces | Sección con + Agregar |
| `calculated` | Campo calculado | Solo lectura con fórmula |
| `matrix` | Tabla preguntas vs opciones | Grid interactivo |
| `section_title` | Título de sección | Solo visual, separador |

---

## 5. Sistema de Roles y Permisos

### Roles

| Rol | Código | Descripción |
|---|---|---|
| Superadministrador | `superadmin` | Operador de la plataforma (DRAN DIGITAL). Acceso total a todas las organizaciones. |
| Coordinador | `coordinator` | Líder operativo. Diseña formularios, crea proyectos, gestiona equipo, valida datos. |
| Asistente de Coordinador | `assistant` | Apoya supervisión de un subgrupo de técnicos, pre-valida datos, reporta novedades. |
| Técnico de Campo | `technician` | Recolector de datos en terreno. Diligencia formularios, escanea documentos, opera offline. |

### Matriz de permisos

| Permiso | SuperAdmin | Coordinador | Asistente | Técnico |
|---|---|---|---|---|
| Gestionar organizaciones | ✅ | ❌ | ❌ | ❌ |
| Gestionar planes/licencias | ✅ | ❌ | ❌ | ❌ |
| Gestionar DIVIPOLA global | ✅ | ❌ | ❌ | ❌ |
| Auditoría global | ✅ | ❌ | ❌ | ❌ |
| Crear proyectos | ✅ | ✅ | ❌ | ❌ |
| Diseñar formularios | ✅ | ✅ | ❌ | ❌ |
| Publicar formularios | ✅ | ✅ | ❌ | ❌ |
| Generar PDF imprimible | ✅ | ✅ | ❌ | ❌ |
| Invitar usuarios | ✅ | ✅ | ❌ | ❌ |
| Asignar zonas | ✅ | ✅ | Parcial (su subgrupo) | ❌ |
| Ver dashboard analítico | ✅ | ✅ | Parcial (su subgrupo) | ❌ |
| Exportar datos | ✅ | ✅ | ❌ | ❌ |
| Validar/aprobar formularios | ✅ | ✅ | ✅ (pre-validar) | ❌ |
| Diligenciar formularios | ❌ | ❌ | ❌ | ✅ |
| Capturar fotos/videos | ❌ | ❌ | ❌ | ✅ |
| Escaneo OCR | ✅ | ✅ | ✅ | ✅ |
| Descargar plantillas PDF | ✅ | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ | ✅ |
| Ver geolocalización equipo | ✅ | ✅ | ✅ (su subgrupo) | ❌ |
| Ver su propio avance | — | — | — | ✅ |

---

## 6. Jerarquía Geográfica

### Niveles (alineados con DIVIPOLA del DANE)

```
Nivel 1: Departamento (32 en Colombia) — Código DANE
  └── Nivel 2: Municipio (1.123 en Colombia) — Código DANE
        └── Nivel 3: Localidad / Comuna — Fuente: POT Municipal
              └── Nivel 4: Corregimiento / Vereda — Fuente: DIVIPOLA / Alcaldía
                    └── Nivel 5: Barrio — Fuente: Alcaldía / Comunidad
                          └── Nivel 6: Sector / Manzana — Fuente: Planeación / IGAC
```

### Funcionalidades geográficas

- Carga masiva de base DIVIPOLA (departamentos y municipios con códigos DANE precargados).
- Gestión de zonas sub-municipales personalizables por proyecto.
- Delimitación de polígonos geográficos en mapa para definir zonas de trabajo.
- Geocercas opcionales para validar que el técnico esté en su zona al diligenciar.
- Cada respuesta de formulario queda vinculada a coordenadas GPS exactas y a toda la cadena jerárquica geográfica.

---

## 7. Módulo de Autenticación

### Pantalla de Login

- Logo "Control G" centrado con ícono de formulario/mapa estilizado.
- Subtítulo: "Plataforma de Caracterización Territorial".
- Campos: email y contraseña.
- Botón "Iniciar Sesión" en azul primario.
- Enlace "¿Olvidaste tu contraseña?" (flujo de recuperación por email).
- Footer: "Powered by DRAN DIGITAL S.A.S."
- Fondo con patrón sutil de mapa de Colombia en marca de agua.
- Después del login, redirección automática al dashboard del rol del usuario.

### Seguridad de autenticación

- Supabase Auth con email/password.
- MFA obligatorio para Superadmin y Coordinador.
- Tokens JWT con expiración configurable y refresh automático.
- Sesión persistente para técnicos (no requiere login cada vez que abre la app).
- Bloqueo de cuenta tras 5 intentos fallidos.

---

## 8. Vista Superadministrador

### Navegación (Sidebar izquierdo, oscuro #1A5276)

- Dashboard
- Organizaciones
- Usuarios
- Geografía (DIVIPOLA)
- Proyectos (global)
- Auditoría
- Planes y Licencias
- Configuración

### Dashboard

- Barra superior: "Super Admin" + notificaciones + indicador de sistema.
- 4 tarjetas KPI: Organizaciones activas, Proyectos en curso, Usuarios totales, Formularios recolectados globalmente.
- Gráfica de barras: "Formularios recolectados por mes" (últimos 6 meses).
- Mapa de Colombia interactivo con puntos de calor de actividad por departamento.
- Tabla: "Organizaciones Recientes" (nombre, plan, usuarios, proyectos activos, estado).

### Pantalla Organizaciones

- Listado con: nombre, NIT, plan, usuarios, proyectos, estado (activo/suspendido).
- Botón "Nueva Organización" con modal de creación.
- Filtros por plan y estado.

### Pantalla Geografía (DIVIPOLA)

- Árbol jerárquico navegable: Departamento > Municipio > Zona.
- Funcionalidad para agregar zonas sub-municipales personalizadas.
- Datos precargados de Bolívar > Cartagena > barrios de ejemplo.

### Pantalla Auditoría

- Log de eventos con filtros por organización, usuario, acción, fecha.
- Columnas: Timestamp, Usuario, Organización, Acción, Detalle, Dispositivo.

### Pantalla Planes y Licencias

- Tabla: Starter ($490K COP), Professional ($1.49M COP), Enterprise ($3.99M COP), Gobierno (cotización).
- Métricas de uso vs. límites por organización.

---

## 9. Vista Coordinador

### Navegación (Sidebar izquierdo azul oscuro)

- Dashboard
- Mis Proyectos
- Form Builder
- Plantillas
- Equipo
- Mapa de Campo
- Datos Recolectados
- Reportes
- Exportar
- Chat
- Configuración

### Dashboard

- 6 tarjetas KPI: Formularios diseñados, Formularios diligenciados, Técnicos activos, Asistentes activos, % Avance general, Pendientes de validación.
- Gráfica de líneas: recolección diaria (últimos 30 días).
- Gráfica de barras horizontal: avance por zona.
- Tabla: últimos formularios recibidos (ID, técnico, zona, formulario, fecha, estado).

### Mis Proyectos

- Tarjetas de proyectos: nombre, departamento, municipio, zonas, barra de progreso circular, técnicos, fechas.
- Botón "Crear Nuevo Proyecto": nombre, tipo de caracterización, departamento, municipio, zonas, fechas, descripción.

### Equipo

- Tabla: foto, nombre, rol, zona asignada, formularios completados, última sincronización, estado (activo/inactivo/en campo).
- Indicadores: verde = online sincronizado, naranja = online con pendientes, gris = offline.
- Botón "Invitar miembro": nombre, email, rol, zona.

### Datos Recolectados

- Tabla con filtros: zona, técnico, formulario, fecha, estado.
- Acciones: ver detalle, validar, rechazar, editar.
- Vista detalle: respuestas campo por campo, fotos, adjuntos, minimapa, datos del técnico, timestamp, dispositivo.
- Indicadores de calidad: campos vacíos, inconsistencias.

---

## 10. Motor de Formularios Dinámicos (Form Builder)

### Layout de tres paneles

**Panel izquierdo (250px) — "Tipos de Campo":**

Lista de campos arrastrables organizados por categorías:

- **Básicos**: Texto corto, Texto largo, Numérico, Selección única, Selección múltiple, Sí/No
- **Fecha y Hora**: Fecha, Hora
- **Escalas**: Escala Likert
- **Multimedia**: Fotografía, Video corto, Firma digital, Archivo adjunto
- **Ubicación**: Geolocalización, Código de barras/QR
- **Avanzados**: Grupo repetitivo, Cálculo automático, Matriz/Grid
- **Estructura**: Separador/Título de sección

Cada campo tiene ícono descriptivo y al arrastrar muestra ghost preview.

**Panel central — Canvas del formulario:**

- Área de drop donde se organizan los campos.
- Tabs superiores para páginas: "Página 1", "Página 2", botón "+" para agregar página.
- Cada campo colocado muestra: nombre (editable inline), tipo (ícono), asterisco de obligatorio, botón configurar (engranaje), botón eliminar (X), handle de drag para reordenar.
- Indicador visual de secciones/separadores.
- Preview en tiempo real del formulario.

**Panel derecho (300px) — "Propiedades del campo seleccionado":**

- Nombre/etiqueta del campo.
- Texto de ayuda/descripción.
- Placeholder.
- Toggle obligatorio.
- Validaciones según tipo:
  - Texto: min/max caracteres, regex, formato cédula colombiana.
  - Numérico: min/max valor.
  - Selección: lista de opciones editables (agregar, reordenar, eliminar).
  - Grupo repetitivo: min/max repeticiones.
- Lógica condicional (skip logic): "Mostrar este campo SI [campo X] [operador] [valor]".
  - Operadores: equals, not_equals, greater_than, less_than, contains, is_empty, is_not_empty.

**Barra de acciones superior:**

- "Vista previa" — Modal con preview mobile del formulario.
- "Guardar borrador"
- "Publicar formulario" — Disponible para técnicos.
- "Generar PDF imprimible" — Descarga versión para imprimir.
- "Historial de versiones" — Lista de versiones con rollback.

### Plantillas precargadas

| Nombre | Categoría | Campos |
|---|---|---|
| Caracterización Socioeconómica | Socioeconómica | Composición familiar, ingresos, NBI, estrato, salud |
| Diagnóstico de Conectividad | Conectividad | Acceso internet, tipo conexión, dispositivos, uso TIC |
| Servicios Públicos Domiciliarios | Infraestructura | Agua, alcantarillado, energía, gas, aseo |
| Censo Comunitario | Demográfica | Datos demográficos, migraciones, discapacidad, etnias |
| Evaluación de Vivienda | Vivienda | Materiales, estado, riesgos, hacinamiento |
| Encuesta Electoral | Electoral | Intención de voto, líderes, base electoral |
| Diagnóstico Agropecuario | Agropecuario | Cultivos, extensión, producción, necesidades |

---

## 11. Vista Asistente de Coordinador

### Navegación (Sidebar simplificado)

- Dashboard
- Mis Técnicos
- Revisión de Formularios
- Mapa de Campo
- Chat
- Novedades

### Dashboard

- 4 tarjetas KPI: Técnicos a cargo, Formularios pendientes de revisión, Formularios aprobados hoy, Técnicos en campo ahora.
- Tabla: técnicos supervisados (nombre, zona, formularios hoy, última sync, estado).
- Lista: formularios pendientes de revisión.

### Revisión de Formularios

- Lista de formularios enviados por técnicos del subgrupo.
- Al abrir: vista completa de respuestas con acciones: Aprobar, Marcar observaciones (campo por campo), Rechazar (motivo obligatorio).
- Indicadores de confianza para campos OCR.

### Novedades

- Formulario para reportar incidencias al Coordinador.
- Historial de novedades con estado (pendiente/resuelta).

---

## 12. Vista Técnico de Campo

### ESTA ES LA VISTA MÁS CRÍTICA. 100% mobile-first.

### Navegación: Bottom Navigation Bar (SIEMPRE visible abajo)

5 tabs con íconos y texto corto, estilo app nativa:

| Tab | Ícono | Label |
|---|---|---|
| 1 | Home (casa) | Inicio |
| 2 | ClipboardList (formulario) | Formularios |
| 3 | Camera (cámara) — **botón central destacado, más grande, con fondo de color acento** | Escanear |
| 4 | FileDown (descarga) | Plantillas |
| 5 | User (persona) | Mi Perfil |

### Indicador de conexión PERMANENTE (barra superior, TODAS las pantallas)

Siempre visible:
- ☁️ ✅ Verde: "Sincronizado" — todo en la nube.
- ☁️ 🔄 Naranja: "Sincronizando..." + barra de progreso.
- ☁️ ❌ Rojo + número: "Sin conexión (12 pendientes)" — formularios en cola.

### Tab 1 — Inicio

- Saludo: "Hola, [nombre]".
- Tarjeta de proyecto activo con zona asignada.
- Grid 2x2 de métricas: Formularios asignados, Completados hoy, Pendientes de sync, Mi avance (%).
- Botón grande: "Iniciar nuevo formulario".
- Lista "Últimos formularios" (5 recientes con estado de sync).
- Notificaciones recientes.

### Tab 2 — Formularios

- Lista de formularios asignados para la zona.
- Cada formulario: nombre, descripción, número de campos, botón "Iniciar".

**Pantalla de diligenciamiento (al tocar "Iniciar"):**

- Barra superior: nombre del formulario, indicador conexión, botón "Guardar borrador".
- Navegación por pasos: stepper "Paso 1 de 4" o tabs de secciones.
- Campos renderizados según tipo (ver tabla de tipos de campo).
- Grupo repetitivo: sección con botón "+ Agregar persona" que duplica campos.
- Validaciones en rojo debajo de cada campo con error.
- Indicador de auto-guardado: "Guardado automáticamente ✓".
- Fotos y videos se capturan y almacenan localmente sin importar la conexión.
- Al final: botón "Finalizar y Enviar" → cola de sincronización.

### Tab 3 — Escanear (Módulo OCR)

Dos opciones grandes con íconos visuales:

**Opción A: "Abrir Cámara"** (ícono de cámara grande)
- Abre cámara con overlay de guía de bordes.
- Captura foto del formulario en papel.
- Corrección de perspectiva + mejora de contraste automática.

**Opción B: "Subir PDF Escaneado"** (ícono de documento grande)
- Selector de archivos (PDF e imágenes).

**Pantalla de Revisión OCR (después de captura):**
- Arriba: imagen original del formulario escaneado.
- Abajo: datos extraídos campo por campo (editable).
- Cada campo: valor detectado + indicador de confianza (verde >90%, amarillo 70-90%, rojo <70%).
- Campos con baja confianza resaltados para revisión.
- Botón "Confirmar digitalización" → integra al flujo normal.
- Botón "Volver a escanear".
- Procesamiento por lotes: escanear múltiples páginas de un solo formulario.

### Tab 4 — Plantillas

- Lista de formularios disponibles en el proyecto.
- Cada formulario: nombre, descripción, páginas.
- Botón "Descargar PDF" por cada uno → PDF formateado para imprimir y llenar a mano.
- El PDF tiene: logo Control G, nombre formulario, campos con líneas, casillas, espacios para firma.
- Indicador de plantillas ya descargadas (disponibles offline).

### Tab 5 — Mi Perfil

- Info: nombre, foto, zona, proyecto.
- Estadísticas: formularios total, promedio/día, racha.
- Sincronización: estado de cola, lista de pendientes, botón sync manual, espacio usado.
- Historial: todos los formularios con fecha, zona, estado sync.
- Botón "Cerrar sesión".

---

## 13. Sistema Offline-First y Sincronización

### Principios

1. **Local-first**: Los datos se almacenan primero en IndexedDB (Dexie.js). La nube es réplica.
2. **Auto-guardado continuo**: Cada campo modificado se persiste inmediatamente en local.
3. **Detección inteligente de conectividad**: Network API de Capacitor + heartbeat HTTP propio cada 30 segundos.
4. **Sincronización automática**: Cuando detecta internet, la cola se activa sin intervención del usuario.
5. **Sincronización diferencial**: Solo registros nuevos o modificados. Datos comprimidos (gzip).
6. **Resolución de conflictos**: Last-write-wins con log de versión descartada.

### Estructura IndexedDB (Dexie.js)

```typescript
import Dexie, { Table } from 'dexie';

interface LocalFormResponse {
  localId: string;           // UUID generado offline
  formId: string;
  projectId: string;
  zoneId: string;
  data: Record<string, any>; // Respuestas del formulario
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  status: 'draft' | 'completed' | 'syncing' | 'synced' | 'error';
  source: 'digital' | 'ocr_camera' | 'ocr_pdf';
  ocrConfidence?: number;
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
  blob: Blob;              // Datos binarios del archivo
  mimeType: string;
  fileSize: number;
  synced: boolean;
  createdAt: string;
}

interface SyncQueueItem {
  id: string;
  type: 'response' | 'media' | 'message';
  entityLocalId: string;
  priority: number;         // 1 = alta, 5 = baja
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'syncing' | 'failed';
  createdAt: string;
}

interface CachedForm {
  id: string;
  projectId: string;
  name: string;
  schema: Record<string, any>;
  version: number;
  printablePdfBlob?: Blob;
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

class ControlGDatabase extends Dexie {
  formResponses!: Table<LocalFormResponse>;
  media!: Table<LocalMedia>;
  syncQueue!: Table<SyncQueueItem>;
  cachedForms!: Table<CachedForm>;
  cachedMessages!: Table<CachedMessage>;

  constructor() {
    super('ControlGDB');
    this.version(1).stores({
      formResponses: 'localId, formId, projectId, zoneId, status, createdAt',
      media: 'localId, responseLocalId, synced',
      syncQueue: 'id, type, status, priority, createdAt',
      cachedForms: 'id, projectId',
      cachedMessages: 'localId, channelId, synced',
    });
  }
}

export const db = new ControlGDatabase();
```

### Indicadores de estado de sincronización (UI)

| Estado | Ícono | Color | Texto |
|---|---|---|---|
| Todo sincronizado | Nube + check | Verde #27AE60 | "Sincronizado" |
| Sincronizando | Nube + flecha | Naranja #F39C12 | "Sincronizando..." + barra progreso |
| Sin conexión | Nube + X + badge | Rojo #E74C3C | "Sin conexión (N pendientes)" |

---

## 14. Módulo OCR

### Motor OCR dual

- **Online (principal)**: Gemini Vision AI de Google → alta precisión en manuscrita.
- **Offline (fallback)**: Tesseract.js compilado en WebAssembly → procesamiento sin conexión.

### Flujo de digitalización

1. Técnico captura foto del formulario en papel (cámara) o sube PDF escaneado.
2. La app detecta bordes del documento y aplica corrección de perspectiva.
3. Se mejora la imagen (contraste, nitidez, eliminación de sombras).
4. El motor OCR procesa la imagen y extrae texto de cada campo.
5. Se presenta la transcripción con indicadores de confianza por campo.
6. El usuario valida, corrige y confirma.
7. Los datos se integran al flujo normal (IndexedDB → cola de sync).

### Registro de plantillas

Los formularios publicados desde el Form Builder generan automáticamente un "mapa de referencia" que el motor OCR usa para identificar campos en la versión impresa.

---

## 15. Generación de Plantillas PDF Imprimibles

### Funcionalidad

Cuando el coordinador publica un formulario, el sistema genera automáticamente un PDF descargable formateado para imprimir y llenar a mano.

### Contenido del PDF

- Logo de Control G en header.
- Nombre del formulario y proyecto.
- Fecha de generación y versión.
- Campos renderizados con: etiqueta, líneas para escribir (texto), casillas de verificación (selección), espacios para firma, instrucciones.
- Código QR con ID del formulario para facilitar el mapeo OCR.
- Numeración de páginas.
- Footer con datos de la organización.

### Disponibilidad

- El Coordinador descarga desde el Form Builder.
- El Técnico descarga desde la Tab "Plantillas" en su vista mobile.
- Las plantillas descargadas quedan disponibles offline.

---

## 16. Módulo de Chat y Comunicación

- Chat directo entre usuarios de un proyecto.
- Canales por proyecto y por zona.
- Soporte de texto, voz, imágenes y documentos.
- Funciona offline: mensajes se encolan y envían con conexión.
- Indicador de mensajes no leídos en la navegación.
- Notificaciones push para mensajes nuevos.

---

## 17. Dashboard Analítico y Reportes

### Métricas disponibles (Coordinador)

- Mapa de calor de cobertura por zona.
- Avance: formularios meta vs. completados (por técnico, zona, fecha).
- Calidad: tasas de campos vacíos, inconsistencias, rechazos.
- Productividad: formularios/hora, formularios/día por técnico.
- Alertas: baja productividad, datos atípicos, técnicos fuera de zona.
- Filtros: departamento, municipio, zona, técnico, fecha, estado.
- Resumen ejecutivo automático generado por IA.

---

## 18. Módulo de Geolocalización y Mapas

- Coordenadas GPS automáticas por cada formulario.
- Mapa de técnicos en campo en tiempo real.
- Historial de rutas.
- Geocercas configurables con alertas de salida.
- Validación geográfica (alerta si formulario fuera de zona asignada).
- Mapas offline con tiles descargables (Leaflet + OpenStreetMap).

---

## 19. Módulo de Exportación e Integración

- Exportar a: Excel (.xlsx), CSV, JSON, PDF con gráficas.
- Formato DANE / DNP (estándar colombiano).
- Selección de campos a incluir.
- Opción de anonimizar datos personales.
- API REST documentada.
- Webhooks configurables.

---

## 20. Módulo de Auditoría

- Log de todas las acciones: creación, edición, eliminación, sincronización, login.
- Timestamp + geolocalización + dispositivo por cada evento.
- Trazabilidad del ciclo de vida de cada formulario: creado → diligenciado → sincronizado → validado → aprobado.
- Reportes de auditoría exportables.

---

## 21. Seguridad y Protección de Datos

- Cifrado AES-256 de base de datos local.
- HTTPS/TLS 1.3 para todas las comunicaciones.
- Row Level Security (RLS) en Supabase.
- MFA para Coordinador y Superadmin.
- JWT con expiración + refresh automático.
- Anonimización de datos en exportaciones.
- Cumplimiento de Ley 1581 de 2012 (Protección de Datos Personales de Colombia).
- Política de retención y eliminación configurable.

---

## 22. Diseño UI/UX y Sistema de Diseño

### Paleta de colores

```css
:root {
  --primary: #1A5276;
  --secondary: #2E86C1;
  --accent: #27AE60;
  --text-dark: #1C2833;
  --bg-light-blue: #EBF5FB;
  --bg-light-green: #E8F8F5;
  --bg-gray: #F2F4F4;
  --text-gray: #808080;
  --border: #BDC3C7;
  --error: #E74C3C;
  --warning: #F39C12;
  --white: #FFFFFF;
}
```

### Estados de formulario (colores consistentes en toda la app)

| Estado | Color | Ícono |
|---|---|---|
| Borrador | Gris #808080 | Lápiz |
| Completado (pendiente sync) | Naranja #F39C12 | Reloj |
| Sincronizado | Azul #2E86C1 | Nube |
| En revisión | Amarillo #F1C40F | Lupa |
| Validado/Aprobado | Verde #27AE60 | Check |
| Rechazado | Rojo #E74C3C | X |
| Digitalizado OCR | Morado #8E44AD | Escáner |

### Navegación según dispositivo

| Dispositivo | Navegación |
|---|---|
| **Desktop (1366px+)** | Sidebar izquierdo colapsable (íconos colapsado, íconos+texto expandido) |
| **Tablet** | Sidebar colapsado por defecto |
| **Móvil (Técnico)** | **Bottom Navigation Bar con 5 tabs** (estilo app nativa, siempre visible abajo, tab central de "Escanear" destacado con ícono más grande y fondo de color acento) |
| **Móvil (otros roles)** | Hamburger menu superior que abre drawer |

### Principios de diseño

- Mobile-first para la vista de Técnico.
- Fuentes sans-serif profesionales (ejemplo: Inter, Source Sans Pro).
- Bordes redondeados suaves (border-radius: 8px-12px).
- Sombras sutiles en tarjetas (shadow-sm / shadow-md de Tailwind).
- Espaciado generoso para touch targets en móvil (mínimo 44px).
- Optimizado para dispositivos de gama media con pantallas de 5.5" a 6.5".
- Colores de alto contraste para legibilidad en exteriores.
- Iconografía Lucide React consistente.

---

## 23. Empaquetado Móvil (APK / iOS)

### Capacitor.js

La PWA se empaqueta como app nativa usando Capacitor.js 5+.

### Configuración base (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drandigital.controlg',
  appName: 'Control G',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1A5276',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1A5276',
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

### Pasos de generación

```bash
# Android (APK)
npx cap add android
npx cap sync android
npx cap open android  # Abre Android Studio → Build → Generate Signed APK

# iOS (IPA)
npx cap add ios
npx cap sync ios
npx cap open ios  # Abre Xcode → Product → Archive → Distribute
```

### Requisitos para publicación

**Google Play Store (Android):**
- APK firmado con keystore.
- Listado con capturas de pantalla, descripción, política de privacidad.
- Cuenta de desarrollador Google Play ($25 USD pago único).

**Apple App Store (iOS):**
- Cuenta Apple Developer Program ($99 USD/año).
- App firmada con certificado de distribución.
- Revisión de App Store (3-7 días).
- IPA subido vía Xcode → App Store Connect.

---

## 24. Plan de Implementación Paso a Paso

### FASE 0 — Preparación del Entorno (Semana 1)

**Objetivo**: Configurar todo el entorno de desarrollo, infraestructura y herramientas.

| # | Tarea | Detalle | Salida esperada |
|---|---|---|---|
| 0.1 | Crear repositorio Git | Monorepo en GitHub/GitLab con estructura de carpetas | Repo inicializado |
| 0.2 | Scaffolding del proyecto | `npm create vite@latest control-g -- --template react-ts` | Proyecto React + TS + Vite corriendo |
| 0.3 | Configurar Tailwind CSS | `tailwindcss init`, configurar `tailwind.config.ts` | Tailwind funcionando |
| 0.4 | Instalar dependencias core | shadcn/ui, Zustand, React Router, React Hook Form, Zod, Lucide, Framer Motion | package.json completo |
| 0.5 | Configurar Supabase | Crear proyecto en Supabase, configurar variables de entorno | `.env` con keys |
| 0.6 | Crear esquema de base de datos | Ejecutar todas las sentencias SQL de la sección 4 | Tablas creadas en Supabase |
| 0.7 | Configurar RLS (Row Level Security) | Policies por tabla según roles | RLS activo |
| 0.8 | Configurar Capacitor.js | `npm install @capacitor/core @capacitor/cli`, `npx cap init` | Capacitor configurado |
| 0.9 | Configurar PWA | `vite-plugin-pwa` con Workbox | Service Worker registrado |
| 0.10 | Configurar Dexie.js | Crear clase de DB local con tablas offline | IndexedDB funcional |
| 0.11 | Estructura de carpetas | Organizar: `/src/pages`, `/src/components`, `/src/lib`, `/src/hooks`, `/src/stores`, `/src/types` | Estructura limpia |

**Estructura de carpetas sugerida:**

```
src/
├── assets/                  # Imágenes, fuentes
├── components/
│   ├── ui/                  # Componentes shadcn/ui
│   ├── layout/              # Sidebar, BottomNav, TopBar, etc.
│   ├── forms/               # Renderizador de campos dinámicos
│   ├── maps/                # Componentes de mapa
│   ├── chat/                # Componentes de chat
│   └── shared/              # Componentes reutilizables
├── hooks/
│   ├── useAuth.ts
│   ├── useSync.ts
│   ├── useNetwork.ts
│   ├── useGeolocation.ts
│   └── useOfflineStorage.ts
├── lib/
│   ├── supabase.ts          # Cliente Supabase
│   ├── db.ts                # Dexie.js (IndexedDB)
│   ├── sync-engine.ts       # Motor de sincronización
│   ├── ocr.ts               # Integración OCR
│   ├── pdf-generator.ts     # Generador de plantillas PDF
│   └── utils.ts
├── pages/
│   ├── auth/                # Login, forgot password
│   ├── superadmin/          # Todas las vistas del superadmin
│   ├── coordinator/         # Todas las vistas del coordinador
│   ├── assistant/           # Todas las vistas del asistente
│   └── technician/          # Todas las vistas del técnico
├── stores/
│   ├── authStore.ts
│   ├── syncStore.ts
│   ├── formStore.ts
│   └── notificationStore.ts
├── types/
│   ├── database.ts          # Tipos de Supabase
│   ├── forms.ts             # Tipos del form builder
│   └── sync.ts              # Tipos de sincronización
├── App.tsx
├── main.tsx
└── router.tsx               # Rutas protegidas por rol
```

---

### FASE 1 — Autenticación y Layout Base (Semanas 2-3)

**Objetivo**: Login funcional, rutas protegidas por rol, layouts por rol.

| # | Tarea | Detalle |
|---|---|---|
| 1.1 | Pantalla de Login | UI completa con formulario, validación, logo Control G |
| 1.2 | Integración Supabase Auth | Login con email/password, manejo de sesión |
| 1.3 | Sistema de rutas protegidas | React Router con guards por rol, redirección según rol |
| 1.4 | Layout Superadmin | Sidebar completo con todas las secciones de navegación |
| 1.5 | Layout Coordinador | Sidebar con navegación completa |
| 1.6 | Layout Asistente | Sidebar simplificado |
| 1.7 | Layout Técnico | **Bottom Navigation Bar** con 5 tabs (mobile-first), tab central destacado |
| 1.8 | Barra superior | Nombre de usuario, rol, proyecto activo, notificaciones, indicador de conexión |
| 1.9 | Responsive breakpoints | Desktop: sidebar expandido. Tablet: sidebar colapsado. Mobile: bottom nav o hamburger |
| 1.10 | Tema y sistema de diseño | Variables CSS, componentes base shadcn/ui configurados |

---

### FASE 2 — CRUD Base y Jerarquía Geográfica (Semanas 4-5)

**Objetivo**: Gestión de organizaciones, usuarios, geografía y proyectos.

| # | Tarea | Detalle |
|---|---|---|
| 2.1 | CRUD Organizaciones (Superadmin) | Listado, creación, edición, activar/suspender |
| 2.2 | CRUD Usuarios | Invitar, asignar rol, asignar organización, activar/desactivar |
| 2.3 | Carga DIVIPOLA | Importar departamentos y municipios con códigos DANE |
| 2.4 | Gestión de zonas | CRUD de zonas sub-municipales por proyecto |
| 2.5 | CRUD Proyectos | Crear, editar, asignar zonas, asignar miembros |
| 2.6 | Asignación de equipo | Asignar técnicos a zonas, asignar asistentes a subgrupos |
| 2.7 | Pantalla Planes y Licencias | Tabla de planes, asignación por organización |
| 2.8 | Pantalla Auditoría base | Log de eventos con filtros |

---

### FASE 3 — Form Builder (Semanas 6-8)

**Objetivo**: Constructor visual de formularios completamente funcional.

| # | Tarea | Detalle |
|---|---|---|
| 3.1 | Layout de 3 paneles | Panel izquierdo (campos), central (canvas), derecho (propiedades) |
| 3.2 | Drag and drop con dnd-kit | Arrastrar campos desde panel izquierdo al canvas |
| 3.3 | Renderizado de todos los tipos de campo | 19 tipos de campo funcionales |
| 3.4 | Panel de propiedades dinámico | Se actualiza según el campo seleccionado |
| 3.5 | Validaciones configurables | Obligatoriedad, rangos, regex, formato cédula |
| 3.6 | Lógica condicional (skip logic) | Mostrar/ocultar campos según respuestas |
| 3.7 | Secciones y páginas | Tabs de páginas, navegación entre secciones |
| 3.8 | Grupo repetitivo | Sección que se duplica N veces |
| 3.9 | Vista previa mobile | Modal con preview del formulario en formato móvil |
| 3.10 | Guardar borrador y publicar | Estados draft y published |
| 3.11 | Versionamiento | Historial de versiones con rollback |
| 3.12 | Plantillas precargadas | 7 plantillas base del sistema |
| 3.13 | Persistencia en Supabase | Guardar schema JSONB en tabla forms |

---

### FASE 4 — Recolección de Datos Offline-First (Semanas 9-12)

**Objetivo**: Técnico puede diligenciar formularios completamente offline con auto-guardado.

| # | Tarea | Detalle |
|---|---|---|
| 4.1 | Renderizador dinámico de formularios | Componente que lee schema JSONB y renderiza campos |
| 4.2 | Todos los tipos de campo funcionales | Input, select, radio, checkbox, toggle, date, etc. |
| 4.3 | Campo de fotografía | Integración con @capacitor/camera, thumbnail, múltiples fotos |
| 4.4 | Campo de video corto | Grabación de video (máx 30s), preview |
| 4.5 | Campo de firma digital | Canvas táctil con react-signature-canvas |
| 4.6 | Campo de geolocalización | @capacitor/geolocation, captura automática, minimapa |
| 4.7 | Campo de código QR/barras | html5-qrcode con overlay de scanner |
| 4.8 | Grupo repetitivo funcional | "+ Agregar persona", duplica campos, controla min/max |
| 4.9 | Lógica condicional en runtime | Campos se muestran/ocultan según respuestas en vivo |
| 4.10 | Auto-guardado en IndexedDB | Cada campo modificado se persiste inmediatamente |
| 4.11 | Navegación por pasos | Stepper "Paso 1 de N" con indicador de progreso |
| 4.12 | Validaciones en runtime | Errores en rojo debajo de cada campo |
| 4.13 | Finalizar y encolar | Botón "Finalizar" → estado "completed" → cola de sync |
| 4.14 | Dashboard del técnico | Tab Inicio con KPIs, últimos formularios, avance |
| 4.15 | Historial y perfil | Tab Mi Perfil con estadísticas y estado de sync |

---

### FASE 5 — Motor de Sincronización (Semanas 13-14)

**Objetivo**: Sincronización automática, inteligente y resiliente.

| # | Tarea | Detalle |
|---|---|---|
| 5.1 | Detección de conectividad | @capacitor/network + heartbeat HTTP cada 30s |
| 5.2 | Cola de sincronización | Ordenada cronológicamente con prioridades |
| 5.3 | Subida por lotes | Compresión gzip, confirmación con hash |
| 5.4 | Subida de multimedia | Fotos y videos se suben por separado, vinculados al response |
| 5.5 | Confirmación y estado | Estado local cambia a "synced" tras confirmación |
| 5.6 | Reintentos automáticos | Backoff exponencial en caso de fallo |
| 5.7 | Descarga de actualizaciones | Nuevos formularios, asignaciones, mensajes |
| 5.8 | Indicadores UI | Ícono de nube verde/naranja/roja con contador |
| 5.9 | Sync manual | Botón para forzar sincronización desde Mi Perfil |
| 5.10 | Resolución de conflictos | Last-write-wins con log |
| 5.11 | Notificación de sync completada | Push notification cuando termina |

---

### FASE 6 — OCR y Plantillas Imprimibles (Semanas 15-17)

**Objetivo**: Digitalización de formularios en papel y generación de PDFs imprimibles.

| # | Tarea | Detalle |
|---|---|---|
| 6.1 | Tab "Escanear" del técnico | UI con dos opciones: cámara y subir PDF |
| 6.2 | Captura de cámara | Overlay de guía de bordes, captura |
| 6.3 | Corrección de perspectiva | Detección de esquinas, transformación de perspectiva |
| 6.4 | Mejora de imagen | Contraste, nitidez, eliminación de sombras |
| 6.5 | Integración Gemini Vision AI | Envío de imagen a API, recepción de texto extraído |
| 6.6 | Integración Tesseract.js | Procesamiento offline como fallback |
| 6.7 | Mapeo campo-a-campo | Asociar texto extraído con campos del formulario digital |
| 6.8 | Pantalla de revisión OCR | Imagen original + datos extraídos lado a lado |
| 6.9 | Indicadores de confianza | Verde/amarillo/rojo por campo |
| 6.10 | Corrección y confirmación | Edición de valores + botón confirmar |
| 6.11 | Procesamiento por lotes | Múltiples páginas por formulario |
| 6.12 | Generación de PDF imprimible | jsPDF con layout de formulario: campos, líneas, casillas, logo |
| 6.13 | Tab "Plantillas" del técnico | Lista de PDFs descargables, disponibles offline |
| 6.14 | Botón "Generar PDF" en Form Builder | Coordinador descarga PDF desde el constructor |

---

### FASE 7 — Dashboard, Reportes y Mapas (Semanas 18-20)

**Objetivo**: Visualización de datos, mapas interactivos y reportes.

| # | Tarea | Detalle |
|---|---|---|
| 7.1 | Dashboard Superadmin | KPIs, gráficas, mapa de Colombia, tabla de organizaciones |
| 7.2 | Dashboard Coordinador | KPIs, gráficas de avance, tabla de formularios recientes |
| 7.3 | Dashboard Asistente | KPIs de su subgrupo, lista de pendientes |
| 7.4 | Mapa interactivo (Coordinador) | Leaflet con polígonos de zonas, puntos de formularios, ubicación de técnicos |
| 7.5 | Mapa de calor | Cobertura de recolección por zona |
| 7.6 | Geocercas | Configuración de polígonos con alertas |
| 7.7 | Tiles offline | leaflet-offline para descarga de tiles de mapa |
| 7.8 | Reportes gráficos | Recharts: avance por zona, productividad por técnico, calidad |
| 7.9 | Resumen ejecutivo IA | Generación automática de texto descriptivo |
| 7.10 | Pantalla "Datos Recolectados" | Tabla con filtros, vista detalle, acciones de validación |

---

### FASE 8 — Chat, Notificaciones y Exportación (Semanas 21-23)

**Objetivo**: Comunicación interna, notificaciones y exportación de datos.

| # | Tarea | Detalle |
|---|---|---|
| 8.1 | Sistema de chat | Canales directos, por proyecto, por zona |
| 8.2 | Chat offline | Mensajes en cola, sync automática |
| 8.3 | Mensajes de voz | Grabación y reproducción |
| 8.4 | Notificaciones in-app | Campana con badge, panel dropdown |
| 8.5 | Push notifications | @capacitor/push-notifications |
| 8.6 | Exportación Excel | Generación .xlsx con filtros |
| 8.7 | Exportación CSV/JSON | Formatos estándar |
| 8.8 | Exportación PDF | Reporte con gráficas y tablas |
| 8.9 | Anonimización | Opción de ocultar datos personales |
| 8.10 | Validación de formularios | Workflow de aprobación: en_review → validated → approved / rejected |

---

### FASE 9 — Empaquetado Móvil y QA (Semanas 24-26)

**Objetivo**: App nativa funcional en Android e iOS, pruebas completas.

| # | Tarea | Detalle |
|---|---|---|
| 9.1 | Configurar Capacitor Android | `npx cap add android`, configurar AndroidManifest |
| 9.2 | Configurar Capacitor iOS | `npx cap add ios`, configurar Info.plist |
| 9.3 | Splash screen y app icon | Diseño de ícono y pantalla de carga con branding Control G |
| 9.4 | Build APK firmado | Generar APK firmado con keystore para Google Play |
| 9.5 | Build IPA firmado | Generar IPA firmado para App Store |
| 9.6 | Testing offline completo | Probar todo el flujo sin conexión: diligenciar, fotos, videos, auto-guardado |
| 9.7 | Testing de sincronización | Probar sync automática, reintentos, conflictos |
| 9.8 | Testing OCR | Probar con formularios reales escaneados |
| 9.9 | Testing responsive | Probar en dispositivos de gama media (5.5"-6.5") |
| 9.10 | Testing de rendimiento | Probar con cientos de formularios almacenados localmente |
| 9.11 | Corrección de bugs | Fix de issues encontrados |
| 9.12 | Publicar en Google Play | Subir APK, capturas, descripción |
| 9.13 | Publicar en App Store | Subir IPA, pasar revisión de Apple |

---

### FASE 10 — Lanzamiento y Post-lanzamiento (Semanas 27-28)

| # | Tarea | Detalle |
|---|---|---|
| 10.1 | Deploy producción frontend | Vercel con dominio personalizado |
| 10.2 | Deploy producción Supabase | Configuración de producción, backups automáticos |
| 10.3 | Configurar n8n | Workflows de alertas, reportes automáticos |
| 10.4 | Configurar WhatsApp Bot | Notificaciones vía WhatsApp con Baileys |
| 10.5 | Monitoreo | Logs, métricas de uso, alertas de errores |
| 10.6 | Documentación | Guía de usuario por rol, documentación técnica de API |
| 10.7 | Capacitación | Material de entrenamiento para coordinadores y técnicos |
| 10.8 | Soporte inicial | Atención a primeros usuarios, corrección de issues |

---

## 25. Datos de Ejemplo

### Geografía

- **Departamento**: Bolívar (código DANE: 13)
- **Municipio**: Cartagena de Indias (código DANE: 13001)
- **Localidad**: Localidad 2 — De la Virgen y Turística
- **Zonas/Barrios**: Nelson Mandela, Olaya Herrera, El Pozón, Pasacaballos, Bayunca, Arroyo de Piedra

### Usuarios

| Nombre | Rol | Zona |
|---|---|---|
| Yenis Patricia Cásseres Hernández | Coordinadora | Todas |
| Luis Carlos Padilla Morales | Asistente | Nelson Mandela, Olaya Herrera |
| María Fernanda Cuesta Arrieta | Asistente | El Pozón, Pasacaballos |
| Javier Enrique Torres Díaz | Técnico | Nelson Mandela |
| Ana Milena Herrera Polo | Técnico | Nelson Mandela |
| Carlos Andrés Martínez Luna | Técnico | Olaya Herrera |
| Daniela Patricia Orozco Pineda | Técnico | El Pozón |
| Robinson Fabián García Contreras | Técnico | El Pozón |
| Yuleidys Margarita Cabarcas Jiménez | Técnico | Pasacaballos |

### Proyecto

- **Nombre**: "Caracterización Socioeconómica — Nelson Mandela 2026"
- **Tipo**: Socioeconómica
- **Formularios**: "Encuesta de Hogar", "Diagnóstico de Conectividad", "Servicios Públicos Domiciliarios"

### Organización

- **Nombre**: DRAN DIGITAL S.A.S.
- **NIT**: 901.359.114
- **Plan**: Enterprise

---

## 26. Criterios de Aceptación

### Funcionales

- [ ] Un coordinador puede diseñar un formulario completo con el Form Builder y publicarlo.
- [ ] Un técnico puede diligenciar un formulario completamente offline con fotos, videos, firma y GPS.
- [ ] Los datos se auto-guardan localmente tras cada campo modificado.
- [ ] Al detectar conexión, los datos se sincronizan automáticamente sin intervención del usuario.
- [ ] Un técnico puede escanear un formulario en papel con la cámara y el OCR extrae los datos.
- [ ] Un técnico puede descargar la versión PDF imprimible de un formulario.
- [ ] El coordinador ve el avance en tiempo real en su dashboard.
- [ ] El asistente puede pre-validar formularios de sus técnicos.
- [ ] El chat funciona offline con sincronización posterior.
- [ ] Los mapas muestran zonas, puntos de formularios y ubicación de técnicos.
- [ ] La exportación genera archivos Excel, CSV, JSON y PDF correctamente.
- [ ] El indicador de conexión/sincronización es visible en todo momento para el técnico.

### No funcionales

- [ ] La app carga en menos de 3 segundos en dispositivos de gama media.
- [ ] La app funciona correctamente offline durante semanas sin pérdida de datos.
- [ ] La sincronización de 100 formularios con fotos completa en menos de 5 minutos con conexión 4G.
- [ ] La app se empaqueta correctamente como APK (Android) e IPA (iOS) con Capacitor.
- [ ] El bottom navigation bar del técnico se comporta como una app nativa.
- [ ] Los datos están cifrados localmente y en tránsito.
- [ ] El RLS de Supabase impide acceso a datos de otras organizaciones.

---

*Documento generado para DRAN DIGITAL S.A.S. — Control G v1.0 — Marzo 2026*