import {resolve} from 'node:path';
const origin=process.env.PUBLIC_ORIGIN||(process.env.RAILWAY_PUBLIC_DOMAIN?'https://'+process.env.RAILWAY_PUBLIC_DOMAIN:'');
if(process.env.NODE_ENV==='production'){
 if(origin&&new URL(origin).protocol!=='https:')throw new Error('Configura PUBLIC_ORIGIN HTTPS o un dominio Railway antes de iniciar.');
 if(!process.env.DATABASE_URL)throw new Error('Configura DATABASE_URL privada.');
}
if(origin){const parsed=new URL(origin);if(parsed.pathname!=='/'||parsed.search||parsed.hash||parsed.username||parsed.password)throw new Error('PUBLIC_ORIGIN debe ser un origen sin rutas.');process.env.PUBLIC_ORIGIN=parsed.origin;process.env.VINEXT_TRUSTED_HOSTS=parsed.host;}
const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Puerto inválido');
if(process.env.NODE_ENV==='production'&&!origin){
 const {Pool}=await import('pg');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000,statement_timeout:10000});
 pool.on('error',()=>console.error('La conexión de salud no está disponible.'));
 const {startBootstrapServer}=await import('./railway-bootstrap.mjs');
 await startBootstrapServer({port,host:process.env.HOST||'0.0.0.0',checkDatabase:()=>pool.query('SELECT 1')});
 console.log('Esperando el dominio Railway; operaciones del negocio bloqueadas.');
}else{
 const {startProdServer}=await import('vinext/server/prod-server');
 await startProdServer({port,host:process.env.HOST||'0.0.0.0',outDir:resolve('dist-railway')});
}
