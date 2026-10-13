import {z} from 'zod';
import {AppError,checkoutSchema} from './domain';
export const commerceCheckoutSchema=checkoutSchema.innerType().extend({
 payment:z.string().trim().min(1,'Selecciona un método de pago.').max(80),
 items:z.array(z.object({code:z.string().min(1).max(40),variantId:z.number().int().positive(),quantity:z.number().int().min(1).max(20),expectedPrice:z.number().int().positive()})).min(1,'El carrito está vacío.').max(50)
}).superRefine((o,c)=>{if(new Set(o.items.map(i=>i.variantId)).size!==o.items.length)c.addIssue({code:'custom',message:'Hay presentaciones duplicadas.'});});
export function validateCommerceCheckout(input:unknown){const result=commerceCheckoutSchema.safeParse(input);if(!result.success)throw new AppError(result.error.issues[0].message,422);return result.data;}
