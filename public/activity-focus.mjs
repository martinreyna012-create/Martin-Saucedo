export function createActivityFocus({activity,activeScreens,onPause,home='home'}){
  document.body.dataset.activity=activity;
  let active=false;
  const button=document.createElement('button');
  button.type='button';button.className='focus-pause';button.hidden=true;
  button.setAttribute('aria-label','Pausar actividad');button.title='Pausar';
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  button.onclick=()=>onPause();document.body.appendChild(button);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||!active||document.querySelector('dialog[open]'))return;
    event.preventDefault();onPause();
  });
  function screen(id){
    active=activeScreens.includes(id);document.body.dataset.focusScreen=id;
    document.body.classList.toggle('activity-focus',active);button.hidden=!active;
    if(parent!==window)parent.postMessage({type:'neurama:focus-mode',active},location.origin);
  }
  screen(home);return {screen};
}
