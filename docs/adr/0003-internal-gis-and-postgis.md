# ADR 0003 — Mapa interno propio con PostGIS

- Estado: aceptado
- Fecha: 2026-08-31
- Responsables: DRAN Digital / Control G

## Contexto

La operación requiere consultar puntos, recorridos, polígonos, límites y cobertura aun sin señal. Un proveedor externo de mapas no debe ser requisito para capturar ni revisar información básica.

## Decisión

Control G usa un mapa vectorial interno y un mapa base LATAM embebido. IndexedDB conserva capas y registros necesarios offline. Supabase/PostGIS consolida geometrías WGS84, índices GiST, métricas y RLS. Los polígonos de evidencia y los límites administrativos son tipos separados. Las vistas de cobertura aplican precisión mínima, tamaño mínimo de grupo y supresión parametrizada por entidad. ArcGIS es una integración interoperable, no la fuente primaria.

## Consecuencias

- El mapa básico funciona sin teselas de terceros.
- Las capas institucionales pueden importarse y exportarse en formatos abiertos.
- La publicación ArcGIS usa cola de servidor, lista explícita de atributos y auditoría.
- Enrutamiento y análisis topológico avanzado quedan como capacidades posteriores, no como dependencia de captura.

## Evidencia

`src/components/gis/`, `src/lib/gis-service.ts`, `src/lib/geopackage.ts` y migraciones PostGIS 20260831.
