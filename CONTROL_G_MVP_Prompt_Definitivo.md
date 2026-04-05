# CONTROL G — PROMPT MVP DEFINITIVO

## Prompt Completo para Construir el Flujo Funcional de Gestión Social en Campo

---

# INSTRUCCIÓN GENERAL

Construye una aplicación web progresiva (PWA) llamada **Control G** empaquetable con Capacitor.js como APK (Android) e IPA (iOS). La app gestiona programas de atención psicosocial a familias en municipios de Colombia. El flujo completo es: un Administrador crea una Entidad (contrato), la Entidad configura su equipo de trabajo (Coordinador, Apoyo Administrativo, Profesionales de Campo), el Coordinador asigna municipios y familias a los Profesionales, y cada Profesional ejecuta 5 actividades con cada familia asignada. La app genera informes automáticos con el formato exacto descrito más adelante.

**Stack tecnológico**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui, Supabase (PostgreSQL + Auth + Storage + Realtime), Dexie.js (IndexedDB para offline), Capacitor.js 5+ (cámara, GPS, network), Workbox (PWA/Service Worker), Recharts (gráficas), jsPDF (generación de informes PDF), react-signature-canvas (firma digital).

**Principio fundamental**: La app funciona 100% offline para el Profesional de Campo. Todo se guarda localmente y se sincroniza automáticamente cuando hay internet.

---

# 1. ROLES DEL SISTEMA (4 ROLES EXACTOS)

## 1.1 Administrador

Es el operador de la plataforma (DRAN DIGITAL S.A.S.). Su función es crear y gestionar Entidades (contratos/clientes).

**Permisos**:
- Crear, editar, activar y suspender Entidades.
- Ver el listado de todas las Entidades con estado general.
- Ver métricas globales: total de entidades, contratos activos, familias registradas.
- NO interactúa con familias ni formularios directamente.

**Navegación** (sidebar desktop):
- Dashboard global
- Entidades
- Configuración

**Flujo del Administrador**:
1. Inicia sesión.
2. Va a "Entidades" → clic en "Crear nueva entidad".
3. Llena el formulario de creación de entidad:
   - Nombre de la entidad (ej: "Secretaría de Seguridad de Bolívar")
   - NIT
   - Número de contrato (ej: "13-PSC-2025")
   - Objeto del contrato (ej: "Prestación de servicios para soporte en captura de información y producción de informes de caracterización ex antes, ex post y momentos de encuentro en el programa de asistencia psicosocial a líderes – Ruta de Protección")
   - Contratista / Operador (ej: "FUNSERVAR")
   - Periodo de ejecución: fecha inicio y fecha fin (ej: "4 de agosto de 2025 – 18 de diciembre de 2025")
   - Departamento (ej: Bolívar)
   - Municipios de cobertura (multiselect con municipios del departamento, ej: Altos del Rosario, Mahates, San Jacinto, etc.)
   - Número de familias meta por municipio (ej: 35 por municipio)
   - Email del Coordinador General (se le enviará invitación)
4. Al guardar, se crea la entidad y se envía invitación al Coordinador por email.
5. **Todo el flujo interno de la entidad funciona automáticamente** a partir de aquí.

---

## 1.2 Coordinador

Es el líder operativo de la entidad. Tiene acceso total a la información del contrato.

**Permisos**:
- Ver dashboard con avance en tiempo real de TODA la operación.
- Crear y gestionar usuarios (Apoyo Administrativo y Profesionales de Campo).
- Asignar municipios y familias a cada Profesional.
- Hacer anotaciones, observaciones y solicitudes a cada Profesional sobre su trabajo.
- Revisar y firmar informes individuales (después de la revisión del Apoyo Administrativo).
- Firmar el informe general consolidado.
- Imprimir/descargar informes: por profesional, por municipio, por tipo de actividad, consolidado, de impacto poblacional.
- Autorizar reedición documental (si un Profesional necesita corregir datos ya enviados).
- NO diligencia formularios ni visita familias.

**Navegación** (sidebar desktop):
- Dashboard (seguimiento en tiempo real)
- Equipo (gestión de Apoyo Administrativo y Profesionales)
- Municipios (asignación de municipios a Profesionales)
- Familias (listado completo con estado de las 5 actividades)
- Informes (generación y firma)
- Observaciones (anotaciones a Profesionales)
- Configuración

**Dashboard del Coordinador** (pantalla principal):
- Tarjetas KPI: Total familias meta, Familias registradas, % Avance general
- Tabla de Profesionales con columnas: Nombre, Municipio(s), Meta familias, Ex-Antes completadas, Momento 1, Momento 2, Momento 3, Ex-Post completadas, % Avance, Estado
- Gráfica de barras: avance por municipio
- Gráfica circular: distribución por tipo de actividad completada
- Pantalla de seguimiento en tiempo real en números y gráficos de porcentaje (por Profesional y por Municipio)

---

## 1.3 Apoyo Administrativo

Combina las funciones de "Apoyo Profesional de la Coordinación" y "Apoyo a la Gestión de la Coordinación" del documento de referencia.

**Permisos**:
- Revisar que cada Profesional esté cumpliendo la meta en modo, tiempo y lugar.
- Revisar informes individuales de cada Profesional y marcar observaciones o aprobar.
- Verificar que los informes consolidados correspondan con la suma exacta de los individuales.
- Dar visto bueno al informe consolidado antes de la firma del Coordinador, o sugerir modificaciones.
- Verificar cumplimiento de aspectos documentales del contratista.
- Prender alarmas sobre aspectos que haya que corregir o modificar.
- NO diligencia formularios ni visita familias.

