import {z} from 'zod';
import {all,one,db,statement} from './db';import {parse,slugSchema,safeImage} from './taxonomy';import {AppError} from '../lib/domain';
export const ruleSchema=z.object({field:z.enum(['brand','note','family','category','occasion','season','featured','new','offer']),value:z.string().min(1).max(120)});
export type CollectionRule=z.infer<typeof ruleSchema>;
const schema=z.object({name:z.string().min(2).max(120),slug:slugSchema,description:z.string().max(3000).default(''),image:safeImage.nullable().default(null),mode:z.enum(['manual','automatic']),active:z.boolean().default(true),version:z.number().int().default(0),rules:z.array(ruleSchema).max(15).default([]),productIds:z.array(z.number().int().positive()).max(500).default([])});
export async function listCollections(publicOnly=false){const rows=await all('SELECT * FROM collections'+(publicOnly?' WHERE active=1':'')+' ORDER BY name');return Promise.all(rows.map(async c=>({...c,active:!!c.active,rules:await all('SELECT field,value FROM collection_rules WHERE collection_id=?',c.id),productIds:(await all('SELECT product_id FROM collection_products WHERE collection_id=?',c.id)).map(p=>p.product_id)})));}
export async function saveCollection(input:unknown,id?:number){const p=parse(schema,input);const token=crypto.randomUUID();
const previous=id?await one('SELECT * FROM collections WHERE id=?',id):null;
if(id&&!previous)throw new AppError('Colección no encontrada.',404);
if(previous&&previous.version!==p.version)throw new AppError('La colección cambió. Recarga.',409);
const batch=[id?statement('UPDATE collections SET name=?,slug=?,description=?,image=?,mode=?,active=?,version=version+1,edit_token=? WHERE id=? AND version=?',p.name,p.slug,p.description,p.image,p.mode,+p.active,token,id,p.version):statement('INSERT INTO collections(name,slug,description,image,mode,active,edit_token) VALUES(?,?,?,?,?,?,?)',p.name,p.slug,p.description,p.image,p.mode,+p.active,token)];
const sub='(SELECT id FROM collections WHERE slug=? AND edit_token=?)';const guard='EXISTS(SELECT 1 FROM collections WHERE slug=? AND edit_token=?)';
if(previous&&previous.slug!==p.slug)batch.push(statement(`INSERT INTO slug_redirects SELECT 'collections',?,id FROM collections WHERE slug=? AND edit_token=? ON CONFLICT(entity_kind,old_slug) DO UPDATE SET entity_id=excluded.entity_id`,previous.slug,p.slug,token));
for(const t of ['collection_products','collection_rules'])batch.push(statement(`DELETE FROM ${t} WHERE collection_id=${sub}`,p.slug,token));
for(const id of new Set(p.productIds))batch.push(statement(`INSERT INTO collection_products SELECT ${sub},? WHERE ${guard}`,p.slug,token,id,p.slug,token));
for(const r of p.rules)batch.push(statement(`INSERT INTO collection_rules SELECT ${sub},?,? WHERE ${guard}`,p.slug,token,r.field,r.value,p.slug,token));
const result=await db().batch(batch);if(!result[0].meta.changes)throw new AppError('La colección cambió. Recarga.',409);return(await listCollections()).find(c=>c.slug===p.slug)!;}
