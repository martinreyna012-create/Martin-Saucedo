# Neurama · Libemor

Centro de actividades de Libemor con perfiles profesionales, pacientes y calendario por cuenta. Usa el starter Vinext de Sites para la API y D1 para los datos persistentes. La colección y las cuatro aplicaciones se sirven desde `public/`.

## Colección

- Cuatro aplicaciones completas en `public/actividades`: Chef por un día, Estación de sonidos, Misión mochila y Primero el plan. Se abren dentro de un iframe del mismo origen, con su propio contexto, estilos, sonido y registros.
- Cinco materiales de Canva: Restas con dinosaurios, Organizo mi tarea, Misiones de superhéroes, Mini tienda e Historias en la escuela. Se utilizan los enlaces de consulta y edición devueltos por Canva; se conservan los originales.
- Acceso adicional al formato de actividad creado anteriormente en Google Docs, conservado como plantilla en blanco.
- Búsqueda por nombre, proceso y contexto; filtros por proceso/tipo; favoritos.
- Plan de sesión con minutos editables, orden, marcas de realización y descarga TXT.

`sources.json` registra proyecto y commit de los cuatro módulos al integrarlos. Son instantáneas de las versiones verificadas en esta fecha; los cambios futuros en los originales requieren actualizar estas copias. Los originales no se modificaron.

Los favoritos y el plan general sin vincular persisten en localStorage. Los perfiles, fichas y citas se guardan en D1, asociados al identificador de visitante autenticado por Sites. El plan vinculado a un paciente no se guarda en localStorage. Las marcas de realización duran hasta recargar. Los registros individuales siguen dentro de cada actividad. Cerrar un juego elimina su iframe y detiene sus sonidos/tareas; antes se recuerda descargar el registro. El puente de integración pausa la fila o la escucha cuando se solicita cerrar; la reanudación queda dentro de la actividad.

## Verificación

`node --test tests/*.test.mjs`

Comprueba catálogo, fuentes, rutas y recursos empaquetados, filtros, normalización y plan/exportación.

Vista previa con el servicio administrado de Sites. El acceso a la colección y el acceso por cuenta a la agenda se gestionan por separado.

## Revisión de juego · 30 de octubre de 2026

Se recuperó la imagen original `Cerebro estilizado con árbol interior.png`, que se utilizó en las actividades imprimibles. Se conservó sin alterar como `public/logo-cerebro-arbol.png` y se integró en la identidad de Neurama y las cuatro aplicaciones.

Defectos corregidos en las copias integradas:

- Misión mochila solo mostraba aciertos iniciales, sin las intrusiones de esa selección. Ahora registra omisiones e intrusiones tanto al inicio como después del cambio, conserva las pausas y consultas, y descarga CSV. Cuenta con tres consignas por nivel sin repetición inmediata; también cambia el orden de los materiales.
- Los tiempos de exposición de memoria seguían avanzando durante consultas o al solicitar volver al centro. `ActiveCountdown` conserva solo el tiempo activo; la consigna se oculta en pausa y la reanudación es explícita.
- Estación de sonidos no pausaba al abrir la guía y no se podía pausar su cuenta de inicio. Ahora contempla ambos casos; pulsar espacio sobre otro control no añade una respuesta al ensayo.
- Primero el plan siempre colocaba primero las metas y respuestas correctas. Se mezclan las posiciones conservando sus identificadores. Un intento en curso pide confirmación antes de salir.
- Las descargas generadas desde los iframes no completaban la descarga en el navegador de prueba. Los módulos ahora delegan la descarga al centro mediante mensajes del mismo origen verificados contra el iframe activo. Los registros de sonido sin ensayos completos conservan sus pausas con una fila explícita sin estímulo evaluado.

Pruebas en navegador: mochila con una intrusión inicial y selección final correcta; bloque auditivo de un minuto sin responder (6 omisiones); práctica con claxon, pausa al abrir guía tanto en cuenta de inicio como durante bloque y registro parcial; plan de 4 pasos con orden invertido y resta incorrecta, y plan de 6 pasos con respuestas y apoyos; Chef con exposición de 5 segundos pausada y reanudada, entrega correcta y receta 5 sin cebolla en F2/N1. Se descargaron y comprobaron los CSV de las cuatro aplicaciones.

Los materiales de Canva se confirmaron por sus identificadores de diseño. Las correcciones de juego se aplican a las versiones contenidas en Neurama.


## Perfiles y agenda · 30 de octubre de 2026

