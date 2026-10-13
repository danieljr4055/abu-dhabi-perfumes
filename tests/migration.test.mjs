import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const sql=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function fixture(){const db=new DatabaseSync(':memory:');db.exec(sql('drizzle/0000_volatile_whirlwind.sql'));
db.exec(`INSERT INTO products(code,name,brand,category,gender,description,price,size,stock,reserved,sold,images,tags,search_text,created_at) VALUES('DIO-SAV-006','Sauvage','Dior','Amaderado','Hombre','Descripción',320000,'100 ml',7,2,43,'["/images/perfume-1.webp"]','[]','sauvage','2026-09-21');
INSERT INTO customers VALUES('c','Juan Pérez','3001234567','2026-09-21');
INSERT INTO orders(request_key,fingerprint,customer_id,name,phone,address,city,notes,payment,subtotal,total,created_at) VALUES('key','fp','c','Juan Pérez','3001234567','Carrera XX','Cartago','','Transferencia',640000,640000,'2026-09-21');
INSERT INTO order_items(order_id,product_id,code,name,size,image,price,quantity,subtotal) VALUES(1,1,'DIO-SAV-006','Sauvage','100 ml','',320000,2,640000);`);return db;}
test('migración conserva históricos y reservas',()=>{const db=fixture();const before=db.prepare('SELECT * FROM orders').all();db.exec(sql('drizzle/0001_discovery.sql'));assert.deepEqual(db.prepare('SELECT id,name,total,status FROM orders').all().map(r=>({...r})),before.map(({id,name,total,status})=>({id,name,total,status})));const v=db.prepare('SELECT stock,reserved,sold,commercial_verified FROM product_variants').get();assert.deepEqual({...v},{stock:7,reserved:2,sold:43,commercial_verified:0});assert.equal(db.prepare('SELECT price FROM order_items').get().price,320000);assert.equal(db.prepare('SELECT variant_id FROM order_items').get().variant_id,1);db.close();});
test('restricciones de inventario y SKU',()=>{const db=fixture();db.exec(sql('drizzle/0001_discovery.sql'));assert.throws(()=>db.exec('UPDATE product_variants SET reserved=8'),/CHECK/);assert.throws(()=>db.exec("UPDATE product_variants SET stock=NULL"),/CHECK/);db.exec("INSERT INTO product_variants(product_id,sku,kind,size_ml) VALUES(1,'DECANT-5','decant',5)");assert.equal(db.prepare("SELECT price FROM product_variants WHERE sku='DECANT-5'").get().price,null);assert.throws(()=>db.exec("INSERT INTO product_variants(product_id,sku,kind,size_ml) VALUES(1,'DECANT-5','decant',5)"),/UNIQUE/);db.close();});
