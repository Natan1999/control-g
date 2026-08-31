# Auditoría de cumplimiento — Plan Maestro Control G LATAM + GIS

Fecha de corte: 31 de agosto de 2026

Versión auditada: 2.8.0

Fuente contractual: `entregables/Plan_Maestro_Implementacion_Control_G_LATAM_GIS.docx`

## Regla de medición

El porcentaje es ponderado con los pesos del Plan Maestro. Una fase solo recibe 100 % cuando están terminados su código, migración, prueba técnica, prueba operativa y documentación. Una estructura de base de datos sin flujo funcional, o una función sin piloto físico, se contabiliza parcialmente.

## Resultado ponderado

| Fase | Peso | Cumplimiento | Aporte | Evidencia actual | Pendiente verificable |
|---|---:|---:|---:|---|---|
| 0. Auditoría y línea base | 5 % | 95 % | 4,75 % | Inventario, matriz de brechas, cuatro ADR formales, pruebas y registro vivo | Restauración real ensayada dentro de la red de Supabase |
| 1. Multiempresa y multipaís | 10 % | 70 % | 7,00 % | RLS por entidad, 20 perfiles versionados, configuración regional y jurisdicciones PostGIS | Importador/versionador de divisiones administrativas para todos los países y dos pilotos LATAM |
| 2. Offline, GPS y sincronización | 15 % | 80 % | 12,00 % | Dexie, cola idempotente, medios antes que respuestas, metadatos GNSS, rechazo 0/0 y manifiesto SHA-256 | Ensayo físico multidía en modo avión, cierre forzado, batería y gran volumen de evidencias |
| 3. PostGIS y mapa interno | 15 % | 90 % | 13,50 % | PostGIS/GiST, mapa vectorial offline, puntos, recorridos, polígonos, calor, coropleta, cobertura, privacidad/supresión parametrizable y capa DANE | Herramientas topológicas avanzadas, enrutamiento y validación física prolongada |
| 4. ArcGIS e interoperabilidad | 10 % | 70 % | 7,00 % | API autenticada, OAuth de aplicación en servidor, referencia de secreto, cola idempotente, reintentos, cancelación, auditoría, filtrado de atributos, E2E público y GeoJSON/CSV/SHP/GPKG/PDF | Credencial OAuth y sandbox institucional, adjuntos y ejecución programada desacoplada |
| 5. Indicadores y reportes | 12 % | 85 % | 10,20 % | Diccionario versionado, KPIs, territorio, supresión, salidas trazables y snapshots servidor con corte/filtros/metodología | Activar cron en Vercel y ampliar regresión con datasets patrón |
| 6. Formularios y plantillas | 8 % | 85 % | 6,80 % | Asignación explícita, diez plantillas, asistente de calidad, momentos de Bolívar y versiones inmutables SHA-256 | Flujos de aprobación editorial, traducciones y biblioteca validada por dominios/países |
| 7. Seguridad y privacidad | 10 % | 80 % | 8,00 % | RLS, evidencia mínima, auditoría, consentimientos, MFA y retención con preview/confirmación/anonimización auditada | Activar AAL2 RLS, purga Storage coordinada, backup-restauración y revisión externa |
| 8. SEO LATAM | 6 % | 85 % | 5,10 % | Páginas por intención, 15 artículos, sitemap, robots, datos estructurados, CMS y WhatsApp | Medición continua Search Console, clusters por país y calendario editorial sostenido |
| 9. QA y piloto | 6 % | 72 % | 4,32 % | 32 pruebas automatizadas, build/lint, E2E Supabase, auditoría de dependencias, encabezados, carga concurrente y QA accesible/responsive | Dispositivos Android físicos, auditoría WCAG/pentest externo y piloto ArcGIS institucional |
| 10. Lanzamiento y operación | 3 % | 72 % | 2,16 % | Main/Vercel, health Supabase, error boundary, telemetría sanitizada opcional, herramientas de backup/restore, runbooks, cron protegido y APK debug | Activar sonda/alertas, secretos del cron, ensayo restore, APK release firmada, formación y mesa de ayuda operativa |

**Avance global auditado: 80,83 %.**

## Corrección de la línea base anterior

