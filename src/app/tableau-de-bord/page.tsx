import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CartesChiffres, EnTeteMariage, FrisePlanning, ProchainesEtapes, type VueTache } from "@/components/tableau";
import { ajouterMois, ecartJours, normaliser } from "@/domain/planning";
import { db } from "@/lib/db";
import { mariageDe, utilisateurRequis } from "@/lib/session";
import { Navigation } from "@/components/navigation";
import { basculerTache } from "../actions/mariage";
import { reafficherTache } from "../actions/taches";
import { InvitationCopilote } from "./invitation-copilote";

export const metadata: Metadata = { title: "Tableau de bord · Sereno" };
export const dynamic = "force-dynamic";

function CaseTache({ tache }: { tache: VueTache }) {
  return (
    <form action={basculerTache} className="shrink-0">
      <input type="hidden" name="id" value={tache.id} />
      <button
        type="submit"
        aria-label={tache.faite ? `Rouvrir : ${tache.titre}` : `Marquer comme faite : ${tache.titre}`}
        className={`flex h-6 w-6 items-center justify-center rounded-sm border-2 ${tache.faite ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised hover:border-or"}`}
      >
        {tache.faite && "✓"}
      </button>
    </form>
  );
}

export default async function TableauDeBord() {
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
  const vues: VueTache[] = taches.map((t) => ({
    id: t.id,
    titre: t.title,
    conseil: t.tip,
    date: t.dueDate,
    faite: t.status === "FAIT",
    legale: t.template?.repere === "LEGAL",
    enCours: t.status === "EN_COURS",
    responsable: t.assignee,
    href: `/taches/${t.id}`,
  }));
  const caseACocher = (t: VueTache) => <CaseTache tache={t} />;
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" et ");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-10">
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
      <FrisePlanning taches={vues} aujourdhui={aujourdhui} dateMariage={dateMariage} caseACocher={caseACocher} />

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
