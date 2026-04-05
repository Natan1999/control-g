# PROMPT — Implementar el Formulario de Caracterización Ex-Antes en Control G

## Instrucción

Implementa en Control G el formulario de **Caracterización Ex-Antes** exactamente como está definido en el documento Excel de referencia. El formulario tiene dos componentes: un encabezado de **Registro del Programa** (datos del proyecto que se configuran una vez desde el Coordinador) y la ficha de **Caracterización Ex-Antes** que diligencia el Profesional de Campo para cada familia.

El formulario debe funcionar 100% offline, con auto-guardado campo por campo en IndexedDB, y sincronización automática a Supabase cuando haya internet.

---

## PARTE 1: REGISTRO DEL PROGRAMA

Estos datos se configuran UNA VEZ al crear la entidad o el proyecto. No los diligencia el Profesional. Se muestran como encabezado en los informes generados.

| Campo | Tipo | Obligatorio | Valor de ejemplo |
|---|---|---|---|
| Unidad Ejecutora | Texto (preconfigurado desde la entidad) | Sí | Secretaría de Seguridad de Bolívar |
| Departamento | Selector (catálogo DIVIPOLA) | Sí | Bolívar |
| Municipio | Selector dependiente del departamento | Sí | Altos del Rosario |
| Nombre del Proyecto | Texto largo | Sí | (vacío, lo llena el Coordinador) |
| Código BPIN | Texto (formato libre) | No | (código del Banco de Proyectos de Inversión Nacional) |
| Actividad o Programa | Texto | No | (actividad específica del proyecto) |
| Familias Beneficiarias | Numérico | Sí | 20 |
| Caracterizaciones Ex-Antes | Numérico (igual a familias) | Sí | 20 |
| Momentos de Encuentro 1 | Numérico (igual a familias) | Sí | 20 |
| Momentos de Encuentro 2 | Numérico (igual a familias) | Sí | 20 |
| Momentos de Encuentro 3 | Numérico (igual a familias) | Sí | 20 |
| Caracterizaciones Ex-Post | Numérico (igual a familias) | Sí | 20 |
| Total Eventos Municipio | Calculado automático (suma de los 5 anteriores) | — | 100 |
| Eventos por Familia | Fijo: 5 | — | 5 |

**Implementación**: Estos campos se almacenan en la tabla `entities` o en una tabla `program_config` vinculada a `entity_municipalities`. Se usan para calcular las metas y generar los informes de seguimiento.

---

## PARTE 2: FORMULARIO DE CARACTERIZACIÓN EX-ANTES

Este es el formulario que diligencia el **Profesional de Campo** en su dispositivo móvil, una vez por cada familia. Tiene 4 secciones organizadas en páginas con navegación tipo stepper.

---

### PÁGINA 1 — Ubicación Geográfica y Fecha

| # | Campo | Tipo de input | Obligatorio | Opciones / Validación | Microcopy (texto de ayuda) |
|---|---|---|---|---|---|
| 1.1 | Departamento | Selector (dropdown) | Sí | Catálogo de departamentos DIVIPOLA. Preseleccionado según asignación del Profesional | — |
| 1.2 | Municipio | Selector dependiente | Sí | Se filtra según el departamento seleccionado. Preseleccionado según asignación | — |
| 1.3 | Corregimiento | Texto libre | No | Máximo 200 caracteres | Escriba el nombre del corregimiento, si aplica |
| 1.4 | Vereda | Texto libre | No | Máximo 200 caracteres | Escriba el nombre de la vereda, si aplica |
| 1.5 | Dirección | Texto libre | Sí | Máximo 300 caracteres | Dirección o descripción de cómo llegar al hogar |
| 1.6 | Fecha — Año | Selector numérico | Sí | Año actual por defecto. Rango: 2024-2030 | — |
| 1.7 | Fecha — Mes | Selector numérico | Sí | Mes actual por defecto. Rango: 1-12, mostrar nombre del mes | — |
| 1.8 | Fecha — Día | Selector numérico | Sí | Día actual por defecto. Rango: 1-31, validar según mes seleccionado | — |

