import {activities,processes,filterActivities,cleanPlan,planText} from './catalog.mjs';
import {icon,activityArt} from './icons.mjs';
import {saveText} from './downloads.mjs';
import {createClinic} from './clinic.mjs';
import {escapeHTML as e,normalizePlan,createId} from './clinic-domain.mjs';

const $=id=>document.getElementById(id);
const find=id=>activities.find(a=>a.id===id);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
let favorites=read('neurama-favorites',[]);
favorites=Array.isArray(favorites)?[...new Set(favorites.filter(id=>find(id)))]:[];
let plan=cleanPlan(read('neurama-plan',[]));
let completed=new Set(),view='home',query='',process='',kind='',currentPlayer=null,toastTimeout;
let clinic,linkedSession=null,linkedDirty=false,pendingPlanSwitch=null,customEditId=null;
const clone=value=>structuredClone(value);
const memoryStore=(changed=true)=>{try{localStorage.setItem('neurama-favorites',JSON.stringify(favorites));if(changed&&!linkedSession)localStorage.setItem('neurama-plan',JSON.stringify(plan));}catch{}if(changed&&linkedSession){linkedDirty=true;renderLinkedContext();}};
const isPlanned=id=>plan.some(p=>p.id===id);
const tags=a=>a.tags.map(t=>`<span class="tag">${t}</span>`).join('');
function refreshIcons(root=document){root.querySelectorAll('[data-icon]').forEach(node=>{node.innerHTML=icon(node.dataset.icon);});}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),3100);}
function updateCounts(){ $('sessionCount').textContent=plan.length;$('favoriteCount').textContent=favorites.length; }
function add(id){const a=find(id);if(!a)return;if(isPlanned(id)){toast('Esta actividad ya está en tu sesión.');return;}plan.push({id,minutes:a.minutes});memoryStore();renderCollection();renderSession();updateCounts();toast(`${a.title}: agregada a tu sesión.`);updateDetailActions(id);}
function favorite(id){favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];memoryStore(false);updateCounts();renderCollection();}
function filters(){ $('processFilters').innerHTML=['',...processes].map(p=>`<button data-process="${p}" class="${process===p?'selected':''}" aria-pressed="${process===p}">${p||'Todos los procesos'}</button>`).join(''); }
function activityCard(a){return `<article class="activity-card" data-activity="${a.id}"><div class="card-visual ${a.theme}"><button class="card-preview" data-detail="${a.id}" aria-label="Ver detalles de ${a.title}">${activityArt(a.art)}</button><button class="favorite-button ${favorites.includes(a.id)?'is-favorite':''}" data-favorite="${a.id}" aria-pressed="${favorites.includes(a.id)}" aria-label="${favorites.includes(a.id)?'Quitar':'Guardar'} ${a.title} ${favorites.includes(a.id)?'de':'en'} favoritos">${icon('star')}</button></div><div class="card-content"><h3>${a.title}</h3><p class="card-description">${a.description}</p><div class="tags">${tags(a)}</div><div class="card-meta">${icon('clock')}<span>${a.minutes} min${a.kind==='material'?' · '+a.pages+' páginas':''}</span></div><div class="card-actions">${a.kind==='app'?`<button class="card-main-action" data-open="${a.id}">Comenzar ${icon('arrow')}</button>`:`<a class="card-main-action" href="${a.view}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${a.title} para imprimir, abre otra pestaña">Abrir material ${icon('external')}</a>`}<button class="info-button" data-detail="${a.id}" aria-label="Guía de ${a.title}">${icon('info')}</button><button class="add-button ${isPlanned(a.id)?'added':''}" data-add="${a.id}" aria-label="${isPlanned(a.id)?'Ya está en tu sesión:':'Agregar a mi sesión:'} ${a.title}">${icon(isPlanned(a.id)?'check':'plus')}</button></div></div></article>`;}
function renderCollection(){
 const filtered=filterActivities({query,process,kind,favorites:view==='favorites'?favorites:null});
 $('collectionTitle').textContent=view==='favorites'?'Favoritos':'Actividades';
 $('resultCount').textContent=filtered.length+' actividad'+(filtered.length===1?'':'es');
 $('clearFilters').classList.toggle('hidden',!query&&!process);
 document.querySelectorAll('[data-kind]').forEach(b=>{b.classList.toggle('selected',b.dataset.kind===kind);b.setAttribute('aria-pressed',b.dataset.kind===kind);});
 $('activityGrid').innerHTML=[['app','En línea'],['material','Para imprimir']].map(([type,label])=>{const items=filtered.filter(a=>a.kind===type);if(!items.length)return '';return `<section class="collection-group" aria-labelledby="group-${type}"><div class="collection-group-title"><h2 id="group-${type}">${label}</h2><span>${items.length}</span></div><div class="activity-grid">${items.map(activityCard).join('')}</div></section>`;}).join('');
 $('printTemplate').classList.toggle('hidden',!['home','print'].includes(view)||!!query||!!process||kind==='app');
 const empty=!filtered.length;$('emptyState').classList.toggle('hidden',!empty);
 if(empty){$('emptyState').querySelector('h3').textContent=view==='favorites'&&!favorites.length?'Todavía no tienes favoritos.':'No encontramos actividades.';$('emptyState').querySelector('p').textContent=view==='favorites'&&!favorites.length?'Usa la estrella para guardar una actividad.':'Prueba otro proceso o una palabra más corta.';}
}
function navigate(next){
 if(next==='collection')next='home';
 const collectionViews=['home','online','print','favorites'];
 if(collectionViews.includes(next)&&next!==view){query='';process='';$('search').value='';kind=next==='online'?'app':next==='print'?'material':'';filters();}
 view=next;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 $('collectionView').classList.toggle('hidden',!collectionViews.includes(view));$('sessionView').classList.toggle('hidden',view!=='session');
 $('breadcrumb').textContent={home:'Inicio',online:'En línea',print:'Para imprimir',dashboard:'Mi espacio',calendar:'Calendario',patients:'Mis pacientes',profile:'Mi perfil',session:'Mi sesión',favorites:'Favoritos'}[view]||'Inicio';
 $('sidebar').classList.remove('open');$('mobileMenu').setAttribute('aria-expanded','false');clinic?.render(next);
 if(collectionViews.includes(view))renderCollection();else if(view==='session')renderSession();window.scrollTo({top:0,behavior:'instant'});
}
function resetFilters(){query='';process='';kind=view==='online'?'app':view==='print'?'material':'';$('search').value='';filters();renderCollection();}
function renderSession(){
  if(linkedSession&&!linkedDirty&&clinic){const saved=clinic.getSession(linkedSession.id);if(saved){linkedSession=saved;plan=cleanPlan(saved.plan);}else{linkedSession=null;plan=cleanPlan(read('neurama-plan',[]));completed.clear();}updateCounts();}
  $('plannedCount').textContent=plan.length+' actividad'+(plan.length===1?'':'es');$('plannedMinutes').textContent=plan.reduce((s,p)=>s+p.minutes,0);$('sessionEmpty').classList.toggle('hidden',plan.length>0);$('exportPlan').disabled=!plan.length;$('resetSession').disabled=!plan.length;
  $('sessionList').innerHTML=plan.map((p,i)=>{const a=find(p.id),done=completed.has(p.id),title=e(a?.title||p.custom.title);return `<article class="session-card ${done?'done':''}" data-session-activity="${p.id}"><span class="session-number">${String(i+1).padStart(2,'0')}</span><div class="session-art ${a?.theme||'rose'}">${activityArt(a?.art||'steps')}</div><div class="session-description"><h3>${title}</h3><div class="tags">${a?tags(a):'<span class="tag">Actividad propia</span>'}</div>${p.custom?`<p class="custom-goal">${e(p.custom.goal)}</p>`:''}<label class="duration"><input type="number" min="1" max="60" value="${p.minutes}" data-minutes="${p.id}" aria-label="Minutos previstos para ${title}"> min previstos</label><button class="session-completed" data-complete="${p.id}" aria-pressed="${done}"><span class="check-circle">${done?icon('check'):''}</span>${done?'Realizada':'Marcar como realizada'}</button></div><div class="session-tools">${a?`<button class="button button-outline" data-${a.kind==='app'?'open':'detail'}="${a.id}">${a.kind==='app'?'Comenzar':'Ver material'} ${icon(a.kind==='app'?'play':'external')}</button>`:`<button class="button button-outline" data-customedit="${p.id}">Ver / editar ${icon('info')}</button>${p.custom.url?`<a class="icon-button" href="${e(p.custom.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir material de ${title}">${icon('external')}</a>`:''}`}<button class="icon-button" data-up="${p.id}" ${i===0?'disabled':''} aria-label="Subir ${title}">${icon('up')}</button><button class="icon-button" data-down="${p.id}" ${i===plan.length-1?'disabled':''} aria-label="Bajar ${title}">${icon('down')}</button><button class="icon-button" data-remove="${p.id}" aria-label="Quitar ${title} de la sesión">${icon('trash')}</button></div></article>`;}).join('');
  const n=plan.filter(p=>completed.has(p.id)).length;$('completedCount').textContent=plan.length?`${n} de ${plan.length} realizadas`:'';
  $('bookCurrentPlan').disabled=!plan.length||!!linkedSession;renderLinkedContext();
}
function renderLinkedContext(){const host=$('linkedContext');host.classList.toggle('hidden',!linkedSession);if(!linkedSession){host.replaceChildren();return;}const a=linkedSession,total=plan.reduce((n,p)=>n+p.minutes,0);host.innerHTML=`<div><span class="eyebrow">PLAN DE UNA CITA${clinic?.isDemo()?' · DEMOSTRACIÓN':''}</span><h2>${e(a.patientName||'Paciente')}</h2><p>${e(a.date)} · ${e(a.time)} · ${a.duration} min reservados</p>${a.goal?`<p class="pre-wrap">${e(a.goal)}</p>`:''}<small>${linkedDirty?'Cambios sin guardar':'Plan guardado en esta cita'} · ${total} min previstos${total>a.duration?' · Supera la duración de la cita':''}</small></div><div class="form-actions"><button class="button button-primary" data-linked-save ${linkedDirty?'':'disabled'}>Guardar plan ${icon('check')}</button><button class="button button-outline" data-linked-cita>Ver cita</button><button class="text-button" data-linked-new>Preparar otro plan</button></div>`;}
function ensureSaved(action){if(linkedSession&&linkedDirty){pendingPlanSwitch=action;$('planSwitchDialog').showModal();}else action();}
function loadLinkedSession(context){ensureSaved(()=>{linkedSession=clone(context);plan=cleanPlan(context.plan);linkedDirty=false;completed.clear();updateCounts();renderCollection();navigate('session');});}
async function saveLinkedPlan(){if(!linkedSession||!linkedDirty)return true;const buttons=document.querySelectorAll('[data-linked-save],#saveBeforeSwitch');buttons.forEach(b=>b.disabled=true);try{linkedSession=await clinic.savePlan(linkedSession,clone(plan));linkedDirty=false;renderLinkedContext();toast('Plan guardado en la cita.');return true;}catch(err){toast(err.message);return false;}finally{buttons.forEach(b=>b.disabled=false);renderLinkedContext();}}
function newGeneralPlan(){ensureSaved(()=>{linkedSession=null;linkedDirty=false;plan=cleanPlan(read('neurama-plan',[]));completed.clear();updateCounts();renderCollection();navigate('session');});}
function customActivity(id=null){customEditId=id;const p=plan.find(p=>p.id===id),f=$('customActivityForm');f.reset();f.querySelector('.form-error').textContent='';for(const [key,value] of Object.entries(p?{...p.custom,minutes:p.minutes}:{minutes:10}))if(f.elements.namedItem(key))f.elements.namedItem(key).value=value;$('customActivityHeading').textContent=id?'Tu actividad.':'Agregar actividad.';$('customActivityDialog').showModal();}
function move(id,delta){const i=plan.findIndex(p=>p.id===id),j=i+delta;if(i<0||j<0||j>=plan.length)return;[plan[i],plan[j]]=[plan[j],plan[i]];memoryStore();renderSession();const b=document.querySelector(`[data-${delta<0?'up':'down'}="${id}"]`);if(b&&!b.disabled)b.focus();}
function updateDetailActions(id){
  const a=find(id);if(!a||$('detailDialog').dataset.activity!==id)return;
  $('detailActions').innerHTML=(a.kind==='app'?`<button class="button button-primary" data-open="${a.id}">Abrir actividad ${icon('arrow')}</button>`:`<a class="button button-primary" href="${a.view}" target="_blank" rel="noopener noreferrer">Ver en Canva ${icon('external')}</a><a class="button button-outline" href="${a.edit}" target="_blank" rel="noopener noreferrer">Editar en Canva ${icon('external')}</a>`)+`<button class="button button-outline" data-add="${a.id}">${icon(isPlanned(id)?'check':'plus')}${isPlanned(id)?'En mi sesión':'Agregar a mi sesión'}</button>`;
}
function detail(id){const a=find(id);if(!a)return;$('detailDialog').dataset.activity=id;$('detailKind').textContent=a.kind==='app'?'APLICACIÓN · DENTRO DE NEURAMA':'MATERIAL EDITABLE · CANVA';$('detailArt').className='detail-art '+a.theme;$('detailArt').innerHTML=activityArt(a.art);$('detailTitle').textContent=a.title;$('detailDescription').textContent=a.description;$('detailTags').innerHTML=tags(a);$('detailObjective').textContent=a.objective;$('detailSteps').innerHTML=a.steps.map(s=>`<li>${s}</li>`).join('');$('detailSettings').textContent=a.settings;$('detailObserve').textContent=a.observe;updateDetailActions(id);$('detailDialog').showModal();}
function openActivity(id){const a=find(id);if(!a||a.kind!=='app')return;if(currentPlayer)return;currentPlayer=id;if($('detailDialog').open)$('detailDialog').close();$('sidebar').classList.remove('open');$('playerTitle').textContent=a.title;const frame=document.createElement('iframe');frame.src=a.path;frame.title=a.title+' · Actividad de Libemor';frame.allow='autoplay; fullscreen';frame.setAttribute('allowfullscreen','');$('frameHost').replaceChildren(frame);$('player').classList.remove('hidden');document.body.classList.add('player-open');$('shell').inert=true;$('sidebar').inert=true;$('closePlayer').focus();}
function closeActivity(){if($('exitDialog').open)$('exitDialog').close();$('frameHost').replaceChildren();currentPlayer=null;$('player').classList.add('hidden');$('player').classList.remove('focus-mode');document.body.classList.remove('player-open');$('shell').inert=false;$('sidebar').inert=false;const trigger=document.querySelector(`[data-open="${$('player').dataset.last||''}"]`);(trigger||$('main')).focus();}
function requestExit(){if(!currentPlayer)return;$('player').dataset.last=currentPlayer;const frame=$('frameHost').querySelector('iframe');frame?.contentWindow?.postMessage({type:'neurama:pause'},location.origin);$('exitDialog').showModal();}
function downloadPlan(){if(!plan.length)return;const prefix=linkedSession?`Profesional: ${linkedSession.therapistName}\nPaciente: ${linkedSession.patientName}\nCita: ${linkedSession.date} · ${linkedSession.time}\nObjetivo: ${linkedSession.goal||'No indicado'}\n\n`:'';saveText(prefix+planText(plan),'Neurama-plan-de-sesion.txt','text/plain;charset=utf-8');toast('Tu plan está listo para descargar.');}

