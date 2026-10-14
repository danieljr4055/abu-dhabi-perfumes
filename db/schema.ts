// Reconciled from migrations 0000–0003; SQL triggers remain in migrations.
import { sqliteTable, index, check, text, integer, uniqueIndex, primaryKey, real } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const sheetCatalogRows = sqliteTable('sheet_catalog_rows', {
 sku:text().primaryKey(),payload:text().notNull(),present:integer().default(1).notNull(),importedAt:text('imported_at').notNull(),
},table=>[check('sheet_catalog_present_valid',sql`${table.present} IN(0,1)`)]);
export const sheetImportState = sqliteTable('sheet_import_state', {
 id:integer().primaryKey(),lastAttempt:text('last_attempt'),lastSuccess:text('last_success'),lastError:text('last_error'),
 createdCount:integer('created_count').default(0).notNull(),updatedCount:integer('updated_count').default(0).notNull(),exhaustedCount:integer('exhausted_count').default(0).notNull(),warnings:text().default('[]').notNull(),
},table=>[check('sheet_import_singleton',sql`${table.id}=1`)]);

export const customers = sqliteTable("customers", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	createdAt: text("created_at").notNull(),
},
(table) => [
	index("idx_customers_phone").on(table.phone),

]);

export const orderEvents = sqliteTable("order_events", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	orderId: integer("order_id").notNull().references(() => orders.id),
	status: text().notNull(),
	actor: text().notNull(),
	createdAt: text("created_at").notNull(),
},
(table) => [
	index("idx_events_order").on(table.orderId),

]);

export const orderItems = sqliteTable("order_items", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	orderId: integer("order_id").notNull().references(() => orders.id),
	productId: integer("product_id").notNull().references(() => products.id),
	code: text().notNull(),
	name: text().notNull(),
	size: text().notNull(),
	image: text().notNull(),
	price: integer().notNull(),
	quantity: integer().notNull(),
	subtotal: integer().notNull(),
	variantId: integer("variant_id").references(() => productVariants.id),
	sku: text(),
	brand: text(),
	kind: text(),
	oldPrice: integer("old_price"),
	discount: integer(),
},
(table) => [
	index("idx_items_product").on(table.productId),
	index("idx_items_order").on(table.orderId),
	check("order_items_check_0", sql`"order_items"."quantity" > 0`),
]);

export const orders = sqliteTable("orders", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	requestKey: text("request_key").notNull(),
	fingerprint: text().notNull(),
	customerId: text("customer_id").notNull().references(() => customers.id),
	name: text().notNull(),
	phone: text().notNull(),
	address: text().notNull(),
	city: text().notNull(),
	notes: text().notNull(),
	payment: text().notNull(),
	subtotal: integer().notNull(),
	shipping: integer(),
	total: integer().notNull(),
	status: text().default("Pendiente").notNull(),
	createdAt: text("created_at").notNull(),
	version: integer().default(0).notNull(),
	changeToken: text("change_token"),
	paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id),
	whatsappNumber: text("whatsapp_number"),
},
(table) => [
	index("idx_orders_date").on(table.createdAt),
	index("idx_orders_phone").on(table.phone),
	index("idx_orders_status_date").on(table.status, table.createdAt),
	uniqueIndex("orders_request_key_unique").on(table.requestKey),

]);

