-- Transactional Sheets outbox; all functions execute under the private backend role.
CREATE FUNCTION store_product_timestamp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.updated_at=CASE WHEN TG_OP='INSERT' THEN NEW.created_at ELSE to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END;
 RETURN NEW;
END;
$$;
CREATE TRIGGER product_created_security BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION store_product_timestamp();
CREATE TRIGGER product_updated_timestamp BEFORE UPDATE OF edit_token ON products FOR EACH ROW EXECUTE FUNCTION store_product_timestamp();

CREATE FUNCTION store_enqueue_variants() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='product_variants' THEN
  UPDATE products SET updated_at=to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') WHERE id=NEW.product_id;
  INSERT INTO sheet_sync(variant_id) VALUES(NEW.id)
  ON CONFLICT(variant_id) DO UPDATE SET revision=sheet_sync.revision+1,next_attempt=0;
 ELSIF TG_TABLE_NAME='products' THEN
  INSERT INTO sheet_sync(variant_id) SELECT id FROM product_variants WHERE product_id=NEW.id
  ON CONFLICT(variant_id) DO UPDATE SET revision=sheet_sync.revision+1,next_attempt=0;
 ELSIF TG_TABLE_NAME='brands' THEN
  INSERT INTO sheet_sync(variant_id) SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.brand_id=NEW.id
  ON CONFLICT(variant_id) DO UPDATE SET revision=sheet_sync.revision+1,next_attempt=0;
 ELSIF TG_TABLE_NAME='categories' THEN
  INSERT INTO sheet_sync(variant_id) SELECT v.id FROM product_variants v JOIN product_categories pc ON pc.product_id=v.product_id WHERE pc.category_id=NEW.id
  ON CONFLICT(variant_id) DO UPDATE SET revision=sheet_sync.revision+1,next_attempt=0;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER product_updated_security AFTER UPDATE OF edit_token ON products FOR EACH ROW EXECUTE FUNCTION store_enqueue_variants();
CREATE TRIGGER variant_inserted_security AFTER INSERT ON product_variants FOR EACH ROW EXECUTE FUNCTION store_enqueue_variants();
CREATE TRIGGER variant_updated_security AFTER UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION store_enqueue_variants();
CREATE TRIGGER category_updated_security AFTER UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION store_enqueue_variants();
CREATE TRIGGER brand_updated_security AFTER UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION store_enqueue_variants();
