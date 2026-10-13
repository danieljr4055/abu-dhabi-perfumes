'use client';

import Link from '@/src/components/StoreLink';
import { ArrowUpRight, Plus } from 'lucide-react';
import { currency } from '../config/store';
import type { Product } from '../lib/types';
import { useCart } from './StoreProvider';

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const discount = product.oldPrice && product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const productName = `${product.brand} ${product.name}`;

  return <article className="product-card" title={productName}>
    <Link className="product-photo" href={`/producto/${product.code}`} aria-label={`Ver producto ${product.name}`}>
      <img src={product.images[0]} alt={`${productName}, imagen ilustrativa`} loading="lazy" width="395" height="800" />
      {product.images[1] && <img className="product-alternate" src={product.images[1]} alt="" loading="lazy" width="395" height="800" />}
      {(!product.available || discount > 0) && <span className={`tag ${!product.available ? 'out' : ''}`}>{!product.available ? 'Agotado' : `−${discount}%`}</span>}
      <span className="photo-action">Ver producto <ArrowUpRight size={16} /></span>
    </Link>
    <div className="product-caption">
      <div>
        <span className="product-brand">{product.brand}</span>
        <Link href={`/producto/${product.code}`} title={productName}><h3>{product.name}</h3></Link>
        <div className="price-line"><strong>{product.priceKnown===false?'Por confirmar':currency(product.price)}</strong>{discount > 0 && <del>{currency(product.oldPrice!)}</del>}</div>
      </div>
      <button className="product-add" onClick={() => add(product)} disabled={!product.available} aria-label={`Agregar ${product.name} al carrito`} title={product.available ? `Agregar ${product.name}` : `${product.name} está agotado`}><Plus size={20} /></button>
    </div>
  </article>;
}