export const products = sqliteTable("products", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	code: text().notNull(),
	name: text().notNull(),
	brand: text().notNull(),
	category: text().notNull(),
	gender: text().notNull(),
	description: text().notNull(),
	price: integer().notNull(),
	oldPrice: integer("old_price"),
	size: text().notNull(),
	stock: integer().default(0).notNull(),
	reserved: integer().default(0).notNull(),
	sold: integer().default(0).notNull(),
	images: text().notNull(),
	tags: text().notNull(),
	featured: integer().default(0).notNull(),
	active: integer().default(1).notNull(),
	searchText: text("search_text").notNull(),
	createdAt: text("created_at").notNull(),
	version: integer().default(0).notNull(),
	slug: text(),
	editToken: text("edit_token"),
	brandId: integer("brand_id").references(() => brands.id),
	editorialState: text("editorial_state").default("borrador").notNull(),
	concentration: text(),
	performance: text(),
	projection: text(),
	occasion: text().default("[]").notNull(),
	season: text().default("[]").notNull(),
	isNew: integer("is_new").default(0).notNull(),
	updatedAt: text("updated_at"),
},
(table) => [
	index("idx_product_brand_state").on(table.brandId, table.editorialState),
	uniqueIndex("idx_product_slug").on(table.slug),
	index("idx_products_price").on(table.price),
	index("idx_products_filters").on(table.active, table.brand, table.gender),
	uniqueIndex("products_code_unique").on(table.code),
	check("products_check_0", sql`editorial_state IN('borrador','publicado','archivado')`),
	check("products_check_1", sql`"products"."stock" >= "products"."reserved" AND "products"."reserved" >= 0 AND "products"."sold" >= 0`),
	check("products_check_2", sql`"products"."price" >= 0`),
]);

export const rateLimits = sqliteTable("rate_limits", {
	key: text().primaryKey().notNull(),
	count: integer().notNull(),
	resetAt: integer("reset_at").notNull(),
},
() => [

]);

export const sessions = sqliteTable("sessions", {
	tokenHash: text("token_hash").primaryKey().notNull(),
	userId: integer("user_id").notNull().references(() => users.id),
	expiresAt: integer("expires_at").notNull(),
},
(table) => [
	index("idx_sessions_expiry").on(table.expiresAt),

]);

export const settings = sqliteTable("settings", {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
},
() => [

]);

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	username: text().notNull(),
	name: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text().default("advisor").notNull(),
	active: integer().default(1).notNull(),
	createdAt: text("created_at").notNull(),
},
(table) => [
	uniqueIndex("users_username_unique").on(table.username),

]);

export const transactionChecks = sqliteTable("transaction_checks", {
	ok: integer().notNull(),
},
() => [
	check("transaction_checks_check_0", sql`ok=1`),
]);

export const brands = sqliteTable("brands", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	slug: text().notNull(),
	description: text().default("").notNull(),
	image: text(),
	active: integer().default(1).notNull(),
	version: integer().default(0).notNull(),
	searchText: text("search_text").default("").notNull(),
},
(table) => [
	check("brands_check_0", sql`active IN(0,1)`),
	uniqueIndex("brands_slug_unique").on(table.slug),
]);

export const olfactoryFamilies = sqliteTable("olfactory_families", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	slug: text().notNull(),
	description: text().default("").notNull(),
	image: text(),
	active: integer().default(1).notNull(),
	version: integer().default(0).notNull(),
	searchText: text("search_text").default("").notNull(),
},
(table) => [
	check("olfactory_families_check_0", sql`active IN(0,1)`),
	uniqueIndex("olfactory_families_slug_unique").on(table.slug),
]);

export const categories = sqliteTable("categories", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	slug: text().notNull(),
	description: text().default("").notNull(),
	image: text(),
	active: integer().default(1).notNull(),
	version: integer().default(0).notNull(),
	searchText: text("search_text").default("").notNull(),
},
(table) => [
	check("categories_check_0", sql`active IN(0,1)`),
	uniqueIndex("categories_slug_unique").on(table.slug),
]);

export const notes = sqliteTable("notes", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	slug: text().notNull(),
	description: text().default("").notNull(),
	image: text(),
	active: integer().default(1).notNull(),
	version: integer().default(0).notNull(),
	searchText: text("search_text").default("").notNull(),
	familyId: integer("family_id").references(() => olfactoryFamilies.id),
},
(table) => [
	index("idx_note_family").on(table.familyId),
	check("notes_check_0", sql`active IN(0,1)`),
	uniqueIndex("notes_slug_unique").on(table.slug),
]);