**Nota de implementación**: La fecha se puede implementar como un datepicker nativo que se descompone en año/mes/día para el informe, o como 3 selectores separados como lo muestra el Excel. Recomendación: usar datepicker nativo que es más fácil de usar en móvil, y descomponer internamente.

---

### PÁGINA 2 — Datos del Cabeza de Familia

| # | Campo | Tipo de input | Obligatorio | Opciones / Validación | Microcopy |
|---|---|---|---|---|---|
| 2.1 | Primer Nombre | Texto | Sí | Máx 100 chars, solo letras y espacios | Como aparece en el documento de identidad |
| 2.2 | Segundo Nombre | Texto | No | Máx 100 chars | — |
| 2.3 | Primer Apellido | Texto | Sí | Máx 100 chars | — |
| 2.4 | Segundo Apellido | Texto | No | Máx 100 chars | — |
| 2.5 | Rol en el Núcleo Familiar | Radio buttons (selección única) | Sí | 3 opciones exactas: | Seleccione el rol de esta persona en la familia |

**Opciones del campo 2.5 — Rol en el Núcleo Familiar**:
1. Padre Cabeza de Familia
2. Madre Cabeza de Familia
3. Cuidador Cabeza de Familia

---

### PÁGINA 3 — Miembros del Núcleo Familiar (GRUPO REPETITIVO)

Esta es la sección más compleja. Es un **grupo repetitivo** donde el Profesional registra a CADA miembro del hogar (incluyendo al cabeza de familia). Cada miembro tiene **16 campos**. El grupo se repite mínimo 1 vez y máximo 20 veces.

**UI del grupo repetitivo**:
- Botón visible: **"+ Agregar miembro del hogar"**
- Cada miembro se muestra como una tarjeta colapsable con el nombre como título
- Botón para eliminar miembro (con confirmación)
- Contador: "Miembro 1 de N"

#### Campos por cada miembro:

| # | Campo | Tipo | Obligatorio | Opciones exactas del Excel |
|---|---|---|---|---|
| 3.1 | Vínculo con la Cabeza de Familia | Dropdown | Sí | Ver tabla A |
| 3.2 | Sexo | Radio buttons | Sí | Ver tabla B |
| 3.3 | Identidad de Género | Dropdown | Sí | Ver tabla C |
| 3.4 | Orientación Sexual | Dropdown | Sí | Ver tabla D |
| 3.5 | Nivel Escolar | Dropdown | Sí | Ver tabla E |
| 3.6 | Enfoque Diferencial Poblacional | Dropdown | Sí | Ver tabla F |
| 3.7 | Discapacidad | Dropdown | Sí | Ver tabla G |
| 3.8 | Condición Especial | Dropdown | Sí | Ver tabla H |
| 3.9 | Enfoque de Paz | Dropdown | Sí | Ver tabla I |
| 3.10 | Estado Civil | Dropdown | Sí | Ver tabla J |
| 3.11 | Liderazgo | Dropdown | No | Ver tabla K |
| 3.12 | Fecha de Nacimiento | Datepicker (Año, Mes, Día) | Sí | Validar: no futura, no mayor a 120 años. La app calcula la edad automáticamente. |
| 3.13 | Documento de Identificación | Dropdown | Sí | Ver tabla L |
| 3.14 | Número de Documento | Texto numérico | Sí | Regex: `^[0-9]{4,15}$`. Validar unicidad dentro del mismo formulario. |
| 3.15 | Correo Electrónico | Email input | No | Hasta 2 correos (campo principal + campo secundario). Validar formato email. |
| 3.16 | Teléfono Celular | Tel input | No | Hasta 2 números (campo principal + campo secundario). Regex: `^3[0-9]{9}$` para Colombia. |

