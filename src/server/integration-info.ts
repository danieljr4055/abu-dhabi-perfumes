import {env} from 'cloudflare:workers';
import {all} from './db';
export function authProviders(){
 const config=env as unknown as Record<string,string>;
 return {googleEnabled:!!config.GOOGLE_CLIENT_ID};
}
export async function integrationInfo(){
 const config=env as unknown as Record<string,string>;
 return {...authProviders(),sheetImportEnabled:config.SHEETS_IMPORT_ENABLED==='true',sheetsConfigured:!!(config.GOOGLE_SERVICE_ACCOUNT_EMAIL&&config.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY&&config.GOOGLE_SPREADSHEET_ID),
  identities:await all("SELECT u.id,u.name,u.username,u.role,u.active,g.email,g.active googleActive,(g.google_sub IS NOT NULL) linked FROM users u LEFT JOIN google_identities g ON g.user_id=u.id ORDER BY u.name")};
}
