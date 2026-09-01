# Auditoría de cumplimiento — Plan Maestro Control G LATAM + GIS

Fecha de corte: 1 de septiembre de 2026

Versión auditada: 2.16.0

Fuente contractual: `entregables/Plan_Maestro_Implementacion_Control_G_LATAM_GIS.docx`

## Regla de medición

El porcentaje es ponderado con los pesos del Plan Maestro. Una fase solo recibe 100 % cuando están terminados su código, migración, prueba técnica, prueba operativa y documentación. Una estructura de base de datos sin flujo funcional, o una función sin piloto físico, se contabiliza parcialmente.

## Resultado ponderado

| Fase | Peso | Cumplimiento | Aporte | Evidencia actual | Pendiente verificable |
|---|---:|---:|---:|---|---|
| 0. Auditoría y línea base | 5 % | 95 % | 4,75 % | Inventario, matriz de brechas, cuatro ADR formales, pruebas y registro vivo | Restauración real ensayada dentro de la red de Supabase |
| 1. Multiempresa y multipaís | 10 % | 82 % | 8,20 % | RLS por entidad, 20 perfiles, importador/versionador transaccional, historial SHA-256 y catálogo oficial Bolívar | Catálogos nacionales para los demás países y segundo piloto institucional LATAM |
| 2. Offline, GPS y sincronización | 15 % | 83 % | 12,45 % | Dexie, cola idempotente, medios antes que respuestas, GNSS/manifiesto y ensayo reproducible de 750 respuestas + 1.500 evidencias con cierre forzado | Ensayo físico multidía en modo avión, batería y gran volumen de evidencia real |
| 3. PostGIS y mapa interno | 15 % | 95 % | 14,25 % | PostGIS/GiST, mapa offline, rutas geodésicas 2-opt, inspección topológica, catálogos cacheados, recorridos, polígonos, calor, cobertura y privacidad | Enrutamiento vial con red oficial y validación física prolongada |
| 4. ArcGIS e interoperabilidad | 10 % | 84 % | 8,40 % | API autenticada, OAuth de aplicación en servidor, cola idempotente, trabajador programado con reclamo atómico/leases recuperables, E2E público, formatos GIS y adjuntos fotográficos gobernados con autorización, integridad y trazabilidad | Credencial OAuth/sandbox institucional, prueba real de adjuntos y activación segura del trabajador en Vercel |
| 5. Indicadores y reportes | 12 % | 88 % | 10,56 % | Diccionario versionado, KPIs, territorio, supresión, salidas trazables, snapshots servidor y dataset patrón con resultados fijos y privacidad regresiva | Activar cron en Vercel y ampliar el banco de datasets sectoriales |
| 6. Formularios y plantillas | 8 % | 100 % | 8,00 % | Motor offline compartido, matriz, moneda, audio/PDF, lógica, cálculos, traducciones regionales administrables, perfiles de validación para 20 países, privacidad, simulación, plantillas, flujo editorial y asignación avanzada | — |
| 7. Seguridad y privacidad | 10 % | 83 % | 8,30 % | RLS, evidencia mínima, auditoría, recuperación de contraseña con enlace único, reautenticación, política robusta, consentimientos, MFA y retención auditable | Activar AAL2 RLS, purga Storage coordinada, backup-restauración y revisión externa |
| 8. SEO LATAM | 6 % | 92 % | 5,52 % | Páginas por intención, cluster estático para 20 países, contenido portugués Brasil, 15 artículos, sitemap, canonical, datos estructurados, CMS y WhatsApp | Medición continua Search Console y calendario editorial sostenido |
| 9. QA y piloto | 6 % | 81 % | 4,86 % | 76 pruebas, build/lint, E2E Supabase, dataset patrón, resistencia IndexedDB, seguridad, recuperación, carga, permisos Android y QA móvil funcional | Dispositivos Android físicos, auditoría WCAG/pentest externo y piloto ArcGIS institucional |
| 10. Lanzamiento y operación | 3 % | 80 % | 2,40 % | Main/Vercel, health Supabase, sonda GitHub cada 5 minutos, incidentes automáticos, error boundary, backup/restore, runbooks, cron protegido y APK debug | Segunda región de monitoreo, secretos del cron, ensayo restore, APK release firmada, formación y mesa de ayuda operativa |

