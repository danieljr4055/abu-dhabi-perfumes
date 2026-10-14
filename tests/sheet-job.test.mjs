import {setup} from './support/database.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
setup().close();
const {isSheetJob}=await import('../src/server/sheet-job-auth.ts');
const {startSheetPoller}=await import('../scripts/sheet-poller.mjs');
test('job token es privado, limitado al modo maestro y debe coincidir exactamente',()=>{
 globalThis.__testEnv={SHEETS_IMPORT_ENABLED:'true',SHEETS_SYNC_TOKEN:'a'.repeat(64)};
 const req=t=>new Request('https://store.invalid/api/internal/sheet-import',{headers:{'x-store-sync-token':t}});
 assert.equal(isSheetJob(req('a'.repeat(64))),true);assert.equal(isSheetJob(req('b'.repeat(64))),false);assert.equal(isSheetJob(req('')),false);
 globalThis.__testEnv.SHEETS_IMPORT_ENABLED='false';assert.equal(isSheetJob(req('a'.repeat(64))),false);delete globalThis.__testEnv;
});
test('poller llama solo al backend local con token privado y no se solapa',async()=>{
 let calls=0,release;
 const pending=new Promise(resolve=>{release=resolve});
 const stop=startSheetPoller({port:3000,origin:'https://store.invalid',token:'private-test-token',intervalMs:5,fetcher:async(url,options)=>{calls++;assert.equal(url,'http://127.0.0.1:3000/api/internal/sheet-import');assert.equal(options.headers.Origin,'https://store.invalid');assert.equal(options.headers['x-store-sync-token'],'private-test-token');await pending;return {ok:true};}});
 await new Promise(r=>setTimeout(r,25));assert.equal(calls,1);stop();release();
});
