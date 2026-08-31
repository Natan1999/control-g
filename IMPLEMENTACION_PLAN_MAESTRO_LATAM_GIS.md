# Ejecución del Plan Maestro Control G LATAM + GIS

Este archivo es el registro técnico vivo de la implementación. El avance global se calcula con la ponderación aprobada en el Plan Maestro y solo aumenta cuando el código, las migraciones y las pruebas correspondientes están verificados.

## Estado de ejecución

| Fase | Peso | Estado | Avance de fase | Aporte global |
|---|---:|---|---:|---:|
| 0. Auditoría y línea base | 5 % | Auditoría completa; ADR/restore pendientes | 90 % | 4,50 % |
| 1. Núcleo multiempresa y multipaís | 10 % | Base funcional; importadores/pilotos pendientes | 70 % | 7 % |
| 2. Offline, GPS y sincronización | 15 % | Funcional; piloto físico multidía pendiente | 80 % | 12 % |
| 3. PostGIS, mapa interno y capas | 15 % | Avanzada con grupos y coropleta | 78 % | 11,70 % |
| 4. ArcGIS e interoperabilidad | 10 % | Base funcional; OAuth/jobs/GPKG pendientes | 45 % | 4,50 % |
| 5. Analítica y reportes | 12 % | Funcional y reproducible; snapshots servidor pendientes | 75 % | 9 % |
| 6. Formularios y plantillas | 8 % | Diez plantillas, calidad y versiones inmutables | 85 % | 6,80 % |
| 7. Seguridad y privacidad | 10 % | Gobierno funcional; AAL2 RLS/restore pendientes | 72 % | 7,20 % |
| 8. SEO LATAM | 6 % | Implementación avanzada | 85 % | 5,10 % |
| 9. QA y piloto | 6 % | QA automatizado/visual; pilotos físicos pendientes | 55 % | 3,30 % |
| 10. Lanzamiento, operación y documentación | 3 % | Entrega técnica; firma/monitoreo pendientes | 60 % | 1,80 % |

**Avance global actual: 72,90 % ponderado.**

El 83,35 % anterior fue recalibrado porque contabilizaba como completas fases que todavía no satisfacían todos los criterios del documento fuente. La auditoría detallada está en `docs/PLAN_MAESTRO_COMPLETION_AUDIT.md`; la reducción es metodológica, no una pérdida de funciones.

## Entregables verificados al 31 de agosto de 2026

- Mapa vectorial interno con zoom, desplazamiento, selección, capas, puntos, grupos adaptativos, modo de calor y coropleta de cobertura.
- Mapa base de 20 países latinoamericanos embebido en la aplicación y disponible sin internet.
- Caché IndexedDB de puntos y capas; precarga automática posterior al inicio de sesión.
- Filtros por fuente, estado y variable temática no sensible de los formularios.
- Importación de capas GeoJSON y ArcGIS REST Feature Service por entidad.
- Publicación de puntos visibles a una capa editable de ArcGIS con token temporal no persistido.
- Exportación GIS en GeoJSON, CSV WGS84 y Shapefile ZIP (`SHP`, `SHX`, `DBF`, `PRJ`, `CPG`).
- Informe territorial PDF con mapa, cobertura, fuentes, estados y métricas operativas.
- Configuración regional para 20 países de América Latina.
- Diez plantillas reutilizables de caracterización con GPS, evidencia y consentimiento.
- Asistente de calidad para formularios y versiones publicadas inmutables con SHA-256.
- Analítica institucional con filtros, supresión de grupos pequeños e informes PDF, DOCX, XLSX y CSV.
- Centro de gobierno para consentimiento, integridad de evidencias, accesos sensibles, retención y MFA.
- Migración PostGIS/RLS aplicada al Supabase remoto y verificada: PostGIS 3.3.7, tres índices GiST, seis columnas regionales, RLS activo y dos políticas sobre `map_layers`.
- Capa oficial DANE 2025 de los 46 municipios de Bolívar precargada en la entidad inicial.
- APK Android 2.4.0 compilada con GIS, analítica, gobierno de datos y entrada nativa directa al login. Binario de pruebas: `entregables/Control-G-2.4.0-LATAM-GIS-offline-debug.apk`.
- Huella SHA-256 del APK: `c23317e94bbb8d0721451ec709623dae550bbfed93e0827082f18c65a104307a`.
- QA técnico aprobado: 25/25 pruebas automatizadas, lint, build web/PWA, pruebas unitarias Android y compilación Gradle `assembleDebug`.
- Prueba integral contra Supabase aprobada: Auth/MFA, creación y limpieza de usuarios temporales, RPC, RLS, formularios asignados, Storage, PostGIS/GPS, evidencias, versiones inmutables e idempotencia.
- Shapefile ZIP validado estructuralmente y mapa revisado visualmente con la silueta de Colombia y puntos operativos.

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
