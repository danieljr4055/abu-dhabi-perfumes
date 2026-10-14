import {db,all,one,statement} from './db';
import {AppError,normalize} from '../lib/domain';
import {safeImage,saveTaxonomy} from './taxonomy';
import {getAdvisorProduct,saveCatalogProduct,type ManagedProduct} from './product-editor';
import {readSheetCatalog} from './sheets-sync';

type Row={sku:string;code:string;codeSpecified:boolean;name:string;brand:string;price:number;quantity:number;sizeMl?:number;kind?:'frasco'|'decant';gender?:'Hombre'|'Mujer'|'Unisex'|'Por confirmar';description?:string;images?:string[];notes?:Record<string,string[]>;categories?:string[];published?:boolean};
const header=(v:unknown)=>normalize(String(v??'')).replace(/\s+/g,'_');
const slug=(v:string)=>normalize(v).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
function integer(value:unknown,label:string,min:number,max:number){
 const s=typeof value==='string'?value.trim().replace(/^\$\s*/,'').replace(/\s/g,''):value;
 const n=typeof s==='string'&&/^\d{1,3}(\.\d{3})+$/.test(s)?Number(s.replace(/\./g,'')):typeof s==='number'?s:typeof s==='string'&&/^\d+$/.test(s)?Number(s):NaN;
 if(!Number.isSafeInteger(n)||n<min||n>max)throw new AppError(label+' debe ser un entero entre '+min+' y '+max+'.',422);return n;
}
export function parseSheetCatalog(matrix:unknown[][]):Row[]{
 if(!Array.isArray(matrix)||!Array.isArray(matrix[0])||matrix.length>=20002)throw new AppError('Lectura incompleta de la hoja.',422);
 const cols=matrix[0].map(header);
 for(const name of ['sku','nombre','marca','precio','cantidad'])if(!cols.includes(name))throw new AppError('Falta la columna '+name+' en Productos.',422);
 if(new Set(cols.filter(Boolean)).size!==cols.filter(Boolean).length)throw new AppError('Encabezados duplicados.',422);
 const out:Row[]=[],seen=new Set<string>();
 for(let i=1;i<matrix.length;i++){
  const cells=matrix[i];if(!Array.isArray(cells)||cells.every(v=>v===null||v===undefined||String(v).trim()===''))continue;
  const val=(key:string)=>cells[cols.indexOf(key)];const text=(key:string)=>String(val(key)??'').trim();
  try{
   const sku=text('sku');if(!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(sku)||sku.length<3||sku.length>60)throw new AppError('SKU no válido. Usa mayúsculas, números y guiones.',422);
   if(seen.has(sku))throw new AppError('SKU duplicado: '+sku+'.',422);seen.add(sku);
   const code=text('codigo_producto')||(sku.includes('-')?sku:'PER-'+sku);if(!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(code)||code.length>40)throw new AppError('codigo_producto debe tener guiones y máximo 40 caracteres.',422);
   const name=text('nombre'),brand=text('marca');if(name.length<2||name.length>120||brand.length<2||brand.length>120)throw new AppError('Nombre y marca deben tener entre 2 y 120 caracteres.',422);
   const r:Row={sku,code,codeSpecified:!!text('codigo_producto'),name,brand,price:integer(val('precio'),'Precio',1,100000000),quantity:integer(val('cantidad'),'Cantidad',0,1000000)};
   if(text('tamano_ml')){const size=Number(text('tamano_ml'));if(!Number.isFinite(size)||size<=0||size>2000)throw new AppError('tamano_ml debe estar entre 0 y 2000.',422);r.sizeMl=size;}
   if(text('tipo')){if(!['frasco','decant'].includes(text('tipo')))throw new AppError('tipo debe ser frasco o decant.',422);r.kind=text('tipo') as Row['kind'];}
   if(text('genero')){if(!['Hombre','Mujer','Unisex','Por confirmar'].includes(text('genero')))throw new AppError('Género no válido.',422);r.gender=text('genero') as Row['gender'];}
   if(cols.includes('descripcion')){if(text('descripcion').length>4000)throw new AppError('Descripción demasiado larga.',422);r.description=text('descripcion');}
   const images=['imagen_url','imagen_2','imagen_3'].map(text).filter(Boolean);if(['imagen_url','imagen_2','imagen_3'].some(c=>cols.includes(c))){if(images.some(url=>!safeImage.safeParse(url).success))throw new AppError('Una imagen usa una dirección no autorizada.',422);r.images=images;}
   const notes=Object.fromEntries(['salida','corazon','fondo'].map(phase=>[phase,text('notas_'+phase).split('|').map(s=>s.trim()).filter(Boolean)]));if(['salida','corazon','fondo'].some(p=>cols.includes('notas_'+p))){if(Object.values(notes).flat().some(n=>n.length<2||n.length>120)||Object.values(notes).flat().length>60)throw new AppError('Notas no válidas.',422);r.notes=notes;}
   if(cols.includes('categoria')){r.categories=text('categoria').split('|').map(s=>s.trim()).filter(Boolean);if(r.categories.some(c=>c.length<2||c.length>120)||r.categories.length>20)throw new AppError('Categorías no válidas.',422);}
   if(cols.includes('publicado')){const b=normalize(text('publicado'));if(!['','true','false','si','no','1','0','verdadero','falso'].includes(b))throw new AppError('publicado debe ser SI o NO.',422);r.published=['true','si','1','verdadero'].includes(b);}
   out.push(r);
  }catch(error){throw new AppError('Fila '+(i+1)+': '+(error instanceof AppError?error.message:'datos no válidos'),422);}
 }
 return out;
}
async function taxonomy(kind:'brands'|'notes'|'categories',name:string){
 const key=slug(name);if(!key||name.length<2||name.length>120)throw new AppError('Nombre de clasificación no válido.',422);
 const existing=await one('SELECT id FROM '+kind+' WHERE slug=?',key);return existing??saveTaxonomy(kind,{name,slug:key});
}
function productInput(p:ManagedProduct){return{code:p.code,slug:p.slug,name:p.name,brandId:p.brandId,gender:p.gender,description:p.description,state:p.state,concentration:p.concentration,performance:p.performance,projection:p.projection,occasion:p.occasion,season:p.season,featured:!!p.featured,isNew:p.isNew,version:p.version,categoryIds:p.categoryIds,notes:p.notes.map(n=>({noteId:n.noteId,phase:n.phase,position:n.position})),images:p.imageRecords.map(i=>({url:i.url,alt:i.alt,source:i.source,authorization:i.authorization})),variants:p.variants.map(v=>({id:v.id,sku:v.sku,kind:v.kind,sizeMl:v.sizeMl,price:v.price,oldPrice:v.oldPrice,stock:v.stock,active:v.active,commercialVerified:v.commercialVerified,version:v.version}))};}
async function importRow(row:Row,warnings:string[],previous?:{payload:string;present:number}){
 const old=previous?JSON.parse(previous.payload) as Row:undefined;
 if(previous?.present&&previous.payload===JSON.stringify(row))return'unchanged';
 const variant=await one('SELECT v.*,p.code FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.sku=?',row.sku);
 if(variant&&variant.code!==row.code)throw new AppError('El código y SKU son permanentes: '+row.sku+'.',422);
 const product=await one<{id:number}>('SELECT id FROM products WHERE code=?',row.code);
 const current=product?await getAdvisorProduct(row.code):undefined;
 const brand=await taxonomy('brands',row.brand);
 const input:any=current?productInput(current):{code:row.code,slug:slug(row.name)+'-'+row.code.toLowerCase(),name:row.name,brandId:brand.id,gender:'Por confirmar',state:'borrador',images:[],notes:[],variants:[]};
 const changed=(key:keyof Row)=>!previous?.present||JSON.stringify(old?.[key])!==JSON.stringify(row[key]);
 if(changed('name'))input.name=row.name;if(changed('brand'))input.brandId=brand.id;
 if(row.gender&&changed('gender'))input.gender=row.gender;if(row.description!==undefined&&changed('description'))input.description=row.description;
 if(row.images&&changed('images'))input.images=row.images.map((url,i)=>({url,alt:row.name+', imagen '+(i+1)}));
 if(row.notes&&changed('notes')){input.notes=[];for(const[phase,names]of Object.entries(row.notes))for(const name of names){const note=await taxonomy('notes',name);input.notes.push({noteId:note.id,phase,position:input.notes.length});}}
 if(row.categories&&changed('categories')){input.categoryIds=[];for(const name of row.categories)input.categoryIds.push((await taxonomy('categories',name)).id);}
 let v=input.variants.find((v:any)=>v.sku===row.sku);
 if(!v){if(!row.sizeMl)throw new AppError('Añade tamano_ml para crear '+row.sku+'.',422);v={sku:row.sku,kind:row.kind??'frasco',sizeMl:row.sizeMl,price:row.price,stock:row.quantity,commercialVerified:true};input.variants.push(v);}
 else{if(changed('price'))v.price=row.price;if(changed('quantity'))v.stock=row.quantity+current!.variants.find(item=>item.sku===row.sku)!.reserved;if(row.sizeMl&&changed('sizeMl'))v.sizeMl=row.sizeMl;if(row.kind&&changed('kind'))v.kind=row.kind;v.commercialVerified=true;}
 const ready=input.images.length>=3&&['salida','corazon','fondo'].every(phase=>input.notes.some((n:any)=>n.phase===phase));
 if(row.published!==undefined)input.state=row.published&&ready?'publicado':'borrador';
 if(input.state==='publicado'&&!ready)input.state='borrador';
 if(row.published&&!ready&&warnings.length<50)warnings.push(row.sku+': borrador; completa 3 imágenes y notas de salida, corazón y fondo.');
 const now=new Date().toISOString();
 await saveCatalogProduct(input,current?.id,undefined,token=>{
  const guard='EXISTS(SELECT 1 FROM products WHERE code=? AND edit_token=?)';
  return[statement('UPDATE product_variants SET sheet_blocked=? WHERE sku=? AND '+guard,row.quantity===0?1:0,row.sku,row.code,token),statement('INSERT INTO sheet_catalog_rows(sku,payload,present,imported_at) SELECT ?,?,1,? WHERE '+guard+' ON CONFLICT(sku) DO UPDATE SET payload=excluded.payload,present=1,imported_at=excluded.imported_at',row.sku,JSON.stringify(row),now,row.code,token)];
 });
 return current?'updated':'created';
}
export async function sheetImportStatus(){return one('SELECT * FROM sheet_import_state WHERE id=1');}
export async function importSheetCatalog(read:()=>Promise<unknown[][]>=readSheetCatalog){
 const owner=crypto.randomUUID(),start=Date.now();
 const lock=await statement("INSERT INTO sync_locks(name,owner,expires_at) VALUES('sheet-import',?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE sync_locks.expires_at<? RETURNING owner",owner,start+600000,start).first();
 if(!lock)throw new AppError('Hay una importación en curso.',409);
 await statement('UPDATE sheet_import_state SET last_attempt=? WHERE id=1',new Date().toISOString()).run();
 try{
  const rows=parseSheetCatalog(await read()),present=new Set(rows.map(r=>r.sku)),warnings:string[]=[];let created=0,updated=0;
  const [variants,previousRows]=await Promise.all([all<{sku:string;code:string}>('SELECT v.sku,p.code FROM product_variants v JOIN products p ON p.id=v.product_id'),all<{sku:string;payload:string;present:number}>('SELECT sku,payload,present FROM sheet_catalog_rows')]);
  const codes=new Map(variants.map(v=>[v.sku,v.code])),previous=new Map(previousRows.map(r=>[r.sku,r]));
  // Validate identities before changing any row or applying absent-item rules.
  for(const r of rows){const code=codes.get(r.sku);if(code&&!r.codeSpecified)r.code=code;else if(code&&code!==r.code)throw new AppError('El código es permanente: '+r.sku+'.',422);if(!code&&!r.sizeMl)throw new AppError('Añade tamano_ml para crear '+r.sku+'.',422);}
  const grouped=new Map<string,Row>();
  for(const row of rows){const first=grouped.get(row.code);if(first){for(const field of ['name','brand','gender','description','images','notes','categories','published'] as const)if(JSON.stringify(first[field])!==JSON.stringify(row[field]))throw new AppError('Las filas del producto '+row.code+' deben compartir nombre, marca, imágenes y datos de publicación.',422);}else grouped.set(row.code,row);}
  for(const r of rows){const result=await importRow(r,warnings,previous.get(r.sku));if(result==='created')created++;if(result==='updated')updated++;}
  const missing=(await all<{id:number;sku:string}>('SELECT id,sku FROM product_variants WHERE sheet_blocked=0 OR stock>reserved')).filter(v=>!present.has(v.sku));
  // A failed/invalid snapshot never reaches this point. Absences preserve reservations.
  const batch:ReturnType<typeof statement>[]=[];
  for(let i=0;i<missing.length;i+=80){const ids=missing.slice(i,i+80).map(v=>v.id);batch.push(statement('UPDATE product_variants SET stock=reserved,sheet_blocked=1,version=version+1 WHERE id IN('+ids.map(()=>'?').join(',')+')',...ids));}
  const now=new Date().toISOString();
  const absent=previousRows.filter(row=>row.present&&!present.has(row.sku)).map(row=>row.sku);
  for(let i=0;i<absent.length;i+=80){const skus=absent.slice(i,i+80);batch.push(statement('UPDATE sheet_catalog_rows SET present=0,imported_at=? WHERE sku IN('+skus.map(()=>'?').join(',')+')',now,...skus));}
  batch.push(statement('UPDATE sheet_import_state SET last_success=?,last_error=NULL,created_count=?,updated_count=?,exhausted_count=?,warnings=? WHERE id=1',now,created,updated,missing.length,JSON.stringify(warnings)));
  await db().batch(batch);return{created,updated,exhausted:missing.length,warnings};
 }catch(error){
  const message=error instanceof AppError?error.message:'No se pudo leer o aplicar Google Sheets. No se agotaron productos por ausencia.';
  await statement('UPDATE sheet_import_state SET last_error=? WHERE id=1',message).run();throw new AppError(message,error instanceof AppError?error.status:503);
 }finally{await statement("DELETE FROM sync_locks WHERE name='sheet-import' AND owner=?",owner).run();}
}
