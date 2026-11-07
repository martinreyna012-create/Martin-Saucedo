const step=(id,title,detail,after,type,payload={})=>({id,title,detail,after,type,...payload});
const question=(id,prompt,a,op,b,answer,unit,explanation)=>({id,question:prompt,a,op,b,answer,unit,explanation});
export const MISSIONS=[
 {
  id:'tarea',tag:'ESCUELA',icon:'notebook',title:'Una entrega para mañana',
  short:'Organiza el trabajo pendiente y comprueba si cabe en tu tiempo.',
  goal:'Terminar los ejercicios pendientes y revisarlos en 50 minutos.',
  situation:'Mañana entregas 24 ejercicios de español y ya terminaste 9. Hoy tienes 50 minutos. Calcula 3 minutos por ejercicio y reserva otros 5 minutos para revisar la entrega. Organiza lo necesario antes de empezar y decide si el tiempo alcanza.',
  facts:[['Entrega','24 ejercicios'],['Ya terminados','9 ejercicios'],['Tiempo disponible','50 minutos'],['Por ejercicio','3 minutos'],['Revisión final','5 minutos']],
  math:{a:24,op:'−',b:9,answer:15,questions:[
   question('pendientes','¿Cuántos ejercicios te faltan?',24,'−',9,15,'ejercicios','De 24 ejercicios, ya terminaste 9: faltan 15.'),
   question('trabajo','¿Cuántos minutos necesitas para resolver los pendientes?',15,'×',3,45,'minutos','Los 15 ejercicios pendientes requieren 3 minutos cada uno: 45 minutos.'),
   question('total','¿Cuántos minutos necesitas en total, incluyendo la revisión?',45,'+',5,50,'minutos','Son 45 minutos de trabajo y 5 de revisión: 50 en total.')
  ]},
  goals:['Terminar los ejercicios pendientes y revisarlos en 50 minutos.','Resolver otra vez los 24 ejercicios, sin revisar.','Hacer solo los ejercicios que alcancen, sin calcular el tiempo.'],
  steps:[
   step('leer','Definir lo que falta y la meta','Distinguir el trabajo terminado, el pendiente y el tiempo disponible.',[],'choice',{prompt:'¿Qué debes organizar antes de comenzar?',options:['Lo que falta, el tiempo para resolverlo y la revisión final.','Los 24 ejercicios desde el principio, sin contar los que ya hiciste.','Solo el tiempo de revisión.'],correct:0,hint:'La entrega ya tiene una parte terminada; también necesitas tiempo para revisar.'}),
   step('material','Preparar el espacio y los recursos','Tener la consigna, los avances y las herramientas antes de trabajar.',[],'checklist',{items:['Tengo la consigna y los 9 ejercicios que ya terminé.','Preparé el material y retiré las distracciones del espacio.']}),
   step('operacion','Calcular y distribuir el bloque de trabajo','Relacionar el pendiente con los minutos por ejercicio y la revisión.',['leer','material'],'math'),
   step('revisar','Decidir si el plan es viable','Comprobar el tiempo total antes de ponerlo en marcha.',['operacion'],'choice',{prompt:'Tu plan necesita 50 minutos y tienes 50. ¿Qué decisión respeta los datos?',options:['Usar 45 minutos para los pendientes y 5 para revisar, sin agregar otra actividad.','Hacer una pausa extra de 10 minutos dentro del mismo bloque.','Resolver solo 9 ejercicios y dedicar el resto a revisar.'],correct:0,hint:'El trabajo y la revisión ya ocupan los 50 minutos disponibles.'})
  ]
 },
 {
  id:'compra',tag:'VIDA COTIDIANA',icon:'bag',title:'Compra con presupuesto',
  short:'Calcula cantidades, costo total y cambio antes de comprar.',
  goal:'Comprar dos cartulinas y un pegamento sin superar $60.',
  situation:'Para una exposición necesitas 2 cartulinas de $18 cada una y 1 pegamento de $14. Tienes $60. En la tienda también ves calcomanías de $15 que no son necesarias. Organiza la compra y comprueba qué puedes pagar.',
  facts:[['Cartulinas','2 de $18'],['Pegamento','1 de $14'],['Presupuesto','$60'],['Extra opcional','Calcomanías: $15']],
  math:{a:2,op:'×',b:18,answer:36,questions:[
   question('cartulinas','¿Cuánto cuestan las dos cartulinas?',2,'×',18,36,'pesos','Cada cartulina cuesta $18. Dos cuestan $36.'),
   question('total','¿Cuánto cuesta todo lo necesario?',36,'+',14,50,'pesos','Las cartulinas cuestan $36 y el pegamento $14: son $50.'),
   question('cambio','¿Cuánto dinero queda después de comprar lo necesario?',60,'−',50,10,'pesos','De los $60 disponibles, gastas $50. Quedan $10.')
  ]},
  goals:['Comprar dos cartulinas y un pegamento sin superar $60.','Comprar también las calcomanías aunque el total exceda el presupuesto.','Comprar una sola cartulina para gastar menos.'],
  steps:[
   step('lista','Revisar necesidades y dinero disponible','Distinguir cantidades necesarias, presupuesto y extras opcionales.',[],'checklist',{items:['La lista pide 2 cartulinas y 1 pegamento.','Tengo $60 y las calcomanías son opcionales.']}),
   step('costo','Calcular el costo y el cambio','Considerar la cantidad de cada producto, el total y el dinero restante.',['lista'],'math'),
   step('alcanza','Elegir una compra que sí puedas pagar','Tomar la decisión antes de pagar, conservando todos los materiales necesarios.',['costo'],'choice',{prompt:'Los materiales cuestan $50 y tienes $60. Las calcomanías cuestan otros $15. ¿Qué compras?',options:['Las 2 cartulinas y el pegamento; dejo las calcomanías.','Todo, porque las calcomanías solo cuestan $15.','Una cartulina y las calcomanías, aunque falte material.'],correct:0,hint:'Lo necesario deja $10 disponibles. El extra de $15 no cabe en ese presupuesto.'}),
   step('revisar','Comprobar materiales y cambio','Verificar la compra antes de salir de la tienda.',['alcanza'],'checklist',{items:['Verifiqué que recibí 2 cartulinas y 1 pegamento.','Comprobé el pago de $50 y los $10 de cambio.']})
  ]
 },
 {
  id:'lonche',tag:'CASA',icon:'lunch',title:'Lonche y espacio listos',
  short:'Coordina cantidades, preparación y orden antes de salir.',
  goal:'Preparar tres sándwiches, guardarlos y ordenar en 20 minutos.',
  situation:'Necesitas 3 sándwiches: 2 para llevar y 1 para dejar en casa. Tienes 10 rebanadas de pan y cada sándwich usa 2. Dispones de 20 minutos: preparar manos y espacio toma 3, armar los tres toma 12 y guardarlos y ordenar toma 2. Planea la secuencia y verifica las cantidades y el tiempo.',
  facts:[['Necesitas','3 sándwiches'],['Pan disponible','10 rebanadas'],['Por sándwich','2 rebanadas'],['Tiempo disponible','20 minutos'],['Manos / armar / guardar','3 / 12 / 2 minutos']],
  math:{a:3,op:'×',b:2,answer:6,questions:[
   question('pan','¿Cuántas rebanadas usarás para los tres sándwiches?',3,'×',2,6,'rebanadas','Tres sándwiches con 2 rebanadas cada uno necesitan 6 rebanadas.'),
   question('restante','¿Cuántas rebanadas quedarán?',10,'−',6,4,'rebanadas','Tienes 10 y utilizas 6: quedan 4.'),
   {...question('tiempo','¿Cuántos minutos requiere todo el plan?',3,'+',12,17,'minutos','Preparar manos y espacio toma 3 minutos; armar, 12; guardar y ordenar, 2. En total son 17.'),operation:'3 + 12 + 2'}
  ]},
  goals:['Preparar tres sándwiches, guardarlos y ordenar en 20 minutos.','Usar las 10 rebanadas aunque sobren sándwiches.','Preparar solo los dos que vas a llevar y dejar el espacio sin ordenar.'],
  steps:[
   step('decidir','Definir las porciones y preparar el espacio','Confirmar la meta y tener manos y espacio listos.',[],'checklist',{items:['Identifiqué que son 3 sándwiches: 2 para llevar y 1 para casa.','Preparé las manos y el espacio antes de tocar los ingredientes.']}),
   step('reunir','Reunir ingredientes y recipientes','Seleccionar lo necesario para preparar y guardar todo el lonche.',['decidir'],'checklist',{items:['Tengo las 10 rebanadas de pan disponibles y los ingredientes indicados.','Preparé recipientes para lo que se lleva y lo que queda en casa.']}),
   step('pan','Calcular las cantidades y realizar el plan','Comprobar el pan y el tiempo antes de preparar los tres sándwiches.',['reunir'],'math'),
   step('guardar','Verificar, guardar y ordenar','Cerrar la actividad con las porciones correctas y el espacio listo.',['pan'],'choice',{prompt:'El plan usa 6 rebanadas y toma 17 minutos. ¿Qué cierre cumple la meta?',options:['Guardar 2 sándwiches para llevar y 1 para casa, revisar las 4 rebanadas restantes y ordenar.','Guardar solo los 2 que se llevan y dejar el tercero sin preparar.','Usar las 4 rebanadas restantes para hacer más, sin revisar el tiempo.'],correct:0,hint:'La meta pide tres porciones con destinos definidos y dejar ordenado el espacio. El plan deja 3 minutos de margen.'})
  ]
 }
];
export function getSteps(mission){return mission.steps}
export function validatePlan(steps,order){const ids=new Set(steps.map(s=>s.id));const missing=steps.filter(s=>!order.includes(s.id));const duplicate=order.length!==new Set(order).size;const unknown=order.some(id=>!ids.has(id));const violations=[];const index=new Map(order.map((id,i)=>[id,i]));for(const s of steps){if(!index.has(s.id))continue;for(const before of s.after){if(index.has(before)&&index.get(before)>index.get(s.id))violations.push({before,after:s.id});}}return {valid:!missing.length&&!duplicate&&!unknown&&!violations.length&&order.length===steps.length,missing,duplicate,unknown,violations}}
export function canonicalPlan(steps){const remaining=[...steps],out=[];while(remaining.length){const i=remaining.findIndex(s=>s.after.every(d=>out.includes(d)));if(i<0)throw new Error('La secuencia tiene una dependencia circular.');out.push(remaining.splice(i,1)[0].id);}return out}
export function calculate(expression){
 const m=expression.replace(/\s/g,'').match(/^(\d{1,3})([+−\-×*÷/])(\d{1,3})$/);if(!m)return null;
 const a=Number(m[1]),b=Number(m[3]);
 if(m[2]==='+')return a+b;if(/[−-]/.test(m[2]))return a-b;
 if(/[×*]/.test(m[2]))return a*b;
 return b===0?null:a/b;
}
