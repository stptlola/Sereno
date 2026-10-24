import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { classeChamp } from "@/components/ui";
import { bilan, engage, messageDepassement, resteAPayer } from "@/domain/budget/calculs";
import { suggestionsRestantes } from "@/domain/budget/suggestions";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { champEuros, euros, eurosArrondis, STATUTS_DEPENSE } from "@/lib/format";
import { ajouterDepense, ajouterPoste, modifierPoste, supprimerPoste } from "../actions/budget";

export const metadata: Metadata = { title: "Budget · Sereno" };
export const dynamic = "force-dynamic";

function Chiffre({ libelle, valeur, alerte = false }: { libelle: string; valeur: string; alerte?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-surface-soft p-3 sm:p-5">
      <p className="text-xs text-ink-muted sm:text-sm">{libelle}</p>
      <p className={`font-display text-xl break-words sm:text-2xl lg:text-3xl ${alerte ? "text-alerte" : ""}`}>{valeur}</p>
    </div>
  );
}

export default async function PageBudget() {
  const { mariage } = await accesEcriture();
  const postes = await db.budgetCategory.findMany({
    where: { weddingId: mariage.id },
    orderBy: { order: "asc" },
    include: { expenses: { include: { payments: true }, orderBy: { createdAt: "asc" } } },
  });
  const depenses = postes.flatMap((p) =>
    p.expenses.map((e) => ({
      posteId: p.id,
      prevuCentimes: e.plannedCents,
      reelCentimes: e.actualCents,
      statut: e.status,
      versements: e.payments.map((v) => ({ montantCentimes: v.amountCents, paye: v.isPaid })),
    })),
  );
  const b = bilan(mariage.budgetTotalCents, postes.map((p) => ({ id: p.id, nom: p.name, prevuCentimes: p.plannedCents })), depenses);
  const prenoms: [string, string?] = [mariage.partner1Name, mariage.partner2Name ?? undefined];
  const alertes = b.postes.filter((p) => p.depasse);
  const pourcent = b.budgetCentimes ? Math.min(100, Math.round((b.engageCentimes / b.budgetCentimes) * 100)) : 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/budget" />
      <div>
        <h1 className="font-display text-3xl">Budget</h1>
        <p className="mt-1 text-ink-muted">L’engagé compte le montant réel quand vous le connaissez, sinon le prévu.</p>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4" aria-label="Votre budget en chiffres">
        <Chiffre libelle="Budget" valeur={b.budgetCentimes ? eurosArrondis(b.budgetCentimes) : "À définir"} />
        <Chiffre libelle="Engagé" valeur={eurosArrondis(b.engageCentimes)} alerte={b.depasse} />
        <Chiffre libelle="Déjà payé" valeur={eurosArrondis(b.payeCentimes)} />
        <Chiffre libelle="Reste disponible" valeur={b.budgetCentimes ? eurosArrondis(b.resteEnveloppeCentimes) : "—"} alerte={b.resteEnveloppeCentimes < 0} />
      </section>
      {b.budgetCentimes > 0 && (
        <div className="-mt-4">
          <div className="h-2 rounded-full bg-surface-soft" aria-hidden>
            <div className={`h-2 rounded-full ${b.depasse ? "bg-alerte" : "bg-or"}`} style={{ width: `${pourcent}%` }} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {pourcent} % de votre budget engagé · {euros(b.resteAPayerCentimes)} restent à payer
          </p>
        </div>
      )}
      {!b.budgetCentimes && (
        <p className="rounded-md bg-surface-soft p-4 text-sm">
          Pas encore de budget global ?{" "}
          <Link href="/parametres" className="font-semibold text-bronze underline">
            Ajoutez-le dans les paramètres
          </Link>{" "}
          : Sereno vous proposera une répartition par poste.
        </p>
      )}

      {(alertes.length > 0 || b.depasse) && (
        <section className="flex flex-col gap-2" aria-label="Alertes">
          {b.depasse && (
            <p role="alert" className="rounded-md border border-alerte p-4 text-alerte">
              Votre budget global est dépassé de {euros(-b.resteEnveloppeCentimes)}. Pas de panique : regardons poste par poste où ajuster.
            </p>
          )}
          {alertes.map((a) => (
            <p key={a.poste.id} className="rounded-md border border-alerte p-4 text-alerte">
              {messageDepassement(a.poste.nom, a.ecartCentimes)}
            </p>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Vos postes</h2>
        {postes.map((p) => {
          const bp = b.postes.find((x) => x.poste.id === p.id)!;
          const ratio = p.plannedCents ? Math.min(100, Math.round((bp.engageCentimes / p.plannedCents) * 100)) : bp.engageCentimes ? 100 : 0;
          const suggestions = suggestionsRestantes(p.name, p.expenses.map((e) => e.label), prenoms);
          return (
            <details key={p.id} className={`group rounded-md border bg-surface-raised ${bp.depasse ? "border-alerte" : "border-line"}`}>
              <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 [&::-webkit-details-marker]:hidden">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{p.name}</span>
                  <span className="flex items-center gap-3 text-sm">
                    <span className={bp.depasse ? "font-semibold text-alerte" : "text-ink-muted"}>
                      {euros(bp.engageCentimes)} sur {euros(p.plannedCents)}
                    </span>
                    <span className="transition group-open:rotate-180" aria-hidden>
                      ▾
                    </span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-soft" aria-hidden>
                  <div className={`h-1.5 rounded-full ${bp.depasse ? "bg-alerte" : "bg-or"}`} style={{ width: `${ratio}%` }} />
                </div>
                <span className="text-xs text-ink-muted">
                  {p.expenses.length} dépense{p.expenses.length > 1 ? "s" : ""}
                </span>
              </summary>
              <div className="flex flex-col gap-4 border-t border-line p-4">
                {p.expenses.length > 0 && (
                  <ul className="flex flex-col">
                    {p.expenses.map((e) => {
                      const dep = { posteId: p.id, prevuCentimes: e.plannedCents, reelCentimes: e.actualCents, statut: e.status, versements: e.payments.map((v) => ({ montantCentimes: v.amountCents, paye: v.isPaid })) };
                      const s = STATUTS_DEPENSE[e.status];
                      return (
                        <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2 last:border-b-0">
                          <Link href={`/budget/depenses/${e.id}`} className="flex-1 font-semibold hover:underline">
                            {e.label}
                          </Link>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.classe}`}>{s.libelle}</span>
                          <span className="text-sm">{euros(engage(dep))}</span>
                          {resteAPayer(dep) > 0 && e.payments.length > 0 && <span className="text-xs text-ink-muted">reste {euros(resteAPayer(dep))}</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <form action={ajouterDepense} className="flex flex-wrap gap-2">
                  <input type="hidden" name="posteId" value={p.id} />
                  <input name="label" required maxLength={120} placeholder="Nouvelle dépense" aria-label={`Nouvelle dépense dans ${p.name}`} className={`${classeChamp} min-w-0 flex-[2] py-2`} />
                  <input name="planned" inputMode="decimal" placeholder="Prévu (€)" aria-label="Montant prévu" className={`${classeChamp} w-28 flex-1 py-2`} />
                  <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface">
                    Ajouter
                  </button>
                </form>
                {suggestions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-ink-muted">Suggestions, en un clic :</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <form key={s} action={ajouterDepense}>
                          <input type="hidden" name="posteId" value={p.id} />
                          <input type="hidden" name="label" value={s} />
                          <button type="submit" className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-ink-muted hover:border-ink hover:text-ink">
                            + {s}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                )}
                <form key={`${p.name}-${p.plannedCents}`} action={modifierPoste} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="flex min-w-0 flex-[2] flex-col gap-1 text-xs text-ink-muted">
                    Nom du poste
                    <input name="name" defaultValue={p.name} maxLength={120} className={`${classeChamp} py-2 text-sm`} />
                  </label>
                  <label className="flex w-28 flex-1 flex-col gap-1 text-xs text-ink-muted">
                    Enveloppe (€)
                    <input name="planned" inputMode="decimal" defaultValue={champEuros(p.plannedCents)} className={`${classeChamp} py-2 text-sm`} />
                  </label>
                  <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm">
                    Enregistrer
                  </button>
                </form>
                {p.expenses.length === 0 && (
                  <form action={supprimerPoste}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-xs text-alerte underline">
                      Supprimer ce poste
                    </button>
                  </form>
                )}
              </div>
            </details>
          );
        })}
        <form action={ajouterPoste} className="flex flex-wrap gap-2 rounded-md border border-dashed border-line p-4">
          <input name="name" required maxLength={120} placeholder="Nouveau poste (par exemple : lune de miel)" aria-label="Nouveau poste" className={`${classeChamp} min-w-0 flex-[2] py-2`} />
          <input name="planned" inputMode="decimal" placeholder="Enveloppe (€)" aria-label="Enveloppe du nouveau poste" className={`${classeChamp} w-28 flex-1 py-2`} />
          <button type="submit" className="rounded-full border border-ink px-4 py-2 text-sm font-semibold">
            Ajouter le poste
          </button>
        </form>
        {b.budgetCentimes > 0 && b.prevuPostesCentimes !== b.budgetCentimes && (
          <p className="text-sm text-ink-muted">
            Vos enveloppes totalisent {euros(b.prevuPostesCentimes)}, pour un budget de {euros(b.budgetCentimes)}.
          </p>
        )}
      </section>
    </main>
  );
}
