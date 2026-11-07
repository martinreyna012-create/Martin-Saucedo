import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSE_LEVELS,phaseRecipeIds,createRecipeScenario,initialRecipeState,applyRecipeChange} from '../public/actividades/chef/recipes.mjs';
import {customerPatience,createCustomerLine,advanceCustomerLine,resolveCustomer,beginCustomerService,nextInLine} from '../public/actividades/chef/queue.mjs';
import {createAttemptRecord,sessionSummary,sessionRows} from '../public/actividades/chef/records.mjs';
import {MISSIONS,canonicalPlan,validatePlan,calculate} from '../public/actividades/plan/content.mjs';
import {planResponse,chefEvidence} from '../public/feedback-data.mjs';
import {walkingClientArt} from '../public/actividades/chef/art.mjs';

test('chef: las 45 combinaciones conservan sus restricciones al cambiar recetas y permiten más tiempo para cocinar',()=>{
 const restrictions=new Set();
 for(const level of COURSE_LEVELS)for(let trial=0;trial<3;trial++){
  const scenario=createRecipeScenario(level.phase,level.level,trial,phaseRecipeIds(level.phase));
  const p=customerPatience(level.phase,level.level,trial,scenario);
  assert.ok(p.serviceSeconds>=60&&p.serviceSeconds<=120);assert.ok(p.seconds>=90);
  let state=scenario.initial;
  for(const event of scenario.events){state=applyRecipeChange(state,event);if(event.restrictionId)restrictions.add(event.restrictionId);for(const order of state.orders)assert.ok(order.every(id=>!state.banned.includes(id)));}
  assert.deepEqual(state,scenario.final);
 }
 assert.ok(restrictions.has('vegetariano'));assert.ok(restrictions.has('cebolla'));assert.ok(restrictions.has('tomate'));
});
test('chef: vegetariano conserva huevo y queso y prohíbe carne también después de sustituir la receta',()=>{
 const event=createRecipeScenario(2,5,1,null,{presentation:'feminine'}).events[0];assert.match(event.message,/Soy vegetariana/);
 let state=applyRecipeChange(initialRecipeState([10]),event);
 assert.ok(!state.orders[0].includes('carne'));assert.ok(state.orders[0].includes('huevo'));assert.ok(state.orders[0].includes('queso'));
 state=applyRecipeChange(state,{kind:'replace',target:0,recipeId:7});assert.ok(!state.orders[0].includes('carne'));
 assert.throws(()=>applyRecipeChange(state,{kind:'add',target:0,ingredient:'carne'}));
 for(const presentation of ['feminine','masculine'])assert.match(walkingClientArt({presentation,skin:'#fff',hair:'#333',shirt:'#555'}),new RegExp('data-character="'+presentation+'"'));
});
test('chef: la fila da tiempo para terminar un pedido y la pausa conserva todos los presupuestos',()=>{
 const plan=createRecipeScenario(1,1,0,[1]);let line=createCustomerLine(1,1,[{name:'A'},{name:'B'},{name:'C'}],{plans:[plan,plan,plan]});
 line=beginCustomerService(resolveCustomer(line,0,'active'),0);
 const paused={...line,paused:true};assert.deepEqual(advanceCustomerLine(paused,60000).line,paused);
 let result=advanceCustomerLine(line,65000);assert.equal(result.departed.length,0);
 line=resolveCustomer(result.line,0,'served');assert.equal(nextInLine(line).client.name,'B');
 line=beginCustomerService(resolveCustomer(line,1,'active'),1);assert.equal(line.entries[1].remainingMs,line.entries[1].serviceBudgetSeconds*1000);
});
test('chef: el resumen final conserva por separado tres entregas, sus errores y un intento sin terminar',()=>{
 const initial=initialRecipeState([2]);
 const base={client:{name:'Prueba'},orders:initial.orders,initialOrders:initial.orders,drafts:initial.orders,settings:{mode:'recipes'},scenario:{initial},expected:initial,eventLog:[]};
 const first=createAttemptRecord(base,{actual:[['pan','carne','cebolla']]});
 const other=createAttemptRecord(base,{actual:[['pan','carne','queso']]});
 const records=[first,other,other,createAttemptRecord(base,{outcome:'interrupted'})];
 const summary=sessionSummary(records);assert.equal(summary.served,3);assert.equal(summary.correct,2);assert.equal(summary.left,0);assert.equal(summary.interrupted,1);
 assert.equal(chefEvidence(records[0]).omissions,1);assert.equal(chefEvidence(records[0]).intrusions,1);
 const rows=sessionRows(records);assert.ok(rows.slice(1).every(r=>r.length===rows[0].length));assert.equal(rows.length,5);
});
test('plan: los pasos 2 y 5 se retiraron de cada secuencia y los nuevos retos requieren tres cálculos relacionados',()=>{
 const excluded=[['datos','resolver'],['dinero','comprar'],['manos','preparar']];
 MISSIONS.forEach((m,i)=>{
  assert.equal(m.steps.length,4);assert.ok(m.steps.every(s=>!excluded[i].includes(s.id)));assert.equal(m.math.questions.length,3);
  const order=canonicalPlan(m.steps);assert.equal(validatePlan(m.steps,order).valid,true);assert.equal(validatePlan(m.steps,[...order].reverse()).valid,false);
  for(const q of m.math.questions)if(!q.operation)assert.equal(calculate(`${q.a}${q.op}${q.b}`),q.answer);
 });
 assert.equal(calculate('15×3'),45);assert.equal(calculate('60÷3'),20);assert.equal(calculate('3÷0'),null);assert.equal(calculate('1;alert(1)'),null);
});
test('plan: repetir un número en dos preguntas diferentes no se califica como perseveración',()=>{
 const responses=[];
 for(const question of ['cantidad','tiempo','cantidad'])responses.push(planResponse(responses,{step:'operacion',kind:'math',question,value:'5',expected:'15',correct:false}));
 assert.deepEqual(responses.map(r=>r.repeated),[false,false,true]);
});
