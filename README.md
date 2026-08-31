# Control G 2.11 · LATAM + GIS

Aplicación multi-entidad para caracterización y acompañamiento psicosocial en campo. La interfaz web y el APK de Capacitor funcionan sin conexión: familias, formularios, respuestas, fotografías y actividades se guardan localmente y se sincronizan de forma idempotente cuando regresa la señal.

## Arquitectura

- React + TypeScript + Vite PWA.
- Capacitor 6 para Android.
- Dexie/IndexedDB como base local y cola offline.
- Supabase Auth, Postgres, Storage y funciones SQL protegidas.
- Aislamiento por entidad mediante Row Level Security (RLS).
- Identificadores locales únicos para evitar duplicados en reintentos de sincronización.
- PostGIS, índices GiST, capas GeoJSON por entidad y mapa vectorial offline con puntos, recorridos, polígonos, grupos, calor y coropletas de cobertura.
- Configuración regional para 20 países latinoamericanos y catálogos administrativos oficiales versionados.
- Analítica reproducible con diccionario de indicadores y exportación PDF, DOCX, XLSX y CSV.
- Gobierno de datos: consentimientos, manifiestos SHA-256, retención, accesos sensibles y MFA TOTP configurable.
- Observabilidad con health check Supabase, sonda externa cada cinco minutos, incidentes deduplicados, sanitización de errores, ADR y runbooks de recuperación.

## Configuración

