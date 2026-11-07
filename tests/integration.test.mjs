import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {activities,processes,filterActivities,cleanPlan,planText} from '../public/catalog.mjs';

const dist=resolve('public');
test('las aplicaciones empaquetadas contienen sus recursos locales',()=>{
  const apps=activities.filter(a=>a.kind==='app');
  assert.equal(apps.length,5);
  const files=[];
  function walk(p){for(const f of readdirSync(p,{withFileTypes:true})){const path=join(p,f.name);f.isDirectory()?walk(path):files.push(path);}}
  walk(dist);
  for(const a of apps)assert.ok(existsSync(join(dist,a.path,'index.html')),a.id);
  for(const file of files.filter(p=>/\.(?:html|js|mjs|css)$/.test(p))){
    const text=readFileSync(file,'utf8');
    const refs=[...text.matchAll(/(?:src|href)=["']([^"'<>]+)["']/g)].map(m=>m[1]);
    refs.push(...[...text.matchAll(/(?:from\s+|import\s*)["'](\.\.?\/[^"']+)["']/g)].map(m=>m[1]));
    refs.push(...[...text.matchAll(/url\(["']?(?!data:)([^"')]+)["']?\)/g)].map(m=>m[1]));
    for(const ref of refs.filter(r=>!r.includes('${')&&!/^(?:https?:|data:|blob:|#|mailto:)/.test(r))){
      const p=ref.split(/[?#]/)[0];if(!p||p==='./'||p==='/signin-with-chatgpt')continue;
      assert.ok(existsSync(resolve(dirname(file),p)),`${file}: ${ref}`);
    }
  }
});
test('el catálogo es único y todos los procesos tienen actividades',()=>{
  assert.equal(activities.length,10);assert.equal(new Set(activities.map(a=>a.id)).size,10);
  for(const p of processes)assert.ok(filterActivities({process:p}).length>0,p);
  for(const a of activities.filter(a=>a.kind==='material')){
    assert.equal(new URL(a.view).hostname,'www.canva.com');assert.equal(new URL(a.edit).hostname,'www.canva.com');
    assert.ok(a.designId&&a.pages&&a.objective&&a.steps.length);
  }
});
test('los filtros se combinan y aceptan texto sin acentos',()=>{
  assert.deepEqual(filterActivities({query:'ATENCION',kind:'app'}).map(a=>a.id),['sonidos','aves']);
  assert.deepEqual(filterActivities({process:'Planeación',kind:'app'}).map(a=>a.id),['plan']);
  assert.deepEqual(filterActivities({favorites:['chef','mochila'],query:'horario'}).map(a=>a.id),['mochila']);
  assert.equal(filterActivities({query:'ninguna-coincidencia'}).length,0);
});
test('un plan recuperado descarta datos extraños y exporta orden y tiempos correctos',()=>{
  const p=cleanPlan([null,{id:'invalido',minutes:10},{id:'chef',minutes:1000},{id:'chef',minutes:3},{id:'mochila',minutes:-2},{id:'sonidos',minutes:5}]);
  assert.deepEqual(p,[{id:'chef',minutes:60},{id:'mochila',minutes:1},{id:'sonidos',minutes:5}]);
  const t=planText(p);assert.match(t,/1\. Chef por un día · 60 min/);assert.match(t,/2\. Misión mochila · 1 min/);assert.match(t,/Tiempo previsto: 66 minutos/);
  assert.deepEqual(cleanPlan('corrupto'),[]);
});
