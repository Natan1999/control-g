# Generador de formularios: Gemini, OpenAI y OpenRouter

## Configuración de producción

El endpoint autenticado `/api/forms/generate` se ejecuta en Vercel. Las claves se
guardan como **Secret** del proyecto `control-g`, entorno **Production**, sin
prefijo `VITE_`. No se guardan en formularios, Supabase, el navegador ni el APK.

| Proveedor | Clave privada | Modelo configurable en el servidor | Modelo predeterminado |
| --- | --- | --- | --- |
| Gemini | `GEMINI_API_KEY` | `GEMINI_FORM_MODEL` | `gemini-3.5-flash-lite` |
| OpenAI directo | `OPENAI_API_KEY` | `OPENAI_FORM_MODEL` | `gpt-4.1-mini` |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_FORM_MODEL` | `openai/gpt-4.1-mini` |

Guardar una variable no actualiza despliegues anteriores: hace falta un nuevo
despliegue. No sustituir una clave directa de OpenAI por una clave de OpenRouter.
La cuota y el saldo de OpenRouter son independientes de los de OpenAI directo.
Antes de usarlo, el propietario debe configurar un límite de gasto para la clave.
La aplicación no recarga saldo ni activa facturación.

## Recorrido del usuario

1. Coordinación o superadministración abre el constructor para una organización
   activa y selecciona el asistente de IA.
2. El servidor anuncia únicamente proveedores con clave configurada. **Gemini
   sigue primero y es la selección inicial cuando está disponible.** Una clave
   configurada no garantiza saldo ni disponibilidad del proveedor.
3. Se elige crear, convertir texto o mejorar el borrador; se describe el objetivo
   sin datos personales, respuestas ni información confidencial.
4. Con la confirmación de privacidad se envía solo el texto y, al revisar, la
   definición del instrumento. OpenRouter también lo transmite al operador del
   modelo; la interfaz informa esta cadena de proveedores.
5. La propuesta se valida y normaliza antes de mostrarse. El usuario puede probarla
   en simulación e incorporarla al constructor. Guardar, aprobar, publicar y
   asignar siguen siendo acciones separadas de revisión humana.

No hay reintentos ni cambios automáticos entre Gemini, OpenAI y OpenRouter.
Un fallo de OpenRouter no modifica el formulario ni provoca llamadas a Gemini.
La generación necesita internet; la captura de instrumentos descargados y
asignados sigue usando el motor offline existente, sin llamadas de IA.

## Contrato y límites de OpenRouter

- Endpoint fijo: `https://openrouter.ai/api/v1/chat/completions`.
- El modelo solo se elige mediante `OPENROUTER_FORM_MODEL`, con formato
  `proveedor/modelo`. La solicitud del navegador no admite claves, modelos ni URLs.
- JSON Schema estricto, validación local de tipos/campos y normalización de IDs.
- `require_parameters: true`, `data_collection: 'deny'` y
  `allow_fallbacks: false`. No garantiza retención cero: aplicar también las
  políticas de privacidad y registro de la cuenta de OpenRouter.
- Máximo 10.000 tokens de salida y 45 segundos de espera, sin streaming.
- Respuestas truncadas, bloqueos, rechazos, herramientas o JSON inválido no se
  aceptan como formularios. Los errores dentro de HTTP 200 también se comprueban.
- HTTP 402/429 se presentan como cuota no disponible; otros fallos son mensajes
  seguros sin claves ni detalle del proveedor en la respuesta pública.
- Los tres proveedores comparten autenticación, permisos, organización activa,
  reserva distribuida de cuota y protección de concurrencia existentes.
- Evidencias multimedia fuera de grupos repetibles para mantener su vínculo
  con la cola de sincronización offline.

## Validación y retirada

Ejecutar `npm test`, `npm run lint` y `npm run build`. En producción, generar un
cuestionario sintético con OpenRouter y otro con Gemini desde una sesión con
permisos; comprobar vista previa y simulación sin guardar datos de clientes.
Las pruebas unitarias usan proveedores simulados y no acreditan saldo real.

Para retirar solo OpenRouter, quitar su variable del entorno y desplegar de nuevo.
No modificar `GEMINI_API_KEY` ni `OPENAI_API_KEY`. El APK 2.19 ya distribuido contiene
su propia interfaz: un nuevo selector en la web no actualiza los APK instalados.

Referencias: [OpenRouter API](https://openrouter.ai/docs/api_reference/overview),
[enrutamiento](https://openrouter.ai/docs/guides/routing/provider-selection),
[errores](https://openrouter.ai/docs/api_reference/errors-and-debugging).
