import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Bouton, classeChamp } from "@/components/ui";
import { engage, paye, resteAPayer } from "@/domain/budget/calculs";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { champEuros, euros, STATUTS_DEPENSE } from "@/lib/format";
import { ajouterLigne, ajouterVersement, modifierLigne, supprimerLigne, basculerVersement, modifierDepense, supprimerDepense, supprimerVersement } from "../../../actions/budget";

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

// Champ compact sans largeur imposée, pour que le formulaire d'ajout tienne sur une ligne.
const compact = "min-w-0 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-or";

export default async function PageDepense({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { mariage } = await accesEcriture();
  const [d, postes] = await Promise.all([
    db.expense.findFirst({ where: { id, weddingId: mariage.id }, include: { payments: { orderBy: [{ dueDate: "asc" }, { id: "asc" }] }, category: true, lines: { orderBy: { createdAt: "asc" } } } }),
    db.budgetCategory.findMany({ where: { weddingId: mariage.id }, orderBy: { order: "asc" } }),
  ]);
  if (!d) notFound();
  const dep = { posteId: d.categoryId, prevuCentimes: d.plannedCents, reelCentimes: d.actualCents, statut: d.status, versements: d.payments.map((v) => ({ montantCentimes: v.amountCents, paye: v.isPaid })) };
  const payeurs = [mariage.partner1Name, mariage.partner2Name, "Nous deux", "Nos parents"].filter((r): r is string => Boolean(r));

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
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
        {d.lines.length ? (
          // Dépense détaillée : prévu et réel sont la somme des lignes, modifiables dans le détail ci-dessous.
          <div className="grid grid-cols-2 gap-3">
            <p className="flex flex-col gap-1 rounded-sm bg-surface-soft p-3">
              <span className="text-sm font-semibold">Prévu</span>
              <span className="font-display text-xl">{d.plannedCents !== null ? euros(d.plannedCents) : "—"}</span>
            </p>
            <p className="flex flex-col gap-1 rounded-sm bg-surface-soft p-3">
              <span className="text-sm font-semibold">Réel</span>
              <span className="font-display text-xl">{d.actualCents !== null ? euros(d.actualCents) : "À connaître"}</span>
            </p>
            <p className="col-span-2 -mt-1 text-xs text-ink-muted">Calculés à partir du détail ci-dessous.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ChampTexte libelle="Prévu (€)" name="planned" defaut={champEuros(d.plannedCents)} inputMode="decimal" />
            <ChampTexte libelle="Réel (€)" name="actual" defaut={champEuros(d.actualCents)} inputMode="decimal" />
          </div>
        )}
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
        <h2 className="font-display text-2xl">Détail</h2>
        <p className="-mt-2 text-sm text-ink-muted">
          {d.lines.length ? "Le prévu et le réel de la dépense sont la somme de ces lignes. Une caution est rendue après le mariage : elle n’entre pas dans le total." : "Détaillez cette dépense en lignes (la salle, le ménage, la caution…) : son prévu et son réel seront calculés tout seuls."}
        </p>
        {d.lines.length > 0 && (
          <ul className="flex flex-col gap-2">
            {d.lines.map((l) => (
              <li key={`${l.id}-${l.plannedCents}-${l.actualCents}-${l.isDeposit}`} className={`rounded-md border p-3 ${l.isDeposit ? "border-dashed border-line bg-surface-soft" : "border-line bg-surface-raised"}`}>
                <form action={modifierLigne} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={l.id} />
                  <label className="flex min-w-0 flex-[2_1_10rem] flex-col gap-1 text-xs text-ink-muted">
                    Ligne
                    <input name="label" defaultValue={l.label} required maxLength={120} className={`${classeChamp} py-2 text-sm`} />
                  </label>
                  <label className="flex w-24 flex-col gap-1 text-xs text-ink-muted">
                    Prévu (€)
                    <input name="planned" defaultValue={champEuros(l.plannedCents)} inputMode="decimal" className={`${classeChamp} py-2 text-sm`} />
                  </label>
                  <label className="flex w-24 flex-col gap-1 text-xs text-ink-muted">
                    Réel (€)
                    <input name="actual" defaultValue={champEuros(l.actualCents)} inputMode="decimal" className={`${classeChamp} py-2 text-sm`} />
                  </label>
                  <label className="flex items-center gap-1.5 pb-2 text-sm">
                    <input type="checkbox" name="isDeposit" defaultChecked={l.isDeposit} className="h-4 w-4" /> Caution
                  </label>
                  <button type="submit" className="rounded-full border border-line px-3 py-2 text-sm">
                    Enregistrer
                  </button>
                </form>
                <form action={supprimerLigne} className="mt-1">
                  <input type="hidden" name="id" value={l.id} />
                  <button type="submit" className="text-xs text-ink-muted underline hover:text-alerte">
                    Retirer cette ligne
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {(() => {
          const caution = d.lines.filter((l) => l.isDeposit).reduce((s, l) => s + (l.actualCents ?? l.plannedCents ?? 0), 0);
          return caution > 0 ? <p className="text-sm">Caution à récupérer après le mariage : <strong>{euros(caution)}</strong></p> : null;
        })()}
        <form action={ajouterLigne} className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-line p-3">
          <input type="hidden" name="depenseId" value={d.id} />
          <input name="label" required maxLength={120} placeholder="Nouvelle ligne (ex. : ménage)" aria-label="Nouvelle ligne" className={`${compact} flex-[2_1_12rem]`} />
          <input name="planned" inputMode="decimal" placeholder="Prévu (€)" aria-label="Prévu de la nouvelle ligne" className={`${compact} w-28`} />
          <label className="flex items-center gap-1.5 pb-2 text-sm">
            <input type="checkbox" name="isDeposit" className="h-4 w-4" /> Caution
          </label>
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface">
            Ajouter
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {["Ménage", "Caution", "Heures supplémentaires", "Frais de déplacement", "Options", "Livraison et installation"]
            .filter((x) => !d.lines.some((l) => l.label.toLowerCase() === x.toLowerCase()))
            .map((x) => (
              <form key={x} action={ajouterLigne}>
                <input type="hidden" name="depenseId" value={d.id} />
                <input type="hidden" name="label" value={x} />
                <button type="submit" className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-ink-muted hover:border-ink hover:text-ink">
                  + {x}
                </button>
              </form>
            ))}
        </div>
      </section>

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
