# CONTROL G — Implementación para el Sector Público Colombiano

## Cumplimiento Normativo, Experiencia de Usuario Centrada en el Ciudadano, Arquitectura Técnica y Plan de Implementación Basado en Formularios Reales de Caracterización Territorial

**Caso de referencia**: Formulario de Caracterización Ex-Antes — Secretaría de Seguridad de Bolívar
**Aplicación**: Control G — Plataforma Offline-First de Recolección de Datos en Campo

**DRAN DIGITAL S.A.S.** — NIT: 901.359.114 — Cartagena de Indias, Colombia

Abril 2026 — Versión 1.0

---

# Tabla de Contenido

1. Análisis del Documento de Referencia
2. Momentos del Servicio Aplicados a Control G
3. Caracterización de Usuarios del Sistema
4. Arquitectura del Sistema Adaptada al Sector Público
5. Modelo de Datos para Enfoque Diferencial
6. Flujos de Interacción por Momento y por Rol
7. Diseño UI/UX — Accesibilidad y Lenguaje Claro
8. Validaciones Inteligentes y Microcopy
9. Requerimientos Backend — Cumplimiento Institucional
10. Seguridad y Protección de Datos (Ley 1581/2012)
11. Interoperabilidad con Sistemas del Estado
12. Dashboards y Reportes Institucionales
13. Formulario de Caracterización Ex-Antes Digitalizado
14. Checklist de Cumplimiento
15. Plan de Implementación Sector Público

---

# 1. Análisis del Documento de Referencia

## 1.1 Estructura del Formulario Analizado

El documento Excel proporcionado corresponde a un instrumento real de la **Secretaría de Seguridad de Bolívar** para programas de atención a familias beneficiarias. Contiene dos hojas:

### Hoja 1: Registro del Programa

| Campo | Valor de ejemplo | Función |
|---|---|---|
| Unidad Ejecutora | Secretaría de Seguridad de Bolívar | Identifica la entidad responsable |
| Departamento | Bolívar | Ubicación administrativa nivel 1 |
| Municipio | XXXXXXX | Ubicación administrativa nivel 2 |
| Nombre del Proyecto | (vacío) | Proyecto asociado al BPIN |
| Código BPIN | (vacío) | Código del Banco de Programas y Proyectos de Inversión Nacional |
| Actividad o Programa | (vacío) | Actividad específica del proyecto |
| Familias Beneficiarias | 20 | Meta de familias a atender |
| Caracterizaciones Ex-Antes | 20 | Línea base antes de la intervención |
| Momentos de Encuentro 1 | 20 | Primera intervención/taller |
| Momentos de Encuentro 2 | 20 | Segunda intervención/taller |
| Momentos de Encuentro 3 | 20 | Tercera intervención/taller |
| Caracterizaciones Ex-Post | 20 | Medición posterior a la intervención |
| Total Eventos Municipio | 100 | Sumatoria de todos los eventos |
| Eventos por Familia | 5 | Promedio de eventos por familia |

### Hoja 2: Caracterización Ex-Antes

El formulario de caracterización contiene las siguientes secciones:

**Sección A — Ubicación geográfica**: Departamento, Municipio, Corregimiento, Vereda, Dirección, Fecha (Año/Mes/Día).

**Sección B — Cabeza de familia**: Primer nombre, Segundo nombre, Primer apellido, Segundo apellido, Rol en el núcleo familiar (Padre/Madre/Cuidador Cabeza de Familia).

**Sección C — Miembros del hogar** (grupo repetitivo con 15 columnas por persona):

| Columna | Opciones | Categoría normativa |
|---|---|---|
| Vínculo con cabeza de familia | Esposo(a), Hijo(a), Nieto(a), Cuñado(a), Suegro(a), Yerno(a), Hijastro(a), Tío(a), Primo(a), Ninguno | Composición familiar |
| Sexo | Hombre, Mujer | Dato biológico |
| Identidad de Género | Masculino, Femenino, Transgénero, No sabe/No informa | Enfoque diferencial de género |
| Orientación Sexual | Asexual, Bisexual, Gay, Heterosexual, Lesbiana, Queer, No sabe/No informa | Enfoque diferencial LGBTIQ+ |
| Nivel Escolar | Primaria, Secundaria, Técnica o Tecnológica, Profesional, Postgrado, No informa | Educación |
| Enfoque Diferencial Poblacional | Comunidad Negra, Afrocolombiano, Afrodescendiente, Palenquero, Raizal, Room, Mestizo, Ninguno | Enfoque étnico-racial (Ley 70/1993) |
| Discapacidad | Auditiva, Visual, Sordoceguera, Intelectual, Psicosocial (Mental), Física, Múltiple, Ninguna | Enfoque de discapacidad (Ley 1618/2013) |
| Condición Especial | Víctima, Campesino, Joven Rural, Mujer Campesina, Mujer Rural, Mujer Pesquera | Enfoque de vulnerabilidad |
| Enfoque de Paz | Desmovilizado, Reincorporado, Reinsertado, Reintegrado, Ninguno, No informa | Acuerdo de Paz (2016) |
| Estado Civil | Soltero, Casado, Unión Libre, Separado, Divorciado, Viudo | Dato civil |
| Liderazgo | Comunitario, JAC, Religioso, Político, Ambiental, Animalista, Étnico, Social, Defensor de Derechos, Espiritual, Ninguno, Otro | Capital social |
| Fecha de Nacimiento | Año, Mes, Día | Dato demográfico |
| Documento de Identificación | Tarjeta de Identidad, Cédula de Ciudadanía, Cédula de Extranjería, Pasaporte, Registro Civil | Identificación legal |
| Número de Documento | Texto numérico | Identificación única |
| Correo Electrónico | Primer correo, Segundo correo | Contacto |
| Teléfono Celular | Primer número, Segundo número | Contacto |

**Sección D — Cierre**: Consentimiento informado + Firma digital.

## 1.2 Implicaciones para Control G

Este formulario revela las exigencias reales del sector público colombiano que Control G debe soportar nativamente:

1. **Enfoque diferencial obligatorio**: Toda caracterización gubernamental exige capturar datos de género, etnia, discapacidad, condición de víctima y enfoque de paz. No es opcional.
2. **Momentos del servicio**: El programa opera en 5 momentos (Ex-Antes → 3 Encuentros → Ex-Post). Control G debe soportar formularios vinculados temporalmente a una misma familia.
3. **Grupo repetitivo complejo**: La sección de miembros del hogar tiene 15+ campos por persona y puede repetirse hasta 20 veces.
4. **Consentimiento y firma digital**: Obligatorio para cumplimiento de Ley 1581/2012 (Habeas Data).
5. **Código BPIN**: Los proyectos del sector público se vinculan al Banco de Programas y Proyectos de Inversión Nacional. Control G debe capturar este identificador.
6. **Jerarquía geográfica completa**: Departamento → Municipio → Corregimiento → Vereda → Dirección.

---

# 2. Momentos del Servicio Aplicados a Control G

## 2.1 Definición de Momentos

Basados en el documento analizado y en la metodología de "Momentos del Servicio" de la política de servicio al ciudadano del Gobierno de Colombia (DNP), Control G estructura la experiencia en tres macro-momentos:

### MOMENTO 1 — ANTES del servicio (Preparación)

| Actor | Acción | Pantalla en Control G |
|---|---|---|
| Coordinador | Define el proyecto, vincula código BPIN, establece metas de familias | Crear Proyecto → Registro del Programa |
| Coordinador | Diseña o selecciona el formulario de caracterización Ex-Antes | Form Builder / Plantillas |
| Coordinador | Asigna zonas y técnicos al proyecto | Gestión de Equipo |
| Coordinador | Genera plantillas PDF imprimibles para contingencia | Form Builder → Generar PDF |
| Técnico | Recibe asignación, descarga formularios y plantillas a su dispositivo | Tab Inicio → Formularios / Plantillas |
| Técnico | Descarga tiles de mapa para trabajo offline | Configuración → Mapas offline |
| Asistente | Revisa asignaciones, verifica disponibilidad del equipo | Dashboard Asistente |

