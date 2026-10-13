export const env=new Proxy({}, {get:(_,key)=>key==='DB'?globalThis.__testDB:globalThis.__testEnv?.[key]});