**Avance global auditado: 87,69 %.**

## Corrección de la línea base anterior

El 83,35 % anterior trataba como completas varias fases con implementación parcial, especialmente GIS, ArcGIS, seguridad, QA y operación. La reauditoría leyó todos los criterios del documento fuente y separó “código disponible” de “aceptación completa”. Los incrementos 2.5.0 a 2.16.0 elevan la línea base corregida de 72,90 % a 87,69 % con ArcGIS/GeoPackage, geometrías de campo, snapshots, retención, observabilidad, catálogos versionados, gobierno editorial, formularios offline avanzados, asignación operativa, rutas offline, topología, localización LATAM, recuperación de acceso y resistencia IndexedDB reproducible.

## Evidencias 2.16.0

- Recuperación autoservicio desde el login mediante enlace de uso único de Supabase, pantalla separada para establecer la nueva clave y mensaje uniforme que no revela si un correo existe.
- Cambio de contraseña protegido por reautenticación real con la clave vigente; la misma política de 12 caracteres, mayúscula, minúscula, número y símbolo cubre administración, coordinación y campo.
- QA móvil de las rutas `/recuperar-contrasena` y `/restablecer-contrasena`: formulario accesible, enlace vencido bloqueado, un único `main` y cero desbordamiento horizontal.
- Producción 2.16.0 aceptada: health `operational`, Supabase `ok`, ruta de restablecimiento HTTP 200 y encabezados `no-store`/`noindex`. El correo de recuperación fue rechazado por falta de SMTP en la instancia autohospedada, por lo que queda disponible un procedimiento de emergencia que valida el superadmin y copia la clave temporal solo al portapapeles.

- El mapa calcula en el dispositivo rutas de hasta 100 visitas mediante vecino más cercano y mejora 2-opt, conserva la operación sin red, enumera paradas y declara explícitamente que la distancia geodésica no reemplaza navegación vial.
- El importador de capas inspecciona WGS84, mínimos de vértices, cierre, duplicados, autointersección y huecos fuera del anillo exterior antes de habilitar la publicación.
- El constructor administra traducciones regionales de páginas, etiquetas, ayudas, ejemplos, opciones y matrices sin cambiar identificadores ni valores; el capturador resuelve la variante exacta disponible offline.
- Perfiles offline para documento, teléfono y código postal cubren los 20 países configurados y el asistente de calidad detecta país inválido o traducciones incompletas.
- Ensayo Dexie reproducible aprobado con 750 respuestas y 1.500 evidencias: persistencia tras cierre forzado, reapertura, carga parcial de medios y liberación posterior de respuestas.
- Dataset patrón fija 10 registros, siete KPIs, supresión, filtros y territorio; su regresión detectó y corrigió la reaparición de un campo sensible dinámico en las variables analíticas.
- Cluster SEO estático de 20 países publicado en la compilación, con versión portuguesa para Brasil, canonical, idioma, FAQ/Organization/WebApplication, sitemap e ingreso atribuido al WhatsApp comercial.
- La política web autoriza micrófono únicamente al mismo origen, manteniendo cámara y geolocalización acotadas a Control G.

- Nuevos tipos de campo matriz, moneda ISO y audio; se simulan y capturan con el mismo motor web/APK, se validan sin red y se presentan con formato legible en la bandeja administrativa.
- El audio se graba como Blob local, respeta duración/tamaño preventivo, entra a la cola offline antes de la respuesta, se carga al bucket privado `field-audio`, se registra en el manifiesto como `audio` y se reproduce mediante URL firmada.
- Asignación operativa por territorio habilitado, grupo, vigencia, prioridad, cuota e instrucciones; las desasignaciones cambian a `inactive` en vez de borrar historial.
- El contador transaccional de respuestas actualiza el avance por profesional. La interfaz detiene nuevas capturas conocidas al cumplir la cuota, permite reanudar borradores y nunca descarta una respuesta ya capturada offline dentro de la vigencia.
- Migración remota 012 aplicada y esquema PostgREST confirmado sin sesión: seis columnas avanzadas disponibles y RLS anónima devolviendo cero filas.