- Inicio con creación de perfil, agenda del día, pacientes activos y próximas sesiones.
- Pacientes con nombre o alias, edad opcional, objetivo general, historial y archivo reversible.
- Calendario mensual y vista de agenda, con citas de 5 a 240 minutos en horario de Monterrey. Las citas se pueden editar, cancelar, reprogramar y marcar como realizadas.
- Plan por cita con actividades de Neurama y actividades propias: objetivo, instrucciones, enlace y tiempo editable; orden y descarga TXT.
- API con identidad obligatoria y todas las consultas restringidas al propietario; comprobación atómica de cruces de horario, validación y versiones para evitar sobreescrituras.
- Modo de demostración explícito, con datos ficticios solo en memoria cuando no se puede acceder a la cuenta. No altera la autenticación del sitio.
- Se eliminó la leyenda «por Libemor» debajo de la marca Neurama; se conservó el logotipo original.

### Desarrollo

Instalación y compilación mediante los helpers de Sites; `npm run db:generate` para nuevas migraciones. No modificar migraciones ya aplicadas. `node --test tests/*.test.mjs` cubre catálogo, juegos, validación, persistencia, aislamiento entre cuentas, cruces y versiones. La vista previa administrada no emula identidad; las pruebas visuales usan el modo de demostración y las pruebas del servicio usan SQLite con el mismo SQL que D1.


## Retroalimentación de actividades · 31 de octubre de 2026

Las cuatro aplicaciones integradas usan un panel de revisión común, con contadores, definiciones, tabla de esperado/observado y resumen copiable. Se muestran únicamente categorías que permite observar cada actividad.

- Chef: omisiones, intrusiones, ingredientes de un pedido anterior presentes tras un cambio y restricciones incumplidas. Se conserva la diferencia entre entrega y preparación evaluada. Clientes que no prepararon quedan sin evaluación.
- Mochila: aciertos, omisiones e intrusiones iniciales y finales, presencia del material cancelado, aplicación del cambio y consultas/pausas.
- Plan: registro de cada revisión y respuesta antes de corregir, errores de secuencia, meta, elección y cálculo, y repetición del mismo error tras retroalimentación. Repetir una omisión no se clasifica como posible perseveración.
- Sonidos: omisiones, comisiones, pulsaciones repetidas y fuera de ventana, con ensayo y latencia. La repetición motora se conserva como dato observable. Los ensayos interrumpidos y la práctica se tratan por separado.

Las posibles perseveraciones son indicadores operativos para revisión del terapeuta; no una clasificación clínica automática. Una misma respuesta puede pertenecer a una categoría de error y a un indicador de persistencia; los contadores explican esas coincidencias.

Los CSV conservan estos datos. Copiar el resumen no sincroniza Google Sheets. La integración con las bitácoras de Drive no está configurada.

Verificación: 25 pruebas de lógica y datos aprobadas. Se completaron las cuatro actividades en navegador con errores deliberados: mochila con omisiones, intrusiones y material cancelado; plan invertido, meta incorrecta y dos respuestas de cálculo iguales antes de corregir; bloque auditivo de 20 ensayos con 6 omisiones, 1 comisión, 1 pulsación repetida y 1 tardía; Chef F2/N1 con cebolla tras pedir retirarla. Se descargaron y leyeron los cuatro CSV. El panel común se verificó a 375 y 768 píxeles de ancho; las pantallas de prueba se retiraron del sitio.


## Portada y acceso por enlace · 31 de octubre de 2026

La portada muestra directamente dos grupos: cuatro actividades En línea y cinco materiales Para imprimir. Los accesos laterales y los filtros de tipo permiten ver cada grupo por separado. Se retiraron el banner, los lemas, las estadísticas decorativas y el bloque promocional inferior. Las tarjetas conservan título, procesos, duración y acciones; las instrucciones completas se abren en la guía. En teléfonos se priorizan tarjetas compactas.

La colección es la ruta inicial y funciona sin identidad; una respuesta 401 de la agenda no oculta las actividades. El espacio profesional, los pacientes y el calendario conservan identidad obligatoria y las consultas se restringen a su propietario. El modo de demostración no se ofrece en la pantalla de acceso. La configuración solicitada para Sites es pública: cualquier persona con el enlace puede entrar en la colección.

Verificación: pruebas de lógica existentes aprobadas; revisión visual a 375 y 768 px; separación de grupos 4/5, búsqueda dentro de categoría y pantalla de inicio de sesión al abrir el calendario sin identidad. La pantalla temporal de revisión se eliminó antes de compilar.
