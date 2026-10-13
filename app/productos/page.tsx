import Catalog from '../../src/components/Catalog';
import { listProducts } from '../../src/server/catalog';
export const dynamic='force-dynamic';
export const metadata={title:'Colección de perfumes | Abu Dhabi Perfumes',description:'Busca por nombre, marca o código. Filtra perfumes por género, precio, familia y presentación.'};
export default async function Page(){return <Catalog initial={await listProducts(new URLSearchParams())}/>;}
