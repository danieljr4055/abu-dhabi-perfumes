import {z} from 'zod';
import {db,all,one,statement} from './db';
import {parse,safeImage,slugSchema,taxonomyRow} from './taxonomy';
import {AppError,normalize} from '../lib/domain';
import type {Variant,NoteRelation,EditorialState} from '../lib/commerce-types';
import type {Product} from '../lib/types';
export type ManagedProduct=Product & {stock:number;reserved:number;sold:number;version:number;active:number;slug:string;brandId:number;brandSlug:string;state:EditorialState;concentration:string|null;performance:string|null;projection:string|null;occasion:string[];season:string[];isNew:boolean;notes:NoteRelation[];categoryIds:number[];variants:Variant[];imageRecords:{url:string;alt:string;position:number;source:string|null;authorization:string|null}[];variantId?:number;sku?:string;kind?:string;priceKnown:boolean};
const variantSchema=z.object({id:z.number().int().positive().optional(),sku:z.string().regex(/^[A-Z0-9-]{3,60}$/),kind:z.enum(['frasco','decant']),sizeMl:z.number().positive().max(2000),price:z.number().int().positive().max(100000000).nullable().default(null),oldPrice:z.number().int().positive().nullable().default(null),stock:z.number().int().nonnegative().max(1000000).nullable().default(null),active:z.boolean().default(true),commercialVerified:z.boolean().default(false),version:z.number().int().default(0)}).strict();
export const editorSchema=z.object({code:z.string().regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/).max(40),slug:slugSchema,name:z.string().trim().min(2).max(120),brandId:z.number().int().positive(),gender:z.enum(['Hombre','Mujer','Unisex','Por confirmar']),description:z.string().max(4000).default(''),state:z.enum(['borrador','publicado','archivado']).default('borrador'),concentration:z.string().max(100).nullable().default(null),performance:z.string().max(200).nullable().default(null),projection:z.string().max(200).nullable().default(null),occasion:z.array(z.string().max(60)).max(10).default([]),season:z.array(z.string().max(60)).max(10).default([]),featured:z.boolean().default(false),isNew:z.boolean().default(false),version:z.number().int().default(0),categoryIds:z.array(z.number().int().positive()).max(20).default([]),notes:z.array(z.object({noteId:z.number().int().positive(),phase:z.enum(['salida','corazon','fondo']),position:z.number().int().nonnegative().default(0)}).strict()).max(60).default([]),images:z.array(z.object({url:safeImage,alt:z.string().min(2).max(200),source:z.string().max(1000).nullable().default(null),authorization:z.string().max(1000).nullable().default(null)}).strict()).max(20).default([]),variants:z.array(variantSchema).min(1).max(30)}).strict();
export function variantRow(r:Record<string,unknown>):Variant{return{id:Number(r.id),productId:Number(r.product_id),sku:String(r.sku),kind:r.kind as Variant['kind'],sizeMl:Number(r.size_ml),price:r.price as number|null,oldPrice:r.old_price as number|null,stock:r.stock as number|null,reserved:Number(r.reserved),sold:Number(r.sold),active:!!r.active,commercialVerified:!!r.commercial_verified,version:Number(r.version),sheetBlocked:!!r.sheet_blocked};}
export async function hydrateProducts(rows:Record<string,any>[]):Promise<ManagedProduct[]>{
 if(!rows.length)return[];
 const ids=rows.map(p=>p.id),marks=ids.map(()=>'?').join(',');
 const [variants,notes,images,categories]=await Promise.all([
 all(`SELECT * FROM product_variants WHERE product_id IN (${marks}) ORDER BY id`,...ids),
 all(`SELECT pn.*,n.name,n.slug,n.description,n.image,n.active,n.version,n.family_id FROM product_notes pn JOIN notes n ON n.id=pn.note_id WHERE product_id IN (${marks}) ORDER BY position`,...ids),
 all(`SELECT * FROM product_images WHERE product_id IN (${marks}) ORDER BY position,id`,...ids),
 all(`SELECT pc.*,c.name FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE product_id IN (${marks})`,...ids)]);
 return rows.map(p=>{const vs=variants.filter(v=>v.product_id===p.id).map(variantRow);const v=vs.find(v=>v.active&&v.commercialVerified&&v.price!==null&&v.stock!==null&&!v.sheetBlocked&&v.stock>v.reserved)??vs.find(v=>v.active&&v.commercialVerified&&v.price!==null&&v.stock!==null)??vs[0];const ims=images.filter(i=>i.product_id===p.id);return{...p,brand:p.brand_name??p.brand,brandId:p.brand_id,brandSlug:p.brand_slug??'',state:p.editorial_state,concentration:p.concentration,performance:p.performance,projection:p.projection,occasion:JSON.parse(p.occasion),season:JSON.parse(p.season),isNew:!!p.is_new,createdAt:p.created_at,category:categories.filter(c=>c.product_id===p.id).map(c=>c.name).join(' · '),categoryIds:categories.filter(c=>c.product_id===p.id).map(c=>c.category_id),notes:notes.filter(n=>n.product_id===p.id).map(n=>({noteId:n.note_id,phase:n.phase,position:n.position,note:taxonomyRow({...n,id:n.note_id})})),variants:vs,imageRecords:ims,images:ims.map(i=>i.url),tags:JSON.parse(p.tags),price:v?.price??0,priceKnown:!!v?.commercialVerified&&v.price!==null,oldPrice:v?.oldPrice??null,size:v?`${v.sizeMl} ml · ${v.kind}`:'',variantId:v?.id,sku:v?.sku,kind:v?.kind,stock:v?.stock??0,reserved:v?.reserved??0,sold:vs.reduce((s,v)=>s+v.sold,0),available:v?.active&&v.commercialVerified&&v.price!==null&&v.stock!==null?(v.sheetBlocked?0:Math.max(0,v.stock-v.reserved)):0} as ManagedProduct;});
}
export async function getAdvisorProduct(code:string){const row=await one('SELECT p.*,b.name brand_name,b.slug brand_slug FROM products p JOIN brands b ON b.id=p.brand_id WHERE p.code=?',code);if(!row)throw new AppError('Producto no encontrado.',404);return(await hydrateProducts([row]))[0];}
export async function saveCatalogProduct(input:unknown,id?:number,actorId?:number,appendTransaction?:(token:string)=>ReturnType<typeof statement>[]){
 const p=parse(editorSchema,input);const brand=await one('SELECT * FROM brands WHERE id=?',p.brandId);if(!brand)throw new AppError('La marca no existe.',422);
 for(const n of p.notes)if(!await one('SELECT id FROM notes WHERE id=?',n.noteId))throw new AppError('Una nota no existe.',422);
 for(const c of p.categoryIds)if(!await one('SELECT id FROM categories WHERE id=?',c))throw new AppError('Una categoría no existe.',422);
 if(new Set(p.variants.map(v=>v.sku)).size!==p.variants.length)throw new AppError('Los SKU deben ser únicos.',422);
 if(p.state==='publicado'){
  if(!brand.active)throw new AppError('Activa la marca antes de publicar.',422);
  if(['salida','corazon','fondo'].some(f=>!p.notes.some(n=>n.phase===f)))throw new AppError('Añade al menos una nota en cada fase.',422);
  if(p.images.length<3)throw new AppError('Publicar requiere tres imágenes.',422);
  if(!p.variants.some(v=>v.active&&v.commercialVerified&&v.price!==null&&v.stock!==null))throw new AppError('Confirma precio y stock de una presentación.',422);
 }
 const token=crypto.randomUUID();const current=id?await one('SELECT * FROM products WHERE id=?',id):null;
 if(id&&!current)throw new AppError('Producto no encontrado.',404);
 if(current&&current.code!==p.code)throw new AppError('El código es permanente.',422);
 if(current&&current.version!==p.version)throw new AppError('El producto cambió. Recarga.',409);
 const previous=id?await all('SELECT * FROM product_variants WHERE product_id=?',id):[];
 for(const v of previous){const incoming=p.variants.find(i=>i.id===v.id);if(!incoming)throw new AppError('Conserva las presentaciones existentes; puedes desactivarlas.',422);if(incoming.sku!==v.sku)throw new AppError('El SKU es permanente.',422);if(incoming.version!==v.version)throw new AppError('El inventario cambió. Recarga.',409);}
 for(const v of p.variants)if(v.id&&!previous.some(i=>i.id===v.id))throw new AppError('Presentación ajena al producto.',422);
 const fields=['name','brand','brand_id','slug','gender','description','editorial_state','concentration','performance','projection','occasion','season','featured','is_new','images','search_text','edit_token'];
 const vals:unknown[]=[p.name,brand.name,p.brandId,p.slug,p.gender,p.description,p.state,p.concentration,p.performance,p.projection,JSON.stringify(p.occasion),JSON.stringify(p.season),+p.featured,+p.isNew,JSON.stringify(p.images.map(i=>i.url)),normalize(p.name+' '+p.code+' '+p.gender),token];
 const batch=[];
 if(current)batch.push(statement(`UPDATE products SET ${fields.map(f=>f+'=?').join(',')},version=version+1 WHERE id=? AND version=?`,...vals,id,p.version));
 else batch.push(statement(`INSERT INTO products(${fields.join(',')},code,category,price,size,tags,created_at) VALUES(${fields.map(()=>'?').join(',')},?,'',0,'','[]',?)`,...vals,p.code,new Date().toISOString()));
 const productId='(SELECT id FROM products WHERE code=? AND edit_token=?)';
 const guard='EXISTS(SELECT 1 FROM products WHERE code=? AND edit_token=?)';
 if(current&&current.slug!==p.slug)batch.push(statement(`INSERT INTO slug_redirects(entity_kind,old_slug,entity_id) SELECT 'products',?,id FROM products WHERE code=? AND edit_token=? ON CONFLICT(entity_kind,old_slug) DO UPDATE SET entity_id=excluded.entity_id`,current.slug,p.code,token));
 for(const table of ['product_notes','product_categories','product_images'])batch.push(statement(`DELETE FROM ${table} WHERE product_id=${productId}`,p.code,token));
 for(const n of p.notes)batch.push(statement(`INSERT INTO product_notes(product_id,note_id,phase,position) SELECT ${productId},?,?,? WHERE ${guard}`,p.code,token,n.noteId,n.phase,n.position,p.code,token));
 for(const c of p.categoryIds)batch.push(statement(`INSERT INTO product_categories SELECT ${productId},? WHERE ${guard}`,p.code,token,c,p.code,token));
 p.images.forEach((i,index)=>batch.push(statement(`INSERT INTO product_images(product_id,url,alt,position,source,authorization) SELECT ${productId},?,?,?,?,? WHERE ${guard}`,p.code,token,i.url,i.alt,index,i.source,i.authorization,p.code,token)));
 for(const v of p.variants){
  if(v.id)batch.push(statement('INSERT INTO transaction_checks(ok) SELECT CASE WHEN EXISTS(SELECT 1 FROM product_variants WHERE id=? AND version=?) THEN 1 ELSE 0 END',v.id,v.version));
  if(v.id)batch.push(statement(`UPDATE product_variants SET kind=?,size_ml=?,price=?,old_price=?,stock=?,active=?,commercial_verified=?,version=version+1 WHERE id=? AND ${guard}`,v.kind,v.sizeMl,v.price,v.oldPrice,v.stock,+v.active,+v.commercialVerified,v.id,p.code,token));
  else batch.push(statement(`INSERT INTO product_variants(product_id,sku,kind,size_ml,price,old_price,stock,active,commercial_verified) SELECT ${productId},?,?,?,?,?,?,?,? WHERE ${guard}`,p.code,token,v.sku,v.kind,v.sizeMl,v.price,v.oldPrice,v.stock,+v.active,+v.commercialVerified,p.code,token));
 }
 if(actorId)batch.push(statement('INSERT INTO admin_events(actor_id,action,entity_code,created_at) SELECT ?,?,?,? WHERE '+guard,actorId,current?'product.update':'product.create',p.code,new Date().toISOString(),p.code,token));
 if(appendTransaction)batch.push(...appendTransaction(token));
 batch.push(statement('DELETE FROM transaction_checks'));
 try{const result=await db().batch(batch);if(!result[0].meta.changes)throw new AppError('El producto cambió. Recarga.',409);}catch(e){if(/valid_variant_inventory|CHECK constraint/.test(String(e)))throw new AppError('El stock físico no puede ser menor que las reservas.',409);throw e;}
 return getAdvisorProduct(p.code);
}
