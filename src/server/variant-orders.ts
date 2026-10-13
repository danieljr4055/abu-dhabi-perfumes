import {db,all,one,statement} from './db';
import {AppError,orderCode} from '../lib/domain';
import {validateCommerceCheckout} from '../lib/commerce-checkout';
import {getStoreSettings} from './store-settings';
import {getOrder} from './orders';
export async function createVariantOrder(input:unknown){
 const data=validateCommerceCheckout(input);
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data)))),b=>b.toString(16).padStart(2,'0')).join('');
 const duplicate=await one('SELECT id,fingerprint FROM orders WHERE request_key=?',data.requestKey);
 if(duplicate){if(duplicate.fingerprint!==fingerprint)throw new AppError('El intento anterior tiene otros datos. Actualiza el checkout.',409);return getOrder(orderCode(duplicate.id));}
 const payment=await one('SELECT id,label,version FROM payment_methods WHERE label=? AND active=1',data.payment);
 if(!payment)throw new AppError('Este método de pago ya no está disponible.',409);
 const settings=await getStoreSettings();
 const rows=await all(`SELECT v.*,p.code,p.name,p.editorial_state,p.brand_id,b.name brand,b.active brand_active,
 (SELECT url FROM product_images WHERE product_id=p.id ORDER BY position,id LIMIT 1) image
 FROM product_variants v JOIN products p ON p.id=v.product_id JOIN brands b ON b.id=p.brand_id
 WHERE v.id IN (${data.items.map(()=>'?').join(',')})`,...data.items.map(i=>i.variantId));
 const items=data.items.map(i=>{
 const v=rows.find(v=>v.id===i.variantId);
 if(!v||v.code!==i.code||!v.active||!v.brand_active||v.editorial_state!=='publicado'||!v.commercial_verified||v.stock===null||v.price===null)throw new AppError('Una presentación no está disponible para compra.',409);
 if(v.stock-v.reserved<i.quantity)throw new AppError('No hay suficientes unidades. Actualiza el carrito.',409);
 if(v.price!==i.expectedPrice)throw new AppError('El precio cambió. Revisa el carrito.',409);
 return{...v,quantity:i.quantity,subtotal:v.price*i.quantity,discount:v.old_price>v.price?v.old_price-v.price:0};
 });
 const now=new Date().toISOString(),customerId=crypto.randomUUID(),total=items.reduce((s,i)=>s+i.subtotal,0);
 const batch=[statement('INSERT INTO transaction_checks(ok) SELECT CASE WHEN EXISTS(SELECT 1 FROM payment_methods WHERE id=? AND active=1 AND version=?) THEN 1 ELSE 0 END',payment.id,payment.version)];
 for(const i of items)batch.push(statement(`INSERT INTO transaction_checks(ok) SELECT CASE WHEN EXISTS(
 SELECT 1 FROM product_variants v JOIN products p ON p.id=v.product_id JOIN brands b ON b.id=p.brand_id
 WHERE v.id=? AND v.version=? AND p.editorial_state='publicado' AND b.active=1 AND v.active=1 AND v.commercial_verified=1 AND v.price=? AND v.stock-v.reserved>=?) THEN 1 ELSE 0 END`,i.id,i.version,i.price,i.quantity));
 batch.push(statement('INSERT INTO customers(id,name,phone,created_at) VALUES(?,?,?,?)',customerId,data.name,data.phone,now),
 statement('INSERT INTO orders(request_key,fingerprint,customer_id,name,phone,address,city,notes,payment,payment_method_id,whatsapp_number,subtotal,total,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',data.requestKey,fingerprint,customerId,data.name,data.phone,data.address,data.city,data.notes,payment.label,payment.id,settings.whatsappNumber,total,total,now));
 for(const i of items)batch.push(statement('INSERT INTO order_items(order_id,product_id,variant_id,code,sku,name,brand,size,kind,image,price,old_price,discount,quantity,subtotal) VALUES((SELECT id FROM orders WHERE request_key=?),?,?,?,?,?,?,?,?,?,?,?,?,?,?)',data.requestKey,i.product_id,i.id,i.code,i.sku,i.name,i.brand,i.size_ml+' ml',i.kind,i.image??'',i.price,i.old_price,i.discount,i.quantity,i.subtotal),statement('UPDATE product_variants SET reserved=reserved+?,version=version+1 WHERE id=?',i.quantity,i.id));
 batch.push(statement("INSERT INTO order_events(order_id,status,actor,created_at) VALUES((SELECT id FROM orders WHERE request_key=?),'Pendiente','Cliente',?)",data.requestKey,now),statement('DELETE FROM transaction_checks'));
 try{await db().batch(batch);}catch(error){
 const existing=await one('SELECT id,fingerprint FROM orders WHERE request_key=?',data.requestKey);
 if(existing?.fingerprint===fingerprint)return getOrder(orderCode(existing.id));
 if(existing||/CHECK constraint/.test(String(error)))throw new AppError('El inventario, precio o método de pago cambió. Revisa el carrito.',409);
 throw error;
 }
 const created=await one('SELECT id FROM orders WHERE request_key=?',data.requestKey);return getOrder(orderCode(created.id));
}
