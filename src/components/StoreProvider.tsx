'use client';
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import type { Product } from '../lib/types';
import { cartKey } from '../lib/cart';
import type { StoreSettings,PaymentMethod } from '../lib/commerce-types';
import { INVENTORY } from '../config/store';
import { toast,Toaster } from 'sonner';
type Line={product:Product;quantity:number};
type Context={lines:Line[];ready:boolean;add:(p:Product,q?:number)=>boolean;update:(code:string,q:number)=>void;clear:()=>void;refresh:()=>Promise<void>};
const Store=createContext<{settings:StoreSettings|null;payments:PaymentMethod[]}>({settings:null,payments:[]});
export function useStore(){return useContext(Store);}
const Cart=createContext<Context|null>(null);
export function useCart(){return useContext(Cart)!;}
export async function api<T=any>(url:string,options:RequestInit={}):Promise<T>{const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});const data:any=await response.json();if(!response.ok)throw Object.assign(new Error(data.error??'No pudimos cargar la información.'),{status:response.status});return data as T;}
export function StoreProvider({children}:{children:ReactNode}){const [store,setStore]=useState<{settings:StoreSettings|null;payments:PaymentMethod[]}>({settings:null,payments:[]}); useEffect(()=>{api<{settings:StoreSettings;payments:PaymentMethod[]}>('/api/store').then(setStore).catch(()=>{});},[]); const [lines,setLines]=useState<Line[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('abu-dhabi-cart')??'[]');if(Array.isArray(saved))setLines(saved.filter(x=>x?.product?.code&&Number.isInteger(x.quantity)&&x.quantity>0).slice(0,50));}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready)localStorage.setItem('abu-dhabi-cart',JSON.stringify(lines));},[lines,ready]);
 function add(p:Product,q=1){const current=lines.find(l=>cartKey(l.product)===cartKey(p))?.quantity??0;if(!p.variantId||p.priceKnown===false||q<1||current+q>Math.min(p.available,INVENTORY.maxQuantityPerItem)){toast.error('No hay más unidades disponibles para agregar.');return false;}setLines(old=>{const found=old.find(l=>cartKey(l.product)===cartKey(p));return found?old.map(l=>cartKey(l.product)===cartKey(p)?{product:p,quantity:l.quantity+q}:l):[...old,{product:p,quantity:q}];});toast.success(`${p.brand} ${p.name} agregado al carrito.`);return true;}
 function update(code:string,q:number){setLines(old=>old.flatMap(l=>cartKey(l.product)!==code?[l]:q<=0?[]:[{...l,quantity:Math.min(Math.max(1,q),INVENTORY.maxQuantityPerItem)}]));}
 async function refresh(){const resolved=await Promise.all(lines.map(async l=>{try{const p=await api<any>('/api/products/'+l.product.code);const v=l.product.variantId?p.variants.find((v:any)=>v.id===l.product.variantId):p.variants.length===1?p.variants[0]:null;if(!v)return {...l,product:{...l.product,available:0}};return {...l,product:{...p,variantId:v.id,sku:v.sku,kind:v.kind,size:v.sizeMl+' ml · '+v.kind,price:v.price??0,oldPrice:v.oldPrice,priceKnown:v.price!==null,available:v.available}};}catch(e){if((e as {status?:number}).status===404)return {...l,product:{...l.product,available:0}};throw e;}}));setLines(resolved);}
 useEffect(()=>{const context=(document as any).modelContext;if(!context?.registerTool)return;const life=new AbortController();Promise.resolve(context.registerTool({name:'search_perfumes',title:'Buscar perfumes',description:'Consulta el catálogo público por nombre, marca o código.',inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:async(input:any)=>{if(typeof input.query!=='string'||input.query.length>120)throw new Error('Consulta inválida');return api('/api/products?q='+encodeURIComponent(input.query));}},{signal:life.signal})).catch(()=>{});return()=>life.abort();},[]);
 return <Store.Provider value={store}><Cart.Provider value={{lines,ready,add,update,clear:()=>setLines([]),refresh}}>{children}<Toaster richColors position="bottom-center"/></Cart.Provider></Store.Provider>;
}