**Experiencia esperada**: El técnico llega al campo con todo descargado en su dispositivo. No depende de conectividad. Sabe exactamente qué formularios diligenciar, en qué zona, y cuántas familias son su meta.

### MOMENTO 2 — DURANTE el servicio (Recolección)

| Actor | Acción | Pantalla en Control G |
|---|---|---|
| Técnico | Visita familia, inicia formulario de Caracterización Ex-Antes | Tab Formularios → Iniciar |
| Técnico | Captura datos del hogar (ubicación, cabeza de familia) | Formulario Página 1 |
| Técnico | Registra cada miembro del hogar con enfoque diferencial completo | Formulario Página 2 (grupo repetitivo) |
| Técnico | Obtiene consentimiento informado y firma digital | Formulario Página 3 |
| Técnico | Toma fotos de evidencia (fachada, condiciones) | Campo de fotografía |
| Técnico | Captura GPS automático | Campo de geolocalización |
| Técnico | Si necesita usar formulario en papel: escanea con OCR | Tab Escanear |
| Técnico | Al terminar, los datos se auto-guardan offline | Auto-guardado IndexedDB |
| Coordinador | Monitorea avance en tiempo real (cuando técnicos sincronizan) | Dashboard → Mapa de campo |

**Experiencia esperada**: El técnico interactúa con la familia de forma respetuosa y eficiente. El formulario guía la conversación con lenguaje claro. Los campos de enfoque diferencial se presentan con sensibilidad. Todo funciona sin internet.

### MOMENTO 3 — DESPUÉS del servicio (Consolidación y seguimiento)

| Actor | Acción | Pantalla en Control G |
|---|---|---|
| Técnico | Al detectar internet, los datos se sincronizan automáticamente | Indicador de sync verde |
| Asistente | Pre-valida formularios recibidos (revisión de calidad) | Revisión de Formularios |
| Coordinador | Aprueba datos validados | Datos Recolectados → Validar |
| Coordinador | Genera reportes de avance por zona, municipio, departamento | Reportes |
| Coordinador | Exporta datos en formatos institucionales (Excel, DANE) | Exportar |
| Coordinador | Vincula familias caracterizadas a los siguientes Momentos de Encuentro | Gestión de Proyecto → Momentos |
| Coordinador | Al finalizar los 3 Encuentros, aplica Caracterización Ex-Post | Formularios → Ex-Post |
| Coordinador | Compara Ex-Antes vs Ex-Post para medir impacto | Reportes → Análisis comparativo |

**Experiencia esperada**: Los datos fluyen sin fricción desde el campo hasta los reportes institucionales. El coordinador puede responder auditorías y rendición de cuentas con datos trazables.

## 2.2 Momentos de Encuentro (Específico del Programa)

El documento revela un modelo de intervención con 5 eventos por familia:

```
Familia "X"
│
├── Evento 1: Caracterización Ex-Antes (línea base)
│     → Formulario de caracterización completo
│     → Datos demográficos + enfoque diferencial
│
├── Evento 2: Momento de Encuentro 1
│     → Formulario de seguimiento / taller 1
│     → Asistencia + actividades realizadas
│
├── Evento 3: Momento de Encuentro 2
│     → Formulario de seguimiento / taller 2
│
├── Evento 4: Momento de Encuentro 3
│     → Formulario de seguimiento / taller 3
│
└── Evento 5: Caracterización Ex-Post (cierre)
      → Mismo formulario de caracterización
      → Permite comparar impacto antes/después
```

### Implicación para Control G

Control G debe soportar el concepto de **"Familia como entidad longitudinal"**: una familia se registra una vez (Ex-Antes) y se le vinculan múltiples eventos/formularios a lo largo del programa. Esto requiere:

- Tabla `beneficiary_families` que persiste a lo largo del proyecto.
- Cada formulario de Momento de Encuentro se vincula al `family_id`.
- Comparación Ex-Antes vs Ex-Post por familia.

---

# 3. Caracterización de Usuarios del Sistema

## 3.1 Perfiles de Usuario

Basados en el contexto institucional del documento y la realidad operativa:

### Perfil 1: Ciudadano / Familia Beneficiaria

| Atributo | Detalle |
|---|---|
| Rol en el sistema | Sujeto de la caracterización (no es usuario directo de la app) |
| Interacción | A través del técnico de campo que lo visita |
| Contexto | Zonas rurales, corregimientos, veredas de Bolívar. Población vulnerable. |
| Necesidades | Proceso rápido, respetuoso, que no requiera repetir información. Consentimiento claro. |
| Barreras | Analfabetismo digital, desconfianza institucional, situación de vulnerabilidad. |
| Expectativa | Que la información recolectada se use para mejorar su situación, no para perjudicarlo. |

### Perfil 2: Técnico de Campo / Caracterizador

| Atributo | Detalle |
|---|---|
| Rol en el sistema | `technician` — Recolector directo de datos |
| Dispositivo | Celular Android gama media (5.5"-6.5"), posiblemente con pantalla rota o batería limitada |
| Conectividad | Nula o intermitente en zonas rurales de Bolívar |
| Habilidades digitales | Básicas a intermedias. Familiarizado con WhatsApp pero no con apps empresariales. |
| Contexto físico | Sol directo (necesita alto contraste), humedad, polvo, caminar mucho |
| Necesidades | App que funcione sin internet, formularios fáciles de seguir, auto-guardado, poco consumo de batería |
| Barreras | Formularios largos (15 campos × N miembros), fatiga, tiempo limitado por familia |
| Expectativa | Herramienta que no falle, que guarde su trabajo, que sea más rápida que el papel |

### Perfil 3: Asistente de Coordinación

| Atributo | Detalle |
|---|---|
| Rol en el sistema | `assistant` — Supervisor intermedio |
| Dispositivo | Tablet o laptop con conectividad intermitente |
| Habilidades | Intermedias. Experiencia con Excel y plataformas gubernamentales. |
| Necesidades | Ver avance de sus técnicos, validar calidad de datos, comunicarse con el equipo |
| Expectativa | Control de su subgrupo sin depender del coordinador para cada decisión |

### Perfil 4: Coordinador / Funcionario Responsable

| Atributo | Detalle |
|---|---|
| Rol en el sistema | `coordinator` — Líder operativo del proyecto |
| Dispositivo | Laptop o desktop con conectividad estable (oficina de la Secretaría) |
| Habilidades | Avanzadas. Maneja BPIN, formularios institucionales, reportes para entes de control. |
| Necesidades | Diseñar formularios que cumplan requisitos institucionales, monitorear avance, exportar datos para rendición de cuentas, vincular a código BPIN |
| Expectativa | Plataforma que genere los reportes que le piden los entes de control sin tener que procesar manualmente en Excel |

### Perfil 5: Superadministrador (DRAN DIGITAL)

| Atributo | Detalle |
|---|---|
| Rol en el sistema | `superadmin` — Operador de la plataforma |
| Necesidades | Gestionar organizaciones cliente (secretarías, alcaldías, ONGs), planes, facturación |

## 3.2 Adaptación de la Interfaz por Perfil

| Elemento UI | Técnico | Asistente | Coordinador | Superadmin |
|---|---|---|---|---|
| Navegación | Bottom nav bar 5 tabs | Sidebar simplificado | Sidebar completo | Sidebar completo |
| Tamaño de fuente | 16px mínimo (lectura a sol) | 14px | 14px | 14px |
| Contraste | WCAG AAA (7:1) | WCAG AA (4.5:1) | WCAG AA | WCAG AA |
| Touch targets | 48px mínimo | 44px | 44px | Estándar |
| Complejidad | Mínima, guiado paso a paso | Media | Alta | Alta |
| Modo offline | Completo | Parcial | No requerido | No requerido |
| Idioma | Ciudadano (sin tecnicismos) | Técnico-operativo | Técnico-institucional | Técnico |

