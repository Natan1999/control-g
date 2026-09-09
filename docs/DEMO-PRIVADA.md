# Alcaldías y demostraciones privadas — 2.18.0

La ruta `/demo` redirige a `/login`. No hay selector público de roles ni un usuario simulado inyectado en el mapa. La demostración usa Supabase Auth y las mismas tablas, rutas, permisos y sincronización que una entidad normal.

## Crear desde superadministración

En **Entidades**, usa **Nueva Entidad** para una operación real o **Crear alcaldía demo privada** para una demostración. Configura nombre, contrato, país, región, idioma, moneda, zona horaria y centro del mapa. Los países provienen del catálogo administrable de perfiles de país. Los territorios fuera de Colombia se ingresan manualmente; para Colombia está disponible DIVIPOLA. Los límites oficiales se importan como capas, no se inventan a partir del nombre del municipio.

La demo genera seis sectores ficticios alrededor del centro indicado, dos formularios publicados, 240 respuestas y tres capas (sectores, corredores y centros). Crea coordinación, apoyo y tres profesionales con claves aleatorias diferentes. Coordinación y apoyo consultan toda la entidad; cada profesional tiene 80 respuestas iniciales y solo sus formularios asignados (uno, uno y dos, respectivamente). Los 240 participantes y sus ubicaciones son ficticios, no son un censo real. Los registros no incluyen fotografías inventadas.

La operación es atómica e idempotente: entidad, usuarios, territorios, formularios, asignaciones y datos se crean juntos o se revierten. Un reintento con el mismo identificador no duplica cuentas. Solo un superadministrador activo puede ejecutar `provision_entity`; las claves administrativas nunca se envían al navegador. Las claves temporales generadas aparecen una vez tras crear la entidad: guárdalas y pide a cada titular cambiarlas. Para recuperación por correo, usa direcciones reales bajo tu control; los correos `demo.*@controlg.co` son identificadores de acceso y no presuponen buzones aprovisionados.

## Demostración de Villa Esperanza

Acceso normal en `https://www.controlg.co/login`, también desde el APK. Credenciales de esta instalación en el archivo local ignorado `tmp/villa-esperanza-demo-access.json`, con permisos de solo propietario; no incluirlo en Git, documentación pública, capturas ni copias compartidas del proyecto. La coordinación y el apoyo tienen MFA habilitado: cada titular debe configurar su aplicación autenticadora en el primer acceso. No se ha inscrito un segundo factor en su nombre.

Desde coordinación/apoyo: panel → **Información recolectada en campo** → **Ver gráficas e indicadores**, **Consultar respuestas** o **Abrir mapa y capas**. En el mapa, filtra la fuente **Respuestas** para analizar las 240 encuestas sin contar además las ubicaciones de los hogares vinculados. Hay calor, agrupación, cobertura, pantalla ampliada y exportación GIS. Las familias aparecen en progreso porque solo se precarga la caracterización inicial; no se fingen los cinco momentos completados.

Para ensayar el trabajo de campo: inicia con un profesional y conexión, descarga sus formularios, desconecta, completa una respuesta de prueba (GPS/foto opcionales), vuelve a conectar y sincroniza. Comprueba la nueva respuesta desde coordinación. Las pruebas automatizadas cubren almacenamiento durable y permisos; no sustituyen probar cámara/GPS y modo avión en la tablet física.

## Operación y pruebas

- Migración: `supabase/migrations/202609090001_entity_provisioning.sql`.
- `node scripts/verify-entity-provisioning.mjs`: transacción de ensayo con rollback, validación de RLS, idempotencia y fallo parcial. Requiere credenciales administrativas por variables de entorno.
- `node scripts/provision-municipal-demo.mjs`: aprovisionamiento idempotente de Villa Esperanza; conserva el archivo local de credenciales para reintentos. No lo borres para recrear usuarios existentes.
- `node scripts/verify-private-demo.mjs`: inicia sesión con las cinco cuentas y comprueba respuestas, formularios, capas y ausencia de acceso anónimo. Requiere `.env.local` y el archivo local de accesos.
- `npm test`, `npm run lint`, `npm run build`, `npm run android:apk`.

Antes de usar datos reales, define contratos, política de conservación, cartografía oficial y responsables de acceso de cada entidad. No uses las cuentas compartidas de demostración para información personal real.
