# Control G 2.1

Aplicación multi-entidad para caracterización y acompañamiento psicosocial en campo. La interfaz web y el APK de Capacitor funcionan sin conexión: familias, formularios, respuestas, fotografías y actividades se guardan localmente y se sincronizan de forma idempotente cuando regresa la señal.

## Arquitectura

- React + TypeScript + Vite PWA.
- Capacitor 6 para Android.
- Dexie/IndexedDB como base local y cola offline.
- Supabase Auth, Postgres, Storage y funciones SQL protegidas.
- Aislamiento por entidad mediante Row Level Security (RLS).
- Identificadores locales únicos para evitar duplicados en reintentos de sincronización.

## Configuración

1. Copia `.env.example` a `.env.local` y configura únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para la aplicación.
2. Ejecuta la migración `supabase/migrations/202608070001_initial_control_g.sql` en la instancia de Supabase.
3. La migración instala `admin_create_user`, una RPC `SECURITY DEFINER` que valida el JWT, el rol y la entidad antes de crear Auth + perfil en una sola transacción.
4. Para crear o verificar las cuentas iniciales, define `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `CONTROL_G_INITIAL_PASSWORD`, y ejecuta `npm run backend:seed`.

Las claves `service_role`, JWT, Postgres y Dashboard son exclusivamente administrativas: nunca deben usar el prefijo `VITE_`, guardarse en Git ni incluirse en el APK.

## Desarrollo y pruebas

```bash
npm install
npm run build
npm run backend:check
```

La comprobación integral opcional (`npm run backend:verify`) inicia sesión, crea y elimina un usuario temporal, valida RLS, formularios, Storage e idempotencia. Requiere `SUPABASE_SERVICE_ROLE_KEY`, `CONTROL_G_TEST_EMAIL` y `CONTROL_G_TEST_PASSWORD` solo en el entorno de ejecución.

El primer inicio de sesión del dispositivo requiere conexión. Después, la sesión, los formularios y las familias quedan precargados localmente; fotos, firmas y respuestas permanecen en cola hasta que el dispositivo recupere señal.

## APK Android

Requiere JDK 17 o superior y Android SDK 35:

```bash
npm run android:apk
```

El APK instalable de pruebas queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Para Play Store o distribución firmada se debe aportar el keystore institucional y configurar la firma de `release` fuera del repositorio.

## Cliente inicial: Gobernación de Bolívar

La migración crea la entidad inicial, cinco municipios de operación y cinco instrumentos: Ex-Antes, los tres momentos de capacitación y Ex-Post. Los tres momentos incorporan el contenido suministrado sobre buen trato y hábitos saludables, ambiente seguro y responsabilidad familiar, y derechos de niñez/adolescencia con prevención del bullying.
