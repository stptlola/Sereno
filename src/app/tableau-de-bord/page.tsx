import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CartesChiffres, EnTeteMariage, ProchainesEtapes, type VueTache } from "@/components/tableau";
import { bilan } from "@/domain/budget/calculs";
import { compter } from "@/domain/invites/invites";
import { ajouterMois, ecartJours, normaliser } from "@/domain/planning";
import { prochainsPaiements } from "@/domain/budget/echeancier";
import { temoinDe } from "@/lib/acces";
import { euros } from "@/lib/format";
import { chargerPaiements } from "@/lib/paiements";
import { db } from "@/lib/db";
import { mariageDe, utilisateurRequis } from "@/lib/session";
import { CaseTache } from "@/components/case-tache";
import { Navigation } from "@/components/navigation";
import { InvitationCopilote } from "./invitation-copilote";

export const metadata: Metadata = { title: "Tableau de bord · Sereno" };
export const dynamic = "force-dynamic";

export default async function TableauDeBord() {
  const user = await utilisateurRequis("/tableau-de-bord");
  const acces = await mariageDe(user.id);
  if (!acces) redirect((await temoinDe(user.id)) ? "/temoin" : "/commencer");
  const { mariage, role } = acces;

  const paiementsProches = prochainsPaiements((await chargerPaiements(acces.mariage.id)).paiements, 3);
  const [taches, postes, copilote, invites] = await Promise.all([
    db.task.findMany({
      where: { weddingId: mariage.id, hidden: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { template: { select: { repere: true } } },
    }),
    db.budgetCategory.findMany({ where: { weddingId: mariage.id }, orderBy: { order: "asc" }, include: { expenses: { include: { payments: true } } } }),
    db.member.findFirst({ where: { weddingId: mariage.id, role: "COPILOTE" }, include: { user: true } }),
    db.guest.findMany({ where: { weddingId: mariage.id, isCouple: false }, select: { side: true, ageGroup: true, rsvp: true, diets: true, plusOne: true, firstName: true } }),
  ]);
  const compteurs = compter(
    invites.map((g) => ({ prenom: g.firstName, nom: null, cote: g.side, lien: null, age: g.ageGroup, email: null, reponse: g.rsvp, regimes: g.diets, accompagnant: g.plusOne, moments: [] })),
  );

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
  const caseACocher = (t: VueTache) => <CaseTache tache={t} />;
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" et ");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/tableau-de-bord" />

      <EnTeteMariage prenoms={prenoms} jours={ecartJours(aujourdhui, dateMariage)} date={dateMariage} provisoire={mariage.date === null} />
      <CartesChiffres
        faites={vues.filter((v) => v.faite).length}
        total={vues.length}
        budgetCentimes={mariage.budgetTotalCents}
        postes={postes.map((p) => ({ nom: p.name, prevuCentimes: p.plannedCents }))}
        invites={mariage.estimatedGuests}
        lienBudget="/budget"
        lienInvites="/invites"
        presents={{ personnes: compteurs.personnes, presents: compteurs.presents, enAttente: compteurs.enAttente }}
        engageCentimes={
          bilan(
            mariage.budgetTotalCents,
            postes.map((p) => ({ id: p.id, nom: p.name, prevuCentimes: p.plannedCents })),
            postes.flatMap((p) =>
              p.expenses.map((e) => ({
                posteId: p.id,
                prevuCentimes: e.plannedCents,
                reelCentimes: e.actualCents,
                statut: e.status,
                versements: e.payments.map((v) => ({ montantCentimes: v.amountCents, paye: v.isPaid })),
              })),
            ),
          ).engageCentimes
        }
      />

      {role === "CREATEUR" && !copilote && <InvitationCopilote />}
      {copilote && (
        <p className="text-sm text-ink-muted">
          Vous organisez à deux avec <span className="font-semibold text-ink">{copilote.user.name}</span>.
        </p>
      )}

      <ProchainesEtapes taches={vues.filter((v) => !v.faite).slice(0, 3)} aujourdhui={aujourdhui} caseACocher={caseACocher} />
      <Link href="/planning" className="-mt-4 self-start text-sm font-semibold text-bronze underline">
        Voir tout le planning
      </Link>
      {paiementsProches.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Prochains paiements">
          <h2 className="font-display text-2xl">Prochains paiements</h2>
          <ul className="flex flex-col rounded-md border border-line bg-surface-raised px-4">
            {paiementsProches.map((p) => {
              const retard = p.echeance!.getTime() < aujourdhui.getTime();
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.depense}</span>
                    <span className={`block text-xs ${retard ? "font-semibold text-alerte" : "text-ink-muted"}`}>
                      {retard ? "À régulariser · " : ""}
                      {new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(p.echeance!)}
                      {p.prestataire ? ` · ${p.prestataire}` : ""}
                    </span>
                  </span>
                  <span className="font-semibold">{euros(p.montantCentimes)}</span>
                </li>
              );
            })}
          </ul>
          <Link href="/budget/echeancier" className="-mt-1 self-start text-sm font-semibold text-bronze underline">
            Voir l’échéancier
          </Link>
        </section>
      )}
    </main>
  );
}