1. Copia `.env.example` a `.env.local` y configura únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para la aplicación.
2. Ejecuta, en orden, las migraciones de `supabase/migrations/` en la instancia de Supabase. Las migraciones `202608310001` a `202608310010` agregan PostGIS/GIS LATAM, gobierno de datos, evidencias con mínimo privilegio, versiones inmutables de formularios, la cola ArcGIS, geometrías de campo, snapshots reproducibles, retención auditable, catálogos territoriales versionados, adjuntos ArcGIS gobernados y leases recuperables para su trabajador programado.
3. La migración instala `admin_create_user`, una RPC `SECURITY DEFINER` que valida el JWT, el rol y la entidad antes de crear Auth + perfil en una sola transacción.
4. Para crear o verificar las cuentas iniciales, define `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `CONTROL_G_INITIAL_PASSWORD`, y ejecuta `npm run backend:seed`.
5. Para volver a cargar la capa visual oficial de municipios de Bolívar, ejecuta `npm run backend:seed:gis`. Para publicar su catálogo PostGIS versionado y fijarlo a la entidad inicial, ejecuta `npm run backend:publish:bolivar-jurisdictions`. Ambos usan el archivo de `supabase/seed/` y requieren la clave administrativa solo en el entorno local.

Las claves `service_role`, JWT, Postgres y Dashboard son exclusivamente administrativas: nunca deben usar el prefijo `VITE_`, guardarse en Git ni incluirse en el APK.

## Operación, salud y recuperación

- `GET /api/health` comprueba la aplicación y una consulta RLS de solo lectura a Supabase. No publica URL, claves, entidades ni datos.
- `npm run health:check` valida manualmente el endpoint publicado; `npm run health:probe` comprueba además `/login`, HSTS y la disponibilidad agregada de Supabase.
- `.github/workflows/production-health.yml` ejecuta la sonda cada cinco minutos, abre un único incidente después de dos fallos consecutivos y lo resuelve después de tres éxitos. Solo usa el `GITHUB_TOKEN` efímero del workflow.
- El límite, severidades y procedimiento de incidentes están en `docs/runbooks/OPERATIONS_AND_INCIDENTS.md`.
- La telemetría sanitizada es opcional y permanece desactivada hasta aprobar privacidad; no incorpora respuestas, GPS, medios ni identificadores.
- `npm run db:backup`, `npm run db:backup:verify` y `npm run db:restore:drill` implementan respaldo custom, SHA-256 y restauración exclusiva en una base desechable.
- El procedimiento completo, incluidos Storage, RPO/RTO y criterios de aceptación, está en `docs/runbooks/BACKUP_RESTORE.md`.
- Las decisiones de arquitectura están registradas en `docs/adr/`.

## Desarrollo y pruebas

```bash
npm install
npm run build
npm run backend:check
```

La comprobación integral opcional (`npm run backend:verify`) inicia sesión, crea y elimina usuarios y datos temporales, y valida RLS, formularios, Storage, idempotencia y la cola ArcGIS. `npm run backend:verify:arcgis` prueba además la API publicada contra un Feature Service público. `npm run backend:verify:jurisdictions` ensaya preview, publicación versionada, jerarquía y PostGIS dentro de una transacción que termina en rollback. Estas pruebas requieren credenciales administrativas solo en el entorno de ejecución.

Una migración individual se puede aplicar por el canal administrativo de Supabase con `npm run backend:migrate:file -- supabase/migrations/ARCHIVO.sql`, proporcionando las variables administrativas indicadas por el script. No se registran secretos en el repositorio.

El primer inicio de sesión del dispositivo requiere conexión. Después, la sesión, los formularios y las familias quedan precargados localmente; fotos, firmas y respuestas permanecen en cola hasta que el dispositivo recupere señal.

## Mapa territorial e interoperabilidad GIS

- Las rutas privadas `/admin/map`, `/coord/map`, `/apoyo/map` y `/field/map` respetan rol y entidad.
- El superadministrador selecciona una entidad antes de consultar el mapa; las capturas y políticas de clientes distintos nunca se mezclan en la vista.
- `/admin/territories` importa GeoJSON Polygon/MultiPolygon, previsualiza, valida jerarquías, genera SHA-256 y publica una versión inmutable del catálogo oficial sin borrar la anterior.
- El mapa base de 20 países está embebido y funciona sin proveedor de teselas ni conexión.
- Las capturas GPS, actividades, hogares y capas institucionales quedan disponibles en IndexedDB; la visualización ofrece puntos, agrupación adaptativa, calor y cobertura por polígonos.
- El constructor incorpora campos de recorrido y área: capturan vértices GPS sin internet, conservan precisión/altitud/tiempo y, al sincronizar, generan geometrías PostGIS con longitud, perímetro y área.
- Las respuestas se pueden clasificar por variables temáticas no sensibles; nombres, documentos, teléfonos, direcciones, firmas y fotos se excluyen del índice cartográfico.
- Administración y coordinación disponen de `/admin/integrations/arcgis` y `/coord/integrations/arcgis`: verificación de servicios, importación pública, OAuth 2.0 de aplicación en servidor, lotes, reintentos, idempotencia, cancelación y trazabilidad por registro. Supabase conserva solo una referencia al secreto; el Client Secret real vive en las variables cifradas del servidor y nunca llega al navegador o al APK.
- `/api/maintenance/arcgis` procesa la cola en servidor con autenticación cron, reclamo atómico, exclusión `SKIP LOCKED`, lease de tres minutos y recuperación de ejecuciones interrumpidas. El cron diario incluido es compatible con Vercel Hobby; un plan con mayor frecuencia o un programador externo puede invocar el mismo endpoint protegido.
- La exportación opcional de evidencias exige autorización explícita por mapeo y una capa con adjuntos habilitados. Solo transmite hasta tres fotos JPEG/PNG/WebP por registro, nunca firmas; valida entidad, ruta, tamaño, MIME, firma binaria y SHA-256, usa nombres técnicos y evita duplicados por evidencia y nombre remoto.
- La importación elimina campos con nombres sensibles y conserva únicamente atributos escalares acotados. La publicación saliente usa una lista explícita de metadatos operativos no sensibles.
- La descarga soporta GeoJSON, CSV WGS84, Shapefile ZIP, GeoPackage OGC 1.3 e informe territorial PDF.
- La precisión visible y exportable, el umbral de supresión de grupos pequeños y la meta de capturas por zona se configuran por entidad; el GPS original permanece protegido en Supabase.

La capa inicial y el catálogo PostGIS de los 46 municipios de Bolívar provienen del servicio DIVIPOLA/MGN 2025 del DANE. La versión territorial está fijada a la entidad inicial y se cachea para uso offline después del inicio de sesión.

## Analítica y gobierno de datos

- `/admin/analytics`, `/coord/analytics` y `/apoyo/analytics` calculan cobertura GPS, revisión, completitud y latencia de sincronización con filtros y fecha de corte.
- Los informes PDF, DOCX, XLSX y CSV incorporan versión metodológica, filtros, advertencias y huella SHA-256.
- Los cortes de indicadores se calculan en Supabase, quedan fijados con versión metodológica y pueden ejecutarse diariamente mediante el endpoint protegido de Vercel Cron.
- `/admin/governance` y `/coord/governance` administran políticas de retención y muestran consentimiento, integridad de evidencias y accesos sensibles.
- La retención opera primero en vista previa; una ejecución exige superadministración y confirmación explícita, registra elegibles/afectados y evita purgas parciales de archivos o evidencia legal.
- El constructor incluye diez plantillas LATAM, asistente de calidad y versiones publicadas inmutables.
- MFA TOTP se puede exigir por entidad. La imposición RLS AAL2 está en `supabase/manual/enable_privileged_mfa_enforcement.sql` y solo debe ejecutarse en ventana de mantenimiento después de enrolar dos administradores y completar un piloto.

## APK Android

Requiere JDK 17 o superior y Android SDK 35:

```bash
npm run android:apk
```

El APK instalable de pruebas queda en `android/app/build/outputs/apk/debug/app-debug.apk`; la copia entregable 2.11.0 se genera en `entregables/Control-G-2.11.0-LATAM-GIS-offline-debug.apk`. Para Play Store o distribución firmada se debe aportar el keystore institucional y configurar la firma de `release` fuera del repositorio.

## Cliente inicial: Gobernación de Bolívar

La migración crea la entidad inicial, cinco municipios de operación y cinco instrumentos: Ex-Antes, los tres momentos de capacitación y Ex-Post. Los tres momentos incorporan el contenido suministrado sobre buen trato y hábitos saludables, ambiente seguro y responsabilidad familiar, y derechos de niñez/adolescencia con prevención del bullying.
