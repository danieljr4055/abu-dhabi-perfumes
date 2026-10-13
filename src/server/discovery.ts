import {publicProduct} from './public-product';
import {all,one} from './db';import {normalize} from '../lib/domain';import {hydrateProducts} from './product-editor';import type {CollectionRule} from './collections';
function relation(field:string,value:string,where:string[],args:unknown[]){
 const map:Record<string,string>={brand:'b.slug=?',note:'EXISTS(SELECT 1 FROM product_notes pn JOIN notes n ON n.id=pn.note_id WHERE pn.product_id=p.id AND n.active=1 AND n.slug=?)',family:'EXISTS(SELECT 1 FROM product_notes pn JOIN notes n ON n.id=pn.note_id JOIN olfactory_families f ON f.id=n.family_id WHERE pn.product_id=p.id AND n.active=1 AND f.active=1 AND f.slug=?)',category:'EXISTS(SELECT 1 FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=p.id AND c.active=1 AND c.slug=?)',occasion:'EXISTS(SELECT 1 FROM json_each(p.occasion) WHERE value=?)',season:'EXISTS(SELECT 1 FROM json_each(p.season) WHERE value=?)'};
 if(map[field]){where.push(map[field]);args.push(value);}
 else if(field==='featured')where.push('p.featured=1');else if(field==='new')where.push('p.is_new=1');else if(field==='offer')where.push('EXISTS(SELECT 1 FROM product_variants ov WHERE ov.product_id=p.id AND ov.active=1 AND ov.commercial_verified=1 AND ov.old_price>ov.price)');
}
export async function queryCatalog(params:URLSearchParams,advisor=false,rules:CollectionRule[]=[]){
 const where=advisor?['1=1']:["p.editorial_state='publicado'","b.active=1"],args:unknown[]=[];
 for(const term of normalize(params.get('q')??'').slice(0,120).split(/\s+/).filter(Boolean)){
 where.push("(p.search_text LIKE ? OR b.search_text LIKE ? OR EXISTS(SELECT 1 FROM product_variants sv WHERE sv.product_id=p.id AND lower(sv.sku) LIKE ? "+(advisor?'':' AND sv.active=1 AND sv.commercial_verified=1 AND sv.price IS NOT NULL AND sv.stock IS NOT NULL')+") OR EXISTS(SELECT 1 FROM product_notes pn JOIN notes n ON n.id=pn.note_id LEFT JOIN olfactory_families f ON f.id=n.family_id WHERE pn.product_id=p.id AND (n.search_text LIKE ? OR f.search_text LIKE ?)))");args.push(...Array(5).fill('%'+term+'%'));
 }
 for(const[param,field]of [['marca','brand'],['nota','note'],['familia','family'],['categoria','category'],['ocasion','occasion'],['temporada','season']])if(params.get(param))relation(field,params.get(param)!,where,args);
 for(const r of rules)relation(r.field,r.value,where,args);
 if(params.get('genero')){where.push('p.gender=?');args.push(params.get('genero'));}
 if(advisor&&params.get('estado')){where.push('p.editorial_state=?');args.push(params.get('estado'));}
 if(params.get('coleccion')){
 const c=await one('SELECT * FROM collections WHERE slug=? AND active=1',params.get('coleccion'));
 if(!c)where.push('0=1');else if(c.mode==='manual'){where.push('EXISTS(SELECT 1 FROM collection_products cp WHERE cp.product_id=p.id AND cp.collection_id=?)');args.push(c.id);}
 else for(const r of await all<CollectionRule>('SELECT field,value FROM collection_rules WHERE collection_id=?',c.id))relation(r.field,r.value,where,args);
 }
 const vwhere=['v.product_id=p.id','v.active=1'],vargs:unknown[]=[];if(!advisor)vwhere.push('v.commercial_verified=1 AND v.price IS NOT NULL AND v.stock IS NOT NULL');
 for(const[param,col]of [['tipo','kind'],['tamano','size_ml']])if(params.get(param)){vwhere.push('v.'+col+'=?');vargs.push(params.get(param));}
 for(const[param,op]of [['minPrecio','>='],['maxPrecio','<=']])if(params.get(param)&&Number.isFinite(Number(params.get(param)))){vwhere.push('v.price'+op+'?');vargs.push(Number(params.get(param)));}
 if(params.get('disponibilidad')==='disponible')vwhere.push('v.commercial_verified=1 AND v.price IS NOT NULL AND v.stock>v.reserved');
 if(params.get('disponibilidad')==='agotado')vwhere.push('v.commercial_verified=1 AND v.stock=v.reserved');
 if(vwhere.length>2){where.push('EXISTS(SELECT 1 FROM product_variants v WHERE '+vwhere.join(' AND ')+')');args.push(...vargs);}
 const from=' FROM products p JOIN brands b ON b.id=p.brand_id WHERE '+where.join(' AND ');
 const page=Math.max(1,Math.min(10000,parseInt(params.get('page')??'1')||1)),limit=Math.max(1,Math.min(100,parseInt(params.get('limit')??'12')||12));
 const minPrice='(SELECT min(price) FROM product_variants v WHERE v.product_id=p.id AND v.active=1 AND v.commercial_verified=1 AND v.stock IS NOT NULL)';
 const sorts:Record<string,string>={precio_asc:minPrice+' ASC',precio_desc:minPrice+' DESC',vendidos:'(SELECT sum(sold) FROM product_variants v WHERE v.product_id=p.id) DESC',nuevos:'p.is_new DESC,p.id DESC',destacados:'p.featured DESC,p.id'};
 const [rows,count,facetRows]=await Promise.all([all('SELECT p.*,b.name brand_name,b.slug brand_slug'+from+' ORDER BY '+(sorts[params.get('orden')??'']??sorts.destacados)+',p.id LIMIT ? OFFSET ?',...args,limit,(page-1)*limit),one<{count:number}>('SELECT count(*) count'+from,...args),all('SELECT DISTINCT b.name,b.slug,p.gender'+from,...args)]);
 const hydrated=await hydrateProducts(rows);const products=advisor?hydrated:hydrated.map(publicProduct);
 const sizes=count!.count?await all('SELECT DISTINCT size_ml FROM product_variants WHERE product_id IN (SELECT p.id'+from+') AND active=1 '+(advisor?'':'AND commercial_verified=1 AND price IS NOT NULL AND stock IS NOT NULL ')+'ORDER BY size_ml',...args):[];
 const [categoryFacets,noteFacets,familyFacets]=await Promise.all([
 all('SELECT DISTINCT c.slug FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE c.active=1 AND pc.product_id IN (SELECT p.id'+from+') ORDER BY c.slug',...args),
 all('SELECT DISTINCT n.slug FROM product_notes pn JOIN notes n ON n.id=pn.note_id WHERE n.active=1 AND pn.product_id IN (SELECT p.id'+from+') ORDER BY n.slug',...args),
 all('SELECT DISTINCT f.slug FROM product_notes pn JOIN notes n ON n.id=pn.note_id JOIN olfactory_families f ON f.id=n.family_id WHERE f.active=1 AND pn.product_id IN (SELECT p.id'+from+') ORDER BY f.slug',...args)]);
 return{products,items:products,total:count!.count,page,limit,pages:Math.ceil(count!.count/limit),facets:{brands:[...new Set(facetRows.map(p=>p.slug))],genders:[...new Set(facetRows.map(p=>p.gender))],categories:categoryFacets.map(r=>r.slug),notes:noteFacets.map(r=>r.slug),families:familyFacets.map(r=>r.slug),sizes:sizes.map(v=>String(v.size_ml))}};
}
export async function recommendProducts(id:number,limit=3){
 const rows=await all(`SELECT p.*,b.name brand_name,b.slug brand_slug,
 (SELECT count(DISTINCT pn.note_id) FROM product_notes pn WHERE pn.product_id=p.id AND pn.note_id IN(SELECT note_id FROM product_notes WHERE product_id=?)) shared_notes,
 (SELECT count(DISTINCT n.family_id) FROM product_notes pn JOIN notes n ON n.id=pn.note_id WHERE pn.product_id=p.id AND n.family_id IN(SELECT n.family_id FROM product_notes pn JOIN notes n ON n.id=pn.note_id WHERE pn.product_id=?)) shared_families
 FROM products p JOIN brands b ON b.id=p.brand_id WHERE p.id<>? AND p.editorial_state='publicado' AND b.active=1
 ORDER BY shared_notes DESC,shared_families DESC,(p.brand_id=(SELECT brand_id FROM products WHERE id=?)) DESC,p.id LIMIT ?`,id,id,id,id,limit);
 const products=(await hydrateProducts(rows)).map(publicProduct);return products.map((product,i)=>({product,reason:rows[i].shared_notes?'Notas en común':rows[i].shared_families?'Una familia olfativa afín':'Sigue explorando'}));
}
export async function getPublishedProduct(value:string){const rows=await all("SELECT p.*,b.name brand_name,b.slug brand_slug FROM products p JOIN brands b ON b.id=p.brand_id WHERE (p.slug=? OR p.code=?) AND p.editorial_state='publicado' AND b.active=1",value,value);return(await hydrateProducts(rows)).map(publicProduct)[0]??null;}
