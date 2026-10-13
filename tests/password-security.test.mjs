import {setup} from './support/database.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pbkdf2Sync} from 'node:crypto';
setup();
const {hashPassword,verifyPassword}=await import('../src/server/security.ts');
test('hash moderno es versionado y conserva verificación de credenciales antiguas',async()=>{
 const hash=await hashPassword('Password-Only-Test!');
 assert.match(hash,/^scrypt:32768:8:3:[a-f0-9]{32}:[a-f0-9]{64}$/);
 assert.equal(await verifyPassword('Password-Only-Test!',hash),true);
 assert.equal(await verifyPassword('wrong',hash),false);
 const salt='a'.repeat(32);
 const legacy=salt+':'+pbkdf2Sync('Old-Only-Test!',salt,100000,32,'sha256').toString('hex');
 assert.equal(await verifyPassword('Old-Only-Test!',legacy),true);
 assert.equal(await verifyPassword('wrong',legacy),false);
 assert.equal(await verifyPassword('x','pbkdf2-sha256:999999999:'+salt+':'+'f'.repeat(64)),false);
});