export const productNotes = sqliteTable("product_notes", {
	productId: integer("product_id").notNull().references(() => products.id),
	noteId: integer("note_id").notNull().references(() => notes.id),
	phase: text().notNull(),
	position: integer().default(0).notNull(),
},
(table) => [
	index("idx_notes_product").on(table.noteId, table.productId),
	primaryKey({ columns: [table.productId, table.noteId, table.phase], name: "product_notes_product_id_note_id_phase_pk"}),
	check("product_notes_check_0", sql`phase IN('salida','corazon','fondo')`),
]);

export const productCategories = sqliteTable("product_categories", {
	productId: integer("product_id").notNull().references(() => products.id),
	categoryId: integer("category_id").notNull().references(() => categories.id),
},
(table) => [
	index("idx_category_product").on(table.categoryId, table.productId),
	primaryKey({ columns: [table.productId, table.categoryId], name: "product_categories_product_id_category_id_pk"}),

]);

export const productImages = sqliteTable("product_images", {
	id: integer().primaryKey({ autoIncrement: true }),
	productId: integer("product_id").notNull().references(() => products.id),
	url: text().notNull(),
	alt: text().notNull(),
	position: integer().default(0).notNull(),
	source: text(),
	authorization: text(),
},
(table) => [
	index("idx_images_product").on(table.productId, table.position),

]);

export const productVariants = sqliteTable("product_variants", {
	id: integer().primaryKey({ autoIncrement: true }),
	productId: integer("product_id").notNull().references(() => products.id),
	sku: text().notNull(),
	kind: text().notNull(),
	sizeMl: real("size_ml").notNull(),
	price: integer(),
	oldPrice: integer("old_price"),
	stock: integer(),
	reserved: integer().default(0).notNull(),
	sold: integer().default(0).notNull(),
	active: integer().default(1).notNull(),
	commercialVerified: integer("commercial_verified").default(0).notNull(),
  	sheetBlocked: integer("sheet_blocked").default(0).notNull(),
	version: integer().default(0).notNull(),
},
(table) => [
	index("idx_variants_product").on(table.productId, table.active, table.price),
	check("product_variants_check_0", sql`kind IN('frasco','decant')`),
	check("product_variants_check_1", sql`size_ml>0`),
	check("product_variants_check_2", sql`price IS NULL OR price>0`),
	check("product_variants_check_3", sql`old_price IS NULL OR old_price>0`),
	check("product_variants_check_4", sql`active IN(0,1)`),
	check("product_variants_check_5", sql`commercial_verified IN(0,1)`),
	check("valid_variant_inventory", sql`(stock IS NOT NULL AND stock>=reserved OR stock IS NULL AND reserved=0) AND reserved>=0 AND sold>=0`),
  	check("sheet_blocked_valid", sql`sheet_blocked IN(0,1)`),
	uniqueIndex("product_variants_sku_unique").on(table.sku),
]);

export const collections = sqliteTable("collections", {
	editToken: text("edit_token"),
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	slug: text().notNull(),
	description: text().default("").notNull(),
	image: text(),
	mode: text().notNull(),
	active: integer().default(1).notNull(),
	version: integer().default(0).notNull(),
},
(table) => [
	check("collections_check_0", sql`mode IN('manual','automatic')`),
	uniqueIndex("collections_slug_unique").on(table.slug),
]);

export const collectionProducts = sqliteTable("collection_products", {
	collectionId: integer("collection_id").notNull().references(() => collections.id),
	productId: integer("product_id").notNull().references(() => products.id),
},
(table) => [
	primaryKey({ columns: [table.collectionId, table.productId], name: "collection_products_collection_id_product_id_pk"}),

]);

export const collectionRules = sqliteTable("collection_rules", {
	collectionId: integer("collection_id").notNull().references(() => collections.id),
	field: text().notNull(),
	value: text().notNull(),
},
(table) => [
	primaryKey({ columns: [table.collectionId, table.field, table.value], name: "collection_rules_collection_id_field_value_pk"}),

]);

