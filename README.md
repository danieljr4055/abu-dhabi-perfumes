# Abu Dhabi Perfumes

Tienda y panel privado con React/Vinext, Node 24 y PostgreSQL. Imágenes y fuentes incluidas.

## Ejecutar

`npm ci`, `npm run test:unit`, `npm run build`. Configurar `DATABASE_URL` privada, ejecutar `npm run db:migrate:railway` y arrancar con `npm start`.

Railway construye Dockerfile y usa railway.json. En producción requiere PUBLIC_ORIGIN HTTPS o RAILWAY_PUBLIC_DOMAIN. Crear un administrador propio con scripts/create-admin.mjs y guardar ADMIN_USERNAME/ADMIN_PASSWORD_HASH exclusivamente en las variables del servicio. No usar credenciales QA.

Google Sheets puede controlar catálogo, precios y existencias al configurar SHEETS_IMPORT_ENABLED=true en el servidor. El proceso Node lee la pestaña Productos cada 60 segundos. Una fila por SKU; fila ausente o cantidad0 marca agotado sin borrar fichas ni pedidos. La exportación está desactivada en ese modo para no sobrescribir cambios. Los datos operativos, reservas y precios históricos permanecen en PostgreSQL. Ver [guía para el negocio](docs/GUIA-HOJA-INVENTARIO.md).

No incluir .dev.vars, ACCESO-PRIVADO.txt, claves ni bases locales en el repositorio. Los tests son ficticios y se ejecutan en aislamiento; no apuntarlos a una base real.