**Navegación** (sidebar desktop):
- Dashboard (métricas de avance del equipo)
- Profesionales (listado con avance y estado)
- Revisión de Informes (informes pendientes de visto bueno)
- Observaciones (alarmas y solicitudes de corrección)

---

## 1.4 Profesional de Campo

Es quien visita las familias y ejecuta las 5 actividades. Esta es la vista **100% mobile-first** con bottom navigation bar.

**Permisos**:
- Ver las familias que le fueron asignadas en sus municipios.
- Ejecutar las 5 actividades con cada familia (una a la vez, en días diferentes).
- Capturar datos personales, caracterización social, fotos de evidencia y firmas.
- Todo funciona offline: se guarda localmente y se sincroniza cuando haya internet.
- Ver su propio avance (meta vs ejecutado).
- Ver observaciones del Coordinador o Apoyo Administrativo.
- NO puede crear familias (las familias se asignan desde el Coordinador).
- NO puede modificar datos ya sincronizados sin autorización del Coordinador.

**Navegación** (bottom navigation bar, 5 tabs, estilo app nativa):

| Tab | Ícono | Label |
|---|---|---|
| 1 | Home (casa) | Inicio |
| 2 | Users (personas) | Familias |
| 3 | Camera (cámara) — **tab central destacado** | Capturar |
| 4 | FileText (documento) | Informes |
| 5 | User (persona) | Mi Perfil |

**Indicador de conexión permanente** en barra superior de TODAS las pantallas:
- Nube verde: "Sincronizado"
- Nube naranja: "Sincronizando..."
- Nube roja con número: "Sin conexión (N pendientes)"

---

# 2. LAS 5 ACTIVIDADES POR FAMILIA

Cada familia recibe exactamente **5 visitas del Profesional**, cada una en un día diferente. Las actividades son:

## Actividad 1: Caracterización Ex-Antes (Línea base)

**Datos que se capturan**:

Sección I — Datos Personales y Localización:
- Nombre completo (primer nombre, segundo nombre, primer apellido, segundo apellido)
- Tipo de documento de identidad (CC, TI, CE, Pasaporte, RC, PEP, PPT)
- Número de documento
- Fecha de nacimiento (la app calcula la edad automáticamente)
- Celular de contacto
- Municipio / Departamento (preseleccionado según asignación)
- Zona (Urbana / Rural)
- Dirección / Vereda
- Indicaciones (ej: "Casa", "Tienda", "Al lado de la iglesia")

Sección II — Caracterización Social y Diferencial:
- Género (Masculino, Femenino, Transgénero, No binario, No informa)
- Grupo Étnico (Afrocolombiano, Comunidad Negra, Afrodescendiente, Palenquero, Raizal, Room, Indígena, Mestizo, No reporta, Ninguno)
- Discapacidad (Auditiva, Visual, Sordoceguera, Intelectual, Psicosocial/Mental, Física, Múltiple, Ninguna)
- Factor Diferencial / Condición Especial (Víctima, Campesino, Joven Rural, Mujer Campesina, Mujer Rural, Mujer Pesquera, Desmovilizado, Reincorporado, Reinsertado, Reintegrado, No aplica)
- Personas a cargo (número)
- Datos de acompañante (si aplica): nombre, documento, parentesco. Si no requiere: "No requiere acompañante para el proceso"

Sección III — Registro de la Actividad:
- Fecha de la actividad (auto o manual)
- Registro fotográfico (mínimo 1 foto de evidencia de la actividad con la familia)
- Firma del beneficiario (canvas táctil con el dedo)
- Geolocalización GPS (automática)

Sección IV — Consentimiento:
- Checkbox: "El usuario acepta la política de tratamiento de datos personales y certifica que la información suministrada es veraz"
- Firma del Profesional (canvas táctil, se captura una vez y se reutiliza en todos los formularios)

---

## Actividad 2: Momento de Encuentro 1

**Datos que se capturan**:
- Familia (preseleccionada, se vincula a la familia ya registrada en Ex-Antes)
- Fecha de la actividad
- Tema tratado (texto libre, ej: "Orientación familiar")
- Descripción / Temáticas desarrolladas (texto largo)
- Registro fotográfico (mínimo 1 foto de evidencia)
- Firma del beneficiario (canvas táctil)
- Consentimiento (checkbox)

---

## Actividad 3: Momento de Encuentro 2

Misma estructura que Momento 1.
- Tema tratado típico: "Resolución de conflictos"

---

## Actividad 4: Momento de Encuentro 3

Misma estructura que Momento 1.
- Tema tratado típico: "Gestión emocional"

---

## Actividad 5: Caracterización Ex-Post (Cierre)

**Datos que se capturan**:
- Familia (preseleccionada)
- Fecha de la actividad
- Impacto positivo: Sí / No
- Evaluación del programa (texto largo, opcional)
- Evaluación del profesional (texto largo, opcional)
- Registro fotográfico (mínimo 1 foto de evidencia)
- Firma de cierre del beneficiario (canvas táctil)
- Consentimiento (checkbox)
- Firma del Profesional

Cuando se completa la Actividad 5, la familia cambia a estado **"COMPLETADO"**.

---

# 3. FLUJO COMPLETO PASO A PASO

## Paso 1: El Administrador crea la Entidad

