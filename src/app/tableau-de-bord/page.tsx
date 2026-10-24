import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CartesChiffres, EnTeteMariage, FrisePlanning, ProchainesEtapes, type VueTache } from "@/components/tableau";
import { ajouterMois, ecartJours, filtrer, filtresActifs, lireFiltres, normaliser, rubriqueDe } from "@/domain/planning";
import { db } from "@/lib/db";
import { mariageDe, utilisateurRequis } from "@/lib/session";
import { Navigation } from "@/components/navigation";
import { basculerTache } from "../actions/mariage";
import { reafficherTache } from "../actions/taches";
import { BarreFiltres } from "./barre-filtres";
import { InvitationCopilote } from "./invitation-copilote";

export const metadata: Metadata = { title: "Tableau de bord · Sereno" };
export const dynamic = "force-dynamic";

function CaseTache({ tache }: { tache: VueTache }) {
  return (
    <form action={basculerTache} className="shrink-0">
      <input type="hidden" name="id" value={tache.id} />
      <button
        type="submit"
        aria-label={tache.faite ? `Rouvrir : ${tache.titre}` : `Marquer comme faite : ${tache.titre}${tache.enCours ? " (en cours)" : ""}`}
        className={`flex h-6 w-6 items-center justify-center rounded-sm border-2 ${
          tache.faite ? "border-ink bg-ink text-surface" : tache.enCours ? "border-or bg-surface-raised" : "border-line bg-surface-raised hover:border-or"
        }`}
      >
        {tache.faite && "✓"}
        {!tache.faite && tache.enCours && <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-or" />}
      </button>
    </form>
  );
}

export default async function TableauDeBord({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filtres = lireFiltres(await searchParams);
  const user = await utilisateurRequis("/tableau-de-bord");
  const acces = await mariageDe(user.id);
  if (!acces) redirect("/commencer");
  const { mariage, role } = acces;

  const [taches, postes, copilote, masquees] = await Promise.all([
    db.task.findMany({
      where: { weddingId: mariage.id, hidden: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { template: { select: { repere: true } } },
    }),
    db.budgetCategory.findMany({ where: { weddingId: mariage.id }, orderBy: { order: "asc" } }),
    db.member.findFirst({ where: { weddingId: mariage.id, role: "COPILOTE" }, include: { user: true } }),
    db.task.findMany({ where: { weddingId: mariage.id, hiddenByCouple: true }, orderBy: { dueDate: "asc" } }),
  ]);

  const aujourdhui = normaliser(new Date());
  const dateMariage = mariage.date ?? ajouterMois(mariage.startDate, 12);
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
  const vues = taches.map(versVue);
  const actifs = filtresActifs(filtres);
  const filtrees = actifs
    ? filtrer(
        taches.map((t) => ({ t, titre: t.title, statut: t.status, responsable: t.assignee, categorie: t.category })),
        filtres,
      ).map((x) => versVue(x.t))
    : vues;
  const responsables = [...new Set([mariage.partner1Name, mariage.partner2Name, ...taches.map((t) => t.assignee)].filter((r): r is string => Boolean(r)))];
  const rubriques = [...new Set(taches.map((t) => rubriqueDe(t.category)))].sort((a, b) => a.localeCompare(b, "fr"));
  const caseACocher = (t: VueTache) => <CaseTache tache={t} />;
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" et ");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 pt-0 pb-24">
      <Navigation actif="/tableau-de-bord" />

      <EnTeteMariage prenoms={prenoms} jours={ecartJours(aujourdhui, dateMariage)} date={dateMariage} provisoire={mariage.date === null} />
      <CartesChiffres
        faites={vues.filter((v) => v.faite).length}
        total={vues.length}
        budgetCentimes={mariage.budgetTotalCents}
        postes={postes.map((p) => ({ nom: p.name, prevuCentimes: p.plannedCents }))}
        invites={mariage.estimatedGuests}
      />

      {role === "CREATEUR" && !copilote && <InvitationCopilote />}
      {copilote && (
        <p className="text-sm text-ink-muted">
          Vous organisez à deux avec <span className="font-semibold text-ink">{copilote.user.name}</span>.
        </p>
      )}

      <ProchainesEtapes taches={vues.filter((v) => !v.faite).slice(0, 3)} aujourdhui={aujourdhui} caseACocher={caseACocher} />
      <FrisePlanning
        taches={filtrees}
        aujourdhui={aujourdhui}
        dateMariage={dateMariage}
        caseACocher={caseACocher}
        toutOuvrir={actifs}
        avant={<BarreFiltres responsables={responsables} rubriques={rubriques} total={filtrees.length} />}
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
