'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from './StoreProvider';
type GoogleIdentity={initialize:(options:{client_id:string;nonce:string;callback:(value:{credential:string})=>void;auto_select:boolean})=>void;renderButton:(node:HTMLElement,options:{theme:string;size:string;text:string;width:number})=>void};
type GoogleWindow=Window & {google?:{accounts:{id:GoogleIdentity}}};
let scriptPromise:Promise<GoogleIdentity>|null=null;
function loadGoogle(){
 const get=()=> (window as GoogleWindow).google?.accounts.id;
 if(get())return Promise.resolve(get()!);
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise<GoogleIdentity>((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  const timer=setTimeout(()=>{script.remove();reject(new Error('No se pudo cargar el acceso con Google. Reintenta.'));},12000);
  script.onload=()=>{clearTimeout(timer);if(get())resolve(get()!);else reject(new Error('No se pudo cargar Google.'));};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('No se pudo conectar con Google.'));};
  document.head.appendChild(script);
 }).catch(error=>{scriptPromise=null;throw error;});
 return scriptPromise;
}
export default function GoogleAccess(){
 const mount=useRef<HTMLDivElement>(null);
 const [mode,setMode]=useState<'loading'|'ready'|'off'|'error'|'signing'>('loading');
 const [error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let live=true;
  async function prepare(){
   setMode('loading');setError('');
   try{
    const providers=await api<{googleEnabled:boolean}>('/api/auth/providers');
    if(!live)return;if(!providers.googleEnabled){setMode('off');return;}
    const challenge=await api<{clientId:string;nonce:string}>('/api/auth/google/challenge',{method:'POST',body:'{}'});
    const identity=await loadGoogle();
    if(!live||!mount.current)return;
    identity.initialize({client_id:challenge.clientId,nonce:challenge.nonce,auto_select:false,callback:async({credential})=>{
     if(!live)return;setMode('signing');
     try{await api('/api/auth/google',{method:'POST',body:JSON.stringify({credential})});window.location.assign('/asesor');}
     catch(cause){if(live){setError((cause as Error).message);setMode('error');}}
    }});
    mount.current.replaceChildren();identity.renderButton(mount.current,{theme:'outline',size:'large',text:'continue_with',width:280});setMode('ready');
   }catch(cause){if(live){setError((cause as Error).message);setMode('error');}}
  }
  void prepare();return()=>{live=false;};
 },[attempt]);
 return <div className="google-access" aria-busy={mode==='loading'||mode==='signing'}>
  <div ref={mount} hidden={mode!=='ready'}/>
  {mode==='loading'&&<p className="small muted" role="status">Comprobando acceso con Google…</p>}
  {mode==='signing'&&<p role="status">Verificando tu cuenta…</p>}
  {mode==='off'&&<p className="small muted">El acceso con Google está pendiente de configuración. Puedes ingresar con tu cuenta del equipo.</p>}
  {mode==='error'&&<><p className="error-box" role="alert">{error}</p><button type="button" className="button outline" onClick={()=>setAttempt(v=>v+1)}>Reintentar acceso con Google</button></>}
  {mode==='ready'&&<p className="small muted">Solo las cuentas autorizadas por la perfumería pueden acceder.</p>}
 </div>;
}
