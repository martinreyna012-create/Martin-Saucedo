import {renderFeedback} from '../../feedback.mjs';
import {chefFeedback,chefSessionFeedback,chefEvidence} from '../../feedback-data.mjs';
import {ActiveCountdown} from '../../clock.mjs';
import {downloadText} from '../../downloads.mjs';
import {createActivityFocus} from '../../activity-focus.mjs';
import {INGREDIENTS,makeOrders,evaluateOrders,ingredientNames,createBurgers,toggleIngredient,undoIngredient} from './core.mjs?v=kitchen-4';
import {ingredientArt,burgerArt,walkingClientArt,assemblyArt,clientArt,customerFaceArt} from './art.mjs?v=service-10';
import {createAmbience} from './audio.mjs?v=kitchen-4';
import {RECIPES,COURSE_PHASES,getRecipe,getCourseLevel,levelRecipeIds,createRecipeScenario,applyRecipeChange,nextCourseLevel,recipePoolProblem,phaseRecipeIds,needsPhaseStudy,phaseRecipePoolProblem} from './recipes.mjs?v=service-10';
import {createCustomerLine,advanceCustomerLine,nextInLine,resolveCustomer,lineFinished,customerMood,beginCustomerService} from './queue.mjs?v=service-10';
import {noticeDue} from './notices.mjs?v=review-9';
import {createAttemptRecord,sessionSummary,sessionCsv} from './records.mjs?v=service-10';
const $=id=>document.getElementById(id),views=['home','recipeStudy','service','review','feedback','report'];
let exposureClock=null,challengePaused=false;
const clients=[{name:'Sofía',presentation:'feminine',skin:'#E8B88D',hair:'#62473A',shirt:'#7C9A7A'},{name:'Leo',presentation:'masculine',skin:'#C98E68',hair:'#3D332E',shirt:'#D29158'},{name:'Ana',presentation:'feminine',skin:'#F0CBA2',hair:'#9B6748',shirt:'#9CAAC1'},{name:'Diego',presentation:'masculine',skin:'#AB7053',hair:'#342C29',shirt:'#B99B69'},{name:'Valeria',presentation:'feminine',skin:'#E2AD8B',hair:'#513E35',shirt:'#B87572'},{name:'Nico',presentation:'masculine',skin:'#CF9B79',hair:'#705039',shirt:'#6C8B9A'}];
let screen='home',stage='idle',gameMode='challenge',settings=null,round=null,history=[],observed=[],timer=null,exposureStart=0,prepareStart=0,clientIndex=0,arrivalTimer=null,departureTimer=null,activeBurger=0,recipeLevel=1,courseTrial=0,courseRun=0,selectedRecipes=[1],recipePoolCustom=false,courseLine=null,lineTimer=null,lineLastTick=0,recordedLeft=new Set(),queueActorKey='',queueRenderKey='',studiedRecipeBook=null,sessionCounter=0;
const ambience=createAmbience({voices:$('voicesAudio'),kitchen:$('kitchenAudio'),enabled:$('soundEnabled'),voicesVolume:$('voicesVolume'),kitchenVolume:$('kitchenVolume'),status:$('audioStatus'),button:$('soundBtn')});
let batchStart=0,challengeServed=0,motionJob=null,servicePaused=false,queueWasPaused=false;
const focus=createActivityFocus({activity:'chef',activeScreens:['recipeStudy','service'],onPause:pauseService});
function show(id){screen=id;for(const view of views)$(view).classList.toggle('hidden',view!==id);focus.screen(id);$('homeReport').classList.toggle('hidden',!history.length);window.scrollTo({top:0,behavior:'instant'})}
function cancelMotion(){clearTimeout(arrivalTimer);clearTimeout(departureTimer);motionJob=null}
function runMotion(){if(!motionJob)return;motionJob.startedAt=performance.now();arrivalTimer=setTimeout(()=>{const fn=motionJob?.fn;motionJob=null;if(fn)fn();},motionJob.remainingMs)}
function scheduleMotion(fn,delay){cancelMotion();motionJob={fn,remainingMs:delay,startedAt:performance.now()};runMotion()}
function stopWork(){exposureClock=null;challengePaused=false;servicePaused=false;document.body.classList.remove('activity-paused');$('servicePause').close();$('challengePause').close();clearInterval(timer);clearInterval(lineTimer);cancelMotion();stage='idle';ambience.stop()}
function reduced(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches}
$('heroBurger').innerHTML=burgerArt(INGREDIENTS.map(x=>x.id));$('ingredients').innerHTML=INGREDIENTS.map(x=>`<div class="ingredient">${ingredientArt(x.id)}${x.name}</div>`).join('');
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>{
 gameMode=button.dataset.mode;
 for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',b===button);
 $('modeTitle').textContent=gameMode==='recipes'?'Recetas por niveles':'Retos de memoria';
 $('modeDescription').textContent=gameMode==='recipes'?'Elige el recetario, estudia y atiende a los tres clientes de la fila.':'El pedido se oculta antes de empezar a cocinar.';
 $('classicConfig').classList.toggle('hidden',gameMode==='recipes');$('courseConfig').classList.toggle('hidden',gameMode!=='recipes');
 $('modeTimingNote').textContent=gameMode==='recipes'?'Observa sus caras: la expresión cambia conforme esperan en la fila.':'Sin límite de tiempo para preparar. Puedes ajustar o apagar los sonidos.';
 $('openBtn').innerHTML=(gameMode==='recipes'?'Aprender recetas de la fase':'Abrir el restaurante')+' <span>→</span>';
 if(gameMode==='recipes')renderCourseConfig();else $('openBtn').disabled=false;
};
for(const input of document.querySelectorAll('input[name=phase]'))input.onchange=()=>$('fillingCount').value=String(Number(input.value)+1);
$('guideBtn').onclick=()=>{pauseService();$('guide').showModal();};$('closeGuide').onclick=()=>$('guide').close();$('soundBtn').onclick=()=>{pauseService();$('soundDialog').showModal();};$('closeSound').onclick=()=>$('soundDialog').close();$('soundDialog').addEventListener('close',()=>ambience.endPreview());$('previewSound').onclick=()=>{$('soundEnabled').checked=true;screen==='home'?ambience.preview():ambience.start()};
function config(){
 if(gameMode==='recipes'){const spec=getCourseLevel($('recipePhase').value,recipeLevel);const problem=phaseRecipePoolProblem(spec.phase,selectedRecipes);if(problem)return false;settings={mode:'recipes',prep:$('prepMode').value,phase:spec.orderSets[0].length,exposure:null,fillings:null,coursePhase:spec.phase,courseLevel:spec.level,recipes:[...selectedRecipes]};return true;}
 settings={mode:'challenge',prep:$('prepMode').value,phase:Number(document.querySelector('input[name=phase]:checked').value),exposure:Number($('exposure').value),fillings:Number($('fillingCount').value),clients:Number($('challengeClients').value)};return true;
}
$('openBtn').onclick=()=>{if(!config())return;if(settings.mode==='recipes'){startRecipeStudy();return;}batchStart=history.length;challengeServed=0;ambience.start();welcome()};$('changeConfig').onclick=()=>{stopWork();if(gameMode==='recipes')renderCourseConfig();show('home')};
function setBubble(html,recipe=false){$('orderBubble').className='order-bubble'+(recipe?' recipe-bubble':'');$('orderBubble').innerHTML=html}
function welcome(){
 clearInterval(timer);cancelMotion();stage='arriving';activeBurger=0;
 const entry=settings.mode==='recipes'?nextInLine(courseLine):null;if(settings.mode==='recipes'&&!entry)return;if(entry){courseTrial=entry.index;courseLine=resolveCustomer(courseLine,entry.index,'active');}const client=entry?entry.client:clients[clientIndex++%clients.length],scenario=entry?createRecipeScenario(settings.coursePhase,settings.courseLevel,courseTrial,settings.recipes,client):null;
 const orders=scenario?scenario.initial.orders.map(x=>[...x]):makeOrders(settings.phase,settings.fillings);
 round={sessionNo:++sessionCounter,client,orders,initialOrders:orders.map(x=>[...x]),drafts:createBurgers(orders.length),supports:0,bookConsults:0,interrupted:false,prepareMs:0,settings:{...settings},scenario,expected:scenario?scenario.initial:null,events:scenario?scenario.events:[],nextEvent:0,eventLog:[],actionCount:0,lastNoticeMs:0,lastNoticeActions:0,pendingOutcome:'served',courseTrial:scenario?courseTrial+1:null,courseRun:scenario?courseRun:null};
 const table=`MESA ${String(round.sessionNo).padStart(2,'0')}`;$('tableTag').textContent=table;$('reviewTag').textContent=table;
 $('sessionPhase').textContent=scenario?`RECETAS · FASE ${settings.coursePhase} / NIVEL ${settings.courseLevel} · CLIENTE ${courseTrial+1}/3`:('RETO · '+settings.exposure+' S')+' · '+settings.phase+(settings.phase===1?' HAMBURGUESA':' HAMBURGUESAS');
 $('restaurantRoom').classList.toggle('recipe-service',settings.mode==='recipes');$('restaurantRoom').dataset.orders=String(settings.phase);$('restaurantRoom').dataset.motion='arriving';$('clientPortrait').innerHTML='<div class="actor-motion arriving">'+walkingClientArt(client,entry?customerMood(entry).key:'calm')+'</div>';
 $('timerHud').classList.add('hidden');$('timeTrack').classList.add('hidden');$('serviceHint').textContent='El cliente viene en camino.';
 setBubble(`<span class="eyebrow">${client.name.toUpperCase()}</span><h2>¡Hola, chef!</h2><p>Quisiera ${settings.phase===1?'una hamburguesa':settings.phase+' hamburguesas'}, por favor.</p>${entry?'<p class="bubble-note">'+entry.urgency+'.</p>':''}<button id="viewOrder" class="primary" disabled>Ver mi pedido →</button>`);
 $('arrivalStatus').textContent=client.name+' se acerca al mostrador…';$('digitalWorkspace').classList.toggle('hidden',settings.prep==='physical');$('physicalNote').classList.toggle('hidden',settings.prep!=='physical');$('assemblyStage').classList.toggle('physical-preview',settings.prep==='physical');$('supportNote').textContent='';$('noticeHistory').open=false;renderRequestNotes();renderKitchen();show('service');renderQueue();
 $('assemblyStage').classList.remove('is-delivering');
 scheduleMotion(()=>{if(stage!=='arriving'||screen!=='service')return;stage='waiting';$('restaurantRoom').dataset.motion='idle';$('viewOrder').disabled=false;$('arrivalStatus').textContent=client.name+' ya puede pedir.';$('serviceHint').textContent='Pulsa «Ver mi pedido» cuando estés listo.';renderKitchen();renderQueue();},reduced()?0:2450)
}
function recipe(){
 if(settings.mode==='recipes'){
  setBubble(`<div class="recipe-heading"><span class="eyebrow">${round.client.name.toUpperCase()} TE PIDE</span><strong>Este es mi pedido.</strong></div><div class="bubble-recipes recipe-requests" style="--orders:${round.orders.length}">${round.expected.recipeIds.map((id,i)=>`<article class="bubble-recipe"><h3>Hamburguesa ${i+1}</h3><div><span class="recipe-number" data-recipe-number="${id}">Receta ${id}</span></div></article>`).join('')}</div>`,true);renderRequestNotes();return;
 }
 setBubble(`<div class="recipe-heading"><span class="eyebrow">${round.client.name.toUpperCase()} TE PIDE</span><strong>Mira y recuerda mi receta.</strong></div><div class="bubble-recipes" style="--orders:${round.orders.length}">${round.orders.map((order,i)=>`<article class="bubble-recipe"><h3>Hamburguesa ${i+1}</h3><div>${order.map(id=>`<span class="recipe-chip" data-recipe-ingredient="${id}">${ingredientArt(id)}${INGREDIENTS.find(x=>x.id===id).name}</span>`).join('')}</div></article>`).join('')}</div>`,true)
}
$('orderBubble').onclick=e=>{if(e.target.closest('#viewOrder')&&stage==='waiting'){if(settings.mode==='recipes')beginRecipeOrder();else expose();}else if(e.target.closest('#ackUpdate')&&stage==='update')acknowledgeRecipeChange()};
function expose(extra=false){
 clearInterval(timer);if(extra){round.prepareMs+=performance.now()-prepareStart;round.supports++;}recipe();$('arrivalStatus').textContent='';stage='expose';$('serviceHint').textContent='Observa los ingredientes de cada hamburguesa.';$('secondsLeft').textContent=settings.exposure;$('timerHud').classList.remove('hidden');$('timeTrack').classList.remove('hidden');$('timeFill').style.width='100%';renderKitchen();exposureClock=new ActiveCountdown(settings.exposure*1000);runExposure();
}
function beginRecipeOrder(){if(stage!=='waiting'||courseLine.paused)return;courseLine=beginCustomerService(courseLine,courseTrial);lineLastTick=performance.now();stage='prepare';prepareStart=performance.now();recipe();$('arrivalStatus').textContent='';$('serviceHint').textContent='El pedido queda visible. Atiende antes de que se agote la paciencia.';renderKitchen();renderQueue();}
function hideOrder(){if(stage!=='expose')return;clearInterval(timer);exposureClock=null;stage='prepare';readyBubble();$('timerHud').classList.add('hidden');$('timeTrack').classList.add('hidden');$('serviceHint').textContent=settings.prep==='digital'?'Toca los ingredientes para armar la hamburguesa.':'Prepara el pedido con tu material físico.';prepareStart=performance.now();renderKitchen()}
$('helpBtn').onclick=()=>{if(stage==='prepare'&&settings.mode==='challenge')expose(true)};
function renderKitchen(newIngredient=null){const ready=stage==='prepare'&&!(settings.mode==='recipes'&&courseLine?.paused),physical=settings.prep==='physical',layers=round.drafts[activeBurger];$('assemblyLabel').textContent=physical?'TU COCINA FÍSICA':'HAMBURGUESA '+(activeBurger+1);$('builderCount').textContent=physical?'':(layers.length-1)+' ingrediente'+(layers.length===2?'':'s')+' + pan';$('burgerPreview').innerHTML=physical?'<div class="physical-plate-icon" aria-hidden="true">👨‍🍳</div>':assemblyArt(layers,newIngredient);$('burgerPreview').setAttribute('aria-label',physical?'Usa el material físico':'Hamburguesa '+(activeBurger+1)+' con '+ingredientNames(layers));$('plateHint').textContent=ready?(physical?'Usa tu material sobre la mesa.':'Agrega ingredientes desde la barra.'):stage==='update'?'Pausa: lee el aviso del cliente.':settings.mode==='recipes'&&courseLine?.paused?'Fila pausada por el terapeuta.':'Primero, espera el pedido.';$('orderTabs').innerHTML=round.drafts.map((draft,i)=>`<button data-burger="${i}" aria-pressed="${i===activeBurger}" ${!ready?'disabled':''}><span>${i+1}</span> Hamburguesa ${i+1}<small>${draft.length-1} ingredientes</small></button>`).join('');$('ingredientBar').innerHTML=INGREDIENTS.map(x=>`<button class="ingredient-button ${x.id==='pan'?'included':''}" data-build="${x.id}" aria-pressed="${layers.includes(x.id)}" aria-label="${x.id==='pan'?'Pan incluido':(layers.includes(x.id)?'Quitar ':'Agregar ')+x.name}" ${!ready||x.id==='pan'?'disabled':''} draggable="${ready&&x.id!=='pan'}">${ingredientArt(x.id)}<strong>${x.name}</strong><small>${x.id==='pan'?'Incluido':layers.includes(x.id)?'Quitar':'Agregar'}</small><span class="ingredient-badge" aria-hidden="true">${layers.includes(x.id)?'✓':'+'}</span></button>`).join('');$('undoBtn').disabled=!ready||layers.length<=1;$('clearBtn').disabled=!ready||layers.length<=1;const pending=settings.mode==='recipes'&&round.nextEvent<round.events.length;$('serveBtn').disabled=!ready||pending;$('serveBtn').innerHTML=(pending?'Atiende los avisos del cliente':'Servir pedido')+' <span>→</span>';$('helpBtn').classList.toggle('hidden',!ready||settings.mode==='recipes');updateSupportNote();$('requestChange').classList.toggle('hidden',settings.mode!=='recipes'||stage!=='prepare'||round.nextEvent>=round.events.length);if($('viewOrder')&&stage==='waiting')$('viewOrder').disabled=settings.mode==='recipes'&&!!courseLine?.paused;$('requestChange').disabled=!ready;$('requestChange').textContent='Escuchar aviso '+(round.nextEvent+1)+' de '+round.events.length;if(!ready)$('ingredientStatus').textContent=settings.mode==='recipes'&&courseLine?.paused?'La fila y la cocina están pausadas. Reanuda cuando estés listo.':stage==='expose'?'Primero mira la receta. La cocina se habilita al ocultarla.':stage==='update'?'La cocina está en pausa. Lee el aviso y pulsa «Entendido».':'La cocina se habilita después de ver el pedido.';else if(!newIngredient)$('ingredientStatus').textContent='Toca para agregar o quitar. También puedes arrastrar un ingrediente al plato.';}
$('orderTabs').onclick=e=>{const b=e.target.closest('[data-burger]');if(!b||stage!=='prepare'||(settings.mode==='recipes'&&courseLine?.paused))return;activeBurger=Number(b.dataset.burger);renderKitchen()};
function changeIngredient(id,onlyAdd=false){if(stage!=='prepare'||(settings.mode==='recipes'&&courseLine?.paused)||settings.prep!=='digital'||id==='pan'||!INGREDIENTS.some(x=>x.id===id))return;const had=round.drafts[activeBurger].includes(id);if(onlyAdd&&had){$('ingredientStatus').textContent=INGREDIENTS.find(x=>x.id===id).name+' ya está en esta hamburguesa.';return;}round.drafts[activeBurger]=toggleIngredient(round.drafts[activeBurger],id);renderKitchen(had?null:id);$('ingredientStatus').textContent=(had?'Quitaste ':'Agregaste ')+INGREDIENTS.find(x=>x.id===id).name.toLowerCase()+' '+(had?'de':'a')+' la hamburguesa '+(activeBurger+1)+'.';noteKitchenAction();}
$('ingredientBar').onclick=e=>{const b=e.target.closest('[data-build]');if(b)changeIngredient(b.dataset.build)};
$('ingredientBar').ondragstart=e=>{const b=e.target.closest('[data-build]');if(!b||stage!=='prepare'||b.disabled){e.preventDefault();return;}e.dataTransfer.setData('text/plain',b.dataset.build);e.dataTransfer.effectAllowed='copy';};
$('burgerPreview').ondragover=e=>{if(stage==='prepare'&&settings.prep==='digital'){e.preventDefault();$('burgerPreview').classList.add('drop-ready')}};$('burgerPreview').ondragleave=()=>$('burgerPreview').classList.remove('drop-ready');$('burgerPreview').ondrop=e=>{e.preventDefault();$('burgerPreview').classList.remove('drop-ready');changeIngredient(e.dataTransfer.getData('text/plain'),true)};
$('undoBtn').onclick=()=>{if(stage!=='prepare'||(settings.mode==='recipes'&&courseLine?.paused))return;round.drafts[activeBurger]=undoIngredient(round.drafts[activeBurger]);renderKitchen();$('ingredientStatus').textContent='Deshiciste el último ingrediente de esta hamburguesa.';noteKitchenAction()};$('clearBtn').onclick=()=>{if(stage!=='prepare'||(settings.mode==='recipes'&&courseLine?.paused))return;round.drafts[activeBurger]=['pan'];renderKitchen();$('ingredientStatus').textContent='La hamburguesa '+(activeBurger+1)+' está lista para empezar de nuevo; conserva el pan.';noteKitchenAction()};
$('serveBtn').onclick=()=>{if(settings.mode==='recipes')tickLine();if(stage!=='prepare'||(settings.mode==='recipes'&&courseLine?.paused))return;if(settings.mode==='recipes'&&round.nextEvent<round.events.length)return;round.prepareMs+=performance.now()-prepareStart;stage='checking';if(settings.prep==='physical')reviewPhysical();else finishRound(round.drafts.map(x=>[...x]))};
function reviewPhysical(){const expired=round.pendingOutcome==='left_active';$('reviewContext').classList.toggle('hidden',!expired);$('saveRound').textContent='Registrar y seguir →';observed=round.orders.map(()=>new Set());$('reviewCards').style.setProperty('--orders',round.orders.length);$('reviewCards').innerHTML=round.orders.map((order,i)=>`<article class="review-card"><h3>Hamburguesa ${i+1}</h3><h4>Ingredientes que preparó:</h4><div class="observed">${INGREDIENTS.map(x=>`<button type="button" data-order="${i}" data-ingredient="${x.id}" aria-pressed="false">${x.name}</button>`).join('')}</div></article>`).join('');$('confirmed').checked=false;$('saveRound').disabled=true;show('review')}
$('reviewCards').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.ingredient){const i=Number(b.dataset.order),id=b.dataset.ingredient;observed[i].has(id)?observed[i].delete(id):observed[i].add(id);b.setAttribute('aria-pressed',observed[i].has(id));}else if(b.dataset.match!==undefined){const i=Number(b.dataset.match);observed[i]=new Set(round.orders[i]);for(const item of document.querySelectorAll(`[data-order="${i}"]`))item.setAttribute('aria-pressed',observed[i].has(item.dataset.ingredient));}else return;$('confirmed').checked=false;$('saveRound').disabled=true};$('confirmed').onchange=()=>$('saveRound').disabled=!$('confirmed').checked;$('saveRound').onclick=()=>{if(screen==='review'&&$('confirmed').checked)finishRound(observed.map(x=>[...x]))};
function finishRound(actual){
 const outcome=round.pendingOutcome||'served';
 if(settings.mode==='recipes'&&outcome==='served')courseLine=resolveCustomer(courseLine,courseTrial,'served');
 const entry=settings.mode==='recipes'?courseLine.entries[courseTrial]:null;
 const record=createAttemptRecord(round,{outcome,actual,entry});
 history.push(record);if(settings.mode==='challenge')challengeServed++;
 departAndContinue(record);
}
function serviceRecords(){return settings.mode==='recipes'?history.filter(x=>x.courseRun===courseRun&&x.settings.mode==='recipes'):history.slice(batchStart)}
function serviceComplete(){return settings.mode==='recipes'?lineFinished(courseLine):challengeServed>=settings.clients}
function showServiceSummary(record){
 stage='feedback';ambience.stop();clearInterval(lineTimer);
 const group=serviceRecords(),summary=sessionSummary(group);
 $('feedbackSymbol').textContent='✓';$('feedbackTitle').textContent='Servicio terminado';
 $('feedbackText').textContent=`${summary.served} clientes recibieron su pedido. Aquí está el registro de todos los pedidos del servicio.`;
 $('details').innerHTML='';renderFeedback($('chefAttemptFeedback'),chefSessionFeedback(group));
 renderCourseFeedback(record);$('nextClient').classList.add('hidden');show('feedback');
}
function departAndContinue(record){
 cancelMotion();stage='departing';$('restaurantRoom').dataset.motion='leaving';
 $('clientPortrait').innerHTML='<div class="actor-motion leaving">'+walkingClientArt(record.client,record.outcome==='served'?'calm':'upset')+'</div>';
 setBubble(`<span class="eyebrow">${record.client.name.toUpperCase()}</span><h2>${record.outcome==='served'?'Gracias, chef.':'Debo irme, chef.'}</h2>`);
 $('assemblyStage').classList.toggle('is-delivering',record.outcome==='served');
 $('timerHud').classList.add('hidden');$('timeTrack').classList.add('hidden');
 renderKitchen();show('service');renderQueue();
 scheduleMotion(()=>{if(serviceComplete())showServiceSummary(record);else welcome();},reduced()?0:1850);
}
$('nextClient').onclick=()=>{if(stage==='feedback'&&!serviceComplete())welcome()};
function report(){
 stopWork();renderFeedback($('chefReportFeedback'),chefSessionFeedback(history));const summary=sessionSummary(history),totalSupports=history.reduce((a,b)=>a+b.supports+b.bookConsults,0),hasRecipes=history.some(x=>x.settings.mode==='recipes');
 $('stats').innerHTML=[['Clientes con entrega',summary.served],['Exactitud de lo registrado',summary.observed?`${summary.correct}/${summary.observed}`:'Sin evaluación'],[hasRecipes?'Clientes que se retiraron':'Consultas',hasRecipes?summary.left:totalSupports]].map(([label,value])=>`<div class="stat"><b>${value}</b><span>${label}</span></div>`).join('');
 $('reportRows').innerHTML=history.map(x=>`<tr><td>${x.client.name}</td><td>${x.settings.mode==='recipes'?'Recetas F'+x.settings.coursePhase+' · N'+x.settings.courseLevel+' · C'+x.courseTrial:'Retos'}</td><td>${x.settings.prep==='digital'?'Pantalla':'Físico'}</td><td>${x.outcome==='served'?'Entregado':x.outcome==='left_waiting'?'Se retiró de la fila':x.outcome==='interrupted'?'Intento sin terminar':'Se retiró del mostrador'}${x.settings.mode==='challenge'?' · '+x.settings.exposure+' s para mirar':''}</td><td>${x.assessment==='observed'?x.results.filter(r=>r.correct).length+'/'+x.results.length+' coinciden'+(x.outcome==='served'?'':' · sin entrega'):x.outcome==='interrupted'?'Sin preparación registrada':'No inició la preparación'}</td><td>${x.supports} pedido${x.interrupted?' · exposición interrumpida':''}</td></tr>`).join('');show('report');
}
$('finishBtn').onclick=report;$('restartBtn').onclick=()=>{history=[];clientIndex=0;sessionCounter=0;studiedRecipeBook=null;stopWork();if(gameMode==='recipes')renderCourseConfig();show('home')};
$('downloadBtn').onclick=()=>{
 downloadText(sessionCsv(history),'chef-por-un-dia-registro.csv');
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseService();lineLastTick=performance.now();});window.addEventListener('pagehide',()=>{clearInterval(timer);clearInterval(lineTimer);cancelMotion()});

