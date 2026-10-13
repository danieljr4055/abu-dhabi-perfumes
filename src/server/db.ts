import { env } from 'cloudflare:workers';
export function db():D1Database {if(!env.DB)throw new Error('La base de datos no está disponible.');return env.DB;}
export const statement=(sql:string,...args:unknown[])=>db().prepare(sql).bind(...args);
export async function one<T=any>(sql:string,...args:unknown[]):Promise<T|null>{return statement(sql,...args).first<T>();}
export async function all<T=any>(sql:string,...args:unknown[]):Promise<T[]>{return (await statement(sql,...args).all<T>()).results;}
