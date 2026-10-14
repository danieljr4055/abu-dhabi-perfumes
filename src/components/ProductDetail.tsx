'use client';

import Link from '@/src/components/StoreLink';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, MessageCircle, Minus, Package, Plus, X, ZoomIn } from 'lucide-react';
import { currency } from '../config/store';
import { whatsappUrl } from '../lib/domain';
import type { Product } from '../lib/types';
import { api, useCart, useStore } from './StoreProvider';
import ProductCard from './ProductCard';
import type { publicProduct } from '../server/public-product';

function ProductGallery({ product, selected, onSelect, onZoom }: { product: Product; selected: number; onSelect: (index: number) => void; onZoom: () => void }) {
  return <div className="gallery">
    <button className="main-photo" onClick={onZoom} aria-label="Ampliar imagen"><img src={product.images[selected]} alt={`${product.brand} ${product.name}, vista ilustrativa ${selected + 1}`} /><ZoomIn size={22} /></button>
    <div className="thumbnails" aria-label="Galería del producto">{product.images.map((source, index) => <button key={`${source}-${index}`} aria-label={`Ver imagen ${index + 1}`} aria-pressed={selected === index} onClick={() => onSelect(index)}><img src={source} alt={`Vista ${index + 1}`} loading="lazy" /></button>)}</div>
    <p className="muted small">Imágenes ilustrativas de catálogo. Consulta la presentación real con tu asesor.</p>
  </div>;
}

function PurchasePanel({ product, quantity, setQuantity, add }: { product: Product; quantity: number; setQuantity: (quantity: number) => void; add: () => void }) {
  const {settings}=useStore();
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;
  return <div className="product-info">
    <span className="eyebrow">{product.brand}</span>
    <h1>{product.name}</h1>
    <div className="detail-tags"><span>{product.gender}</span><span>{product.category}</span><span>{product.size}</span></div>
    <p className="product-code">CÓDIGO · {product.code}</p>
    <div className="detail-price"><strong>{product.priceKnown===false?'Por confirmar':currency(product.price)}</strong>{hasDiscount && <><del>{currency(product.oldPrice!)}</del><span>−{Math.round((1 - product.price / product.oldPrice!) * 100)}%</span></>}</div>
    <p>{product.description}</p>
    <div className="availability"><span className={`status-dot ${!product.available ? 'empty' : ''}`} />{product.available ? `Disponible · ${product.available} unidades` : 'Agotado temporalmente'}</div>
    <div className="purchase-controls">
      <div className="quantity"><button aria-label="Reducir cantidad" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus size={16} /></button><output aria-label="Cantidad">{quantity}</output><button aria-label="Aumentar cantidad" disabled={quantity >= Math.min(product.available, 20)} onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button></div>
      <button className="button" onClick={add} disabled={!product.available}>{product.available ? 'Agregar al carrito' : 'Agotado'}<ArrowRight size={18} /></button>
    </div>
    <div className="purchase-notes"><p><Package size={18} />Envío por confirmar con tu asesor.</p><a href={whatsappUrl(`Hola, quisiera información sobre ${product.brand} ${product.name}, código ${product.code}.`,settings?.whatsappNumber)} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />¿Te ayudamos a elegir?</a></div>
  </div>;
}

export default function ProductDetail({ product:initialProduct, related }: { product: Product; related: Product[] }) {
  const [product,setProduct]=useState(initialProduct);
  useEffect(()=>{const controller=new AbortController();const timer=setInterval(()=>{if(document.visibilityState!=='visible')return;void api<Product>('/api/products/'+initialProduct.code,{signal:controller.signal}).then(setProduct).catch(()=>{});},60000);return()=>{clearInterval(timer);controller.abort();};},[initialProduct.code]);
  const full=product as unknown as ReturnType<typeof publicProduct>;
  const [variant,setVariant]=useState(product.variantId);
  const v=full.variants?.find(v=>v.id===variant);
  const selectedProduct:Product=v?{...product,variantId:v.id,sku:v.sku,kind:v.kind,size:v.sizeMl+' ml · '+v.kind,price:v.price??0,oldPrice:v.oldPrice,priceKnown:v.price!==null,available:v.available}:product;
  const [selected, setSelected] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const { add } = useCart();

  return <main className="container detail-page">
    <Link className="breadcrumb" href="/productos"><ArrowLeft size={15} /> La colección <span>/ {product.name}</span></Link>
    <div className="product-detail">
      <ProductGallery product={product} selected={selected} onSelect={setSelected} onZoom={() => dialog.current?.showModal()} />
      <div><label className="variant-picker">Elige tu presentación<select value={variant} onChange={e=>{setVariant(Number(e.target.value));setQuantity(1);}}>{full.variants.map(v=><option value={v.id} key={v.id}>{v.kind==='decant'?'Decant':'Frasco'} · {v.sizeMl} ml</option>)}</select></label>
      <PurchasePanel product={selectedProduct} quantity={quantity} setQuantity={setQuantity} add={() => add(selectedProduct, quantity)} /></div>
    </div>
    <section className="aroma-detail"><Link href={'/marcas/'+full.brandSlug}>Explorar {product.brand}</Link><h2>Su pirámide olfativa.</h2><div className="aroma-phases">{['salida','corazon','fondo'].map(phase=><div key={phase}><h3>{phase==='corazon'?'Corazón':phase}</h3>{full.notes?.filter(n=>n.phase===phase).map(n=><Link className="aroma-chip" href={'/notas/'+n.note?.slug} key={n.noteId}>{n.note?.name}</Link>)}</div>)}</div></section>
    <section className="related"><div className="section-heading"><div><span className="eyebrow">SIGUE DESCUBRIENDO</span><h2>Otros nombres para probar.</h2></div></div><div className="product-grid">{related.map(item => <ProductCard key={item.code} product={item} />)}</div></section>
    <dialog className="image-dialog" ref={dialog} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button className="icon-button" aria-label="Cerrar imagen ampliada" onClick={() => dialog.current?.close()}><X /></button><img src={product.images[selected]} alt={`${product.name}, imagen ampliada`} /><p>Imagen ilustrativa · {selected + 1} de {product.images.length}</p></dialog>
  </main>;
}
