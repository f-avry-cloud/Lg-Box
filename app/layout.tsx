import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Police de l'application mobile, et d'elle seule : le back-office garde
// Geist. Instrument Sans est un peu plus étroite et plus tranchée, ce qui
// tient mieux sur un écran de téléphone couvert de chiffres — et ses
// chiffres tabulaires alignent les montants d'une ligne à l'autre.
const instrumentSans = Instrument_Sans({
  variable: "--font-suivi",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LG BOX — Gestion de self-stockage",
  description: "Back-office et espace client LG BOX.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
