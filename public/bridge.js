// Each module owns its pause state, including exposure and countdown screens.
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='neurama:pause')return;
 document.dispatchEvent(new Event('neurama:pause'));
});
