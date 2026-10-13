'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {api} from '../StoreProvider';
import {toast} from 'sonner';
import {useConfirmation} from './useConfirmation';
type Identity={id:number;name:string;username:string;role:string;email:string|null;googleActive:number|null;linked:number;active:number};
type Info={googleEnabled:boolean;sheetsConfigured:boolean;identities:Identity[]};
type Pending={sku:string;name:string;variant_id:number;revision:number;synced_revision:number;attempts:number;last_error:string|null};
export default function IntegrationSettings({currentUserId}:{currentUserId:number}){
 const {ask,confirmation}=useConfirmation();
 const [info,setInfo]=useState<Info|null>(null),[pending,setPending]=useState<Pending[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [userId,setUserId]=useState(''),[email,setEmail]=useState(''),[active,setActive]=useState(true);
 async function refresh(){const [config,rows]=await Promise.all([api<Info>('/api/admin/integrations'),api<Pending[]>('/api/admin/sheets')]);setInfo(config);setPending(rows);}
 useEffect(()=>{let live=true;Promise.all([api<Info>('/api/admin/integrations'),api<Pending[]>('/api/admin/sheets')]).then(([config,rows])=>{if(live){setInfo(config);setPending(rows);}}).catch(e=>live&&setError(e.message));return()=>{live=false};},[]);
 function select(id:string){setUserId(id);const identity=info?.identities.find(u=>u.id===Number(id));setEmail(identity?.email??'');setActive(identity?.googleActive!==0);}
 async function save(event:FormEvent){
  event.preventDefault();if(!userId)return;
  if(!await ask(active?'¿Autorizar esta cuenta Google? Las sesiones del usuario se cerrarán.':'¿Revocar el acceso Google y cerrar las sesiones del usuario?'))return;
  setBusy(true);setError('');
  try{


   await api('/api/admin/google-identities',{method:'POST',body:JSON.stringify({userId:Number(userId),email:email.trim(),active})});
   toast.success(active?'Cuenta autorizada.':'Acceso revocado.');
   if(Number(userId)===currentUserId){window.location.assign('/asesor/login');return;}
   await refresh();
  }catch(cause){setError((cause as Error).message);}finally{setBusy(false);}
 }
 async function revoke(identity:Identity){
  if(!await ask('¿Revocar el acceso de '+identity.name+' y cerrar sus sesiones?'))return;
  setBusy(true);setError('');
  try{await api('/api/admin/google-identities',{method:'POST',body:JSON.stringify({userId:identity.id,email:identity.email,active:false})});await refresh();toast.success('Acceso revocado.');}
  catch(cause){setError((cause as Error).message);}finally{setBusy(false);}
 }
 async function sync(){
  setBusy(true);setError('');
  try{const result=await api<{synced:number}>('/api/admin/sheets',{method:'POST',body:'{}'});await refresh();toast.success(result.synced?'Se sincronizaron '+result.synced+' presentaciones.':'No hay cambios listos para sincronizar.');}
  catch(cause){setError((cause as Error).message);await refresh().catch(()=>{});}finally{setBusy(false);}
 }
 if(!info)return <div role="status">{error?<p className="error-box">{error}</p>:'Cargando accesos y sincronización…'}</div>;
 return <div className="integration-settings">{confirmation}
  {error&&<p className="error-box" role="alert">{error}</p>}
  <section className="editor-form"><div className="integration-heading"><div><h2>Copia en Google Sheets</h2><p>Los productos se guardan en la tienda. Sheets recibe una copia privada al sincronizar.</p></div><span className="publication-badge">{info.sheetsConfigured?'Conexión configurada':'Configuración pendiente'}</span></div>
   {!info.sheetsConfigured&&<p className="muted">Todavía no hay una conexión configurada. Los cambios permanecen guardados y pendientes de copiar.</p>}
   <p>{pending.length?pending.length+' presentaciones pendientes en este lote.':'No hay cambios pendientes.'}</p>
   <div className="editor-actions"><button type="button" className="button" disabled={busy||!info.sheetsConfigured} onClick={sync}>{busy?'Procesando…':'Sincronizar ahora'}</button><button type="button" disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}>Actualizar estado</button></div>
   {pending.length>0&&<div className="sync-list">{pending.map(row=><div key={row.variant_id}><strong>{row.sku}<small>{row.name}</small></strong><span>{row.last_error??'Pendiente de enviar'}</span><small>{row.attempts?'Intentos: '+row.attempts:'Sin intentos'}</small></div>)}</div>}
   <p className="small muted">La sincronización es manual por ahora. La hoja puede tardar en actualizarse si hay un error de conexión.</p>
  </section>
  <section className="editor-form"><h2>Cuentas autorizadas con Google</h2><p>{info.googleEnabled?'El acceso Google está habilitado.':'El acceso Google está pendiente de configuración.'} Autorizar una cuenta conserva el rol que ya tiene el usuario.</p>
   <div className="identity-list">{info.identities.map(u=><div key={u.id}><div><strong>{u.name}</strong><small>{u.role==='admin'?'Administrador':'Asesor'} · {u.email??'Sin cuenta Google'}</small></div><span className="publication-badge">{u.googleActive===0?'Revocado':u.email?(u.linked?'Vinculado':'Autorizado'):'Sin configurar'}</span>{u.email&&u.googleActive!==0&&u.id!==currentUserId&&<button type="button" disabled={busy} onClick={()=>revoke(u)}>Revocar</button>}</div>)}</div>
   <form onSubmit={save}><div className="form-grid"><label>Usuario del equipo<select required value={userId} onChange={e=>select(e.target.value)}><option value="">Seleccionar usuario</option>{info.identities.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name} · {u.role==='admin'?'Administrador':'Asesor'}</option>)}</select></label><label>Correo Google autorizado<input required type="email" readOnly={!!info.identities.find(u=>u.id===Number(userId))?.linked} autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label></div>
    <label className="check-label"><input type="checkbox" checked={active} disabled={Number(userId)===currentUserId} onChange={e=>setActive(e.target.checked)}/>Permitir acceso Google</label><p className="small muted">Al guardar se cerrarán las sesiones del usuario. Usa una cuenta Gmail o Google Workspace para vincularla por correo.</p><button className="button" disabled={busy||!userId}>{busy?'Guardando…':'Guardar autorización'}</button>
   </form>
  </section>
 </div>;
}