```
Administrador → Entidades → "Crear nueva entidad"
  ├── Nombre: "Secretaría de Seguridad de Bolívar"
  ├── NIT: 806.007.XXX
  ├── Contrato: "13-PSC-2025"
  ├── Objeto: "Prestación de servicios para soporte en captura de información..."
  ├── Operador: "FUNSERVAR"
  ├── Periodo: 4 agosto 2025 – 18 diciembre 2025
  ├── Departamento: Bolívar
  ├── Municipios: [Altos del Rosario, Mahates, San Jacinto, ...]
  ├── Familias por municipio: 35
  └── Email Coordinador: coordinador@funservar.org
```
→ Se crea la entidad en estado "Activo".
→ Se envía invitación al Coordinador.

## Paso 2: El Coordinador configura su equipo

```
Coordinador inicia sesión → Dashboard de la entidad
  │
  ├── Va a "Equipo" → "Invitar miembro"
  │   ├── Nombre: Laura Marcela Peñuela Pinedo
  │   ├── Email: laura@funservar.org
  │   ├── Rol: Apoyo Administrativo
  │   └── [Enviar invitación]
  │
  ├── Invitar Profesional 1:
  │   ├── Nombre: Yina Marcela Arroyo Olivares
  │   ├── Email: yina@funservar.org
  │   ├── Rol: Profesional de Campo
  │   └── [Enviar invitación]
  │
  ├── Invitar Profesional 2, 3, 4... (entre 3 y 4 por municipio)
  │
  └── Asignar municipios a cada Profesional:
      ├── Yina Arroyo → Altos del Rosario (35 familias)
      ├── Carlos Torres → Mahates (30 familias) + San Jacinto (35 familias)
      └── ...
```

## Paso 3: El Coordinador carga o crea las familias por municipio

```
Coordinador → "Familias" → "Agregar familias"
  │
  ├── Opción A: Carga masiva desde Excel (subir CSV/Excel con lista de familias)
  │
  └── Opción B: Crear familia una por una:
      ├── Municipio: Altos del Rosario
      ├── Nombre cabeza de familia: Crescencio Camargo Hoyos
      ├── Documento: CC 9120411
      ├── Dirección: Cll 15 Cra 10-103
      ├── Profesional asignado: Yina Marcela Arroyo Olivares
      └── [Guardar]
```

Cada familia se crea con estado:
- Ex-Antes: ⬜ Pendiente
- Momento 1: ⬜ Pendiente
- Momento 2: ⬜ Pendiente
- Momento 3: ⬜ Pendiente
- Ex-Post: ⬜ Pendiente

## Paso 4: El Profesional ejecuta las actividades en campo

```
Profesional abre la app (funciona offline)
  │
  ├── Tab "Inicio": Ve su dashboard
  │   ├── "Hola, Yina"
  │   ├── Municipio activo: Altos del Rosario
  │   ├── Familias asignadas: 35
  │   ├── Ex-Antes completadas: 12/35
  │   ├── Avance general: 24%
  │   └── Observaciones del Coordinador (si las hay)
  │
  ├── Tab "Familias": Lista de familias asignadas
  │   ├── Cada familia muestra:
  │   │   ├── Nombre: Crescencio Camargo Hoyos
  │   │   ├── CC: 9120411
  │   │   ├── Estado: [⬜ Ex-Antes] [⬜ M1] [⬜ M2] [⬜ M3] [⬜ Ex-Post]
  │   │   └── Botón: [Realizar siguiente actividad]
  │   │
  │   └── Al tocar una familia, se abre la SIGUIENTE actividad pendiente:
  │
  │       Si Ex-Antes está pendiente → Abre formulario de Caracterización Ex-Antes
  │       Si Ex-Antes completada y M1 pendiente → Abre formulario de Momento 1
  │       Si M1 completada y M2 pendiente → Abre formulario de Momento 2
  │       ... y así sucesivamente.
  │       Si todas completadas → Muestra estado "COMPLETADO" en verde
  │
  ├── Tab "Capturar" (botón central): Acceso rápido a la cámara para evidencia
  │
  ├── Tab "Informes": Ve su informe personal con métricas
  │
  └── Tab "Mi Perfil": Datos, sync, cerrar sesión
```

## Paso 5: El Profesional diligencia un formulario (ejemplo: Ex-Antes)

```
[Toca familia "Crescencio Camargo"] → [Se abre formulario Ex-Antes]
  │
  ├── PÁGINA 1: Datos Personales y Localización
  │   ├── Nombre completo (prerellenado si el Coordinador lo cargó)
  │   ├── Tipo y número de documento (prerellenado)
  │   ├── Fecha nacimiento → la app calcula edad: "1956-11-15 (69 Años)"
  │   ├── Celular: [input numérico]
  │   ├── Municipio/Depto: "Altos del Rosario, Bolívar" (prerellenado)
  │   ├── Zona: [Urbana / Rural] radio
  │   ├── Dirección: [texto]
  │   └── Indicaciones: [texto, ej: "Casa"]
  │
  ├── PÁGINA 2: Caracterización Social y Diferencial
  │   ├── Género: [dropdown]
  │   ├── Grupo Étnico: [dropdown]
  │   ├── Discapacidad: [dropdown]
  │   ├── Factor Diferencial: [dropdown]
  │   ├── Personas a cargo: [numérico]
  │   └── Datos acompañante: [toggle + campos si aplica]
  │
  ├── PÁGINA 3: Evidencia y Firmas
  │   ├── Foto de evidencia: [botón cámara → captura foto → thumbnail]
  │   ├── Firma del beneficiario: [canvas táctil → "Firme aquí con su dedo"]
  │   ├── Consentimiento: [checkbox → texto legal]
  │   └── GPS: [captura automática]
  │
  └── [FINALIZAR] → Se guarda en IndexedDB → Cola de sync
      → Estado de la familia cambia: [✅ Ex-Antes] [⬜ M1] [⬜ M2] [⬜ M3] [⬜ Ex-Post]
```