- Constructor y captura profesional usan el mismo motor, por lo que la simulación reproduce las páginas, campos, validaciones, cálculos y reglas que ejecutan web y APK.
- Reglas condicionales en cascada con nueve operadores; las respuestas de ramas ocultas no activan dependencias posteriores ni se envían a Supabase.
- Validaciones offline de requerido, RegExp, mínimo/máximo, longitud, correo, teléfono, geometría y tamaño de archivo; el valor numérico cero y el booleano falso son respuestas válidas.
- Cálculos aritméticos locales con referencias `{{campo}}`, precedencia y paréntesis, sin `eval` ni ejecución de código dinámico.
- Propiedades de campo para ayuda visible, datos sensibles y justificación, límites, patrón/mensaje, archivo y condición; checklist de privacidad y estimación preventiva de almacenamiento por respuesta.
- Los documentos PDF se conservan offline, se cargan antes que la respuesta al bucket privado de documentos, se registran como `document` en el manifiesto y el coordinador los abre mediante URL firmada.
- Simulación móvil funcional aprobada a 390 × 844 px: errores obligatorios, aparición condicional, cálculo 5 × 4 = 20, navegación de dos páginas, envío local, cero desbordamiento horizontal y cero errores de consola.
- Release 2.16.0 compilada para web/PWA y Android, publicada en `main` y aceptada en producción.

