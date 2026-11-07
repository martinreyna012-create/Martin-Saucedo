import {colors} from './art.mjs';

export const levels={
  inicial:{name:'Inicial',palette:3},
  intermedio:{name:'Intermedio',palette:4},
  avanzado:{name:'Avanzado',palette:6}
};
export const fields={amplio:{name:'Amplio',size:320},medio:{name:'Reducido',size:260},estrecho:{name:'Muy reducido',size:204}};
export function settings(raw){
  const durationSeconds=raw.durationSeconds==null?null:Number(raw.durationSeconds);
  const s={target:raw.target,level:raw.level,rounds:Number(raw.rounds),exposureMs:Number(raw.exposureMs),vision:raw.vision??'medio',durationSeconds};
  if(!colors.some(c=>c.id===s.target)||!Object.hasOwn(levels,s.level)||!Object.hasOwn(fields,s.vision)||![1000,1400,1800,2400].includes(s.exposureMs)||(durationSeconds===null?![10,20,30].includes(s.rounds):![60,120,180].includes(durationSeconds)))throw new Error('Revisa el color, nivel, duración, velocidad y campo de visión.');
  if(durationSeconds!==null)s.rounds=Math.round(durationSeconds*1000/s.exposureMs);
  return s;
}
function shuffle(values,rng){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createSchedule(config,{practice=false,rng=Math.random}={}){
  const s=settings(config),n=practice?6:s.rounds,level=levels[s.level];
  const exposureMs=!practice&&s.durationSeconds?s.durationSeconds*1000/n:s.exposureMs;
  const distractors=shuffle(colors.map(c=>c.id).filter(c=>c!==s.target),rng).slice(0,level.palette-1);
  const presence=shuffle(Array.from({length:n},(_,i)=>i<Math.round(n*.6)),rng);
  return presence.map((present,i)=>{
    const color=present?s.target:distractors[Math.floor(rng()*distractors.length)];
    const direction=s.level==='inicial'||rng()<.5?1:-1;
    const lane=Math.floor(rng()*3)-1;
    return {id:`r${i+1}`,number:i+1,target:s.target,exposureMs,birds:[{id:`r${i+1}b0`,color,direction,lane}],responses:[],closed:false,complete:false,elapsedMs:0};
  });
}
// The path and the response window share an active clock, so both freeze on pause.
export function flightPosition(bird,progress,{reducedMotion=false}={}){
  const p=Math.min(1,Math.max(0,progress));
  // Enter and leave fully beyond the lens. The next bird never replaces a
  // half-visible bird at the edge; the horizontal speed remains constant.
  const x=-.24+1.48*p;
  return {x:bird.direction===-1?1-x:x,y:.5+(bird.lane||0)*.08+(reducedMotion?0:Math.sin(p*Math.PI*2)*.018)};
}
export function recordPress(round,{sceneId,birdId,elapsedMs}){
  if(round.closed||sceneId!==round.id)return 'stale';
  const bird=round.birds.find(b=>b.id===birdId);
  if(!bird)return 'unknown';
  if(!Number.isFinite(elapsedMs)||elapsedMs<0||elapsedMs>=round.exposureMs)return 'outside';
  const repeated=round.responses.some(r=>r.birdId===birdId);
  round.responses.push({birdId,color:bird.color,ms:Math.round(elapsedMs),repeated});
  return repeated?'repeated':bird.color===round.target?'hit':'incorrect';
}
export function closeRound(round,{complete,elapsedMs}){
  if(round.closed)return;
  round.closed=true;round.complete=!!complete;round.elapsedMs=complete?round.exposureMs:Math.min(round.exposureMs,Math.max(0,elapsedMs||0));
}
export function evaluateRound(round){
  const hasTarget=round.birds.some(b=>b.color===round.target),firstTarget=round.responses.find(r=>r.color===round.target);
  const incorrect=round.responses.filter(r=>r.color!==round.target&&!r.repeated).length;
  const repeated=round.responses.filter(r=>r.repeated).length;
  return {hasTarget,hit:!!firstTarget,omission:round.closed&&round.complete&&hasTarget&&!firstTarget,incorrect,repeated,inhibited:round.closed&&round.complete&&!hasTarget&&round.responses.length===0,rt:firstTarget?.ms??null};
}
export function summarize(rounds){
  const closed=rounds.filter(r=>r.closed),complete=closed.filter(r=>r.complete),details=closed.map(r=>({round:r,...evaluateRound(r)}));
  const eligible=details.filter(d=>d.round.complete),rts=eligible.filter(d=>d.hit).map(d=>d.rt);
  return {closed:closed.length,complete:complete.length,partial:closed.length-complete.length,
    targets:eligible.filter(d=>d.hasTarget).length,hits:eligible.filter(d=>d.hit).length,
    omissions:eligible.filter(d=>d.omission).length,incorrect:details.reduce((s,d)=>s+d.incorrect,0),
    repeated:details.reduce((s,d)=>s+d.repeated,0),inhibited:eligible.filter(d=>d.inhibited).length,
    absent:eligible.filter(d=>!d.hasTarget).length,rt:rts.length?Math.round(rts.reduce((s,n)=>s+n,0)/rts.length):null,details};
}
const name=id=>colors.find(c=>c.id===id)?.name||id;
export function feedbackModel(session){
  const s=summarize(session.rounds),c=session.config;
  const summary=`Se completaron ${s.complete} de ${c.rounds} rondas. ${s.targets?`Se seleccionó el color objetivo en ${s.hits} de ${s.targets} oportunidades. Omisiones: ${s.omissions}.`:'Aún no hay rondas completas con el color objetivo.'} Selecciones de otros colores: ${s.incorrect}. Selecciones repetidas: ${s.repeated}.${s.partial?' La última ronda quedó parcial.':''}`;
  return {
    title:'Vuelo de colores · respuestas',
    scope:`Color: ${name(c.target)} · Nivel ${levels[c.level].name.toLowerCase()} · ${c.durationSeconds?`${c.durationSeconds/60} min programados · `:''}${(s.details.reduce((n,d)=>n+d.round.elapsedMs,0)/1000).toFixed(1)} s activos observados · Vuelo ${c.exposureMs/1000} s aprox. · Visor ${fields[c.vision||'medio'].name.toLowerCase()} · ${session.startedAt}`,
    summary,
    metrics:[
      {label:'Aciertos',value:s.targets?`${s.hits} / ${s.targets}`:null,detail:'Primera selección del color objetivo dentro de la exposición. Proporción calculada solo en rondas completas.',tone:'good'},
      {label:'Omisiones',value:s.complete?s.omissions:null,detail:'Rondas completas con el color objetivo en las que no se seleccionó ese pájaro.',tone:s.omissions?'attention':'neutral'},
      {label:'Selecciones incorrectas',value:s.closed?s.incorrect:null,detail:'Primera selección de cada pájaro de otro color. Incluye respuestas observadas en rondas parciales; no desaparece al acertar después.',tone:s.incorrect?'attention':'neutral'},
      {label:'Selecciones repetidas',value:s.closed?s.repeated:null,detail:'Pulsaciones adicionales sobre el mismo pájaro de una ronda, sea correcto o incorrecto. Se cuentan aparte y no equivalen por sí solas a perseveraciones clínicas.',tone:s.repeated?'attention':'neutral'},
      {label:'Esperas correctas',value:s.absent?`${s.inhibited} / ${s.absent}`:null,detail:'Rondas completas sin el color objetivo en las que no se pulsó ningún pájaro.',tone:'good'},
      {label:'Tiempo de respuesta',value:s.rt===null?null:`${s.rt} ms`,detail:'Promedio hasta la primera selección del objetivo en rondas completas con acierto. Excluye el tiempo en pausa.',tone:'info'}
    ],
    rows:s.details.map(d=>({
      moment:`Pájaro ${d.round.number}${d.round.complete?'':' · parcial'}`,
      expected:d.hasTarget?`Seleccionar ${name(c.target).toLowerCase()}.`:'Esperar sin seleccionar: no apareció el color objetivo.',
      actual:d.round.responses.length?d.round.responses.map(r=>`${name(r.color)}${r.repeated?' (repetido)':''} · ${r.ms} ms`).join('\n'):'Sin selección.',
      finding:[!d.round.complete?'Ronda interrumpida: no se califican omisiones ni esperas.':d.omission?'No seleccionó el objetivo.':d.hit?'Seleccionó el objetivo.':d.inhibited?'Esperó sin seleccionar.':'Seleccionó otro color.',d.incorrect?`${d.incorrect} selección(es) incorrecta(s).`:'',d.repeated?`${d.repeated} repetida(s).`:''].filter(Boolean).join(' '),
      error:!!(d.omission||d.incorrect||d.repeated)
    })),
    empty:'No se alcanzó a presentar una ronda.',
    notes:[`Pausas: ${session.pauses||0}. Pulsaciones detectadas al terminar la ventana: ${session.outside||0}; se excluyen de aciertos y errores.`,
      'La práctica se registra por separado y no se incluye en estos resultados. Una ronda parcial conserva las pulsaciones observadas, pero no entra en las proporciones de aciertos o esperas.',
      'Los pájaros pasan uno por uno, sin pausas entre ellos. El 60% es del color objetivo. La respuesta se hace tocando el visor o pulsando espacio mientras el pájaro está pasando; el tamaño del visor y la velocidad quedan registrados.',
      'El color objetivo se elige antes de comenzar; durante el vuelo se muestra únicamente la animación. Las plumas del color del pájaro seleccionado confirman la pulsación, sin indicar si fue correcta. Las pausas no consumen la duración programada. Este registro describe la actividad y requiere interpretación del terapeuta; no establece un diagnóstico.']
  };
}
const cell=value=>`"${String(value??'').replaceAll('"','""')}"`;
export function sessionCSV(session){
  const headers=['sesion','inicio','objetivo','nivel','rondas_programadas','exposicion_ms','ronda','estado','pajaro_color_direccion_altura','objetivo_presente','respuestas_json','acierto_observado','omision','incorrectas','repetidas','espera_correcta','tiempo_respuesta_ms','exposicion_activa_ms','pausas_sesion','fuera_ventana_sesion','campo_vision','duracion_programada_segundos'];
  const base=[session.id,session.startedAt,session.config.target,session.config.level,session.config.rounds,session.config.exposureMs];
  const rows=session.rounds.filter(r=>r.closed).map(r=>{const d=evaluateRound(r);return [...base,r.number,r.complete?'completa':'parcial',r.birds.map(b=>`${b.color} | ${b.direction===-1?'hacia izquierda':'hacia derecha'} | altura ${b.lane??0}`).join(' / '),d.hasTarget,JSON.stringify(r.responses),d.hit,r.complete?d.omission:'no evaluado',d.incorrect,d.repeated,r.complete?d.inhibited:'no evaluado',d.rt,r.elapsedMs,session.pauses||0,session.outside||0,session.config.vision||'medio'];});
  if(!rows.length)rows.push([...base,'','sin rondas','','','','','','','','','','',session.pauses||0,session.outside||0,session.config.vision||'medio']);
  for(const row of rows)row.push(session.config.durationSeconds??'');
  return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