export const storeSettings = sqliteTable("store_settings", {
	id: integer().primaryKey(),
	data: text().notNull(),
	version: integer().default(0).notNull(),
},
() => [
	check("store_settings_check_0", sql`id=1`),
]);

export const paymentMethods = sqliteTable("payment_methods", {
	id: integer().primaryKey({ autoIncrement: true }),
	label: text().notNull(),
	image: text(),
	position: integer().default(0).notNull(),
	active: integer().default(1).notNull(),
	version: integer().default(0).notNull(),
},
(table) => [

	uniqueIndex("payment_methods_label_unique").on(table.label),
]);

export const socialPosts = sqliteTable("social_posts", {
	id: integer().primaryKey({ autoIncrement: true }),
	url: text().notNull(),
	image: text().notNull(),
	title: text().default("").notNull(),
	position: integer().default(0).notNull(),
	active: integer().default(1).notNull(),
	version: integer().default(0).notNull(),
},
() => [

]);

export const importRuns = sqliteTable("import_runs", {
	id: integer().primaryKey({ autoIncrement: true }),
	createdAt: text("created_at").notNull(),
	discovered: integer().notNull(),
	reviewed: integer().notNull(),
	created: integer().default(0).notNull(),
	skipped: integer().default(0).notNull(),
	errors: text().default("[]").notNull(),
},
() => [

]);

export const sourceRecords = sqliteTable("source_records", {
	id: integer().primaryKey({ autoIncrement: true }),
	sourceUrl: text("source_url").notNull(),
	externalId: text("external_id").notNull(),
	checkedAt: text("checked_at").notNull(),
	productId: integer("product_id").references(() => products.id),
	verifiedFields: text("verified_fields").notNull(),
	reviewState: text("review_state").default("pending").notNull(),
},
(table) => [

	uniqueIndex("source_records_source_url_external_id_unique").on(table.sourceUrl, table.externalId),
]);

export const slugRedirects = sqliteTable("slug_redirects", {
	entityKind: text("entity_kind").notNull(),
	oldSlug: text("old_slug").notNull(),
	entityId: integer("entity_id").notNull(),
},
(table) => [
	primaryKey({ columns: [table.entityKind, table.oldSlug], name: "slug_redirects_entity_kind_old_slug_pk"}),

]);

export const googleIdentities = sqliteTable("google_identities", {
	userId: integer("user_id").primaryKey().references(() => users.id),
	email: text().notNull(),
	googleSub: text("google_sub"),
	active: integer().default(1).notNull(),
},
(table) => [
	check("google_identities_check_0", sql`active IN(0,1)`),
	uniqueIndex("google_identities_google_sub_unique").on(table.googleSub),
	uniqueIndex("google_identities_email_unique").on(table.email),
]);

export const loginChallenges = sqliteTable("login_challenges", {
	hash: text().primaryKey(),
	expiresAt: integer("expires_at").notNull(),
},
() => [

]);

export const adminEvents = sqliteTable("admin_events", {
	id: integer().primaryKey({ autoIncrement: true }),
	actorId: integer("actor_id").references(() => users.id),
	action: text().notNull(),
	entityCode: text("entity_code").notNull(),
	createdAt: text("created_at").notNull(),
},
() => [

]);

export const sheetSync = sqliteTable("sheet_sync", {
	variantId: integer("variant_id").primaryKey().references(() => productVariants.id),
	revision: integer().default(1).notNull(),
	syncedRevision: integer("synced_revision").default(0).notNull(),
	attempts: integer().default(0).notNull(),
	nextAttempt: integer("next_attempt").default(0).notNull(),
	lastError: text("last_error"),
	syncedAt: text("synced_at"),
},
() => [

]);

export const syncLocks = sqliteTable("sync_locks", {
	name: text().primaryKey(),
	owner: text().notNull(),
	expiresAt: integer("expires_at").notNull(),
},
() => [

]);
