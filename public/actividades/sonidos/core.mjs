export const SOUNDS = {
 bell:{name:'Campana',phrase:'la campana',icon:'🔔'},
 drum:{name:'Tambor',phrase:'el tambor',icon:'🥁'},
 whistle:{name:'Silbido',phrase:'el silbido',icon:'〰'},
 drops:{name:'Gotas',phrase:'las gotas',icon:'💧'},
 horn:{name:'Claxon',phrase:'el claxon',icon:'🚘'},
 dog:{name:'Ladrido',phrase:'el ladrido',icon:'🐶'}
};
export const SOUND_NAMES=Object.fromEntries(Object.entries(SOUNDS).map(([key,value])=>[key,value.name]));
export function shuffle(values,random=Math.random){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
export function makeSequence(count,target='bell',random=Math.random){
 if(!SOUNDS[target])throw new Error('Sonido objetivo no válido');
 const others=Object.keys(SOUNDS).filter(key=>key!==target),half=Math.floor(count/2);
 return [half,count-half].flatMap(n=>{const targets=Math.min(n,Math.max(1,Math.round(n*.25)));const pool=[];while(pool.length<n-targets)pool.push(...shuffle(others,random));return shuffle([...Array(targets).fill(target),...pool.slice(0,n-targets)],random)})
}
export function practiceSequence(target='bell'){if(!SOUNDS[target])throw new Error('Sonido objetivo no válido');const others=Object.keys(SOUNDS).filter(key=>key!==target);return [target,...others.slice(0,3),target,...others.slice(3),target]}
export function summarize(trials,target='bell'){const targets=trials.filter(t=>t.sound===target);return {trials:trials.length,targets:targets.length,hits:targets.filter(t=>t.response!==null).length,omissions:targets.filter(t=>t.response===null).length,falseAlarms:trials.filter(t=>t.sound!==target&&t.response!==null).length,correctRejections:trials.filter(t=>t.sound!==target&&t.response===null).length,repeated:trials.reduce((s,t)=>s+(t.repeated||0),0)}}
export function sessionCsv(blocks,config){
 const rows=[['bloque','registro','ensayo','mitad','sonido','sonido_objetivo','objetivo','respuesta_ms','resultado','pulsaciones_repetidas','fuera_ventana_ensayo','pausas_bloque','fuera_ventana_bloque']];
 const cut=Math.floor(Math.round(config.seconds*1000/config.interval)/2);
 blocks.forEach((b,i)=>{
  if(!b.trials.length)rows.push([i+1,b.partial?'parcial':'completo','','','',SOUND_NAMES[config.target],'','','sin_ensayos_completos',0,0,b.pauses,b.outside]);
  b.trials.forEach(t=>rows.push([i+1,b.partial?'parcial':'completo',t.index+1,t.index<cut?1:2,SOUND_NAMES[t.sound],SOUND_NAMES[config.target],t.sound===config.target?'si':'no',t.response??'',t.sound===config.target?(t.response!==null?'acierto':'omision'):(t.response!==null?'respuesta_incorrecta':'rechazo_correcto'),t.repeated,t.late||0,b.pauses,b.outside]));
 });
 return '\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
