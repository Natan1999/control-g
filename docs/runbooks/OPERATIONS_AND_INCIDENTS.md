# Runbook de operación e incidentes

## Monitoreo mínimo

1. Consultar `https://www.controlg.co/api/health` cada 5 minutos desde dos regiones.
2. Considerar éxito únicamente HTTP 200, `status=operational` y `checks.database.status=ok`.
3. Alertar después de dos fallos consecutivos; resolver la alerta después de tres éxitos.
4. Supervisar adicionalmente el cron diario de snapshots, la tasa de sincronización, errores de Storage y crecimiento de base de datos.
5. Habilitar telemetría sanitizada solo con aprobación del responsable de privacidad mediante `VITE_ERROR_REPORTING_ENABLED=true`.

Comprobación manual:

```bash
npm run health:check
```

## Severidades

| Nivel | Ejemplo | Respuesta | Comunicación |
|---|---|---:|---|
| SEV-1 | Pérdida o exposición de datos, RLS vulnerable, producción inaccesible | 15 min | Dirección, seguridad y entidad afectada |
| SEV-2 | Sincronización o Storage degradados para varios equipos | 30 min | Coordinadores y soporte |
| SEV-3 | Función secundaria o reporte con error | 4 h hábiles | Mesa de ayuda |
| SEV-4 | Consulta, mejora visual o problema individual | 1 día hábil | Usuario solicitante |

## Respuesta a incidentes

1. Abrir un registro con hora, versión, entidad afectada, alcance y responsable; no copiar respuestas sensibles al ticket.
2. Confirmar el fallo con `/api/health`, Vercel, Supabase y una cuenta de prueba del rol afectado.
3. Contener: desactivar solo la integración o función afectada; conservar captura offline cuando sea segura.
4. Preservar logs y huellas. Nunca solicitar contraseñas, OTP, service role o archivos completos por WhatsApp.
5. Recuperar mediante rollback de Vercel, migración correctiva o restauración ensayada según el caso.
6. Validar RLS, login, asignaciones, captura offline, sincronización, Storage y mapa antes de cerrar.
7. Emitir informe postincidente en 72 horas para SEV-1/SEV-2 con causa, impacto, línea de tiempo y acciones preventivas.

## Fallo del cron de snapshots

1. Confirmar que `CRON_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` existen en Vercel y que no están expuestos como variables `VITE_*`.
2. Ejecutar una llamada autenticada al endpoint desde un entorno seguro; no pegar el secreto en chats o tickets.
3. Revisar `retention_runs`, snapshots recientes y logs de la función.
4. Reintentar una sola vez. Si hay errores parciales HTTP 207, resolver cada entidad antes de otro lote.

## Rotación de credenciales

- Rotar de inmediato cualquier secreto compartido en un chat, captura o archivo.
- Actualizar Supabase/Vercel y desplegar antes de revocar el valor anterior.
- Verificar login, health, Storage, cron y ArcGIS después de rotar.
- Registrar fecha, responsable y sistemas actualizados sin registrar el valor del secreto.
