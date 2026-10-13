# Abu Dhabi Perfumes

Tienda y panel privado con React/Vinext, Node 24 y PostgreSQL. Imágenes y fuentes incluidas.

## Ejecutar

`npm ci`, `npm run test:unit`, `npm run build`. Configurar `DATABASE_URL` privada, ejecutar `npm run db:migrate:railway` y arrancar con `npm start`.

Railway construye Dockerfile y usa railway.json. En producción requiere PUBLIC_ORIGIN HTTPS o RAILWAY_PUBLIC_DOMAIN. Crear un administrador propio con scripts/create-admin.mjs y guardar ADMIN_USERNAME/ADMIN_PASSWORD_HASH exclusivamente en las variables del servicio. No usar credenciales QA.

Google Sheets es una copia privada, con credenciales de cuenta de servicio en variables del servidor. El catálogo y pedidos se guardan en PostgreSQL. Los códigos y precios históricos son permanentes.

No incluir .dev.vars, ACCESO-PRIVADO.txt, claves ni bases locales en el repositorio. Los tests son ficticios y se ejecutan en aislamiento; no apuntarlos a una base real.
