import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {all,one,statement,db} from './db';
import {AppError,normalize} from '../lib/domain';
import type {Taxonomy,TaxonomyKind} from '../lib/commerce-types';
export const taxonomyTables:Record<TaxonomyKind,string>={brands:'brands',notes:'notes',families:'olfactory_families',categories:'categories'};
export const safeImage=z.string().max(1000).refine(v=>{
 if(/^\/images\/[\w/.-]+$/.test(v))return !v.split('/').some(segment=>segment==='.'||segment==='..');
 try{const url=new URL(v);const allowed=(String((env as unknown as Record<string,string>).IMAGE_ALLOWED_HOSTS??'')).split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&allowed.includes(url.hostname.toLowerCase());}catch{return false;}
},'Usa una imagen local o un dominio HTTPS autorizado.');
export const slugSchema=z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export function parse<S extends z.ZodTypeAny>(schema:S,input:unknown):z.output<S>{const r=schema.safeParse(input);if(!r.success)throw new AppError(r.error.issues[0].message,422);return r.data;}
const schema=z.object({name:z.string().trim().min(2).max(120),slug:slugSchema,description:z.string().max(3000).default(''),image:safeImage.nullable().default(null),active:z.boolean().default(true),version:z.number().int().min(0).default(0),familyId:z.number().int().positive().nullable().default(null)});
type Row={id:number;name:string;slug:string;description:string;image:string|null;active:number;version:number;family_id?:number|null};
export function taxonomyRow(r:Row):Taxonomy{return{...r,active:!!r.active,familyId:r.family_id??null};}
export async function listTaxonomy(kind:TaxonomyKind){return(await all<Row>(`SELECT * FROM ${taxonomyTables[kind]} ORDER BY name`)).map(taxonomyRow);}
export async function saveTaxonomy(kind:TaxonomyKind,input:unknown,id?:number){
 const table=taxonomyTables[kind];if(!table)throw new AppError('Clasificación no válida.',404);
 const p=parse(schema,input);
 if(kind==='notes'&&p.familyId&&!await one('SELECT id FROM olfactory_families WHERE id=?',p.familyId))throw new AppError('La familia no existe.',422);
 const fields=['name','slug','description','image','active','search_text',...(kind==='notes'?['family_id']:[])];
 const values:unknown[]=[p.name,p.slug,p.description,p.image,+p.active,normalize(p.name+' '+p.description),...(kind==='notes'?[p.familyId]:[])];
 if(id){
  const current=await one<Row>(`SELECT * FROM ${table} WHERE id=?`,id);if(!current)throw new AppError('Registro no encontrado.',404);
  if(current.version!==p.version)throw new AppError('El registro cambió. Recarga antes de guardar.',409);
  const batch=[statement(`UPDATE ${table} SET ${fields.map(f=>f+'=?').join(',')},version=version+1 WHERE id=? AND version=?`,...values,id,p.version)];
  if(current.slug!==p.slug)batch.push(statement(`INSERT INTO slug_redirects(entity_kind,old_slug,entity_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM ${table} WHERE id=? AND version=? AND slug=?) ON CONFLICT(entity_kind,old_slug) DO UPDATE SET entity_id=excluded.entity_id`,kind,current.slug,id,id,p.version+1,p.slug));
  const result=await db().batch(batch);if(!result[0].meta.changes)throw new AppError('El registro cambió. Recarga.',409);
 }else{const result=await statement(`INSERT INTO ${table}(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`,...values).run();id=Number(result.meta.last_row_id);}
 return taxonomyRow((await one<Row>(`SELECT * FROM ${table} WHERE id=?`,id))!);
}
