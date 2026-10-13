import {createServer} from 'node:http';
// Before Railway assigns a domain, expose no storefront, authentication or writes.
export async function startBootstrapServer({port,host,checkDatabase}){
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='GET'&&req.url==='/api/health'){
   try{await checkDatabase();res.writeHead(200);res.end(JSON.stringify({ok:true,setup:'domain-pending'}));return;}catch{}
  }
  res.writeHead(503);res.end(JSON.stringify({error:'La tienda está completando su configuración.'}));
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
 return server;
}
