// One credential-free source for the website and the locally bundled Android copy.
export const LEGAL_OPERATOR = 'DRAN DIGITAL S.A.S.'
export const LEGAL_CONTACT = 'ceo@dran.digital'
export const LEGAL_VERSION = '2026-10-31'
export const DELETION_MAILTO = 'mailto:ceo@dran.digital?subject=Control%20G%20-%20Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta'

const privacy = {
  slug: 'privacidad', title: 'Política de privacidad de Control G',
  introduction: 'Esta política explica el tratamiento de información en la aplicación Android y la plataforma web Control G, operadas por DRAN DIGITAL S.A.S. Contacto de privacidad y soporte: ceo@dran.digital.',
  sections: [
    { id: 'responsabilidades', title: 'Responsables y alcance', paragraphs: [
      'DRAN DIGITAL S.A.S. gestiona las cuentas, la operación técnica y el soporte de Control G. Las organizaciones que realizan levantamientos definen sus finalidades, formularios, usuarios, autorizaciones y conservación de los registros. Para esos datos, DRAN DIGITAL S.A.S. presta el servicio conforme a los acuerdos e instrucciones aplicables. La organización responsable de cada levantamiento debe identificarse ante sus participantes.',
      'El servicio es una herramienta de trabajo de campo para equipos autorizados. No está dirigido a menores de 13 años. Los usuarios de 13 a 17 años deben contar con la autorización que corresponda de la organización y de sus representantes, según las reglas aplicables. La configuración de audiencia de una tienda no sustituye estas obligaciones ni constituye una verificación automática de edad.',
    ] },
    { id: 'informacion', title: 'Información que se trata', paragraphs: [
      'Cuentas: nombre, correo de acceso, identificador interno, rol, organización, asignaciones y datos necesarios para autenticar y administrar la cuenta. El acceso de trabajo es gestionado por la organización; no hay registro público libre desde la pantalla de inicio de sesión.',
      'Registros de campo: respuestas, datos de personas, hogares, establecimientos o visitas según el instrumento configurado, territorio, fecha, versión del formulario y estado de revisión y sincronización. Un proyecto puede incluir información sensible; la organización debe justificarla y aplicar minimización y las salvaguardas correspondientes.',
      'Evidencias: fotos, audio, firmas manuscritas, documentos y otros archivos que el usuario capture o seleccione en los campos habilitados. Una firma dibujada no acredita por sí sola una firma electrónica certificada. Ubicación: coordenadas y precisión reportadas por el dispositivo al usar campos GPS, recorridos o áreas, con los permisos correspondientes.',
      'Operación técnica: identificadores de registros, integridad de archivos, eventos de acceso y sincronización y registros del servicio necesarios para seguridad y diagnóstico. Los proveedores de autenticación y alojamiento pueden procesar información de red, como la dirección IP. El APK no integra una red de anuncios ni requiere un identificador publicitario para capturar datos.',
    ] },
    { id: 'finalidades', title: 'Uso y acceso a la información', paragraphs: [
      'Los datos permiten ejecutar asignaciones, conservar borradores y capturas, sincronizar evidencias, revisar resultados y elaborar mapas, análisis, informes y exportaciones autorizados. Las cuentas se utilizan para controlar permisos y atender soporte. El acceso depende del rol y de la organización; los registros de campo no se publican automáticamente en la web comercial.',
      'La organización debe informar las finalidades del levantamiento y definir la base para tratar cada dato, incluyendo las autorizaciones exigibles. Cuando el proyecto incluya información de niños, niñas, adolescentes o datos sensibles, debe establecer protocolos específicos antes de aplicar el formulario. La exclusión de menores de 13 como usuarios de la app no autoriza por sí sola a recolectar información sobre ellos.',
    ] },
    { id: 'dispositivo', title: 'Permisos y trabajo sin internet', paragraphs: [
      'Antes de salir sin señal es necesario iniciar sesión con internet y descargar las asignaciones y formularios. Control G conserva respuestas y evidencias en el almacenamiento local del dispositivo. Cuando vuelve la conexión y se ejecuta la sincronización, se envían al servidor. No se deben desinstalar la app ni borrar su almacenamiento si existen pendientes.',
      'Los permisos de cámara, micrófono y ubicación se usan al activar funciones que los requieren. Rechazarlos puede impedir completar un campo obligatorio, pero no debe confundirse con una autorización general para otras finalidades. El usuario selecciona los archivos que desea adjuntar; no se exige acceso general a toda la galería para tomar evidencias nuevas.',
      'El GPS puede funcionar sin datos móviles, dependiendo de permisos, hardware y recepción satelital; no se garantiza una precisión universal. Los mapas base remotos, las consultas externas y el asistente de IA pueden requerir internet. No hay seguimiento GPS continuo en segundo plano como requisito del flujo de captura.',
      'Las copias locales pueden permanecer después de sincronizar. La organización y el usuario deben proteger el equipo y aplicar su procedimiento de limpieza después de confirmar la recepción de los datos. La eliminación de una cuenta en el servidor no borra por control remoto un dispositivo que permanece sin conexión.',
    ] },
    { id: 'proveedores', title: 'Infraestructura, integraciones e inteligencia artificial', paragraphs: [
      'El servicio utiliza Vercel para componentes web y API, y Supabase alojado en infraestructura administrada por DRAN para autenticación, base de datos y archivos. Estos servicios y sus proveedores de infraestructura procesan información para operar la herramienta y pueden utilizar ubicaciones fuera del país del usuario. La organización debe revisar los acuerdos aplicables y puede consultar sobre proveedores y transferencias en ceo@dran.digital.',
      'El asistente de formularios puede usar Google Gemini, OpenAI u OpenRouter. Solo opera con internet. Al generar se transmite al proveedor elegido el texto introducido y, al mejorar un borrador, la definición del cuestionario. OpenRouter puede dirigir esa solicitud al proveedor del modelo configurado. El generador no envía automáticamente las respuestas de campo. Antes de usarlo, la interfaz solicita confirmar que el texto no incluye datos personales reales, respuestas ni información confidencial. No se deben introducir datos de menores ni otros datos sensibles en esos mensajes.',
      'Las condiciones de procesamiento del proveedor y modelo elegido se aplican a la solicitud de IA. No se afirma que todos los proveedores tengan idéntica conservación o que ninguna solicitud pueda registrarse. El resultado debe ser revisado por una persona antes de publicar un formulario.',
      'Las integraciones GIS, capas remotas y exportaciones habilitadas por la organización pueden transmitir datos al servicio configurado o a los destinatarios de la exportación. Deben activarse solo para finalidades autorizadas. La medición del sitio comercial web, cuando el visitante la acepta, se gestiona por separado y no se habilita en las pantallas privadas de captura ni en el APK.',
    ] },
    { id: 'conservacion', title: 'Conservación y eliminación', paragraphs: [
      'Los registros de campo se conservan conforme a la finalidad y a la política que la organización responsable determine para el proyecto. No existe un plazo único para todas las entidades o países. Las cuentas y perfiles se conservan mientras sean necesarios para el servicio y su gestión; las solicitudes de cierre o eliminación se revisan con el responsable correspondiente.',
      'Al tramitar una solicitud verificada se determina qué cuenta y datos asociados pueden eliminarse y qué información debe conservarse por una obligación o finalidad legítima documentada. La desactivación del acceso no equivale a eliminar la cuenta. Cualquier conservación necesaria debe explicarse al solicitante, junto con su alcance. Los datos del proyecto que tengan un responsable diferente requieren su intervención; no se debe eliminar información de terceros sin autoridad.',
      'Los registros técnicos y respaldos pueden conservar copias que no se eliminan instantáneamente al borrar un registro del servicio activo. Se puede solicitar información sobre las condiciones aplicables al caso y a los respaldos. No se promete un plazo de eliminación de copias que no haya sido acordado y verificado. Borrar la app solo retira su copia local; no elimina la cuenta ni los datos ya sincronizados.',
    ] },
    { id: 'derechos', title: 'Solicitudes y derechos sobre datos', paragraphs: [
      'Para solicitar acceso, corrección, actualización o eliminación, escribe a ceo@dran.digital o contacta a la organización que realizó el levantamiento. Para una cuenta de Control G, indica el correo de acceso, la organización y si solicitas eliminar la cuenta, datos determinados o ambas cosas. Puedes iniciar la solicitud desde la sección «Eliminar cuenta y datos» de la app y desde www.controlg.co/eliminar-cuenta sin iniciar sesión.',
      'No envíes contraseñas, códigos de acceso, datos de otras personas ni documentos de identidad que no hayan sido solicitados y justificados. El equipo verificará la identidad, la organización responsable y el alcance de la petición por un canal adecuado. El procedimiento es de atención por soporte: pulsar un enlace no elimina datos automáticamente ni confirma que una solicitud ya se haya enviado.',
    ] },
    { id: 'seguridad', title: 'Seguridad y cambios de la política', paragraphs: [
      'Control G utiliza comunicaciones HTTPS y controles de acceso por cuenta, organización y rol. Estas medidas no reemplazan el bloqueo y la protección del equipo. No se afirma invulnerabilidad, certificaciones no verificadas ni cifrado de extremo a extremo para todos los registros y copias locales.',
      'Esta política se identifica por su fecha de versión. La versión vigente se consulta en www.controlg.co/privacidad. El APK conserva una copia legible sin conexión; cuando se publique una política posterior, la copia incluida en una versión anterior de la app puede no coincidir con ella. Contacto: DRAN DIGITAL S.A.S., ceo@dran.digital.',
    ] },
  ],
}

