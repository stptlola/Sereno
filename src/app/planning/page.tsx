import type { Metadata } from "next";
import Link from "next/link";
import { CaseTache } from "@/components/case-tache";
import { Navigation } from "@/components/navigation";
import { FrisePlanning, type VueTache } from "@/components/tableau";
import { ajouterMois, filtrer, filtresActifs, lireFiltres, normaliser, rubriqueDe } from "@/domain/planning";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { reafficherTache } from "../actions/taches";
import { BarreFiltres } from "./barre-filtres";

export const metadata: Metadata = { title: "Planning · Sereno" };
export const dynamic = "force-dynamic";

/** Le planning complet : frise par périodes, recherche et filtres, tâches masquées (M2-03 à M2-10). */
export default async function PagePlanning({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filtres = lireFiltres(await searchParams);
  const { mariage } = await accesEcriture();
  const [taches, masquees] = await Promise.all([
    db.task.findMany({
      where: { weddingId: mariage.id, hidden: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { template: { select: { repere: true } } },
    }),
    db.task.findMany({ where: { weddingId: mariage.id, hiddenByCouple: true }, orderBy: { dueDate: "asc" } }),
  ]);
  const versVue = (t: (typeof taches)[number]): VueTache => ({
    id: t.id,
    titre: t.title,
    conseil: t.tip,
    date: t.dueDate,
    faite: t.status === "FAIT",
    legale: t.template?.repere === "LEGAL",
    enCours: t.status === "EN_COURS",
    responsable: t.assignee,
    href: `/taches/${t.id}`,
  });
  const actifs = filtresActifs(filtres);
  const vues = actifs
    ? filtrer(taches.map((t) => ({ t, titre: t.title, statut: t.status, responsable: t.assignee, categorie: t.category })), filtres).map((x) => versVue(x.t))
    : taches.map(versVue);
  const responsables = [...new Set([mariage.partner1Name, mariage.partner2Name, ...taches.map((t) => t.assignee)].filter((r): r is string => Boolean(r)))];
  const rubriques = [...new Set(taches.map((t) => rubriqueDe(t.category)))].sort((a, b) => a.localeCompare(b, "fr"));
  const faites = taches.filter((t) => t.status === "FAIT").length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/planning" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Planning</h1>
          <p className="mt-1 text-ink-muted">
            {faites} tâche{faites > 1 ? "s" : ""} faite{faites > 1 ? "s" : ""} sur {taches.length}. Touchez une tâche pour l’ouvrir, la case pour la cocher.
          </p>
        </div>
        <Link href="/taches/nouvelle" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-surface">
          <span aria-hidden className="text-lg leading-none text-or">
            +
          </span>{" "}
          Ajouter une tâche
        </Link>
      </div>
      <FrisePlanning
        taches={vues}
        aujourdhui={normaliser(new Date())}
        dateMariage={mariage.date ?? ajouterMois(mariage.startDate, 12)}
        caseACocher={(t) => <CaseTache tache={t} />}
        toutOuvrir={actifs}
        avant={<BarreFiltres responsables={responsables} rubriques={rubriques} total={vues.length} />}
      />
      {masquees.length > 0 && (
        <details className="rounded-md border border-line bg-surface-raised p-4">
          <summary className="cursor-pointer text-sm font-semibold">Tâches masquées ({masquees.length})</summary>
          <ul className="mt-3 flex flex-col gap-2">
            {masquees.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">{t.title}</span>
                <form action={reafficherTache}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-bronze underline">
                    Réafficher
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
