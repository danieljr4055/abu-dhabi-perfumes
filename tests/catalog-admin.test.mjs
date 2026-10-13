import {setup} from './support/database.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const db=setup();
const taxonomy=await import('../src/server/taxonomy.ts');
test('taxonomías validan familia, slug y versión',async()=>{
 const family=await taxonomy.saveTaxonomy('families',{name:'Cítrica',slug:'citrica'});
 const note=await taxonomy.saveTaxonomy('notes',{name:'Bergamota',slug:'bergamota',familyId:family.id});
 assert.equal(note.familyId,family.id);
 await assert.rejects(taxonomy.saveTaxonomy('notes',{...note,name:'Otra',version:9},note.id),/cambió/);
 await assert.rejects(taxonomy.saveTaxonomy('notes',{name:'Inválida',slug:'invalida',familyId:999}),/familia/);
});
test('alias se conserva y URL insegura se rechaza',async()=>{
 const brand=await taxonomy.saveTaxonomy('brands',{name:'Dior',slug:'dior'});
 await taxonomy.saveTaxonomy('brands',{...brand,slug:'christian-dior'},brand.id);
 assert.equal(db.prepare("SELECT old_slug FROM slug_redirects").get().old_slug,'dior');
 await assert.rejects(taxonomy.saveTaxonomy('brands',{name:'Mal',slug:'mal',image:'javascript:alert(1)'}));
});
