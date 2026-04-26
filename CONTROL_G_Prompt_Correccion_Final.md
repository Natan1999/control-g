# CONTROL G — PROMPT DE CORRECCIÓN, COMPLETACIÓN Y PRUEBAS FINALES

## INSTRUCCIÓN PARA EL AGENTE DE DESARROLLO

Eres un equipo de desarrollo senior trabajando en la aplicación Control G. La app ya tiene una base construida pero tiene múltiples funcionalidades rotas o incompletas. Tu trabajo es corregir TODO lo que no funciona, completar lo que falta, hacer pruebas exhaustivas y generar un APK funcional al final.

Trabaja de forma metódica. Lee todo este documento primero. Luego ejecuta las correcciones en el orden exacto que se indica. Después de cada bloque de correcciones, haz pruebas. No avances al siguiente bloque hasta que el anterior esté funcionando al 100%. Al final, genera el APK.

REGLA CRÍTICA: Después de cada cambio significativo, abre la app en el navegador, prueba la funcionalidad modificada, y confirma que funciona antes de continuar. Si algo falla, corrígelo inmediatamente antes de seguir.

---

## CONTEXTO: QUÉ ES CONTROL G

Control G es una plataforma SaaS de recolección de datos en campo. Un Administrador (DRAN DIGITAL) crea entidades clientes. Cada entidad tiene un Coordinador que diseña formularios personalizados con un constructor visual. Los Profesionales de Campo diligencian esos formularios en sus celulares, FUNCIONANDO 100% SIN INTERNET. Los datos se sincronizan automáticamente cuando hay conexión.

La app se empaqueta como APK con Capacitor.js. El stack es React + TypeScript + Vite + TailwindCSS + shadcn/ui, Supabase como backend, Dexie.js para IndexedDB (offline), y Capacitor.js para el empaquetado móvil.

Roles: Administrador (SuperAdmin), Coordinador, Apoyo Administrativo, Profesional de Campo.

---

## BLOQUE 1: ARREGLAR EL SISTEMA OFFLINE (PRIORIDAD MÁXIMA)

Este es el problema más crítico. La app NO funciona sin internet. Cuando un Profesional abre la app sin conexión, los formularios no cargan, aparece "0 formularios" y no puede trabajar. Esto invalida completamente la aplicación porque se usa en zonas rurales sin internet.

### Problema 1.1: Los formularios no se precargan en el dispositivo

CAUSA: Cuando el Profesional inicia sesión con internet, la app no está descargando y almacenando en IndexedDB los formularios asignados, los registros (familias) asignados, ni los catálogos (departamentos, municipios, opciones de selección).

SOLUCIÓN: Implementa un sistema de precarga que se ejecute automáticamente después del login exitoso y cada vez que la app detecte conexión a internet.

Crea un servicio llamado OfflineDataService o similar con estas funciones:

Primera función: syncFormularios. Consulta a Supabase todos los formularios publicados que estén asignados al proyecto del Profesional actual. Por cada formulario, guarda en IndexedDB (usando Dexie.js) el objeto completo incluyendo el schema JSONB con todas las páginas, campos, opciones de selección, validaciones y lógica condicional. Guarda también la versión del formulario para poder detectar actualizaciones futuras.

Segunda función: syncRegistros. Consulta a Supabase todos los registros (familias, personas, predios, lo que sea) asignados al Profesional actual. Guarda en IndexedDB cada registro con todos sus datos precargados y el estado de cada actividad del ciclo (pendiente, completado).

Tercera función: syncCatalogos. Descarga y almacena en IndexedDB las tablas de departamentos (33 registros) y municipios (1.123 registros) con sus códigos DANE. También descarga cualquier catálogo personalizado que usen los formularios del proyecto.

Cuarta función: syncAll. Ejecuta las tres funciones anteriores en secuencia. Muestra un indicador de progreso: "Descargando formularios...", "Descargando registros...", "Descargando catálogos...". Al terminar muestra "Datos listos para trabajo offline".

Esta función syncAll debe ejecutarse:
- Automáticamente después del login exitoso.
- Automáticamente cada vez que la app detecte que recuperó conexión a internet (usando el listener de Network de Capacitor).
- Manualmente cuando el Profesional toque un botón "Sincronizar datos" en su perfil.

