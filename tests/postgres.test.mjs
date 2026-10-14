import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './support/database.mjs';
import {createPostgresDatabase,postgresSql} from '../src/server/postgres.ts';
setup().close();
test('SQL PostgreSQL conserva literales y parámetros sin concatenar datos',()=>{
 assert.equal(postgresSql("SELECT '?' literal,? value,'it''s ?' escaped",false),"SELECT '?' literal,$1 value,'it''s ?' escaped");
 assert.match(postgresSql('SELECT * FROM json_each(p.occasion) WHERE value=?',false),/jsonb_array_elements_text/);
 assert.equal(postgresSql('SELECT id AS variantId',false),'SELECT id AS "variantId"');
});
test('PostgreSQL mantiene compra, históricos, transacciones y cola Sheets',async()=>{
 const pg=new PGlite();
 await pg.exec(readFileSync('postgres/0001_initial.sql','utf8'));
 await pg.exec(readFileSync('postgres/0002_sync.sql','utf8'));
 await pg.exec(readFileSync('postgres/0003_sheet_master.sql','utf8'));
 const client={query:async(sql,args)=>{const r=await pg.query(sql,args);return{rows:r.rows,rowCount:r.affectedRows??r.rows.length}},release(){}};
 const pool={...client,connect:async()=>client};
 const db=createPostgresDatabase(pool);globalThis.__testDB=db;
 try{
  const {saveTaxonomy}=await import('../src/server/taxonomy.ts');
  const {saveCatalogProduct}=await import('../src/server/product-editor.ts');
  const {createVariantOrder}=await import('../src/server/variant-orders.ts');
  const {changeStatus,dashboard}=await import('../src/server/orders.ts');
  const {queryCatalog}=await import('../src/server/discovery.ts');
  const {runSheetSync}=await import('../src/server/sheets-sync.ts');
  const {hashPassword,login}=await import('../src/server/security.ts');
  const note=await saveTaxonomy('notes',{name:'Bergamota',slug:'bergamota'});
  const brand=await saveTaxonomy('brands',{name:'Dior',slug:'dior'});
  const products=[];
  for(const [code,name,price] of [['DIO-SAV-006','Sauvage',320000],['PRA-INV-004','Invictus',280000]])products.push(await saveCatalogProduct({code,slug:code.toLowerCase(),name,brandId:brand.id,gender:'Hombre',state:'publicado',occasion:['diario'],description:'Fixture PostgreSQL',notes:['salida','corazon','fondo'].map(phase=>({noteId:note.id,phase})),images:[1,2,3].map(n=>({url:'/images/perfume-'+n+'.webp',alt:'Vista '+n})),variants:[{sku:code+'-100',kind:'frasco',sizeMl:100,price,stock:5,commercialVerified:true}]}));
  assert.equal((await queryCatalog(new URLSearchParams({q:'DIO-SAV-006'}))).total,1);
  assert.equal((await queryCatalog(new URLSearchParams(),false,[{field:'occasion',value:'diario'}])).total,2);
  const data={name:'Juan Pérez',phone:'3001234567',address:'Carrera XX # XX-XX',city:'Cartago',notes:'Fixture',payment:'Transferencia',requestKey:crypto.randomUUID(),items:products.map((p,i)=>({variantId:p.variants[0].id,code:p.code,quantity:i+1,expectedPrice:p.price}))};
  let order=await createVariantOrder(data);assert.equal(order.code,'PED-755');assert.equal(order.total,880000);
  assert.equal(order.items[0].variantId,products[0].variants[0].id);
  assert.equal(order.whatsappNumber,'573151019779');assert.ok(order.events[0].createdAt);
  assert.equal((await createVariantOrder(data)).code,order.code);
  await db.prepare('UPDATE product_variants SET price=400000 WHERE id=?').bind(products[0].variants[0].id).run();
  for(const status of ['Contactado','Pago recibido','Preparando pedido','Enviado','Entregado']){
   order=await changeStatus(order.code,status,order.version,{id:1,name:'QA',role:'admin'});
   const v=await db.prepare('SELECT stock,reserved,sold FROM product_variants WHERE id=?').bind(products[0].variants[0].id).first();
   assert.deepEqual(v,status==='Contactado'?{stock:5,reserved:1,sold:0}:{stock:4,reserved:0,sold:1});
  }
  assert.equal(order.items[0].price,320000);assert.equal(order.total,880000);
  assert.equal((await dashboard()).today,1);
  const before=await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(products[0].variants[0].id).first();
  await assert.rejects(db.batch([db.prepare('UPDATE product_variants SET stock=stock+1 WHERE id=?').bind(products[0].variants[0].id),db.prepare('INSERT INTO transaction_checks(ok) VALUES(0)')]));
  assert.equal((await db.prepare('SELECT stock FROM product_variants WHERE id=?').bind(products[0].variants[0].id).first()).stock,before.stock);
  await runSheetSync(async entries=>assert.equal(entries.length,2));
  const hash=await hashPassword('Prueba-Postgres-2026!');
  await db.prepare("INSERT INTO users(username,name,password_hash,role,created_at) VALUES(?,?,?,'admin',?)").bind('qa-pg','QA',hash,new Date().toISOString()).run();
  const session=await login(new Request('https://tienda.example/api/auth/login'),{username:'qa-pg',password:'Prueba-Postgres-2026!'});
  assert.match(session.cookie,/Secure/);
 }finally{await pg.close();}
});
