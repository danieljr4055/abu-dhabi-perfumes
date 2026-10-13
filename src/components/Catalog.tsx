'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import { api } from './StoreProvider';
import { currency } from '../config/store';
import type { Product } from '../lib/types';

type CatalogData = {
  products: Product[];
  total: number;
  page: number;
  pages: number;
  facets: Record<string, string[]>;
};

const facetControls = [
  ['marca', 'Marca', 'brands'],
  ['genero', 'Género', 'genders'],
  ['categoria', 'Categoría', 'categories'],
  ['nota', 'Nota', 'notes'],
  ['familia', 'Familia olfativa', 'families'],
  ['tamano', 'Presentación', 'sizes'],
] as const;

export default function Catalog({ initial,title='La colección.',lockedFilters={} }: { initial: CatalogData;title?:string;lockedFilters?:Record<string,string> }) {
  const search = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>(() => Object.fromEntries(search.entries()));
  const [data, setData] = useState<CatalogData>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      const params=new URLSearchParams({...filters,...lockedFilters});
      window.history.replaceState(null,'',window.location.pathname+'?'+new URLSearchParams(filters));
      api(`/api/products?${params}`, { signal: controller.signal })
        .then(setData)
        .catch(error => { if (error.name !== 'AbortError') setError(error.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters]);

  const change = (key: string, value: string) => setFilters(current => ({ ...current, [key]: value, page: '1' }));
  const activeFilters = Object.entries(filters).filter(([key, value]) => value && key !== 'page' && key !== 'orden').length;

  return <main className="container catalog-page">
    <div className="catalog-intro">
      <div><span className="eyebrow">PERFUMERÍA SELECTA</span><h1>{title}</h1><p>Busca un nombre, una nota o una familia olfativa.</p></div>
    </div>
    <div className="catalog-toolbar" role="search" aria-label="Buscar y ordenar perfumes">
      <div className="search-field"><Search size={19} /><input aria-label="Buscar productos" placeholder="Nombre, marca, código…" value={filters.q ?? ''} onChange={event => change('q', event.target.value)} />{filters.q && <button className="icon-button" aria-label="Limpiar búsqueda" onClick={() => change('q', '')}><X size={16} /></button>}</div>
      <p className="result-count" aria-live="polite">{loading ? 'Buscando…' : `${data.total} ${data.total === 1 ? 'perfume' : 'perfumes'}`}</p>
      <button className="button outline filter-toggle" onClick={() => setShowFilters(open => !open)} aria-expanded={showFilters} aria-controls="filtros"><SlidersHorizontal size={17} />Filtros {activeFilters > 0 && `(${activeFilters})`}</button>
      <label className="sort-label">Ordenar por<select aria-label="Ordenar productos" value={filters.orden ?? 'destacados'} onChange={event => change('orden', event.target.value)}><option value="destacados">Destacados</option><option value="precio_asc">Menor precio</option><option value="precio_desc">Mayor precio</option><option value="vendidos">Más vendidos</option><option value="nuevos">Nuevos</option></select></label>
    </div>
    <div className="catalog-body">
      <aside className={`filters ${showFilters ? 'open' : ''}`} id="filtros" aria-label="Filtros de productos">
        <div className="filter-title"><h2>Filtros</h2><SlidersHorizontal size={17} /></div>
        {facetControls.map(([key, label, facet]) => <label key={key}>{label}<select value={filters[key] ?? ''} onChange={event => change(key, event.target.value)}><option value="">Todas las opciones</option>{data.facets[facet].map(value => <option key={value}>{value}</option>)}</select></label>)}
        <label>Precio máximo <span>{currency(Number(filters.maxPrecio || 500000))}</span><input type="range" aria-label="Precio máximo" min="100000" max="500000" step="10000" value={filters.maxPrecio || 500000} onChange={event => change('maxPrecio', event.target.value)} /></label>
        <label>Disponibilidad<select value={filters.disponibilidad ?? ''} onChange={event => change('disponibilidad', event.target.value)}><option value="">Todos los productos</option><option value="disponible">Disponibles</option><option value="agotado">Agotados</option></select></label>
        {activeFilters > 0 && <button className="reset-filters" onClick={() => setFilters({})}>Limpiar filtros <X size={15} /></button>}
      </aside>
      <section className={`catalog-results ${loading ? 'loading' : ''}`} aria-busy={loading} aria-label="Resultados del catálogo">
        {error ? <div className="error-box" role="alert">{error}<button onClick={() => setFilters({ ...filters })}>Reintentar</button></div> : data.products.length === 0 ? <div className="empty-state"><Search size={35} /><h2>No encontramos esa fragancia.</h2><p>Prueba otra marca, un código o elimina algunos filtros.</p><button className="button outline" onClick={() => setFilters({})}>Ver todos los perfumes</button></div> : <div className="product-grid">{data.products.map(product => <ProductCard key={product.code} product={product} />)}</div>}
        {data.pages > 1 && <div className="pagination"><button disabled={data.page <= 1} onClick={() => setFilters(current => ({ ...current, page: String(data.page - 1) }))}><ArrowLeft size={16} />Anterior</button><span>{data.page} / {data.pages}</span><button disabled={data.page >= data.pages} onClick={() => setFilters(current => ({ ...current, page: String(data.page + 1) }))}>Siguiente<ArrowRight size={16} /></button></div>}
      </section>
    </div>
  </main>;
}
