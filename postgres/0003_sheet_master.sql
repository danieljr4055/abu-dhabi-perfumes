ALTER TABLE product_variants ADD COLUMN sheet_blocked INTEGER NOT NULL DEFAULT 0 CHECK(sheet_blocked IN (0,1));
CREATE TABLE sheet_catalog_rows(sku TEXT PRIMARY KEY,payload TEXT NOT NULL,present INTEGER NOT NULL DEFAULT 1 CHECK(present IN (0,1)),imported_at TEXT NOT NULL);
CREATE TABLE sheet_import_state(id INTEGER PRIMARY KEY CHECK(id=1),last_attempt TEXT,last_success TEXT,last_error TEXT,created_count INTEGER NOT NULL DEFAULT 0,updated_count INTEGER NOT NULL DEFAULT 0,exhausted_count INTEGER NOT NULL DEFAULT 0,warnings TEXT NOT NULL DEFAULT '[]');
INSERT INTO sheet_import_state(id) VALUES(1);
