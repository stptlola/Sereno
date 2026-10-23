import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700"], variable: "--font-bricolage" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Sereno · Votre mariage, l’esprit léger",
  description:
    "Sereno accompagne pas à pas les couples qui organisent leur mariage eux-mêmes : planning qui s’adapte à votre date, budget, invités. Gratuit pour commencer.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${figtree.variable}`}>
      <body className="bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
