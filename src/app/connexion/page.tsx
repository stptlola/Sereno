import type { Metadata } from "next";
import { PageCompte, retourSur } from "@/components/ui";
import { fournisseursSociaux } from "@/lib/auth";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Se connecter · Sereno" };
export const dynamic = "force-dynamic";

export default async function PageConnexion({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { google, apple } = fournisseursSociaux();
  return (
    <PageCompte titre="Content de vous revoir">
      <FormulaireConnexion retour={retourSur(params.retour)} google={google} apple={apple} />
    </PageCompte>
  );
}
