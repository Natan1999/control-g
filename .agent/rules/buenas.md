---
trigger: always_on
---

GUÍA DE BUENAS PRÁCTICAS DE DESARROLLO DE SOFTWARE
Versión 1.0 · 2025


1. PRINCIPIOS FUNDAMENTALES

SOLID es el conjunto de cinco principios base de todo buen diseño. S significa que cada clase o función debe tener una sola razón para cambiar. O significa que el código debe estar abierto para extensión pero cerrado para modificación. L indica que las subclases deben poder reemplazar a sus clases base sin romper el sistema. I dice que no se debe forzar a implementar métodos que no se necesitan. D establece que se debe depender de abstracciones, no de implementaciones concretas.

DRY significa Don't Repeat Yourself: cada pieza de conocimiento debe tener una sola representación. Si copias y pegas código, algo está mal. KISS significa Keep It Simple: la solución más simple que funcione es siempre la correcta. YAGNI significa You Aren't Gonna Need It: no implementes funcionalidades que no necesitas ahora.

Regla del Boy Scout: deja el código siempre más limpio de como lo encontraste. Cada vez que tocas un archivo, mejora algo.


2. CÓDIGO LIMPIO

Los nombres son la forma de comunicación más importante en el código. Las variables van en camelCase descriptivo como userAccountBalance. Las funciones llevan verbo más sustantivo como getUserById. Las clases van en PascalCase como OrderProcessor. Las constantes en SCREAMING_SNAKE_CASE. Los booleanos deben comenzar con is, has o can.

Una función debe hacer una sola cosa. Si necesitas el conector y para describirla, tiene demasiado. Máximo 20 líneas por función y 3 parámetros. Retorna temprano para evitar anidamiento profundo.

El mejor comentario es el que no necesitas porque el código se explica solo. Comenta el por qué, nunca el qué. Eliminar siempre el código comentado porque para eso existe Git.


3. GIT Y CONTROL DE VERSIONES

La estrategia recomendada es Git Flow. La rama main contiene producción y siempre debe estar estable. La rama develop es para integración del equipo. Las ramas feature se crean para cada funcionalidad y se mergean hacia develop. Las ramas hotfix corrigen urgencias en producción.

Todo commit debe seguir Conventional Commits con el formato tipo(scope): descripción. Los tipos válidos son feat, fix, docs, refactor, test y chore.

Nunca hacer force push a main o develop. Nunca commitear credenciales o API keys. Un commit debe representar un solo cambio lógico. Todo código debe pasar por Pull Request antes de llegar a main. Mínimo un revisor por PR. El autor no puede aprobar su propio PR.


4. ARQUITECTURA

La capa de presentación solo muestra datos y captura eventos. La lógica de negocio maneja reglas y validaciones. El acceso a datos gestiona consultas. Mezclar estas capas es la fuente número uno de deuda técnica.

Para APIs REST usar sustantivos en plural para los recursos. GET para leer, POST para crear, PUT para reemplazar, PATCH para actualizar parcialmente y DELETE para eliminar. Versionar desde el inicio con rutas como /api/v1/users. Las respuestas deben ser consistentes con la estructura data, error y meta. Usar los códigos HTTP correctos y siempre paginar las listas.


5. SEGURIDAD

Nunca almacenar contraseñas en texto plano, usar bcrypt con mínimo 12 rondas. Nunca confiar en datos del cliente, validar y sanitizar todo en el servidor. Nunca exponer stack traces al usuario final. Nunca commitear credenciales al repositorio. Nunca usar MD5 o SHA1, usar bcrypt o argon2.

Usar JWT con expiración corta de 15 minutos más refresh tokens. Implementar rate limiting en endpoints de autenticación. Bloquear la cuenta después de 5 intentos fallidos. Verificar roles y permisos siempre en el servidor. Usar HTTPS en todos los entornos.

Para SQL Injection usar siempre ORM o queries parametrizadas. Para XSS escapar los outputs y usar Content Security Policy. Para CSRF usar tokens y validar el header Origin. Todas las credenciales deben vivir en archivos .env incluidos en el gitignore.


6. TESTING