## Paso 6: Sincronización automática

```
Cuando el Profesional tiene internet:
  │
  ├── Sync Engine detecta conexión
  ├── Sube formularios completados a Supabase
  ├── Sube fotos y firmas a Supabase Storage
  ├── Confirma con hash de integridad
  ├── Estado local → "sincronizado" ✅
  ├── Descarga observaciones del Coordinador (si las hay)
  └── Indicador cambia: nube verde "Sincronizado"
```

## Paso 7: Revisión y aprobación de informes

```
Apoyo Administrativo:
  ├── Ve informes individuales de cada Profesional
  ├── Revisa que los datos estén completos y correctos
  ├── Si hay problemas: marca observaciones → notifica al Profesional
  ├── Si todo está bien: da visto bueno ✅
  └── El informe pasa al Coordinador para firma

Coordinador:
  ├── Ve informes con visto bueno del Apoyo Administrativo
  ├── Firma electrónica del informe individual
  ├── Cuando todos los individuales están firmados: genera informe consolidado
  └── Firma el informe consolidado
```

---

# 4. FORMATO DE INFORMES (EXACTO COMO LAS IMÁGENES)

## 4.1 Informe de Seguimiento por Profesional (Imagen 1)

El informe tiene esta estructura EXACTA:

```
╔══════════════════════════════════════════════════════════════╗
║  INFORME DE SEGUIMIENTO                    FECHA GENERACIÓN ║
║  PROGRAMA DE GESTIÓN SOCIAL EN CAMPO         DD/MM/YYYY     ║
║  ═══════════════════════════════════                        ║
╠══════════════════════════════════════════════════════════════╣
║  INFORMACIÓN DEL PROYECTO                                    ║
║  ─────────────────────────                                   ║
║  NÚMERO DE CONTRATO        OBJETO                            ║
║  13-PSC-2025               Prestación de servicios para...   ║
║                                                              ║
║  CONTRATISTA / OPERADOR    PERIODO REPORTADO                 ║
║  FUNSERVAR                 4 ago 2025 - 18 dic 2025          ║
╠══════════════════════════════════════════════════════════════╣
║  PERFIL DEL PROFESIONAL                                      ║
║  ─────────────────────                                       ║
║  NOMBRE COMPLETO           ID PROFESIONAL                    ║
║  Yina Marcela Arroyo       GjuNUKk6sLb7...                  ║
║                                                              ║
║  ROL ASIGNADO              MUNICIPIOS DE COBERTURA           ║
║  PROFESSIONAL              Altos del Rosario                 ║
╠══════════════════════════════════════════════════════════════╣
║  MÉTRICAS DE EJECUCIÓN                                       ║
║                                                              ║
║  ┌──────────────┐  ┌──────────────┐                         ║
║  │     35       │  │     35       │                         ║
║  │ CARACT.      │  │ CARACT.      │                         ║
║  │ EX-ANTE      │  │ EX-POST      │                         ║
║  │ Meta: 35     │  │ Meta: 35     │                         ║
║  └──────────────┘  └──────────────┘                         ║
║                                                              ║
║  DETALLE DE ENCUENTROS PSICOSOCIALES                         ║
║  ┌──────────┐  ┌──────────┐  ┌──────────┐                  ║
║  │    35    │  │    35    │  │    35    │                  ║
║  │MOMENTO 1 │  │MOMENTO 2 │  │MOMENTO 3 │                  ║
║  └──────────┘  └──────────┘  └──────────┘                  ║
║                                                              ║
║  Avance general de registros cargados          100%          ║
║  ████████████████████████████████████████████                ║
╚══════════════════════════════════════════════════════════════╝
```

Después de esta página resumen, el informe contiene UNA PÁGINA POR CADA FAMILIA (Registro 1 de 35, Registro 2 de 35, etc.) con el formato de la Imagen 2.

## 4.2 Ficha Individual por Familia (Imágenes 2 y 3)

Cada familia tiene UNA PÁGINA con esta estructura EXACTA:

