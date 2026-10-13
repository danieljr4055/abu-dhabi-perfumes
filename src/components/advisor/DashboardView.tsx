'use client';

import Link from '@/src/components/StoreLink';
import { FormEvent, useState } from 'react';

import { AlertCircle, ArrowRight, ArrowUpRight, PackageSearch, Search } from 'lucide-react';
import type { Order } from '../../lib/types';
import { OrderTable } from './shared';

type DashboardData = { counts: Record<string, number>; today: number; total: number; inventory: { low: number; empty: number }; recent: Order[] };

export default function DashboardView({ data }: { data: DashboardData }) {

  const [orderQuery, setOrderQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  function go(event: FormEvent, kind: 'orders' | 'products', value: string) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    window.location.assign(kind === 'orders' ? `/asesor/pedidos?q=${encodeURIComponent(query)}` : `/asesor/productos?q=${encodeURIComponent(query)}`);
  }

  return <>
    <div className="advisor-quick-search">
      <form onSubmit={event => go(event, 'orders', orderQuery)}><label htmlFor="quick-order"><Search size={18} /><span><strong>Encontrar pedido</strong><small>Código, cliente o teléfono</small></span></label><div><input id="quick-order" value={orderQuery} onChange={event => setOrderQuery(event.target.value)} placeholder="PED-755" /><button className="icon-button" aria-label="Buscar pedido"><ArrowRight size={18} /></button></div></form>
      <form onSubmit={event => go(event, 'products', productQuery)}><label htmlFor="quick-product"><PackageSearch size={18} /><span><strong>Consultar producto</strong><small>Código, nombre o marca</small></span></label><div><input id="quick-product" value={productQuery} onChange={event => setProductQuery(event.target.value)} placeholder="DIO-SAV-006" /><button className="icon-button" aria-label="Buscar producto"><ArrowRight size={18} /></button></div></form>
    </div>
    <div className="stats-grid">{[['Pendientes', data.counts.Pendiente ?? 0], ['Pedidos de hoy', data.today], ['En preparación', data.counts['Preparando pedido'] ?? 0], ['Stock bajo', data.inventory.low ?? 0]].map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="panel-heading"><h2>Pedidos recientes</h2><Link className="underlink" href="/asesor/pedidos">Ver todos<ArrowUpRight size={15} /></Link></div>
    <OrderTable orders={data.recent} />
    <div className="operations-summary"><span>{data.total} pedidos en total</span><span>{data.counts.Enviado ?? 0} enviados</span><span>{data.counts.Entregado ?? 0} entregados</span><span>{data.counts.Cancelado ?? 0} cancelados</span><span>{data.inventory.empty ?? 0} productos agotados</span></div>
    <div className="admin-help"><AlertCircle size={19} /><span>Los pedidos nuevos reservan inventario. El pago recibido convierte la reserva en venta.</span></div>
  </>;
}