---

# 4. Arquitectura del Sistema Adaptada al Sector Público

## 4.1 Principios de Arquitectura para Entidades Públicas

1. **Soberanía de datos**: Opción de hosting en servidores colombianos (Contabo/VPS en Colombia o Supabase self-hosted).
2. **Trazabilidad total**: Cada acción queda registrada en audit_log con timestamp, usuario, IP, dispositivo y GPS.
3. **Interoperabilidad**: API REST documentada compatible con estándares de datos abiertos de Colombia.
4. **Multi-tenancy seguro**: Cada entidad (Secretaría, Alcaldía, ONG) es un tenant aislado con RLS.
5. **Escalabilidad institucional**: Un proyecto puede tener miles de familias y decenas de técnicos simultáneos.
6. **Cumplimiento normativo**: Ley 1581/2012 (Datos Personales), Ley 1712/2014 (Transparencia), Ley 1618/2013 (Discapacidad), CONPES 3920 (Datos Abiertos).

## 4.2 Capas del Sistema (Sector Público)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                         │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────────┐  │
│  │ App Técnico  │ │ Dashboard   │ │ Portal de Transparencia  │  │
│  │ (PWA/APK/   │ │ Coordinador │ │ (Datos abiertos,         │  │
│  │  IPA)       │ │ (Web)       │ │  reportes públicos)      │  │
│  │             │ │             │ │                          │  │
│  │ WCAG AA+    │ │ WCAG AA     │ │ WCAG AA                  │  │
│  │ Offline-    │ │             │ │                          │  │
│  │ first       │ │             │ │                          │  │
│  └─────────────┘ └─────────────┘ └──────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    CAPA DE SERVICIOS                            │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────────┐  │
│  │ Supabase    │ │ Edge Fns    │ │ n8n                      │  │
│  │ Auth + RLS  │ │ (OCR,       │ │ (Alertas, reportes       │  │
│  │ + Realtime  │ │  Reportes,  │ │  automáticos, webhooks   │  │
│  │ + Storage   │ │  Export)    │ │  institucionales)        │  │
│  └─────────────┘ └─────────────┘ └──────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    CAPA DE DATOS                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ PostgreSQL (Supabase)                                   │    │
│  │                                                         │    │
│  │ ┌────────────┐ ┌────────────────┐ ┌──────────────────┐ │    │
│  │ │ Datos Core │ │ Enfoque        │ │ Auditoría y      │ │    │
│  │ │ (orgs,     │ │ Diferencial    │ │ Trazabilidad     │ │    │
│  │ │ users,     │ │ (género,       │ │ (audit_log,      │ │    │
│  │ │ projects,  │ │ etnia,         │ │  sync_log,       │ │    │
│  │ │ forms,     │ │ discapacidad,  │ │  consent_log)    │ │    │
│  │ │ responses) │ │ paz, víctima)  │ │                  │ │    │
│  │ └────────────┘ └────────────────┘ └──────────────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────┐ ┌─────────────────────────────────┐    │
│  │ IndexedDB (Dexie)   │ │ Supabase Storage                │    │
│  │ (Datos offline del  │ │ (Fotos, firmas, documentos,     │    │
│  │  técnico en campo)  │ │  PDFs, escaneos OCR)            │    │
│  └─────────────────────┘ └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

# 5. Modelo de Datos para Enfoque Diferencial

El formulario de la Secretaría de Seguridad de Bolívar exige campos de enfoque diferencial que son **obligatorios en todos los programas sociales del Estado colombiano**. Control G debe soportarlos como catálogos nativos.

## 5.1 Tablas de Catálogos de Enfoque Diferencial

```sql
-- ══════════════════════════════════════
-- CATÁLOGOS DE ENFOQUE DIFERENCIAL
-- Basados en el formulario real de la Secretaría de Seguridad de Bolívar
-- y en la normatividad colombiana vigente
-- ══════════════════════════════════════

-- Vínculo familiar
CREATE TABLE cat_family_bonds (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO cat_family_bonds (code, label, sort_order) VALUES
('esposo', 'Esposo(a)', 1),
('hijo', 'Hijo(a)', 2),
('nieto', 'Nieto(a)', 3),
('cunado', 'Cuñado(a)', 4),
('suegro', 'Suegro(a)', 5),
('yerno', 'Yerno(a)', 6),
('hijastro', 'Hijastro(a)', 7),
('tio', 'Tío(a)', 8),
('primo', 'Primo(a)', 9),
('ninguno', 'Ninguno', 10);

-- Sexo biológico
CREATE TABLE cat_sex (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  label VARCHAR(50) NOT NULL
);

INSERT INTO cat_sex (code, label) VALUES
('hombre', 'Hombre'),
('mujer', 'Mujer');

-- Identidad de género (Decreto 762 de 2018, Sentencia T-063/15)
CREATE TABLE cat_gender_identity (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL
);

INSERT INTO cat_gender_identity (code, label) VALUES
('masculino', 'Masculino'),
('femenino', 'Femenino'),
('transgenero', 'Transgénero'),
('no_informa', 'No sabe / No informa');

-- Orientación sexual
CREATE TABLE cat_sexual_orientation (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL
);

INSERT INTO cat_sexual_orientation (code, label) VALUES
('asexual', 'Asexual'),
('bisexual', 'Bisexual'),
('gay', 'Gay'),
('heterosexual', 'Heterosexual'),
('lesbiana', 'Lesbiana'),
('queer', 'Queer'),
('no_informa', 'No sabe / No informa');

-- Nivel escolar
CREATE TABLE cat_education_level (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL
);

INSERT INTO cat_education_level (code, label) VALUES
('ninguno', 'Ninguno'),
('primaria', 'Primaria'),
('secundaria', 'Secundaria'),
('tecnica', 'Técnica o Tecnológica'),
('profesional', 'Profesional'),
('postgrado', 'Postgrado'),
('no_informa', 'No informa');

-- Enfoque diferencial poblacional / étnico-racial
-- (Ley 70/1993, Decreto 4635/2011, Ley 21/1991)
CREATE TABLE cat_ethnic_group (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  legal_reference TEXT
);

INSERT INTO cat_ethnic_group (code, label, legal_reference) VALUES
('comunidad_negra', 'Comunidad Negra', 'Ley 70/1993'),
('afrocolombiano', 'Afrocolombiano', 'Ley 70/1993'),
('afrodescendiente', 'Afrodescendiente', 'Ley 70/1993'),
('palenquero', 'Palenquero', 'Ley 70/1993, UNESCO'),
('raizal', 'Raizal', 'Constitución Art. 310'),
('room', 'Room (Gitano)', 'Decreto 2957/2010'),
('indigena', 'Indígena', 'Ley 21/1991'),
('mestizo', 'Mestizo', NULL),
('ninguno', 'Ninguno', NULL);

-- Discapacidad (Ley 1618/2013, Convención ONU Discapacidad)
CREATE TABLE cat_disability (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  legal_reference TEXT
);

INSERT INTO cat_disability (code, label, legal_reference) VALUES
('auditiva', 'Auditiva', 'Ley 1618/2013'),
('visual', 'Visual', 'Ley 1618/2013'),
('sordoceguera', 'Sordoceguera', 'Ley 982/2005'),
('intelectual', 'Intelectual', 'Ley 1618/2013'),
('psicosocial', 'Psicosocial (Mental)', 'Ley 1616/2013'),
('fisica', 'Física', 'Ley 1618/2013'),
('multiple', 'Múltiple', 'Ley 1618/2013'),
('ninguna', 'Ninguna', NULL);

-- Condición especial
CREATE TABLE cat_special_condition (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL
);

INSERT INTO cat_special_condition (code, label) VALUES
('victima', 'Víctima del conflicto armado'),
('campesino', 'Campesino'),
('joven_rural', 'Joven Rural'),
('mujer_campesina', 'Mujer Campesina'),
('mujer_rural', 'Mujer Rural'),
('mujer_pesquera', 'Mujer Pesquera'),
('ninguna', 'Ninguna');

-- Enfoque de paz (Acuerdo de Paz 2016, Ley 1957/2019 JEP)
CREATE TABLE cat_peace_approach (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  legal_reference TEXT
);

INSERT INTO cat_peace_approach (code, label, legal_reference) VALUES
('desmovilizado', 'Desmovilizado', 'Ley 975/2005'),
('reincorporado', 'Reincorporado', 'Acuerdo de Paz 2016'),
('reinsertado', 'Reinsertado', 'Decreto 128/2003'),
('reintegrado', 'Reintegrado', 'ARN - CONPES 3554'),
('ninguno', 'Ninguno', NULL),
('no_informa', 'No informa', NULL);

-- Estado civil
CREATE TABLE cat_marital_status (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  label VARCHAR(50) NOT NULL
);

INSERT INTO cat_marital_status (code, label) VALUES
('soltero', 'Soltero(a)'),
('casado', 'Casado(a)'),
('union_libre', 'Unión Libre'),
('separado', 'Separado(a)'),
('divorciado', 'Divorciado(a)'),
('viudo', 'Viudo(a)');

-- Tipo de liderazgo
CREATE TABLE cat_leadership_type (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL
);

INSERT INTO cat_leadership_type (code, label) VALUES
('comunitario', 'Comunitario'),
('jac', 'Junta de Acción Comunal (JAC)'),
('religioso', 'Religioso'),
('politico', 'Político'),
('ambiental', 'Ambiental'),
('animalista', 'Animalista'),
('etnico', 'Étnico'),
('social', 'Social'),
('defensor_derechos', 'Defensor de Derechos Humanos'),
('espiritual', 'Espiritual'),
('ninguno', 'Ninguno'),
('otro', 'Otro');

-- Tipo de documento de identidad
CREATE TABLE cat_id_document_type (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(5)
);

INSERT INTO cat_id_document_type (code, label, abbreviation) VALUES
('ti', 'Tarjeta de Identidad', 'TI'),
('cc', 'Cédula de Ciudadanía', 'CC'),
('ce', 'Cédula de Extranjería', 'CE'),
('pasaporte', 'Pasaporte', 'PA'),
('rc', 'Registro Civil', 'RC'),
('pep', 'Permiso Especial de Permanencia', 'PEP'),
('ppt', 'Permiso por Protección Temporal', 'PPT');

-- Rol en el núcleo familiar (cabeza de familia)
CREATE TABLE cat_family_role (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL
);

INSERT INTO cat_family_role (code, label) VALUES
('padre_cabeza', 'Padre Cabeza de Familia'),
('madre_cabeza', 'Madre Cabeza de Familia'),
('cuidador_cabeza', 'Cuidador(a) Cabeza de Familia');
```