- Migraciones remotas 001–012 aplicadas: fundamentos del Plan Maestro, mínimo privilegio, versiones inmutables, ArcGIS, geometrías de campo, snapshots, retención, catálogos territoriales versionados, gobierno de adjuntos, leases recuperables, flujo editorial, asignaciones avanzadas y audio privado.
- La migración 011 separa el candidato de la versión publicada, impone un único cambio activo, revisión independiente, aprobación previa, control optimista, publicación atómica, eventos inmutables, RLS y archivado no destructivo. En producción se verificaron dos tablas, tres RPC, dos triggers, RLS activa, acceso autenticado a RPC y bloqueo de escritura directa/anónima.
- La prueba transaccional remota completó borrador → revisión → aprobación → publicación v1 → archivado, comprobó cuatro eventos editoriales y terminó en `ROLLBACK`; no dejó formularios ni auditoría temporal persistentes.
- Importador territorial administrable para los 20 países con preview, jerarquía, PostGIS, versión inmutable, SHA-256, historial y confirmación exacta; prueba real de publicación ejecutada dentro de una transacción con rollback.
- Catálogo DANE Bolívar 2025 publicado: raíz departamental, 46 municipios con geometrías válidas EPSG:4326 y entidad `gov-bolivar-2026` fijada a la nueva versión; el proceso es idempotente.
- El mapa del superadministrador exige seleccionar entidad y las jurisdicciones de su perfil se convierten en capas de solo lectura que IndexedDB conserva offline.
- Verificación remota con datos temporales: Auth/MFA, RLS, asignaciones, Storage, puntos/líneas/polígonos PostGIS, snapshots territoriales, supresión, retención preview, SHA-256, países, historial, reportes, ArcGIS e idempotencia.
- API ArcGIS desplegada en Vercel y protegida con JWT/rol; una solicitud anónima devuelve `401 AUTH_REQUIRED`.
- Flujo opt-in de adjuntos implementado: registra quién y cuándo autorizó, exige capa compatible, excluye firmas, limita tres fotos por registro, comprueba entidad/ruta/MIME/tamaño/firma binaria/SHA-256 y evita duplicados por evidencia y nombre técnico remoto.
- Migración 010 aplicada y verificada en producción: tres columnas de lease, restricción validada, índice parcial y RPC atómica con `SKIP LOCKED`; `authenticated` no puede ejecutarla y `service_role` sí.
- El trabajador protegido procesa hasta cuatro trabajos por invocación dentro de un presupuesto de 50 segundos, libera el lease en éxito/fallo, aplica backoff y recupera ejecuciones abandonadas sin duplicar el reclamo. El cron diario queda declarado en Vercel, pendiente de activar sus secretos solo-servidor con autorización del propietario.
- Prueba E2E publicada: verificación de Feature Service, encolado RPC, importación de dos polígonos, creación de capa interna, conteos auditables y limpieza automática.
- GeoPackage validado como SQLite OGC 1.3 (`application_id` GPKG, `user_version` 10300, WGS84/EPSG:4326, geometría Point e integridad `ok`).
- Mapa GIS revisado visualmente en escritorio y 390 × 844 px con coropleta protegida, polígonos de evidencia separados de límites, controles de 48 px y sin desbordamiento horizontal.
- Analítica revisada visualmente en escritorio y móvil; traducciones, supresión de grupos pequeños y exportaciones estructurales verificadas.
- Suite local aprobada: 76/76 pruebas, lint, TypeScript/Vite/PWA y 269 tareas Gradle con pruebas unitarias y compilación Android sin fallos.
- Dependencias de producción auditadas con `npm audit --omit=dev`: 0 vulnerabilidades conocidas después de actualizar React Router a 7.18.3 y corregir el árbol transitivo compatible.
- Encabezados publicados comprobados: HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, Referrer Policy, Permissions Policy y `X-Robots-Tag` en rutas privadas; el cron anónimo responde `401`.
- Carga local aprobada con ApacheBench: 1.000 solicitudes a `/` con concurrencia 40 y 500 a `/login` con concurrencia 25, 0 fallos; 1.295 y 1.604 solicitudes/s respectivamente.
- Accesibilidad responsive comprobada a 390 × 844 px: enlace de salto, un único `main`, etiquetas de campos, alertas anunciables, controles críticos de 44 × 44 px y ausencia de desbordamiento horizontal.
- Health check sin credenciales que comprueba Vercel y Supabase/PostgREST, devuelve estado/latencia y no expone host, claves, entidades o datos.
- Sonda externa de GitHub Actions activa cada cinco minutos: valida frontend, HSTS, health y Supabase; abre un único incidente tras dos fallos y lo cierra tras tres éxitos, usando únicamente el token efímero del repositorio.
- Error boundary para web/APK y telemetría opcional con redacción de tokens, correos, URL y números, lista de orígenes, límite de 8 KiB y rate limit; permanece apagada hasta aprobación de privacidad.
- Cuatro ADR aceptados y runbooks para severidades, incidentes, rotación, soporte de campo, respaldo y restauración.
- Herramienta de backup custom con manifiesto SHA-256, verificación `pg_restore` y restauración rechazada si destino/origen coinciden o la base no tiene nombre desechable. El puerto PostgreSQL público no responde; el ensayo debe ejecutarse en la red/VPS de Supabase.
- APK de prueba 2.16.0 generado con `versionCode 20`, `minSdk 23`, SDK objetivo 35, permisos de audio verificados y SHA-256 `a042107e28ceea131a34c4b55a4d12ef66cfb026cb296f56e711c081b498a3b3`.
- La imposición RLS AAL2 permanece deliberadamente manual porque puede bloquear usuarios privilegiados sin TOTP. Su archivo contiene prerrequisitos y no forma parte de las migraciones automáticas.

## Condiciones para declarar 100 %

1. Aprobar y ejecutar pilotos físicos en Colombia y al menos otro país LATAM.
2. Conectar una credencial OAuth real del cliente en Vercel y validar la exportación de registros y adjuntos en su sandbox ArcGIS.
3. Activar AAL2 RLS mediante cambio controlado y probar recuperación.
4. Ejecutar respaldo-restauración y ciclos reales de retención/anonimización.
5. Aprobar pruebas Android en dispositivos físicos, auditoría WCAG completa, pentest externo y resistencia prolongada con datos de piloto.
6. Añadir una segunda región de monitoreo, firmar el APK de producción y operar formación/mesa de ayuda.
