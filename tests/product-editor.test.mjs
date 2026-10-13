import {setup} from './support/database.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
setup();
const {saveTaxonomy}=await import('../src/server/taxonomy.ts');
const {saveCatalogProduct,getAdvisorProduct}=await import('../src/server/product-editor.ts');
test('producto conserva códigos, variantes y publicación exige notas',async()=>{
 const brand=await saveTaxonomy('brands',{name:'Dior',slug:'dior'});
 const note=await saveTaxonomy('notes',{name:'Bergamota',slug:'bergamota'});
 const draft={code:'DIO-SAV-006',slug:'dior-sauvage',name:'Sauvage',brandId:brand.id,gender:'Hombre',description:'Perfume de prueba',state:'borrador',images:[1,2,3].map(i=>({url:'/images/perfume-'+i+'.webp',alt:'Vista '+i})),variants:[{sku:'DIO-SAV-006-100',kind:'frasco',sizeMl:100,price:320000,stock:7,commercialVerified:true}]};
 const p=await saveCatalogProduct(draft);
 assert.equal(p.variants[0].stock,7);
 await assert.rejects(saveCatalogProduct({...draft,version:p.version,state:'publicado'},p.id),/fase/);
 const published=await saveCatalogProduct({...draft,version:p.version,state:'publicado',notes:['salida','corazon','fondo'].map(phase=>({noteId:note.id,phase})),variants:p.variants.map(v=>Object.fromEntries(Object.entries(v).filter(([key])=>!['productId','reserved','sold'].includes(key))))},p.id);
 assert.equal(published.state,'publicado');
 await assert.rejects(saveCatalogProduct({...draft,code:'DIO-OTRO',version:published.version},p.id),/permanente/);
 assert.equal((await getAdvisorProduct(draft.code)).code,draft.code);
});
