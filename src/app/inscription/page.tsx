import type { Metadata } from "next";
import { PageCompte, retourSur } from "@/components/ui";
import { fournisseursSociaux } from "@/lib/auth";
import { FormulaireInscription } from "./formulaire";

export const metadata: Metadata = { title: "Créer mon compte · Sereno" };
export const dynamic = "force-dynamic";

export default async function PageInscription({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { google, apple } = fournisseursSociaux();
  return (
    <PageCompte
      titre="Sauvegarder mon planning"
      sousTitre="Un compte pour retrouver votre organisation sur tous vos appareils, et l’ouvrir à votre partenaire."
    >
      <FormulaireInscription retour={retourSur(params.retour, "/bienvenue")} google={google} apple={apple} />
    </PageCompte>
  );
}
