# Ejecución del Plan Maestro Control G LATAM + GIS

Este archivo es el registro técnico vivo de la implementación. El avance global se calcula con la ponderación aprobada en el Plan Maestro y solo aumenta cuando el código, las migraciones y las pruebas correspondientes están verificados.

## Estado de ejecución

| Fase | Peso | Estado | Avance de fase | Aporte global |
|---|---:|---|---:|---:|
| 0. Auditoría y línea base | 5 % | Completada | 100 % | 5 % |
| 1. Núcleo multiempresa y multipaís | 10 % | Implementación avanzada | 80 % | 8 % |
| 2. Offline, GPS y sincronización | 15 % | Validación integral aprobada | 95 % | 14,25 % |
| 3. PostGIS, mapa interno y capas | 15 % | Completada | 100 % | 15 % |
| 4. ArcGIS e interoperabilidad | 10 % | Implementación avanzada | 80 % | 8 % |
| 5. Analítica y reportes | 12 % | Implementación parcial funcional | 55 % | 6,60 % |
| 6. Formularios y plantillas | 8 % | Implementación avanzada | 75 % | 6 % |
| 7. Seguridad y privacidad | 10 % | Validación avanzada | 85 % | 8,50 % |
| 8. SEO LATAM | 6 % | Implementación avanzada | 85 % | 5,10 % |
| 9. QA y piloto | 6 % | QA automatizado aprobado; piloto físico pendiente | 80 % | 4,80 % |
| 10. Lanzamiento, operación y documentación | 3 % | Entrega técnica avanzada | 70 % | 2,10 % |

**Avance global actual: 83 %** (83,35 % ponderado, redondeado al entero más cercano).

## Entregables verificados al 31 de agosto de 2026

- Mapa vectorial interno con zoom, desplazamiento, selección, capas, puntos y modo de calor.
- Mapa base de 20 países latinoamericanos embebido en la aplicación y disponible sin internet.
- Caché IndexedDB de puntos y capas; precarga automática posterior al inicio de sesión.
- Filtros por fuente, estado y variable temática no sensible de los formularios.
- Importación de capas GeoJSON y ArcGIS REST Feature Service por entidad.
- Publicación de puntos visibles a una capa editable de ArcGIS con token temporal no persistido.
- Exportación GIS en GeoJSON, CSV WGS84 y Shapefile ZIP (`SHP`, `SHX`, `DBF`, `PRJ`, `CPG`).
- Informe territorial PDF con mapa, cobertura, fuentes, estados y métricas operativas.
- Configuración regional para 20 países de América Latina.
- Siete plantillas reutilizables de caracterización con GPS, evidencia y consentimiento.
- Migración PostGIS/RLS aplicada al Supabase remoto y verificada: PostGIS 3.3.7, tres índices GiST, seis columnas regionales, RLS activo y dos políticas sobre `map_layers`.
- Capa oficial DANE 2025 de los 46 municipios de Bolívar precargada en la entidad inicial.
- APK Android 2.3.0 compilado con el módulo GIS y entrada nativa directa al login.
- APK de entrega validado (`SHA-256: fcc0f6f0f58516f7bae6a2f365883226cb39fdcdd82e52b49ee31292b0b169c0`).
- 18 pruebas automatizadas aprobadas, lint sin advertencias, build web y Gradle Android aprobados.
- Prueba integral contra Supabase aprobada: creación y limpieza de usuarios temporales, autenticación, RPC, RLS, formularios asignados, Storage, PostGIS, capas GIS e idempotencia de sincronización.
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
