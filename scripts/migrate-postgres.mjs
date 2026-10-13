import {Pool} from 'pg';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export async function migrate(client,migrations){
 await client.query('BEGIN');
 try{
  await client.query('SELECT pg_advisory_xact_lock(7552026)');
  await client.query('CREATE TABLE IF NOT EXISTS store_migrations(name TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for(const file of migrations){
   const checksum=createHash('sha256').update(file.sql).digest('hex');
   const applied=await client.query('SELECT checksum FROM store_migrations WHERE name=$1',[file.name]);
   if(applied.rows.length){if(applied.rows[0].checksum!==checksum)throw new Error('Migration checksum mismatch: '+file.name);continue;}
   await client.query(file.sql);
   await client.query('INSERT INTO store_migrations(name,checksum) VALUES($1,$2)',[file.name,checksum]);
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.env.DATABASE_URL)throw new Error('Configura DATABASE_URL en el servicio.');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:15000});
 const client=await pool.connect();
 try{
  const folder=new URL('../postgres/',import.meta.url);
  const files=readdirSync(folder).filter(f=>/^\d+.*\.sql$/.test(f)).sort().map(name=>({name,sql:readFileSync(new URL(name,folder),'utf8')}));
  await migrate(client,files);console.log('Esquema PostgreSQL verificado y migrado.');
 }catch(error){console.error('Migración detenida sin guardar cambios. Código:',error.code??'MIGRATION_FAILED');process.exitCode=1;}
 finally{client.release();await pool.end();}
}