VERIFICACIÓN: Después de implementar esto, haz login como Profesional con internet. Verifica que los datos se descargaron revisando IndexedDB en las DevTools del navegador. Luego desconecta internet (modo avión o desactivar red en DevTools). Recarga la app. Los formularios y registros DEBEN aparecer exactamente igual que con internet. Si aparece "0 formularios" o la pantalla está vacía, el offline NO está funcionando y debes corregirlo antes de continuar.

### Problema 1.2: Los formularios diligenciados no se guardan localmente

CAUSA: Cuando el Profesional llena un formulario sin internet y toca "Finalizar", los datos se pierden o no se almacenan correctamente en IndexedDB.

SOLUCIÓN: Implementa auto-guardado real campo por campo.

Cada vez que el Profesional modifica cualquier campo del formulario (escribe texto, selecciona una opción, toma una foto, captura una firma), ejecuta un guardado con debounce de 500ms que persiste TODO el estado actual del formulario en IndexedDB. El estado incluye: todos los valores de todos los campos, las fotos capturadas como Blobs, las firmas como Blobs, la geolocalización capturada, la página actual del stepper, y un timestamp de última modificación.

Cuando el Profesional toca "Finalizar", el formulario cambia de estado "borrador" a "completado" en IndexedDB y se agrega a la cola de sincronización.

Si la app se cierra inesperadamente (batería, crash, usuario cierra), al volver a abrir la app debe detectar que hay un formulario en borrador y ofrecer continuarlo exactamente donde quedó.

VERIFICACIÓN: Abre un formulario, llena 3 campos, NO toques finalizar. Cierra completamente la app (no minimizar, cerrar). Vuelve a abrir la app. El formulario debe estar ahí con los 3 campos llenos. Si se perdieron los datos, el auto-guardado no funciona y debes corregirlo.

### Problema 1.3: La sincronización automática no funciona

CAUSA: Cuando el Profesional recupera internet después de haber trabajado offline, los formularios completados no se suben automáticamente a Supabase.

SOLUCIÓN: Implementa el motor de sincronización con estas características.

Crea un SyncEngine que monitoree el estado de la red constantemente usando dos mecanismos: el plugin de Network de Capacitor que dispara un evento cuando cambia el estado de red, y un heartbeat HTTP que cada 30 segundos intenta hacer un HEAD request al endpoint de Supabase.

Cuando el SyncEngine detecta que hay internet disponible y hay registros pendientes en la cola de sincronización en IndexedDB, ejecuta automáticamente el proceso de subida:

Primero sube los datos de texto (los campos del formulario) como INSERT a la tabla correspondiente en Supabase. Segundo sube los archivos multimedia (fotos, videos, firmas) a Supabase Storage y obtiene las URLs. Tercero actualiza el registro en Supabase con las URLs de los archivos. Cuarto, si todo fue exitoso, marca el registro en IndexedDB como "sincronizado". Si algo falla, incrementa el contador de reintentos y programa el siguiente intento con backoff exponencial (2 segundos, 4 segundos, 8 segundos, etc., hasta un máximo de 10 intentos).

El indicador de sincronización en la barra superior debe reflejar el estado en TIEMPO REAL: nube verde con check cuando todo está sincronizado, nube naranja con animación de flecha cuando se está sincronizando, nube roja con un número cuando hay N registros pendientes sin conexión.

VERIFICACIÓN: Desconecta internet. Llena y finaliza 3 formularios. Verifica en IndexedDB que están guardados con estado "completado" o "pendiente_sync". Reconecta internet. Sin tocar nada, los 3 formularios deben subirse automáticamente a Supabase en los siguientes 30 segundos. El indicador debe cambiar de rojo con "3" a naranja "Sincronizando..." a verde "Sincronizado". Verifica en Supabase que los 3 registros aparecen con todos sus datos. Si no se suben automáticamente, el SyncEngine no funciona y debes corregirlo.

---

## BLOQUE 2: ARREGLAR CAPTURA DE FOTOS Y VIDEOS

### Problema 2.1: La cámara no funciona o las fotos no se guardan

CAUSA: La integración con el plugin de cámara de Capacitor no está funcionando correctamente, o las fotos capturadas no se almacenan en IndexedDB.

