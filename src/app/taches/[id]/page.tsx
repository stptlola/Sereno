import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Bouton, classeChamp } from "@/components/ui";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { modifierTache, retirerTache } from "../../actions/taches";
import { ChampsTache } from "../champs";

export const metadata: Metadata = { title: "Tâche · Sereno" };
export const dynamic = "force-dynamic";

const STATUTS = [
  { valeur: "A_FAIRE", libelle: "À faire" },
  { valeur: "EN_COURS", libelle: "En cours" },
  { valeur: "FAIT", libelle: "Fait" },
] as const;

export default async function PageTache({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { mariage } = await accesEcriture();
  const tache = await db.task.findFirst({ where: { id, weddingId: mariage.id, witnessOnly: false }, include: { template: true } });
  if (!tache) notFound();
  const temoins = await db.member.findMany({ where: { weddingId: mariage.id, role: "TEMOIN" }, select: { user: { select: { name: true } } } });
  const responsables = [mariage.partner1Name, mariage.partner2Name, "Nous deux", ...temoins.map((t) => t.user.name), "Les témoins"].filter((r): r is string => Boolean(r));
  const personnelle = !tache.templateId;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation />
      <Link href="/planning" className="text-sm text-bronze underline">
        ← Retour au planning
      </Link>
      <form action={modifierTache} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={tache.id} />
        <div className="flex flex-col gap-2">
          <p className="text-sm text-bronze">{tache.category}</p>
          {personnelle ? (
            <input name="title" defaultValue={tache.title} required maxLength={160} aria-label="Titre de la tâche" className={`${classeChamp} font-display text-2xl`} />
          ) : (
            <h1 className="font-display text-3xl">{tache.title}</h1>
          )}
          {tache.template?.repere === "LEGAL" && <p className="text-sm font-semibold text-bronze">Démarche administrative</p>}
        </div>
        {tache.tip && <p className="rounded-md bg-surface-soft p-4 text-ink">{tache.tip}</p>}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Où en êtes-vous ?</legend>
          <div className="flex flex-wrap gap-2">
            {STATUTS.map((s) => (
              <label key={s.valeur} className="cursor-pointer">
                <input type="radio" name="status" value={s.valeur} defaultChecked={tache.status === s.valeur} className="peer sr-only" />
                <span className="inline-block rounded-full border border-line bg-surface-raised px-4 py-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface peer-focus-visible:outline-2 peer-focus-visible:outline-or">
                  {s.libelle}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <ChampsTache responsables={responsables} valeurs={tache} />
        {tache.autoCompleted && <p className="text-sm text-ink-muted">Cochée d’office : vous aviez indiqué que c’était déjà réservé.</p>}
        <Bouton type="submit">Enregistrer</Bouton>
      </form>
      <form action={retirerTache} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={tache.id} />
        <button type="submit" className="text-sm text-alerte underline">
          {personnelle ? "Supprimer cette tâche" : "Masquer cette tâche (vous pourrez la réafficher)"}
        </button>
      </form>
    </main>
  );
}
