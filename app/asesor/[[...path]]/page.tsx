import { redirect } from 'next/navigation';
import { currentUser } from '../../../src/server/security';
import AdvisorLogin from '../../../src/components/AdvisorLogin';
import AdvisorApp from '../../../src/components/AdvisorApp';
export const dynamic='force-dynamic';
export const metadata={title:'Panel de asesores | Abu Dhabi Perfumes',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{path?:string[]}>}){const {path=[]}=await params;if(path[0]==='login')return <AdvisorLogin/>;const user=await currentUser();if(!user)redirect('/asesor/login');if(['comercio','usuarios'].includes(path[0])&&user.role!=='admin')redirect('/asesor');return <AdvisorApp path={path} user={user}/>;}