SOLUCIÓN: Implementa la captura de fotos usando @capacitor/camera.

Cuando el Profesional toca el botón de "Tomar foto" en un campo de tipo fotografía, debe abrirse la cámara nativa del dispositivo (no un input file del navegador). Después de tomar la foto, la app debe: mostrar un thumbnail de la foto capturada debajo del botón, almacenar la foto como Blob en IndexedDB vinculada al campo y al formulario, y permitir tomar fotos adicionales si el campo lo permite (hasta el máximo configurado).

Código de referencia para la captura:

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

async function takePhoto(): Promise<Blob> {
  const image = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    width: 1024,
    height: 1024,
  });
  
  // Convertir base64 a Blob para almacenar en IndexedDB
  const byteString = atob(image.base64String!);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: `image/${image.format}` });
}
```

Para la subida a Supabase Storage durante la sincronización:

```typescript
async function uploadPhoto(blob: Blob, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('field-photos')
    .upload(path, blob, {
      contentType: blob.type,
      upsert: false,
    });
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('field-photos')
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}
```

Las fotos se almacenan PRIMERO en IndexedDB como Blobs. Solo se suben a Supabase Storage cuando hay internet y el SyncEngine se activa. La URL resultante se almacena en el registro del formulario en Supabase.

### Problema 2.2: La captura de video no funciona

SOLUCIÓN: Para videos cortos, usa el elemento HTML nativo de captura de video con Capacitor:

```typescript
// Crear input de tipo file con capture="environment" para video
const input = document.createElement('input');
input.type = 'file';
input.accept = 'video/*';
input.capture = 'environment';
input.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    // Verificar duración máxima (30 o 60 segundos según config)
    // Almacenar como Blob en IndexedDB
    await db.media.add({
      localId: generateUUID(),
      responseLocalId: currentResponseId,
      fieldKey: fieldId,
      mediaType: 'video',
      blob: file,
      mimeType: file.type,
      fileSize: file.size,
      synced: false,
      createdAt: new Date().toISOString(),
    });
  }
};
input.click();
```

VERIFICACIÓN: En la app, abre un formulario que tenga campo de foto. Toma una foto. Debe verse el thumbnail. Cierra la app sin finalizar. Reabre. La foto debe seguir ahí. Finaliza el formulario sin internet. Reconecta internet. La foto debe subirse a Supabase Storage y la URL debe quedar en el registro. Verifica en Supabase Storage que el archivo existe. Repite con video.

---

## BLOQUE 3: ARREGLAR LA FIRMA DIGITAL

### Problema: La firma no se captura o no se guarda

SOLUCIÓN: Usa react-signature-canvas para el campo de firma digital.

```bash
npm install react-signature-canvas
npm install --save-dev @types/react-signature-canvas
```

El componente de firma debe mostrar un canvas táctil de al menos 300px de ancho y 150px de alto con borde visible. Debe tener un botón "Limpiar" que borre la firma y permita reintentar. Cuando el Profesional termina de firmar y pasa a la siguiente página o finaliza, la firma se convierte a Blob PNG y se almacena en IndexedDB.

```typescript
import SignatureCanvas from 'react-signature-canvas';

// En el componente:
const sigRef = useRef<SignatureCanvas>(null);

// Para obtener el Blob:
function getSignatureBlob(): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = sigRef.current?.getCanvas();
    canvas?.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
}

// Renderizado:
<div className="border-2 border-gray-300 rounded-lg p-1">
  <SignatureCanvas
    ref={sigRef}
    penColor="black"
    canvasProps={{
      className: 'w-full h-40 bg-white rounded',
    }}
  />
  <div className="flex gap-2 mt-2">
    <button onClick={() => sigRef.current?.clear()}>
      Limpiar
    </button>
  </div>
  <p className="text-sm text-gray-500 mt-1">
    Firme aquí con su dedo
  </p>
