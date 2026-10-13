// Run only against the isolated QA server explicitly bound to port 5174.
import assert from 'node:assert/strict';
import {productEditorInput} from '../src/lib/product-editor-input.ts';
const origin='http://127.0.0.1:5174';
let cookie='';
async function request(path,method='GET',body){
 const r=await fetch(origin+path,{method,signal:AbortSignal.timeout(30000),headers:{...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 // Drain every response, including assertions that only inspect status.
 const text=await r.text();
 return new Response(text,{status:r.status,headers:r.headers});
}
const home=await request('/');
assert.equal(home.status,200);
for(const name of ['content-security-policy','x-content-type-options','x-frame-options','referrer-policy','permissions-policy'])assert.ok(home.headers.get(name),name);
assert.equal((await request('/api/admin/users')).status,401);
assert.equal((await request('/api/admin/commerce/products','POST',{})).status,401);
const login=await request('/api/auth/login','POST',{username:'qa-admin',password:'Prueba-Aislada-2026!'});
assert.equal(login.status,200);
cookie=login.headers.get('set-cookie').split(';')[0];
const catalog=await (await request('/api/admin/commerce/products')).json();
const fixture=catalog.products.find(p=>p.code==='DIO-SAV-006');
assert.ok(fixture,'This test needs the isolated QA fixture');
const code='SEC-'+Date.now();
const draft={...productEditorInput({...fixture,images:fixture.imageRecords}),code,slug:code.toLowerCase(),name:'Prueba backend',state:'borrador',version:0,variants:[{sku:code+'-100',kind:'frasco',sizeMl:100,stock:9,price:100000,active:true,commercialVerified:true}]};
const createdResponse=await request('/api/admin/commerce/products','POST',draft);
assert.equal(createdResponse.status,200,await createdResponse.clone().text());
let created=await createdResponse.json();
assert.equal((await request('/api/products/'+code)).status,404);
const changed={...productEditorInput({...created,images:created.imageRecords}),state:'publicado'};
assert.equal((await request('/api/admin/commerce/products/'+created.id,'POST',{...changed,admin:true})).status,422);
const publish=await request('/api/admin/commerce/products/'+created.id,'POST',changed);
assert.equal(publish.status,200,await publish.clone().text());created=await publish.json();
const publicRecord=await (await request('/api/products/'+code)).json();
assert.equal(publicRecord.price,100000);assert.equal(publicRecord.available,9);
assert.equal(Object.hasOwn(publicRecord,'edit_token'),false);
assert.equal(Object.hasOwn(publicRecord.variants[0],'reserved'),false);
const body={name:'Juan Pérez',phone:'3001234567',address:'Carrera XX # XX-XX',city:'Cartago',notes:'Prueba aislada',payment:'Transferencia',requestKey:crypto.randomUUID(),items:[{code,variantId:publicRecord.variantId,quantity:2,expectedPrice:100000}]};
const orderResponse=await request('/api/orders','POST',body);
assert.equal(orderResponse.status,201,await orderResponse.clone().text());
const {order,whatsappUrl}=await orderResponse.json();
assert.equal(order.total,200000);assert.match(order.code,/^PED-\d+$/);assert.ok(decodeURIComponent(whatsappUrl).includes(code));
assert.equal((await (await request('/api/orders','POST',body)).json()).order.code,order.code);
const details=await (await request('/api/advisor/orders/'+order.code)).json();assert.equal(details.total,200000);
// Archive the temporary product after test. Existing orders and reservations remain intact.
const refreshed=await (await request('/api/admin/commerce/products?q='+code)).json();
const record=refreshed.products.find(p=>p.code===code);
assert.equal((await request('/api/admin/commerce/products/'+record.id,'POST',{...productEditorInput({...record,images:record.imageRecords}),state:'archivado'})).status,200);
assert.equal((await request('/api/products/'+code)).status,404);
assert.equal((await request('/api/auth/google/challenge','POST',{})).status,503);
assert.equal((await request('/api/auth/logout','POST',{})).status,200);
assert.equal((await request('/api/admin/users')).status,401);
console.log('PASS: HTTP real: cabeceras, permisos, CRUD/publicación, validación, pedido, idempotencia, ocultación y logout.');