---

### TABLAS DE OPCIONES (exactas del Excel, en el orden del Excel)

#### Tabla A — Vínculo con la Cabeza de Familia
| Valor | Label |
|---|---|
| esposo | Esposo(a) |
| hijo | Hijo(a) |
| nieto | Nieto(a) |
| cunado | Cuñado(a) |
| suegro | Suegro(a) |
| yerno | Yerno(a) |
| hijastro | Hijastro(a) |
| tio | Tío(a) |
| primo | Primo(a) |
| ninguno | Ninguno |

#### Tabla B — Sexo
| Valor | Label |
|---|---|
| hombre | Hombre |
| mujer | Mujer |

#### Tabla C — Identidad de Género
| Valor | Label |
|---|---|
| masculino | Masculino |
| femenino | Femenino |
| transgenero | Transgénero |
| no_informa | No sabe / No informa |

#### Tabla D — Orientación Sexual
| Valor | Label |
|---|---|
| asexual | Asexual |
| bisexual | Bisexual |
| gay | Gay |
| heterosexual | Heterosexual |
| lesbiana | Lesbiana |
| queer | Queer |
| no_informa | No sabe / No informa |

#### Tabla E — Nivel Escolar
| Valor | Label |
|---|---|
| primaria | Primaria |
| secundaria | Secundaria |
| tecnica | Técnica o Tecnológica |
| profesional | Profesional |
| postgrado | Postgrado |
| no_informa | No informa |

#### Tabla F — Enfoque Diferencial Poblacional
| Valor | Label |
|---|---|
| comunidad_negra | Comunidad Negra |
| afrocolombiano | Afrocolombiano |
| afrodescendiente | Afrodescendiente |
| palenquero | Palenquero |
| raizal | Raizal |
| room | Room |
| mestizo | Mestizo |
| ninguno | Ninguno |

#### Tabla G — Discapacidad
| Valor | Label |
|---|---|
| auditiva | Auditiva |
| visual | Visual |
| sordoceguera | Sordoceguera |
| intelectual | Intelectual |
| psicosocial | Psicosocial (Mental) |
| fisica | Física |
| multiple | Múltiple |
| ninguna | Ninguna |

#### Tabla H — Condición Especial
| Valor | Label |
|---|---|
| victima | Víctima |
| campesino | Campesino |
| joven_rural | Joven Rural |
| mujer_campesina | Mujer Campesina |
| mujer_rural | Mujer Rural |
| mujer_pesquera | Mujer Pesquera |

#### Tabla I — Enfoque de Paz
| Valor | Label |
|---|---|
| desmovilizado | Desmovilizado |
| reincorporado | Reincorporado |
| reinsertado | Reinsertado |
| reintegrado | Reintegrado |
| ninguno | Ninguno |
| no_informa | No informa |

#### Tabla J — Estado Civil
| Valor | Label |
|---|---|
| soltero | Soltero |
| casado | Casado |
| union_libre | Unión Libre |
| separado | Separado |
| divorciado | Divorciado |
| viudo | Viudo |

#### Tabla K — Liderazgo
| Valor | Label |
|---|---|
| comunitario | Comunitario |
| jac | JAC |
| religioso | Religioso |
| politico | Político |
| ambiental | Ambiental |
| animalista | Animalista |
| etnico | Étnico |
| social | Social |
| defensor_derechos | Defensor de Derechos |
| espiritual | Espiritual |
| ninguno | Ninguno |
| otro | Otro |

#### Tabla L — Documento de Identificación
| Valor | Label | Abreviatura |
|---|---|---|
| ti | Tarjeta de Identidad | TI |
| cc | Cédula de Ciudadanía | CC |
| ce | Cédula de Extranjería | CE |
| pasaporte | Pasaporte | PA |
| rc | Registro Civil | RC |

---

### PÁGINA 4 — Consentimiento y Firma

| # | Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|---|
| 4.1 | Texto de Consentimiento | Bloque de texto (solo lectura) | — | Mostrar: "En cumplimiento de la Ley 1581 de 2012 y su Decreto Reglamentario 1377 de 2013, autorizo el tratamiento de mis datos personales y los de los miembros de mi hogar. La información suministrada es veraz y puede ser verificada. Autorizo el uso de registros fotográficos como evidencia de las actividades realizadas." |
| 4.2 | Aceptación de consentimiento | Checkbox | Sí | Label: "El usuario acepta la política de tratamiento de datos personales y certifica que la información suministrada es veraz" |
| 4.3 | Firma Digital del Beneficiario | Canvas de firma (react-signature-canvas) | Sí | Mostrar un recuadro táctil donde la persona firma con el dedo. Botón "Limpiar" para borrar y reintentar. La firma se guarda como imagen PNG. Microcopy: "Pida al miembro de la familia que firme aquí con su dedo" |

**Al tocar "Finalizar"**:
- Validar que todos los campos obligatorios estén completos.
- Si hay errores: scroll automático al primer campo con error, mostrar mensajes en rojo debajo de cada campo.
- Si todo es válido: guardar en IndexedDB, agregar a cola de sincronización, mostrar mensaje "¡Listo! Caracterización guardada exitosamente", cambiar estado de la familia a Ex-Antes: ✅ Completada, volver a la lista de familias.

---

## IMPLEMENTACIÓN TÉCNICA

### Estructura de datos en IndexedDB (offline)

```typescript
interface LocalCharacterization {
  localId: string;                    // UUID generado offline
  familyId: string;                   // ID de la familia asignada
  entityId: string;
  municipalityId: string;
  professionalId: string;

  // Página 1 — Ubicación
  department: string;
  municipality: string;
  corregimiento: string | null;
  vereda: string | null;
  address: string;
  dateYear: number;
  dateMonth: number;
  dateDay: number;

  // Página 2 — Cabeza de familia
  headFirstName: string;
  headSecondName: string | null;
  headFirstLastname: string;
  headSecondLastname: string | null;
  headFamilyRole: 'padre_cabeza' | 'madre_cabeza' | 'cuidador_cabeza';

  // Página 3 — Miembros (array)
  members: FamilyMember[];

  // Página 4 — Consentimiento
  consentAccepted: boolean;
  beneficiarySignatureBlob: Blob | null;

  // Metadata
  latitude: number | null;
  longitude: number | null;
  status: 'draft' | 'completed' | 'synced';
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

interface FamilyMember {
  id: string;                         // UUID local
  familyBond: string;                 // Tabla A
  sex: 'hombre' | 'mujer';           // Tabla B
  genderIdentity: string;            // Tabla C
  sexualOrientation: string;         // Tabla D
  educationLevel: string;            // Tabla E
  ethnicGroup: string;               // Tabla F
  disability: string;                // Tabla G
  specialCondition: string;          // Tabla H
  peaceApproach: string;             // Tabla I
  maritalStatus: string;             // Tabla J
  leadershipType: string | null;     // Tabla K
  birthDateYear: number;
  birthDateMonth: number;
  birthDateDay: number;
  calculatedAge: number;             // Calculado automáticamente
  idDocumentType: string;            // Tabla L
  idNumber: string;
  emailPrimary: string | null;
  emailSecondary: string | null;
  phonePrimary: string | null;
  phoneSecondary: string | null;
}
```

### Tabla Supabase para almacenar los datos sincronizados

