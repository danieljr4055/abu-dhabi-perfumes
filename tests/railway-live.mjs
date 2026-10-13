// Local only. Real pg protocol + built Node server; never targets a business database.
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {Pool} from 'pg';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {setup} from './support/database.mjs';
import {createPostgresDatabase} from '../src/server/postgres.ts';
import {migrate} from '../scripts/migrate-postgres.mjs';
setup().close();
const pg=new PGlite();
const socket=new PGLiteSocketServer({db:pg,port:15433,host:'127.0.0.1',maxConnections:16});
await socket.start();
const databaseUrl='postgres://postgres@127.0.0.1:15433/postgres';
const pool=new Pool({connectionString:databaseUrl,max:1});
const migrationClient=await pool.connect();
try{await migrate(migrationClient,['0001_initial.sql','0002_sync.sql'].map(name=>({name,sql:readFileSync('postgres/'+name,'utf8')})));}finally{migrationClient.release();}
const db=createPostgresDatabase(pool);globalThis.__testDB=db;
let child,logs='';
try{
 const {saveTaxonomy}=await import('../src/server/taxonomy.ts');
 const {saveCatalogProduct}=await import('../src/server/product-editor.ts');
 const {hashPassword}=await import('../src/server/passwords.ts');
 const brand=await saveTaxonomy('brands',{name:'Dior',slug:'dior'});
 const note=await saveTaxonomy('notes',{name:'Bergamota',slug:'bergamota'});
 const items=[];
 for(const [code,name,price,quantity] of [['DIO-SAV-006','Sauvage',320000,1],['PRA-INV-004','Invictus',280000,2]]){
  const p=await saveCatalogProduct({code,slug:code.toLowerCase(),name,brandId:brand.id,gender:'Hombre',state:'publicado',description:'Solo QA',images:[1,2,3].map(n=>({url:'/images/perfume-'+n+'.webp',alt:'QA '+n})),notes:['salida','corazon','fondo'].map(phase=>({noteId:note.id,phase})),variants:[{sku:code+'-100',kind:'frasco',sizeMl:100,stock:5,price,commercialVerified:true}]});
  items.push({code,variantId:p.variants[0].id,quantity,expectedPrice:price});
 }
 await db.prepare("INSERT INTO users(username,name,password_hash,role,created_at) VALUES(?,?,?,'admin',?)").bind('qa-railway','QA Railway',await hashPassword('Prueba-Railway-2026!'),new Date().toISOString()).run();
 const origin='http://127.0.0.1:5175';
 child=spawn(process.execPath,['scripts/start-railway.mjs'],{env:{...process.env,NODE_ENV:'development',PORT:'5175',HOST:'127.0.0.1',PUBLIC_ORIGIN:origin,DATABASE_URL:databaseUrl},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 let started=false;
 for(let i=0;i<60;i++){try{const r=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(1500)});if(r.ok){started=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 assert.ok(started,'Node server did not become healthy: '+logs.slice(-1200));
 let cookie='';
 const request=async(path,method='GET',body)=>{const r=await fetch(origin+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});const value=await r.json();return{r,value};};
 assert.equal((await request('/api/admin/users')).r.status,401);
 const login=await request('/api/auth/login','POST',{username:'qa-railway',password:'Prueba-Railway-2026!'});
 assert.equal(login.r.status,200);cookie=login.r.headers.get('set-cookie').split(';')[0];
 const catalog=await request('/api/products');assert.equal(catalog.r.status,200,JSON.stringify(catalog.value)+' '+logs.slice(-1500));assert.equal(catalog.value.total,2);
 const purchase=await request('/api/orders','POST',{name:'Juan Pérez',phone:'3001234567',address:'Carrera XX # XX-XX',city:'Cartago',notes:'QA Railway',payment:'Transferencia',requestKey:crypto.randomUUID(),items});
 assert.equal(purchase.r.status,201,JSON.stringify(purchase.value));
 let order=purchase.value.order;assert.equal(order.code,'PED-755');assert.equal(order.total,880000);assert.ok(decodeURIComponent(purchase.value.whatsappUrl).includes('DIO-SAV-006'));
 for(const status of ['Contactado','Pago recibido','Preparando pedido','Enviado','Entregado']){
  const changed=await request('/api/advisor/orders/'+order.code,'PATCH',{status,version:order.version});assert.equal(changed.r.status,200,JSON.stringify(changed.value));order=changed.value;
 }
 assert.equal((await db.prepare('SELECT stock,reserved,sold FROM product_variants WHERE id=?').bind(items[0].variantId).first()).sold,1);
 assert.equal((await request('/api/advisor/orders/'+order.code)).value.items[0].variantId,items[0].variantId);
 const html=await fetch(origin+'/producto/DIO-SAV-006');assert.equal(html.status,200);
 assert.match(await html.text(),/Sauvage/);
 assert.equal((await fetch(origin+'/images/perfume-1.webp')).status,200);
 await request('/api/auth/logout','POST',{});assert.equal((await request('/api/admin/users')).r.status,401);
 console.log('PASS Node + pg real: salud, catálogo, login, PED-755/$880000, estados, inventario, HTML/imagen y logout.');
}finally{
 child?.kill();if(child)await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve)});
 await pool.end();await socket.stop();await pg.close();
}
