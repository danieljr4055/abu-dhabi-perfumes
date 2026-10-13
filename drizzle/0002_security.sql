ALTER TABLE products ADD COLUMN updated_at TEXT;
UPDATE products SET updated_at=created_at WHERE updated_at IS NULL;
CREATE TABLE google_identities(
 user_id INTEGER PRIMARY KEY REFERENCES users(id),
 email TEXT NOT NULL UNIQUE,
 google_sub TEXT UNIQUE,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1))
);
CREATE TABLE login_challenges(
 hash TEXT PRIMARY KEY,
 expires_at INTEGER NOT NULL
);
CREATE TABLE admin_events(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_id INTEGER REFERENCES users(id),
 action TEXT NOT NULL,
 entity_code TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE sheet_sync(
 variant_id INTEGER PRIMARY KEY REFERENCES product_variants(id),
 revision INTEGER NOT NULL DEFAULT 1,
 synced_revision INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 last_error TEXT,
 synced_at TEXT
);
CREATE TABLE sync_locks(
 name TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TRIGGER product_created_security AFTER INSERT ON products BEGIN
 UPDATE products SET updated_at=NEW.created_at WHERE id=NEW.id;
END;
CREATE TRIGGER product_updated_security AFTER UPDATE OF edit_token ON products BEGIN
 UPDATE products SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id;
 INSERT INTO sheet_sync(variant_id) SELECT id FROM product_variants WHERE product_id=NEW.id
 ON CONFLICT(variant_id) DO UPDATE SET revision=revision+1,next_attempt=0;
END;
CREATE TRIGGER variant_inserted_security AFTER INSERT ON product_variants BEGIN
 INSERT INTO sheet_sync(variant_id) VALUES(NEW.id);
END;
CREATE TRIGGER variant_updated_security AFTER UPDATE ON product_variants BEGIN
 UPDATE products SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.product_id;
 INSERT INTO sheet_sync(variant_id) VALUES(NEW.id)
 ON CONFLICT(variant_id) DO UPDATE SET revision=revision+1,next_attempt=0;
END;
CREATE TRIGGER category_updated_security AFTER UPDATE ON categories BEGIN
 INSERT INTO sheet_sync(variant_id) SELECT v.id FROM product_variants v JOIN product_categories pc ON pc.product_id=v.product_id WHERE pc.category_id=NEW.id
 ON CONFLICT(variant_id) DO UPDATE SET revision=revision+1,next_attempt=0;
END;
CREATE TRIGGER brand_updated_security AFTER UPDATE ON brands BEGIN
 INSERT INTO sheet_sync(variant_id) SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.brand_id=NEW.id
 ON CONFLICT(variant_id) DO UPDATE SET revision=revision+1,next_attempt=0;
END;
INSERT INTO sheet_sync(variant_id) SELECT id FROM product_variants;
