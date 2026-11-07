import {ClinicError,validateProfile,validatePatient,validateAppointment} from '../public/clinic-domain.mjs';
const parsePatient=p=>({...p,archived:!!p.archived});
const parseAppointment=a=>({id:a.id,patientId:a.patient_id,date:a.session_date,time:a.start_time,duration:a.duration,status:a.status,goal:a.goal,notes:a.notes,plan:JSON.parse(a.plan_json),version:a.version,createdAt:a.created_at,updatedAt:a.updated_at});
export function createClinicService(db,ownerId){
 if(!ownerId)throw new ClinicError('Inicia sesión para acceder a tu espacio.',401);
 const first=(sql,...args)=>db.prepare(sql).bind(...args).first();
 const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const profile=()=>first('SELECT name,specialty,clinic,license,color FROM therapist_profiles WHERE owner_id=?',ownerId);
 const requireProfile=async()=>{if(!await profile())throw new ClinicError('Primero completa tu perfil profesional.');};
 const ownedPatient=async id=>{const p=await first('SELECT * FROM patients WHERE owner_id=? AND id=?',ownerId,id);if(!p)throw new ClinicError('No se encontró el paciente.',404);return p;};
 const ownedAppointment=async id=>{const a=await first('SELECT * FROM appointments WHERE owner_id=? AND id=?',ownerId,id);if(!a)throw new ClinicError('No se encontró la cita.',404);return a;};
 const version=v=>{if(!Number.isInteger(v)||v<1)throw new ClinicError('Actualiza la información antes de guardar.',409);return v;};
 const overlapSql="SELECT 1 FROM appointments WHERE owner_id=? AND session_date=? AND status!='cancelled' AND id!=? AND start_minute<? AND start_minute+duration>?";
 return {
  async bootstrap(){return {profile:await profile(),patients:(await all('SELECT id,name,age,goal,archived,version FROM patients WHERE owner_id=? ORDER BY name',ownerId)).map(parsePatient),appointments:(await all('SELECT * FROM appointments WHERE owner_id=? ORDER BY session_date,start_minute',ownerId)).map(parseAppointment)};},
  async mutate(action,input){const now=new Date().toISOString();
   if(action==='profile.save'){const p=validateProfile(input);await db.prepare('INSERT INTO therapist_profiles(owner_id,name,specialty,clinic,license,color,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET name=excluded.name,specialty=excluded.specialty,clinic=excluded.clinic,license=excluded.license,color=excluded.color,updated_at=excluded.updated_at').bind(ownerId,p.name,p.specialty,p.clinic,p.license,p.color,now,now).run();return p;}
   await requireProfile();
   if(action==='patient.create'){const p=validatePatient(input),id=crypto.randomUUID();await db.prepare('INSERT INTO patients(id,owner_id,name,age,goal,archived,created_at,updated_at) VALUES(?,?,?,?,?,0,?,?)').bind(id,ownerId,p.name,p.age,p.goal,now,now).run();return parsePatient(await ownedPatient(id));}
   if(action==='patient.update'){await ownedPatient(input.id);const p=validatePatient(input);const updated=await first('UPDATE patients SET name=?,age=?,goal=?,archived=?,version=version+1,updated_at=? WHERE owner_id=? AND id=? AND version=? RETURNING *',p.name,p.age,p.goal,p.archived?1:0,now,ownerId,input.id,version(input.version));if(!updated)throw new ClinicError('El paciente cambió en otra pantalla. Actualiza antes de guardar.',409);return parsePatient(updated);}
   if(action==='appointment.create'||action==='appointment.update'){
    const a=validateAppointment(input),patient=await ownedPatient(a.patientId);if(action==='appointment.create'&&patient.archived)throw new ClinicError('Reactiva el paciente antes de agendar una cita.');
    const id=action==='appointment.create'?crypto.randomUUID():input.id;if(action==='appointment.update')await ownedAppointment(id);
    const params=[ownerId,a.date,id,a.startMinute+a.duration,a.startMinute];const conflict=a.status==='cancelled'?'0':'EXISTS('+overlapSql+')';let result;
    if(action==='appointment.create'){result=await first('INSERT INTO appointments(id,owner_id,patient_id,session_date,start_time,start_minute,duration,status,goal,plan_json,notes,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT '+conflict+' RETURNING *',id,ownerId,a.patientId,a.date,a.time,a.startMinute,a.duration,a.status,a.goal,JSON.stringify(a.plan),a.notes,now,now,...(a.status==='cancelled'?[]:params));}
    else{result=await first('UPDATE appointments SET patient_id=?,session_date=?,start_time=?,start_minute=?,duration=?,status=?,goal=?,plan_json=?,notes=?,version=version+1,updated_at=? WHERE owner_id=? AND id=? AND version=? AND NOT '+conflict+' RETURNING *',a.patientId,a.date,a.time,a.startMinute,a.duration,a.status,a.goal,JSON.stringify(a.plan),a.notes,now,ownerId,id,version(input.version),...(a.status==='cancelled'?[]:params));}
    if(!result){if(a.status!=='cancelled'&&await first(overlapSql,...params))throw new ClinicError('Ya tienes una cita en ese horario. Elige otra hora.',409);throw new ClinicError('La cita cambió en otra pantalla. Actualiza antes de guardar.',409);}return parseAppointment(result);
   }
   throw new ClinicError('Acción no válida.');
  }
 };
}