## 5.2 Tabla: beneficiary_families

Entidad central que persiste a lo largo de todo el programa (Ex-Antes → Encuentros → Ex-Post).

```sql
CREATE TABLE beneficiary_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  zone_id UUID REFERENCES zones(id),
  
  -- Cabeza de familia
  head_first_name VARCHAR(100) NOT NULL,
  head_second_name VARCHAR(100),
  head_first_lastname VARCHAR(100) NOT NULL,
  head_second_lastname VARCHAR(100),
  head_family_role VARCHAR(30) REFERENCES cat_family_role(code),
  head_id_document_type VARCHAR(30) REFERENCES cat_id_document_type(code),
  head_id_number VARCHAR(30),
  head_phone VARCHAR(20),
  head_email VARCHAR(255),
  
  -- Ubicación
  department_id INTEGER REFERENCES departments(id),
  municipality_id INTEGER REFERENCES municipalities(id),
  corregimiento VARCHAR(200),
  vereda VARCHAR(200),
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Programa
  bpin_code VARCHAR(30),           -- Código BPIN del proyecto
  program_name VARCHAR(200),       -- Nombre del programa/actividad
  
  -- Estado del ciclo de momentos
  ex_antes_completed BOOLEAN DEFAULT false,
  ex_antes_response_id UUID REFERENCES form_responses(id),
  encounter_1_completed BOOLEAN DEFAULT false,
  encounter_1_response_id UUID REFERENCES form_responses(id),
  encounter_2_completed BOOLEAN DEFAULT false,
  encounter_2_response_id UUID REFERENCES form_responses(id),
  encounter_3_completed BOOLEAN DEFAULT false,
  encounter_3_response_id UUID REFERENCES form_responses(id),
  ex_post_completed BOOLEAN DEFAULT false,
  ex_post_response_id UUID REFERENCES form_responses(id),
  
  -- Metadatos
  registered_by UUID REFERENCES users(id),
  total_members INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  consent_given BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  consent_signature_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_families_project ON beneficiary_families(project_id);
CREATE INDEX idx_families_zone ON beneficiary_families(zone_id);
CREATE INDEX idx_families_head_id ON beneficiary_families(head_id_number);
```

## 5.3 Tabla: family_members

Cada miembro del hogar con los 15 campos de enfoque diferencial del formulario.

```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES beneficiary_families(id) ON DELETE CASCADE NOT NULL,
  
  -- Datos básicos
  full_name VARCHAR(200) NOT NULL,
  birth_date DATE,
  age INTEGER,  -- Calculado o ingresado
  
  -- Enfoque diferencial (15 campos del formulario real)
  family_bond VARCHAR(20) REFERENCES cat_family_bonds(code),
  sex VARCHAR(20) REFERENCES cat_sex(code),
  gender_identity VARCHAR(30) REFERENCES cat_gender_identity(code),
  sexual_orientation VARCHAR(30) REFERENCES cat_sexual_orientation(code),
  education_level VARCHAR(30) REFERENCES cat_education_level(code),
  ethnic_group VARCHAR(30) REFERENCES cat_ethnic_group(code),
  disability VARCHAR(30) REFERENCES cat_disability(code),
  special_condition VARCHAR(30) REFERENCES cat_special_condition(code),
  peace_approach VARCHAR(30) REFERENCES cat_peace_approach(code),
  marital_status VARCHAR(20) REFERENCES cat_marital_status(code),
  leadership_type VARCHAR(30) REFERENCES cat_leadership_type(code),
  
  -- Identificación
  id_document_type VARCHAR(30) REFERENCES cat_id_document_type(code),
  id_number VARCHAR(30),
  
  -- Contacto
  email_primary VARCHAR(255),
  email_secondary VARCHAR(255),
  phone_primary VARCHAR(20),
  phone_secondary VARCHAR(20),
  
  -- Metadatos
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_members_family ON family_members(family_id);
CREATE INDEX idx_members_id_number ON family_members(id_number);
```

## 5.4 Tabla: consent_log (Trazabilidad del consentimiento)

```sql
CREATE TABLE consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES beneficiary_families(id),
  response_id UUID REFERENCES form_responses(id),
  
  consent_text TEXT NOT NULL,        -- Texto exacto presentado al ciudadano
  consent_given BOOLEAN NOT NULL,
  consent_method VARCHAR(30) CHECK (consent_method IN ('digital_signature', 'verbal', 'paper_scan')),
  signature_media_id UUID REFERENCES form_response_media(id),
  
  given_by_name VARCHAR(200),
  given_by_id_number VARCHAR(30),
  given_at TIMESTAMPTZ NOT NULL,
  
  -- Trazabilidad
  technician_id UUID REFERENCES users(id),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  device_info JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

# 6. Flujos de Interacción por Momento y por Rol

## 6.1 Flujo del Técnico: Momento ANTES

```
[Abre la app]
    │
    ▼
[Tab Inicio] → Ve saludo + proyecto activo + zona asignada
    │
    ▼
