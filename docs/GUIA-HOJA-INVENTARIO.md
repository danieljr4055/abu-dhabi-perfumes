# Cómo administrar perfumes desde la hoja

Abre tu Google Sheets y trabaja en la pestaña **Productos**. La página revisa
la hoja cada minuto. Una página del catálogo ya abierta también se actualiza
cada minuto: el cambio puede tardar hasta aproximadamente dos minutos en verse.
No necesitas avisar a un asesor ni editar el código de la web.

## Una fila por presentación

| Columna | Qué escribir |
|---|---|
| sku | Código único y permanente, por ejemplo MS-100. Usa mayúsculas, números y guiones. No lo cambies al actualizar un perfume. |
| nombre | Nombre real del perfume, por ejemplo Mandarin Sky. |
| marca | Marca real del producto. |
| precio | Precio real en pesos, por ejemplo 320000. También acepta $320.000. |
| cantidad | Unidades libres para vender; no incluyas unidades ya reservadas en pedidos de la web. |
| tamano_ml | Tamaño en ml, por ejemplo 100 o 5. Obligatorio al crear una presentación. |
| tipo | frasco o decant. Si lo dejas vacío al crear, se usa frasco. |
| publicado | SI para mostrar una ficha completa; NO para conservarla como borrador. |

Cada presentación necesita su propio SKU. Para agrupar varias presentaciones
bajo una ficha, usa el mismo **codigo_producto** y repite nombre, marca, fotos,
descripción, notas y publicado en esas filas. Precio, cantidad y tamaño sí
pueden ser distintos. Si no usas codigo_producto, el sistema asigna el código
de la ficha a partir del SKU y lo conserva permanentemente.

## Ficha y fotos

Puedes completar **genero** (Hombre, Mujer, Unisex o Por confirmar),
**descripcion**, **categoria**, **imagen_url**, **imagen_2**, **imagen_3**,
**notas_salida**, **notas_corazon** y **notas_fondo**. Separa varias categorías
o notas con `|`. Escribe enlaces de imágenes, no imágenes pegadas dentro de
celdas. Los enlaces deben ser públicos y de un dominio autorizado en la web;
también puedes usar imágenes ya cargadas en `/images/`.

Los productos nuevos incompletos se guardan como **borrador**. Para publicar,
la política actual pide tres imágenes, notas en las tres fases, precio y
stock confirmados y publicado=SI. También puedes completar y publicar la
ficha desde el panel. No se inventan fotos, notas ni precios del negocio.
Vaciar las columnas de imágenes/notas retira esos datos y deja la ficha en
borrador si ya no cumple los requisitos de publicación.

## Agotado, reposición y ventas

- Si Mandarin Sky se agotó, escribe **0** en cantidad. Su ficha sigue visible
  como agotada y nadie puede añadir esa presentación al carrito.
- Si eliminas la fila entera, el resultado también es agotado. No se borra
  la ficha ni sus pedidos anteriores. Si quedan otras presentaciones con
  unidades, el perfume continúa disponible en esas presentaciones.
- Para reponer, vuelve a añadir su misma fila/SKU y escribe una cantidad
  positiva, o cambia la cantidad de 0 al nuevo número.
- Cambiar precio no altera el precio de pedidos anteriores.
- Las reservas y ventas de la web reducen disponibilidad. Releer la misma
  cantidad de la hoja no repone esas unidades automáticamente.

## Si el cambio no aparece

Entra al panel, **Administrar tienda → Accesos y Google Sheets**. Allí aparece
la última lectura correcta y cualquier error de fila. Puedes pulsar
**Actualizar desde la hoja** para importar al momento. Una hoja con SKU
duplicados, datos inválidos, lectura incompleta o permisos incorrectos no
provoca el agotamiento por ausencia. Corrige el error indicado y el siguiente
ciclo volverá a intentarlo. Algunas filas válidas pueden haberse guardado
antes de encontrar un conflicto de edición; la ficha no se borra.

Conserva los encabezados y el nombre Productos. Editar un archivo `.xlsx` en
tu computador no cambia la hoja conectada: debes editar este Google Sheets,
o copiar tus cambios a su pestaña Productos, conservando los encabezados.

La exportación anterior desde la tienda hacia la hoja queda desactivada en
este modo para no sobrescribir tus cambios. PostgreSQL mantiene los pedidos,
clientes y reservas; Google Sheets controla los cambios del catálogo y stock.
