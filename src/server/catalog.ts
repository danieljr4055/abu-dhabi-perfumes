import {AppError} from '../lib/domain';
import {queryCatalog,getPublishedProduct} from './discovery';
export async function seedCatalog(){ /* Catalog creation is now explicit in administration/import. */ }
export async function getProduct(code:string){const p=await getPublishedProduct(code);if(!p)throw new AppError('Producto no encontrado.',404);return p;}
export const listProducts=(params:URLSearchParams)=>queryCatalog(params);