[Verifica formularios descargados] → Si no: descarga (necesita internet)
    │
    ▼
[Tab Plantillas] → Descarga PDFs imprimibles de contingencia
    │
    ▼
[Configuración] → Descarga tiles de mapa offline para su zona
    │
    ▼
[LISTO PARA IR A CAMPO]
```

## 6.2 Flujo del Técnico: Momento DURANTE (Caracterización Ex-Antes)

```
[Llega a la vivienda de la familia]
    │
    ▼
[Tab Formularios] → Selecciona "Caracterización Ex-Antes"
    │
    ▼
[PÁGINA 1: Ubicación y Fecha]
    │ ● Departamento (preseleccionado: Bolívar)
    │ ● Municipio (preseleccionado según zona)
    │ ● Corregimiento (lista filtrada)
    │ ● Vereda (texto libre)
    │ ● Dirección (texto libre)
    │ ● Fecha (auto-capturada)
    │ ● GPS (auto-capturado)
    │
    ▼
[PÁGINA 2: Cabeza de Familia]
    │ ● Primer nombre, Segundo nombre
    │ ● Primer apellido, Segundo apellido
    │ ● Rol: Padre / Madre / Cuidador cabeza de familia
    │
    ▼
[PÁGINA 3: Miembros del Hogar] ← Grupo repetitivo
    │ ● Para CADA miembro:
    │   ├── Vínculo (dropdown: Esposo, Hijo, Nieto...)
    │   ├── Sexo (radio: Hombre / Mujer)
    │   ├── Identidad de género (dropdown: Masculino, Femenino, Transgénero, No informa)
    │   ├── Orientación sexual (dropdown: Heterosexual, Gay, Lesbiana... No informa)
    │   ├── Nivel escolar (dropdown)
    │   ├── Enfoque diferencial poblacional (dropdown con grupos étnicos)
    │   ├── Discapacidad (dropdown)
    │   ├── Condición especial (dropdown)
    │   ├── Enfoque de paz (dropdown)
    │   ├── Estado civil (dropdown)
    │   ├── Liderazgo (dropdown)
    │   ├── Fecha de nacimiento (datepicker)
    │   ├── Tipo de documento (dropdown: CC, TI, CE, Pasaporte, RC)
    │   ├── Número de documento (numérico)
    │   ├── Correo electrónico (hasta 2)
    │   └── Teléfono celular (hasta 2)
    │ ● Botón: [+ Agregar otro miembro]
    │ ● (Se repite hasta 20 veces)
    │
    ▼
[PÁGINA 4: Evidencia fotográfica]
    │ ● Foto de fachada (opcional)
    │ ● Foto de condiciones (opcional)
    │
    ▼
[PÁGINA 5: Consentimiento y Cierre]
    │ ● Texto de consentimiento informado (Ley 1581/2012)
    │   "Autorizo a [Entidad] el tratamiento de mis datos personales..."
    │ ● Checkbox: "He leído y acepto"
    │ ● Firma digital (canvas táctil)
    │ ● Botón: [FINALIZAR Y ENVIAR]
    │
    ▼
[Formulario guardado en IndexedDB → Cola de sync]
[Indicador: ☁️ 🔴 "1 pendiente"]
```

## 6.3 Flujo del Técnico: Contingencia (Formulario en Papel)

```
[En campo SIN la app o dispositivo sin batería]
    │
    ▼
[Usa formulario PDF imprimible descargado previamente]
    │
    ▼
[Llena el formulario a mano con la familia]
    │
    ▼
[De vuelta con el dispositivo cargado]
    │
    ▼
[Tab Escanear → Abrir Cámara]
    │
    ▼
[Fotografía cada página del formulario]
    │
    ▼
[OCR procesa y extrae datos campo por campo]
    │
    ▼
[Pantalla de revisión: corrige campos de baja confianza]
    │
    ▼
[Confirma digitalización → Datos integrados al flujo normal]
```

---

# 7. Diseño UI/UX — Accesibilidad y Lenguaje Claro

## 7.1 Cumplimiento WCAG 2.1 Nivel AA (Mínimo)

### Contraste de color

| Contexto | Ratio mínimo | Implementación |
|---|---|---|
| Texto normal (16px+) | 4.5:1 | `--text-dark: #1C2833` sobre `--white: #FFFFFF` → ratio 15.4:1 ✅ |
| Texto grande (18px+ bold) | 3:1 | Misma paleta, cumple ✅ |
| Vista del técnico (uso exterior a sol) | 7:1 (AAA) | Texto negro #000000 sobre fondo blanco para campos de formulario |
| Indicadores de estado | 3:1 + patrón adicional | Verde ✅ + ícono check. Rojo ❌ + ícono X. No depender solo del color. |

### Navegación por teclado

- Todos los elementos interactivos son alcanzables con Tab.
- Orden de tabulación lógico (izq→der, arriba→abajo).
- Focus visible: anillo azul `outline: 2px solid #2E86C1; outline-offset: 2px`.
- Skip links para saltar al contenido principal.

### Lectores de pantalla

- Todos los campos de formulario tienen `<label>` vinculado.
- Imágenes con `alt` descriptivo.
- Íconos decorativos con `aria-hidden="true"`.
- Regiones semánticas: `<header>`, `<nav>`, `<main>`, `<footer>`.
- Alertas con `role="alert"` para errores de validación.
- Estados dinámicos con `aria-live="polite"` para el indicador de sincronización.

### Textos alternativos

- Logo: `alt="Control G - Plataforma de Caracterización Territorial"`.
- Ícono de sync: `aria-label="Estado de sincronización: 3 formularios pendientes"`.
- Fotos de campo: `alt="Fotografía capturada para el formulario [nombre]"`.

## 7.2 Lenguaje Claro — Tabla de Reemplazo

| Término técnico / burocrático | Lenguaje ciudadano (UI del técnico) |
|---|---|
| Diligenciar formulario | Llenar formulario |
| Sincronización pendiente | Datos guardados, se subirán cuando haya internet |
| Geolocalización capturada | Ubicación registrada ✓ |
| Grupo repetitivo | Información de cada persona del hogar |
| Campo obligatorio | Este dato es necesario |
| Validación fallida | Por favor revisa este campo |
| Enfoque diferencial poblacional | ¿A qué grupo étnico pertenece? |
| Condición especial | ¿Tiene alguna condición especial? |
| Enfoque de paz | ¿Está vinculado(a) a algún proceso de paz? |
| Consentimiento informado | Autorización para el uso de sus datos |
| Firma digital | Firme aquí con su dedo |
| OCR procesado | Datos leídos del formulario en papel |
| Indicador de confianza | Precisión de la lectura |
| Offline | Sin conexión a internet |
| Metadata del dispositivo | (No se muestra al técnico) |
| Registro exitoso | ¡Listo! La información fue guardada |
| Queue de sincronización | (No se muestra al técnico) |

## 7.3 Microcopy en Formularios

| Campo | Microcopy (texto de ayuda debajo del campo) |
|---|---|
| Primer nombre | Como aparece en su documento de identidad |
| Número de documento | Solo números, sin puntos ni guiones |
| Correo electrónico | Si no tiene, puede dejarlo vacío |
| Teléfono celular | Incluya el indicativo (ej: 300 123 4567) |
| Enfoque diferencial poblacional | Pregunte con respeto: "¿Usted se reconoce como parte de algún grupo étnico?" |
| Discapacidad | Pregunte: "¿Alguna persona del hogar tiene alguna discapacidad?" |
| Enfoque de paz | Solo pregunte si el contexto es seguro. Si la persona no quiere responder, seleccione "No informa" |
| Firma digital | Pida a la persona que firme con el dedo en la pantalla. Si no puede firmar, indique "Firma a ruego" |

## 7.4 Diseño Mobile-First para el Técnico

### Bottom Navigation Bar (5 tabs)