const deletion = {
  slug: 'eliminar-cuenta', title: 'Eliminar cuenta y datos de Control G',
  introduction: 'Puedes solicitar la eliminación de tu cuenta de Control G o de datos determinados a DRAN DIGITAL S.A.S. No necesitas iniciar sesión para consultar estas instrucciones.',
  sections: [
    { id: 'solicitar', title: 'Cómo iniciar la solicitud', paragraphs: [
      'Envía un correo a ceo@dran.digital con el asunto «Control G - Solicitud de eliminación de cuenta». Indica el correo de tu cuenta, tu organización y si deseas eliminar la cuenta, datos concretos o ambas cosas. Si no recuerdas tu organización o no puedes iniciar sesión, explícalo en el mensaje para que soporte pueda orientarte.',
      'El botón «Preparar correo de solicitud» abre tu aplicación de correo. Debes revisar el mensaje y enviarlo allí. También puedes copiar la dirección y escribir desde tu servicio de correo habitual. Esta página no transmite tus datos ni realiza una eliminación por sí sola. Para enviar y tramitar la petición hace falta conexión.',
    ] },
    { id: 'alcance', title: 'Qué se revisa y qué puede conservarse', paragraphs: [
      'Soporte verifica tu identidad y el alcance con la organización responsable. La petición puede comprender el perfil y acceso de la cuenta, datos personales asociados y archivos correspondientes. Los registros de campo pueden pertenecer al proyecto de una organización y contener información de otras personas; por eso requieren revisión por su responsable y no un borrado indiscriminado.',
      'Si una obligación legal, seguridad o una finalidad legítima documentada exige conservar información limitada, se explicará qué se conserva y por qué. Los respaldos y registros técnicos pueden mantener copias hasta su renovación conforme a las condiciones aplicables. No se promete una eliminación instantánea ni un plazo de respaldo no verificado. Suspender una cuenta no se considera eliminarla.',
    ] },
    { id: 'pendientes', title: 'Cuida las capturas pendientes', paragraphs: [
      'Eliminar la app o limpiar su almacenamiento no elimina tu cuenta del servidor. Puede destruir capturas que todavía no hayan sido sincronizadas. Antes de retirar un dispositivo de operación, coordina con tu organización la recepción de los pendientes y su tratamiento adecuado. No borres información de terceros sin su autorización y la base correspondiente.',
      'Nunca incluyas contraseñas, códigos de acceso o evidencias con datos de terceros en un correo de solicitud. Si se necesita información adicional para verificar tu identidad, soporte indicará el canal y los datos mínimos necesarios.',
    ] },
  ],
}

