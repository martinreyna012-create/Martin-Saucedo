import {normalizePlan} from './clinic-domain.mjs';
export const processes = ['Atención selectiva','Atención sostenida','Memoria de trabajo','Planeación','Organización','Control inhibitorio','Flexibilidad cognitiva','Cognición social','Cálculo'];

export const activities = [
  {
    id:'chef',title:'Chef por un día',eyebrow:'RECUERDA · PREPARA · ADAPTA',kind:'app',theme:'peach',art:'burger',minutes:15,
    description:'Atiende tu restaurante, recuerda pedidos y adapta las recetas cuando algo cambia.',
    tags:['Memoria de trabajo','Control inhibitorio','Flexibilidad cognitiva'],context:'Restaurante · material físico o digital',
    objective:'Mantener y actualizar pedidos, seguir las reglas de las recetas y revisar la preparación antes de entregar.',
    steps:['Elige Retos de memoria o Recetas por niveles y ajusta la dificultad.','En memoria, observa el pedido y prepáralo cuando se oculte. En recetas, estudia el recetario antes de la fase.','Escucha los cambios y restricciones del cliente; adapta tu preparación y revisa antes de servir.'],
    settings:'De 1 a 3 hamburguesas; exposición de 5, 10 o 15 segundos en memoria; 3 fases de 5 niveles en recetas. Preparación de 60 a 120 segundos según el pedido. En memoria elige servicios de 3, 5 o 10 clientes. Resultados completos al final. Sonido ambiental opcional.',
    observe:'Omisiones, ingredientes extra, actualización del pedido, apoyos y exactitud de la preparación. La entrega se registra por separado.',
    path:'actividades/chef/',original:'https://restaurante-chef-libemor.glossynewt10.chatgpt.site'
  },
  {
    id:'sonidos',title:'Estación de sonidos',eyebrow:'ESCUCHA · DISTINGUE · RESPONDE',kind:'app',theme:'blue',art:'headphones',minutes:5,
    description:'Escucha sonidos reales y responde solo cuando aparezca el sonido elegido.',
    tags:['Atención sostenida','Control inhibitorio'],context:'Escucha · respuesta por botón o teclado',
    objective:'Sostener la atención a una regla auditiva y responder al sonido objetivo mientras se omiten los distractores.',
    steps:['Escucha los seis sonidos y elige con el terapeuta a cuál responder.','Completa la práctica para comprobar que se entiende la regla.','Realiza los bloques, descansa entre ellos y revisa el registro al terminar.'],
    settings:'Campana, tambor, silbido, gotas, claxon o perro como objetivo; bloques de 1 a 3 minutos y ritmo ajustable.',
    observe:'Aciertos, omisiones, respuestas ante distractores y pausas. Puedes descargar el registro de la actividad.',
    path:'actividades/sonidos/',original:'https://estacion-sonidos-libemor.glossynewt10.chatgpt.site'
  },
  {
    id:'mochila',title:'Misión mochila',eyebrow:'ESCUCHA · RECUERDA · ACTUALIZA',kind:'app',theme:'sage',art:'backpack',minutes:10,
    description:'Prepara los materiales para mañana y ajusta la mochila cuando cambie la indicación.',
    tags:['Memoria de trabajo','Organización','Flexibilidad cognitiva'],context:'Escuela y casa · consignas con cambios',keywords:['horario','materiales escolares'],
    objective:'Retener una consigna, seleccionar los materiales necesarios y actualizar la selección ante un cambio de horario.',
    steps:['Elige la dificultad y escucha qué materiales debes guardar y cuál debes dejar fuera.','Cuando desaparezca la consigna, toca o arrastra los materiales ilustrados para guardarlos en la mochila.','Recibe el cambio de indicación, ajusta tu selección y comprueba qué conservaste, quitaste y agregaste.'],
    settings:'Niveles con 2, 3 o 4 elementos y tres consignas distintas por nivel. Los materiales tienen dibujos propios y se animan al entrar o salir de la mochila. Su orden cambia en cada intento. La consigna se muestra durante 15 segundos; la consulta adicional se cuenta como apoyo.',
    observe:'Aciertos, omisiones e intrusiones al inicio y después del cambio; actualización, consultas y pausas. Incluye descarga del registro CSV.',
    path:'actividades/mochila/',original:'https://mochila-memoria-martin.glossynewt10.chatgpt.site'
  },
  {
    id:'plan',title:'Primero el plan',eyebrow:'PIENSA · ORGANIZA · HAZ',kind:'app',theme:'butter',art:'steps',minutes:15,
    description:'Ordena tus pasos antes de resolver una tarea, hacer una compra o preparar el lonche.',
    tags:['Planeación','Organización','Cálculo'],context:'Situaciones cotidianas · adolescentes',
    objective:'Identificar una meta, anticipar las acciones necesarias, ordenar sus dependencias y revisar el plan al realizarlo.',
    steps:['Elige una situación de escuela, compras o casa.','Define la meta y acomoda las cuatro acciones antes de actuar.','Revisa el orden, ponlo en marcha y reflexiona sobre qué apoyo te ayudó.'],
    settings:'Cuatro acciones por reto y tres cálculos relacionados sobre cantidades, tiempo o presupuesto. Operaciones y calculadora opcionales; sin límite de tiempo.',
    observe:'Identificación de la meta, pasos que deben ir primero, revisión de la secuencia y apoyos de planeación o cálculo.',
    path:'actividades/plan/',original:'https://primero-el-plan-libemor.glossynewt10.chatgpt.site'
  },
  {
    id:'aves',title:'Vuelo de colores',eyebrow:'OBSERVA · ELIGE · ESPERA',kind:'app',theme:'sage',art:'birds',minutes:2,
    description:'Mira por el telescopio y responde al color indicado mientras los pájaros vuelan uno por uno.',
    tags:['Atención selectiva','Atención sostenida','Control inhibitorio'],context:'Visor de telescopio · vuelo continuo',keywords:['pajaritos','pájaros','aves','colores'],
    objective:'Mantener una regla visual, seleccionar el color objetivo entre distractores y esperar cuando no está presente.',
    steps:['Elige el color y una duración de 1, 2 o 3 minutos. En Ajustes puedes cambiar la dificultad, la velocidad y el campo de visión.','Los pájaros pasan uno por uno. Toca el visor o pulsa espacio solo mientras pase el color indicado.','Revisa aciertos, omisiones, selecciones incorrectas y repetidas al terminar.'],
    settings:'Sesiones de 1, 2 o 3 minutos. Plumas del color seleccionado confirman cada pulsación. Ajustes opcionales de dificultad, velocidad y tamaño del visor; durante el juego solo se muestra la animación. Práctica breve disponible.',
    observe:'Aciertos, omisiones, selecciones de distractores, repeticiones, esperas correctas y tiempo de respuesta. Incluye resumen para copiar y registro CSV.',
    path:'actividades/aves/'
  },
  {
    id:'dinosaurios',title:'Restas con dinosaurios',eyebrow:'OBSERVA · CUENTA · RESTA',kind:'material',theme:'lilac',art:'dino',minutes:10,pages:8,
    description:'Restas muy sencillas, del 1 al 10, con un ejemplo guiado y dinosaurios.',
    tags:['Cálculo','Atención sostenida'],context:'Presentación · apoyo visual',
    objective:'Practicar restas sencillas con apoyos visuales y revisar el resultado de cada operación.',
    steps:['Abre la presentación y revisa el ejemplo 5 − 2.','Resuelve las cinco restas; puedes acompañarlas con fichas o material físico.','Compara las respuestas al cierre y explica cómo resolviste una de las operaciones.'],
    settings:'8 diapositivas con ejemplo, cinco ejercicios y respuestas. Editable para ajustar las cantidades.',
    observe:'Comprensión de quitar una cantidad, conteo y apoyos empleados.',
    view:'https://www.canva.com/d/9xEliqs3aqT2F4b',edit:'https://www.canva.com/d/KA243LT3AB42svF',designId:'DAHXj4-eC0w'
  },
  {
    id:'espanol',title:'Organizo mi tarea',eyebrow:'ANTICIPA · ORDENA · REVISA',kind:'material',theme:'rose',art:'notebook',minutes:15,pages:2,
    description:'Organiza una tarea de Español, distribuye el tiempo y ajusta el plan ante un imprevisto.',
    tags:['Planeación','Organización','Flexibilidad cognitiva'],context:'Escuela · formato para completar',
    objective:'Planear una tarea escolar considerando los materiales, el orden de los pasos, los distractores y el tiempo disponible.',
    steps:['Lee la situación: entregar un resumen y cinco palabras nuevas en 45 minutos.','Ordena siete acciones y escribe tu plan con materiales y minutos por paso.','Ajusta el plan cuando solo quedan 25 minutos y realiza la revisión final.'],
    settings:'2 páginas: situación, tarjetas de acciones y plan de trabajo. Puedes cambiar la tarea y el tiempo en Canva.',
    observe:'Priorización, preparación del espacio, estimación de tiempo y adaptación del plan.',
    view:'https://www.canva.com/d/AcTF2vWYivYk263',edit:'https://www.canva.com/d/CITqZnyNzm_1IMm',designId:'DAHZQRYzMMU'
  },
  {
    id:'superheroes',title:'Misiones de superhéroes',eyebrow:'UNA MISIÓN · UN PLAN',kind:'material',theme:'sky',art:'hero',minutes:15,pages:2,
    description:'Ordena los pasos para hacer la tarea, preparar el lonche, el chocomilk y la mochila.',
    tags:['Planeación','Organización'],context:'Escuela y casa · 4 misiones',
    objective:'Ordenar acciones de actividades cotidianas y anticipar qué debe comprobarse al terminar.',
    steps:['Elige una de las cuatro misiones cotidianas.','Numera las cinco acciones en el orden en que las realizarías y explica tu elección.','Escribe qué revisarás al final. Puedes simular la secuencia con material físico.'],
    settings:'2 páginas con 4 misiones y espacio para revisión final. Usa una misión por vez o combina varias.',
    observe:'Secuenciación, anticipación de materiales y comprobación de la tarea terminada.',
    view:'https://www.canva.com/d/1M-Qb9No_zb2tiv',edit:'https://www.canva.com/d/Tc_0hkKjkzfJA9r',designId:'DAHZQbuzTFA'
  },
  {
    id:'tienda',title:'Mini tienda',eyebrow:'UNA COMPRA PARA RECORDAR',kind:'material',theme:'peach',art:'store',minutes:10,pages:2,
    description:'Material de memoria de trabajo ambientado en una pequeña tienda.',
    tags:['Memoria de trabajo'],context:'Compras · presentación en Canva',
    objective:'Utilizar una situación cotidiana de compras para trabajar el mantenimiento de información durante una actividad.',
    steps:['Abre el material y revisa las consignas antes de la sesión.','Elige con el terapeuta la cantidad de elementos y los apoyos que utilizarás.','Realiza la actividad y revisa la información recordada y los apoyos necesarios.'],
    settings:'Presentación de 2 páginas. Revisa y ajusta sus consignas en Canva según lo que quieras trabajar.',
    observe:'Información recordada, omisiones y apoyos requeridos durante la consigna.',
    view:'https://www.canva.com/d/apUb2ypUDtTw8hL',edit:'https://www.canva.com/d/PEHjQd5CGQU_M1i',designId:'DAHYNHG5EIw'
  },
  {
    id:'social',title:'Historias en la escuela',eyebrow:'CONVIVIR · EXPRESAR · ESPERAR',kind:'material',theme:'sage',art:'social',minutes:10,pages:2,
    description:'Historias sociales sobre expresar el enojo sin lastimar y esperar el turno.',
    tags:['Cognición social','Control inhibitorio'],context:'Escuela · lectura acompañada',
    objective:'Conversar sobre situaciones escolares, reconocer alternativas para expresar el malestar y practicar cómo pedir ayuda o esperar el turno.',
    steps:['Lee una historia junto con el terapeuta y comenta qué está pasando.','Identifica qué puede hacer el personaje cuando siente enojo o necesita un turno.','Practica una respuesta mediante una breve representación de la situación.'],
    settings:'2 páginas con situaciones escolares. El material original está personalizado; puedes adaptar el nombre y los ejemplos en Canva.',
    observe:'Comprensión de la situación, expresión de necesidades, alternativas propuestas y uso de apoyos.',
    view:'https://www.canva.com/d/qe3F6x1RaxWZooY',edit:'https://www.canva.com/d/BgKQp1Sg8cXHspX',designId:'DAHYNZieK8E'
  }
];

