import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier==='next/headers')return{url:new URL('./request-context.mjs',import.meta.url).href,shortCircuit:true};
 if(specifier==='cloudflare:workers')return{url:new URL('./worker-env.mjs',import.meta.url).href,shortCircuit:true};
 if(specifier.startsWith('.')&&context.parentURL){const url=new URL(specifier,context.parentURL);if(!/\.[a-z]+$/i.test(url.pathname)&&existsSync(new URL(url.href+'.ts')))return{url:url.href+'.ts',shortCircuit:true};}
 return next(specifier,context);
}});
export function setup(){
 const raw=new DatabaseSync(':memory:');
 for(const f of ['0000_volatile_whirlwind.sql','0001_discovery.sql','0002_security.sql'])raw.exec(readFileSync(new URL('../../drizzle/'+f,import.meta.url),'utf8'));
 function prepared(sql,args=[]){return{bind(...values){return prepared(sql,values)},async first(){return raw.prepare(sql).get(...args)??null},async all(){return{results:raw.prepare(sql).all(...args)}},async run(){const r=raw.prepare(sql).run(...args);return{meta:{changes:r.changes,last_row_id:r.lastInsertRowid}}}}}
 globalThis.__testDB={prepare:prepared,async batch(statements){raw.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());raw.exec('COMMIT');return out;}catch(e){raw.exec('ROLLBACK');throw e;}}};
 return raw;
}
