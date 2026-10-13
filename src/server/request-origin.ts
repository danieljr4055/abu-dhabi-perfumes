import {env} from 'cloudflare:workers';
export function canonicalRequest(request:Request,configured=(env as unknown as Record<string,string>).PUBLIC_ORIGIN){
 if(!configured)return request;
 const origin=new URL(configured);
 if(!['http:','https:'].includes(origin.protocol)||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw new Error('PUBLIC_ORIGIN inválido');
 const url=new URL(request.url);
 return new Request(new URL(url.pathname+url.search,origin.origin),request);
}