```
┌──────────────────────────────────────────────────────────┐
│                      CONTENIDO                            │
│                                                           │
│                                                           │
│                                                           │
├───────┬───────┬───────────┬──────────┬──────────────────┤
│  🏠   │  📋   │    📷     │   📄     │     👤           │
│Inicio │Formu- │ ESCANEAR  │Planti-   │ Mi               │
│       │larios │           │llas      │ Perfil           │
└───────┴───────┴───────────┴──────────┴──────────────────┘
                  ▲ Botón central
                  destacado (azul primario,
                  más grande, elevado)
```

Especificaciones:
- Altura del bottom nav: 64px.
- Touch targets: 48px × 48px mínimo por tab.
- Tab activo: ícono lleno + texto en azul primario + indicador superior.
- Tab inactivo: ícono outline + texto en gris.
- Tab central "Escanear": fondo circular azul primario, 56px de diámetro, elevación con sombra.
- Safe area inferior respetada para iPhone con gesture bar.

---

# 8. Validaciones Inteligentes y Microcopy

## 8.1 Validaciones en Tiempo Real

| Campo | Validación | Mensaje de error (lenguaje claro) |
|---|---|---|
| Número de cédula | Regex `^[0-9]{6,10}$` | "El número de cédula debe tener entre 6 y 10 dígitos, solo números" |
| Tarjeta de identidad | Regex `^[0-9]{10,11}$` | "La tarjeta de identidad tiene 10 u 11 dígitos" |
| Teléfono celular | Regex `^3[0-9]{9}$` | "El celular debe empezar con 3 y tener 10 dígitos" |
| Correo electrónico | Formato email válido | "Revise que el correo tenga el formato correcto (ejemplo@correo.com)" |
| Fecha de nacimiento | No futura, no > 120 años | "Revise la fecha: no puede ser en el futuro" |
| Edad vs fecha nacimiento | Consistencia | "La edad no coincide con la fecha de nacimiento" |
| Miembros del hogar | Mínimo 1 | "Debe registrar al menos una persona del hogar" |
| Firma digital | No vacía | "La firma es necesaria para continuar" |
| Consentimiento | Debe estar marcado | "Necesita la autorización de la persona para continuar" |
| GPS | Precisión < 100m | "La ubicación es imprecisa, intente de nuevo en un lugar abierto" |

## 8.2 Validaciones Cruzadas

| Validación | Lógica | Acción |
|---|---|---|
| Cabeza de familia debe estar en miembros | Si no aparece como miembro, alertar | Warning visual (no bloquea) |
| Menor de edad con cédula de ciudadanía | CC solo para mayores de 18 | Error: "Menores de edad usan Tarjeta de Identidad o Registro Civil" |
| Número de documento duplicado | Mismo ID en dos miembros | Warning: "Este número ya fue registrado en otro miembro" |
| Departamento vs municipio | Municipio debe pertenecer al departamento | Auto-filtrar lista de municipios |

---

# 9. Requerimientos Backend — Cumplimiento Institucional

## 9.1 Trazabilidad y Auditoría

Todas las acciones deben quedar registradas en `audit_log`:

```sql
-- Ejemplo: Registro al crear una familia beneficiaria
INSERT INTO audit_log (
  organization_id, user_id, action,
  entity_type, entity_id, details,
  ip_address, device_info, latitude, longitude
) VALUES (
  'uuid-org', 'uuid-technician', 'family.registered',
  'beneficiary_family', 'uuid-family',
  '{"head_name": "María Pérez", "members_count": 5, "zone": "Nelson Mandela"}',
  NULL, '{"model": "Samsung A14", "os": "Android 13"}', 10.3910, -75.5144
);
```

**Eventos auditables mínimos para entidades públicas**:
- `user.login`, `user.logout`, `user.password_changed`
- `project.created`, `project.updated`, `project.closed`
- `form.created`, `form.published`, `form.archived`
- `family.registered`, `family.updated`, `family.consent_given`
- `response.synced`, `response.validated`, `response.approved`, `response.rejected`
- `response.exported`, `response.anonymized`
- `ocr.processed`, `ocr.confirmed`
- `data.exported` (quién exportó, qué datos, cuándo)
- `member.invited`, `member.deactivated`

## 9.2 Protección de Datos (Ley 1581/2012)

| Requisito legal | Implementación en Control G |
|---|---|
| Consentimiento previo, expreso e informado | Texto de consentimiento obligatorio en cada formulario con firma digital |
| Finalidad del tratamiento | El texto de consentimiento debe especificar para qué se usarán los datos |
| Derecho de acceso | API endpoint para consultar datos por número de documento |
| Derecho de rectificación | Funcionalidad de edición de datos (solo Coordinador, con log de auditoría) |
| Derecho de supresión | Funcionalidad de eliminación lógica (soft delete) con log |
| Responsable del tratamiento | Identificado en el texto de consentimiento (la entidad, no DRAN DIGITAL) |
| Encargado del tratamiento | DRAN DIGITAL como encargado, con contrato de encargo |
| Medidas de seguridad | Cifrado, RLS, MFA, backups, logs |
| Registro Nacional de BD | La organización cliente registra su BD ante la SIC |

## 9.3 Exportación para Entes de Control

Control G debe generar exportaciones compatibles con:

| Entidad | Formato requerido | Datos |
|---|---|---|
| Contraloría | Excel con estructura predefinida | Familias, inversión, metas vs ejecutado |
| Procuraduría | PDF con firmas y evidencia | Formularios completos con fotos |
| DANE | CSV con códigos DIVIPOLA | Datos demográficos y geográficos |
| DNP (BPIN) | Indicadores de gestión | Avance del proyecto vs metas |
| Personería | Listado de beneficiarios | Datos básicos + consentimiento |
| Entidad contratante | Dashboard en tiempo real | Avance, cobertura, calidad |

---

# 10. Seguridad y Protección de Datos

## 10.1 Capas de Seguridad

| Capa | Implementación |
|---|---|
| Autenticación | Supabase Auth + JWT + MFA para coordinadores |
| Autorización | RLS por organization_id + role-based access |
| Cifrado en tránsito | HTTPS/TLS 1.3 |
| Cifrado en reposo | AES-256 en IndexedDB (datos sensibles) |
| Protección XSS | React (escape automático) + Content Security Policy |
| Protección CSRF | SameSite cookies + token de verificación |
| Protección SQL Injection | Supabase PostgREST (parametrizado) + RLS |
| Rate limiting | 100 req/min por usuario |
| Sesiones | JWT con expiración 1h + refresh token |
| Datos sensibles | Números de documento cifrados en BD con pgcrypto |
| Backups | Automáticos diarios (Supabase managed) |
| Monitoreo | Sentry (errores) + audit_log (acciones) |

## 10.2 Clasificación de Datos Sensibles

| Dato | Nivel de sensibilidad | Tratamiento |
|---|---|---|
| Nombre completo | Medio | Almacenado, exportable con consentimiento |
| Número de documento | Alto | Cifrado en BD con pgcrypto |
| Orientación sexual | Muy alto | Cifrado, solo accesible por Coordinador, excluido de exportaciones por defecto |
| Identidad de género | Muy alto | Mismo tratamiento que orientación sexual |
| Discapacidad | Alto | Cifrado, exportable solo con anonimización |
| Condición de víctima | Muy alto | Cifrado, acceso restringido, no exportable sin autorización expresa |
| Enfoque de paz | Muy alto | Cifrado, acceso ultra-restringido |
| Geolocalización | Alto | Almacenada con precisión reducida en exportaciones (barrio, no punto exacto) |
| Firma digital | Alto | Supabase Storage con acceso privado |

---

# 11. Interoperabilidad con Sistemas del Estado

## 11.1 API REST Documentada

Control G expone una API REST con los siguientes endpoints para integración con otros sistemas del Estado:

