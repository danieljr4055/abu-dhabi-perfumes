'use client';

import Link from '@/src/components/StoreLink';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock, MapPin, Menu, MessageCircle, Search, ShoppingBag, X } from 'lucide-react';
import { useCart, useStore } from './StoreProvider';
import { FACEBOOK_URL, INSTAGRAM_URL, STORE_ADDRESS, STORE_CITY, STORE_HOURS, STORE_NAME } from '../config/store';
import { whatsappUrl } from '../lib/domain';

const navigation = [
  ['Inicio', '/'],
  ['Perfumes', '/productos'],
  ['Marcas', '/marcas'],
  ['Aromas', '/notas'],
  ['Decants', '/decants'],
] as const;

export default function StoreShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(path !== '/');
  const { lines } = useCart();
  const { settings } = useStore();
  const cartCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const checkout = path === '/checkout';

  useEffect(() => setMenu(false), [path]);

  useEffect(() => {
    if (path !== '/') {
      setScrolled(true);
      return;
    }
    const campaign = document.querySelector('.campaign');
    if (!campaign) {
      setScrolled(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: '-24px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(campaign);
    return () => observer.disconnect();
  }, [path]);

  if (path.startsWith('/asesor')) return children;

  const headerState = checkout ? 'header--checkout' : path === '/' && !scrolled ? 'header--overlay' : 'header--solid';
  const headerClass = `store-header ${headerState}${checkout ? '' : ' glass-surface'}`;

  return <>
    <header className={headerClass}>
      <Link className="wordmark" href="/" aria-label={settings?.storeName??STORE_NAME}>
        {(settings?.storeName??STORE_NAME).replace(/ Perfumes$/i, '').toUpperCase()}<small>PERFUMES</small>
      </Link>
      {checkout ? <Link className="checkout-return" href="/carrito">Volver al carrito</Link> : <nav aria-label="Navegación principal">
        {navigation.map(([label, href]) => <Link key={label} href={href} aria-current={(path === href || (href === '/productos' && path.startsWith('/producto/'))) ? 'page' : undefined}>{label}</Link>)}
      </nav>}
      <div className="header-actions">
        {!checkout && <Link href="/productos" aria-label="Buscar perfumes"><Search size={20} /></Link>}
        <Link href="/carrito" aria-label={`Carrito, ${cartCount} productos`}><ShoppingBag size={20} /><span>{cartCount}</span></Link>
        {!checkout && <button className="icon-button mobile-menu" onClick={() => setMenu(open => !open)} aria-controls="mobile-navigation" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu}>{menu ? <X /> : <Menu />}</button>}
      </div>
    </header>
    {menu && <nav id="mobile-navigation" className="mobile-nav glass-surface" aria-label="Menú móvil">
      {navigation.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenu(false)}>{label}<ArrowUpRight size={18} /></Link>)}
    </nav>}
    {children}
    <footer id="contacto">
      <div className="container footer-grid">
        <div><div className="wordmark">{settings?.storeName??STORE_NAME}</div><p>Perfumes. Conversaciones. Elecciones personales.</p><a className="underlink" href={whatsappUrl('Hola, quisiera obtener información sobre los productos de la perfumería.',settings?.whatsappNumber)} target="_blank" rel="noopener noreferrer">Hablemos por WhatsApp <ArrowUpRight size={16} /></a></div>
        <div><h3>Visítanos</h3><p><MapPin size={16} />{settings?.address??STORE_ADDRESS}<br />{settings?.city??STORE_CITY}</p><p><Clock size={16} />{settings?.hours??STORE_HOURS}</p></div>
        <div><h3>Explora</h3><Link href="/productos">Todos los perfumes</Link><Link href="/carrito">Mi carrito</Link><Link href="/asesor/login">Acceso asesores</Link>{(settings?.instagramUrl??INSTAGRAM_URL) && <a href={settings?.instagramUrl??INSTAGRAM_URL}>Instagram</a>}{(settings?.facebookUrl??FACEBOOK_URL) && <a href={settings?.facebookUrl??FACEBOOK_URL}>Facebook</a>}</div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} {settings?.storeName??STORE_NAME}<span>Precios en COP · Envío por confirmar</span></div>
    </footer>
    <a className="floating-whatsapp" href={whatsappUrl('Hola, quisiera obtener información sobre los productos de la perfumería.',settings?.whatsappNumber)} target="_blank" rel="noopener noreferrer" aria-label="Consultar por WhatsApp"><MessageCircle size={24} /></a>
  </>;
}