La pirámide de testing establece que el 70% deben ser tests unitarios, el 20% tests de integración y el 10% tests end-to-end.

Un test debe probar una sola cosa. Los tests deben ser independientes entre sí. Usar el patrón AAA: Arrange para preparar, Act para ejecutar y Assert para verificar. La cobertura mínima recomendada es 80% en lógica de negocio crítica.

En el code review verificar que la lógica es correcta, que no hay vulnerabilidades, que no hay N+1 queries, que los casos importantes tienen tests y que el código es legible.


7. BASES DE DATOS

Nombrar tablas en plural y snake_case. Usar UUID como primary key. Incluir siempre created_at y updated_at en todas las tablas. Usar soft delete con deleted_at para datos con valor histórico.

Nunca hacer SELECT asterisco en producción. Indexar columnas que aparecen frecuentemente en WHERE, JOIN u ORDER BY. Evitar N+1 queries usando JOIN en vez de loops. Nunca construir queries concatenando strings del usuario.

Toda modificación de esquema debe tener su migración versionada. Nunca modificar producción sin migración. Hacer backups automáticos diarios con retención mínima de 30 días.


8. PERFORMANCE

Medir antes de optimizar, no por intuición sino con herramientas reales.

En frontend: usar lazy loading para componentes pesados, optimizar imágenes con WebP, implementar code splitting y virtualizar listas largas. Lighthouse score mínimo 85 en mobile.

En backend: caché con Redis para datos que cambian poco, rate limiting en endpoints públicos, connection pooling y colas de trabajo para tareas pesadas como emails y reportes. Tiempo de respuesta objetivo p95 menor a 500ms.


9. DOCUMENTACIÓN

El README debe incluir descripción del proyecto, prerrequisitos, instrucciones de instalación, variables de entorno necesarias, comandos de desarrollo y guía de contribución.

La API debe estar documentada en Swagger o Postman. Los ADRs documentan las decisiones importantes de arquitectura y por qué se tomaron. El CHANGELOG registra el historial de versiones.


10. TRABAJO EN EQUIPO

Los sprints deben durar de 1 a 2 semanas. El daily standup máximo 15 minutos. Una tarea no está terminada hasta que el código tenga PR aprobado, los tests pasen, el linter no reporte errores y la funcionalidad haya sido probada en staging.

La deuda técnica debe registrarse en el backlog. Dedicar al menos el 20% de cada sprint a reducirla. Refactorizar de forma incremental, no en sprints masivos de limpieza.


11. CI/CD Y DESPLIEGUE

El pipeline recomendado ejecuta en orden: lint, test, build, auditoría de seguridad, deploy a staging, tests end-to-end en staging y finalmente deploy a producción con aprobación manual.

Nunca desplegar en viernes sin personal disponible para rollback. Siempre tener plan de rollback documentado. Usar feature flags para activar funcionalidades sin redesplegar. Monitorear métricas de error los 30 minutos después del deploy.

Implementar logging estructurado en JSON. Alertas automáticas cuando el error rate supere el 1%. Herramientas recomendadas: Sentry para errores, Datadog para métricas y Logtail para logs.


12. CHECKLIST ANTES DE UN RELEASE

Código: funciones con una sola responsabilidad, nombres descriptivos, sin código duplicado, sin código comentado sin razón, linter sin errores.

Git: commits siguen Conventional Commits, sin credenciales en el historial, gitignore correcto, todo pasó por PR con revisor.

Seguridad: contraseñas hasheadas, entradas validadas en servidor, JWT con expiración corta, headers de seguridad configurados, variables en .env.

Testing: cobertura mayor al 80% en lógica crítica, tests independientes, tests de integración para flujos críticos.

Base de datos: migraciones versionadas, campos indexados, backups configurados y probados.

Performance: Lighthouse mayor a 85 en mobile, APIs responden en menos de 500ms p95, imágenes en WebP.

Documentación: README completo, API documentada, CHANGELOG actualizado.

Despliegue: pipeline CI/CD activo, monitoreo de errores en producción, plan de rollback documentado.


El código es para máquinas cuando funciona. El código es para humanos cuando es legible.
Robert C. Martin