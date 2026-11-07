import {inventory,names,shuffle,createMission,recordMission,missionCsv} from './core.mjs';
import {ActiveCountdown} from '../../clock.mjs';
import {renderFeedback} from '../../feedback.mjs';
import {missionFeedback} from '../../feedback-data.mjs';
import {downloadText} from '../../downloads.mjs';
import {createActivityFocus} from '../../activity-focus.mjs';
import {materialArt,backpackArt} from './art.mjs';
const $=id=>document.getElementById(id);
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let mission=null,selected=new Set(),initialSnapshot=[],phase=0,screen='setup',timer=null,clock=null,clockTarget=null,clockDone=null,supports=0,pauses=0,bank=[],previousMission=null,history=[];
const buttons=new Map(),slots=new Map(),flights=new Map();
const focus=createActivityFocus({activity:'mochila',home:'setup',activeScreens:['instruction','choose','update','finish'],onPause:pauseGame});
$('setupBag').innerHTML=backpackArt('full','setup');
$('packBack').innerHTML=backpackArt('back','scene');
$('packFront').innerHTML=backpackArt('front','scene');
function show(id){screen=id;document.body.dataset.gameScreen=id;for(const name of ['setup','instruction','choose','update','finish','result'])$(name).classList.toggle('hide',name!==id);focus.screen(id);window.scrollTo({top:0,behavior:'instant'});}
function stopClock(){clearInterval(timer);timer=null;clock=null;}
function tick(){if(!clock||clock.paused)return;const remain=clock.tick();$(clockTarget).textContent=Math.ceil(remain/1000)+' s';if(remain<=0){const done=clockDone;stopClock();done();}}
function countdown(id,seconds,onEnd){stopClock();clock=new ActiveCountdown(seconds*1000);clockTarget=id;clockDone=onEnd;tick();timer=setInterval(tick,100);}
function syncActions(){const waiting=flights.size>0;$('change').disabled=waiting;$('done').disabled=waiting;}
function cancelTransfer(key){const f=flights.get(key);if(!f)return;flights.delete(key);f.animation.cancel();f.node.remove();}
function clearTransfers(){for(const key of [...flights.keys()])cancelTransfer(key);syncActions();}
function pauseTransfers(){for(const f of flights.values())f.animation.pause();}
function resumeTransfers(){for(const f of flights.values())f.animation.play();}
function syncMaterials(){
 for(const [key,b] of buttons){const saved=selected.has(key),name=inventory.find(x=>x[0]===key)[2];b.classList.toggle('selected',saved);b.setAttribute('aria-pressed',saved);b.setAttribute('aria-label',(saved?'Sacar ':'Guardar ')+name);}
 for(const node of $('bag').querySelectorAll('[data-packed]'))if(!selected.has(node.dataset.packed))node.remove();
 for(const key of selected){
  let node=$('bag').querySelector(`[data-packed="${key}"]`);
  if(!node){node=document.createElement('button');node.type='button';node.className='packed-item';node.dataset.packed=key;node.innerHTML=materialArt(key);node.setAttribute('aria-label','Sacar '+inventory.find(x=>x[0]===key)[2]);node.onclick=()=>toggleMaterial(key,node);$('bag').appendChild(node);}
  const slot=slots.get(key);node.style.setProperty('--slot',slot);node.style.setProperty('--row',slot%2);node.style.setProperty('--tilt',(slot%2?5:-5)+'deg');
  node.classList.toggle('waiting-to-pack',!!flights.get(key)?.adding);
 }
 $('bag').setAttribute('aria-label',selected.size?'Materiales guardados: '+names([...selected]):'Mochila vacía');
 syncActions();
}
function buildMaterials(){
 buttons.clear();$('items').replaceChildren();$('bag').replaceChildren();slots.clear();
 for(const [key,,name] of bank){
  const b=document.createElement('button');b.type='button';b.className='material-card';b.dataset.material=key;b.draggable=true;
  b.innerHTML=`${materialArt(key)}<span class="material-name">${name}</span><span class="selected-mark" aria-hidden="true">✓</span>`;
  b.onclick=()=>toggleMaterial(key,b);
  b.ondragstart=e=>{if(screen!=='choose'){e.preventDefault();return;}e.dataTransfer.setData('text/plain',key);e.dataTransfer.effectAllowed='copy';b.classList.add('dragging');};
  b.ondragend=()=>{b.classList.remove('dragging');$('bagDropTarget').classList.remove('drop-ready');};
  buttons.set(key,b);$('items').appendChild(b);
 }
 $('bagStatus').textContent='La mochila está vacía.';syncMaterials();
}
function animateTransfer(key,adding,sourceRect){
 if(motion.matches)return;
 const scene=$('packScene'),sceneRect=scene.getBoundingClientRect(),mouth=$('packMouth').getBoundingClientRect();
 const destination=(buttons.get(key).querySelector('svg')||buttons.get(key)).getBoundingClientRect();
 const from=adding?sourceRect:mouth,to=adding?mouth:destination;
 const node=document.createElement('span');node.className='material-flight';node.setAttribute('aria-hidden','true');node.innerHTML=materialArt(key);scene.appendChild(node);
 const w=node.offsetWidth,h=node.offsetHeight;
 node.style.left=(from.x+from.width/2-sceneRect.x-w/2)+'px';node.style.top=(from.y+from.height/2-sceneRect.y-h/2)+'px';
 const dx=to.x+to.width/2-(from.x+from.width/2),dy=to.y+to.height/2-(from.y+from.height/2);
 const frames=adding?[
  {transform:'translate(0,0) rotate(-6deg) scale(1)'},
  {transform:`translate(${dx*.75}px,${dy*.75-40}px) rotate(4deg) scale(.95)`,offset:.7},
  {transform:`translate(${dx}px,${dy+h*.65}px) rotate(0deg) scale(.72)`}
 ]:[
  {transform:`translate(0,${h*.65}px) rotate(0deg) scale(.72)`},
  {transform:'translate(0,-28px) rotate(-4deg) scale(.95)',offset:.25},
  {transform:`translate(${dx}px,${dy}px) rotate(0deg) scale(1)`}
 ];
 const animation=node.animate(frames,{duration:650,easing:'cubic-bezier(.3,.05,.28,1)',fill:'both'}),entry={node,animation,adding};
 flights.set(key,entry);
 if($('pauseDialog').open||$('supportDialog').open||document.hidden)animation.pause();
 const complete=()=>{if(flights.get(key)!==entry)return;flights.delete(key);node.remove();syncMaterials();};
 animation.finished.then(complete,complete);
}
function toggleMaterial(key,source,onlyAdd=false){
 if(screen!=='choose'||!buttons.has(key)||$('pauseDialog').open||$('supportDialog').open)return;
 const already=selected.has(key);if(onlyAdd&&already){$('bagStatus').textContent=inventory.find(x=>x[0]===key)[2]+' ya está en la mochila.';return;}
 const rect=(source.querySelector('svg')||source).getBoundingClientRect();cancelTransfer(key);
 if(already){selected.delete(key);slots.delete(key);}else{selected.add(key);const used=new Set(slots.values());slots.set(key,Array.from({length:inventory.length},(_,i)=>i).find(i=>!used.has(i)));}
 animateTransfer(key,!already,rect);syncMaterials();
 $('bagStatus').textContent=(already?'Sacaste: ':'Guardaste: ')+inventory.find(x=>x[0]===key)[2]+'.';
}
$('bagDropTarget').ondragover=e=>{if(screen!=='choose')return;e.preventDefault();e.dataTransfer.dropEffect='copy';$('bagDropTarget').classList.add('drop-ready');};
$('bagDropTarget').ondragleave=e=>{if(!$('bagDropTarget').contains(e.relatedTarget))$('bagDropTarget').classList.remove('drop-ready');};
$('bagDropTarget').ondrop=e=>{e.preventDefault();$('bagDropTarget').classList.remove('drop-ready');const key=e.dataTransfer.getData('text/plain');if(buttons.has(key))toggleMaterial(key,buttons.get(key),true);};
function resumeChoice(){show('choose');$('change').classList.add('hide');$('done').classList.remove('hide');syncMaterials();}
function conceal(on){$('rule').classList.toggle('concealed',on);$('changeRule').classList.toggle('concealed',on);}
function pauseGame(){
 if(!mission||['setup','result'].includes(screen)||document.querySelector('dialog[open]'))return;
 clock?.pause();pauseTransfers();conceal(true);pauses++;$('pauseDialog').showModal();
}
$('resume').onclick=()=>{if(document.hidden)return;$('pauseDialog').close();conceal(false);clock?.resume();resumeTransfers();};
$('pauseDialog').addEventListener('cancel',e=>{e.preventDefault();$('resume').click();});
$('leave').onclick=()=>{stopClock();clearTransfers();$('pauseDialog').close();mission=null;conceal(false);show('setup');};
document.addEventListener('neurama:pause',pauseGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
window.addEventListener('pagehide',()=>{stopClock();clearTransfers();});
$('start').onclick=()=>{
 clearTransfers();mission=createMission($('level').value,previousMission);previousMission=mission.id;selected=new Set();initialSnapshot=[];phase=0;supports=0;pauses=0;bank=shuffle(inventory);conceal(false);buildMaterials();
 $('change').classList.remove('hide');$('done').classList.add('hide');$('rule').textContent=mission.rule;show('instruction');countdown('count',15,()=>show('choose'));
};
$('go').onclick=()=>{if(screen!=='instruction')return;stopClock();show('choose');};
$('reviewRule').onclick=()=>{supports++;clock?.pause();pauseTransfers();$('supportText').textContent=mission.rule+(phase?'\n\n'+mission.change:'');$('supportDialog').showModal();};
$('closeSupport').onclick=()=>$('supportDialog').close();
$('supportDialog').addEventListener('close',()=>{if(!$('pauseDialog').open&&!document.hidden){clock?.resume();resumeTransfers();}});
$('change').onclick=()=>{if(screen!=='choose'||phase!==0||flights.size)return;initialSnapshot=[...selected];phase=1;$('changeRule').textContent=mission.change;show('update');countdown('changeCount',15,resumeChoice);};
$('back').onclick=()=>{if(screen!=='update')return;stopClock();resumeChoice();};
$('done').onclick=()=>{if(screen==='choose'&&phase===1&&!flights.size)show('finish');};
$('backToBag').onclick=()=>resumeChoice();
$('check').onclick=()=>{
 if(screen!=='finish')return;
 const record=recordMission(mission,initialSnapshot,[...selected],{supports,pauses});history.push(record);
 $('resultTitle').textContent=record.initial.correct&&record.final.correct?'¡Misión completada!':record.final.correct?'La mochila final está lista; revisemos el inicio.':'Revisemos juntos la mochila.';
 renderFeedback($('missionFeedback'),missionFeedback(record));
 $('feedback').textContent='La mochila final debía contener: '+names(mission.final)+'. '+(record.removed?'Retiraste el material cancelado. ':'Faltó retirar el material cancelado. ')+(record.added?'Agregaste el material nuevo.':'Faltó agregar el material nuevo.');
 $('recordNote').textContent=`Intentos registrados: ${history.length}. Pausas en este intento: ${pauses}. Los objetos extra se muestran aparte de los aciertos.`;show('result');
};
$('again').onclick=()=>show('setup');
$('download').onclick=()=>downloadText(missionCsv(history),'mision-mochila-registro.csv');
$('guide').onclick=()=>$('guideDialog').showModal();$('closeGuide').onclick=()=>$('guideDialog').close();
show('setup');
$('start').disabled=false;
