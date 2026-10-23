import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";

import { CartHydrator } from "@/components/CartHydrator";
import { BUSINESS } from "@/config/business";

import "./globals.css";

// Google's Latin slice of M PLUS Rounded 1c 700 (SIL OFL), self-hosted. Through next/font/google it also brings
// ~130 @font-face rules for its Japanese slices: ~25 KB of render-blocking CSS that the menu never uses.
const mplusRounded = localFont({
  src: "./fonts/mplus-rounded-1c-700-latin.woff2",
  weight: "700",
  style: "normal",
  variable: "--font-mplus-rounded",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
  themeColor: "#141210",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      // html has scroll-behavior: smooth (globals.css); this tells Next to turn it off while changing routes
      data-scroll-behavior="smooth"
      className={`${mplusRounded.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-sumi font-ui text-washi selection:bg-washi selection:text-sumi">
        <CartHydrator />
        {children}
      </body>
    </html>
  );
}
