# Runbook de respaldo y restauración

## Alcance y objetivos

El respaldo lógico cubre PostgreSQL/PostGIS, funciones, políticas y datos. Storage requiere una copia separada de objetos y metadatos; no se considera respaldado por `pg_dump`. Objetivos iniciales: RPO 24 horas y RTO 4 horas.

## Crear un respaldo

1. Instalar versiones compatibles de `pg_dump`, `pg_restore` y `psql`.
2. Definir `DATABASE_URL` en el gestor seguro del operador, nunca en el repositorio ni en el historial del shell.
3. Elegir una ruta nueva en un volumen cifrado:

```bash
npm run db:backup -- --output backups/control-g-2026-08-31.dump
```

El proceso genera un archivo custom y un manifiesto `.manifest.json` con fecha, tamaño y SHA-256. Se niega a sobrescribir archivos.

## Verificar un respaldo sin restaurar

```bash
npm run db:backup:verify -- --file backups/control-g-2026-08-31.dump
```

La verificación comprueba la huella si existe manifiesto y exige que `pg_restore --list` pueda leer el catálogo.

## Ensayo de restauración

1. Crear una base vacía y desechable cuyo nombre comience por `control_g_restore_`, `restore_` o `scratch_`.
2. Definir `RESTORE_DATABASE_URL` para esa base y conservar `DATABASE_URL` como referencia del origen.
3. Ejecutar:

```bash
npm run db:restore:drill -- --file backups/control-g-2026-08-31.dump --confirm RESTORE_ONLY_TO_DISPOSABLE_DATABASE
```

El script rechaza un destino igual al origen y valida al final el número de tablas públicas, tablas con RLS y presencia de PostGIS.

## Criterios de aceptación

- SHA-256 coincidente y catálogo legible.
- Restauración sin errores en base desechable.
- PostGIS instalado y tablas públicas presentes.
- RLS activo en las tablas esperadas.
- `npm run backend:verify` aprobado contra el entorno restaurado.
- Evidencias de Storage muestreadas y accesibles después de restaurar su copia independiente.
- Informe del ensayo con tiempos, tamaño, versión PostgreSQL, hallazgos y responsable.

## Retención y custodia

Conservar 7 copias diarias, 4 semanales y 6 mensuales. Cifrar antes de transferir, mantener una copia fuera del servidor primario y probar trimestralmente. La eliminación sigue doble control y nunca se ejecuta desde este script.
