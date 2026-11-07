export function saveText(text,filename,type='text/csv;charset=utf-8'){
  const link=document.createElement('a');
  const url=URL.createObjectURL(new Blob([text],{type}));
  link.href=url;link.download=filename;link.hidden=true;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function downloadText(text,filename,type='text/csv;charset=utf-8'){
  if(parent!==window){parent.postMessage({type:'neurama:download',text,filename,mime:type},location.origin);return;}
  saveText(text,filename,type);
}
