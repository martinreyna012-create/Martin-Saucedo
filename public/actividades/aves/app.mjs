import {colors,birdSVG,flyingBirdSVG,featherSVG} from './art.mjs';
import {fields,settings,createSchedule,flightPosition,recordPress,closeRound,summarize,feedbackModel,sessionCSV} from './core.mjs';
import {ActiveCountdown} from '../../clock.mjs';
import {renderFeedback} from '../../feedback.mjs';
import {downloadText} from '../../downloads.mjs';

const $=id=>document.getElementById(id);
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let run=null,phase='idle',clock=null,roundIndex=0,paused=false,frameId=null,runSerial=0,pointerScene=null;
const featherBursts=new Set();
function clearFeathers(){for(const burst of featherBursts){for(const animation of burst.animations)animation.cancel();burst.node.remove();}featherBursts.clear();}
function selectedFeathers(bird,progress){
  // The feedback uses the selected bird's color, including a distractor. It
  // confirms the press without revealing whether the response was correct.
  const pos=flightPosition(bird,progress,{reducedMotion:motionPreference.matches});
  const node=document.createElement('span');node.className='feather-burst';node.dataset.color=bird.color;
  node.style.left=(Math.max(.18,Math.min(.82,pos.x))*100)+'%';node.style.top=(pos.y*100)+'%';
  $('featherLayer').appendChild(node);
  if(featherBursts.size>=4){const oldest=featherBursts.values().next().value;for(const a of oldest.animations)a.cancel();oldest.node.remove();featherBursts.delete(oldest);}
  const paths=[[-42,-15,-42],[-20,-37,-20],[16,-33,28],[40,-8,52],[12,26,14]],animations=[];
  paths.forEach(([x,y,rotation],i)=>{
    const feather=document.createElement('span');feather.className='selection-feather';feather.innerHTML=featherSVG(bird.color);node.appendChild(feather);
    const frames=motionPreference.matches?[{opacity:1,transform:`translate(${x*.45}px,${y*.45}px) rotate(${rotation}deg)`},{opacity:0,transform:`translate(${x*.45}px,${y*.45}px) rotate(${rotation}deg)`}]:[
      {opacity:1,transform:`translate(${x*.12}px,${y*.12}px) rotate(${rotation*.4}deg) scale(.7)`},
      {opacity:1,transform:`translate(${x}px,${y}px) rotate(${rotation}deg) scale(1)`,offset:.45},
      {opacity:0,transform:`translate(${x*1.2}px,${y+48}px) rotate(${rotation+36}deg) scale(.85)`}
    ];
    animations.push(feather.animate(frames,{duration:1100+i*40,easing:'ease-out',fill:'both'}));
  });
  const burst={node,animations};featherBursts.add(burst);
  Promise.allSettled(animations.map(a=>a.finished)).then(()=>{node.remove();featherBursts.delete(burst);});
}
$('colorOptions').insertAdjacentHTML('beforeend',colors.map(c=>`<label><input type="radio" name="color" value="${c.id}" ${c.id==='azul'?'checked':''}><span>${birdSVG(c.id)}<span>${c.name}</span></span></label>`).join(''));
const chosen=()=>colors.find(c=>c.id===document.querySelector('input[name=color]:checked').value);
const readConfig=()=>settings({target:chosen().id,level:document.querySelector('input[name=level]:checked').value,durationSeconds:$('duration').value,exposureMs:$('exposure').value,vision:$('vision').value});
function updateSetup(){
  const c=chosen();
  $('rulePreview').innerHTML=`Selecciona solo los <strong>${c.plural}.</strong>`;
}
$('setup').addEventListener('change',updateSetup);updateSetup();
function show(id){
  for(const s of document.querySelectorAll('.screen'))s.hidden=s.id!==id;
  document.body.classList.toggle('animation-only',id==='play');
  if(parent!==window)parent.postMessage({type:'neurama:focus-mode',active:id==='play'},location.origin);
}
function start(practice=false,config=null){
  cancelAnimationFrame(frameId);clearFeathers();const c=config||readConfig();
  run={id:`vuelo-${Date.now()}-${++runSerial}`,startedAt:new Date().toLocaleString('es-MX'),config:c,practice,rounds:createSchedule(c,{practice}),pauses:0,outside:0};
  roundIndex=0;paused=false;pointerScene=null;
  $('practiceFeedback').textContent='';$('sky').classList.remove('paused');
  $('sky').dataset.vision=c.vision;$('sky').style.setProperty('--lens-size',fields[c.vision].size+'px');
  $('flightCarrier').innerHTML='';$('birdGrid').disabled=true;$('birdGrid').inert=true;$('birdGrid').setAttribute('aria-pressed','false');
  $('stageMessage').textContent='Mira el color indicado…';$('stageMessage').hidden=false;
  phase='ready';clock=new ActiveCountdown(350);show('play');$('play').focus({preventScroll:true});frameId=requestAnimationFrame(animate);
  if(document.hidden)pause('La pestaña no está visible.');
}
function paintFlight(){
  if(phase!=='flight')return;
  const round=run.rounds[roundIndex],p=1-clock.remainingMs/round.exposureMs;
  const pos=flightPosition(round.birds[0],p,{reducedMotion:motionPreference.matches});
  $('flightCarrier').style.transform=`translate3d(${pos.x*100}%,${pos.y*100}%,0)`;
}
function beginRound(){
  if(roundIndex>=run.rounds.length){finish();return;}
  const round=run.rounds[roundIndex],bird=round.birds[0];phase='flight';
  $('stageMessage').hidden=true;
  $('flightCarrier').innerHTML=`<span class="flight-shape ${bird.direction===-1?'mirrored':''}">${flyingBirdSVG(bird.color)}</span>`;
  $('flightCarrier').dataset.color=bird.color;$('flightCarrier').dataset.scene=round.id;
  $('birdGrid').disabled=false;$('birdGrid').inert=false;$('birdGrid').setAttribute('aria-pressed','false');
  clock=new ActiveCountdown(round.exposureMs);paintFlight();
}
function endRound(){
  const round=run.rounds[roundIndex];closeRound(round,{complete:true});
  if(run.practice){
    const s=summarize([round]);
    $('practiceFeedback').textContent='Anterior: '+(s.omissions?'faltó responder al color indicado.':s.incorrect?'era otro color; había que esperar.':s.hits?'seleccionaste el color indicado.':'dejaste pasar otro color.');
  }
  roundIndex++;
  // Replace a single bird immediately: there is no blank interval or catch-up
  // loop that could count birds never actually rendered after a slow frame.
  if(roundIndex>=run.rounds.length){finish();return;}
  beginRound();
}
function animate(){
  if(phase==='idle'){frameId=null;return;}
  if(!paused){if(clock.tick()<=0){if(phase==='flight')endRound();else beginRound();}paintFlight();}
  if(phase!=='idle')frameId=requestAnimationFrame(animate);
}
function respond(){
  if(!run||paused||phase!=='flight')return;
  const round=run.rounds[roundIndex],remaining=clock.tick();
  if(remaining<=0){run.outside++;endRound();return;}
  const status=recordPress(round,{sceneId:round.id,birdId:round.birds[0].id,elapsedMs:round.exposureMs-remaining});
  if(['stale','unknown','outside'].includes(status))return;
  $('birdGrid').setAttribute('aria-pressed','true');
  selectedFeathers(round.birds[0],1-remaining/round.exposureMs);
  if(run.practice)$('practiceFeedback').textContent=status==='hit'?'¡Ese es el color indicado!':status==='repeated'?'Ya respondiste a este pájaro. Con una vez basta.':'Ese es otro color. Déjalo pasar.';
}
$('birdGrid').addEventListener('pointerdown',()=>{pointerScene=phase==='flight'?`${run.id}/${run.rounds[roundIndex].id}`:null;});
$('birdGrid').addEventListener('pointercancel',()=>{pointerScene=null;});
$('birdGrid').addEventListener('click',event=>{
  if(!run||paused||phase!=='flight')return;
  // A press begun on the preceding bird must not select its successor.
  if(event.detail>0&&pointerScene!==`${run.id}/${run.rounds[roundIndex].id}`){pointerScene=null;run.outside++;return;}
  pointerScene=null;respond();
});
$('birdGrid').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.repeat)event.preventDefault();});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&phase!=='idle'&&!paused&&!$('guideDialog').open){event.preventDefault();pause();return;}
  if(event.code!=='Space'||phase!=='flight'||paused)return;
  if(event.target.closest('input,select,textarea,button')&&event.target!==$('birdGrid'))return;
  event.preventDefault();if(!event.repeat)respond();
});
function pause(reason='Puedes continuar cuando estés listo.'){
  if(!run||phase==='idle'||paused)return;
  if(clock.tick()<=0){if(phase==='flight')endRound();else beginRound();}if(phase==='idle')return;
  clock.pause();paintFlight();paused=true;run.pauses++;pointerScene=null;
  for(const burst of featherBursts)for(const animation of burst.animations)animation.pause();
  $('sky').classList.add('paused');$('birdGrid').inert=true;
  $('stageMessage').hidden=false;$('stageMessage').textContent='En pausa';$('pauseReason').textContent=reason;
  $('endButton').textContent=run.practice?'Terminar práctica':'Terminar y ver registro';$('pauseDialog').showModal();
}
function resume(){
  if(!paused||document.hidden)return;
  $('pauseDialog').close();paused=false;clock.resume();$('sky').classList.remove('paused');
  for(const burst of featherBursts)for(const animation of burst.animations)animation.play();
  $('birdGrid').inert=phase!=='flight';$('stageMessage').hidden=phase==='flight';$('stageMessage').textContent='Mira el color indicado…';
  if(phase==='flight')$('birdGrid').focus({preventScroll:true});
}
function finish(){
  cancelAnimationFrame(frameId);clearFeathers();frameId=null;clock=null;phase='idle';paused=false;pointerScene=null;
  $('pauseDialog').close();$('birdGrid').inert=true;$('birdGrid').disabled=true;$('flightCarrier').innerHTML='';
  const s=summarize(run.rounds);
  if(run.practice){
    $('doneBird').innerHTML=flyingBirdSVG(run.config.target);
    $('practiceSummary').textContent=`${s.complete} pájaros observados · ${s.hits} de ${s.targets} objetivos seleccionados · Selecciones de otros colores: ${s.incorrect}${s.partial?' · práctica interrumpida':''}.`;
    show('practiceDone');return;
  }
  $('resultBird').innerHTML=flyingBirdSVG(run.config.target);
  const elapsed=run.rounds.reduce((n,r)=>n+(r.closed?r.elapsedMs:0),0),elapsedSeconds=Math.round(elapsed/1000);
  $('resultSubtitle').textContent=`${Math.floor(elapsedSeconds/60)} min ${String(elapsedSeconds%60).padStart(2,'0')} s de actividad · ${s.complete} pájaros completaron su paso${s.partial?' · 1 paso parcial':''}.`;
  $('downloadStatus').textContent='';renderFeedback($('feedbackHost'),feedbackModel(run));show('results');
}
function endEarly(){if(phase==='flight'){const round=run.rounds[roundIndex];closeRound(round,{complete:false,elapsedMs:round.exposureMs-clock.remainingMs});}finish();}
$('startButton').onclick=()=>start();$('practiceButton').onclick=()=>start(true);$('startAfterPractice').onclick=()=>start(false,run.config);$('repeatPractice').onclick=()=>start(true,run.config);$('backPractice').onclick=()=>show('setup');
$('pauseButton').onclick=()=>pause();$('resumeButton').onclick=resume;$('endButton').onclick=endEarly;
$('pauseDialog').addEventListener('cancel',event=>{event.preventDefault();resume();});
$('guideButton').onclick=()=>{if(phase!=='idle')pause('La guía está abierta. Al cerrarla puedes continuar el vuelo.');$('guideDialog').showModal();};$('closeGuide').onclick=()=>$('guideDialog').close();
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('La actividad se pausó al cambiar de pestaña.');});document.addEventListener('neurama:pause',()=>pause('La actividad se pausó al salir de Neurama.'));
$('newButton').onclick=()=>show('setup');$('downloadButton').onclick=()=>{downloadText(sessionCSV(run),'vuelo-colores-registro.csv');$('downloadStatus').textContent='Registro preparado para descargar.';};
$('startButton').disabled=false;
