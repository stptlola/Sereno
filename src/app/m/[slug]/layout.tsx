import type { Metadata } from "next";

// Les mini-sites sont privés : jamais indexés par les moteurs de recherche.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return children;
}
