import {z} from 'zod';
import {parse,saveTaxonomy,listTaxonomy} from './taxonomy';
import {saveCatalogProduct} from './product-editor';
import {one,statement} from './db';
import {normalize} from '../lib/domain';
const plain=z.string().trim().min(1).max(200).refine(s=>!/[<>]/.test(s),'Usa texto plano.');
const record=z.object({sourceUrl:z.string().url().refine(s=>{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='perfumeriamillennio.com'&&!u.username&&!u.password}),externalId:plain,checkedAt:z.string().min(10).max(40),name:plain,brand:plain.nullable(),concentration:plain.nullable().default(null),gender:z.enum(['Hombre','Mujer','Unisex']).nullable().default(null),notes:z.array(z.object({name:plain,phase:z.enum(['salida','corazon','fondo'])})).max(60),presentations:z.array(z.object({sizeMl:z.number().positive().max(2000),kind:z.enum(['frasco','decant']).nullable()})).max(30),missingFields:z.array(plain).max(30)}).strict();
const batchSchema=z.object({discovered:z.number().int().nonnegative(),records:z.array(record).max(20),errors:z.array(z.object({sourceUrl:z.string(),message:z.string()})).default([])});
const slug=(s:string)=>normalize(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export async function previewImport(input:unknown){return parse(batchSchema,input);}
export async function commitImport(input:unknown){
 const batch=await previewImport(input);let created=0,skipped=0;const errors=[...batch.errors];
 for(const r of batch.records){try{
 if(await one('SELECT id FROM source_records WHERE source_url=? AND external_id=?',r.sourceUrl,r.externalId)){skipped++;continue;}
 if(!r.brand||!r.presentations.some(p=>p.kind)){errors.push({sourceUrl:r.sourceUrl,message:'Faltan marca o presentación identificada.'});continue;}
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.sourceUrl+'|'+r.externalId))),b=>b.toString(16).padStart(2,'0')).join('').slice(0,12);
 const code='REF-'+hash.toUpperCase();let product=await one('SELECT id FROM products WHERE code=?',code);
 if(!product){
 const brands=await listTaxonomy('brands');const brand=brands.find(b=>normalize(b.name)===normalize(r.brand!))??await saveTaxonomy('brands',{name:r.brand,slug:slug(r.brand)});
 const notes=[];for(const [position,n]of r.notes.entries()){const existing=(await listTaxonomy('notes')).find(x=>normalize(x.name)===normalize(n.name));const note=existing??await saveTaxonomy('notes',{name:n.name,slug:slug(n.name)});notes.push({noteId:note.id,phase:n.phase,position});}
 product=await saveCatalogProduct({code,slug:slug(r.brand+' '+r.name)+'-'+hash.slice(0,6),name:r.name,brandId:brand.id,gender:r.gender??'Por confirmar',concentration:r.concentration,state:'borrador',notes,images:[],variants:r.presentations.filter(v=>v.kind).map((v,i)=>({sku:code+'-'+(i+1),kind:v.kind,sizeMl:v.sizeMl,price:null,stock:null,commercialVerified:false}))});
 }
 await statement('INSERT INTO source_records(source_url,external_id,checked_at,product_id,verified_fields) VALUES(?,?,?,?,?) ON CONFLICT(source_url,external_id) DO NOTHING',r.sourceUrl,r.externalId,r.checkedAt,product.id,JSON.stringify(r)).run();created++;
 }catch{errors.push({sourceUrl:r.sourceUrl,message:'No se pudo importar. Revisa identidad, notas y presentaciones; puedes reintentar sin duplicar códigos.'});}}
 const run=await statement('INSERT INTO import_runs(created_at,discovered,reviewed,created,skipped,errors) VALUES(?,?,?,?,?,?)',new Date().toISOString(),batch.discovered,batch.records.length,created,skipped,JSON.stringify(errors)).run();
 return{runId:run.meta.last_row_id,created,skipped,errors:errors.length,details:errors};
}
