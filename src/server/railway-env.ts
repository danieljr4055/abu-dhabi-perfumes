import {Pool} from 'pg';
import {createPostgresDatabase} from './postgres';
let database:ReturnType<typeof createPostgresDatabase>|undefined;
export const env=new Proxy({} as Record<string,unknown>,{
 get(_target,key){
  if(key==='DB'){
   if(!database){
    if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL no está configurada');
    const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,statement_timeout:15000});
    pool.on('error',()=>console.error('La conexión de base de datos no está disponible.'));
    database=createPostgresDatabase(pool);
   }
   return database;
  }
  if(key==='STORE_RUNTIME')return 'railway';
  if(key==='PUBLIC_ORIGIN')return process.env.PUBLIC_ORIGIN||(process.env.RAILWAY_PUBLIC_DOMAIN?'https://'+process.env.RAILWAY_PUBLIC_DOMAIN:undefined);
  return process.env[String(key)];
 }
});
