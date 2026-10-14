import {setup} from './support/database.mjs';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const db=setup();
test('snapshot cubre las tablas, columnas y restricciones únicas realmente migradas',()=>{
 const snapshot=JSON.parse(readFileSync('drizzle/meta/0003_snapshot.json','utf8'));
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r=>r.name);
 assert.deepEqual(Object.keys(snapshot.tables).sort(),tables.sort());
 for(const name of tables){
  const actual=db.prepare('PRAGMA table_info('+name+')').all().map(r=>r.name).sort();
  assert.deepEqual(Object.keys(snapshot.tables[name].columns).sort(),actual,name);
  for(const index of db.prepare('PRAGMA index_list('+name+')').all().filter(i=>i.unique&&i.origin!=='pk')){
   const cols=db.prepare('PRAGMA index_info('+index.name+')').all().map(r=>r.name);
   assert.ok(Object.values(snapshot.tables[name].indexes).some(i=>i.isUnique&&JSON.stringify(i.columns)===JSON.stringify(cols)),name+': '+index.name);
  }
 }
 assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
});
