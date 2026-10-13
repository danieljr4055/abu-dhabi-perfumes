import {setup} from './support/database.mjs';import {test} from 'node:test';import assert from 'node:assert/strict';
setup();const {saveTaxonomy}=await import('../src/server/taxonomy.ts');const {saveCatalogProduct}=await import('../src/server/product-editor.ts');const {queryCatalog}=await import('../src/server/discovery.ts');
test('familias vivas, sin duplicados y búsqueda con tildes',async()=>{
const a=await saveTaxonomy('families',{name:'Cítricos',slug:'citricos'}),b=await saveTaxonomy('families',{name:'Frescos',slug:'frescos'});
const brand=await saveTaxonomy('brands',{name:'Dior',slug:'dior'});
const note=await saveTaxonomy('notes',{name:'Limón',slug:'limon',familyId:a.id});
const p=await saveCatalogProduct({code:'DIO-TEST',slug:'test',name:'Perfume',brandId:brand.id,gender:'Unisex',state:'publicado',notes:['salida','corazon','fondo'].map(phase=>({noteId:note.id,phase})),images:[1,2,3].map(i=>({url:'/images/perfume-'+i+'.webp',alt:'Vista '+i})),variants:[{sku:'DIO-TEST-5',kind:'decant',sizeMl:5,price:30000,stock:5,commercialVerified:true}]});
assert.equal((await queryCatalog(new URLSearchParams('familia=citricos'))).total,1);
assert.equal((await queryCatalog(new URLSearchParams('q=limon&tipo=decant'))).products[0].id,p.id);
await saveTaxonomy('notes',{...note,familyId:b.id},note.id);
assert.equal((await queryCatalog(new URLSearchParams('familia=citricos'))).total,0);
assert.equal((await queryCatalog(new URLSearchParams('familia=frescos'))).total,1);
});
