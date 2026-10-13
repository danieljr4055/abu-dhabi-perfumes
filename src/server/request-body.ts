import {AppError} from '../lib/domain';
export async function readJsonBody(request:Request):Promise<Record<string,unknown>>{
 if(!(request.headers.get('content-type')??'').toLowerCase().startsWith('application/json'))
  throw new AppError('Envía los datos en formato JSON.',415);
 if(Number(request.headers.get('content-length'))>32768)throw new AppError('La solicitud es demasiado grande.',413);
 const reader=request.body?.getReader();
 if(!reader)throw new AppError('Datos no válidos.',422);
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new AppError('La solicitud es demasiado grande.',413);}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
 try{const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();return body;}
 catch{throw new AppError('Datos no válidos.',422);}
}