document.addEventListener('click',e=>{
 const b=e.target.closest('button,a');if(!b)return;
 if(b.dataset.view){navigate(b.dataset.view);return;}
 if('linkedSave'in b.dataset){saveLinkedPlan();return;}
 if('linkedCita'in b.dataset){ensureSaved(()=>clinic.showAppointment(linkedSession.id));return;}
 if('linkedNew'in b.dataset){newGeneralPlan();return;}
 if(b.dataset.customedit){customActivity(b.dataset.customedit);return;}
 if('process'in b.dataset){process=b.dataset.process;filters();renderCollection();return;}
 if('kind'in b.dataset){navigate(b.dataset.kind==='app'?'online':b.dataset.kind==='material'?'print':'home');return;}
 for(const [key,handler] of Object.entries({open:openActivity,detail,favorite,add,up:id=>move(id,-1),down:id=>move(id,1),complete:id=>{completed.has(id)?completed.delete(id):completed.add(id);renderSession();},remove:id=>{plan=plan.filter(p=>p.id!==id);completed.delete(id);memoryStore();renderSession();renderCollection();updateCounts();toast('Actividad retirada del plan.');}})){if(b.dataset[key]){handler(b.dataset[key]);return;}}
 if(b.dataset.close)$(b.dataset.close).close();
});
$('search').addEventListener('input',e=>{query=e.target.value;renderCollection();});
function updateMinutes(e,commit=false){if(!e.target.dataset.minutes)return;const p=plan.find(p=>p.id===e.target.dataset.minutes);if(!p)return;const value=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(value))p.minutes=Math.max(1,Math.min(60,Math.round(value)));if(commit)e.target.value=p.minutes;memoryStore();$('plannedMinutes').textContent=plan.reduce((s,item)=>s+item.minutes,0);}
$('sessionList').addEventListener('input',e=>updateMinutes(e));
$('sessionList').addEventListener('change',e=>updateMinutes(e,true));
$('prepareSession').onclick=()=>navigate('session');
$('newCustomActivity').onclick=()=>customActivity();
$('bookCurrentPlan').onclick=()=>clinic.openBooking({plan:clone(plan)});
$('customActivityForm').onsubmit=event=>{event.preventDefault();const f=event.currentTarget,values=Object.fromEntries(new FormData(f));try{const entry=normalizePlan([{id:customEditId||'custom_'+createId(),minutes:Number(values.minutes),custom:values}])[0];if(!customEditId&&plan.length>=30)throw new Error('El plan admite hasta 30 actividades.');const index=plan.findIndex(p=>p.id===customEditId);if(index<0)plan.push(entry);else plan[index]=entry;memoryStore();renderSession();updateCounts();$('customActivityDialog').close();toast('Actividad guardada en el plan.');}catch(err){f.querySelector('.form-error').textContent=err.message;}};
$('saveBeforeSwitch').onclick=async()=>{if(await saveLinkedPlan()){const action=pendingPlanSwitch;pendingPlanSwitch=null;$('planSwitchDialog').close();action?.();}};
$('discardBeforeSwitch').onclick=()=>{const action=pendingPlanSwitch;pendingPlanSwitch=null;linkedDirty=false;$('planSwitchDialog').close();action?.();};
$('planSwitchDialog').addEventListener('close',()=>{pendingPlanSwitch=null;});
for(const id of ['sessionExplore','addMore'])$(id).onclick=()=>{resetFilters();navigate('collection');};
for(const id of ['clearFilters','emptyReset'])$(id).onclick=()=>{if(view==='favorites'&&!favorites.length)navigate('collection');resetFilters();};
$('guideButton').onclick=()=>$('guideDialog').showModal();
$('mobileMenu').onclick=()=>{const open=$('sidebar').classList.toggle('open');$('mobileMenu').setAttribute('aria-expanded',open);};
$('shell').addEventListener('click',e=>{if(!$('mobileMenu').contains(e.target)){$('sidebar').classList.remove('open');$('mobileMenu').setAttribute('aria-expanded','false');}});
$('closePlayer').onclick=requestExit;$('confirmExit').onclick=closeActivity;
$('playerHelp').onclick=()=>toast('La guía y el registro están dentro del juego. Descarga el registro antes de cerrar.');
$('resetSession').onclick=()=>{if(plan.length)$('resetDialog').showModal();};
$('confirmReset').onclick=()=>{plan=[];completed.clear();memoryStore();renderSession();renderCollection();updateCounts();$('resetDialog').close();toast('Tu plan está vacío.');};
$('exportPlan').onclick=downloadPlan;
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();navigate('home');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&currentPlayer&&!document.querySelector('dialog[open]')){e.preventDefault();requestExit();}});
window.addEventListener('beforeunload',e=>{if(currentPlayer||linkedDirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key==='neurama-favorites'){const r=read(e.key,[]);favorites=Array.isArray(r)?[...new Set(r.filter(id=>find(id)))]:[];}else if(e.key==='neurama-plan'&&!linkedSession)plan=cleanPlan(read(e.key,[]));else return;updateCounts();renderCollection();renderSession();});
refreshIcons();filters();updateCounts();renderCollection();renderSession();
clinic=createClinic({navigate,notify:toast,openSessionPlan:loadLinkedSession});const entry=new URLSearchParams(location.search).get('view');navigate(['profile','calendar','patients','dashboard'].includes(entry)?entry:'home');

window.addEventListener('message',event=>{const frame=$('frameHost').querySelector('iframe');if(event.origin!==location.origin||event.source!==frame?.contentWindow||event.data?.type!=='neurama:download')return;const {text,filename,mime}=event.data;if(typeof text!=='string'||text.length>5000000||!['chef-por-un-dia-registro.csv','estacion-sonidos-registro.csv','primero-el-plan-registro.csv','mision-mochila-registro.csv','vuelo-colores-registro.csv'].includes(filename))return;saveText(text,filename,mime==='text/plain;charset=utf-8'?mime:'text/csv;charset=utf-8');toast('Registro preparado para descargar.');});

// Only the active, same-origin bird activity can hide the surrounding player bar.
window.addEventListener('message',event=>{
 const frame=$('frameHost').querySelector('iframe');
 if(!['aves','chef','plan','sonidos','mochila'].includes(currentPlayer)||event.origin!==location.origin||event.source!==frame?.contentWindow||event.data?.type!=='neurama:focus-mode'||typeof event.data.active!=='boolean')return;
 $('player').classList.toggle('focus-mode',event.data.active);
});
