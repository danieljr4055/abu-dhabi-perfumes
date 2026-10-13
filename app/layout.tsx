import type { Metadata } from "next";
import "./tokens.css";
import "./fonts.css";
import "./globals.css";
import "./store.css";
import "./commerce.css";
import "./advisor.css";
import "./discovery.css";
import { StoreProvider } from '../src/components/StoreProvider';
import StoreShell from '../src/components/StoreShell';

export const metadata: Metadata = {
  title: "Abu Dhabi Perfumes | Perfumería en Cartago",
  description: "Explora perfumes para hombre y mujer. Elige tu fragancia, prepara tu pedido y recibe asesoría personalizada por WhatsApp.",
  openGraph: { title: "Abu Dhabi Perfumes", description: "Perfumes, atención personal y pedidos por WhatsApp en Cartago.", locale: "es_CO", type: "website" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body><StoreProvider><StoreShell>{children}</StoreShell></StoreProvider></body>
    </html>
  );
}
