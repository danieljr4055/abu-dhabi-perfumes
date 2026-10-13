-- Additive migration. Preserve all legacy order snapshots and physical inventory.
CREATE TABLE transaction_checks(ok INTEGER NOT NULL CHECK(ok=1));
CREATE TABLE brands (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 description TEXT NOT NULL DEFAULT '', image TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 version INTEGER NOT NULL DEFAULT 0, search_text TEXT NOT NULL DEFAULT ''
);
CREATE TABLE olfactory_families (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 description TEXT NOT NULL DEFAULT '', image TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 version INTEGER NOT NULL DEFAULT 0, search_text TEXT NOT NULL DEFAULT ''
);
CREATE TABLE categories (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 description TEXT NOT NULL DEFAULT '', image TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 version INTEGER NOT NULL DEFAULT 0, search_text TEXT NOT NULL DEFAULT ''
);
CREATE TABLE notes (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 description TEXT NOT NULL DEFAULT '', image TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 version INTEGER NOT NULL DEFAULT 0, search_text TEXT NOT NULL DEFAULT '', family_id INTEGER REFERENCES olfactory_families(id)
);
ALTER TABLE products ADD COLUMN slug TEXT;
ALTER TABLE products ADD COLUMN edit_token TEXT;
ALTER TABLE products ADD COLUMN brand_id INTEGER REFERENCES brands(id);
ALTER TABLE products ADD COLUMN editorial_state TEXT NOT NULL DEFAULT 'borrador' CHECK(editorial_state IN('borrador','publicado','archivado'));
ALTER TABLE products ADD COLUMN concentration TEXT;
ALTER TABLE products ADD COLUMN performance TEXT;
ALTER TABLE products ADD COLUMN projection TEXT;
ALTER TABLE products ADD COLUMN occasion TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN season TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_product_slug ON products(slug);
CREATE INDEX idx_product_brand_state ON products(brand_id,editorial_state);
CREATE INDEX idx_note_family ON notes(family_id);
CREATE TABLE product_notes (
 product_id INTEGER NOT NULL REFERENCES products(id), note_id INTEGER NOT NULL REFERENCES notes(id),
 phase TEXT NOT NULL CHECK(phase IN('salida','corazon','fondo')), position INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(product_id,note_id,phase)
);
CREATE INDEX idx_notes_product ON product_notes(note_id,product_id);
CREATE TABLE product_categories(product_id INTEGER NOT NULL REFERENCES products(id),category_id INTEGER NOT NULL REFERENCES categories(id),PRIMARY KEY(product_id,category_id));
CREATE INDEX idx_category_product ON product_categories(category_id,product_id);
CREATE TABLE product_images(
 id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id),
 url TEXT NOT NULL, alt TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, source TEXT, authorization TEXT
);
CREATE INDEX idx_images_product ON product_images(product_id,position);
CREATE TABLE product_variants(
 id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id),sku TEXT NOT NULL UNIQUE,
 kind TEXT NOT NULL CHECK(kind IN('frasco','decant')),size_ml REAL NOT NULL CHECK(size_ml>0),
 price INTEGER CHECK(price IS NULL OR price>0), old_price INTEGER CHECK(old_price IS NULL OR old_price>0),
 stock INTEGER, reserved INTEGER NOT NULL DEFAULT 0,sold INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 commercial_verified INTEGER NOT NULL DEFAULT 0 CHECK(commercial_verified IN(0,1)),version INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT valid_variant_inventory CHECK((stock IS NOT NULL AND stock>=reserved OR stock IS NULL AND reserved=0) AND reserved>=0 AND sold>=0)
);
CREATE INDEX idx_variants_product ON product_variants(product_id,active,price);
CREATE TABLE collections(
 edit_token TEXT,
 id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,description TEXT NOT NULL DEFAULT '',
 image TEXT,mode TEXT NOT NULL CHECK(mode IN('manual','automatic')),active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE collection_products(collection_id INTEGER NOT NULL REFERENCES collections(id),product_id INTEGER NOT NULL REFERENCES products(id),PRIMARY KEY(collection_id,product_id));
CREATE TABLE collection_rules(collection_id INTEGER NOT NULL REFERENCES collections(id),field TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(collection_id,field,value));
CREATE TABLE store_settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
CREATE TABLE payment_methods(id INTEGER PRIMARY KEY AUTOINCREMENT,label TEXT NOT NULL UNIQUE,image TEXT,position INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 0);
INSERT INTO payment_methods(label,position) VALUES('Tarjeta',0),('Transferencia',1),('Efectivo',2);
CREATE TABLE social_posts(id INTEGER PRIMARY KEY AUTOINCREMENT,url TEXT NOT NULL,image TEXT NOT NULL,title TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 0);
CREATE TABLE import_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL,discovered INTEGER NOT NULL,reviewed INTEGER NOT NULL,created INTEGER NOT NULL DEFAULT 0,skipped INTEGER NOT NULL DEFAULT 0,errors TEXT NOT NULL DEFAULT '[]');
CREATE TABLE source_records(id INTEGER PRIMARY KEY AUTOINCREMENT,source_url TEXT NOT NULL,external_id TEXT NOT NULL,checked_at TEXT NOT NULL,product_id INTEGER REFERENCES products(id),verified_fields TEXT NOT NULL,review_state TEXT NOT NULL DEFAULT 'pending',UNIQUE(source_url,external_id));
CREATE TABLE slug_redirects(entity_kind TEXT NOT NULL,old_slug TEXT NOT NULL,entity_id INTEGER NOT NULL,PRIMARY KEY(entity_kind,old_slug));

INSERT INTO brands(name,slug,search_text) SELECT brand,'marca-'||MIN(id),lower(brand) FROM products GROUP BY brand;
INSERT INTO categories(name,slug,search_text) SELECT category,'categoria-'||MIN(id),lower(category) FROM products GROUP BY category;
UPDATE products SET brand_id=(SELECT id FROM brands WHERE name=products.brand),slug=lower(code);
INSERT INTO product_categories SELECT p.id,c.id FROM products p JOIN categories c ON c.name=p.category;
INSERT INTO product_variants(product_id,sku,kind,size_ml,price,old_price,stock,reserved,sold,active)
 SELECT id,code||'-FRASCO','frasco',CASE WHEN CAST(size AS REAL)>0 THEN CAST(size AS REAL) ELSE 100 END,
 NULLIF(price,0),old_price,stock,reserved,sold,active FROM products;
INSERT INTO product_images(product_id,url,alt,position)
 SELECT p.id,j.value,p.name,CAST(j.key AS INTEGER) FROM products p,json_each(p.images) j;
ALTER TABLE order_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN sku TEXT;
ALTER TABLE order_items ADD COLUMN brand TEXT;
ALTER TABLE order_items ADD COLUMN kind TEXT;
ALTER TABLE order_items ADD COLUMN old_price INTEGER;
ALTER TABLE order_items ADD COLUMN discount INTEGER;
UPDATE order_items SET variant_id=(SELECT id FROM product_variants WHERE product_id=order_items.product_id ORDER BY id LIMIT 1);
ALTER TABLE orders ADD COLUMN payment_method_id INTEGER REFERENCES payment_methods(id);
ALTER TABLE orders ADD COLUMN whatsapp_number TEXT;
