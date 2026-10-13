import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startBootstrapServer} from '../scripts/railway-bootstrap.mjs';
test('production domain bootstrap exposes health only, never business routes',async()=>{
 let checks=0;
 const server=await startBootstrapServer({port:0,host:'127.0.0.1',checkDatabase:async()=>{checks++;}});
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(origin+'/api/health')).status,200);
  assert.equal(checks,1);
  for(const [path,method] of [['/','GET'],['/api/products','GET'],['/api/orders','POST'],['/api/auth/login','POST'],['/api/health','POST']]){
   const r=await fetch(origin+path,{method});assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');
  }
  assert.equal(checks,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('bootstrap health fails when database is unavailable',async()=>{
 const server=await startBootstrapServer({port:0,host:'127.0.0.1',checkDatabase:async()=>{throw new Error('private connection details');}});
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/health');assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private connection/);}finally{await new Promise(resolve=>server.close(resolve));}
});
