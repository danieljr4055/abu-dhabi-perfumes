import { randomBytes,scryptSync } from 'node:crypto';
import { writeFile,access } from 'node:fs/promises';
try{await access('.dev.vars');console.log('La configuración privada ya existe; no se ha reemplazado.');process.exit(0);}catch{}
const username='administrador',password=randomBytes(18).toString('base64url');
const salt=randomBytes(16).toString('hex');const hash='scrypt:32768:8:3:'+salt+':'+scryptSync(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');
await writeFile('.dev.vars',`ADMIN_USERNAME=${username}\nADMIN_PASSWORD_HASH=${hash}\n`);
await writeFile('ACCESO-PRIVADO.txt',`ABU DHABI PERFUMES — ACCESO PRIVADO\nRuta: /asesor/login\nUsuario: ${username}\nContraseña: ${password}\n\nConserva este archivo en un lugar privado. Está excluido del repositorio y del despliegue.\n`);
console.log('Credenciales generadas en ACCESO-PRIVADO.txt (excluido de publicación).');
