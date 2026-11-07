import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {createClinicService} from '../../../lib/clinic-service.mjs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function handle(request:Request,write=false){
 const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión para guardar tu perfil y tu agenda.',signIn:'/signin-with-chatgpt?return_to=%2F'},401);
 if(!env.DB)return json({error:'No pudimos conectar tu agenda. Intenta de nuevo.'},503);
 try{const service=createClinicService(env.DB,user.userId);if(!write)return json({...await service.bootstrap(),user:{displayName:user.displayName,email:user.email}});
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'La solicitud debe hacerse desde Neurama.'},403);
  const raw=await request.text();if(raw.length>200000)return json({error:'El plan es demasiado grande.'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'La información no es válida.'},400);}
  return json({result:await service.mutate(body.action,body.data||{})});
 }catch(error){const e=error as Error&{status?:number};if(e.status)return json({error:e.message},e.status);console.error('Clinic request failed:',e.name);return json({error:'No se pudo guardar la información. Intenta de nuevo.'},500);}
}
export const GET=(request:Request)=>handle(request);
export const POST=(request:Request)=>handle(request,true);
