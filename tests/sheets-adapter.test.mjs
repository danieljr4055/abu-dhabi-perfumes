import {setup} from './support/database.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8,jwtVerify} from 'jose';
setup();
const {sendToGoogle}=await import('../src/server/sheets-sync.ts');
test('adaptador Sheets firma OAuth, limita destinos, amplía filas y escribe texto RAW',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256',{extractable:true});
 globalThis.__testEnv={GOOGLE_SERVICE_ACCOUNT_EMAIL:'qa@example.invalid',GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:await exportPKCS8(privateKey),GOOGLE_SPREADSHEET_ID:'qa-sheet'};
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});assert.equal(options.redirect,'error');
  if(url==='https://oauth2.googleapis.com/token'){
   const assertion=options.body.get('assertion');
   const {payload}=await jwtVerify(assertion,publicKey,{audience:url,issuer:'qa@example.invalid'});
   assert.equal(payload.scope,'https://www.googleapis.com/auth/spreadsheets');
   return Response.json({access_token:'token-de-prueba'});
  }
  assert.ok(url.startsWith('https://sheets.googleapis.com/v4/spreadsheets/qa-sheet'));
  assert.equal(options.headers.Authorization,'Bearer token-de-prueba');
  if(options.method==='GET')return Response.json({sheets:[{properties:{title:'Productos',sheetId:1,gridProperties:{rowCount:2}}}]});
  return Response.json({});
 };
 try{
  await sendToGoogle([{range:"'Productos'!A5:I5",values:[['SKU-001','=no ejecutar','Marca','',100,2,'',true,'fecha']]}]);
  assert.equal(calls.length,4);
  assert.equal(JSON.parse(calls[2].options.body).requests[0].appendDimension.length,3);
  const body=JSON.parse(calls[3].options.body);
  assert.equal(body.valueInputOption,'RAW');assert.equal(body.data[1].values[0][1],'=no ejecutar');
  assert.deepEqual(body.data[0].values[0],['sku','nombre','marca','categoria','precio','cantidad','imagen_url','publicado','actualizado_en']);
 }finally{globalThis.fetch=original;delete globalThis.__testEnv;}
});
