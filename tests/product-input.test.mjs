import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productEditorInput} from '../src/lib/product-editor-input.ts';
test('serializer convierte booleanos SQLite y elimina campos internos',()=>{
 const input=productEditorInput({code:'TEST-001',featured:1,isNew:false,notes:[{noteId:1,phase:'salida',position:0,note:{name:'private'}}],images:[{url:'/images/x.webp',alt:'Vista',id:7}],variants:[{id:1,sku:'TEST-001-100',reserved:1,sold:2}]});
 assert.equal(input.featured,true);
 assert.equal(Object.hasOwn(input.notes[0],'note'),false);
 assert.equal(Object.hasOwn(input.images[0],'id'),false);
 assert.equal(Object.hasOwn(input.variants[0],'reserved'),false);
});
