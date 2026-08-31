# Auditoría de cumplimiento — Plan Maestro Control G LATAM + GIS

Fecha de corte: 31 de agosto de 2026

Versión auditada: 2.4.0

Fuente contractual: `entregables/Plan_Maestro_Implementacion_Control_G_LATAM_GIS.docx`

## Regla de medición

El porcentaje es ponderado con los pesos del Plan Maestro. Una fase solo recibe 100 % cuando están terminados su código, migración, prueba técnica, prueba operativa y documentación. Una estructura de base de datos sin flujo funcional, o una función sin piloto físico, se contabiliza parcialmente.

## Resultado ponderado

| Fase | Peso | Cumplimiento | Aporte | Evidencia actual | Pendiente verificable |
|---|---:|---:|---:|---|---|
| 0. Auditoría y línea base | 5 % | 90 % | 4,50 % | Inventario, matriz de brechas, pruebas y registro vivo | ADR formales y restauración de backup ensayada |
| 1. Multiempresa y multipaís | 10 % | 70 % | 7,00 % | RLS por entidad, 20 perfiles versionados, configuración regional y jurisdicciones PostGIS | Importador/versionador de divisiones administrativas para todos los países y dos pilotos LATAM |
| 2. Offline, GPS y sincronización | 15 % | 80 % | 12,00 % | Dexie, cola idempotente, medios antes que respuestas, metadatos GNSS, rechazo 0/0 y manifiesto SHA-256 | Ensayo físico multidía en modo avión, cierre forzado, batería y gran volumen de evidencias |
| 3. PostGIS y mapa interno | 15 % | 78 % | 11,70 % | PostGIS, GiST, mapa vectorial offline, capas, puntos, grupos, calor, coropleta, privacidad espacial y capa DANE | Captura de líneas/polígonos en campo, reglas de cobertura y supresión cartográfica parametrizable |
| 4. ArcGIS e interoperabilidad | 10 % | 45 % | 4,50 % | Importación REST, publicación editable, metadatos de conexión/mapeo/jobs y GeoJSON/CSV/SHP/PDF | OAuth servidor, referencias Vault operativas, jobs con reintentos/adjuntos, GPKG y sandbox ArcGIS |
| 5. Indicadores y reportes | 12 % | 75 % | 9,00 % | Diccionario versionado, filtros, KPIs, territorio, supresión y salidas PDF/DOCX/XLSX/CSV trazables | Cálculo servidor, snapshots programados y batería de regresión con datasets patrón |
| 6. Formularios y plantillas | 8 % | 85 % | 6,80 % | Asignación explícita, diez plantillas, asistente de calidad, momentos de Bolívar y versiones inmutables SHA-256 | Flujos de aprobación editorial, traducciones y biblioteca validada por dominios/países |
| 7. Seguridad y privacidad | 10 % | 72 % | 7,20 % | RLS, mínimo privilegio de evidencia, auditoría, consentimientos, retención, centro de gobierno y MFA TOTP guiado | Activar AAL2 RLS con cambio aprobado, ejecutar retención/anonimización, backup-restauración y revisión externa |
| 8. SEO LATAM | 6 % | 85 % | 5,10 % | Páginas por intención, 15 artículos, sitemap, robots, datos estructurados, CMS y WhatsApp | Medición continua Search Console, clusters por país y calendario editorial sostenido |
| 9. QA y piloto | 6 % | 55 % | 3,30 % | Pruebas automatizadas, build, lint, E2E Supabase y QA visual responsive de analítica/GIS | Dispositivos Android físicos, carga, seguridad, accesibilidad integral y piloto ArcGIS |
| 10. Lanzamiento y operación | 3 % | 60 % | 1,80 % | Main/Vercel, migraciones repetibles, APK debug y documentación técnica | APK release firmada, monitoreo/alertas, runbooks, formación y mesa de ayuda |

**Avance global auditado: 72,90 %.**

## Corrección de la línea base anterior

El 83,35 % anterior trataba como completas varias fases con implementación parcial, especialmente GIS, ArcGIS, seguridad, QA y operación. La reauditoría leyó todos los criterios del documento fuente y separó “código disponible” de “aceptación completa”. El cambio a 72,90 % no representa pérdida de funciones: es una corrección metodológica y ya incluye el incremento 2.4.0.

## Evidencias 2.4.0

- Migraciones remotas aplicadas: fundamentos del Plan Maestro, mínimo privilegio de evidencias y versiones inmutables.
- Verificación remota con datos temporales: Auth/MFA disponible, RLS, asignaciones, Storage, GPS/PostGIS, SHA-256, países, indicadores, historial de formularios, reportes, auditoría e idempotencia.
- Mapa GIS revisado visualmente en escritorio y 390 × 844 px con coropleta y agrupación de puntos.
- Analítica revisada visualmente en escritorio y móvil; traducciones, supresión de grupos pequeños y exportaciones estructurales verificadas.
- Suite local aprobada: 25/25 pruebas, lint, TypeScript/Vite/PWA y pruebas/compilación Gradle sin fallos.
- APK de prueba 2.4.0 generado con `versionCode 8`, SDK objetivo 35 y SHA-256 `c23317e94bbb8d0721451ec709623dae550bbfed93e0827082f18c65a104307a`.
- La imposición RLS AAL2 permanece deliberadamente manual porque puede bloquear usuarios privilegiados sin TOTP. Su archivo contiene prerrequisitos y no forma parte de las migraciones automáticas.

## Condiciones para declarar 100 %

1. Aprobar y ejecutar pilotos físicos en Colombia y al menos otro país LATAM.
2. Completar ArcGIS OAuth/Vault/jobs/GPKG con sandbox institucional.
3. Activar AAL2 RLS mediante cambio controlado y probar recuperación.
4. Ejecutar respaldo-restauración y ciclos reales de retención/anonimización.
5. Aprobar carga, accesibilidad, seguridad y pruebas de dispositivos físicos.
6. Firmar el APK de producción e instalar monitoreo, alertas, runbooks y soporte.