```
# Autenticación
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

# Proyectos
GET    /api/v1/projects
GET    /api/v1/projects/:id
GET    /api/v1/projects/:id/progress   → Avance vs metas

# Familias beneficiarias
GET    /api/v1/families?project_id=X
GET    /api/v1/families/:id
GET    /api/v1/families/:id/members
GET    /api/v1/families/:id/moments    → Estado de los 5 momentos

# Datos recolectados
GET    /api/v1/responses?project_id=X&zone_id=Y
GET    /api/v1/responses/:id

# Exportación
POST   /api/v1/export/excel    → Body: {project_id, filters, anonymize}
POST   /api/v1/export/csv
POST   /api/v1/export/dane     → Formato DANE con códigos DIVIPOLA

# Reportes
GET    /api/v1/reports/progress?project_id=X
GET    /api/v1/reports/differential?project_id=X  → Estadísticas de enfoque diferencial
GET    /api/v1/reports/coverage?project_id=X      → Cobertura geográfica

# Catálogos
GET    /api/v1/catalogs/departments
GET    /api/v1/catalogs/municipalities?department_id=X
GET    /api/v1/catalogs/ethnic-groups
GET    /api/v1/catalogs/disabilities
```

## 11.2 Estándares de Datos Abiertos

- Formato JSON-LD para datos estructurados.
- Cumplimiento CONPES 3920 (Política de Explotación de Datos).
- Metadatos Dublin Core en exportaciones.
- Códigos DIVIPOLA del DANE en todos los registros geográficos.

---

# 12. Dashboards y Reportes Institucionales

## 12.1 Dashboard de Avance del Programa (Coordinador)

```
┌─────────────────────────────────────────────────────────────┐
│  PROYECTO: Caracterización Socioeconómica Nelson Mandela    │
│  BPIN: 2024-011-XXX    Entidad: Secretaría de Seguridad    │
├───────────┬───────────┬───────────┬───────────┬─────────────┤
│  FAMILIAS │ EX-ANTES  │ENCUENTROS │ EX-POST   │  AVANCE     │
│    20     │   18/20   │  42/60    │   0/20    │   60%       │
│   meta    │   90% ✅  │   70% 🟡  │   0% 🔴   │   ████░░   │
└───────────┴───────────┴───────────┴───────────┴─────────────┘
```

## 12.2 Reporte de Enfoque Diferencial (Obligatorio para entidades públicas)

El dashboard debe mostrar desagregación de beneficiarios por:

- **Sexo**: Hombres / Mujeres (gráfica de torta).
- **Grupo étnico**: Distribución por grupo poblacional (barras horizontales).
- **Discapacidad**: Personas con discapacidad vs sin discapacidad (con tipo).
- **Rango de edad**: Niños (0-12), Adolescentes (13-17), Jóvenes (18-28), Adultos (29-59), Adultos mayores (60+).
- **Enfoque de paz**: Personas vinculadas a procesos de paz.
- **Condición de víctima**: Víctimas del conflicto armado.
- **Estado civil**: Distribución.
- **Nivel educativo**: Distribución.

Estos reportes son exigidos por la Contraloría, la Procuraduría y los entes territoriales en toda rendición de cuentas.

---

# 13. Formulario de Caracterización Ex-Antes Digitalizado

## 13.1 Schema JSONB para Control G

A continuación, el formulario real de la Secretaría de Seguridad de Bolívar convertido en schema JSONB para el Form Builder de Control G:

```json
{
  "formId": "tpl-ex-antes-seguridad-bolivar",
  "version": 1,
  "settings": {
    "allow_draft_save": true,
    "require_gps": true,
    "auto_capture_gps": true,
    "require_signature": true,
    "enable_ocr": true,
    "linked_entity": "beneficiary_family"
  },
  "pages": [
    {
      "id": "page_location",
      "title": "Ubicación Geográfica",
      "description": "Datos del lugar donde se realiza la caracterización",
      "fields": [
        {"id": "department", "type": "single_select", "label": "Departamento", "required": true, "source": "catalog:departments"},
        {"id": "municipality", "type": "single_select", "label": "Municipio", "required": true, "source": "catalog:municipalities", "conditional": {"field_id": "department", "operator": "is_not_empty"}},
        {"id": "corregimiento", "type": "text_short", "label": "Corregimiento", "required": false},
        {"id": "vereda", "type": "text_short", "label": "Vereda", "required": false},
        {"id": "address", "type": "text_short", "label": "Dirección", "required": true, "help_text": "Dirección o descripción de cómo llegar"},
        {"id": "date", "type": "date", "label": "Fecha del proceso", "required": true, "default": "today"},
        {"id": "gps", "type": "geolocation", "label": "Ubicación GPS", "required": true, "auto_capture": true}
      ]
    },
    {
      "id": "page_head",
      "title": "Cabeza de Familia",
      "description": "Datos de la persona responsable del hogar",
      "fields": [
        {"id": "head_first_name", "type": "text_short", "label": "Primer nombre", "required": true, "help_text": "Como aparece en el documento de identidad"},
        {"id": "head_second_name", "type": "text_short", "label": "Segundo nombre", "required": false},
        {"id": "head_first_lastname", "type": "text_short", "label": "Primer apellido", "required": true},
        {"id": "head_second_lastname", "type": "text_short", "label": "Segundo apellido", "required": false},
        {"id": "head_role", "type": "single_select", "label": "Rol en el núcleo familiar", "required": true, "source": "catalog:family_roles", "display_as": "radio"}
      ]
    },
    {
      "id": "page_members",
      "title": "Miembros del Hogar",
      "description": "Registre cada persona que vive en el hogar",
      "fields": [
        {
          "id": "members",
          "type": "repeating_group",
          "label": "Personas del hogar",
          "min_entries": 1,
          "max_entries": 20,
          "add_button_text": "+ Agregar otra persona",
          "fields": [
            {"id": "member_name", "type": "text_short", "label": "Nombre completo", "required": true},
            {"id": "member_bond", "type": "single_select", "label": "Vínculo con la cabeza de familia", "source": "catalog:family_bonds", "required": true},
            {"id": "member_sex", "type": "single_select", "label": "Sexo", "source": "catalog:sex", "required": true, "display_as": "radio"},
            {"id": "member_gender", "type": "single_select", "label": "Identidad de género", "source": "catalog:gender_identity", "required": true, "help_text": "Pregunte con respeto: '¿Cómo se identifica?'"},
            {"id": "member_orientation", "type": "single_select", "label": "Orientación sexual", "source": "catalog:sexual_orientation", "required": true, "help_text": "Si la persona no desea responder, seleccione 'No sabe / No informa'"},
            {"id": "member_education", "type": "single_select", "label": "Nivel escolar", "source": "catalog:education_level", "required": true},
            {"id": "member_ethnic", "type": "single_select", "label": "¿A qué grupo étnico pertenece?", "source": "catalog:ethnic_groups", "required": true, "help_text": "Pregunte: '¿Usted se reconoce como parte de algún grupo étnico?'"},
            {"id": "member_disability", "type": "single_select", "label": "¿Tiene alguna discapacidad?", "source": "catalog:disabilities", "required": true},
            {"id": "member_condition", "type": "single_select", "label": "Condición especial", "source": "catalog:special_conditions", "required": true},
            {"id": "member_peace", "type": "single_select", "label": "Enfoque de paz", "source": "catalog:peace_approach", "required": true, "help_text": "Solo pregunte si el contexto es seguro"},
            {"id": "member_civil_status", "type": "single_select", "label": "Estado civil", "source": "catalog:marital_status", "required": true},
            {"id": "member_leadership", "type": "single_select", "label": "Tipo de liderazgo", "source": "catalog:leadership_types", "required": false},
            {"id": "member_birth_date", "type": "date", "label": "Fecha de nacimiento", "required": true},
            {"id": "member_doc_type", "type": "single_select", "label": "Tipo de documento", "source": "catalog:id_document_types", "required": true},
            {"id": "member_doc_number", "type": "text_short", "label": "Número de documento", "required": true, "validations": {"pattern": "^[0-9]{4,15}$", "custom_message": "Solo números, sin puntos ni guiones"}},
            {"id": "member_email", "type": "text_short", "label": "Correo electrónico", "required": false, "help_text": "Si no tiene, puede dejarlo vacío"},
            {"id": "member_phone", "type": "text_short", "label": "Teléfono celular", "required": false, "help_text": "Ej: 300 123 4567"}
          ]
        }
      ]
    },
    {
      "id": "page_evidence",
      "title": "Evidencia Fotográfica",
      "fields": [
        {"id": "photo_facade", "type": "photo", "label": "Foto de la fachada", "required": false, "max_files": 2},
        {"id": "photo_conditions", "type": "photo", "label": "Foto de condiciones del hogar", "required": false, "max_files": 3}
      ]
    },
    {
      "id": "page_consent",
      "title": "Consentimiento y Firma",
      "fields": [
        {"id": "consent_text", "type": "section_title", "label": "CONSENTIMIENTO INFORMADO", "description": "En cumplimiento de la Ley 1581 de 2012 y su Decreto Reglamentario 1377 de 2013, autorizo a la entidad ejecutora del programa para que recolecte, almacene, use y trate mis datos personales y los de los miembros de mi hogar, con la finalidad exclusiva de ejecutar el programa social al cual estoy vinculado(a). Entiendo que puedo ejercer mis derechos de acceso, actualización, rectificación y supresión de mis datos personales comunicándome con la entidad."},
        {"id": "consent_checkbox", "type": "yes_no", "label": "He leído y acepto el tratamiento de datos personales", "required": true},
        {"id": "signature", "type": "signature", "label": "Firma del cabeza de familia", "required": true, "help_text": "Pida a la persona que firme con su dedo en la pantalla"}
      ]
    }
  ]
}
```

