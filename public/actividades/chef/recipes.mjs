// Stable recipes: each number always refers to the same base ingredients.
export const RECIPES=[
 {id:1,name:'Esencial',ingredients:['pan','carne']},
 {id:2,name:'Con queso',ingredients:['pan','carne','queso']},
 {id:3,name:'Verde',ingredients:['pan','carne','lechuga']},
 {id:4,name:'Clásica',ingredients:['pan','carne','queso','tomate']},
 {id:5,name:'Casera',ingredients:['pan','carne','huevo','cebolla']},
 {id:6,name:'De la huerta',ingredients:['pan','carne','lechuga','tomate','cebolla']},
 {id:7,name:'Especial',ingredients:['pan','carne','queso','huevo','cebolla']},
 {id:8,name:'Completa',ingredients:['pan','carne','queso','lechuga','tomate','cebolla']},
 {id:9,name:'Doble toque',ingredients:['pan','carne','queso','lechuga','tomate','huevo']},
 {id:10,name:'De la casa',ingredients:['pan','carne','queso','lechuga','tomate','huevo','cebolla']}
];
export const COURSE_PHASES=[{id:1,name:'Aprender las recetas',description:'Recupera los ingredientes aprendidos al inicio de la fase usando solo el número de receta.'},{id:2,name:'Actualizar el pedido',description:'Mantén la receta en mente y adáptala cuando el cliente cambie de idea.'},{id:3,name:'Combinar reglas y cambios',description:'Organiza varios pedidos y conserva las restricciones aunque cambie la receta.'}];
const level=(phase,number,title,maxRecipe,orders,changes,description)=>({phase,level:number,title,maxRecipe,orderSets:orders,changes,description,clients:3});
export const COURSE_LEVELS=[
 level(1,1,'Una receta, una meta',1,[[1],[1],[1]],[],'El cliente pide una receta por número. Prepara sus ingredientes de memoria desde el primer nivel.'),
 level(1,2,'Distingue dos recetas',2,[[1],[2],[2]],[],'Distingue los números de las recetas aprendidas al iniciar la fase, sin pistas de ingredientes.'),
 level(1,3,'Recuerda por el número',2,[[2],[1],[2]],[],'El cliente pide por número. Recupera los ingredientes del recetario que estudiaste.'),
 level(1,4,'Una receta nueva',3,[[3],[2],[1]],[],'Afianza las recetas de tu selección sin ver los ingredientes del pedido.'),
 level(1,5,'Cuatro recetas conocidas',4,[[4],[3],[2]],[],'Cada cliente pide una hamburguesa por número dentro del recetario seleccionado.'),
 level(2,1,'Quita un ingrediente',5,[[5],[4],[2]],['remove'],'Después de empezar, el cliente pide quitar un ingrediente de su hamburguesa.'),
 level(2,2,'Agrega un ingrediente',6,[[6],[5],[4]],['add'],'El cliente añade un ingrediente que no estaba en la receta original.'),
 level(2,3,'Cambio de receta',6,[[6],[4],[2]],['replace'],'El cliente sustituye la receta mientras cocinas. Conserva el plato y ajusta sus ingredientes.'),
 level(2,4,'Dos hamburguesas, un cambio',7,[[7,4],[5,6],[6,2]],['remove'],'Prepara dos hamburguesas y aplica el cambio solo a la que el cliente señala.'),
 level(2,5,'Receta con restricción',7,[[7,6],[4,2],[2,5]],['allergy'],'Integra preferencias vegetarianas, ingredientes que no gustan o alergias. La restricción se aplica a todo el pedido.'),
 level(3,1,'Una regla y otro cambio',8,[[8,6],[7,5],[4,8]],['allergy','remove'],'Conserva la restricción de lácteos y después retira otro ingrediente de la hamburguesa indicada.'),
 level(3,2,'Cambia la base, conserva la regla',9,[[9,6],[8,4],[7,5]],['allergy','replace'],'El cliente comunica una restricción y luego cambia una receta. La restricción sigue vigente.'),
 level(3,3,'Tres pedidos a la vez',10,[[10,8,9],[9,10,7],[8,9,10]],['allergy','remove'],'Recuerda tres recetas y ajusta la hamburguesa correcta sin olvidar la restricción del cliente.'),
 level(3,4,'Tres cambios encadenados',10,[[9,4,8],[10,5,7],[8,3,10]],['allergy','replace','add'],'Integra una alergia, un cambio de receta y un ingrediente adicional. Las restricciones y preferencias varían entre clientes.'),
 level(3,5,'El servicio completo',10,[[10,4,9],[9,7,10],[8,2,10]],['allergy','replace','remove'],'Tres hamburguesas, clientes con más prisa y tres avisos. Conserva las restricciones del cliente al ajustar el pedido.')
];
export function getRecipe(id){const r=RECIPES.find(x=>x.id===Number(id));if(!r)throw new Error('Receta no válida');return r}
export function getCourseLevel(phase,number){const l=COURSE_LEVELS.find(x=>x.phase===Number(phase)&&x.level===Number(number));if(!l)throw new Error('Nivel no válido');return l}
export function levelRecipeIds(level){return Array.from({length:level.maxRecipe},(_,i)=>i+1)}
export function initialRecipeState(ids){if(!ids.length||ids.length>3)throw new Error('Pedido no válido');return {recipeIds:[...ids],orders:ids.map(id=>[...getRecipe(id).ingredients]),banned:[]}}
export function applyRecipeChange(state,change){const next={recipeIds:[...state.recipeIds],orders:state.orders.map(x=>[...x]),banned:[...state.banned]};if(change.kind==='allergy'||change.kind==='restriction'){next.banned=[...new Set([...next.banned,...change.ingredients])];next.orders=next.orders.map(order=>order.filter(id=>!next.banned.includes(id)));return next;}const target=change.target;if(!Number.isInteger(target)||!next.orders[target])throw new Error('Hamburguesa no válida');if(change.kind==='replace'){next.recipeIds[target]=change.recipeId;next.orders[target]=getRecipe(change.recipeId).ingredients.filter(id=>!next.banned.includes(id));}else if(change.kind==='remove'){if(change.ingredient==='pan')throw new Error('El pan está incluido');next.orders[target]=next.orders[target].filter(id=>id!==change.ingredient);}else if(change.kind==='add'){if(next.banned.includes(change.ingredient))throw new Error('El ingrediente contradice la restricción');if(!next.orders[target].includes(change.ingredient))next.orders[target].push(change.ingredient);}else throw new Error('Cambio no válido');return next}
const articles={lechuga:'la lechuga',tomate:'el tomate',huevo:'el huevo',queso:'el queso',cebolla:'la cebolla',carne:'la carne'};
function same(a,b){return [...a].sort().join(',')===[...b].sort().join(',')}
export const CUSTOMER_RESTRICTIONS=[
 {id:'lacteos',kind:'allergy',ingredients:['queso'],message:'Tengo alergia a los lácteos. Adapta todo mi pedido.'},
 {id:'vegetariano',kind:'restriction',ingredients:['carne'],message:'Quiero un pedido vegetariano: sin carne en ninguna hamburguesa.'},
 {id:'cebolla',kind:'restriction',ingredients:['cebolla'],message:'No me gusta la cebolla. No la incluyas en ninguna de mis hamburguesas.'},
 {id:'huevo',kind:'allergy',ingredients:['huevo'],message:'Tengo alergia al huevo. No lo incluyas en mi pedido.'},
 {id:'tomate',kind:'restriction',ingredients:['tomate'],message:'No me gusta el tomate. Prefiero todo mi pedido sin tomate.'},
 {id:'lechuga',kind:'restriction',ingredients:['lechuga'],message:'No quiero lechuga en ninguna de mis hamburguesas.'}
];
function restrictionFor(phase,number,trial,client){
 const row=phase===3&&number===4?[0,3,1]:phase===3&&number===5?[-1,1,4]:number%2===0?[3,1,4]:[0,1,2];
 const id=row[trial];
 const rule=id===-1?{id:'lacteos-huevo',kind:'allergy',ingredients:['queso','huevo'],message:'Tengo alergia a los lácteos y al huevo. Adapta todo mi pedido.'}:CUSTOMER_RESTRICTIONS[id];
 const message=rule.id==='vegetariano'&&client?`Soy ${client.presentation==='feminine'?'vegetariana':'vegetariano'}. No incluyas carne en ninguna de mis hamburguesas.`:rule.message;
 return {...rule,ingredients:[...rule.ingredients],message};
}
export function createRecipeScenario(phase,number,trial=0,selectedIds=null,client=null){
 const spec=getCourseLevel(phase,number);
 if(!Number.isInteger(trial)||trial<0||trial>=spec.clients)throw new Error('Cliente no válido');
 const pool=selectedIds===null?levelRecipeIds(spec):normalizeRecipePool(selectedIds);
 if(!pool.length)throw new Error('Elige al menos una receta.');
 if(spec.changes.includes('replace')&&pool.length<2)throw new Error('Este nivel necesita al menos dos recetas para poder cambiarlas.');
 const initialPool=spec.changes[0]==='add'?pool.filter(id=>getRecipe(id).ingredients.length<7):pool;
 if(!initialPool.length)throw new Error('Elige alguna receta con espacio para agregar un ingrediente; la receta 10 ya los incluye todos.');
 const count=spec.orderSets[trial].length;
 const ids=spec.orderSets[trial].map((id,i)=>initialPool.includes(id)?id:initialPool[(trial*count+i)%initialPool.length]);
 const initial=initialRecipeState(ids);let planned=initial;const events=[];
 for(let i=0;i<spec.changes.length;i++){
  const kind=spec.changes[i];
  const target=kind==='replace'||kind==='add'?(initial.orders.length>1?1:0):trial%initial.orders.length;
  let event={kind,afterActions:(i+1)*2,target};
  const which=initial.orders.length===1?'tu hamburguesa':'la hamburguesa '+(target+1);
  if(kind==='allergy'){
   const restriction=restrictionFor(Number(phase),Number(number),trial,client);
   event={...event,...restriction,restrictionId:restriction.id};
  }else if(kind==='remove'){
   const candidates=['lechuga','cebolla','tomate','queso','huevo','carne'];
   const offset=(trial+Number(number))%candidates.length;
   const ingredient=[...candidates.slice(offset),...candidates.slice(0,offset)].find(id=>planned.orders[target].includes(id));
   if(!ingredient)throw new Error('No hay un ingrediente que retirar');
   event={...event,ingredient,message:`Espera: quita ${articles[ingredient]} de ${which}.`};
  }else if(kind==='add'){
   const ingredient=['queso','huevo','lechuga','cebolla','tomate','carne'].find(id=>!planned.orders[target].includes(id)&&!planned.banned.includes(id));
   if(!ingredient)throw new Error('Elige alguna receta con espacio para agregar un ingrediente; la receta 10 ya los incluye todos.');
   event={...event,ingredient,message:`Una cosa más: añade ${articles[ingredient]} a ${which}.`};
  }else if(kind==='replace'){
   const preferred=phase===2?[3,2,5]:number===2?[9,8,7]:number===4?[8,7,9]:[10,9,8];
   const candidates=selectedIds===null?[preferred[trial],...pool.slice().reverse()]:pool.slice().reverse();
   const needsAdd=spec.changes.slice(i+1).includes('add');
   const recipeId=candidates.find(id=>{const adjusted=getRecipe(id).ingredients.filter(x=>!planned.banned.includes(x));return id!==planned.recipeIds[target]&&!same(adjusted,planned.orders[target])&&(!needsAdd||Object.keys(articles).some(ingredient=>!planned.banned.includes(ingredient)&&!adjusted.includes(ingredient)))});
   if(!recipeId)throw new Error('Elige recetas que sigan siendo diferentes tras aplicar las restricciones; por ejemplo, la 1 y la 3.');
   event={...event,recipeId,message:`Cambié de idea: ${which} será la receta ${recipeId}.`+(planned.banned.length?' Mantén mis restricciones.':'')};
  }
  planned=applyRecipeChange(planned,event);events.push(event);
 }
 return {spec,initial,events,final:planned};
}
export function nextCourseLevel(phase,number){return Number(number)<5?{phase:Number(phase),level:Number(number)+1}:Number(phase)<3?{phase:Number(phase)+1,level:1}:null}

export function normalizeRecipePool(ids){if(!Array.isArray(ids))throw new Error('Recetario no válido');const result=[...new Set(ids.map(Number))].sort((a,b)=>a-b);result.forEach(getRecipe);return result}
export function recipePoolProblem(phase,number,ids){try{for(let trial=0;trial<3;trial++)createRecipeScenario(phase,number,trial,ids);return '';}catch(error){return error.message}}

// Study once when entering a phase; every level uses that phase's learned pool.
export function phaseRecipeIds(phase){const levels=COURSE_LEVELS.filter(x=>x.phase===Number(phase));if(!levels.length)throw new Error('Fase no válida');return Array.from({length:Math.max(...levels.map(x=>x.maxRecipe))},(_,i)=>i+1)}
export function needsPhaseStudy(previous,phase,ids){return !previous||previous.phase!==Number(phase)||normalizeRecipePool(previous.recipes).join(',')!==normalizeRecipePool(ids).join(',')}

export function phaseRecipePoolProblem(phase,ids){
 for(let number=1;number<=5;number++){
  const problem=recipePoolProblem(phase,number,ids);
  if(problem)return 'Este recetario no permite completar el nivel '+number+' de la fase '+phase+'. '+problem;
 }
 return '';
}
