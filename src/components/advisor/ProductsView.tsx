'use client';

import Link from '@/src/components/StoreLink';
import { ArrowUpRight } from 'lucide-react';
import { currency } from '../../config/store';
import type { Product, User } from '../../lib/types';
import type { ManagedProduct } from '../../server/product-editor';
import { EmptyState, formatAdvisorDate, Pagination, StatusBadge, StockBadge } from './shared';

export default function ProductsView({ section, data, user, page, setPage }: { section: string; data: any; user: User; onSaved: () => void; page: number; setPage: (page: number) => void }) {
  if (section === 'producto') {
    const product = data.product as Product;
    return <>
      <div className="admin-product-detail"><div className="admin-product-images">{product.images.map((source, index) => <img src={source} key={index} alt={`${product.name} vista ${index + 1}`} />)}</div><div className="panel"><span className="eyebrow">{product.brand}</span><h2>{product.name}</h2><p className="product-code">{product.code}</p><StockBadge product={product} /><h3 className="admin-product-price">{product.priceKnown===false?'Por confirmar':currency(product.price)}</h3><p>{product.description}</p><dl><dt>Presentación</dt><dd>{product.size}</dd><dt>Familia / género</dt><dd>{product.category} · {product.gender}</dd><dt>Etiquetas</dt><dd>{product.tags.join(', ')}</dd><dt>Físico / reservado</dt><dd>{product.stock} / {product.reserved}</dd><dt>Disponible</dt><dd>{product.available}</dd><dt>Unidades vendidas</dt><dd>{product.sold}</dd></dl></div></div>
      <section className="panel"><h3>Últimos pedidos con este producto</h3>{data.orders.length ? <div className="recent-product-orders">{data.orders.map((order: any) => <Link key={order.code} href={`/asesor/pedido/${order.code}`}><strong>{order.code}</strong><span>{formatAdvisorDate(order.createdAt)}</span><StatusBadge status={order.status} /><ArrowUpRight size={16} /></Link>)}</div> : <EmptyState text="Este producto aún no aparece en pedidos." />}</section>
      {user.role === 'admin' && <Link className="button" href="/asesor/comercio">Editar en Administrar tienda</Link>}
    </>;
  }

  const inventory = section === 'inventario';
  return <>
    <div className="admin-context"><strong>{inventory ? 'Control de existencias' : 'Información comercial'}</strong><span>{inventory ? 'Físico: unidades registradas · Reservado: pedidos pendientes · Disponible: unidades para vender.' : 'Consulta precio, presentación y disponibilidad. Abre la ficha para imágenes, descripción e historial.'}</span></div>
    <div className="table-wrap responsive-table"><table><thead><tr><th>Producto</th><th>Código</th><th>Precio</th>{inventory ? <><th>Físico</th><th>Reservado</th><th>Disponible</th></> : <><th>Presentación</th><th>Stock disponible</th></>}<th>Estado</th><th>Acción</th></tr></thead><tbody>{data.products.flatMap((p:ManagedProduct)=>inventory?p.variants.map(v=>({...p,sku:v.sku,variantId:v.id,size:v.sizeMl+' ml · '+v.kind,price:v.price??0,priceKnown:v.price!==null,stock:v.stock,reserved:v.reserved,available:v.stock===null?null:v.sheetBlocked?0:v.stock-v.reserved})): [p]).map((product: Product) => <tr key={product.variantId??product.code}>
      <td data-label="Producto"><Link className="table-product" href={`/asesor/producto/${product.code}`}><img src={product.images[0]} alt={product.name} /><span>{product.name}<small>{product.brand}</small></span></Link></td>
      <td data-label="Código"><code>{product.sku??product.code}</code></td><td data-label="Precio">{product.priceKnown===false?'Por confirmar':currency(product.price)}</td>
      {inventory ? <><td data-label="Físico">{product.stock}</td><td data-label="Reservado">{product.reserved}</td><td data-label="Disponible">{product.available}</td></> : <><td data-label="Presentación">{product.size}</td><td data-label="Stock disponible">{product.available}</td></>}
      <td data-label="Estado"><StockBadge product={product} /></td><td data-label="Acción"><Link className="table-link" href={`/asesor/producto/${product.code}`}>Ver<ArrowUpRight size={14} /></Link></td>
    </tr>)}</tbody></table>{!data.products.length && <EmptyState text="No hay productos con esa búsqueda." />}</div>
    <Pagination page={page} pages={data.pages} setPage={setPage} />
    {user.role === 'admin' && section === 'productos' && <Link className="button" href="/asesor/comercio">Administrar perfumes y presentaciones</Link>}
  </>;
}
