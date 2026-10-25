import type { Metadata, Viewport } from "next";
import { accesEcriture } from "@/lib/acces";
import { chargerPlan } from "../donnees";
import { Editeur } from "./editeur";

export const metadata: Metadata = { title: "Modifier le plan de table · Sereno" };
export const dynamic = "force-dynamic";
// L'éditeur gère lui-même le zoom du plan : la page ne doit pas zoomer.
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default async function PageEditeur() {
  const { mariage } = await accesEcriture();
  const d = await chargerPlan(mariage.id);
  return <Editeur largeur={mariage.roomWidthCm} profondeur={mariage.roomDepthCm} tables={d.tables} elements={d.elements} aPlacer={d.aPlacer} />;
}
