import test from 'node:test';
import assert from 'node:assert/strict';
import {ActiveCountdown} from '../public/clock.mjs';
import {createMission,recordMission,missionCsv} from '../public/actividades/mochila/core.mjs';
import {MISSIONS,getSteps,canonicalPlan,validatePlan,calculate} from '../public/actividades/plan/content.mjs';
import {summarize,makeSequence,sessionCsv} from '../public/actividades/sonidos/core.mjs';

test('las pausas no consumen el tiempo que queda para memorizar',()=>{
 let now=0;const c=new ActiveCountdown(15000,()=>now);
 now=4200;assert.equal(c.pause(),10800);now=85000;assert.equal(c.tick(),10800);
 c.resume();now+=800;assert.equal(c.tick(),10000);
 c.pause();now+=20000;c.pause();assert.equal(c.remainingMs,10000);
 c.resume();now+=10000;assert.equal(c.tick(),0);now+=100;assert.equal(c.tick(),0);
});
test('las nueve consignas respetan la carga del nivel y cambian un solo material',()=>{
 for(const [level,n] of [['easy',2],['mid',3],['hard',4]]){
  const ids=new Set();
  for(const value of [0,.5,.999]){
   const m=createMission(level,null,()=>value);ids.add(m.id);
   assert.equal(m.initial.length,n);assert.equal(new Set(m.initial).size,n);
   assert.equal(m.final.length,n);assert.ok(!m.initial.includes(m.add));
   assert.ok(!m.initial.includes(m.exclude));assert.ok(!m.final.includes(m.exclude));
   assert.ok(m.initial.includes(m.remove));assert.ok(!m.final.includes(m.remove));
   assert.ok(m.final.includes(m.add));
   assert.notEqual(createMission(level,m.id,()=>value).id,m.id);
  }
  assert.equal(ids.size,3);
 }
});
test('una intrusión inicial no desaparece aunque se corrija la mochila final',()=>{
 const m=createMission('easy',null,()=>0),r=recordMission(m,[...m.initial,'pel'],m.final,{supports:1,pauses:2});
 assert.equal(r.initial.hits,2);assert.deepEqual(r.initial.extra,['pel']);assert.equal(r.initial.correct,false);assert.equal(r.final.correct,true);
 const csv=missionCsv([r]);assert.match(csv,/intrusiones_iniciales/);assert.match(csv,/Pelota/);assert.match(csv,/"1","2","no","si"/);
});
test('omisiones y objetos extra se conservan por separado en ambos momentos',()=>{
 const m=createMission('mid',null,()=>0),r=recordMission(m,['esp','pel'],['lap','bot']);
 assert.deepEqual(r.initial.missing,['mat','lap']);assert.deepEqual(r.initial.extra,['pel']);
 assert.deepEqual(r.final.missing,['esp','cien']);assert.deepEqual(r.final.extra,['bot']);
 assert.equal(r.removed,true);assert.equal(r.added,false);
});
test('los planes admiten órdenes equivalentes y rechazan dependencias invertidas',()=>{
 for(const m of MISSIONS)for(const count of [4,6]){
  const steps=getSteps(m,count),order=canonicalPlan(steps);assert.equal(validatePlan(steps,order).valid,true);
  assert.equal(validatePlan(steps,[...order].reverse()).valid,false);
  assert.equal(calculate(m.math.a+m.math.op+m.math.b),m.math.answer);
 }
 const steps=getSteps(MISSIONS[0],4);assert.equal(validatePlan(steps,['material','leer','operacion','revisar']).valid,true);
});
test('el bloque auditivo de un minuto registra las seis omisiones sin inventar errores',()=>{
 const sequence=makeSequence(20,'bell',()=>.25);
 const summary=summarize(sequence.map(sound=>({sound,response:null,repeated:0})),'bell');
 assert.equal(summary.trials,20);assert.equal(summary.targets,6);assert.equal(summary.omissions,6);assert.equal(summary.falseAlarms,0);assert.equal(summary.correctRejections,14);
});
test('un bloque detenido antes de completar un ensayo conserva las pausas sin inventar estímulos',()=>{
 const csv=sessionCsv([{trials:[],partial:true,pauses:2,outside:0}],{seconds:60,interval:3000,target:'horn'});
 assert.equal(csv.split('\r\n').length,2);assert.match(csv,/sin_ensayos_completos/);assert.match(csv,/"parcial","","","","Claxon"/);assert.match(csv,/"0","2","0"$/);
});
