import type {AnchorHTMLAttributes} from 'react';
// Native navigation avoids a broken production RSC navigation export in
// the installed Vinext beta. The cart is persisted before leaving the page.
export default function StoreLink(props:AnchorHTMLAttributes<HTMLAnchorElement>){
  return <a {...props}/>;
}
