import type {ManagedProduct} from './product-editor';

/** Explicit public representation. Never spread database records here. */
export function publicProduct(p:ManagedProduct) {
 const variants=p.variants.filter(v=>v.active&&v.commercialVerified&&v.price!==null&&v.stock!==null).map(v=>({
  id:v.id,sku:v.sku,kind:v.kind,sizeMl:v.sizeMl,price:v.price,oldPrice:v.oldPrice,
  available:Math.max(0,v.stock!-v.reserved)
 }));
 const v=variants[0];
 return {
  id:p.id,code:p.code,slug:p.slug,name:p.name,brand:p.brand,brandSlug:p.brandSlug,
  category:p.category,gender:p.gender,description:p.description,
  images:p.images,tags:p.tags,featured:p.featured,createdAt:p.createdAt,
  concentration:p.concentration,performance:p.performance,projection:p.projection,
  occasion:p.occasion,season:p.season,isNew:p.isNew,
  notes:p.notes.filter(n=>n.note?.active).map(n=>({noteId:n.noteId,phase:n.phase,position:n.position,
   note:{name:n.note!.name,slug:n.note!.slug}})),
  variants,variantId:v?.id,sku:v?.sku,kind:v?.kind,price:v?.price??0,
  oldPrice:v?.oldPrice??null,priceKnown:!!v,size:v?v.sizeMl+' ml · '+v.kind:'',
  available:v?.available??0
 };
}
