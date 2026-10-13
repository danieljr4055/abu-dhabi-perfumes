import {setup} from './support/database.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
setup();
const {canonicalRequest}=await import('../src/server/request-origin.ts');
const {requireOrigin}=await import('../src/server/security.ts');
test('proxy Railway usa origen configurado y no cabeceras de host aportadas por el cliente',async()=>{
 const raw=new Request('http://container:3000/api/auth/login?q=1',{method:'POST',headers:{Origin:'https://tienda.example','X-Forwarded-Host':'evil.example'},body:'{}'});
 const request=canonicalRequest(raw,'https://tienda.example');
 assert.equal(request.url,'https://tienda.example/api/auth/login?q=1');requireOrigin(request);
 assert.equal(await request.text(),'{}');
 assert.throws(()=>canonicalRequest(raw,'https://tienda.example/otro'));
 assert.throws(()=>requireOrigin(canonicalRequest(new Request('http://container/api',{headers:{Origin:'https://evil.example'}}),'https://tienda.example')));
});
