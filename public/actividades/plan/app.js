import {renderFeedback} from '../../feedback.mjs';
import {planCheck,planResponse,planFeedback,planEvidence} from '../../feedback-data.mjs';
import {downloadText} from '../../downloads.mjs';
import {createActivityFocus} from '../../activity-focus.mjs';
import {MISSIONS,getSteps,validatePlan,canonicalPlan,calculate} from './content.mjs';
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS={notebook:'<rect x="10" y="7" width="34" height="43" rx="4" fill="#e5eacb" stroke="#547246" stroke-width="2"/><path d="M18 7v43M23 19h14m-14 8h14m-14 8h9M7 17h7M7 28h7M7 39h7" stroke="#6d885a" stroke-width="2" stroke-linecap="round"/><path d="m37 44 10-16 5 3-10 16-6 3Z" fill="#d9b761" stroke="#6d7049" stroke-width="1.5"/>',bag:'<path d="m13 19-4 31h42l-4-31Z" fill="#e6d8b6" stroke="#6d7852" stroke-width="2"/><path d="M22 22V15a8 8 0 0 1 16 0v7" fill="none" stroke="#6d7852" stroke-width="2"/><path d="M20 35h20m-16 6h12" stroke="#9c9b6a" stroke-width="2" stroke-linecap="round"/>',lunch:'<rect x="7" y="23" width="46" height="27" rx="7" fill="#d9e7ce" stroke="#547246" stroke-width="2"/><path d="M24 22v-5q6-5 12 0v5M8 33h44" fill="none" stroke="#547246" stroke-width="2"/><path d="M17 20 31 7l14 13Z" fill="#e8c58a" stroke="#8e8060" stroke-width="1.5"/><path d="m20 19 11-9 10 9" fill="#f4e9c4"/><path d="M27 35h7v6h-7Z" fill="#91ad76"/>'};
const icon=id=>'<svg class="icon" viewBox="0 0 60 60" aria-hidden="true">'+ICONS[id]+'</svg>';
let selected=MISSIONS[0],state=null,history=[],calcExpression='';
const screenNames=['home','planning','doing','summary'];
let screen='home';
const focus=createActivityFocus({activity:'plan',activeScreens:['planning','doing'],onPause:pausePlan});
function show(id){screen=id;focus.screen(id);for(const name of screenNames)$(name).classList.toggle('hidden',name!==id);window.scrollTo({top:0,behavior:'instant'});}
function missionCards(){$('missions').innerHTML=MISSIONS.map(m=>`<button type="button" class="mission-card" data-mission="${m.id}" aria-pressed="${selected.id===m.id}">${icon(m.icon)}<span class="selection-indicator" aria-hidden="true">✓</span><small>${m.tag}</small><h3>${m.title}</h3><p>${m.short}</p></button>`).join('');}
$('missions').onclick=e=>{const button=e.target.closest('[data-mission]');if(!button)return;selected=MISSIONS.find(m=>m.id===button.dataset.mission);missionCards();};
missionCards();
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function brief(m){return `${icon(m.icon)}<span class="eyebrow">${m.tag} / LA SITUACIÓN</span><h2>${m.title}</h2><p>${m.situation}</p><dl class="facts">${m.facts.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;}
function begin(){const count=4;const steps=getSteps(selected,count);state={mission:selected,steps,count,bank:shuffle(steps),order:[],goal:'',reviewed:false,reviews:0,planHelps:0,mathHelps:0,mathCorrections:0,actionCorrections:0,planIssues:0,usedExample:false,firstPlan:null,planChecks:[],responses:[],index:0,ready:false,helpKeys:new Set(),showOperation:$('showOperation').checked,allowCalc:$('allowCalc').checked,reflections:[]};$('planBrief').innerHTML=brief(selected);$('goalSelect').innerHTML='<option value="">Elige qué necesitas lograr</option>'+shuffle(selected.goals.map((g,i)=>({g,i}))).map(({g,i})=>`<option value="${i}">${g}</option>`).join('');$('supportSelect').selectedIndex=0;$('supportSelect').options[2].disabled=!state.allowCalc;renderPlan();show('planning');}
$('startBtn').onclick=begin;
function invalidate() {state.reviewed=false;$('executeBtn').disabled=true;$('launchNote').textContent='Primero revisa tu secuencia.';$('planFeedback').classList.add('hidden');}
function renderPlan(){invalidate();const bank=state.bank.filter(s=>!state.order.includes(s.id));$('bankCount').textContent=bank.length?bank.length:'';$('planCount').textContent=state.order.length+' / '+state.steps.length;$('actionBank').innerHTML=bank.length?bank.map(s=>`<article class="action"><div class="action-content"><strong>${s.title}</strong><p>${s.detail}</p></div><button class="add-action" data-add="${s.id}" aria-label="Agregar: ${s.title}">+</button></article>`).join(''):'<div class="empty">Ya agregaste todas las acciones.<br>Ahora revisa el orden.</div>';$('planList').innerHTML=state.order.length?state.order.map((id,i)=>{const s=state.steps.find(x=>x.id===id);return `<li class="action"><span class="step-number">${i+1}</span><div class="action-content"><strong>${s.title}</strong><p>${s.detail}</p></div><div class="action-controls"><button data-up="${id}" ${i===0?'disabled':''} aria-label="Subir: ${s.title}">↑</button><button data-down="${id}" ${i===state.order.length-1?'disabled':''} aria-label="Bajar: ${s.title}">↓</button><button data-remove="${id}" aria-label="Quitar: ${s.title}">×</button></div></li>`;}).join(''):'<li class="empty">Tu plan empieza aquí.<br>Elige qué harías primero.</li>';}
$('actionBank').onclick=e=>{const b=e.target.closest('[data-add]');if(!b||state.order.includes(b.dataset.add))return;state.order.push(b.dataset.add);renderPlan();};
$('planList').onclick=e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.up||b.dataset.down||b.dataset.remove;const i=state.order.indexOf(id);if(i<0)return;if(b.dataset.remove)state.order.splice(i,1);else{const j=i+(b.dataset.up?-1:1);if(j<0||j>=state.order.length)return;[state.order[i],state.order[j]]=[state.order[j],state.order[i]];}renderPlan();};
$('goalSelect').onchange=()=>{state.goal=$('goalSelect').value;invalidate();};
function notify(text,good=false){$('planFeedback').className='notice'+(good?' good':'');$('planFeedback').innerHTML=text;}
function planProblems(){const result=validatePlan(state.steps,state.order);const messages=[];const title=id=>state.steps.find(s=>s.id===id)?.title||id;if(state.goal!=='0')messages.push('Vuelve a la situación y elige la meta que necesitas lograr.');if(result.missing.length)messages.push('Te falta agregar: '+result.missing.map(s=>s.title).join('; ')+'.');for(const v of result.violations)messages.push('«'+title(v.before)+'» necesita ir antes de «'+title(v.after)+'».');return {result,messages};}
$('reviewPlan').onclick=()=>{state.reviews++;if(state.firstPlan===null)state.firstPlan=[...state.order];const {result,messages}=planProblems();state.planChecks.push(planCheck(state.steps,state.order,state.goal,result,state.planChecks.at(-1),state.mission.goals));state.planIssues+=messages.length;if(!result.valid||state.goal!=='0'){state.reviewed=false;$('executeBtn').disabled=true;notify('<strong>Haz una pausa y ajusta tu plan.</strong><ul>'+messages.map(m=>'<li>'+escapeHTML(m)+'</li>').join('')+'</ul>');return;}state.reviewed=true;$('executeBtn').disabled=false;$('launchNote').textContent='La secuencia está revisada. Puedes empezar.';notify('<strong>Tu plan se puede llevar a cabo.</strong><p>Los pasos independientes pueden cambiar de lugar. Tu orden respetó lo que necesitaba ir primero.</p>',true);};
$('hintBtn').onclick=()=>{state.planHelps++;const {messages}=planProblems();notify('<strong>Una pista:</strong> '+escapeHTML(messages[0]||'Explica qué necesita estar listo antes de cada acción. Después revisa la secuencia.'));};
$('exampleBtn').onclick=()=>{state.planHelps++;state.usedExample=true;state.order=canonicalPlan(state.steps);state.goal='0';$('goalSelect').value='0';renderPlan();notify('<strong>Este es un ejemplo posible.</strong> Léelo y explica por qué funciona. Puedes mover los pasos independientes; después pulsa «Revisar mi plan».');};
$('changeMission').onclick=()=>$('leavePlan').showModal();$('exitDoing').onclick=()=>$('leavePlan').showModal();$('keepPlan').onclick=()=>$('leavePlan').close();$('discardPlan').onclick=()=>{$('leavePlan').close();show('home');};
$('executeBtn').onclick=()=>{if(!state.reviewed||state.goal!=='0'||!validatePlan(state.steps,state.order).valid)return;state.support=$('supportSelect').value;state.index=0;$('doingBrief').innerHTML=brief(state.mission);renderTask();show('doing');};
function noteResponse(kind,value,expected,correct,aided=false,question='',prompt=''){state.responses.push(planResponse(state.responses,{step:state.current.id,kind,value,expected,correct,aided,question,prompt}));}
function setReady(ready){state.ready=ready;const next=$('taskNext');if(next)next.disabled=!ready;}
function stepMessage(message,good=false){$('stepResult').textContent=message;$('stepResult').className='step-result'+(good?' good':'');}
function helpOnce(kind){const key=state.index+':'+kind;if(!state.helpKeys.has(key)){state.helpKeys.add(key);state.mathHelps++;}}
function renderTask(){
 state.ready=false;const step=state.steps.find(s=>s.id===state.order[state.index]);state.current=step;
 $('stepCounter').textContent='PASO '+(state.index+1)+' DE '+state.steps.length;
 $('supportReminder').textContent='Mi apoyo: '+state.support;
 $('progressFill').style.width=(state.index/state.steps.length*100)+'%';
 $('routeList').innerHTML=state.order.map((id,i)=>`<li class="${i===state.index?'current':i<state.index?'done':''}"><b>${i<state.index?'✓':i+1}</b><span>${state.steps.find(s=>s.id===id).title}</span></li>`).join('');
 let body='';
 if(step.type==='checklist')body='<div class="task-checks">'+step.items.map((item,i)=>`<label><input type="checkbox" data-task-check="${i}"><span>${item}</span></label>`).join('')+'</div>';
 if(step.type==='choice')body=`<p class="task-question">${step.prompt}</p><div class="task-options">${shuffle(step.options.map((option,i)=>({option,i}))).map(({option,i})=>`<button data-choice="${i}" aria-pressed="false">${option}</button>`).join('')}</div>`;
 if(step.type==='math')body='<div class="calculation-questions">'+state.mission.math.questions.map((q,i)=>`<form class="calculation-question" data-math-form="${i}"><label for="answer${i}">${i+1}. ${q.question}</label>${state.showOperation?`<p class="question-operation">${q.operation||`${q.a} ${q.op} ${q.b}`} = ?</p>`:''}<div class="answer-row"><input id="answer${i}" inputmode="numeric" maxlength="4" autocomplete="off" aria-describedby="unit${i} result${i}"><span id="unit${i}">${q.unit}</span></div><div class="question-tools"><button type="submit" class="check-answer">Comprobar</button><button type="button" class="text-btn" data-worked="${i}">Ver apoyo</button></div><p id="result${i}" class="question-result" role="status"></p></form>`).join('')+'</div>'+(state.allowCalc?'<button class="text-btn" id="openCalc">Abrir calculadora</button>':'');
 $('taskCard').innerHTML=`<h2 class="step-title">${step.title}</h2><p class="step-detail">${step.detail}</p>${body}<div id="stepResult" class="step-result" role="status" aria-live="polite"></div><button id="taskNext" class="primary" disabled>${state.index===state.steps.length-1?'Terminar y revisar':'Paso listo, seguir'} <span>→</span></button>`;
 if(step.type==='checklist')for(const c of document.querySelectorAll('[data-task-check]'))c.onchange=()=>setReady([...document.querySelectorAll('[data-task-check]')].every(x=>x.checked));
 if(step.type==='choice')for(const b of document.querySelectorAll('[data-choice]'))b.onclick=()=>{
  const correct=Number(b.dataset.choice)===step.correct;
  noteResponse(step.mathChoice?'mathChoice':'choice',step.options[Number(b.dataset.choice)],step.options[step.correct],correct);
  for(const option of document.querySelectorAll('[data-choice]'))option.setAttribute('aria-pressed',option===b);
  if(correct){stepMessage('Esta elección responde a la situación.',true);setReady(true);}
  else{if(step.mathChoice)state.mathCorrections++;else state.actionCorrections++;stepMessage(step.hint);setReady(false);}
 };
 if(step.type==='math')bindMath();
 $('taskNext').onclick=()=>{if(!state.ready)return;state.index++;if(state.index===state.steps.length)finish();else{renderTask();$('taskCard').scrollIntoView({block:'start',behavior:'instant'});}};
}
function bindMath(){
 const questions=state.mission.math.questions,accepted=new Set();
 const updateReady=()=>setReady(accepted.size===questions.length);
 for(const form of document.querySelectorAll('[data-math-form]')){
  const i=Number(form.dataset.mathForm),q=questions[i],input=$('answer'+i),result=$('result'+i);
  input.oninput=()=>{accepted.delete(q.id);result.textContent='';form.classList.remove('accepted');updateReady()};
  form.onsubmit=e=>{
   e.preventDefault();const value=input.value.trim();
   if(!/^\d+$/.test(value)){result.textContent='Escribe un número para comprobarlo.';return;}
   const correct=Number(value)===q.answer;
   noteResponse('math',String(Number(value)),String(q.answer),correct,false,q.id,q.question);
   if(correct){accepted.add(q.id);form.classList.add('accepted');result.textContent='Respuesta comprobada.';}
   else{state.mathCorrections++;accepted.delete(q.id);form.classList.remove('accepted');result.textContent='Revisa qué dato necesitas y qué operación resuelve esta pregunta.';}
   updateReady();
  };
 }
 for(const button of document.querySelectorAll('[data-worked]'))button.onclick=()=>{
  const i=Number(button.dataset.worked),q=questions[i];helpOnce('resuelto:'+q.id);
  $('answer'+i).value=String(q.answer);$('result'+i).textContent=q.explanation;
  noteResponse('math',String(q.answer),String(q.answer),true,true,q.id,q.question);
  accepted.add(q.id);button.closest('form').classList.add('accepted');updateReady();
 };
 if($('openCalc'))$('openCalc').onclick=()=>{helpOnce('calculadora');calcExpression='';updateCalculator();$('calculator').showModal()};
}
function finish(){const record={mission:state.mission.id,title:state.mission.title,steps:state.steps.length,initialPlan:state.firstPlan||[],finalPlan:[...state.order],reviews:state.reviews,planIssues:state.planIssues,planHelps:state.planHelps,example:state.usedExample,mathCorrections:state.mathCorrections,mathHelps:state.mathHelps,actionCorrections:state.actionCorrections,showOperation:state.showOperation,calculatorAllowed:state.allowCalc,planChecks:structuredClone(state.planChecks),responses:structuredClone(state.responses),reflections:[]};history.push(record);$('historyBtn').disabled=false;$('historyCount').textContent=history.length;$('finishMission').textContent=state.mission.title+' · '+state.steps.length+' pasos completados';renderFeedback($('summaryStats'),planFeedback(record,state.steps));$('finalPlan').innerHTML=state.order.map((id,i)=>`<li><b>${String(i+1).padStart(2,'0')}</b><span>${state.steps.find(s=>s.id===id).title}</span></li>`).join('');$('summaryNote').textContent=(state.usedExample?'Se utilizó un ejemplo de secuencia. ':'Se construyó la secuencia sin cargar un ejemplo. ')+(state.showOperation?'La operación estuvo visible. ':'La operación no se mostró al inicio. ')+`Correcciones en elecciones de cálculo o respuestas numéricas: ${state.mathCorrections}.`;for(const b of document.querySelectorAll('[data-reflection]'))b.setAttribute('aria-pressed','false');show('summary');}
$('reflections').onclick=e=>{const b=e.target.closest('[data-reflection]');if(!b||!history.length)return;const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);history.at(-1).reflections=[...document.querySelectorAll('[data-reflection][aria-pressed=true]')].map(x=>x.dataset.reflection);};
$('anotherBtn').onclick=()=>show('home');$('printBtn').onclick=()=>window.print();
function download(){if(!history.length)return;const rows=[['reto','pasos','plan_en_primera_revision','plan_final','revisiones_del_plan','observaciones_por_ajustar_en_revisiones','ayudas_para_planear','uso_de_ejemplo','correcciones_de_calculo','apoyos_de_calculo','correcciones_en_otras_elecciones','operacion_visible','calculadora_disponible','reflexion','omisiones_al_revisar','errores_secuencia','errores_calculo','errores_eleccion','errores_persistentes_plan','respuestas_incorrectas_repetidas','detalle_revisiones_json','detalle_respuestas_json']];for(const r of history){const m=MISSIONS.find(x=>x.id===r.mission),steps=getSteps(m,r.steps),names=ids=>ids.map(id=>steps.find(s=>s.id===id)?.title||id).join(' > ');rows.push([r.title,r.steps,names(r.initialPlan),names(r.finalPlan),r.reviews,r.planIssues,r.planHelps,r.example?'si':'no',r.mathCorrections,r.mathHelps,r.actionCorrections,r.showOperation?'si':'no',r.calculatorAllowed?'si':'no',r.reflections.join('; '),planEvidence(r).omissions,planEvidence(r).sequence,planEvidence(r).math,planEvidence(r).choices,planEvidence(r).repeatedPlan,planEvidence(r).repeatedResponse,JSON.stringify(r.planChecks),JSON.stringify(r.responses)]);}const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');downloadText(csv,'primero-el-plan-registro.csv');}
$('downloadBtn').onclick=download;$('downloadHistory').onclick=download;
$('historyBtn').onclick=()=>{$('historyList').innerHTML=history.map((r,i)=>`<article class="history-entry"><h3>${i+1}. ${r.title}</h3><p>${r.steps} pasos · ${r.reviews} revisión/revisiones del plan · ${r.planHelps} ayuda/ayudas para planear</p><p>Omisiones: ${planEvidence(r).omissions} · Secuencia: ${planEvidence(r).sequence} · Elección: ${planEvidence(r).choices} · Posibles perseveraciones: ${planEvidence(r).repeatedPlan+planEvidence(r).repeatedResponse}</p><p>Cálculo: ${r.mathHelps} apoyo/apoyos · ${r.mathCorrections} corrección/correcciones</p><p>${r.example?'Se utilizó un ejemplo de plan.':'No se cargó un ejemplo de plan.'} ${r.showOperation?'Operación visible.':'Operación no mostrada al inicio.'}</p></article>`).join('');$('historyDialog').showModal();};
$('guideBtn').onclick=()=>$('guide').showModal();$('closeGuide').onclick=()=>$('guide').close();$('closeHistory').onclick=()=>$('historyDialog').close();$('closeCalc').onclick=()=>$('calculator').close();
const keys=['7','8','9','÷','4','5','6','×','1','2','3','−','C','0','⌫','+','=',''];$('calcKeys').innerHTML=keys.map(key=>key?`<button data-key="${key}" class="${/[+−×÷=C⌫]/.test(key)?'operator':''}" ${key==='⌫'?'aria-label="Borrar último carácter"':key==='C'?'aria-label="Limpiar cuenta"':key==='='?'aria-label="Calcular resultado"':''}>${key}</button>`:'<span></span>').join('');
function updateCalculator(){$('calcDisplay').textContent=calcExpression||'0';$('calcNote').textContent='Puedes sumar, restar, multiplicar o dividir. Después escribe el resultado en el paso.';}
$('calcKeys').onclick=e=>{const b=e.target.closest('[data-key]');if(!b)return;const key=b.dataset.key;if(key==='C')calcExpression='';else if(key==='⌫')calcExpression=calcExpression.slice(0,-1);else if(key==='='){const result=calculate(calcExpression);if(result===null){$('calcNote').textContent='Escribe dos números con un signo +, −, × o ÷ entre ellos.';return;}calcExpression=String(result);}else if(['+','−','×','÷'].includes(key)){if(!/^\d{1,3}$/.test(calcExpression))return;calcExpression+=key;}else{const operand=calcExpression.split(/[+−×÷]/).at(-1);if(operand.length>=3)return;calcExpression+=key;}updateCalculator();};

function pausePlan(){if(['planning','doing'].includes(screen)&&!document.querySelector('dialog[open]'))$('pausePlan').showModal()}
$('resumePlan').onclick=()=>$('pausePlan').close();
$('pauseExit').onclick=()=>{$('pausePlan').close();$('leavePlan').showModal()};
document.addEventListener('neurama:pause',pausePlan);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pausePlan()});
