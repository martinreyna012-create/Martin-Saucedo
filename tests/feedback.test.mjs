import test from 'node:test';
import assert from 'node:assert/strict';
import {chefEvidence,chefFeedback,chefSessionFeedback,missionFeedback,soundFeedback,planCheck,planResponse,planEvidence,planFeedback} from '../public/feedback-data.mjs';
import {createAttemptRecord,sessionCsv as chefCsv} from '../public/actividades/chef/records.mjs';
import {initialRecipeState,applyRecipeChange} from '../public/actividades/chef/recipes.mjs';
import {createMission,recordMission,missionCsv} from '../public/actividades/mochila/core.mjs';
import {sessionCsv as soundCsv} from '../public/actividades/sonidos/core.mjs';
import {MISSIONS,getSteps,validatePlan,canonicalPlan} from '../public/actividades/plan/content.mjs';
import {feedbackText} from '../public/feedback.mjs';
const value=(m,label)=>m.metrics.find(x=>x.label===label)?.value;
function chefRound(events=[]){let expected=initialRecipeState([2]);for(const e of events)expected=applyRecipeChange(expected,e);return {client:{name:'Cliente ficticio'},orders:expected.orders,initialOrders:initialRecipeState([2]).orders,drafts:[],settings:{mode:'recipes',prep:'digital',coursePhase:2,courseLevel:1},scenario:{initial:initialRecipeState([2])},expected,eventLog:events,events,supports:0,bookConsults:0};}
test('Chef conserva omisiones e intrusiones y reconoce el ingrediente anterior tras el cambio',()=>{
 const round=chefRound([{kind:'remove',target:0,ingredient:'queso',message:'Quita el queso'}]);const r=createAttemptRecord(round,{actual:[['pan','queso','cebolla']]});
 const s=chefEvidence(r);assert.equal(s.omissions,1);assert.equal(s.intrusions,2);assert.equal(s.persistent,1);assert.equal(s.restricted,0);
 const f=chefFeedback(r);assert.match(f.rows[0].finding,/Carne/);assert.match(f.rows[0].finding,/Queso/);assert.equal(value(f,'Posibles perseveraciones'),1);
 // El registro es una instantánea y no cambia al modificar el pedido activo.
 round.orders[0].push('huevo');assert.deepEqual(r.requested,[['pan','carne']]);
});
test('Chef aplica solo avisos conocidos y separa persistencia, restricción y falta de evaluación',()=>{
 const round=chefRound([{kind:'allergy',ingredients:['queso'],message:'Sin lácteos'}]);const r=createAttemptRecord(round,{actual:[['pan','carne','queso']]});
 assert.equal(chefEvidence(r).restricted,1);assert.equal(chefEvidence(r).persistent,1);assert.equal(chefEvidence(r).intrusions,1);
 const before=chefRound();before.events=[{kind:'allergy',ingredients:['queso']}];const known=createAttemptRecord(before,{actual:[['pan','carne','queso']]});assert.equal(chefEvidence(known).restricted,0);assert.equal(chefEvidence(known).correct,1);
 const absent=createAttemptRecord(before,{actual:null,outcome:'left_waiting'});assert.equal(value(chefFeedback(absent),'Omisiones'),null);assert.equal(value(chefFeedback(absent),'Hamburguesas correctas'),null);
 const total=chefSessionFeedback([r,absent]);assert.equal(value(total,'Omisiones'),0);assert.equal(value(total,'Intrusiones'),1);assert.equal(value(chefSessionFeedback([]),'Preparaciones correctas'),null);
});
test('Mochila muestra todos los aciertos y las intrusiones aunque se mantenga el material cancelado',()=>{
 const m=createMission('easy',null,()=>0),r=recordMission(m,[...m.initial,m.exclude],[...m.initial,m.add],{supports:1,pauses:2}),f=missionFeedback(r);
 assert.equal(value(f,'Aciertos al inicio'),'2 / 2');assert.equal(value(f,'Aciertos al final'),'2 / 2');assert.equal(value(f,'Omisiones'),0);assert.equal(value(f,'Intrusiones'),2);assert.equal(value(f,'Posibles perseveraciones'),1);assert.equal(f.rows.at(-1).finding,'1 de 2 cambios aplicados');
 const corrected=missionFeedback(recordMission(m,[...m.initial,m.exclude],m.final));assert.equal(value(corrected,'Intrusiones'),1);assert.equal(value(corrected,'Posibles perseveraciones'),0);
});
test('Sonidos separa comisiones, omisiones, repetición motora y respuestas tardías',()=>{
 const blocks=[{trials:[{index:0,sound:'bell',response:null,repeated:0,late:1},{index:1,sound:'dog',response:0,repeated:2,late:0},{index:2,sound:'bell',response:250,repeated:0,late:0},{index:3,sound:'horn',response:null,repeated:0,late:0}],pauses:1,outside:1}];
 const f=soundFeedback(blocks,{target:'bell'});assert.equal(value(f,'Aciertos'),'1 / 2');assert.equal(value(f,'Omisiones'),1);assert.equal(value(f,'Errores de comisión'),1);assert.equal(value(f,'Respuestas repetidas'),2);assert.equal(value(f,'Fuera de ventana'),1);assert.equal(f.rows.length,2);assert.match(f.rows[0].finding,/Omisión/);assert.match(f.rows[1].actual,/0 ms/);
 const empty=soundFeedback([{trials:[],pauses:2,outside:0,partial:true}],{target:'bell'});assert.equal(value(empty,'Aciertos'),null);assert.equal(value(empty,'Omisiones'),null);assert.match(empty.summary,/antes de completar/);
});
test('Plan cuenta los errores observados por revisión y las repeticiones después de la retroalimentación',()=>{
 const steps=getSteps(MISSIONS[0],4),order=[...canonicalPlan(steps)].reverse();const a=planCheck(steps,order,'0',validatePlan(steps,order));const b=planCheck(steps,order,'0',validatePlan(steps,order),a);
 assert.ok(a.issues.length);assert.ok(a.issues.every(i=>!i.repeated));assert.ok(b.issues.every(i=>i.repeated));
 const responses=[];for(const [value,correct] of [['14',false],['14',false],['12',true],['12',true]])responses.push(planResponse(responses,{step:'resolver',kind:'math',value,expected:'12',correct}));
 assert.deepEqual(responses.map(r=>r.repeated),[false,true,false,false]);
 const r={title:'Tarea',steps:4,reviews:3,planHelps:0,mathHelps:1,planChecks:[a,b],responses};const s=planEvidence(r);assert.equal(s.math,2);assert.equal(s.repeatedResponse,1);assert.equal(s.repeatedPlan,a.issues.length);assert.ok(value(planFeedback(r,steps),'Posibles perseveraciones')>1);
 assert.match(feedbackText(planFeedback(r,steps)),/Se observó: 14/);
});
test('Plan admite órdenes equivalentes y distingue omisión de una meta incorrecta',()=>{
 const steps=getSteps(MISSIONS[0],4),order=['material','leer','operacion','revisar'];const good=planCheck(steps,order,'0',validatePlan(steps,order));assert.equal(good.issues.length,0);
 const missing=planCheck(steps,[],'',validatePlan(steps,[]));assert.equal(missing.issues.filter(i=>i.kind==='omission').length,5);const stillMissing=planCheck(steps,[],'',validatePlan(steps,[]),missing);assert.ok(stillMissing.issues.every(i=>!i.repeated));
 const wrong=planCheck(steps,order,'1',validatePlan(steps,order),null,MISSIONS[0].goals);assert.equal(wrong.issues[0].actual,MISSIONS[0].goals[1]);assert.equal(wrong.issues[0].kind,'goal');
});
function parseCsv(text){return text.replace(/^\ufeff/,'').split('\r\n').map(row=>[...row.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"')));}
test('los CSV conservan las categorías nuevas y una columna por cada dato',()=>{
 const m=createMission('easy',null,()=>0),mission=parseCsv(missionCsv([recordMission(m,m.initial,m.initial)]));assert.equal(mission[0].length,mission[1].length);assert.equal(mission[1][mission[0].indexOf('posible_perseveracion_material_cancelado')],'1');
 const chef=parseCsv(chefCsv([createAttemptRecord(chefRound([{kind:'remove',target:0,ingredient:'queso'}]),{actual:[['pan','carne','queso']]}),createAttemptRecord(chefRound(),{actual:null,outcome:'left_waiting'})]));for(const row of chef.slice(1))assert.equal(row.length,chef[0].length);assert.equal(chef[1][chef[0].indexOf('posibles_perseveraciones')],'1');assert.equal(chef[2][chef[0].indexOf('omisiones_finales')],'no_evaluado');
 const sounds=parseCsv(soundCsv([{trials:[{index:0,sound:'bell',response:null,repeated:0,late:2}],pauses:0,outside:2,partial:true}],{target:'bell',seconds:60,interval:3000}));assert.equal(sounds[0].length,sounds[1].length);assert.equal(sounds[1][sounds[0].indexOf('fuera_ventana_ensayo')],'2');
});
