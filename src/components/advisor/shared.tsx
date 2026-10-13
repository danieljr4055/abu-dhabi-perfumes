'use client';

import Link from '@/src/components/StoreLink';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import { currency, INVENTORY } from '../../config/store';
import type { Order, Product } from '../../lib/types';

export const formatAdvisorDate = (value: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value));

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status.replaceAll(' ', '-').toLowerCase()}`}>{status}</span>;
}

export function StockBadge({ product }: { product: Product }) {
  const className = !product.available ? 'status-cancelado' : product.available <= INVENTORY.lowStockThreshold ? 'status-pendiente' : 'status-entregado';
  const label = !product.available ? 'Agotado' : product.available <= INVENTORY.lowStockThreshold ? 'Stock bajo' : 'Disponible';
  return <span className={`badge ${className}`}>{label}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="admin-empty"><ShoppingBag size={30} /><p>{text}</p></div>;
}

export function Pagination({ page, pages, setPage }: { page: number; pages: number; setPage: (page: number) => void }) {
  return pages > 1 ? <div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button></div> : null;
}

export function OrderTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <EmptyState text="Aún no hay pedidos. Los nuevos pedidos aparecerán aquí." />;
  return <div className="table-wrap responsive-table"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Pago</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{orders.map(order => <tr key={order.code}>
    <td data-label="Pedido"><Link className="order-code" href={`/asesor/pedido/${order.code}`}>{order.code}</Link></td>
    <td data-label="Cliente"><span className="cell-wrap">{order.name}<small>{order.phone}</small></span></td>
    <td data-label="Fecha" className="date-cell">{formatAdvisorDate(order.createdAt)}</td>
    <td data-label="Total">{currency(order.total)}</td>
    <td data-label="Pago">{order.payment}</td>
    <td data-label="Estado"><StatusBadge status={order.status} /></td>
    <td data-label="Acción"><Link className="table-link" href={`/asesor/pedido/${order.code}`}>Ver pedido<ArrowUpRight size={15} /></Link></td>
  </tr>)}</tbody></table></div>;
}
