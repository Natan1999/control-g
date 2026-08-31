# ADR 0002 — Aislamiento multiempresa mediante RLS

- Estado: aceptado
- Fecha: 2026-08-31
- Responsables: DRAN Digital / Control G

## Contexto

Control G debe servir simultáneamente a entidades públicas y organizaciones de varios países sin mezclar usuarios, formularios, evidencias, respuestas o capas territoriales.

## Decisión

Todas las tablas operativas pertenecen a una `entity_id`. Supabase Auth identifica al usuario y las funciones `current_entity_id()`/`current_user_role()` resuelven el alcance. PostgreSQL RLS es la frontera obligatoria; la interfaz no se considera un control de seguridad. Las operaciones privilegiadas se encapsulan en RPC con validación de rol, entidad y, cuando se active, AAL2. La clave `service_role` solo puede existir en funciones de servidor y procesos operativos, nunca en web, APK ni repositorio.

## Consecuencias

- Una consulta defectuosa del cliente sigue limitada por RLS.
- Las migraciones deben incluir políticas y pruebas negativas por rol.
- Exportaciones, GIS, analítica y ArcGIS conservan el alcance de entidad.
- El alta de un nuevo país reutiliza el núcleo y añade perfil regional/jurisdicciones versionadas.

## Evidencia

`supabase/migrations/`, `src/lib/backend.ts`, `src/config/country-profiles.ts` y verificaciones remotas de roles.
