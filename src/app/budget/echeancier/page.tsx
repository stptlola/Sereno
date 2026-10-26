import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { echeancier } from "@/domain/budget/echeancier";
import { normaliser } from "@/domain/planning";
import { accesEcriture } from "@/lib/acces";
import { euros } from "@/lib/format";
import { chargerPaiements } from "@/lib/paiements";
import { basculerVersement } from "../../actions/budget";

export const metadata: Metadata = { title: "Échéancier · Sereno" };
export const dynamic = "force-dynamic";

const formatJour = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Échéancier des paiements (M3-08) : tous les acomptes et soldes à venir, regroupés par période. */
export default async function PageEcheancier() {
  const { mariage } = await accesEcriture();
  const { paiements } = await chargerPaiements(mariage.id);
  const groupes = echeancier(paiements, normaliser(new Date()));
  const reste = paiements.filter((p) => !p.paye).reduce((s, p) => s + p.montantCentimes, 0);
  const regle = paiements.filter((p) => p.paye).reduce((s, p) => s + p.montantCentimes, 0);
  const parId = new Map(paiements.map((p) => [p.id, p]));

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/budget" />
      <div>
        <Link href="/budget" className="text-sm text-bronze underline">
          ← Budget
        </Link>
        <h1 className="mt-2 font-display text-3xl">Échéancier</h1>
        <p className="mt-1 text-ink-muted">Tous vos acomptes et soldes à venir. Vous recevez un rappel par e-mail une semaine avant chacun.</p>
      </div>
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-ink p-4 text-surface">
          <p className="text-sm text-or">Reste à payer</p>
          <p className="font-display text-3xl">{euros(reste)}</p>
        </div>
        <div className="rounded-md bg-surface-soft p-4">
          <p className="text-sm text-ink-muted">Déjà réglé</p>
          <p className="font-display text-3xl">{euros(regle)}</p>
        </div>
      </section>
      {groupes.length === 0 ? (
        <p className="rounded-md bg-surface-soft p-4">
          Aucun paiement à venir. Ajoutez les acomptes et soldes de vos prestataires depuis chaque dépense de votre{" "}
          <Link href="/budget" className="font-semibold text-bronze underline">
            budget
          </Link>
          .
        </p>
      ) : (
        groupes.map((g) => (
          <section key={g.cle} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={`font-display text-xl ${g.enRetard ? "text-alerte" : ""}`}>{g.titre}</h2>
              <span className="text-sm text-ink-muted">{euros(g.totalCentimes)}</span>
            </div>
            {g.enRetard && <p className="-mt-1 text-sm text-ink-muted">La date est passée : réglez-le dès que possible, ou cochez-le s’il est déjà payé.</p>}
            <ul className="flex flex-col rounded-md border border-line bg-surface-raised px-4">
              {g.paiements.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                  <form action={basculerVersement}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" aria-label={`Marquer comme payé : ${p.depense}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 border-line bg-surface-raised hover:border-or" />
                  </form>
                  <Link href={`/budget/depenses/${parId.get(p.id)!.depenseId}`} className="min-w-0 flex-1">
                    <span className="block font-semibold">{p.depense}</span>
                    <span className="block text-xs text-ink-muted">
                      {[p.poste, p.prestataire].filter(Boolean).join(" · ")}
                      {p.echeance ? ` · ${formatJour.format(p.echeance)}` : ""}
                    </span>
                  </Link>
                  <span className={`font-semibold ${g.enRetard ? "text-alerte" : ""}`}>{euros(p.montantCentimes)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
