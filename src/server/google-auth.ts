import {env} from 'cloudflare:workers';
import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
import {z} from 'zod';
import {AppError} from '../lib/domain';
import {db,one,statement} from './db';
import {digest,rateLimit,createSession} from './security';
import {parse} from './taxonomy';

const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const config=()=>env as unknown as Record<string,string>;
const cookie=(request:Request,value:string,age:number)=>'google_challenge='+value+'; HttpOnly; Path=/api/auth; SameSite=Strict; Max-Age='+age+(new URL(request.url).protocol==='https:'?'; Secure':'');

export async function verifyGoogleCredential(credential:string,clientId:string,nonce:string,key:JWTVerifyGetKey=keys) {
 const {payload}=await jwtVerify(credential,key,{
  algorithms:['RS256'],audience:clientId,
  issuer:['https://accounts.google.com','accounts.google.com'],
  requiredClaims:['sub','exp','email','email_verified','nonce']
 });
 if(payload.nonce!==nonce||payload.email_verified!==true||typeof payload.email!=='string'||!payload.sub)
  throw new AppError('No pudimos verificar el acceso.',401);
 return payload;
}
export async function googleChallenge(request:Request) {
 const clientId=config().GOOGLE_CLIENT_ID;
 if(!clientId)throw new AppError('El acceso con Google aún no está configurado.',503);
 await rateLimit(request,'google-challenge',20,900);
 const nonce=crypto.randomUUID()+crypto.randomUUID();
 await db().batch([
  statement('DELETE FROM login_challenges WHERE expires_at<?',Date.now()),
  statement('INSERT INTO login_challenges(hash,expires_at) VALUES(?,?)',await digest(nonce),Date.now()+300000)
 ]);
 return {clientId,nonce,cookie:cookie(request,nonce,300)};
}
export async function googleLogin(request:Request,input:unknown,key:JWTVerifyGetKey=keys) {
 const {credential}=parse(z.object({credential:z.string().min(10).max(12000)}).strict(),input);
 if(!config().GOOGLE_CLIENT_ID)throw new AppError('El acceso con Google aún no está configurado.',503);
 await rateLimit(request,'google-login',15,900);
 const nonce=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('google_challenge='))?.slice(17);
 if(!nonce)throw new AppError('Reinicia el acceso con Google.',401);
 let payload;
 try{payload=await verifyGoogleCredential(credential,config().GOOGLE_CLIENT_ID,nonce,key);}
 catch{throw new AppError('No pudimos verificar el acceso.',401);}
 const consumed=await statement('DELETE FROM login_challenges WHERE hash=? AND expires_at>? RETURNING hash',await digest(nonce),Date.now()).first();
 if(!consumed)throw new AppError('El intento de acceso venció. Intenta nuevamente.',401);
 const email=String(payload.email).toLowerCase();
 let identity=await one('SELECT g.*,u.active user_active FROM google_identities g JOIN users u ON u.id=g.user_id WHERE g.google_sub=? OR (g.google_sub IS NULL AND g.email=?)',payload.sub,email);
 if(!identity?.active||!identity.user_active)throw new AppError('Esta cuenta no tiene acceso autorizado.',403);
 // For first-time email linking, Google must be authoritative for that address.
 if(!identity.google_sub){
  if(!email.endsWith('@gmail.com')&&typeof payload.hd!=='string')throw new AppError('Esta cuenta requiere vinculación previa por su identificador Google.',403);
  await statement('UPDATE google_identities SET google_sub=? WHERE user_id=? AND google_sub IS NULL AND active=1',payload.sub,identity.user_id).run();
  identity=await one('SELECT * FROM google_identities WHERE user_id=? AND google_sub=? AND active=1',identity.user_id,payload.sub);
  if(!identity)throw new AppError('Esta cuenta no tiene acceso autorizado.',403);
 }
 const user=await one('SELECT id,name,username,role,active FROM users WHERE id=? AND active=1',identity.user_id);
 if(!user)throw new AppError('Esta cuenta no tiene acceso autorizado.',403);
 return {...await createSession(request,user),challengeCookie:cookie(request,'',0)};
}

export async function authorizeGoogleIdentity(input:unknown,actorId:number){
 const p=parse(z.object({userId:z.number().int().positive(),email:z.string().email().max(254).transform(s=>s.toLowerCase()),googleSub:z.string().regex(/^[0-9]{1,255}$/).nullable().optional(),active:z.boolean()}).strict(),input);
 if(!await one('SELECT id FROM users WHERE id=?',p.userId))throw new AppError('Usuario no encontrado.',404);
 const existing=await one('SELECT email,google_sub FROM google_identities WHERE user_id=?',p.userId);if(existing?.google_sub&&existing.email!==p.email&&p.googleSub===undefined)throw new AppError('Una cuenta vinculada no puede cambiar de correo desde este formulario.',422);
 if(p.userId===actorId&&!p.active)throw new AppError('No puedes revocar tu propio acceso.',422);
 await db().batch([
  statement('INSERT INTO google_identities(user_id,email,google_sub,active) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,google_sub=excluded.google_sub,active=excluded.active',p.userId,p.email,p.googleSub===undefined?(existing?.google_sub??null):p.googleSub,+p.active),
  statement('DELETE FROM sessions WHERE user_id=?',p.userId),
  statement('INSERT INTO admin_events(actor_id,action,entity_code,created_at) VALUES(?,?,?,?)',actorId,p.active?'google.authorize':'google.revoke',String(p.userId),new Date().toISOString())
 ]);
 return {ok:true};
}
