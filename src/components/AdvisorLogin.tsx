'use client';

import { useState } from 'react';
import GoogleAccess from './GoogleAccess';
import Link from '@/src/components/StoreLink';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { api } from './StoreProvider';

export default function AdvisorLogin() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); window.location.assign('/asesor'); }
    catch (cause) { setError((cause as Error).message); setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-brand" aria-label="Abu Dhabi Perfumes"><Link className="wordmark" href="/">ABU DHABI<small>PERFUMES</small></Link><div><span className="eyebrow light">ABU DHABI · EQUIPO</span><h1>Detrás de<br />cada pedido.</h1><p>Pedidos, productos e inventario en un solo espacio.</p></div><span>ESPACIO PRIVADO · EQUIPO ABU DHABI</span></section>
    <section className="login-form"><Link className="breadcrumb" href="/"><ArrowLeft size={15} />Volver a la tienda</Link><LockKeyhole size={28} /><span className="eyebrow">BIENVENIDO DE NUEVO</span><h2>Acceso del equipo</h2><p className="muted">Ingresa con tu cuenta autorizada.</p><GoogleAccess/><div className="login-divider"><span>o con tu usuario del equipo</span></div><form onSubmit={submit}><label>Usuario<input name="username" autoComplete="username" required maxLength={100} /></label><label>Contraseña<div className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={200} /><button type="button" className="icon-button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <div className="error-box" role="alert">{error}</div>}<button className="button" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar al panel'}<ArrowRight size={18} /></button></form><p className="small muted">¿Necesitas acceso? Solicita una cuenta al administrador de la perfumería.</p></section>
  </main>;
}