```sql
CREATE TABLE characterizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id VARCHAR(50) NOT NULL UNIQUE,
  family_id UUID REFERENCES families(id),
  entity_id UUID REFERENCES entities(id) NOT NULL,
  municipality_id UUID REFERENCES entity_municipalities(id),
  professional_id UUID REFERENCES users(id),

  -- Ubicación
  department VARCHAR(100) NOT NULL,
  municipality_name VARCHAR(200) NOT NULL,
  corregimiento VARCHAR(200),
  vereda VARCHAR(200),
  address TEXT NOT NULL,
  activity_date DATE NOT NULL,

  -- Cabeza de familia
  head_first_name VARCHAR(100) NOT NULL,
  head_second_name VARCHAR(100),
  head_first_lastname VARCHAR(100) NOT NULL,
  head_second_lastname VARCHAR(100),
  head_family_role VARCHAR(30) NOT NULL,

  -- Miembros del hogar (JSONB array)
  members JSONB NOT NULL DEFAULT '[]',

  -- Consentimiento
  consent_accepted BOOLEAN NOT NULL DEFAULT false,
  beneficiary_signature_url TEXT,

  -- Geo
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Metadata
  device_info JSONB,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_char_family ON characterizations(family_id);
CREATE INDEX idx_char_entity ON characterizations(entity_id);
CREATE INDEX idx_char_professional ON characterizations(professional_id);
CREATE INDEX idx_char_municipality ON characterizations(municipality_id);
```

### Estructura del JSONB `members`

```json
[
  {
    "id": "uuid-local",
    "family_bond": "esposo",
    "sex": "hombre",
    "gender_identity": "masculino",
    "sexual_orientation": "heterosexual",
    "education_level": "secundaria",
    "ethnic_group": "afrocolombiano",
    "disability": "ninguna",
    "special_condition": "victima",
    "peace_approach": "ninguno",
    "marital_status": "casado",
    "leadership_type": "comunitario",
    "birth_date": "1990-05-15",
    "age": 35,
    "id_document_type": "cc",
    "id_number": "1047382956",
    "email_primary": "juan@correo.com",
    "email_secondary": null,
    "phone_primary": "3001234567",
    "phone_secondary": null
  }
]
```

---

## UI MOBILE DEL FORMULARIO (PROFESIONAL DE CAMPO)

### Stepper de navegación superior

```
  Ubicación    Cabeza     Miembros    Consentimiento
    ●━━━━━━━━━━━●━━━━━━━━━━━○━━━━━━━━━━━○
   Paso 1      Paso 2     Paso 3       Paso 4
```

### Página 3 — Grupo repetitivo de miembros

```
┌─────────────────────────────────────────┐
│ ← Miembros del Hogar          💾       │
│ Paso 3 de 4                             │
│ ●━━━━━━━━━━●━━━━━━━━━━●━━━━━━━━━○      │
├─────────────────────────────────────────┤
│                                         │
│  MIEMBRO 1 DE 3                    🗑️  │
│  ┌─────────────────────────────────┐    │
│  │ Vínculo con cabeza de familia * │    │
│  │ [Esposo(a)                   ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Sexo *                          │    │
│  │ ○ Hombre  ● Mujer               │    │
│  ├─────────────────────────────────┤    │
│  │ Identidad de género *           │    │
│  │ [Femenino                    ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Orientación sexual *            │    │
│  │ [Heterosexual                ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Nivel escolar *                 │    │
│  │ [Secundaria                  ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Enfoque dif. poblacional *      │    │
│  │ [Afrocolombiano              ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Discapacidad *                  │    │
│  │ [Ninguna                     ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Condición especial *            │    │
│  │ [Víctima                     ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Enfoque de paz *                │    │
│  │ [Ninguno                     ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Estado civil *                  │    │
│  │ [Casado                      ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Liderazgo                       │    │
│  │ [Comunitario                 ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Fecha de nacimiento *           │    │
│  │ [15/05/1990]  Edad: 35 años     │    │
│  ├─────────────────────────────────┤    │
│  │ Tipo de documento *             │    │
│  │ [Cédula de Ciudadanía        ▼] │    │
│  ├─────────────────────────────────┤    │
│  │ Número de documento *           │    │
│  │ [1047382956                   ] │    │
│  │ Solo números, sin puntos        │    │
│  ├─────────────────────────────────┤    │
│  │ Correo electrónico              │    │
│  │ [juan@correo.com              ] │    │
│  │ [                (segundo)    ] │    │
│  ├─────────────────────────────────┤    │
│  │ Teléfono celular                │    │
│  │ [3001234567                   ] │    │
│  │ [                (segundo)    ] │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  + Agregar otro miembro         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌────────────┐ ┌────────────────┐      │
│  │ ← Anterior │ │  Siguiente →   │      │
│  └────────────┘ └────────────────┘      │
│                                         │
├───────┬───────┬───────┬───────┬─────────┤
│  🏠  │  👥  │  📷  │  📄  │  👤    │
└───────┴───────┴───────┴───────┴─────────┘
```