export function getLegalDocument(slug) {
  return slug === 'privacidad' ? privacy : slug === 'eliminar-cuenta' ? deletion : null
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char])

export function renderLegalDocument(slug) {
  const doc = getLegalDocument(slug)
  if (!doc) return null
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow,noarchive"><title>${escapeHtml(doc.title)}</title><style>body{margin:0;color:#183344;background:#f4f7f9;font:17px/1.75 system-ui,sans-serif}main{max-width:72ch;margin:32px auto;padding:32px;background:white}h1{font-size:clamp(1.8rem,5vw,2.6rem);line-height:1.2}h2{font-size:1.25rem;line-height:1.4;margin-top:2rem}a{color:#075e83;text-underline-offset:4px}a:focus-visible{outline:3px solid #0d747a;outline-offset:4px}.links{display:flex;flex-wrap:wrap;gap:20px;padding:20px 0;border-top:1px solid #d7e2e8}.action{display:inline-block;background:#1b3a4b;color:white;padding:12px 18px;border-radius:8px}.meta{font-size:.875rem;color:#526574}p{overflow-wrap:anywhere}@media(max-width:600px){main{margin:0;padding:24px 20px}}</style></head><body><main><a href="/login">Control G</a><h1>${escapeHtml(doc.title)}</h1><p class="meta">${LEGAL_OPERATOR} · Versión ${LEGAL_VERSION}</p><p>${escapeHtml(doc.introduction)}</p>${slug === 'eliminar-cuenta' ? `<a class="action" href="${DELETION_MAILTO}">Preparar correo de solicitud</a>` : ''}${doc.sections.map(section=>`<section aria-labelledby="${section.id}"><h2 id="${section.id}">${escapeHtml(section.title)}</h2>${section.paragraphs.map(paragraph=>`<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('')}<p>Contacto: <a href="mailto:${LEGAL_CONTACT}">${LEGAL_CONTACT}</a></p><nav class="links" aria-label="Privacidad y cuenta"><a href="/privacidad">Política de privacidad</a><a href="/eliminar-cuenta">Eliminar cuenta y datos</a><a href="/login">Volver a Control G</a></nav></main></body></html>`
}
