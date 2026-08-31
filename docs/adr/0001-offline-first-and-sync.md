# ADR 0001 — Cliente offline-first y sincronización idempotente

- Estado: aceptado
- Fecha: 2026-08-31
- Responsables: DRAN Digital / Control G

## Contexto

Los equipos trabajan en municipios y zonas rurales donde la conectividad puede desaparecer durante horas o días. La captura no puede depender de una respuesta inmediata del servidor y una reconexión no debe duplicar respuestas ni evidencias.

## Decisión

IndexedDB/Dexie es la persistencia operativa del dispositivo. Formularios, asignaciones y territorios se precargan; borradores, respuestas y medios se guardan localmente antes de cualquier intento de red. Cada operación usa un `local_id` estable. El motor sube primero los medios, luego actividades y finalmente respuestas; solo marca un elemento como sincronizado después de confirmación de Supabase. Los reintentos conservan el mismo identificador y nunca descartan silenciosamente un error.

## Consecuencias

- El primer acceso y la precarga requieren conexión.
- Cerrar la aplicación o perder señal no elimina el trabajo confirmado localmente.
- Supabase aplica unicidad, RLS y validación de asignación al consolidar.
- El dispositivo no es un respaldo permanente: después de sincronizar se aplican las políticas de retención y soporte.

## Evidencia

`src/lib/local-db.ts`, `src/lib/sync-engine.ts`, `src/hooks/useSync.ts`, migraciones de idempotencia y `scripts/verify-supabase.mjs`.
