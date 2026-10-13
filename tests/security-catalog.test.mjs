import {setup} from './support/database.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
setup();
const {saveTaxonomy,safeImage}=await import('../src/server/taxonomy.ts');
const {saveCatalogProduct,editorSchema}=await import('../src/server/product-editor.ts');
const {getPublishedProduct,queryCatalog}=await import('../src/server/discovery.ts');
test('el catálogo nunca expone campos internos o presentaciones ocultas',async()=>{
 const brand=await saveTaxonomy('brands',{name:'Marca',slug:'marca'});
 const note=await saveTaxonomy('notes',{name:'Nota',slug:'nota'});
 const input={code:'SEG-001',slug:'seguro',name:'Seguro',brandId:brand.id,gender:'Unisex',state:'publicado',
 notes:['salida','corazon','fondo'].map(phase=>({noteId:note.id,phase})),
 images:[1,2,3].map(i=>({url:'/images/test-'+i+'.webp',alt:'Vista '+i})),
 variants:[{sku:'SEG-001-100',kind:'frasco',sizeMl:100,price:100000,stock:5,commercialVerified:true},
 {sku:'SEG-001-SECRET',kind:'decant',sizeMl:5,price:10000,stock:2,active:false},
 {sku:'SEG-001-UNVERIFIED',kind:'decant',sizeMl:777,price:777,stock:2,active:true,commercialVerified:false}]};
 await saveCatalogProduct(input);
 for(const p of [await getPublishedProduct('SEG-001'),(await queryCatalog(new URLSearchParams())).products[0]]){
  assert.equal(p.variants.length,1);
  for(const field of ['edit_token','search_text','reserved','sold','version','imageRecords','brand_id','editorial_state']) assert.equal(Object.hasOwn(p,field),false,field);
  for(const field of ['reserved','sold','version','productId']) assert.equal(Object.hasOwn(p.variants[0],field),false,field);
  assert.equal(p.variants[0].available,5);
 }
 assert.equal(editorSchema.safeParse({...input,admin:true}).success,false);
 assert.equal(editorSchema.safeParse({...input,variants:[{...input.variants[0],reserved:0}]}).success,false);
 assert.equal((await queryCatalog(new URLSearchParams({tamano:'777'}))).total,0);
 assert.equal((await queryCatalog(new URLSearchParams({minPrecio:'777',maxPrecio:'777'}))).total,0);
 assert.equal((await queryCatalog(new URLSearchParams())).facets.sizes.includes('777'),false);
});
test('imágenes rechazan rutas ascendentes y destinos externos no autorizados',()=>{
 for(const url of ['/images/../secret','/images/a/../../secret','https://evil.example/image.jpg','http://example.com/x']) assert.equal(safeImage.safeParse(url).success,false,url);
 assert.equal(safeImage.safeParse('/images/perfume.webp').success,true);
});
