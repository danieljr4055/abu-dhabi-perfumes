'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="container empty-state"><h1>No pudimos cargar esta página.</h1><p>Intenta nuevamente en unos momentos. Tu carrito se conserva.</p><button className="button" onClick={reset}>Reintentar</button></main>;}
