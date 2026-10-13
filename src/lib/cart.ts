import type {Product} from './types';
export const cartKey=(p:Product)=>p.variantId?String(p.variantId):p.code;
