import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { accesEcriture } from "@/lib/acces";
import { Deconnexion } from "../tableau-de-bord/deconnexion";
import { FormulaireParametres } from "./formulaire";

export const metadata: Metadata = { title: "Paramètres · Sereno" };
export const dynamic = "force-dynamic";

export default async function PageParametres() {
  const { mariage } = await accesEcriture();
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 pt-0 pb-24">
      <Navigation actif="/parametres" />
      <div>
        <h1 className="font-display text-3xl">Votre mariage</h1>
        <p className="mt-1 text-ink-muted">Ces informations personnalisent votre planning. Modifiez-les quand vous voulez.</p>
      </div>
      <FormulaireParametres
        valeurs={{
          partner1Name: mariage.partner1Name,
          partner2Name: mariage.partner2Name ?? "",
          date: mariage.date ? mariage.date.toISOString().slice(0, 10) : "",
          budget: mariage.budgetTotalCents ? String(Math.round(mariage.budgetTotalCents / 100)) : "",
          invites: mariage.estimatedGuests ? String(mariage.estimatedGuests) : "",
          ceremonies: mariage.ceremonies,
          culte: mariage.religion ?? "",
        }}
      />
      <section className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="font-semibold">Mon compte</h2>
        <Deconnexion />
      </section>
    </main>
  );
}