</div>
```

VERIFICACIÓN: Abre un formulario con campo de firma. Firma con el dedo o mouse. Pasa a la siguiente página y regresa. La firma debe seguir visible. Finaliza el formulario. En el informe PDF generado, la firma debe renderizarse como imagen.

---

## BLOQUE 4: ARREGLAR EL FORM BUILDER DEL COORDINADOR

### Problema: El Coordinador no puede crear ni editar formularios correctamente

SOLUCIÓN: El Form Builder es un constructor visual con 3 paneles.

Panel izquierdo (250px de ancho): Lista de tipos de campo arrastrables. Usa la librería dnd-kit para drag and drop. Cada tipo de campo se muestra como una tarjeta con ícono y nombre. Los tipos son: Texto corto, Texto largo, Numérico, Selección única, Selección múltiple, Sí/No, Fecha, Hora, Fotografía, Video corto, Firma digital, Geolocalización, Archivo adjunto, Código QR/Barras, Grupo repetitivo, Campo calculado, Separador/Título.

Panel central: Canvas donde se colocan los campos arrastrados. Cada campo colocado muestra su etiqueta, tipo (ícono), indicador de obligatorio (asterisco rojo), botón de configurar (engranaje), botón de eliminar (X), y un handle para reordenar arrastrando. Los campos se organizan en páginas con tabs superiores: "Página 1", "Página 2", botón "+" para agregar página.

Panel derecho (300px): Propiedades del campo seleccionado. Se actualiza dinámicamente según el campo tocado en el canvas. Muestra: etiqueta del campo (input text editable), texto de ayuda (input text), toggle de obligatorio, validaciones según el tipo (min/max para numérico, regex para texto, max fotos para fotografía), y configuración de lógica condicional ("Mostrar si campo X = valor Y").

Para campos de tipo Selección única y Selección múltiple, el panel derecho debe mostrar un editor de opciones donde el Coordinador puede agregar, editar, reordenar y eliminar opciones. Cada opción tiene un valor interno y un texto visible.

El formulario se guarda como un objeto JSON en la tabla forms de Supabase en la columna schema de tipo JSONB. La estructura del JSON debe ser:

```json
{
  "pages": [
    {
      "id": "page_1",
      "title": "Nombre de la página",
      "fields": [
        {
          "id": "field_001",
          "type": "text_short",
          "label": "Nombre del campo",
          "helpText": "Texto de ayuda",
          "required": true,
          "validations": {},
          "conditional": null,
          "options": []
        }
      ]
    }
  ]
}
```

Botones de acción del Form Builder: "Guardar borrador" (guarda sin publicar), "Vista previa" (abre modal con preview mobile del formulario), "Publicar" (marca el formulario como publicado y queda disponible para los Profesionales).

VERIFICACIÓN: Como Coordinador, crea un formulario con al menos 5 campos de diferentes tipos, incluyendo un grupo repetitivo y un campo con lógica condicional. Guarda como borrador. Cierra y reabre el Form Builder. El formulario debe cargar exactamente como lo dejaste. Publica el formulario. Inicia sesión como Profesional. El formulario publicado debe aparecer en la lista de formularios del Profesional.

---

## BLOQUE 5: ARREGLAR LA CREACIÓN DE ENTIDADES POR EL ADMINISTRADOR

### Problema: El Administrador no puede crear entidades con toda la información necesaria

SOLUCIÓN: La pantalla de creación de entidad del Administrador debe tener estos campos:

Sección 1 — Datos de la Entidad:
- Nombre de la entidad (texto, obligatorio)
- NIT (texto, opcional)
- Número de contrato (texto, obligatorio)
- Objeto del contrato (texto largo, obligatorio)
- Contratista / Operador (texto, obligatorio)
- Fecha de inicio del periodo (datepicker, obligatorio)
- Fecha de fin del periodo (datepicker, obligatorio)

Sección 2 — Cobertura Geográfica:
- Departamento (dropdown que consulta la tabla departments, obligatorio). Al seleccionar un departamento se filtran los municipios.
- Municipios (multiselect que consulta la tabla municipalities filtrada por el departamento seleccionado, obligatorio). Se pueden seleccionar múltiples municipios.
- Familias meta por municipio (número, default 35). Se puede configurar un valor diferente por cada municipio seleccionado.

Sección 3 — Coordinador General:
- Nombre completo del Coordinador (texto, obligatorio)
- Correo electrónico (email, obligatorio)
- Contraseña temporal (texto, obligatorio, mínimo 8 caracteres)

Al hacer clic en "Crear Entidad", el backend debe ejecutar en una transacción atómica: crear el registro en la tabla entities, crear los registros en entity_municipalities con los códigos DANE de cada municipio seleccionado, crear el usuario en Supabase Auth con el email y contraseña del Coordinador, crear el registro del Coordinador en la tabla users con role="coordinator" y entity_id vinculado. Si cualquier paso falla, revertir todos los anteriores.

VERIFICACIÓN: Como Administrador, crea una entidad con 3 municipios de Bolívar. Verifica en Supabase que se crearon los registros de la entidad, los 3 municipios con códigos DANE, y el usuario Coordinador. Inicia sesión con las credenciales del Coordinador. Debe entrar directamente al dashboard de su entidad y ver los 3 municipios configurados.

---

## BLOQUE 6: INTEGRAR DIVIPOLA COMPLETO

### Problema: No hay datos de departamentos y municipios de Colombia

SOLUCIÓN: Descarga la base DIVIPOLA del DANE y cárgala en Supabase.

Paso 1: Crea las tablas si no existen:

```sql
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  code VARCHAR(5) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS municipalities (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id),
  code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL
);
```

Paso 2: Busca la data DIVIPOLA. Puedes obtenerla de:
- Opción A: API de datos abiertos de Colombia: https://www.datos.gov.co/resource/gdxc-w37w.json (municipios con códigos DANE)
- Opción B: API no oficial: https://api-colombia.com/api/v1/Department y https://api-colombia.com/api/v1/City
- Opción C: El endpoint ArcGIS del DANE: https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer/0/query?where=1=1&outFields=*&f=json

Paso 3: Crea un script de seed que descargue los datos e inserte los 33 departamentos y los 1.123 municipios en las tablas. Ejecuta este script como parte de la migración inicial.

Paso 4: En la app, cuando se muestre un campo de Departamento, consulta la tabla departments (primero desde IndexedDB si está cacheada, si no desde Supabase). Cuando se seleccione un departamento, filtra los municipios por department_id.

Para veredas, barrios y corregimientos, consulta datos abiertos de Colombia. El portal www.datos.gov.co tiene datasets con centros poblados. Carga esta información adicional en una tabla zones con campos: id, municipality_id, name, type (vereda, barrio, corregimiento, sector), y opcionalmente código DANE del centro poblado.

VERIFICACIÓN: En la pantalla de creación de entidad, el dropdown de Departamento debe mostrar los 33 registros (32 departamentos + Bogotá D.C.). Al seleccionar "Bolívar" (código 13), el multiselect de municipios debe mostrar los municipios de Bolívar (Cartagena, Altos del Rosario, Mahates, etc.) con sus códigos DANE.

---

## BLOQUE 7: ARREGLAR LAS ESTADÍSTICAS Y DASHBOARD DEL COORDINADOR

### Problema: El dashboard del Coordinador no muestra estadísticas o muestra datos incorrectos

SOLUCIÓN: El dashboard del Coordinador debe mostrar datos en tiempo real consultando Supabase (con Realtime para actualizaciones automáticas).

Tarjetas KPI superiores:
- Total familias meta (suma de families_target de entity_municipalities)
- Familias con Ex-Antes completada (COUNT de registros con ex_ante_status = 'completed')
- Familias con ciclo completo (COUNT de registros con overall_status = 'completed')
- Porcentaje de avance general (familias completadas / familias meta × 100)

Tabla de Profesionales:
Consulta los usuarios con role='professional' de la entidad, y para cada uno cuenta las actividades completadas agrupadas por tipo. Columnas: Nombre, Municipio(s), Meta, Ex-Antes, M1, M2, M3, Ex-Post, % Avance.

Gráfica de avance por municipio:
Barras horizontales donde cada barra es un municipio y muestra el porcentaje de avance (registros completados / meta).

Usa Recharts para las gráficas. Usa Supabase Realtime para que cuando un Profesional sincronice datos, el dashboard del Coordinador se actualice automáticamente sin recargar la página:

```typescript
const channel = supabase
  .channel('dashboard-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'activities',
    filter: `entity_id=eq.${entityId}`,
  }, () => {
    // Recargar estadísticas
    refetchStats();
  })
  .subscribe();
