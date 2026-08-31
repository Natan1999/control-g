# ADR 0004 — Observabilidad, respaldo y recuperación segura

- Estado: aceptado
- Fecha: 2026-08-31
- Responsables: DRAN Digital / Control G

## Contexto

La plataforma necesita detectar indisponibilidad, diagnosticar fallos sin recolectar respuestas sensibles y demostrar que un respaldo puede restaurarse. Una restauración accidental sobre producción sería un incidente crítico.

## Decisión

`/api/health` comprueba Vercel y PostgREST/Supabase con la clave anónima y solo publica estado, versión y latencia. Los errores del cliente se reportan de forma opcional, sanitizada, limitada y sin respuestas, coordenadas, medios ni identificadores. Los respaldos usan el formato custom de `pg_dump`, manifiesto SHA-256 y validación de catálogo. El ensayo de restauración exige otra URL, un nombre de base explícitamente desechable y una frase de confirmación; el procedimiento se niega a operar si origen y destino coinciden.

## Objetivos operativos

- RPO inicial: 24 horas.
- RTO inicial: 4 horas para restaurar base y validar servicios esenciales.
- Disponibilidad objetivo mensual: 99,5 % durante piloto; 99,9 % después de estabilización.
- Retención de respaldos: 7 diarios, 4 semanales y 6 mensuales, cifrados fuera del servidor primario.

## Consecuencias

- UptimeRobot o un monitor equivalente puede consultar el endpoint cada cinco minutos.
- La telemetría de errores permanece apagada hasta aprobación de privacidad y configuración de `VITE_ERROR_REPORTING_ENABLED=true`.
- Un archivo legible por `pg_restore` no prueba recuperación completa; el ensayo en base desechable y su validación SQL son obligatorios.

## Evidencia

`api/health.mjs`, `api/monitoring/client-error.mjs`, `src/lib/monitoring.ts`, `scripts/db-backup-restore.mjs` y runbooks operativos.