### Validaciones en tiempo real

| Campo | Validación | Mensaje de error |
|---|---|---|
| Primer nombre | No vacío, mín 2 chars | "Ingrese el primer nombre" |
| Primer apellido | No vacío, mín 2 chars | "Ingrese el primer apellido" |
| Dirección | No vacío | "La dirección es necesaria" |
| Fecha | No futura | "La fecha no puede ser en el futuro" |
| Número de documento | Solo dígitos, 4-15 chars | "Solo números, entre 4 y 15 dígitos" |
| Número de documento duplicado | Único dentro del formulario | "Este número ya fue registrado en otro miembro" |
| Fecha nacimiento | No futura, edad ≤ 120 | "Revise la fecha de nacimiento" |
| Teléfono | Formato colombiano 3XXXXXXXXX | "El celular debe empezar con 3 y tener 10 dígitos" |
| Email | Formato válido si se ingresa | "Revise el formato del correo" |
| Consentimiento | Debe estar marcado | "Es necesario aceptar el tratamiento de datos" |
| Firma | No vacía | "La firma del beneficiario es necesaria" |

### Auto-guardado

Cada vez que el usuario modifica un campo, se ejecuta un `debounce` de 500ms que persiste todo el formulario en IndexedDB. Si la app se cierra o el dispositivo se apaga, al reabrir la app el formulario se restaura exactamente donde quedó, incluyendo los miembros del hogar ya ingresados.

Mostrar indicador sutil en la parte inferior: "Guardado automáticamente ✓" que aparece brevemente tras cada guardado.

---

## CONSIDERACIONES FINALES

1. **Los dropdowns deben tener búsqueda** cuando tienen más de 6 opciones (como Enfoque Diferencial Poblacional con 8 opciones o Liderazgo con 12). Implementar con un componente `Combobox` de shadcn/ui que permita escribir para filtrar.

2. **El grupo repetitivo debe ser colapsable**: cuando hay muchos miembros, mostrar cada uno como una tarjeta colapsada que muestra solo el nombre y el vínculo, con botón para expandir y editar todos los campos.

3. **Touch targets mínimo 48px**: todos los botones, dropdowns y radio buttons deben tener al menos 48px de alto para facilitar el toque en dispositivos móviles.

4. **Contraste alto**: el formulario se usa en exteriores a sol directo. Usar texto negro (#000) sobre fondo blanco (#FFF) para los campos. Labels en gris oscuro (#374151).

5. **Los 16 campos por miembro son muchos en móvil**: organizar en sub-secciones dentro de cada miembro:
   - Datos básicos (vínculo, sexo, documento, fecha nacimiento) — siempre visibles
   - Enfoque diferencial (género, orientación, etnia, discapacidad, condición, paz) — colapsable, título "Caracterización Social"
   - Datos adicionales (nivel escolar, estado civil, liderazgo, contacto) — colapsable, título "Datos Complementarios"

6. **Preseleccionar valores cuando sea posible**: si el municipio del Profesional ya está configurado, preseleccionar departamento y municipio. Si la familia ya fue cargada por el Coordinador, prerellenar nombre y documento del cabeza de familia.
