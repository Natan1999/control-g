# Control G 2.17 · mapa y demostración municipal

## Qué incluye

- `/demo`: alcaldía ficticia Villa Esperanza, 240 caracterizaciones, seis sectores, tres capas y dos formularios (juventud y servicios públicos).
- Selector de perfiles simulados: coordinación, apoyo y tres profesionales. Camila recibe juventud; Andrés, servicios; Valentina, ambos. No son cuentas de Supabase ni credenciales para ingresar a la operación real.
- Bandeja de pruebas en una base IndexedDB separada (`control-g-demonstration`). Fotos y respuestas permanecen en el dispositivo; las capturas con GPS aparecen también en el mapa. Las que no tienen GPS permanecen en la bandeja. No sincroniza pruebas con otros dispositivos.
- Mapa con encuadre de los registros operativos, proyección Mercator, escala aproximada, zoom hasta 32×, desplazamiento, teclado, capas y opacidad. Pantalla completa mantiene herramientas y exportaciones; se cierra con el botón o Escape.
- Calor por concentración de grupos (no indicador estadístico de densidad por km²), puntos, agrupaciones y cobertura por meta. Los límites nacionales de referencia no cuentan como zonas de intervención.
- ZIP territorial con puntos y geometrías de las capas visibles en GeoJSON WGS84, además de los formatos existentes: GeoJSON, Shapefile, CSV, GeoPackage y PDF. El ZIP omite atributos arbitrarios de capas y respuestas para no exportar información personal inadvertidamente. No incluye adjuntos fotográficos.
- Captura de fotografía con el plugin nativo de Capacitor y alternativa de archivo; GPS mediante Capacitor, mensajes de permisos y opción de omitir la ubicación adicional al enviar.
- Guardado atómico de respuesta y cola de fotos: ambas se confirman juntas o se revierte el guardado. Un fallo de sincronización posterior no se presenta como pérdida de una respuesta ya guardada.

## Guion de demostración

1. Abrir `/demo` desde el enlace del login o desde Superadmin → Entidades → Demo de alcaldía.
2. Presentar las 240 caracterizaciones y la cobertura por sector. Todo el conjunto es ficticio; los límites no son cartografía oficial.
3. Abrir pantalla completa; mostrar capas, opacidad, puntos, calor y cobertura. Usar `+`, `−`, arrastre y restablecer.
4. Elegir Camila. Comprobar que aparece solo «Oportunidades para jóvenes» y sus 80 registros ficticios.
5. Llenar una prueba sin datos personales reales, con o sin foto/GPS. Guardar, recargar y cambiar a coordinación: la prueba sigue en la bandeja local.
6. Exportar «Territorio completo ZIP». Descomprimir; en ArcGIS Pro usar JSON To Features para cada GeoJSON; en QGIS abrir los archivos directamente. EPSG:4326, longitud antes de latitud.

## Implementación para una entidad LATAM

Superadmin → Entidades → Nueva entidad permite seleccionar el país, configurar división administrativa, territorios, contrato y coordinación. Se mantienen los perfiles nacionales existentes y el catálogo administrable. Ahora también se pueden ajustar idioma regional, zona horaria, moneda y centro del mapa, con validación de coordenadas y fechas.

Después de crear la entidad: incorporar equipo, publicar formularios mediante el flujo editorial, asignarlos a profesionales y cargar las capas oficiales de su jurisdicción. Cambiar de país no genera automáticamente cartografía municipal, traducciones completas ni cumplimiento legal local. La configuración regional no sustituye esos preparativos.

## Condiciones de operación offline

- Primer ingreso y descarga de formularios/asignaciones requieren internet. Abrir la operación y comprobar disponibilidad antes de salir a campo.
- El APK contiene los recursos de interfaz. En web, abrir previamente la aplicación/PWA para disponer de su caché. No borrar datos del sitio ni desinstalar con capturas pendientes.
- La posición GPS puede obtenerse sin datos móviles, siempre que haya permisos y señal del dispositivo. En interiores o sin receptor/señal puede fallar. Sin ubicación no se inventan coordenadas ni aparece un punto 0/0.
- Los campos GPS obligatorios siguen siendo obligatorios. Para recolectar sin georreferenciación deben publicarse formularios con GPS opcional; además puede desactivarse «Adjuntar ubicación del dispositivo al envío».
- Las capas vectoriales ya descargadas funcionan offline. No se añadieron mosaicos satelitales ni calles mundiales descargables.
- En cuentas institucionales, al recuperar conexión se procesa la cola existente hacia Supabase. Verificar el estado de sincronización y la evidencia desde coordinación antes de borrar datos locales. La demo pública no prueba ese intercambio entre dispositivos.

## Verificación de esta entrega

- Pruebas automáticas: demo y asignaciones coherentes, encuadre móvil/escritorio, persistencia de foto/respuesta tras cierre, rollback por fallo, omisión de GPS, paquete territorial y exclusión de atributos personales.
- Revisión visual local: escritorio y 390×844, ampliar/cerrar mapa, abrir herramientas y exportaciones, captura sin GPS, recarga y lectura desde perfil de coordinación.
- Supabase: comprobación de conectividad y ausencia de entidades visibles anónimamente; no se crearon cuentas ni datos demo en producción.
- No hay tablet ni emulador conectado. Falta la prueba física de cámara, GPS en modo avión y sincronización real desde el APK hasta otra sesión de coordinación. No se declara completada esa validación.
- El APK generado es de depuración para pruebas, no una publicación firmada para Play Store.

APK: `entregables/Control-G-2.17.0-LATAM-GIS-offline-debug.apk` · `versionCode 21`.
SHA-256: `850af8eddf8360941ac569467ff0c92e8272d14136a371724be51c333950136b`.

Este cambio mejora la operación GIS de Control G; no pretende afirmar equivalencia o superioridad respecto a todas las capacidades de ArcGIS.
