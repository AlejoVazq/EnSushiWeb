import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";

import { CartHydrator } from "@/components/CartHydrator";
import { BUSINESS } from "@/config/business";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const title = `${BUSINESS.name} · Pedidos online`;
const description = "Armá tu combo de sushi, sushiburgers y combos de la casa. Hacé tu pedido y envialo por WhatsApp.";

export const metadata: Metadata = {
  // Absolute base for OG URLs. Without it, Next falls back to the Vercel URL (or localhost).
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: BUSINESS.name,
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas font-sans text-fg">
        <CartHydrator />
        {children}
      </body>
    </html>
  );
}
