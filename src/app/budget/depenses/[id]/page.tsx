import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Bouton, classeChamp } from "@/components/ui";
import { engage, paye, resteAPayer } from "@/domain/budget/calculs";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { champEuros, euros, STATUTS_DEPENSE } from "@/lib/format";
import { ajouterVersement, basculerVersement, modifierDepense, supprimerDepense, supprimerVersement } from "../../../actions/budget";

export const metadata: Metadata = { title: "Dépense · Sereno" };
export const dynamic = "force-dynamic";

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function ChampTexte({ libelle, name, defaut, ...props }: { libelle: string; name: string; defaut?: string | null } & React.ComponentProps<"input">) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold">{libelle}</span>
      <input name={name} defaultValue={defaut ?? ""} className={classeChamp} {...props} />
    </label>
  );
}

export default async function PageDepense({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { mariage } = await accesEcriture();
  const [d, postes] = await Promise.all([
    db.expense.findFirst({ where: { id, weddingId: mariage.id }, include: { payments: { orderBy: [{ dueDate: "asc" }, { id: "asc" }] }, category: true } }),
    db.budgetCategory.findMany({ where: { weddingId: mariage.id }, orderBy: { order: "asc" } }),
  ]);
  if (!d) notFound();
  const dep = { posteId: d.categoryId, prevuCentimes: d.plannedCents, reelCentimes: d.actualCents, statut: d.status, versements: d.payments.map((v) => ({ montantCentimes: v.amountCents, paye: v.isPaid })) };
  const payeurs = [mariage.partner1Name, mariage.partner2Name, "Nous deux", "Nos parents"].filter((r): r is string => Boolean(r));

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 pt-0 pb-28 sm:pb-24">
      <Navigation actif="/budget" />
      <Link href="/budget" className="text-sm text-bronze underline">
        ← Retour au budget
      </Link>

      <section className="grid grid-cols-3 gap-2">
        {[
          ["Engagé", euros(engage(dep))],
          ["Payé", euros(paye(dep))],
          ["Reste à payer", euros(resteAPayer(dep))],
        ].map(([l, v]) => (
          <div key={l} className="rounded-md bg-surface-soft p-3">
            <p className="text-xs text-ink-muted">{l}</p>
            <p className="font-display text-xl">{v}</p>
          </div>
        ))}
      </section>

      {/* La clé recrée le formulaire quand la dépense change (statut « payé » automatique, par exemple). */}
      <form key={`${d.status}-${d.updatedAt.getTime()}`} action={modifierDepense} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={d.id} />
        <ChampTexte libelle="Dépense" name="label" defaut={d.label} required maxLength={120} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Poste</span>
          <select name="posteId" defaultValue={d.categoryId} className={classeChamp}>
            {postes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <ChampTexte libelle="Prévu (€)" name="planned" defaut={champEuros(d.plannedCents)} inputMode="decimal" />
          <ChampTexte libelle="Réel (€)" name="actual" defaut={champEuros(d.actualCents)} inputMode="decimal" />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Statut</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUTS_DEPENSE) as (keyof typeof STATUTS_DEPENSE)[]).map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name="status" value={s} defaultChecked={d.status === s} className="peer sr-only" />
                <span className="inline-block rounded-full border border-line bg-surface-raised px-4 py-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface">
                  {STATUTS_DEPENSE[s].libelle}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-muted">« Payé » se met tout seul quand tous les versements sont réglés.</p>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <ChampTexte libelle="Prestataire" name="vendor" defaut={d.vendor} maxLength={120} />
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold">Qui paie ?</span>
            <input name="payer" list="payeurs" defaultValue={d.payer ?? ""} maxLength={60} className={classeChamp} />
            <datalist id="payeurs">
              {payeurs.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Note</span>
          <textarea name="note" rows={3} defaultValue={d.note ?? ""} maxLength={2000} className={classeChamp} />
        </label>
        <Bouton type="submit">Enregistrer</Bouton>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Acomptes et soldes</h2>
        {d.payments.length === 0 && <p className="text-sm text-ink-muted">Aucun versement pour l’instant.</p>}
        <ul className="flex flex-col">
          {d.payments.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 border-b border-line py-2">
              <form action={basculerVersement}>
                <input type="hidden" name="id" value={v.id} />
                <button
                  type="submit"
                  aria-label={v.isPaid ? "Marquer comme à payer" : "Marquer comme payé"}
                  className={`flex h-6 w-6 items-center justify-center rounded-sm border-2 ${v.isPaid ? "border-ink bg-ink text-surface" : "border-line hover:border-or"}`}
                >
                  {v.isPaid && "✓"}
                </button>
              </form>
              <span className="flex-1 font-semibold">{euros(v.amountCents)}</span>
              <span className="text-sm text-ink-muted">{v.isPaid ? "Payé" : v.dueDate ? `À payer le ${formatDate.format(v.dueDate)}` : "À payer"}</span>
              <form action={supprimerVersement}>
                <input type="hidden" name="id" value={v.id} />
                <button type="submit" className="text-xs text-alerte underline">
                  Retirer
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={ajouterVersement} className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-line p-4">
          <input type="hidden" name="depenseId" value={d.id} />
          <label className="flex w-28 flex-1 flex-col gap-1 text-xs text-ink-muted">
            Montant (€)
            <input name="amount" required inputMode="decimal" className={`${classeChamp} py-2`} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-ink-muted">
            Échéance
            <input name="dueDate" type="date" className={`${classeChamp} py-2`} />
          </label>
          <label className="flex items-center gap-2 py-2 text-sm">
            <input type="checkbox" name="isPaid" className="h-5 w-5" /> Déjà payé
          </label>
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface">
            Ajouter
          </button>
        </form>
      </section>

      <form action={supprimerDepense} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={d.id} />
        <button type="submit" className="text-sm text-alerte underline">
          Supprimer cette dépense
        </button>
      </form>
    </main>
  );
}
