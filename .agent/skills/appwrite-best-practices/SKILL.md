---
name: appwrite-best-practices
description: "Rules, standards, and best practices for developing backends using Appwrite (Databases, Auth, Storage, Functions, Realtime)."
---

# Reglas y Mejores Prácticas para Implementar Appwrite

Este documento define el estándar de implementación para proyectos que utilizan **Appwrite** como Backend-as-a-Service (BaaS). Aplica tanto para proyectos web como móviles.

## 1. Principios Fundamentales

- **Seguridad por defecto**: A diferencia de otros sistemas, en Appwrite los recursos (colecciones, buckets) nacen cerrados (sin acceso). Sólo se debe otorgar acceso explícitamente y conforme al principio de mínimo privilegio.
- **Validación del lado del servidor**: Nunca confíes en el cliente. Toda validación crítica debe realizarse en las Cloud Functions o a nivel base de datos usando restricciones de atributos en Appwrite.
- **Uso Inteligente del Client SDK vs Server SDK**:
  - `Client SDK` (Web, Flutter, Apple, Android): Se usa para operaciones del usuario recurrente (lectura pública, autenticación, creación de documentos bajo sus permisos). Jamás contiene API Keys, solo el ID del Proyecto.
  - `Server SDK` (Node, Python, Dart, etc.): Se ejecuta en las Appwrite Functions o servidores confiables. Utiliza API Keys para escalar privilegios y ejecutar tareas asíncronas, migraciones, correos, validaciones pesadas, etc.

## 2. Bases de Datos (Databases & Collections)

### Diseño de Esquemas
1. **Nombres Convencionales**:
   - Bases de Datos: Usar PascalCase o kebab-case descriptivo (ej. `production-db`, `MainDatabase`).
   - Colecciones: Plural, PascalCase o snake_case (ej. `UsersProfiles`, `tareas`, `projects`).
2. **IDs Auto-Generados vs Personalizados**:
   - Para IDs de usuario y perfiles asociados, usa siempre IDs consistentes e.g. `user_id` = `profile_id`. A esto se le conoce como **Appwrite ID()** (usar `ID.unique()` a menos que obliguen lo contrario).
3. **Referencias Relacionales**:
   - Para relacionar un documento con otro, guarda el ID único del documento padre o hijo como un atributo `string(36)` o con el nuevo tipo nativo de **Relación** si la versión de Appwrite lo soporta (Recomendado).

### Índices (Indexes)
- Todo atributo sobre el cual se vayan a ejecutar filtros (`Query.equal`, `Query.search`, `Query.greaterThan`) requiere de un índice.
- Define los índices tan pronto como configures la colección para evitar cuellos de botella.

### Sistema de Permisos y Roles (Document vs Collection Security)
- Usa **Permisos a nivel Colección** por defecto en colecciones compartidas (Noticias, Configuración pública) donde el rol genérico dicta acceso (`role:all`, `role:users`).
- Usa **Permisos a nivel Documento** (Document Security = true) para colecciones privadas de usuarios (Mensajes, Pagos, Datos de Salud). El creador del documento automáticamente debería recibir acceso total (`user:[USER-ID]`).
- Jamás pongas roles permitidos genéricos como `role:all` en "delete" o "update".

## 3. Autenticación (Auth)

1. **Email / Contraseña**:
   - Siempre maneja la recuperación de contraseñas y doble factor de forma gracefully.
   - Envía el enlace Mágico / de confirmación una vez creada la cuenta si es necesario validad identidad.
2. **Gestión de Sesión**:
   - Appwrite maneja la sesión con cookies automatically de lado del entorno Web y LocalStorage seguro de lado móvil.
   - No almacenes de manera redundante tokens de Appwrite.
3. **Equipos (Teams)**:
   - Para manejar roles como "Admin", "Manager", "Contador", utiliza `Teams`. Los permisos deben otorgarse hacia reglas del tipo `team:[TEAM_ID]`.

## 4. Archivos y Almacenamiento (Storage)

- **Buckets Separados**: Crea un Bucket por tipo de contenido ("Fotos de Perfil", "Documentos PDF", "Facturas").
- **Validaciones Rigurosas**: Limita las extensiones (ej. solo `.jpg`, `.png`, `.webp` para perfil) y define el peso máximo del archivo al momento de crear el Bucket.
- **Seguridad en Buckets**: Los archivos confidenciales no deben otorgar permisos a `role:all`. Las firmas/IDs de archivo deben ser manejadas en la base de datos de Appwrite y no inferidas.

## 5. Cloud Functions

- Las tareas pesadas, integraciones con terceros, notificaciones SMS/Correo, procesamiento OCR o analítica, envíalas a funciones sin conexión directa del cliente ('async').
- **Variables de Entorno**:
  - `APPWRITE_API_KEY`, `STRIPE_KEY`, `OPENAI_API_KEY` siempre deben ser inyectadas mediante "Variables de Entorno" Globales en la configuración de Appwrite, no pasadas en el cuerpo desde el frontend/app móvil.
- **Retornos consistentes**: Toda ejecución debe retornar un JSON con `{ "status": "success/error", "data": ... }` usando `context.res.json()`.

## 6. Sincronización y Realtime

- **Cierre de Ciclos**: Suscribirse a un canal Real-time en Appwrite (ej. `databases.[ID].collections.[ID].documents`) es potente, pero se debe invocar el *return call* de la suscripción (`unsubscribe()`) para prevenir fugas de memoria y cobros adicionales por conexiones persistentes zombies, especialmente en **React/Flutter** dentro del Lifecycle (ej. `useEffect() / dispose()`).

## 7. Manejo Ágil del Agente y el MCP

- Al utilizar el agente **`appwrite-specialist`**:
  - Si tienes dudas sobre la sintaxis de la versión actual o el SDK utilizado (ya sea Node, Flutter, Dart, React, Apple, Android), utiliza el MCP de `appwrite-docs` para solicitar los ejemplos actualizados **(`appwrite-docs_getFeatureExamples`)** antes de generar código. Esto evita problemas drásticos por diferencias de sintaxis entre `appwrite 1.0.0` y `appwrite >1.4.0`.

---
*Este documento establece las prioridades para la implementación de Appwrite Control G y las infraestructuras a desarrollar en el futuro con el AI-kit.*