function updateSupportNote(){if(!round)return;const notes=[];if(round.supports)notes.push('Consultas del pedido: '+round.supports);if(settings.mode==='recipes'&&round.bookConsults)notes.push('Consultas del recetario: '+round.bookConsults);$('supportNote').textContent=notes.join(' · ')}
function readyBubble(){if(settings.mode==='recipes'){recipe();return;}setBubble(`<span class="eyebrow">${round.client.name.toUpperCase()}</span><h2>${round.eventLog.length?'Pedido actualizado.':'¡A cocinar!'}</h2><p>Prepara ${settings.phase===1?'la hamburguesa que te pedí':'las '+settings.phase+' hamburguesas que te pedí'}.</p><p class="bubble-note">${round.eventLog.length?'Conserva los avisos del cliente al ajustar el pedido.':'Mi pedido ya está en tu memoria.'}</p>`)}
function noteKitchenAction(){if(settings.mode!=='recipes'||stage!=='prepare')return;round.actionCount++;maybeRecipeChange(false)}
function renderRequestNotes(){
 const active=settings?.mode==='recipes'&&round?.eventLog.length>0;$('noticeHistory').classList.toggle('hidden',!active);if(!active)return;
 $('noticeHistorySummary').textContent='Avisos del cliente · '+round.eventLog.length;$('noticeHistoryList').innerHTML=round.eventLog.map(e=>'<li>'+e.message+'</li>').join('');
}
function maybeRecipeChange(force=false){
 if(settings.mode!=='recipes'||stage!=='prepare'||courseLine?.paused)return false;const event=round.events[round.nextEvent];if(!event)return false;
 const entry=courseLine.entries[courseTrial],preparedFillings=round.drafts.reduce((n,o)=>n+o.length-1,0),targetFillings=Math.max(round.initialOrders.reduce((n,o)=>n+o.length-1,0),round.scenario.final.orders.reduce((n,o)=>n+o.length-1,0));
 if(!force&&!noticeDue({eventIndex:round.nextEvent,eventCount:round.events.length,serviceMs:entry.serviceMs,budgetMs:entry.serviceBudgetSeconds*1000,lastNoticeMs:round.lastNoticeMs,actions:round.actionCount,lastNoticeActions:round.lastNoticeActions,preparedFillings,targetFillings}))return false;
 round.prepareMs+=performance.now()-prepareStart;stage='update';renderQueue();$('timerHud').classList.add('hidden');$('timeTrack').classList.add('hidden');setBubble(`<span class="eyebrow">${round.client.name.toUpperCase()} · AVISO ${round.nextEvent+1} DE ${round.events.length}</span><h2>Un momento, chef…</h2><p class="change-message">${event.message}</p><button id="ackUpdate" class="primary">Entendido, ajustaré el pedido →</button>`);$('orderBubble').classList.add('update-bubble');$('serviceHint').textContent='Escucha al cliente antes de continuar. El plato conserva sus ingredientes.';$('arrivalStatus').textContent='El cliente quiere actualizar su pedido.';renderKitchen();$('orderBubble').scrollIntoView({block:'center',behavior:reduced()?'instant':'smooth'});return true;
}
function acknowledgeRecipeChange(){
 if(stage!=='update')return;const event=round.events[round.nextEvent];if(!event)return;round.expected=applyRecipeChange(round.expected,event);round.orders=round.expected.orders.map(x=>[...x]);round.eventLog.push({...event});round.nextEvent++;round.lastNoticeMs=courseLine.entries[courseTrial].serviceMs;round.lastNoticeActions=round.actionCount;stage='prepare';lineLastTick=performance.now();prepareStart=performance.now();readyBubble();$('arrivalStatus').textContent='';$('serviceHint').textContent='Continúa con el pedido actualizado.';renderKitchen();renderQueue();
}
$('requestChange').onclick=()=>maybeRecipeChange(true);
function courseMetrics(spec){return `<span><b>${spec.orderSets[0].length}</b> ${spec.orderSets[0].length===1?'hamburguesa':'hamburguesas'} por cliente</span><span>La <b>expresión</b> muestra la paciencia</span><span><b>${spec.changes.length}</b> ${spec.changes.length===1?'aviso':'avisos'} por pedido</span><span><b>${selectedRecipes.length}</b> recetas elegidas</span>`}
function renderRecipePicker(){
 $('recipePicker').innerHTML=RECIPES.map(r=>`<label class="recipe-pick"><input type="checkbox" value="${r.id}" ${selectedRecipes.includes(r.id)?'checked':''}><span class="pick-number">${r.id}</span><span><b>${r.name}</b><small>${ingredientNames(r.ingredients.filter(x=>x!=='pan'))}</small></span></label>`).join('');
}
function renderCourseConfig(){const spec=getCourseLevel($('recipePhase').value,recipeLevel);if(!recipePoolCustom)selectedRecipes=phaseRecipeIds(spec.phase);for(const b of document.querySelectorAll('[data-recipe-level]'))b.setAttribute('aria-pressed',Number(b.dataset.recipeLevel)===recipeLevel);$('courseDescription').innerHTML=`<h3>${spec.title}</h3><p>${spec.description}</p><div class="course-metrics">${courseMetrics(spec)}</div><p class="course-protocol">Tres clientes en fila. Solo verás el número de receta. El repaso se hace al iniciar la fase.</p>`;renderRecipePicker();const problem=phaseRecipePoolProblem(spec.phase,selectedRecipes);$('recipeSelectionNote').textContent=problem||'Recetas que se usarán: '+selectedRecipes.join(', ')+'.';$('recipeSelectionNote').classList.toggle('selection-error',!!problem);if(gameMode==='recipes'){$('openBtn').disabled=!!problem;$('openBtn').innerHTML=(needsPhaseStudy(studiedRecipeBook,spec.phase,selectedRecipes)?'Aprender recetas de la fase':'Comenzar nivel')+' <span>→</span>';} }
$('recipePicker').onchange=()=>{selectedRecipes=Array.from($('recipePicker').querySelectorAll('input:checked'),x=>Number(x.value));recipePoolCustom=true;renderCourseConfig()};
$('suggestRecipes').onclick=()=>{recipePoolCustom=false;renderCourseConfig()};$('allRecipes').onclick=()=>{selectedRecipes=RECIPES.map(x=>x.id);recipePoolCustom=true;renderCourseConfig()};
$('recipePhase').onchange=()=>{recipeLevel=1;renderCourseConfig()};for(const b of document.querySelectorAll('[data-recipe-level]'))b.onclick=()=>{recipeLevel=Number(b.dataset.recipeLevel);renderCourseConfig()};renderCourseConfig();
function bookCards(ids,previousMax=null){return ids.map(id=>{const r=getRecipe(id),n=r.ingredients.length-1;return `<article class="book-card" data-book-recipe="${id}"><div class="book-card-head"><span class="recipe-number-badge">${id}</span><div><h3>${r.name}</h3><span class="book-amount">${n} ${n===1?'ingrediente':'ingredientes'} + pan</span></div></div><div class="book-card-ingredients">${r.ingredients.map(ingredient=>`<span class="recipe-chip">${ingredientArt(ingredient)}${INGREDIENTS.find(x=>x.id===ingredient).name}</span>`).join('')}</div>${previousMax!==null&&id>previousMax?'<span class="book-card-new">NUEVA EN ESTE NIVEL</span>':''}</article>`}).join('')}
function startRecipeStudy(){
 stopWork();courseTrial=0;courseRun++;courseLine=null;recordedLeft=new Set();queueActorKey='';queueRenderKey='';
 const spec=getCourseLevel(settings.coursePhase,settings.courseLevel);
 if(!needsPhaseStudy(studiedRecipeBook,spec.phase,settings.recipes)){startRecipeCustomers();return;}
 stage='study';$('studyPosition').textContent=`FASE ${spec.phase} DE 3 · NIVEL INICIAL ${spec.level}`;$('studyTitle').textContent='Aprende las recetas de la fase '+spec.phase;$('studyDescription').textContent='Memoriza qué ingredientes corresponden a cada número. Los clientes solo dirán la receta; el recetario no se mostrará entre niveles de esta fase.';$('studyMetrics').innerHTML=courseMetrics(spec);$('studyCards').innerHTML=bookCards(settings.recipes);$('studyRules').classList.toggle('hidden',!Array.from({length:5},(_,i)=>getCourseLevel(spec.phase,i+1)).some(level=>level.changes.includes('allergy')));show('recipeStudy');
}
function startRecipeCustomers(){ambience.start();batchStart=history.length;const lineClients=Array.from({length:3},()=>clients[clientIndex++%clients.length]);const plans=lineClients.map((client,i)=>createRecipeScenario(settings.coursePhase,settings.courseLevel,i,settings.recipes,client));courseLine=createCustomerLine(settings.coursePhase,settings.courseLevel,lineClients,{plans,prep:settings.prep});lineLastTick=performance.now();lineTimer=setInterval(tickLine,100);welcome()}
$('startRecipeClients').onclick=()=>{if(screen!=='recipeStudy')return;studiedRecipeBook={phase:settings.coursePhase,recipes:[...settings.recipes]};startRecipeCustomers()};$('studyBack').onclick=()=>{stopWork();show('home')};
function openRecipeBook(){if(!['home','recipeStudy'].includes(screen))return;$('recipeBookCards').innerHTML=bookCards(screen==='recipeStudy'?settings.recipes:selectedRecipes);$('recipeBookDialog').showModal()}
$('previewRecipeBook').onclick=openRecipeBook;$('studyFullBook').onclick=openRecipeBook;$('closeRecipeBook').onclick=()=>$('recipeBookDialog').close();
function renderCourseFeedback(record){
 const course=record.settings.mode==='recipes';$('courseFeedback').classList.toggle('hidden',!course);$('feedbackQueue').classList.toggle('hidden',!course);$('courseComplete').classList.add('hidden');$('nextClient').classList.remove('hidden');$('nextClient').textContent='Recibir al siguiente cliente →';if(!course)return;
 const spec=record.scenario.spec;$('courseFeedback').innerHTML=`<h3>Fase ${spec.phase} · Nivel ${spec.level}</h3><p>${spec.title}</p>`;
 $('feedbackQueue').innerHTML='<h3>Así va la fila</h3>'+courseLine.entries.map(e=>`<span class="queue-result ${e.status}"><b>${e.client.name}</b> · ${e.status==='served'?'Pedido entregado':e.status==='left'?'Se retiró':customerMood(e).label}</span>`).join('')+'<p class="note">Fila pausada durante la revisión.</p>';
 const next=nextInLine(courseLine);if(next){$('nextClient').textContent='Atender a '+next.client.name+' →';return;}
 $('nextClient').classList.add('hidden');$('courseComplete').classList.remove('hidden');const group=history.filter(x=>x.courseRun===record.courseRun&&x.settings.mode==='recipes'),summary=sessionSummary(group),results=group.flatMap(x=>x.results),correct=summary.correct,served=summary.served;
 $('courseCompleteTitle').textContent=`Fase ${spec.phase} · Nivel ${spec.level}: fila terminada`;$('courseCompleteText').textContent=`${served} clientes recibieron su pedido y ${3-served} se retiraron. ${results.length?correct+' de '+results.length+' preparaciones registradas coincidieron con el pedido.':'No hubo preparaciones registradas para comparar.'} Puedes repetir o avanzar.`;
 $('nextRecipeLevel').classList.toggle('hidden',!nextCourseLevel(spec.phase,spec.level));
}
function moveRecipeLevel(next){$('recipePhase').value=String(next.phase);recipeLevel=next.level;renderCourseConfig();if(config())startRecipeStudy();else show('home')}
$('repeatRecipeLevel').onclick=()=>moveRecipeLevel({phase:settings.coursePhase,level:settings.courseLevel});$('nextRecipeLevel').onclick=()=>{const next=nextCourseLevel(settings.coursePhase,settings.courseLevel);if(next)moveRecipeLevel(next)};

