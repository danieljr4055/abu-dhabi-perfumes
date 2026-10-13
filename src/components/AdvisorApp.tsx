'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from './StoreProvider';
import CommerceAdmin from './advisor/CommerceAdmin';
import {useConfirmation} from './advisor/useConfirmation';
import AdvisorShell from './advisor/AdvisorShell';
import DashboardView from './advisor/DashboardView';
import OrdersView from './advisor/OrdersView';
import ProductsView from './advisor/ProductsView';
import UsersView from './advisor/UsersView';
import { ORDER_STATUSES } from '../config/store';
import type { Order, User } from '../lib/types';

const titles: Record<string, string> = { comercio: 'Administración comercial', dashboard: 'Resumen', pedidos: 'Pedidos', pedido: 'Detalle del pedido', productos: 'Productos', producto: 'Ficha del producto', inventario: 'Inventario', usuarios: 'Equipo de asesores' };
const descriptions: Record<string, string> = {
  dashboard: 'Pedidos por atender y actividad de la tienda.',
  pedidos: 'Cada pedido, desde el primer contacto hasta su entrega.',
  productos: 'Precios, presentaciones y fichas de la colección.',
  inventario: 'Existencias físicas, reservas y unidades disponibles.',
  usuarios: 'Cuentas con acceso al espacio privado.',
};

export default function AdvisorApp({ path, user }: { path: string[]; user: User }) {
  const section = path[0] ?? 'dashboard';
  const {ask,confirmation}=useConfirmation();const [commerceDirty,setCommerceDirty]=useState(false);
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [status, setStatus] = useState('');
  const [day, setDay] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const reload = async () => {if(section==='comercio'&&commerceDirty&&!await ask('Hay cambios sin guardar. ¿Descartarlos y actualizar?'))return;setRevision(value=>value+1);};

  const endpoint = section === 'comercio' ? '/api/auth/me' : section === 'dashboard' ? '/api/advisor/dashboard'
    : section === 'pedidos' ? `/api/advisor/orders?${new URLSearchParams({ q: query, status, date: day, page: String(page) })}`
      : section === 'pedido' ? `/api/advisor/orders/${path[1]}`
        : section === 'producto' ? `/api/advisor/products/${path[1]}`
          : section === 'usuarios' ? '/api/admin/users'
            : `/api/advisor/products?${new URLSearchParams({ q: query, limit: '25', page: String(page) })}`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(() => api(endpoint, { signal: controller.signal }).then(setData).catch(cause => { if (cause.name !== 'AbortError') setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }), query ? 200 : 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [endpoint, revision]);

  async function updateStatus(order: Order, newStatus: string) {
    if (!newStatus) return;
    if (newStatus === 'Cancelado' && !window.confirm('¿Cancelar este pedido? Las unidades volverán a estar disponibles.')) return;
    setBusy(true);
    try { setData(await api(`/api/advisor/orders/${order.code}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus, version: order.version }) })); toast.success('Estado del pedido actualizado.'); }
    catch (cause) { toast.error((cause as Error).message); }
    finally { setBusy(false); }
  }

  const filters = ['pedidos', 'productos', 'inventario'].includes(section) ? <div className="admin-filters">
    <div className="search-field"><Search size={18} /><input aria-label={section === 'pedidos' ? 'Buscar pedidos' : 'Buscar productos por código'} placeholder={section === 'pedidos' ? 'Código, cliente o teléfono…' : 'Código, nombre o marca…'} value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></div>
    {section === 'pedidos' && <><select aria-label="Filtrar por estado" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Todos los estados</option>{ORDER_STATUSES.map(value => <option key={value}>{value}</option>)}</select><input type="date" aria-label="Fecha del pedido" value={day} onChange={event => { setDay(event.target.value); setPage(1); }} /></>}
  </div> : null;

  return <AdvisorShell section={section} title={titles[section] ?? 'Página no encontrada'} description={descriptions[section]} user={user} onRefresh={reload}>
    {confirmation}{filters}
    {error ? <div className="error-box" role="alert">{error}<button onClick={reload}>Reintentar</button></div> : loading ? <div className="admin-skeleton"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : data && <>
      {section === 'comercio' && user.role === 'admin' && <CommerceAdmin currentUserId={user.id} onDirtyChange={setCommerceDirty}/>}
      {section === 'dashboard' && <DashboardView data={data} />}
      {(section === 'pedidos' || section === 'pedido') && <OrdersView section={section} data={data} busy={busy} onStatusChange={updateStatus} page={page} setPage={setPage} />}
      {['productos', 'inventario', 'producto'].includes(section) && <ProductsView section={section} data={data} user={user} onSaved={reload} page={page} setPage={setPage} />}
      {section === 'usuarios' && user.role === 'admin' && <UsersView users={data} onSaved={reload} />}
    </>}
  </AdvisorShell>;
}
