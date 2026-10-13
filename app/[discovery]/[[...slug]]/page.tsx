import Link from '@/src/components/StoreLink';
import {notFound,permanentRedirect} from 'next/navigation';
import Catalog from '../../../src/components/Catalog';
import ProductDetail from '../../../src/components/ProductDetail';
import {listTaxonomy,taxonomyTables} from '../../../src/server/taxonomy';
import {queryCatalog,getPublishedProduct,recommendProducts} from '../../../src/server/discovery';
import {one} from '../../../src/server/db';
import type {TaxonomyKind} from '../../../src/lib/commerce-types';
export const dynamic='force-dynamic';
const routes:Record<string,{kind:TaxonomyKind;title:string;filter:string}>={marcas:{kind:'brands',title:'Las casas. Sus firmas.',filter:'marca'},notas:{kind:'notes',title:'Empieza por una nota.',filter:'nota'},familias:{kind:'families',title:'Encuentra tu familia.',filter:'familia'}};
type Props={params:Promise<{discovery:string;slug?:string[]}>};
export async function generateMetadata({params}:Props){const{discovery,slug}=await params;return{title:(slug?.[0]?.replaceAll('-',' ')??routes[discovery]?.title??'Descubre perfumes')+' | Abu Dhabi Perfumes',alternates:{canonical:'/'+discovery+(slug?.length?'/'+slug[0]:'')}};}
export default async function Page({params}:Props){
 const{discovery,slug=[]}=await params;if(slug.length>1)notFound();const key=slug[0];
 if(discovery==='perfumes'&&key){const p=await getPublishedProduct(key);if(!p){const a=await one("SELECT p.slug FROM slug_redirects r JOIN products p ON p.id=r.entity_id WHERE r.entity_kind='products' AND r.old_slug=? AND p.editorial_state='publicado'",key);if(a)permanentRedirect('/perfumes/'+a.slug);notFound();}const related=await recommendProducts(p.id);return <ProductDetail product={p} related={related.map(r=>r.product)}/>;}
 if(discovery==='decants'&&!key)return <Catalog initial={await queryCatalog(new URLSearchParams('tipo=decant'))} title="Pequeños formatos. Nuevos encuentros." lockedFilters={{tipo:'decant'}}/>;
 if(discovery==='colecciones'&&key){const c=await one('SELECT * FROM collections WHERE slug=? AND active=1',key);if(!c)notFound();return <Catalog title={c.name} initial={await queryCatalog(new URLSearchParams({coleccion:key}))} lockedFilters={{coleccion:key}}/>;}
 const route=Object.hasOwn(routes,discovery)?routes[discovery]:undefined;if(!route)notFound();const entries=(await listTaxonomy(route.kind)).filter(t=>t.active);
 if(!key)return <main className="container discovery-index"><span className="eyebrow">EL ARTE DE ELEGIR</span><h1>{route.title}</h1><p>Deja que tu curiosidad te guíe.</p><div className="discovery-links">{entries.map((e,i)=><Link href={'/'+discovery+'/'+e.slug} key={e.id}><small>{String(i+1).padStart(2,'0')}</small><span>{e.name}</span><span>↗</span></Link>)}</div>{!entries.length&&<p>Estamos preparando esta selección. Nuestro equipo puede ayudarte a encontrar tu aroma.</p>}<Link className="underlink" href={discovery==='familias'?'/notas':'/familias'}>Explorar {discovery==='familias'?'notas':'familias olfativas'} ↗</Link></main>;
 const entity=entries.find(t=>t.slug===key);if(!entity){const a=await one(`SELECT t.slug FROM slug_redirects r JOIN ${taxonomyTables[route.kind]} t ON t.id=r.entity_id WHERE r.entity_kind=? AND r.old_slug=? AND t.active=1`,route.kind,key);if(a)permanentRedirect('/'+discovery+'/'+a.slug);notFound();}
 const family=route.kind==='notes'&&entity.familyId?await one('SELECT name,slug FROM olfactory_families WHERE id=? AND active=1',entity.familyId):null;
 return <>{family&&<div className="container discovery-parent"><Link href={'/familias/'+family.slug}>Familia {family.name} ↗</Link></div>}<Catalog title={entity.name} lockedFilters={{[route.filter]:key}} initial={await queryCatalog(new URLSearchParams({[route.filter]:key}))}/></>;
}