El 83,35 % anterior trataba como completas varias fases con implementación parcial, especialmente GIS, ArcGIS, seguridad, QA y operación. La reauditoría leyó todos los criterios del documento fuente y separó “código disponible” de “aceptación completa”. Los incrementos 2.5.0 a 2.8.0 elevan la línea base corregida de 72,90 % a 80,83 % con ArcGIS/GeoPackage, geometrías de campo, snapshots de servidor, retención controlada, calidad, observabilidad y recuperación segura.

## Evidencias 2.8.0

- Migraciones remotas aplicadas: fundamentos del Plan Maestro, mínimo privilegio de evidencias, versiones inmutables, operación ArcGIS, geometrías de campo, snapshots y retención.
- Verificación remota con datos temporales: Auth/MFA, RLS, asignaciones, Storage, puntos/líneas/polígonos PostGIS, snapshots territoriales, supresión, retención preview, SHA-256, países, historial, reportes, ArcGIS e idempotencia.
- API ArcGIS desplegada en Vercel y protegida con JWT/rol; una solicitud anónima devuelve `401 AUTH_REQUIRED`.
- Prueba E2E publicada: verificación de Feature Service, encolado RPC, importación de dos polígonos, creación de capa interna, conteos auditables y limpieza automática.
- GeoPackage validado como SQLite OGC 1.3 (`application_id` GPKG, `user_version` 10300, WGS84/EPSG:4326, geometría Point e integridad `ok`).
- Mapa GIS revisado visualmente en escritorio y 390 × 844 px con coropleta protegida, polígonos de evidencia separados de límites, controles de 48 px y sin desbordamiento horizontal.
- Analítica revisada visualmente en escritorio y móvil; traducciones, supresión de grupos pequeños y exportaciones estructurales verificadas.
- Suite local aprobada: 32/32 pruebas, lint, TypeScript/Vite/PWA y 269 tareas de pruebas/compilación Gradle sin fallos.
- Dependencias de producción auditadas con `npm audit --omit=dev`: 0 vulnerabilidades conocidas después de actualizar React Router a 7.18.3 y corregir el árbol transitivo compatible.
- Encabezados publicados comprobados: HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, Referrer Policy, Permissions Policy y `X-Robots-Tag` en rutas privadas; el cron anónimo responde `401`.
- Carga local aprobada con ApacheBench: 1.000 solicitudes a `/` con concurrencia 40 y 500 a `/login` con concurrencia 25, 0 fallos; 1.295 y 1.604 solicitudes/s respectivamente.
- Accesibilidad responsive comprobada a 390 × 844 px: enlace de salto, un único `main`, etiquetas de campos, alertas anunciables, controles críticos de 44 × 44 px y ausencia de desbordamiento horizontal.
- Health check sin credenciales que comprueba Vercel y Supabase/PostgREST, devuelve estado/latencia y no expone host, claves, entidades o datos.
- Error boundary para web/APK y telemetría opcional con redacción de tokens, correos, URL y números, lista de orígenes, límite de 8 KiB y rate limit; permanece apagada hasta aprobación de privacidad.
- Cuatro ADR aceptados y runbooks para severidades, incidentes, rotación, soporte de campo, respaldo y restauración.
- Herramienta de backup custom con manifiesto SHA-256, verificación `pg_restore` y restauración rechazada si destino/origen coinciden o la base no tiene nombre desechable. El puerto PostgreSQL público no responde; el ensayo debe ejecutarse en la red/VPS de Supabase.
- APK de prueba 2.8.0 generado con `versionCode 12`, `minSdk 23`, SDK objetivo 35 y SHA-256 `b8a92ef4dceb7897ed2914dba163ad635e6897c772cf5080e284febe4399aefd`.
- La imposición RLS AAL2 permanece deliberadamente manual porque puede bloquear usuarios privilegiados sin TOTP. Su archivo contiene prerrequisitos y no forma parte de las migraciones automáticas.

## Condiciones para declarar 100 %

1. Aprobar y ejecutar pilotos físicos en Colombia y al menos otro país LATAM.
2. Conectar una credencial OAuth real del cliente en Vercel, validar exportación en su sandbox ArcGIS e implementar adjuntos.
3. Activar AAL2 RLS mediante cambio controlado y probar recuperación.
4. Ejecutar respaldo-restauración y ciclos reales de retención/anonimización.
5. Aprobar pruebas Android en dispositivos físicos, auditoría WCAG completa, pentest externo y resistencia prolongada con datos de piloto.
6. Activar la sonda externa y alertas, firmar el APK de producción y operar formación/mesa de ayuda.
