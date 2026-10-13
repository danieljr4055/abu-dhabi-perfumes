// Adapter for the application's fixed, server-owned SQL. Not a general SQL transpiler.
type Result={rows:Record<string,unknown>[];rowCount:number|null};
type Client={query:(sql:string,args?:unknown[])=>Promise<Result>;release:()=>void};
type Pool={query:Client['query'];connect:()=>Promise<Client>};
const idTables=new Set(['customers','order_events','order_items','orders','products','users','brands','olfactory_families','notes','categories','product_images','product_variants','collections','store_settings','payment_methods','social_posts','import_runs','source_records','admin_events']);
export function postgresSql(sql:string,returnId=true){
 sql=sql.replace(/json_each\((p\.(?:occasion|season))\)/g,'jsonb_array_elements_text($1::jsonb) AS _store_json(value)')
  .replace(/group_concat\(c\.name, ' · '\)/g,"string_agg(c.name, ' · ')")
  .replace(/date\(created_at,'-5 hours'\)/g,"((created_at::timestamptz AT TIME ZONE 'America/Bogota')::date)")
  .replace(/date\('now','-5 hours'\)/g,"((CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date)");
 let quote='',index=0,output='',previousWord='';
 for(let i=0;i<sql.length;i++){
  const ch=sql[i];
  if(ch===quote){output+=ch;if(sql[i+1]===quote){output+=sql[++i];continue;}quote='';}
  else if(!quote&&(ch==="'"||ch==='"')){quote=ch;output+=ch;}
  else if(!quote&&/[a-z_]/i.test(ch)){
   const word=/^[a-z_][a-z0-9_]*/i.exec(sql.slice(i))![0];
   output+=word.toLowerCase()==='authorization'||(previousWord==='as'&&/[a-z][A-Z]/.test(word))?'"'+word+'"':word;
   previousWord=word.toLowerCase();i+=word.length-1;
  }else output+=ch==='?'&&!quote?'$'+(++index):ch;
 }
 const table=/^\s*INSERT\s+INTO\s+([a-z_]+)/i.exec(output)?.[1];
 if(returnId&&table&&idTables.has(table)&&! /\bRETURNING\b/i.test(output))output+=' RETURNING id';
 return output;
}
function normalized(rows:Record<string,unknown>[]){
 // pg returns int8 (counts and epoch milliseconds) as strings by default.
 return rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>{
  if(typeof v==='bigint'){const n=Number(v);if(!Number.isSafeInteger(n))throw new Error('Unsafe database integer');return[k,n];}
  if(typeof v==='string'&&['count','low','empty','products','expires_at','reset_at','next_attempt','subtotal','total','old_price','oldPrice'].includes(k)&&/^\d+$/.test(v)){const n=Number(v);if(!Number.isSafeInteger(n))throw new Error('Unsafe database integer');return[k,n];}
  return[k,v];
 })));
}
function databaseError(error:unknown){
 const e=error as Error&{code?:string};
 if(e.code==='23514')return new Error('CHECK constraint: '+e.message);
 if(e.code==='23505')return new Error('UNIQUE constraint: '+e.message);
 return error;
}
class Prepared{
 private pool:Pool;private sql:string;private args:unknown[];
 constructor(pool:Pool,sql:string,args:unknown[]=[]){this.pool=pool;this.sql=sql;this.args=args;}
 bind(...args:unknown[]){return new Prepared(this.pool,this.sql,args);}
 async execute(client:Pick<Client,'query'>){
  try{const r=await client.query(postgresSql(this.sql),this.args);return{success:true,results:normalized(r.rows),meta:{changes:r.rowCount??0,last_row_id:r.rows[0]?.id??0}};}
  catch(e){throw databaseError(e);}
 }
 async first<T=Record<string,unknown>>(){return (await this.execute(this.pool)).results[0] as T??null;}
 async all<T=Record<string,unknown>>(){const r=await this.execute(this.pool);return{...r,results:r.results as T[]};}
 async run(){return this.execute(this.pool);}
}
export function createPostgresDatabase(pool:Pool){
 return{
  prepare:(sql:string)=>new Prepared(pool,sql),
  async batch(statements:Prepared[]){
   for(let attempt=0;attempt<3;attempt++){
    const client=await pool.connect();
    try{
     await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
     const results=[];for(const s of statements)results.push(await s.execute(client));
     await client.query('COMMIT');return results;
    }catch(error){
     await client.query('ROLLBACK');
     const code=(error as {code?:string}).code;
     if(!['40001','40P01'].includes(code??'')||attempt===2)throw error;
    }finally{client.release();}
   }
   throw new Error('Transaction retry exhausted');
  }
 };
}
