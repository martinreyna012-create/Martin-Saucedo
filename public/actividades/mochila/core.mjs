export const inventory=[['esp','📘','Cuaderno de Español'],['mat','📐','Libro de Matemáticas'],['cien','🔬','Cuaderno de Ciencias'],['lap','✏️','Dos lápices'],['bot','🥤','Botella de agua'],['lon','🥪','Lonchera'],['arte','🎨','Colores'],['pel','⚽','Pelota']];
export const names=ids=>ids.map(id=>inventory.find(x=>x[0]===id)?.[2]||id).join(', ');
export function shuffle(items,random=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const scenarios={
 easy:[[['esp','lap'],'esp','cien','bot'],[['cien','bot'],'cien','arte','pel'],[['mat','lon'],'lon','bot','arte']],
 mid:[[['esp','mat','lap'],'mat','cien','bot'],[['cien','arte','lap'],'arte','esp','pel'],[['mat','bot','lon'],'bot','lap','esp']],
 hard:[[['esp','mat','lap','arte'],'mat','cien','bot'],[['cien','lap','bot','lon'],'lon','arte','pel'],[['esp','cien','arte','bot'],'arte','mat','lon']]
};
export function createMission(level,previousId=null,random=Math.random){
 if(!scenarios[level])throw new Error('Nivel no válido');
 const pool=scenarios[level].map((value,index)=>({value,id:level+'-'+index})).filter(x=>x.id!==previousId);
 const chosen=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
 const [initial,remove,add,exclude]=chosen.value;
 return {id:chosen.id,level,initial:[...initial],remove,add,exclude,final:initial.filter(x=>x!==remove).concat(add),
  rule:'Prepara tu mochila para mañana. Guarda: '+names(initial)+'. Deja fuera: '+names([exclude])+'.',
  change:'Cambió la indicación: saca '+names([remove])+' y guarda '+names([add])+'. Conserva los demás materiales.'};
}
export function evaluateSelection(expected,actual){
 const selected=[...new Set(actual)],wanted=new Set(expected),set=new Set(selected);
 const missing=expected.filter(id=>!set.has(id)),extra=selected.filter(id=>!wanted.has(id));
 return {expected:[...expected],actual:selected,hits:expected.length-missing.length,missing,extra,correct:!missing.length&&!extra.length};
}
export function recordMission(mission,initial,final,{supports=0,pauses=0}={}){
 return {mission,initial:evaluateSelection(mission.initial,initial),final:evaluateSelection(mission.final,final),supports,pauses,removed:!final.includes(mission.remove),added:final.includes(mission.add)};
}
export function missionCsv(records){
 const rows=[['intento','nivel','consigna_inicial','cambio','esperados_iniciales','seleccion_inicial','omisiones_iniciales','intrusiones_iniciales','esperados_finales','seleccion_final','omisiones_finales','intrusiones_finales','retiro_material_cancelado','agrego_material_nuevo','posible_perseveracion_material_cancelado','material_cancelado_presente','regla_exclusion_incumplida_inicio','regla_exclusion_incumplida_final','consultas','pausas','inicio_correcto','final_correcto']];
 records.forEach((r,i)=>rows.push([i+1,r.mission.level,r.mission.rule,r.mission.change,names(r.initial.expected),names(r.initial.actual),names(r.initial.missing),names(r.initial.extra),names(r.final.expected),names(r.final.actual),names(r.final.missing),names(r.final.extra),r.removed?'si':'no',r.added?'si':'no',r.final.actual.includes(r.mission.remove)?1:0,r.final.actual.includes(r.mission.remove)?names([r.mission.remove]):'',r.initial.actual.includes(r.mission.exclude)?'si':'no',r.final.actual.includes(r.mission.exclude)?'si':'no',r.supports,r.pauses,r.initial.correct?'si':'no',r.final.correct?'si':'no']));
 return '\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
