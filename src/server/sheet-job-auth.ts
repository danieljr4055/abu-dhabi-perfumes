import {env} from 'cloudflare:workers';
import {timingSafeEqual} from 'node:crypto';
export function isSheetJob(request:Request){
 const config=env as unknown as Record<string,string>;
 if(config.SHEETS_IMPORT_ENABLED!=='true')return false;
 const expected=config.SHEETS_SYNC_TOKEN??'',received=request.headers.get('x-store-sync-token')??'';
 if(!/^[a-f0-9]{64}$/.test(expected)||!/^[a-f0-9]{64}$/.test(received))return false;
 return timingSafeEqual(Buffer.from(received),Buffer.from(expected));
}
