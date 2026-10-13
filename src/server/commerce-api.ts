import {AppError} from '../lib/domain';
import {listTaxonomy,saveTaxonomy,taxonomyTables} from './taxonomy';
import {queryCatalog} from './discovery';
import {saveCatalogProduct} from './product-editor';
import {getStoreSettings,saveStoreSettings,listPaymentMethods,savePayment,listSocialPosts,saveSocialPost} from './store-settings';
import {listCollections,saveCollection,ruleSchema} from './collections';
import type {TaxonomyKind} from '../lib/commerce-types';
import {previewImport,commitImport} from './catalog-import';
export async function commerceApi(section:string,id:string|undefined,method:string,body:unknown,params:URLSearchParams,actorId?:number){
 if(method==='GET'){
  if(Object.hasOwn(taxonomyTables,section))return listTaxonomy(section as TaxonomyKind);
  if(section==='products')return queryCatalog(params,true);
  if(section==='settings')return getStoreSettings();
  if(section==='payments')return listPaymentMethods();
  if(section==='social')return listSocialPosts(false);
  if(section==='collections')return listCollections();
 }
 if(method==='POST'){
  if(section==='import-preview')return previewImport(body);
  if(section==='import')return commitImport(body);
  const key=id?Number(id):undefined;if(id&&(!Number.isSafeInteger(key)||key!<=0))throw new AppError('Identificador inválido.',422);
  if(Object.hasOwn(taxonomyTables,section))return saveTaxonomy(section as TaxonomyKind,body,key);
  if(section==='products')return saveCatalogProduct(body,key,actorId);
  if(section==='settings')return saveStoreSettings(body);
  if(section==='payments')return savePayment(body,key);
  if(section==='social')return saveSocialPost(body,key);
  if(section==='collections')return saveCollection(body,key);
  if(section==='preview'){
   const input=body as {mode?:string;rules?:unknown;productIds?:number[]};
   if(input.mode==='manual'){const result=await queryCatalog(new URLSearchParams({limit:'100'}));return{...result,total:result.products.filter(p=>input.productIds?.includes(p.id)).length};}
   const rules=ruleSchema.array().max(15).safeParse(input.rules);if(!rules.success)throw new AppError('Règles inválidas.',422);
   return queryCatalog(new URLSearchParams(),false,rules.data);
  }
 }
 throw new AppError('Ruta no encontrada.',404);
}
