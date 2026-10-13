import {setup} from './support/database.mjs';import {test} from 'node:test';import assert from 'node:assert/strict';
const db=setup();const {saveTaxonomy}=await import('../src/server/taxonomy.ts');const {saveCatalogProduct}=await import('../src/server/product-editor.ts');
const {createOrder,changeStatus,getOrder}=await import('../src/server/orders.ts');
test('pedido por variante mantiene total, reserva e históricos',async()=>{
 const b=await saveTaxonomy('brands',{name:'Dior',slug:'dior'});const n=await saveTaxonomy('notes',{name:'Bergamota',slug:'bergamota'});
 const make=async(code,name,price)=>saveCatalogProduct({code,slug:code.toLowerCase(),name,brandId:b.id,gender:'Hombre',state:'publicado',notes:['salida','corazon','fondo'].map(phase=>({noteId:n.id,phase})),images:[1,2,3].map(i=>({url:'/images/perfume-'+i+'.webp',alt:'Vista '+i})),variants:[{sku:code+'-100',kind:'frasco',sizeMl:100,price,stock:5,commercialVerified:true}]});
 const a=await make('DIO-SAV-006','Sauvage',320000),b2=await make('PRA-INV-004','Invictus',280000);
 const input={name:'Juan Pérez',phone:'3001234567',address:'Carrera XX # XX-XX',city:'Cartago',notes:'',payment:'Transferencia',requestKey:crypto.randomUUID(),items:[{code:a.code,variantId:a.variants[0].id,quantity:1,expectedPrice:320000},{code:b2.code,variantId:b2.variants[0].id,quantity:2,expectedPrice:280000}]};
 let order=await createOrder(input);assert.equal(order.code,'PED-755');assert.equal(order.total,880000);assert.equal(order.items[0].sku,a.variants[0].sku);
 assert.equal((await createOrder(input)).code,order.code);
 await assert.rejects(createOrder({...input,city:'Otra'}),/otros datos/);
 db.exec('UPDATE product_variants SET price=400000');
 assert.equal((await getOrder(order.code)).items[0].price,320000);
 for(const status of ['Contactado','Pago recibido','Preparando pedido','Enviado','Entregado'])order=await changeStatus(order.code,status,order.version,{name:'Asesor'});
 assert.equal(db.prepare('SELECT stock FROM product_variants WHERE id=1').get().stock,4);
 await assert.rejects(changeStatus(order.code,'Pago recibido',order.version,{name:'Asesor'}));
});