---

# 14. Checklist de Cumplimiento

## 14.1 Checklist Funcional

| # | Requisito | Estado | Prioridad |
|---|---|---|---|
| 1 | Formularios funcionan 100% offline | 🔲 | Crítica |
| 2 | Auto-guardado en cada campo | 🔲 | Crítica |
| 3 | Sincronización automática al detectar internet | 🔲 | Crítica |
| 4 | Grupo repetitivo soporta 20+ miembros con 15+ campos | 🔲 | Crítica |
| 5 | Todos los catálogos de enfoque diferencial implementados | 🔲 | Alta |
| 6 | Consentimiento informado con firma digital | 🔲 | Crítica |
| 7 | Captura GPS automática | 🔲 | Alta |
| 8 | OCR para formularios en papel | 🔲 | Alta |
| 9 | Generación de PDF imprimible | 🔲 | Alta |
| 10 | Momentos del servicio (Ex-Antes → Encuentros → Ex-Post) | 🔲 | Alta |
| 11 | Vinculación de familia a múltiples eventos | 🔲 | Alta |
| 12 | Código BPIN configurable por proyecto | 🔲 | Media |
| 13 | Exportación a formato DANE con códigos DIVIPOLA | 🔲 | Alta |
| 14 | Reporte de enfoque diferencial desagregado | 🔲 | Alta |
| 15 | Bottom navigation bar estilo app nativa (5 tabs) | 🔲 | Alta |

## 14.2 Checklist de Accesibilidad (WCAG 2.1 AA)

| # | Criterio WCAG | Implementación | Estado |
|---|---|---|---|
| 1 | 1.1.1 Contenido no textual | Alt text en todas las imágenes | 🔲 |
| 2 | 1.3.1 Información y relaciones | Semántica HTML correcta, labels vinculados | 🔲 |
| 3 | 1.4.3 Contraste mínimo (4.5:1) | Paleta verificada con herramientas de contraste | 🔲 |
| 4 | 1.4.11 Contraste no textual (3:1) | Bordes, íconos, indicadores de estado | 🔲 |
| 5 | 2.1.1 Teclado | Todos los elementos alcanzables con Tab | 🔲 |
| 6 | 2.4.1 Saltar bloques | Skip links implementados | 🔲 |
| 7 | 2.4.3 Orden de foco | Secuencia lógica de tabulación | 🔲 |
| 8 | 2.4.6 Encabezados y etiquetas | Headings jerárquicos, labels descriptivos | 🔲 |
| 9 | 3.1.1 Idioma de la página | `lang="es-CO"` en el HTML | 🔲 |
| 10 | 3.3.1 Identificación de errores | Mensajes claros en lenguaje ciudadano | 🔲 |
| 11 | 3.3.2 Etiquetas o instrucciones | Microcopy explicativo en todos los campos | 🔲 |
| 12 | 4.1.2 Nombre, función, valor | ARIA labels en componentes dinámicos | 🔲 |

## 14.3 Checklist de Seguridad y Cumplimiento Legal

| # | Requisito | Norma | Estado |
|---|---|---|---|
| 1 | Consentimiento informado en cada formulario | Ley 1581/2012 | 🔲 |
| 2 | Cifrado de datos sensibles en BD | Ley 1581/2012 | 🔲 |
| 3 | Log de auditoría completo | Control interno entidades públicas | 🔲 |
| 4 | Opción de eliminación de datos (habeas data) | Ley 1581/2012, Art. 8 | 🔲 |
| 5 | HTTPS/TLS en todas las comunicaciones | Buenas prácticas | 🔲 |
| 6 | RLS por organización (aislamiento de datos) | Multi-tenancy seguro | 🔲 |
| 7 | MFA para coordinadores | MinTIC guía de seguridad | 🔲 |
| 8 | Datos sensibles (orientación sexual, víctima) cifrados | Ley 1581/2012, Art. 5 | 🔲 |
| 9 | Exportación con opción de anonimización | Ley 1712/2014 | 🔲 |
| 10 | Formatos compatibles con datos abiertos | CONPES 3920 | 🔲 |

---

# 15. Plan de Implementación Sector Público

## 15.1 Fase Adicional: Adaptación Sector Público (Sprints 8-9)

Estos sprints se ejecutan después del MVP base de Control G (sprints 1-7 del Plan Maestro).

### Sprint 8 (Sem 15-16): Enfoque Diferencial y Familias

| Tarea | Hrs Est. |
|---|---|
| Crear tablas de catálogos de enfoque diferencial (13 catálogos, SQL completo) | 6 |
| Crear tabla beneficiary_families con ciclo de momentos | 8 |
| Crear tabla family_members con 15 campos de enfoque diferencial | 6 |
| Crear tabla consent_log con trazabilidad | 4 |
| Implementar plantilla "Caracterización Ex-Antes" como formulario precargado | 8 |
| Implementar vinculación familia → múltiples formularios (momentos) | 10 |
| Vista de "Familias" para Coordinador: listado con estado de momentos | 8 |
| Campo de código BPIN en proyectos | 2 |
| Cifrado de datos sensibles con pgcrypto | 6 |
| Testing con formulario real de la Secretaría de Seguridad de Bolívar | 8 |

### Sprint 9 (Sem 17-18): Accesibilidad, Reportes Institucionales, Interoperabilidad

| Tarea | Hrs Est. |
|---|---|
| Auditoría WCAG 2.1 AA completa y correcciones | 12 |
| Implementar microcopy en lenguaje claro en todos los campos | 6 |
| Reporte de enfoque diferencial desagregado (gráficas) | 10 |
| Reporte de avance del programa (Ex-Antes → Encuentros → Ex-Post) | 8 |
| Exportación formato DANE con códigos DIVIPOLA | 6 |
| API REST documentada para interoperabilidad | 8 |
| Dashboard de rendición de cuentas (Contraloría-ready) | 8 |
| Testing con entidad pública piloto | 8 |

---

**CONTROL G — Tecnología que cumple, datos que transforman**

DRAN DIGITAL S.A.S. — Cartagena de Indias, Colombia — 2026

*Documento confidencial. Todos los derechos reservados.*