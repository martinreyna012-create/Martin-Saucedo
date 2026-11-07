import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createClinicService} from '../lib/clinic-service.mjs';
import {validDate,monthCells,todayKey,validateAppointment,normalizePlan,escapeHTML} from '../public/clinic-domain.mjs';
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_gifted_doctor_spectrum.sql',import.meta.url),'utf8'));
 const db={prepare(query){return {bind(...args){return {async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}};}};}};
 return {sql,db,owner:createClinicService(db,'owner-A'),other:createClinicService(db,'owner-B')};
}
const profile={name:'Terapeuta de prueba',specialty:'Neuropsicología',clinic:'Centro ficticio',license:'',color:'green'};
const custom={id:'custom_example',minutes:15,custom:{title:'Ordenar materiales',goal:'Organización',description:'Preparar el espacio siguiendo una lista.',url:'https://example.com/material'}};
const booking=patientId=>({patientId,date:'2026-11-02',time:'15:00',duration:40,status:'planned',goal:'Memoria y organización',notes:'Preparar tarjetas',plan:[{id:'mochila',minutes:15},custom]});
async function ready(service){await service.mutate('profile.save',profile);return service.mutate('patient.create',{name:'PX-01',age:15,goal:'Organización escolar'});}
test('el perfil es obligatorio y se conserva la preparación completa de la cita',async()=>{
 const {db,owner}=fixture();assert.throws(()=>createClinicService(db,''),{status:401});
 await assert.rejects(owner.mutate('patient.create',{name:'PX-01'}),/perfil/);
 const p=await ready(owner),a=await owner.mutate('appointment.create',booking(p.id));
 const saved=await createClinicService(db,'owner-A').bootstrap();
 assert.equal(saved.profile.name,profile.name);assert.equal(saved.patients[0].age,15);assert.deepEqual(saved.appointments[0],a);assert.deepEqual(a.plan,[{id:'mochila',minutes:15},custom]);
});
test('cada cuenta solo puede leer y modificar sus propios pacientes y citas',async()=>{
 const {owner,other}=fixture(),p=await ready(owner),a=await owner.mutate('appointment.create',booking(p.id));await ready(other);
 assert.equal((await other.bootstrap()).appointments.length,0);assert.notEqual((await other.bootstrap()).patients[0].id,p.id);
 await assert.rejects(other.mutate('patient.update',{...p,name:'Otro'}),{status:404});
 await assert.rejects(other.mutate('appointment.create',booking(p.id)),{status:404});
 await assert.rejects(other.mutate('appointment.update',{...a,goal:'Otro'}),{status:404});
 assert.equal((await owner.bootstrap()).patients[0].name,'PX-01');
});
test('se bloquean los cruces, se permiten límites consecutivos y cancelar libera el horario',async()=>{
 const {owner,other}=fixture(),p=await ready(owner),a=await owner.mutate('appointment.create',booking(p.id));
 await assert.rejects(owner.mutate('appointment.create',{...booking(p.id),time:'15:20'}),{status:409});
 await assert.rejects(owner.mutate('appointment.create',{...booking(p.id),time:'14:50'}),{status:409});
 await owner.mutate('appointment.create',{...booking(p.id),time:'15:40'});
 const otherP=await ready(other);await other.mutate('appointment.create',booking(otherP.id));
 const cancelled=await owner.mutate('appointment.update',{...a,status:'cancelled'});const replacement=await owner.mutate('appointment.create',booking(p.id));
 await assert.rejects(owner.mutate('appointment.update',{...cancelled,status:'planned'}),{status:409});
 assert.equal(replacement.status,'planned');assert.equal((await owner.bootstrap()).appointments.length,3);
});
test('una edición atrasada no sobrescribe los cambios de otra pantalla',async()=>{
 const {owner}=fixture(),p=await ready(owner),a=await owner.mutate('appointment.create',booking(p.id));
 const updated=await owner.mutate('appointment.update',{...a,notes:'Versión nueva'});assert.equal(updated.version,2);
 await assert.rejects(owner.mutate('appointment.update',{...a,notes:'Versión vieja'}),{status:409});
 await owner.mutate('patient.update',{...p,goal:'Objetivo nuevo'});
 await assert.rejects(owner.mutate('patient.update',{...p,goal:'Objetivo viejo'}),{status:409});
 assert.equal((await owner.bootstrap()).appointments[0].notes,'Versión nueva');
});
test('archivar conserva el historial y requiere reactivar antes de crear otra cita',async()=>{
 const {owner}=fixture(),p=await ready(owner);await owner.mutate('appointment.create',booking(p.id));
 const archived=await owner.mutate('patient.update',{...p,archived:true});assert.equal(archived.archived,true);
 await assert.rejects(owner.mutate('appointment.create',{...booking(p.id),time:'17:00'}),/Reactiva/);
 assert.equal((await owner.bootstrap()).appointments.length,1);
 await owner.mutate('patient.update',{...archived,archived:false});await owner.mutate('appointment.create',{...booking(p.id),time:'17:00'});
});
test('fechas, tiempos y materiales inválidos se rechazan antes de guardar',()=>{
 assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2028-02-29'),true);
 const base=booking('test');for(const patch of [{time:'25:00'},{date:'2026-02-29'},{duration:0},{time:'23:50',duration:40},{plan:[{...custom,custom:{...custom.custom,url:'javascript:alert(1)'}}]}])assert.throws(()=>validateAppointment({...base,...patch}));
 assert.throws(()=>normalizePlan([custom,custom]));assert.throws(()=>normalizePlan([{id:'invalid',minutes:10}]));assert.equal(escapeHTML('<script>'), '&lt;script&gt;');
});
test('el calendario inicia en lunes y la fecha de hoy usa la hora de Monterrey',()=>{
 const cells=monthCells('2026-11');assert.equal(cells.length,42);assert.equal(cells[0],'2026-10-26');assert.ok(cells.includes('2026-11-30'));
 assert.equal(todayKey(new Date('2026-10-30T02:00:00Z')),'2026-10-29');
});