```
╔══════════════════════════════════════════════════════════════╗
║  CRESCENCIO CAMARGO HOYOS                   [COMPLETADO]     ║
║  Cédula de ciudadanía 9120411    ID: 2c131510-ee7            ║
╠══════════════════════════════════════════════════════════════╣
║  I. DATOS PERSONALES Y LOCALIZACIÓN                          ║
║  ──────────────────────────────────                          ║
║  FECHA NACIMIENTO    CELULAR       MUNICIPIO/DEPT   ZONA     ║
║  1956-11-15 (69)     312201XXXX    Altos del Rosario Urbana  ║
║                                    Bolívar                   ║
║  DIRECCIÓN / VEREDA              INDICACIONES                ║
║  Cll 15 Cra 10-103              Casa                        ║
╠══════════════════════════════════════════════════════════════╣
║  II. CARACTERIZACIÓN SOCIAL Y DIFERENCIAL                    ║
║  ────────────────────────────────────────                    ║
║  GÉNERO        GRUPO ÉTNICO    DISCAPACIDAD   FACTOR DIF.    ║
║  ♂ Masculino   Afrocolombiano  NINGUNA        No aplica      ║
║                                                              ║
║  PERSONAS A CARGO    DATOS ACOMPAÑANTE                       ║
║  0                   No requiere acompañante para el proceso ║
╠══════════════════════════════════════════════════════════════╣
║  III. RUTA DE ATENCIÓN PSICOSOCIAL    [Reg. Fotográfico]     ║
║  ┌───────────┬───────────┬───────────┬───────────┐          ║
║  │ MOMENTO 1 │ MOMENTO 2 │ MOMENTO 3 │ EX-POST   │          ║
║  │ 2025-10-18│ 2025-11-07│ 2025-11-11│ 2025-11-28│          ║
║  │           │           │           │           │          ║
║  │TEMA:      │TEMA:      │TEMA:      │IMPACTO:   │          ║
║  │Orientación│Resolución │Gestión    │Sí         │          ║
║  │familiar   │conflictos │emocional  │           │          ║
║  │           │           │           │           │          ║
║  │ [FOTO]    │ [FOTO]    │ [FOTO]    │ [FOTO]    │          ║
║  │EVIDENCIA  │EVIDENCIA  │EVIDENCIA  │EVIDENCIA  │          ║
║  │           │           │           │           │          ║
║  │FIRMA:     │FIRMA:     │FIRMA:     │FIRMA      │          ║
║  │[firma img]│[firma img]│[firma img]│CIERRE:    │          ║
║  │           │           │           │[firma img]│          ║
║  └───────────┴───────────┴───────────┴───────────┘          ║
╠══════════════════════════════════════════════════════════════╣
║  ☑ El usuario acepta la política de tratamiento de datos     ║
║    personales y certifica que la información es veraz.        ║
║                                                              ║
║  ___________________        ___________________              ║
║  FIRMA DEL PROFESIONAL      FIRMA DEL SUPERVISOR             ║
║  Yina Marcela Arroyo        Laura Marcela Peñuela            ║
║                                           Registro 1 de 35  ║
╚══════════════════════════════════════════════════════════════╝
```

**IMPORTANTE**: Las fotos de evidencia y las firmas se renderizan como imágenes reales dentro del informe PDF. Las firmas del Profesional y del Supervisor aparecen al final de CADA ficha individual.

## 4.3 Tipos de Informes que genera el sistema

| Informe | Quién lo genera | Contenido |
|---|---|---|
| Informe por Profesional | Automático | Página resumen (métricas) + 1 ficha por cada familia del Profesional |
| Informe por Municipio | Coordinador | Resumen del municipio + todas las familias del municipio |
| Informe por tipo de Actividad | Coordinador | Solo Ex-Antes, Solo Momento 1, Solo Momento 2, Solo Momento 3, Solo Ex-Post |
| Informe consolidado | Coordinador | Todos los municipios + todos los Profesionales |
| Informe de Impacto Poblacional | Coordinador | Estadísticas de enfoque diferencial: género, etnia, discapacidad, factor diferencial |

---

# 5. MODELO DE DATOS (TABLAS SUPABASE)

