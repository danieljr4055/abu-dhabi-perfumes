'use client';

import Link from '@/src/components/StoreLink';
import { ArrowLeft, ArrowUpRight, Boxes, LayoutDashboard, LogOut, Package, RefreshCw, ShoppingBag, Users } from 'lucide-react';
import { api } from '../StoreProvider';
import type { User } from '../../lib/types';

type AdvisorShellProps = {
  section: string;
  title: string;
  description?: string | null;
  user: User;
  onRefresh: () => void;
  children: React.ReactNode;
};

export default function AdvisorShell({ section, title, description, user, onRefresh, children }: AdvisorShellProps) {
  const navigation = [
    ['dashboard', 'Resumen', LayoutDashboard],
    ['pedidos', 'Pedidos', ShoppingBag],
    ['productos', 'Productos', Package],
    ['inventario', 'Inventario', Boxes],
    ...(user.role === 'admin' ? [['comercio', 'Administrar tienda', Package] as const, ['usuarios', 'Equipo', Users] as const] : []),
  ] as const;
  const parent = section === 'pedido' ? '/asesor/pedidos' : section === 'producto' ? '/asesor/productos' : null;

  return <div className="advisor-layout">
    <aside className="advisor-sidebar">
      <Link className="wordmark" href="/asesor">ABU DHABI<small>PERFUMES</small></Link>
      <span className="sidebar-label">ESPACIO DE ASESORES</span>
      <nav>{navigation.map(([key, label, Icon]) => <Link key={key} href={key === 'dashboard' ? '/asesor' : `/asesor/${key}`} className={section === key || (key === 'pedidos' && section === 'pedido') || (key === 'productos' && section === 'producto') ? 'active' : ''}><Icon size={19} />{label}</Link>)}</nav>
      <div className="sidebar-bottom"><Link href="/" target="_blank">Ver tienda <ArrowUpRight size={17} /></Link><div><span className="avatar">{user.name[0]}</span><span>{user.name}<small>{user.role === 'admin' ? 'Administrador' : 'Asesor'}</small></span></div><button onClick={async () => { await api('/api/auth/logout', { method: 'POST' }); window.location.assign('/asesor/login'); }}><LogOut size={17} />Cerrar sesión</button></div>
    </aside>
    <main className="advisor-main">
      <header className="advisor-top"><span>Panel de gestión <span>/ {title}</span></span><button className="icon-button" onClick={onRefresh} aria-label="Actualizar información"><RefreshCw size={18} /></button></header>
      <div className="advisor-content">
        <div className="advisor-heading"><div><span className="eyebrow">ABU DHABI · OPERACIONES</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{parent && <Link className="button outline" href={parent}><ArrowLeft size={15} />Volver</Link>}</div>
        {children}
      </div>
    </main>
  </div>;
}
