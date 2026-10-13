import {setup} from './support/database.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const raw=setup();
const {saveTaxonomy}=await import('../src/server/taxonomy.ts');
const {saveCatalogProduct}=await import('../src/server/product-editor.ts');
const {queryCatalog}=await import('../src/server/discovery.ts');
const {GET}=await import('../app/api/[...path]/route.ts');
test('administrador busca por SKU aunque difiera del código del producto',async()=>{
 const brand=await saveTaxonomy('brands',{name:'Prueba',slug:'prueba'});
 await saveCatalogProduct({code:'PRU-001',slug:'prueba-perfume',name:'Perfume',brandId:brand.id,gender:'Unisex',variants:[{sku:'SKU-UNICO-DECANT',kind:'decant',sizeMl:5,price:10000,stock:2}]});
 assert.equal((await queryCatalog(new URLSearchParams({q:'SKU-UNICO-DECANT'}),true)).total,1);
 assert.equal((await queryCatalog(new URLSearchParams({q:'SKU-UNICO-DECANT'}))).total,0);
});
test('revocar y reactivar Google preserva la identidad ya vinculada',async()=>{
 const {authorizeGoogleIdentity}=await import('../src/server/google-auth.ts');
 raw.exec("INSERT INTO users(id,username,name,password_hash,role,created_at) VALUES(1,'owner','Owner','','admin','now'),(2,'advisor','Advisor','','advisor','now'); INSERT INTO google_identities(user_id,email,google_sub) VALUES(2,'advisor@gmail.com','123')");
 await authorizeGoogleIdentity({userId:2,email:'advisor@gmail.com',active:false},1);
 assert.equal(raw.prepare('SELECT google_sub FROM google_identities WHERE user_id=2').get().google_sub,'123');
 await authorizeGoogleIdentity({userId:2,email:'advisor@gmail.com',active:true},1);
 assert.equal(raw.prepare('SELECT google_sub FROM google_identities WHERE user_id=2').get().google_sub,'123');
});
test('proveedores públicos solo informan si Google está habilitado',async()=>{
 globalThis.__testEnv={GOOGLE_CLIENT_ID:'client-private-test',GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:'NEVER-EXPOSE'};
 const response=await GET(new Request('https://store.example/api/auth/providers'));
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{googleEnabled:true});
 const privateInfo=await GET(new Request('https://store.example/api/admin/integrations'));
 assert.equal(privateInfo.status,401);
});
