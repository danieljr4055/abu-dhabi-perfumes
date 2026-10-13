import {scryptSync,pbkdf2Sync,timingSafeEqual,randomBytes} from 'node:crypto';
const options={N:32768,r:8,p:3,maxmem:64*1024*1024};
export async function hashPassword(password:string,salt=randomBytes(16).toString('hex')){
 return 'scrypt:32768:8:3:'+salt+':'+scryptSync(password,salt,32,options).toString('hex');
}
export async function verifyPassword(password:string,encoded:string){
 const modern=/^scrypt:32768:8:3:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(encoded);
 const legacy=/^([a-f0-9]{32}):([a-f0-9]{64})$/.exec(encoded);
 const parsed=modern??legacy;if(!parsed)return false;
 const actual=modern?scryptSync(password,parsed[1],32,options):pbkdf2Sync(password,parsed[1],100000,32,'sha256');
 return timingSafeEqual(actual,Buffer.from(parsed[2],'hex'));
}