```

VERIFICACIÓN: Como Coordinador, verifica que las tarjetas KPI muestren números correctos comparándolos manualmente con los registros en Supabase. Haz login como Profesional en otro dispositivo, sincroniza un formulario, y verifica que el dashboard del Coordinador se actualiza en tiempo real sin recargar.

---

## BLOQUE 8: ARREGLAR LA GENERACIÓN DE INFORMES PDF

### Problema: Los informes PDF no se generan o se generan incompletos sin fotos ni firmas

SOLUCIÓN: Implementa la generación de PDF usando jsPDF.

```bash
npm install jspdf
```

El informe PDF tiene esta estructura por cada Profesional:

PÁGINA 1 — Resumen:
- Título: "INFORME DE SEGUIMIENTO"
- Subtítulo: "PROGRAMA DE GESTIÓN SOCIAL EN CAMPO"
- Fecha de generación
- Información del proyecto: número de contrato, objeto, contratista, periodo
- Perfil del profesional: nombre, ID, rol, municipios
- Métricas de ejecución: número de Ex-Antes vs meta, Ex-Post vs meta, Momentos 1/2/3 vs meta
- Barra de avance general con porcentaje

PÁGINAS SIGUIENTES — Una ficha por cada registro (familia):
- Nombre completo del beneficiario en grande
- Tipo y número de documento
- Badge "COMPLETADO" si todas las actividades están hechas
- Sección I: Datos personales (fecha nacimiento con edad, celular, municipio, zona, dirección, indicaciones)
- Sección II: Caracterización social (género, grupo étnico, discapacidad, factor diferencial, personas a cargo)
- Sección III: Ruta de atención con 4 columnas:
  - Momento 1: fecha, tema tratado, FOTO DE EVIDENCIA renderizada como imagen, firma del beneficiario renderizada como imagen
  - Momento 2: misma estructura
  - Momento 3: misma estructura
  - Ex-Post: fecha, impacto positivo sí/no, foto de evidencia, firma de cierre
- Consentimiento: checkbox marcado con texto legal
- Firma del Profesional renderizada como imagen
- Firma del Supervisor renderizada como imagen
- Número de registro: "Registro X de N"

Para renderizar las fotos y firmas como imágenes en el PDF, descárgalas desde Supabase Storage, conviértelas a base64, e insértalas con jsPDF.addImage():

```typescript
import jsPDF from 'jspdf';