function lineClockRunning(){return settings?.mode==='recipes'&&courseLine?.started&&!courseLine.paused&&screen==='service'&&['waiting','prepare'].includes(stage)&&!document.hidden&&!document.querySelector('dialog[open]')}
function tickLine(){
 const now=performance.now(),elapsed=now-lineLastTick;lineLastTick=now;if(!courseLine||settings?.mode!=='recipes')return;
 if(lineClockRunning()){
  const {line,departed}=advanceCustomerLine(courseLine,elapsed);courseLine=line;
  for(const entry of departed)recordDeparture(entry);
  const active=departed.find(e=>e.index===courseTrial&&round?.courseRun===courseRun);
  if(active){stage='expired';cancelMotion();setBubble(`<span class="eyebrow">${active.client.name.toUpperCase()}</span><h2>Debo irme, chef.</h2><p>Se agotó mi tiempo de espera.</p><p class="bubble-note">Puedes revisar la fila y volver a intentarlo.</p>`);$('clientPortrait').innerHTML='<div class="actor-motion leaving">'+walkingClientArt(active.client,'upset')+'</div>';$('serviceHint').textContent='El cliente se retira sin pedido.';renderKitchen();showExpiredFeedback(active);}
 }
 if(stage==='prepare'&&!courseLine.paused)maybeRecipeChange(false);
 renderQueue();
}
function recordDeparture(entry){
 if(recordedLeft.has(entry.index))return;recordedLeft.add(entry.index);const active=entry.index===courseTrial&&round?.courseRun===courseRun;
 if(active&&stage==='prepare')round.prepareMs+=performance.now()-prepareStart;
 if(active&&settings.prep==='physical'){round.pendingOutcome='left_active';return;}
 const scenario=active?round.scenario:createRecipeScenario(settings.coursePhase,settings.courseLevel,entry.index,settings.recipes,entry.client);
 const base=active?round:{sessionNo:++sessionCounter,client:entry.client,orders:scenario.initial.orders,initialOrders:scenario.initial.orders,drafts:createBurgers(scenario.initial.orders.length),supports:0,bookConsults:0,interrupted:false,prepareMs:0,settings:{...settings},scenario,expected:scenario.initial,events:scenario.events,eventLog:[],courseTrial:entry.index+1,courseRun};
 history.push(createAttemptRecord(base,{outcome:active?'left_active':'left_waiting',actual:active?round.drafts:null,entry}));
}
function showExpiredFeedback(entry){
 if(settings.prep==='physical'){round.pendingOutcome='left_active';stage='checking';reviewPhysical();return;}
 const record=history.find(x=>x.courseRun===courseRun&&x.courseTrial===entry.index+1&&x.settings.mode==='recipes');departAndContinue(record);
}
function updateCustomerFace(container,mood){const face=container?.querySelector('.customer-face');if(face&&face.dataset.expression!==mood)face.outerHTML=customerFaceArt(mood)}
function renderQueue(){
 const enabled=settings?.mode==='recipes'&&!!courseLine;$('recipeQueuePanel').classList.toggle('hidden',!enabled);$('queueActors').classList.toggle('hidden',!enabled);if(!enabled)return;
 const running=lineClockRunning(),signature=courseLine.entries.map(e=>e.status+customerMood(e).key).join('|')+stage+courseLine.paused+running;
 if(signature!==queueRenderKey){queueRenderKey=signature;const waiting=courseLine.entries.filter(e=>e.status==='waiting').length;$('queueSummary').textContent=waiting?waiting+' '+(waiting===1?'cliente espera':'clientes esperan')+' detrás.':lineFinished(courseLine)?'La fila ha terminado.':'El último cliente está en el mostrador.';
  $('queueCards').innerHTML=courseLine.entries.map(e=>{const mood=customerMood(e);return `<article class="queue-card ${e.status}" data-mood="${mood.key}"><div class="queue-avatar">${clientArt(e.client,mood.key)}</div><div><span class="queue-position">${e.index+1} · ${e.status==='active'?'EN EL MOSTRADOR':e.status==='waiting'?'DETRÁS EN LA FILA':e.status==='served'?'ENTREGADO':'SE RETIRÓ'}</span><h4>${e.client.name}</h4><span class="customer-mood">${mood.label}</span></div></article>`}).join('');
  $('queueClockNote').textContent=courseLine.paused?'Fila pausada por el terapeuta. Pulsa «Reanudar fila» para continuar.':!courseLine.started?'Al ver el primer pedido empieza la espera. Observa cómo cambian sus caras.':running?'La fila sigue esperando. Quien pide cuenta con un margen para cocinar; observa sus caras.':'Fila en pausa durante la llegada, el aviso, el recetario o la revisión.';
  $('pauseQueue').textContent=courseLine.paused?'Reanudar fila':'Pausar fila';$('pauseQueue').disabled=!['waiting','prepare'].includes(stage);
 }
 const actorKey=courseLine.entries.map(e=>e.status).join('|');if(actorKey!==queueActorKey){queueActorKey=actorKey;const waitingEntries=courseLine.entries.filter(e=>e.status==='waiting');$('queueActors').innerHTML=waitingEntries.map((e,i)=>`<div class="line-actor" data-line-index="${e.index}" style="--place:${i}"><span>${e.client.name}</span>${walkingClientArt(e.client,customerMood(e).key)}</div>`).join('');}
 for(const e of courseLine.entries){const mood=customerMood(e);const actor=$('queueActors').querySelector(`[data-line-index="${e.index}"]`);updateCustomerFace(actor,mood.key);if(e.index===courseTrial)updateCustomerFace($('clientPortrait'),mood.key);}
}
$('pauseQueue').onclick=()=>{
 if(!courseLine||!['waiting','prepare'].includes(stage))return;tickLine();if(!['waiting','prepare'].includes(stage))return;const paused=!courseLine.paused;if(stage==='prepare'){if(paused)round.prepareMs+=performance.now()-prepareStart;else prepareStart=performance.now();}courseLine={...courseLine,paused};lineLastTick=performance.now();$('viewOrder')&&($('viewOrder').disabled=paused);renderKitchen();renderQueue();
};

