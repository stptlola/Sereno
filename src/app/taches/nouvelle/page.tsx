import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Bouton, Champ } from "@/components/ui";
import { accesEcriture } from "@/lib/acces";
import { ajouterTache } from "../../actions/taches";
import { ChampsTache } from "../champs";

export const metadata: Metadata = { title: "Ajouter une tâche · Sereno" };
export const dynamic = "force-dynamic";

export default async function PageNouvelleTache() {
  const { mariage } = await accesEcriture();
  const responsables = [mariage.partner1Name, mariage.partner2Name, "Nous deux"].filter((r): r is string => Boolean(r));
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 pt-0 pb-28 sm:pb-24">
      <Navigation actif="/taches/nouvelle" />
      <h1 className="font-display text-3xl">Ajouter une tâche</h1>
      <form action={ajouterTache} className="flex flex-col gap-5">
        <Champ libelle="Quoi ?" id="title" name="title" required maxLength={160} placeholder="Par exemple : réserver la calèche" />
        <ChampsTache responsables={responsables} />
        <Bouton type="submit">Ajouter au planning</Bouton>
      </form>
    </main>
  );
}
