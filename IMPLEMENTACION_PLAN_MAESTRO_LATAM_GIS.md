# Ejecución del Plan Maestro Control G LATAM + GIS

Este archivo es el registro técnico vivo de la implementación. El avance global se calcula con la ponderación aprobada en el Plan Maestro y solo aumenta cuando el código, las migraciones y las pruebas correspondientes están verificados.

## Estado de ejecución

| Fase | Peso | Estado | Avance de fase | Aporte global |
|---|---:|---|---:|---:|
| 0. Auditoría y línea base | 5 % | Auditoría completa; ADR/restore pendientes | 90 % | 4,50 % |
| 1. Núcleo multiempresa y multipaís | 10 % | Base funcional; importadores/pilotos pendientes | 70 % | 7 % |
| 2. Offline, GPS y sincronización | 15 % | Funcional; piloto físico multidía pendiente | 80 % | 12 % |
| 3. PostGIS, mapa interno y capas | 15 % | Operativa con puntos, recorridos, polígonos, cobertura y privacidad parametrizable | 90 % | 13,50 % |
| 4. ArcGIS e interoperabilidad | 10 % | Operación administrada y E2E pública; credencial institucional/adjuntos pendientes | 70 % | 7,00 % |
| 5. Analítica y reportes | 12 % | Cortes reproducibles en servidor; datasets patrón/programación operativa pendientes | 85 % | 10,20 % |
| 6. Formularios y plantillas | 8 % | Diez plantillas, calidad y versiones inmutables | 85 % | 6,80 % |
| 7. Seguridad y privacidad | 10 % | Retención auditable y gobierno funcional; AAL2 RLS/restore pendientes | 80 % | 8,00 % |
| 8. SEO LATAM | 6 % | Implementación avanzada | 85 % | 5,10 % |
| 9. QA y piloto | 6 % | QA automatizado, seguridad, carga y accesibilidad base; pilotos físicos pendientes | 72 % | 4,32 % |
| 10. Lanzamiento, operación y documentación | 3 % | Entrega técnica y cron protegido; secretos/firma/monitoreo pendientes | 62 % | 1,86 % |

**Avance global actual: 80,28 % ponderado.**

El 83,35 % anterior fue recalibrado porque contabilizaba como completas fases que todavía no satisfacían todos los criterios del documento fuente. La auditoría detallada está en `docs/PLAN_MAESTRO_COMPLETION_AUDIT.md`; la reducción es metodológica, no una pérdida de funciones.

## Entregables verificados al 31 de agosto de 2026