async function generateReport(professional, families, activities) {
  const doc = new jsPDF('p', 'mm', 'letter');
  
  // Página 1: Resumen
  doc.setFontSize(20);
  doc.text('INFORME DE SEGUIMIENTO', 20, 30);
  doc.setFontSize(12);
  doc.text('PROGRAMA DE GESTIÓN SOCIAL EN CAMPO', 20, 38);
  // ... más datos del resumen ...
  
  // Páginas de fichas individuales
  for (let i = 0; i < families.length; i++) {
    doc.addPage();
    const family = families[i];
    const familyActivities = activities.filter(a => a.family_id === family.id);
    
    // Nombre del beneficiario
    doc.setFontSize(16);
    doc.text(family.full_name, 20, 25);
    
    // ... renderizar todos los datos ...
    
    // Renderizar fotos de evidencia
    for (const activity of familyActivities) {
      if (activity.photo_url) {
        const photoBase64 = await fetchImageAsBase64(activity.photo_url);
        doc.addImage(photoBase64, 'JPEG', x, y, 40, 40);
      }
      if (activity.beneficiary_signature_url) {
        const sigBase64 = await fetchImageAsBase64(activity.beneficiary_signature_url);
        doc.addImage(sigBase64, 'PNG', x, y, 50, 20);
      }
    }
    
    // Número de registro
    doc.setFontSize(8);
    doc.text(`Registro ${i + 1} de ${families.length}`, 170, 270);
  }
  
  // Descargar
  doc.save(`Informe_${professional.full_name}.pdf`);
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
```

VERIFICACIÓN: Como Coordinador, genera el informe PDF de un Profesional que tenga al menos 2 familias con todas las actividades completadas y con fotos y firmas. Abre el PDF generado. Verifica que: la primera página tiene el resumen con métricas correctas, cada familia tiene su ficha en una página separada, las fotos de evidencia se ven como imágenes (no como URLs de texto), las firmas se ven como imágenes, el número de registro es correcto ("Registro 1 de 2", "Registro 2 de 2").

---

## BLOQUE 9: GENERAR EL APK FUNCIONAL

Después de que TODOS los bloques anteriores estén funcionando y verificados:

### Paso 1: Configurar Capacitor correctamente

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/camera @capacitor/geolocation @capacitor/network @capacitor/filesystem @capacitor/splash-screen @capacitor/status-bar
npx cap init "Control G" "com.drandigital.controlg" --web-dir=dist
npx cap add android
```

Archivo capacitor.config.ts:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drandigital.controlg',
  appName: 'Control G',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: { presentationStyle: 'fullscreen' },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1B3A4B',
    },
  },
};
export default config;
```

### Paso 2: Configurar permisos Android

En android/app/src/main/AndroidManifest.xml, asegurar que estén estos permisos:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### Paso 3: Build y generar APK

```bash
npm run build
npx cap sync android
npx cap open android
```

En Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s).

### Paso 4: Probar el APK en un dispositivo real

Instala el APK en un teléfono Android. Ejecuta esta secuencia de pruebas:

1. Abre la app. Debe mostrar pantalla de login.
2. Inicia sesión como Profesional con internet activo. Debe cargar formularios y registros.
3. Activa modo avión. La app NO debe crashear. Debe mostrar nube roja "Sin conexión".
4. Abre un registro y diligencia el formulario completo: llena campos de texto, selecciona opciones, toma una foto con la cámara, captura firma digital, acepta consentimiento.
5. Finaliza el formulario. Debe guardarse localmente. El contador de pendientes debe incrementar.
6. Abre otro registro y llena otro formulario.
7. Desactiva modo avión (reconecta internet). Sin tocar nada, en los siguientes 30 segundos los formularios deben sincronizarse automáticamente. El indicador debe pasar a verde "Sincronizado".
8. En un computador, abre el panel del Coordinador. Los registros recién sincronizados deben aparecer con todos los datos, fotos y firmas.
9. Genera el informe PDF del Profesional. Debe incluir las fichas con fotos y firmas renderizadas.

Si CUALQUIERA de estos 9 pasos falla, identifica el problema, corrígelo y repite la prueba completa desde el paso 1.

---

## LISTA DE VERIFICACIÓN FINAL

Antes de entregar, confirma que CADA uno de estos puntos funciona:

- [ ] El Administrador puede crear una entidad con municipios DIVIPOLA y Coordinador
- [ ] El Coordinador puede iniciar sesión y ver su dashboard con estadísticas correctas
- [ ] El Coordinador puede crear y gestionar Profesionales de Campo
- [ ] El Coordinador puede asignar municipios a Profesionales
- [ ] El Coordinador puede diseñar formularios con el Form Builder (todos los tipos de campo)
- [ ] El Coordinador puede publicar formularios
- [ ] El Coordinador puede cargar registros (familias) y asignarlos a Profesionales
- [ ] El Profesional puede iniciar sesión y los datos se precargan para uso offline
- [ ] El Profesional puede ver sus registros asignados SIN internet
- [ ] El Profesional puede abrir y diligenciar formularios SIN internet
- [ ] Los campos de texto, numérico, selección, fecha funcionan correctamente
- [ ] La cámara se abre y captura fotos que se guardan localmente
- [ ] La captura de video funciona y se guarda localmente
- [ ] La firma digital funciona con canvas táctil
- [ ] La geolocalización se captura automáticamente
- [ ] El auto-guardado persiste datos en IndexedDB campo por campo
- [ ] Al cerrar y reabrir la app, los borradores se restauran
- [ ] Al finalizar un formulario, se agrega a la cola de sincronización
- [ ] Al recuperar internet, la sincronización se activa AUTOMÁTICAMENTE
- [ ] Las fotos, videos y firmas se suben a Supabase Storage
- [ ] El indicador de sync muestra el estado correcto (verde/naranja/rojo)
- [ ] El dashboard del Coordinador muestra estadísticas en tiempo real
- [ ] Los informes PDF se generan con fotos y firmas como imágenes
- [ ] Los dropdowns de departamento y municipio traen datos DIVIPOLA reales
- [ ] El APK se instala y funciona en un dispositivo Android real
- [ ] TODO el flujo offline funciona en el APK: sin internet → llenar → fotos → firmas → finalizar → reconectar → sync automático
