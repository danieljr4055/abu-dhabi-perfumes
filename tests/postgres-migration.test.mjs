import {PGlite} from '@electric-sql/pglite';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migrate} from '../scripts/migrate-postgres.mjs';
test('migración es transaccional, repetible y rechaza cambios de un archivo ya aplicado',async()=>{
 const pg=new PGlite();
 const client={query:async(sql,args)=>{if(!args&&sql.includes(';')){const r=await pg.exec(sql);return r.at(-1)??{rows:[]};}return pg.query(sql,args);}};
 try{
  await migrate(client,[{name:'v1',sql:'CREATE TABLE proof(id INTEGER PRIMARY KEY);'}]);
  await migrate(client,[{name:'v1',sql:'CREATE TABLE proof(id INTEGER PRIMARY KEY);'}]);
  await assert.rejects(migrate(client,[{name:'v1',sql:'CREATE TABLE modified(id INTEGER);'}]),/checksum/);
  await assert.rejects(migrate(client,[{name:'v2',sql:'CREATE TABLE partial(id INTEGER); SELECT * FROM missing;'}]));
  assert.equal((await pg.query("SELECT tablename FROM pg_tables WHERE tablename='partial'")).rows.length,0);
 }finally{await pg.close();}
});
