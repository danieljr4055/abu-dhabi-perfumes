import {canonicalRequest} from '../../../src/server/request-origin';
import {authProviders,integrationInfo} from '../../../src/server/integration-info';
import {readJsonBody} from '../../../src/server/request-body';
import {googleChallenge,googleLogin,authorizeGoogleIdentity} from '../../../src/server/google-auth';
import {runSheetSync,sheetSyncStatus,checkSheetConnection,sheetImportEnabled,prepareSheetTemplate} from '../../../src/server/sheets-sync';
import {importSheetCatalog,sheetImportStatus} from '../../../src/server/sheet-master';
import {isSheetJob} from '../../../src/server/sheet-job-auth';
import { commerceApi } from '../../../src/server/commerce-api';
import { getStoreSettings,listPaymentMethods } from '../../../src/server/store-settings';
import { queryCatalog } from '../../../src/server/discovery';
import { AppError,whatsappMessage,whatsappUrl } from '../../../src/lib/domain';
import { listProducts,getProduct } from '../../../src/server/catalog';
import { createOrder,listOrders,getOrder,changeStatus,dashboard } from '../../../src/server/orders';
import { requireOrigin,requireUser,login,logout,rateLimit } from '../../../src/server/security';
import { productHistory,createUser,listUsers } from '../../../src/server/admin';
import { statement } from '../../../src/server/db';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function handle(request:Request){try{request=canonicalRequest(request);const url=new URL(request.url),path=url.pathname.slice(5).split('/').map(decodeURIComponent),method=request.method;let body:any={};if(method!=='GET'){requireOrigin(request);if(path.join('/')!=='auth/logout'||request.body!==null)body=await readJsonBody(request);}
 if(path.join('/')==='internal/sheet-import'&&method==='POST'){if(!isSheetJob(request))throw new AppError('Solicitud no autorizada.',401);return response(await importSheetCatalog());}
 if(path.join('/')==='health'&&method==='GET'){await statement('SELECT 1').first();return response({ok:true});}
 if(path.join('/')==='auth/providers'&&method==='GET')return response(authProviders());
 if(path[0]==='store'&&method==='GET')return response({settings:await getStoreSettings(),payments:await listPaymentMethods(true)});
 if(path[0]==='products'&&method==='GET')return response(path[1]?await getProduct(path[1]):await listProducts(url.searchParams));
 if(path[0]==='orders'&&path.length===1&&method==='POST'){await rateLimit(request,'checkout',15,900);const order=await createOrder(body);return response({order,whatsappUrl:whatsappUrl(whatsappMessage(order),order.whatsappNumber)},201);}
 if(path.join('/')==='auth/google/challenge'&&method==='POST'){const r=await googleChallenge(request);return response({clientId:r.clientId,nonce:r.nonce},200,{'Set-Cookie':r.cookie});}
 if(path.join('/')==='auth/google'&&method==='POST'){const r=await googleLogin(request,body);const result=response(r.user,200,{'Set-Cookie':r.cookie});result.headers.append('Set-Cookie',r.challengeCookie);return result;}
 if(path.join('/')==='auth/login'&&method==='POST'){const r=await login(request,body);return response(r.user,200,{'Set-Cookie':r.cookie});}
 if(path.join('/')==='auth/logout'&&method==='POST'){await logout(request);return response({ok:true},200,{'Set-Cookie':'perfume_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'});}
 if(path.join('/')==='auth/me'&&method==='GET')return response(await requireUser(false,request));
 if(path[0]==='advisor'){const user=await requireUser(false,request);if(method!=='GET')await rateLimit(request,'advisor-write',60,60,String(user.id));if(path[1]==='products'&&!path[2]&&method==='GET')return response(await queryCatalog(url.searchParams,true));if(path[1]==='dashboard'&&method==='GET')return response(await dashboard());if(path[1]==='orders'){if(method==='GET')return response(path[2]?await getOrder(path[2]):await listOrders(url.searchParams));if(method==='PATCH'&&path[2])return response(await changeStatus(path[2],body.status,body.version,user));}if(path[1]==='products'&&path[2]&&method==='GET')return response(await productHistory(path[2]));}
 if(path[0]==='admin'){const user=await requireUser(true,request);if(method!=='GET')await rateLimit(request,'admin-write',30,60,String(user.id));if(path[1]==='integrations'&&method==='GET')return response(await integrationInfo());if(path[1]==='google-identities'&&method==='POST')return response(await authorizeGoogleIdentity(body,user.id));if(path[1]==='sheets'&&path[2]==='import'&&method==='GET')return response(await sheetImportStatus());if(path[1]==='sheets'&&method==='GET')return response(await sheetSyncStatus());if(path[1]==='sheets'&&path[2]==='template'&&method==='POST')return response(await prepareSheetTemplate());if(path[1]==='sheets'&&path[2]==='check'&&method==='POST')return response(await checkSheetConnection());if(path[1]==='sheets'&&method==='POST')return response(sheetImportEnabled()?await importSheetCatalog():await runSheetSync());if(path[1]==='commerce')return response(await commerceApi(path[2],path[3],method,body,url.searchParams,user.id));if(path[1]==='products'&&['POST','PATCH'].includes(method))throw new AppError('Edita el producto desde Administrar tienda.',410);if(path[1]==='users'){if(method==='GET')return response(await listUsers());if(method==='POST')return response(await createUser(body));if(method==='PATCH'&&path[2]){if(Number(path[2])===user.id)throw new AppError('No puedes desactivar tu propia cuenta.');if(Object.keys(body).some(k=>k!=='active')||![0,1].includes(body.active))throw new AppError('Estado no válido.');await statement("UPDATE users SET active=? WHERE id=? AND role='advisor'",body.active,Number(path[2])).run();return response({ok:true});}}}
 throw new AppError('Ruta no encontrada.',404);
 }catch(error){if(error instanceof AppError)return response({error:error.message},error.status);if(String(error).includes('UNIQUE constraint'))return response({error:'Este código o usuario ya existe.'},409);console.error('API operation failed',error instanceof Error?error.message:'unknown');return response({error:'No pudimos completar la operación. Tus datos siguen en el formulario. Intenta nuevamente.'},503);}}
export const GET=handle;export const POST=handle;export const PATCH=handle;
