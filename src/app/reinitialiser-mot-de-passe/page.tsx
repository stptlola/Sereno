import type { Metadata } from "next";
import { PageCompte } from "@/components/ui";
import { FormulaireReinitialisation } from "./formulaire";

export const metadata: Metadata = { title: "Nouveau mot de passe · Sereno" };

export default async function PageReinitialisation({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await searchParams;
  return (
    <PageCompte titre="Choisir un nouveau mot de passe">
      <FormulaireReinitialisation jeton={typeof token === "string" ? token : null} />
    </PageCompte>
  );
}
