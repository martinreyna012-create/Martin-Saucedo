// Queue patience and preparation allowance are separate: waiting never erases
// the time needed to make a newly accepted order. All counters stay internal.
const serviceTime=n=>Math.max(60,Math.min(120,Math.round(n)));
export function customerPatience(phase,level,index,plan=null,prep='digital'){
 const hurry=Math.max(0,Number(phase)-1)+Math.floor((Number(level)-1)/2);
 const orders=plan?.initial.orders||[['pan','carne']];
 const fillings=Math.max(orders.reduce((n,o)=>n+o.length-1,0),(plan?.final.orders||orders).reduce((n,o)=>n+o.length-1,0));
 const work=fillings+2*(orders.length-1)+2*(plan?.events.length||0);
 const seconds=Math.max(90,Math.min(300,120+60*index-6*hurry+(prep==='physical'?25*index:0)));
 const serviceSeconds=serviceTime(60+3*work+(Number(phase)===1?10:0)+(prep==='physical'?25:0)-3*hurry+3*index);
 return {seconds,serviceSeconds,urgency:hurry>=3?'Tengo algo de prisa':'Puedo esperar mi turno'};
}
export function createCustomerLine(phase,level,clients,{plans=[],prep='digital'}={}){
 if(clients.length!==3)throw new Error('La fila necesita tres clientes');
 return {started:false,paused:false,entries:clients.map((client,index)=>{
  const rush=customerPatience(phase,level,index,plans[index],prep);
  return {index,client,...rush,waitBudgetSeconds:rush.seconds,serviceBudgetSeconds:rush.serviceSeconds,remainingMs:rush.seconds*1000,waitMs:0,queueWaitMs:0,serviceMs:0,serviceStarted:false,status:'waiting'};
 })};
}
export function advanceCustomerLine(line,deltaMs){
 if(!Number.isFinite(deltaMs)||deltaMs<0)throw new Error('Tiempo no válido');
 if(!line.started||line.paused)return {line,departed:[]};
 const departed=[];
 const entries=line.entries.map(entry=>{
  if(!['waiting','active'].includes(entry.status)||entry.status==='active'&&!entry.serviceStarted)return entry;
  const spent=Math.min(deltaMs,entry.remainingMs),remainingMs=Math.max(0,entry.remainingMs-deltaMs);
  const next={...entry,remainingMs,waitMs:entry.waitMs+spent,queueWaitMs:entry.queueWaitMs+(entry.status==='waiting'?spent:0),serviceMs:entry.serviceMs+(entry.status==='active'?spent:0),status:remainingMs===0?'left':entry.status};
  if(next.status==='left')departed.push(next);return next;
 });
 return {line:{...line,entries},departed};
}
export function nextInLine(line){return line.entries.find(x=>x.status==='waiting')||null}
export function resolveCustomer(line,index,status){
 if(!['active','served'].includes(status))throw new Error('Estado no válido');
 return {...line,entries:line.entries.map(entry=>{
  if(entry.index!==index||['served','left'].includes(entry.status))return entry;
  if(status==='active'&&entry.status==='waiting')return {...entry,status,seconds:entry.serviceBudgetSeconds,remainingMs:entry.serviceBudgetSeconds*1000,serviceStarted:false};
  return {...entry,status};
 })};
}
export function beginCustomerService(line,index){return {...line,started:true,entries:line.entries.map(entry=>entry.index===index&&entry.status==='active'?{...entry,serviceStarted:true}:entry)}}
export function lineFinished(line){return line.entries.every(x=>['served','left'].includes(x.status))}
export function customerMood(entry){
 if(entry.status==='served')return {key:'calm',label:'Pedido entregado'};
 if(entry.status==='left')return {key:'upset',label:'Se retiró'};
 const waitPressure=entry.status==='active'?Math.min(1,(entry.queueWaitMs||0)/((entry.waitBudgetSeconds||entry.seconds)*1000))*.4:0;
 const fraction=Math.max(0,Math.min(1,entry.remainingMs/(entry.seconds*1000)))*(1-waitPressure);
 if(fraction>.65)return {key:'calm',label:'En calma'};
 if(fraction>.35)return {key:'restless',label:'Se inquieta'};
 if(fraction>.15)return {key:'impatient',label:'Impaciente'};
 return {key:'upset',label:'Muy impaciente'};
}