function runExposure(){
 clearInterval(timer);
 const update=()=>{if(!exposureClock||exposureClock.paused)return;const remain=exposureClock.tick();$('secondsLeft').textContent=Math.ceil(remain/1000);$('timeFill').style.width=100*remain/(settings.exposure*1000)+'%';if(remain<=0)hideOrder();};
 update();if(exposureClock)timer=setInterval(update,60);
}
function pauseChallenge(){
 if(settings?.mode!=='challenge'||!['expose','prepare'].includes(stage)||challengePaused)return;
 challengePaused=true;clearInterval(timer);exposureClock?.pause();
 if(stage==='expose')round.interrupted=true;else round.prepareMs+=performance.now()-prepareStart;
 document.body.classList.add('activity-paused');setBubble('<h2>Restaurante en pausa</h2><p>El pedido está oculto mientras descansas.</p>');ambience.stop();$('challengePause').showModal();
}
$('resumeChallenge').onclick=()=>{
 $('challengePause').close();challengePaused=false;document.body.classList.remove('activity-paused');ambience.start();
 if(stage==='expose'){recipe();exposureClock?.resume();runExposure();}else{prepareStart=performance.now();readyBubble();}
};
$('challengePause').addEventListener('cancel',e=>e.preventDefault());
document.addEventListener('neurama:pause',pauseService);
function pauseService(){
 if(!['service','recipeStudy'].includes(screen)||servicePaused||challengePaused||document.querySelector('dialog[open]'))return;
 if(settings.mode==='challenge'&&['expose','prepare'].includes(stage)){pauseChallenge();return;}
 if(settings.mode==='recipes')tickLine();
 queueWasPaused=!!courseLine?.paused;
 if(settings.mode==='recipes'&&courseLine){
  if(stage==='prepare'&&!queueWasPaused)round.prepareMs+=performance.now()-prepareStart;
  courseLine={...courseLine,paused:true};
 }
 if(motionJob){motionJob.remainingMs=Math.max(0,motionJob.remainingMs-(performance.now()-motionJob.startedAt));clearTimeout(arrivalTimer);}
 servicePaused=true;ambience.stop();document.body.classList.add('activity-paused');$('servicePause').showModal();
}
$('resumeService').onclick=()=>{
 if(document.hidden)return;
 $('servicePause').close();servicePaused=false;document.body.classList.remove('activity-paused');
 if(settings.mode==='recipes'&&courseLine){courseLine={...courseLine,paused:queueWasPaused};lineLastTick=performance.now();if(stage==='prepare'&&!queueWasPaused)prepareStart=performance.now();renderKitchen();renderQueue();}
 if(motionJob)runMotion();if(screen==='service')ambience.start();
};
$('servicePause').addEventListener('cancel',e=>{e.preventDefault();$('resumeService').click()});
function endService(){
 // A prepared but undelivered order stays explicitly incomplete. Never add it
 // twice if the delivery or withdrawal was already recorded.
 const exists=round&&history.some(x=>x.sessionNo===round.sessionNo);
 if(screen==='service'&&round&&!exists){
  if(stage==='prepare'&&!challengePaused&&!servicePaused)round.prepareMs+=performance.now()-prepareStart;
  const started=['expose','prepare','update'].includes(stage);
  const actual=started&&settings.prep==='digital'?round.drafts.map(x=>[...x]):null;
  const entry=settings.mode==='recipes'?courseLine?.entries[courseTrial]:null;
  history.push(createAttemptRecord(round,{outcome:'interrupted',actual,entry}));
 }
 report();
}
$('endService').onclick=endService;$('endChallenge').onclick=endService;$('homeReport').onclick=report;
