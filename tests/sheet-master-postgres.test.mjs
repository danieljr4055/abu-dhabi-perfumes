import {setup} from './support/database.mjs';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPostgresDatabase} from '../src/server/postgres.ts';
setup().close();
test('importación de hoja funciona en PostgreSQL y conserva bloqueos e historial de entradas',async()=>{
 const pg=new PGlite();for(const name of ['0001_initial.sql','0002_sync.sql','0003_sheet_master.sql'])await pg.exec(readFileSync('postgres/'+name,'utf8'));
 const client={query:async(sql,args)=>{const r=await pg.query(sql,args);return{rows:r.rows,rowCount:r.affectedRows??r.rows.length};},release(){}};
 globalThis.__testDB=createPostgresDatabase({...client,connect:async()=>client});
 try{
  const {importSheetCatalog,sheetImportStatus}=await import('../src/server/sheet-master.ts');
  const {getAdvisorProduct}=await import('../src/server/product-editor.ts');
  const cols=['sku','nombre','marca','precio','cantidad','tamano_ml'];const row=['MANDARIN-QA-100','Mandarin QA','Marca QA',320000,5,100];
  assert.equal((await importSheetCatalog(async()=>[cols,row])).created,1);
  assert.equal((await getAdvisorProduct(row[0])).variants[0].stock,5);
  await client.query('UPDATE product_variants SET stock=4 WHERE sku=$1',[row[0]]);
  await importSheetCatalog(async()=>[cols,row]);assert.equal((await getAdvisorProduct(row[0])).variants[0].stock,4);
  await importSheetCatalog(async()=>[cols]);assert.equal((await getAdvisorProduct(row[0])).variants[0].sheetBlocked,true);
  await importSheetCatalog(async()=>[cols,row]);assert.equal((await getAdvisorProduct(row[0])).variants[0].sheetBlocked,false);
  assert.ok((await sheetImportStatus()).last_success);
 }finally{await pg.close();}
});