```sql
-- ENTIDADES (contratos/clientes creados por el Administrador)
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,              -- "Secretaría de Seguridad de Bolívar"
  nit VARCHAR(30),
  contract_number VARCHAR(50) NOT NULL,    -- "13-PSC-2025"
  contract_object TEXT NOT NULL,           -- Objeto del contrato
  operator_name VARCHAR(200) NOT NULL,     -- "FUNSERVAR"
  department VARCHAR(100) NOT NULL,        -- "Bolívar"
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  families_per_municipality INTEGER DEFAULT 35,
  status VARCHAR(20) DEFAULT 'active',     -- active | suspended | completed
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- MUNICIPIOS ASIGNADOS A LA ENTIDAD
CREATE TABLE entity_municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  municipality_name VARCHAR(200) NOT NULL,  -- "Altos del Rosario"
  department VARCHAR(100) NOT NULL,         -- "Bolívar"
  families_target INTEGER DEFAULT 35,       -- Meta de familias
  created_at TIMESTAMPTZ DEFAULT now()
);

-- USUARIOS (todos los roles)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  entity_id UUID REFERENCES entities(id),   -- NULL para Administrador
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(30) NOT NULL,                -- 'admin' | 'coordinator' | 'support' | 'professional'
  avatar_url TEXT,
  signature_url TEXT,                       -- Firma digital guardada del profesional/supervisor
  status VARCHAR(20) DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ASIGNACIÓN DE PROFESIONAL A MUNICIPIOS
CREATE TABLE professional_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES users(id),
  municipality_id UUID REFERENCES entity_municipalities(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(professional_id, municipality_id)
);

-- FAMILIAS (núcleos familiares beneficiarios)
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  municipality_id UUID REFERENCES entity_municipalities(id),
  professional_id UUID REFERENCES users(id),  -- Profesional asignado

  -- Datos cabeza de familia
  first_name VARCHAR(100) NOT NULL,
  second_name VARCHAR(100),
  first_lastname VARCHAR(100) NOT NULL,
  second_lastname VARCHAR(100),
  full_name VARCHAR(400) GENERATED ALWAYS AS (
    UPPER(COALESCE(first_name,'') || ' ' || COALESCE(second_name,'') || ' ' || 
    COALESCE(first_lastname,'') || ' ' || COALESCE(second_lastname,''))
  ) STORED,
  id_document_type VARCHAR(10) DEFAULT 'CC',  -- CC, TI, CE, PA, RC, PEP, PPT
  id_number VARCHAR(30) NOT NULL,
  birth_date DATE,
  age INTEGER,
  phone VARCHAR(20),
  zone VARCHAR(20),                            -- Urbana | Rural
  address TEXT,
  directions TEXT,                             -- Indicaciones ("Casa", "Tienda")
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Caracterización social y diferencial
  gender VARCHAR(30),                          -- Masculino, Femenino, Transgénero, No binario, No informa
  ethnic_group VARCHAR(50),                    -- Afrocolombiano, Comunidad Negra, etc.
  disability VARCHAR(50),                      -- Auditiva, Visual, Física, Ninguna, etc.
  differential_factor VARCHAR(100),            -- Víctima, Campesino, Desmovilizado, No aplica, etc.
  dependents INTEGER DEFAULT 0,               -- Personas a cargo
  companion_required BOOLEAN DEFAULT false,
  companion_name VARCHAR(200),
  companion_document VARCHAR(30),
  companion_relationship VARCHAR(100),

  -- Estado de las 5 actividades
  ex_ante_status VARCHAR(20) DEFAULT 'pending',    -- pending | completed
  ex_ante_date DATE,
  ex_ante_activity_id UUID,

  encounter_1_status VARCHAR(20) DEFAULT 'pending',
  encounter_1_date DATE,
  encounter_1_topic VARCHAR(200),                   -- "Orientación familiar"
  encounter_1_activity_id UUID,

  encounter_2_status VARCHAR(20) DEFAULT 'pending',
  encounter_2_date DATE,
  encounter_2_topic VARCHAR(200),                   -- "Resolución de conflictos"
  encounter_2_activity_id UUID,

  encounter_3_status VARCHAR(20) DEFAULT 'pending',
  encounter_3_date DATE,
  encounter_3_topic VARCHAR(200),                   -- "Gestión emocional"
  encounter_3_activity_id UUID,

  ex_post_status VARCHAR(20) DEFAULT 'pending',
  ex_post_date DATE,
  ex_post_positive_impact BOOLEAN,                  -- Sí / No
  ex_post_activity_id UUID,

  -- Estado global
  overall_status VARCHAR(20) DEFAULT 'pending',     -- pending | in_progress | completed
  consent_given BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ACTIVIDADES (cada visita/formulario diligenciado)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES users(id),
  municipality_id UUID REFERENCES entity_municipalities(id),

  activity_type VARCHAR(30) NOT NULL,   -- 'ex_ante' | 'encounter_1' | 'encounter_2' | 'encounter_3' | 'ex_post'
  activity_date DATE NOT NULL,
  
  -- Datos específicos por tipo
  topic VARCHAR(200),                    -- Tema tratado (momentos)
  description TEXT,                      -- Temáticas desarrolladas
  positive_impact BOOLEAN,              -- Solo ex_post: ¿Hubo impacto positivo?
  program_evaluation TEXT,              -- Solo ex_post
  professional_evaluation TEXT,         -- Solo ex_post

  -- Evidencia
  photo_url TEXT,                        -- URL de foto de evidencia en Storage
  beneficiary_signature_url TEXT,        -- URL de firma del beneficiario en Storage

  -- Geolocalización
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Sincronización
  local_id VARCHAR(50) NOT NULL,         -- UUID generado offline
  synced_at TIMESTAMPTZ,
  device_info JSONB,

  -- Estado
  status VARCHAR(20) DEFAULT 'synced',   -- synced | reviewed | approved | rejected
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- OBSERVACIONES (del Coordinador/Apoyo al Profesional)
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entities(id),
  from_user_id UUID REFERENCES users(id),     -- Quien escribe
  to_user_id UUID REFERENCES users(id),       -- Profesional destinatario
  family_id UUID REFERENCES families(id),     -- Opcional: sobre una familia específica
  activity_id UUID REFERENCES activities(id), -- Opcional: sobre una actividad
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'observation',     -- observation | correction | approval
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LOG DE AUDITORÍA
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_ref_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LOG DE SINCRONIZACIÓN
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  records_uploaded INTEGER DEFAULT 0,
  media_uploaded INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

# 6. PANTALLAS DEL PROFESIONAL DE CAMPO (MOBILE-FIRST)

## Tab 1 — Inicio

```
┌─────────────────────────────────────────┐
│ ☁️ ✅ Sincronizado           Yina Arroyo│
├─────────────────────────────────────────┤
│                                         │
│  Hola, Yina 👋                          │
│                                         │
│  📍 Altos del Rosario, Bolívar          │
│  Contrato: 13-PSC-2025                  │
│                                         │
│  ┌──────────┐ ┌──────────┐              │
│  │    35    │ │  12/35   │              │
│  │ Familias │ │Completadas│              │
│  │ asignadas│ │          │              │
│  └──────────┘ └──────────┘              │
│                                         │
│  ┌──────────┐ ┌──────────┐              │
│  │   34%    │ │    3     │              │
│  │ Avance   │ │Pendientes│              │
│  │ general  │ │de sync   │              │
│  └──────────┘ └──────────┘              │
│                                         │
│  ⚠️ Observación del Coordinador:        │
│  "Yina, verificar foto de familia #12"  │
│                                         │
│  ÚLTIMAS ACTIVIDADES                    │
│  ✅ Crescencio Camargo - Ex-Antes       │
│  ✅ Jeidi Pedroso - Ex-Antes            │
│  ⟳ María López - Momento 1 (pendiente) │
│                                         │
├───────┬───────┬───────┬───────┬─────────┤
│  🏠  │  👥  │  📷  │  📄  │  👤    │
│Inicio│Familias│Capturar│Informes│Perfil │
└───────┴───────┴───────┴───────┴─────────┘
```

## Tab 2 — Familias

```
┌─────────────────────────────────────────┐
│ ☁️ ✅ Sincronizado        🔍 Buscar     │
├─────────────────────────────────────────┤
│                                         │
│  MIS FAMILIAS (35)                      │
│  Altos del Rosario                      │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Crescencio Camargo Hoyos           ││
│  │ CC 9120411                          ││
│  │ ✅ ✅ ✅ ✅ ✅  COMPLETADO          ││
│  │ Ex M1 M2 M3 EP                     ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Jeidi Milena Pedroso Robles        ││
│  │ CC 30848086                         ││
│  │ ✅ ✅ ✅ ✅ ✅  COMPLETADO          ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ María López Rodríguez              ││
│  │ CC 10XXXXX                          ││
│  │ ✅ ✅ ⬜ ⬜ ⬜  EN PROGRESO         ││
│  │          ▲                          ││
│  │    [Realizar Momento 2]             ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Juan Pérez Castro                   ││
│  │ CC 73XXXXX                          ││
│  │ ⬜ ⬜ ⬜ ⬜ ⬜  PENDIENTE           ││
│  │ [Iniciar Caracterización Ex-Antes]  ││
│  └─────────────────────────────────────┘│
│                                         │
├───────┬───────┬───────┬───────┬─────────┤
│  🏠  │  👥  │  📷  │  📄  │  👤    │
└───────┴───────┴───────┴───────┴─────────┘
```

## Pantalla de formulario (ejemplo: Momento de Encuentro)

```
┌─────────────────────────────────────────┐
│ ← Momento de Encuentro 2     💾 Guardar│
├─────────────────────────────────────────┤
│                                         │
│  Familia: María López Rodríguez         │
│  CC: 10XXXXX                            │
│                                         │
│  Paso 1 de 2                            │
│  ●━━━━━━━━━○                           │
│                                         │
│  Fecha de la actividad                  │
│  ┌─────────────────────────┐            │
│  │ 15/03/2026              │            │
│  └─────────────────────────┘            │
│                                         │
│  Tema tratado *                         │
│  ┌─────────────────────────┐            │
│  │ Resolución de conflictos│            │
│  └─────────────────────────┘            │
│                                         │
│  Temáticas desarrolladas                │
│  ┌─────────────────────────┐            │
│  │ Se trabajaron técnicas  │            │
│  │ de comunicación         │            │
│  │ asertiva y manejo de    │            │
│  │ emociones en familia... │            │
│  └─────────────────────────┘            │
│                                         │
│         [Siguiente →]                   │
│                                         │
├───────┬───────┬───────┬───────┬─────────┤
│  🏠  │  👥  │  📷  │  📄  │  👤    │
└───────┴───────┴───────┴───────┴─────────┘

