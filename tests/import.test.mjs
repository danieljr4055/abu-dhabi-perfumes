import {setup} from './support/database.mjs';import {test} from 'node:test';import assert from 'node:assert/strict';
const db=setup();const {previewImport,commitImport}=await import('../src/server/catalog-import.ts');
test('importación factual e idempotente conserva datos propios',async()=>{
 const batch={discovered:1,records:[{sourceUrl:'https://perfumeriamillennio.com/products/khamrah',externalId:'khamrah',checkedAt:'2026-10-12',name:'Khamrah',brand:'Lattafa',gender:'Unisex',concentration:'Eau de Parfum',notes:[],presentations:[{sizeMl:100,kind:'frasco'}],missingFields:['notas']}]};
 assert.equal((await previewImport(batch)).records.length,1);
 assert.equal((await commitImport(batch)).created,1);
 assert.equal((await commitImport(batch)).skipped,1);
 assert.equal(db.prepare('SELECT price FROM product_variants').get().price,null);
 assert.equal(db.prepare('SELECT editorial_state FROM products').get().editorial_state,'borrador');
 db.exec('UPDATE product_variants SET price=123000,stock=3');
 await commitImport(batch);assert.equal(db.prepare('SELECT price FROM product_variants').get().price,123000);
 await assert.rejects(previewImport({...batch,records:[{...batch.records[0],sourceUrl:'http://localhost/secrets'}]}));
});
