'use client';

import Link from '@/src/components/StoreLink';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useCart, useStore } from './StoreProvider';
import { currency } from '../config/store';
import { whatsappMessage } from '../lib/domain';
import { validateCommerceCheckout as validateCheckout } from '../lib/commerce-checkout';
import { cartKey } from '../lib/cart';
import type { Order } from '../lib/types';

type FormState = { name: string; phone: string; address: string; city: string; notes: string; payment: string };
type CheckoutPayload = FormState & { requestKey: string; items: { variantId: number; code: string; quantity: number; expectedPrice: number }[] };
type OrderResult = { order: Order; whatsappUrl: string };

const emptyForm: FormState = { name: '', phone: '', address: '', city: '', notes: '', payment: '' };

export default function CartCheckout({ checkout = false }: { checkout?: boolean }) {
  const { lines, ready, update, clear, refresh } = useCart();
  const {payments}=useStore();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState<CheckoutPayload | null>(null);
  const requestKey = useRef('');
  const submission = useRef(false);

  useEffect(() => {
    if (ready && lines.length) refresh().catch(cause => setError(cause.message));
  }, [ready]);

  useEffect(() => {
    const saved = sessionStorage.getItem('abu-checkout-key');
    requestKey.current = saved || crypto.randomUUID();
    sessionStorage.setItem('abu-checkout-key', requestKey.current);
    try {
      const previous = JSON.parse(sessionStorage.getItem('abu-pending-attempt') ?? 'null') as CheckoutPayload | null;
      if (previous) {
        validateCheckout(previous);
        setPending(previous);
        setForm({ name: previous.name, phone: previous.phone, address: previous.address, city: previous.city, notes: previous.notes, payment: previous.payment });
      }
    } catch { /* Invalid recovery data is ignored. */ }
  }, []);

  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const invalid = lines.some(line => line.quantity > line.product.available || line.product.available === 0);

  async function attempt(data: CheckoutPayload) {
    if (submission.current) return;
    submission.current = true;
    setBusy(true);
    setError('');
    setPending(data);
    sessionStorage.setItem('abu-pending-attempt', JSON.stringify(data));
    try {
      const response = await api<OrderResult>('/api/orders', { method: 'POST', body: JSON.stringify(data) });
      setResult(response);
      clear();
      setPending(null);
      sessionStorage.removeItem('abu-pending-attempt');
      sessionStorage.removeItem('abu-checkout-key');
      toast.success(`Pedido ${response.order.code} creado correctamente.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (cause) {
      const requestError = cause as Error & { status?: number };
      setError(requestError.message);
      if ([400, 409, 413, 422].includes(requestError.status ?? 0)) {
        setPending(null);
        sessionStorage.removeItem('abu-pending-attempt');
        requestKey.current = crypto.randomUUID();
        sessionStorage.setItem('abu-checkout-key', requestKey.current);
      }
    } finally {
      setBusy(false);
      submission.current = false;
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const data: CheckoutPayload = { ...form, requestKey: requestKey.current, items: lines.map(line => ({ variantId: line.product.variantId??0, code: line.product.code, quantity: line.quantity, expectedPrice: line.product.price })) };
    try { validateCheckout(data); } catch (cause) { setError((cause as Error).message); return; }
    await attempt(data);
  }

  if (!ready) return <main className="container empty-state"><div className="skeleton" style={{ height: 160 }} />Cargando tu carrito…</main>;

  if (result) return <main className="container confirmation">
    <span className="success-seal"><Check size={32} /></span>
    <span className="eyebrow">GRACIAS POR ELEGIR ABU DHABI</span>
    <h1>¡Pedido preparado!</h1>
    <p>Tu pedido <strong className="confirmation-code">{result.order.code}</strong> está listo.</p>
    <p className="muted">Continúa a WhatsApp para finalizar la compra con uno de nuestros asesores.<br />Tu pedido ya está guardado. Solo falta enviar el mensaje.</p>
    <div className="confirmation-summary"><div><span>Pedido</span><strong>{result.order.code}</strong></div><div><span>Total de productos</span><strong>{currency(result.order.total)}</strong></div><div><span>Método de pago</span><strong>{result.order.payment}</strong></div></div>
    <p className="muted small">Envío por confirmar · Pendiente de coordinación y pago</p>
    <div className="confirmation-actions"><a className="button whatsapp" href={result.whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} />Continuar a WhatsApp<ArrowUpRightIcon /></a><button className="button outline confirmation-copy" onClick={() => navigator.clipboard.writeText(whatsappMessage(result.order)).then(() => toast.success('Mensaje copiado.')).catch(() => toast.error('No se pudo copiar. Usa la vista del mensaje.'))}><Copy size={17} />Copiar mensaje</button></div>
    <details className="message-preview"><summary>Ver el mensaje de mi pedido</summary><pre>{whatsappMessage(result.order)}</pre></details>
    <Link className="underlink" href="/productos">Seguir explorando <ArrowRight size={17} /></Link>
  </main>;

  if (pending) return <main className="container empty-state pending-recovery">
    <ShieldCheck size={40} /><span className="eyebrow">PEDIDO PROTEGIDO</span><h1>{busy ? 'Guardando tu pedido…' : 'Recuperemos tu pedido.'}</h1>
    <p>{busy ? 'Estamos confirmando tu selección.' : 'La conexión se interrumpió. Comprueba el resultado antes de iniciar otro pedido.'}</p>
    {error && <p className="error-text" role="alert">{error}</p>}
    <button className="button" disabled={busy} onClick={() => attempt(pending)}>{busy ? 'Espera un momento…' : 'Comprobar mi pedido'}</button>
    <p className="small muted">Se conserva el mismo intento para evitar duplicados.</p>
  </main>;

  if (!lines.length) return <main className="container empty-state"><ShoppingBag size={42} /><span className="eyebrow">TU SELECCIÓN</span><h1>Tu carrito está vacío.</h1><p>Aún no tienes perfumes en el carrito.</p><Link className="button" href="/productos">Explorar perfumes <ArrowRight size={17} /></Link></main>;

  return <main className="container cart-page">
    <Link className="breadcrumb" href={checkout ? '/carrito' : '/productos'}><ArrowLeft size={15} />{checkout ? 'Volver al carrito' : 'Seguir comprando'}</Link>
    <div className="checkout-steps" aria-label="Progreso del pedido"><span className={!checkout ? 'active' : ''}>01 · Carrito</span><i /><span className={checkout ? 'active' : ''}>02 · Tus datos</span><i /><span>03 · WhatsApp</span></div>
    <span className="eyebrow">{checkout ? 'EL ÚLTIMO PASO' : 'TU SELECCIÓN'}</span>
    <h1>{checkout ? 'Datos de tu pedido.' : 'Tu carrito.'}</h1>
    <div className="checkout-layout">
      <section className="checkout-primary">
        {checkout ? <form id="checkout-form" className="checkout-form" onSubmit={submit}>
          <h2>Datos de entrega</h2><p className="muted">Compra como invitado. Usaremos tus datos para gestionar este pedido.</p>
          <div className="form-grid">{[
            ['name', 'Nombre completo', 'Juan Pérez', 'name'],
            ['phone', 'Teléfono', '3001234567', 'tel'],
            ['address', 'Dirección', 'Calle, número y apartamento', 'street-address'],
            ['city', 'Ciudad', 'Cartago', 'address-level2'],
          ].map(([key, label, placeholder, autoComplete]) => <label key={key} className={key === 'address' ? 'span-2' : ''}>{label}<input name={key} required minLength={key === 'phone' ? 10 : key === 'address' ? 5 : 2} maxLength={key === 'address' ? 200 : 100} autoComplete={autoComplete} type={key === 'phone' ? 'tel' : 'text'} pattern={key === 'phone' ? '(?:\\+?57\\s?)?3[0-9]{9}' : undefined} placeholder={placeholder} value={form[key as keyof FormState]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
          <label className="notes-label">Observaciones <span className="muted">(opcional)</span><textarea name="notes" maxLength={1000} rows={3} placeholder="Indicaciones para la entrega…" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
          <fieldset className="payment-options"><legend>Método de pago</legend><p className="muted small">El asesor coordinará el pago contigo. No solicitamos datos bancarios.</p>{payments.map(({label:payment}) => <label key={payment} className={form.payment === payment ? 'selected' : ''}><input type="radio" name="payment" required value={payment} checked={form.payment === payment} onChange={() => setForm(current => ({ ...current, payment }))} />{payment}<span>{payment === 'Tarjeta' ? 'Coordinado con asesor' : payment === 'Transferencia' ? 'Datos al confirmar' : 'Sujeto a entrega'}</span></label>)}</fieldset>
        </form> : <div className="cart-lines">{lines.map(line => <article className="cart-line" key={cartKey(line.product)}>
          <Link className="cart-image" href={`/producto/${line.product.code}`}><img src={line.product.images[0]} alt={line.product.name} /></Link>
          <div><span className="eyebrow">{line.product.brand}</span><Link href={`/producto/${line.product.code}`}><h3>{line.product.name}</h3></Link><p className="small muted">{line.product.code} · {line.product.size}</p><strong>{currency(line.product.price)}</strong>{line.quantity > line.product.available && <p className="error-text">Solo hay {line.product.available} unidades disponibles.</p>}</div>
          <div className="cart-quantity"><div className="quantity"><button aria-label={`Reducir ${line.product.name}`} disabled={line.quantity === 1} onClick={() => update(cartKey(line.product), line.quantity - 1)}><Minus size={15} /></button><output aria-label={`Cantidad de ${line.product.name}`}>{line.quantity}</output><button aria-label={`Aumentar ${line.product.name}`} disabled={line.quantity >= Math.min(line.product.available, 20)} onClick={() => update(cartKey(line.product), line.quantity + 1)}><Plus size={15} /></button></div><button className="remove-button" onClick={() => update(cartKey(line.product), 0)} aria-label={`Eliminar ${line.product.name}`}><Trash2 size={15} />Eliminar</button></div>
          <strong className="line-total">{currency(line.product.price * line.quantity)}</strong>
        </article>)}</div>}
        {error && <div className="error-box" role="alert">{error}<button onClick={() => refresh().then(() => { setError(''); requestKey.current = crypto.randomUUID(); sessionStorage.setItem('abu-checkout-key', requestKey.current); }).catch(cause => setError(cause.message))}>Actualizar precios y disponibilidad</button></div>}
      </section>
      <aside className="order-summary glass-surface"><span className="eyebrow">RESUMEN DEL PEDIDO</span>
        {checkout && <div className="mini-lines">{lines.map(line => <div key={cartKey(line.product)}><img src={line.product.images[0]} alt="" /><span>{line.product.name} × {line.quantity}<small>{line.product.code}</small></span><strong>{currency(line.product.price * line.quantity)}</strong></div>)}</div>}
        <div><span>Subtotal</span><strong>{currency(total)}</strong></div><div><span>Envío</span><span>Por confirmar</span></div><div className="summary-total"><span>Total de productos</span><strong>{currency(total)}</strong></div>
        <p className="small muted">El costo de envío se acuerda con el asesor antes de realizar el pago.</p>
        {checkout ? <button className="button" form="checkout-form" disabled={busy || invalid}>{busy ? 'Guardando tu pedido…' : 'Preparar pedido'}<ArrowRight size={18} /></button> : <Link className="button" href="/checkout">Continuar con mi pedido<ArrowRight size={18} /></Link>}
        {invalid && <p className="error-text">Ajusta las cantidades del carrito para continuar.</p>}
        <div className="secure-note"><ShieldCheck size={18} /><span>Tus datos se comparten solo con el equipo que atiende tu pedido.</span></div>
      </aside>
    </div>
  </main>;
}

function ArrowUpRightIcon() { return <ArrowRight size={18} style={{ transform: 'rotate(-35deg)' }} />; }