─── Paso 2: Evidencia ───

│  Foto de evidencia *                    │
│  ┌─────────────────────────┐            │
│  │     📷 Tomar foto       │            │
│  │                         │            │
│  │   [thumbnail de foto]   │            │
│  └─────────────────────────┘            │
│                                         │
│  Firma del beneficiario *               │
│  ┌─────────────────────────┐            │
│  │                         │            │
│  │   [canvas para firma]   │            │
│  │                         │            │
│  │   Firme aquí con su dedo│            │
│  └─────────────────────────┘            │
│  [Limpiar firma]                        │
│                                         │
│  ☑ El usuario acepta la política de     │
│    tratamiento de datos personales      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      ✅ FINALIZAR ACTIVIDAD     │    │
│  └─────────────────────────────────┘    │
```

---

# 7. REGLAS DE NEGOCIO CRÍTICAS

1. **Secuencia obligatoria**: No se puede realizar Momento 1 si Ex-Antes no está completada. No se puede hacer Momento 2 si Momento 1 no está completo. Y así sucesivamente. La app solo habilita la SIGUIENTE actividad pendiente.

2. **Cada actividad en día diferente**: La app valida que la fecha de cada actividad sea diferente a las anteriores de la misma familia.

3. **Un Profesional puede tener familias en uno o varios municipios**: La app muestra selector de municipio cuando el Profesional tiene más de uno asignado.

4. **En cada municipio trabajan entre 3 y 4 Profesionales al mismo tiempo**: El Coordinador asigna familias individualmente a cada Profesional.

5. **Se trabajan entre 20 y 25 municipios**: La entidad puede tener muchos municipios.

6. **Cada municipio tiene entre 30 y 45 familias**: Configurable por municipio.

7. **La firma del Profesional se captura UNA VEZ** (al registrarse o primera actividad) y se reutiliza automáticamente en todos los informes.

8. **La firma del Supervisor** (Coordinador o Apoyo Administrativo) se agrega al firmar/aprobar el informe.

9. **Fotos y firmas se almacenan localmente** si no hay internet y se suben a Supabase Storage cuando hay conexión.

10. **El informe PDF se genera automáticamente** con todos los datos, fotos y firmas reales renderizadas como imágenes.

---

# 8. MÉTRICAS Y DASHBOARD DE SEGUIMIENTO EN TIEMPO REAL

## Pantalla de seguimiento del Coordinador

Debe mostrar en TIEMPO REAL (actualizado con cada sincronización):

**Por Profesional**: Tabla con columnas:
- Nombre del Profesional
- Municipio(s) asignado(s)
- Meta de familias
- Ex-Antes completadas / meta
- Momento 1 completados / meta
- Momento 2 completados / meta
- Momento 3 completados / meta
- Ex-Post completadas / meta
- % Avance general
- Última sincronización

**Por Municipio**: Tabla con columnas:
- Nombre del municipio
- Familias meta
- Familias registradas (Ex-Antes)
- Familias completadas (5/5 actividades)
- % Avance
- Profesionales asignados

**Gráficas**:
- Barras horizontales: avance por municipio (0-100%)
- Circular: distribución por estado (Pendiente, En progreso, Completado)
- Línea: actividades completadas por día (últimos 30 días)

---

# 9. PALETA DE COLORES Y DISEÑO

```css
:root {
  --primary: #1B3A4B;        /* Azul oscuro institucional */
  --secondary: #3D7B9E;      /* Azul medio */
  --accent: #27AE60;         /* Verde éxito */
  --warning: #F39C12;        /* Naranja */
  --error: #E74C3C;          /* Rojo */
  --bg-light: #F7F9FC;       /* Fondo claro */
  --text-dark: #1C2833;      /* Texto principal */
  --text-gray: #6B7280;      /* Texto secundario */
  --border: #E5E7EB;         /* Bordes */
}
```

Tipografía sans-serif profesional. Bordes redondeados (8px). Sombras sutiles en tarjetas.

---

# 10. PASO A PASO DE IMPLEMENTACIÓN (ORDEN EXACTO)

## Sprint 1 (Sem 1-2): Fundación
1. Crear proyecto React + Vite + TypeScript + TailwindCSS + shadcn/ui
2. Crear proyecto Supabase, ejecutar TODAS las tablas SQL de la sección 5
3. Configurar Supabase Auth con email/password
4. Configurar RLS por entity_id en todas las tablas
5. Configurar Capacitor.js con plugins (camera, geolocation, network)
6. Configurar Dexie.js con stores offline (families, activities, syncQueue, media)
7. Implementar sistema de rutas protegidas por rol (4 roles)
8. Implementar login y registro

## Sprint 2 (Sem 3-4): Administrador + Coordinador base
9. Layout Administrador: sidebar + dashboard
10. CRUD de Entidades (crear, editar, listar, activar/suspender)
11. Formulario de creación de entidad con todos los campos del Paso 1
12. Layout Coordinador: sidebar + dashboard con KPIs
13. Gestión de equipo: invitar Apoyo Administrativo y Profesionales
14. Asignación de municipios a Profesionales
15. CRUD de Familias: crear, editar, listar, asignar a Profesional
16. Carga masiva de familias desde Excel/CSV
17. Vista de familias con estado de las 5 actividades (5 indicadores ⬜/✅)

## Sprint 3 (Sem 5-6): Profesional de Campo
18. Layout Profesional: **bottom navigation bar** con 5 tabs
19. Tab Inicio: dashboard personal con KPIs y observaciones
20. Tab Familias: lista de familias asignadas con estado de actividades
21. Lógica de secuencia obligatoria (solo habilitar siguiente actividad)
22. Formulario de Caracterización Ex-Antes (3 páginas: datos, social, evidencia)
23. Formulario de Momentos de Encuentro (2 páginas: datos, evidencia)
24. Formulario de Caracterización Ex-Post (2 páginas: evaluación, evidencia)
25. Captura de foto con cámara nativa (Capacitor)
26. Firma digital con canvas táctil (react-signature-canvas)
27. Captura GPS automática
28. Auto-guardado en IndexedDB (Dexie.js)
29. Indicador de conexión permanente en barra superior

## Sprint 4 (Sem 7-8): Sincronización + Offline
30. Motor de sincronización: detección de red + cola + subida automática
31. Subida de fotos y firmas a Supabase Storage
32. Descarga de familias asignadas para trabajo offline
33. Descarga de observaciones del Coordinador
34. Indicador visual verde/naranja/rojo con contador
35. Sync manual desde Mi Perfil
36. Validación de fecha diferente por actividad

## Sprint 5 (Sem 9-10): Revisión + Informes
37. Layout Apoyo Administrativo: sidebar + dashboard
38. Pantalla de revisión de informes individuales
39. Marcar observaciones o dar visto bueno
40. Sistema de observaciones (Coordinador → Profesional)
41. Dashboard de seguimiento en tiempo real del Coordinador (tabla + gráficas)
42. Seguimiento por Profesional y por Municipio en números y % (como pide el documento)

## Sprint 6 (Sem 11-12): Generación de Informes PDF + QA
43. Generar Informe por Profesional (PDF): página resumen + fichas individuales
44. Renderizar fotos de evidencia y firmas como imágenes en el PDF
45. Formato EXACTO como las imágenes de referencia (sección 4)
46. Generar Informe por Municipio
47. Generar Informe por tipo de Actividad
48. Generar Informe consolidado
49. Generar Informe de Impacto Poblacional (estadísticas de enfoque diferencial)
50. Firma electrónica del Coordinador en informes
51. Build APK Android con Capacitor
52. Testing completo: offline, sync, informes, fotos, firmas
53. Corrección de bugs
54. Deploy producción

---

**CONTROL G — El sistema que transforma la gestión social en campo**

*DRAN DIGITAL S.A.S. — Cartagena de Indias, Colombia — 2026*
