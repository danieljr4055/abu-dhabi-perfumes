import {NextResponse,type NextRequest} from 'next/server';
export function middleware(request:NextRequest){
 const response=NextResponse.next();
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 response.headers.set('Content-Security-Policy',"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
 if(request.nextUrl.protocol==='https:')response.headers.set('Strict-Transport-Security','max-age=31536000');
 return response;
}
export const config={matcher:'/:path*'};
