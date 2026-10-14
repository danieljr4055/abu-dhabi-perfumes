export function startSheetPoller({port,origin,token,intervalMs=60000,fetcher=fetch}){
 let running=false,stopped=false;
 const run=async()=>{
  if(running||stopped)return;running=true;
  try{
   const response=await fetcher('http://127.0.0.1:'+port+'/api/internal/sheet-import',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-store-sync-token':token},body:'{}',redirect:'error',signal:AbortSignal.timeout(120000)});
   if(!response.ok)console.error('La importación de Sheets no se completó. Consulta su estado en el panel.');
  }catch{console.error('No se pudo ejecutar la importación de Sheets. Se reintentará en el próximo ciclo.');}
  finally{running=false;}
 };
 const timer=setInterval(run,intervalMs);timer.unref();void run();
 return()=>{stopped=true;clearInterval(timer);};
}
