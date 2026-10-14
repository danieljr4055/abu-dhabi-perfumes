import {env} from 'cloudflare:workers';
import {importPKCS8,SignJWT} from 'jose';
import {all,statement} from './db';
import {AppError} from '../lib/domain';

type Entry={range:string;values:(string|number|boolean)[][]};
const headers=['sku','nombre','marca','categoria','precio','cantidad','imagen_url','publicado','actualizado_en'];
export async function sendToGoogle(entries:Entry[]){
 const c=env as unknown as Record<string,string>;
 if(!c.GOOGLE_SERVICE_ACCOUNT_EMAIL||!c.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY||!c.GOOGLE_SPREADSHEET_ID)
  throw new AppError('Google Sheets no está configurado.',503);
 const key=await importPKCS8(c.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g,'\n'),'RS256');
 const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/spreadsheets'})
  .setProtectedHeader({alg:'RS256'}).setIssuer(c.GOOGLE_SERVICE_ACCOUNT_EMAIL)
  .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('5m').sign(key);
 const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!tokenResponse.ok)throw new Error('Google authentication failed');
 const token=await tokenResponse.json() as {access_token?:string};
 if(!token.access_token)throw new Error('Missing access token');
 const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(c.GOOGLE_SPREADSHEET_ID);
 const request=async(path:string,body?:unknown)=>{
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok)throw new Error('Sheets request failed');
  return response.json() as Promise<any>;
 };
 const spreadsheet=await request('?fields=sheets(properties(sheetId,title,gridProperties(rowCount)))');
 const sheet=spreadsheet.sheets?.find((s:{properties:{title:string}})=>s.properties.title==='Productos')?.properties;
 if(!sheet)throw new Error('Missing Productos tab');
 const lastRow=Math.max(1,...entries.map(e=>Number(e.range.match(/A(\d+)/)![1])));
 if(lastRow>sheet.gridProperties.rowCount)await request(':batchUpdate',{requests:[{appendDimension:{sheetId:sheet.sheetId,dimension:'ROWS',length:lastRow-sheet.gridProperties.rowCount}}]});
 // RAW is mandatory: names starting with "=" remain text, never formulas.
 await request('/values:batchUpdate',{valueInputOption:'RAW',data:[{range:"'Productos'!A1:I1",values:[headers]},...entries]});
}
/** Validate real credentials and write only the reserved header row, even for an empty catalog. */
export async function checkSheetConnection(){
 try{await sendToGoogle([]);return{connected:true};}
 catch(error){if(error instanceof AppError)throw error;throw new AppError('No se pudo conectar con Google Sheets. Revisa la clave, la API habilitada, el permiso Editor y la pestaña Productos.',503);}
}
export async function sheetSyncStatus(){
 return all('SELECT s.variant_id,s.revision,s.synced_revision,s.attempts,s.next_attempt,s.last_error,s.synced_at,v.sku,p.name FROM sheet_sync s JOIN product_variants v ON v.id=s.variant_id JOIN products p ON p.id=v.product_id WHERE s.revision>s.synced_revision ORDER BY s.variant_id LIMIT 100');
}
/** Bounded batch. Stable row = variant id + 1; only this integration may reorder/write the tab. */
export async function runSheetSync(send:(entries:Entry[])=>Promise<void>=sendToGoogle){
 const owner=crypto.randomUUID(),now=Date.now();
 const lock=await statement("INSERT INTO sync_locks(name,owner,expires_at) VALUES('sheets',?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE sync_locks.expires_at<? RETURNING owner",owner,now+120000,now).first();
 if(!lock)throw new AppError('Hay una sincronización en curso.',409);
 try{
  const rows=await all(`SELECT s.*,v.sku,v.price,v.stock,v.reserved,v.active variant_active,v.commercial_verified,p.name,p.editorial_state,p.updated_at,b.name brand,b.active brand_active,
  COALESCE((SELECT group_concat(c.name, ' · ') FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=p.id),'') category,
  COALESCE((SELECT url FROM product_images WHERE product_id=p.id ORDER BY position,id LIMIT 1),'') image
  FROM sheet_sync s JOIN product_variants v ON v.id=s.variant_id JOIN products p ON p.id=v.product_id JOIN brands b ON b.id=p.brand_id
  WHERE s.revision>s.synced_revision AND s.next_attempt<=? ORDER BY s.variant_id LIMIT 100`,now);
  if(!rows.length)return{synced:0};
  try{
   await send(rows.map(r=>({range:"'Productos'!A"+(r.variant_id+1)+':I'+(r.variant_id+1),values:[[r.sku,r.name,r.brand,r.category,r.price??'',r.stock===null?'':Math.max(0,r.stock-r.reserved),r.image,!!(r.editorial_state==='publicado'&&r.brand_active&&r.variant_active&&r.commercial_verified&&r.price!==null&&r.stock!==null),r.updated_at??'']]})));
   for(const r of rows)await statement('UPDATE sheet_sync SET synced_revision=?,attempts=0,last_error=NULL,synced_at=? WHERE variant_id=?',r.revision,new Date().toISOString(),r.variant_id).run();
   return{synced:rows.length};
  }catch{
   for(const r of rows)await statement('UPDATE sheet_sync SET attempts=attempts+1,next_attempt=?,last_error=? WHERE variant_id=?',Date.now()+Math.min(3600000,30000*2**Math.min(r.attempts,7)),'No se pudo actualizar la copia en Google Sheets.',r.variant_id).run();
   throw new AppError('No se pudo sincronizar con Google Sheets. Los productos siguen guardados.',503);
  }
 }finally{await statement("DELETE FROM sync_locks WHERE name='sheets' AND owner=?",owner).run();}
}
