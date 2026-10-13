'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
export function useConfirmation(){
 const [message,setMessage]=useState<string|null>(null);
 const resolve=useRef<((accepted:boolean)=>void)|null>(null);
 const focus=useRef<HTMLElement|null>(null);
 const box=useRef<HTMLDivElement>(null);
 const id=useId();
 const finish=useCallback((accepted:boolean)=>{resolve.current?.(accepted);resolve.current=null;setMessage(null);focus.current?.focus();},[]);
 const ask=useCallback((text:string)=>new Promise<boolean>(done=>{
  resolve.current?.(false);focus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  resolve.current=done;setMessage(text);
 }),[]);
 useEffect(()=>{if(message)box.current?.querySelector<HTMLButtonElement>('button')?.focus();},[message]);
 useEffect(()=>()=>{resolve.current?.(false);resolve.current=null;},[]);
 const confirmation=message?<div className="confirmation-backdrop"><div className="confirmation-box" role="alertdialog" aria-modal="true" aria-labelledby={id} ref={box} onKeyDown={event=>{
  if(event.key==='Escape'){event.preventDefault();finish(false);}
  if(event.key==='Tab'){const buttons=box.current?.querySelectorAll('button');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 }}><h2 id={id}>Confirmar acción</h2><p>{message}</p><div className="editor-actions"><button type="button" className="button outline" onClick={()=>finish(false)}>Cancelar</button><button type="button" className="button" onClick={()=>finish(true)}>Confirmar</button></div></div></div>:null;
 return {ask,confirmation};
}