- Mapa vectorial interno con zoom, desplazamiento, selección, capas, puntos, grupos adaptativos, modo de calor y coropleta de cobertura.
- Campos de recorrido GPS y área/polígono con captura de hasta 2.000 vértices, longitud, perímetro, área, precisión y funcionamiento offline.
- Extracción automática de líneas y polígonos al sincronizar una respuesta, con tabla PostGIS gobernada, índice GiST, métricas operativas y RLS por entidad/profesional.
- Políticas cartográficas por entidad para precisión, supresión de grupos pequeños y meta de capturas por zona; los polígonos de evidencia no se contabilizan como límites administrativos.
- Mapa base de 20 países latinoamericanos embebido en la aplicación y disponible sin internet.
- Caché IndexedDB de puntos y capas; precarga automática posterior al inicio de sesión.
- Filtros por fuente, estado y variable temática no sensible de los formularios.
- Importación de capas GeoJSON y ArcGIS REST Feature Service por entidad.
- Centro de integraciones ArcGIS para administración/coordinación con OAuth de aplicación ejecutado en servidor, referencia de secreto, validación de host, lotes, reintentos, cancelación, idempotencia y auditoría por registro.
- Importación ArcGIS pública probada de extremo a extremo desde Vercel hacia una capa del mapa interno; se eliminan nombres de campos sensibles y atributos complejos.
- Publicación saliente restringida a metadatos operativos no sensibles mediante lista explícita.
- Exportación GIS en GeoJSON, CSV WGS84, Shapefile ZIP (`SHP`, `SHX`, `DBF`, `PRJ`, `CPG`) y GeoPackage OGC 1.3.
- Informe territorial PDF con mapa, cobertura, fuentes, estados y métricas operativas.
- Configuración regional para 20 países de América Latina.
- Diez plantillas reutilizables de caracterización con GPS, evidencia y consentimiento.
- Asistente de calidad para formularios y versiones publicadas inmutables con SHA-256.
- Analítica institucional con filtros, supresión de grupos pequeños e informes PDF, DOCX, XLSX y CSV.
- Snapshots de indicadores calculados en Supabase con corte, filtros, versión metodológica, territorio, muestra y supresión reproducible; ejecución manual verificada y endpoint diario protegido listo para Vercel Cron.
- Centro de gobierno para consentimiento, integridad de evidencias, accesos sensibles, retención y MFA.
- Retención con vista previa obligatoria, registro auditable y ejecución confirmada por superadmin; anonimización de respuestas y purga limitada a clases sin archivos externos.
- Migraciones PostGIS/RLS aplicadas al Supabase remoto y verificadas: PostGIS 3.3.7, geometrías de punto/línea/polígono, índices GiST, configuración regional y aislamiento por entidad.
- Capa oficial DANE 2025 de los 46 municipios de Bolívar precargada en la entidad inicial.
- APK Android 2.7.0 compilada con GIS de campo, snapshots, retención, ArcGIS administrado, GeoPackage y entrada nativa directa al login. Binario de pruebas: `entregables/Control-G-2.7.0-LATAM-GIS-offline-debug.apk`.
- Huella SHA-256 del APK: `26202912282cb9dfa63ab10dbe80a299f4034abaea4bcd778c9d648718c26be1`.
- QA técnico aprobado: 29/29 pruebas automatizadas, lint, build web/PWA, pruebas unitarias Android y 269 tareas Gradle con `assembleDebug`.
- Auditoría del árbol de producción aprobada con 0 vulnerabilidades conocidas; React Router actualizado a 7.18.3 y dependencias transitivas corregidas sin regresiones de compilación.
- Encabezados de seguridad publicados verificados y rutas privadas marcadas `noindex`; el endpoint de snapshots rechaza acceso anónimo con `401`.
- Prueba de carga local: 1.500 solicitudes, concurrencia máxima 40, 0 fallos y hasta 1.604 solicitudes/s en `/login`.
- Accesibilidad y responsive verificadas en 390 × 844 px: salto al contenido, regiones principales, campos etiquetados, alertas anunciables, control de contraseña 44 × 44 px y cero desbordamiento horizontal.
- Prueba integral contra Supabase aprobada: Auth/MFA, creación y limpieza de usuarios temporales, RPC, RLS, formularios asignados, Storage, PostGIS/GPS/líneas/polígonos, snapshots reproducibles, retención auditada, versiones inmutables, cola ArcGIS e idempotencia.
- Prueba ArcGIS publicada aprobada: autenticación JWT, verificación de Feature Service, cola, importación de dos polígonos y persistencia temporal en el mapa interno, con limpieza final.
- Shapefile ZIP validado estructuralmente y mapa revisado visualmente con la silueta de Colombia y puntos operativos.
- GIS 2.6 revisado visualmente con componentes reales en escritorio y 390 × 844 px: sin desbordamiento horizontal y con controles táctiles de 48 px.

## Línea base confirmada

- React + TypeScript + Vite para web/PWA.
- Capacitor 6 para Android con entrada nativa directa al inicio de sesión.
- Supabase autohospedado como backend principal.
- RLS por entidad y roles `admin`, `coordinator`, `support` y `professional`.
- Formularios asignados explícitamente a profesionales.
- IndexedDB/Dexie para respuestas, evidencias y actividades offline.
- Sincronización automática e idempotente al recuperar conexión.
- Captura GPS nativa en formularios y actividades.
- Cinco formularios iniciales de Gobernación de Bolívar preservados.

## Decisiones de implementación GIS

1. El mapa interno es una función privada y protegida por rol; nunca será un mapa público de datos personales.
2. Los puntos y las capas GeoJSON se almacenan localmente para poder consultarlos sin internet.
3. La representación base es vectorial y propia de Control G. No depende de un proveedor de teselas para funcionar.
4. PostGIS agrega índices y capacidades espaciales en Supabase sin reemplazar las columnas de latitud/longitud existentes.
5. Cada entidad conserva sus propias capas y configuración territorial.
6. Las vistas cartográficas muestran metadatos operativos mínimos, no respuestas sensibles completas.

## Criterios de aceptación de la primera entrega GIS

- Ruta de mapa para administración, coordinación, apoyo y profesionales.
- Puntos de formularios, actividades y familias con coordenadas.
- Registros locales pendientes visibles sin conexión.
- Capas GeoJSON por entidad, cacheadas en el dispositivo.
- Filtros por fuente y estado, selección de punto y vista de calor.
- Navegación responsive y controles táctiles de al menos 48 px.
- Migración Supabase con PostGIS, índices GiST, configuración regional y RLS.
- Pruebas de tipos, compilación web, pruebas automatizadas y compilación Android.

## Formato obligatorio para próximos reportes

Cada reporte de ejecución debe indicar:

1. avance global ponderado;
2. avance de la fase activa;
3. entregables terminados;
4. pruebas ejecutadas y resultado;
5. bloqueos reales, si existen;
6. siguiente incremento verificable.
