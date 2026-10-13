'use client';

import Link from '@/src/components/StoreLink';
import { ArrowUpRight, Check, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { currency } from '../../config/store';
import { allowedTransitions, whatsappUrl } from '../../lib/domain';
import type { Order } from '../../lib/types';
import { EmptyState, formatAdvisorDate, OrderTable, Pagination, StatusBadge } from './shared';

function copy(value: string) {
  navigator.clipboard.writeText(value).then(() => toast.success('Copiado.')).catch(() => toast.error('No se pudo copiar. Selecciona el texto manualmente.'));
}

export default function OrdersView({ section, data, busy, onStatusChange, page, setPage }: { section: string; data: any; busy: boolean; onStatusChange: (order: Order, status: string) => void; page: number; setPage: (page: number) => void }) {
  if (section === 'pedidos') return <><OrderTable orders={data.orders} /><Pagination page={page} pages={data.pages} setPage={setPage} /></>;
  const order = data as Order;
  const transitions = allowedTransitions[order.status as keyof typeof allowedTransitions] ?? [];
  return <>
    <div className="order-heading"><h2>{order.code}<button className="icon-button" aria-label="Copiar código de pedido" onClick={() => copy(order.code)}><Copy size={17} /></button></h2><StatusBadge status={order.status} /><span className="muted small">{formatAdvisorDate(order.createdAt)}</span></div>
    <div className="order-detail-grid">
      <section className="panel"><h3>Información del cliente</h3><dl><dt>Nombre</dt><dd>{order.name}</dd><dt>Teléfono</dt><dd>{order.phone}<button className="icon-button" aria-label="Copiar teléfono" onClick={() => copy(order.phone)}><Copy size={14} /></button></dd><dt>Dirección</dt><dd>{order.address}</dd><dt>Ciudad</dt><dd>{order.city}</dd><dt>Observaciones</dt><dd>{order.notes || 'Sin observaciones.'}</dd></dl><a className="button outline" href={whatsappUrl(`Hola ${order.name}, te contactamos de Abu Dhabi Perfumes sobre tu pedido ${order.code}.`, order.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />Contactar por WhatsApp</a></section>
      <section className="panel"><h3>Gestionar pedido</h3><dl><dt>Método de pago</dt><dd>{order.payment}</dd><dt>Estado actual</dt><dd><StatusBadge status={order.status} /></dd></dl><label>Cambiar estado<select aria-label="Cambiar estado del pedido" value="" disabled={busy || !transitions.length} onChange={event => onStatusChange(order, event.target.value)}><option value="">{busy ? 'Guardando…' : 'Seleccionar nuevo estado'}</option>{transitions.map(status => <option key={status}>{status}</option>)}</select></label>{!transitions.length && <p className="small muted">Este pedido ha finalizado.</p>}<div className="order-totals"><div>Subtotal <strong>{currency(order.subtotal)}</strong></div><div>Envío <span>Por confirmar</span></div><div>Total de productos <strong>{currency(order.total)}</strong></div></div></section>
    </div>
    <section className="panel"><h3>Productos del pedido</h3><div className="table-wrap responsive-table"><table><thead><tr><th>Producto / código</th><th>Presentación</th><th>Cantidad</th><th>Precio histórico</th><th>Subtotal</th></tr></thead><tbody>{order.items.map(item => <tr key={item.variantId??item.code}><td data-label="Producto"><Link className="table-product" href={`/asesor/producto/${item.code}`}><img src={item.image} alt={item.name} /><span>{item.name}<small>{item.code} · {item.sku??'SKU no registrado'} · {item.brand??'Marca no registrada'}</small></span><ArrowUpRight size={15} /></Link></td><td data-label="Presentación">{item.size} · {item.kind??'Tipo no registrado'}</td><td data-label="Cantidad">{item.quantity}</td><td data-label="Precio histórico">{currency(item.price)}</td><td data-label="Subtotal">{currency(item.subtotal)}</td></tr>)}</tbody></table></div></section>
    <section className="panel"><h3>Historial del pedido</h3><ol className="timeline">{order.events?.map((event, index) => <li key={index}><Check size={14} /><span><strong>{event.status}</strong><small>{formatAdvisorDate(event.createdAt)} · {event.actor}</small></span></li>)}</ol>{!order.events?.length && <EmptyState text="Este pedido aún no tiene cambios de estado." />}</section>
  </>;
}
