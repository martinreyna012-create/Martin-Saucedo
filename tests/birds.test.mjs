import test from 'node:test';
import assert from 'node:assert/strict';
import {colors} from '../public/actividades/aves/art.mjs';
import {levels,fields,settings,createSchedule,flightPosition,recordPress,closeRound,evaluateRound,summarize,feedbackModel,sessionCSV} from '../public/actividades/aves/core.mjs';
import {ActiveCountdown} from '../public/clock.mjs';
import {normalizePlan} from '../public/clinic-domain.mjs';

const config={target:'azul',level:'intermedio',rounds:10,exposureMs:1400,vision:'medio'};
function seeded(seed=42){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};}
function scene(present=true){return {id:'r1',number:1,target:'azul',exposureMs:3000,birds:[{id:present?'blue':'red',color:present?'azul':'rojo',direction:1,lane:0}],responses:[],closed:false,complete:false,elapsedMs:0};}
const press=(r,bird,ms)=>recordPress(r,{sceneId:r.id,birdId:bird,elapsedMs:ms});
test('aves: todas las configuraciones presentan un solo pájaro por vez y 60% de objetivos',()=>{
  for(const c of colors)for(const [level,l] of Object.entries(levels))for(const rounds of [10,20,30]){
    const schedule=createSchedule({...config,target:c.id,level,rounds},{rng:seeded(81)});
    assert.equal(schedule.length,rounds);assert.equal(schedule.filter(r=>r.birds.some(b=>b.color===c.id)).length,rounds*.6);
    assert.equal(new Set(schedule.map(r=>r.id)).size,rounds);
    const palette=new Set(schedule.flatMap(r=>r.birds.map(b=>b.color)));assert.ok(palette.size<=l.palette);
    for(const r of schedule){assert.equal(r.birds.length,1);assert.ok([-1,1].includes(r.birds[0].direction));assert.ok([-1,0,1].includes(r.birds[0].lane));if(level==='inicial')assert.equal(r.birds[0].direction,1);}
  }
  assert.equal(createSchedule(config,{practice:true}).length,6);
  for(const exposureMs of [1000,1400,1800,2400])for(const vision of Object.keys(fields))assert.doesNotThrow(()=>settings({...config,exposureMs,vision}));
  for(const change of [{target:'rosa'},{level:'constructor'},{rounds:6},{exposureMs:0},{exposureMs:5000},{vision:'sin-mascara'}])assert.throws(()=>settings({...config,...change}));
});
test('aves: los errores en un pájaro se conservan al acertar el siguiente; repeticiones aparte',()=>{
  const wrong=scene(false),right=scene();right.id='r2';right.number=2;
  assert.equal(press(wrong,'red',400),'incorrect');assert.equal(press(wrong,'red',600),'repeated');closeRound(wrong,{complete:true});
  assert.equal(press(right,'blue',850),'hit');assert.equal(press(right,'blue',920),'repeated');closeRound(right,{complete:true});
  const d=evaluateRound(right);assert.equal(d.hit,true);assert.equal(d.incorrect,0);assert.equal(d.omission,false);assert.equal(d.rt,850);
  const s=summarize([wrong,right]);assert.equal(s.hits,1);assert.equal(s.incorrect,1);assert.equal(s.repeated,2);
});
test('aves: omisiones y esperas requieren haber completado la exposición',()=>{
  const omitted=scene(),inhibited=scene(false),partial=scene(),partialAbsent=scene(false);
  closeRound(omitted,{complete:true});closeRound(inhibited,{complete:true});closeRound(partial,{complete:false,elapsedMs:1000});closeRound(partialAbsent,{complete:false,elapsedMs:1000});
  assert.equal(evaluateRound(omitted).omission,true);assert.equal(evaluateRound(inhibited).inhibited,true);assert.equal(evaluateRound(partial).omission,false);assert.equal(evaluateRound(partialAbsent).inhibited,false);
  const s=summarize([omitted,inhibited,partial,partialAbsent]);assert.equal(s.complete,2);assert.equal(s.targets,1);assert.equal(s.absent,1);assert.equal(s.omissions,1);assert.equal(s.inhibited,1);assert.equal(s.partial,2);
});
test('aves: una ronda parcial conserva pulsaciones pero no altera proporciones ni promedio de latencia',()=>{
  const partial=scene(false);press(partial,'red',300);closeRound(partial,{complete:false,elapsedMs:800});
  const s=summarize([partial]);assert.equal(s.incorrect,1);assert.equal(s.hits,0);assert.equal(s.targets,0);assert.equal(s.rt,null);
  const model=feedbackModel({config,rounds:[partial],startedAt:'prueba'});assert.equal(model.metrics[0].value,null);assert.match(model.rows[0].finding,/interrumpida/);assert.match(model.rows[0].actual,/Rojo/);assert.match(model.summary,/parcial/);assert.match(model.scope,/Visor reducido/);
});
test('aves: no acepta respuestas vencidas, ajenas o cerradas; 0 ms es una respuesta válida',()=>{
  const r=scene();assert.equal(recordPress(r,{sceneId:'otra',birdId:'blue',elapsedMs:100}),'stale');assert.equal(press(r,'desconocido',100),'unknown');
  for(const ms of [-1,NaN,3000,3100])assert.equal(press(r,'blue',ms),'outside');assert.equal(r.responses.length,0);
  assert.equal(press(r,'blue',0),'hit');closeRound(r,{complete:true});assert.equal(summarize([r]).rt,0);assert.equal(press(r,'red',800),'stale');
});
test('aves: el reloj de exposición y el tiempo de respuesta excluyen las pausas',()=>{
  let now=0;const clock=new ActiveCountdown(3000,()=>now),r=scene();now=500;clock.pause();now=50000;clock.resume();now=50500;
  press(r,'blue',r.exposureMs-clock.tick());closeRound(r,{complete:true});assert.equal(summarize([r]).rt,1000);
});
function csvRows(csv){const rows=[];let row=[],s='',quoted=false;for(let i=0;i<csv.length;i++){const c=csv[i];if(c==='"'){if(quoted&&csv[i+1]==='"'){s+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(s);s='';}else if(c==='\n'&&!quoted){row.push(s.replace(/\r$/,''));rows.push(row);row=[];s='';}else s+=c;}row.push(s.replace(/\r$/,''));rows.push(row);return rows;}
test('aves: CSV completo y vacío conservan columnas, configuración y respuestas parciales',()=>{
  const r=scene(false);press(r,'red',200);press(r,'red',400);closeRound(r,{complete:false,elapsedMs:700});
  const run={id:'demo',config,startedAt:'31/10/2026, 12:00',rounds:[r],pauses:2,outside:1};
  for(const rounds of [[r],[]]){const rows=csvRows(sessionCSV({...run,rounds}));assert.equal(rows[0].length,22);for(const row of rows.slice(1))assert.equal(row.length,22);assert.equal(rows[1][2],'azul');assert.equal(rows[1][20],'medio');}
  const data=csvRows(sessionCSV(run))[1];assert.equal(data[7],'parcial');assert.equal(data[12],'no evaluado');assert.equal(data[13],'1');assert.equal(data[14],'1');assert.equal(data[18],'2');assert.equal(data[19],'1');assert.equal(JSON.parse(data[10]).length,2);assert.match(data[8],/hacia derecha/);
});
test('aves: el vuelo cruza el visor en ambas direcciones y conserva su posición en pausa',()=>{
  for(const direction of [-1,1])for(const lane of [-1,0,1]){
    const bird={direction,lane},positions=[0,.25,.5,.75,1].map(p=>flightPosition(bird,p));
    assert.ok(direction===1?positions[0].x<-.21:positions[0].x>1.21);assert.ok(direction===1?positions.at(-1).x>1.21:positions.at(-1).x<-.21);
    assert.ok(positions.every(p=>p.y>.35&&p.y<.65));
    assert.equal(flightPosition(bird,.25,{reducedMotion:true}).y,.5+lane*.08);
  }
  let now=0;const clock=new ActiveCountdown(1400,()=>now),bird={direction:1,lane:0};now=500;clock.pause();
  const position=flightPosition(bird,1-clock.remainingMs/1400);now=60000;clock.tick();assert.deepEqual(flightPosition(bird,1-clock.remainingMs/1400),position);
  clock.resume();now+=100;clock.tick();assert.ok(flightPosition(bird,1-clock.remainingMs/1400).x>position.x);
});
test('aves: se puede guardar en el plan de sesión del paciente',()=>{
  assert.deepEqual(normalizePlan([{id:'aves',minutes:5}]),[{id:'aves',minutes:5}]);
});

test('aves: todas las velocidades completan entre uno y tres minutos programados sin truncar el último pájaro',()=>{
 for(const durationSeconds of [60,120,180])for(const exposureMs of [1000,1400,1800,2400]){
  const c=settings({target:'azul',level:'avanzado',vision:'medio',durationSeconds,exposureMs});
  const rounds=createSchedule(c,{rng:seeded(12)});
  assert.ok(Math.abs(rounds.reduce((n,r)=>n+r.exposureMs,0)-durationSeconds*1000)<1);
  assert.equal(rounds.length,c.rounds);assert.ok(rounds.every(r=>Math.abs(r.exposureMs-exposureMs)<exposureMs*.02));
  assert.equal(rounds.filter(r=>r.birds[0].color==='azul').length,Math.round(rounds.length*.6));
  assert.equal(createSchedule(c,{practice:true}).length,6);
  const first=rounds[0];closeRound(first,{complete:true});
  const csv=csvRows(sessionCSV({id:'duracion',config:c,rounds:[first],startedAt:'prueba'}));
  assert.equal(csv[1][21],String(durationSeconds));
 }
 for(const durationSeconds of [0,59,179,240,300,NaN])assert.throws(()=>settings({...config,durationSeconds}));
});