export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function filterActivities({query='',process='',kind='',favorites=null}={}) {
  const q=normalize(query);
  return activities.filter(a => (!process||a.tags.includes(process))&&(!kind||a.kind===kind)&&(!favorites||favorites.includes(a.id))&&(!q||normalize([a.title,a.description,a.context,...a.tags,...(a.keywords||[])].join(' ')).includes(q)));
}
export function cleanPlan(plan) {
 if(!Array.isArray(plan))return [];const out=[],seen=new Set();for(const p of plan){if(!p||seen.has(p.id))continue;try{const item=normalizePlan([{...p,minutes:Math.min(60,Math.max(1,Math.round(Number(p.minutes)||10)))}])[0];seen.add(item.id);out.push(item);}catch{}}return out;
}
export function planText(plan) {
  return ['NEURAMA · LIBEMOR','Plan de sesión','',...plan.map((p,i)=>{const a=activities.find(a=>a.id===p.id);return `${i+1}. ${a?.title||p.custom?.title||'Actividad'} · ${p.minutes} min\n   ${a?a.tags.join(' · '):p.custom?.goal||'Actividad propia'}`;}),'',`Tiempo previsto: ${plan.reduce((s,p)=>s+p.minutes,0)} minutos`,'Los tiempos son orientativos y se ajustan en sesión.'].join('\n');
}
