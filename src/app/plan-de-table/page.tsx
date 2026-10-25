import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { accesEcriture } from "@/lib/acces";
import { ajouterContrainte, supprimerContrainte } from "../actions/plan";
import { chargerPlan } from "./donnees";
import { Canevas } from "./editeur/canevas";
import { PropositionAuto } from "./proposition";

export const metadata: Metadata = { title: "Plan de table · Sereno" };
export const dynamic = "force-dynamic";

/** Résumé du plan de table : aperçu, chiffres, alertes, proposition, tables et contraintes. L'édition se fait en plein écran. */
export default async function PagePlanDeTable() {
  const { mariage } = await accesEcriture();
  const d = await chargerPlan(mariage.id);
  const places = d.tables.reduce((s, t) => s + t.places, 0);
  const installes = d.tables.reduce((s, t) => s + t.invites.length, 0);
  const champ = "min-w-0 flex-1 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm";

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/plan-de-table" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Plan de table</h1>
          <p className="mt-1 text-ink-muted">Dessinez votre salle et installez vos invités dans l’éditeur, en plein écran.</p>
        </div>
        <Link href="/plan-de-table/editeur" className="rounded-full bg-ink px-5 py-3 font-semibold text-surface">
          Modifier le plan
        </Link>
      </div>

      {d.invites.length === 0 ? (
        <p className="rounded-md bg-surface-soft p-4">Ajoutez d’abord vos invités : le plan de table se construit à partir de votre liste.</p>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="Votre plan en chiffres">
            {[
              ["Tables", d.tables.length],
              ["Installés", `${installes}/${installes + d.aPlacer.length}`],
              ["Places", places],
            ].map(([l, v]) => (
              <div key={l} className="rounded-md bg-surface-soft p-3 sm:p-5">
                <p className="text-xs text-ink-muted sm:text-sm">{l}</p>
                <p className="font-display text-xl sm:text-3xl">{v}</p>
              </div>
            ))}
          </section>

          {d.alertes.length > 0 && (
            <section className="flex flex-col gap-2" aria-label="Alertes du plan">
              {d.alertes.map((a, i) => (
                <p key={i} className={`rounded-md border p-3 text-sm ${a.niveau === "erreur" ? "border-alerte text-alerte" : "border-or"}`}>
                  {a.message}
                </p>
              ))}
            </section>
          )}

          <Link href="/plan-de-table/editeur" aria-label="Ouvrir le plan en plein écran" className="group relative block h-72 overflow-hidden rounded-md border border-line sm:h-96">
            <div className="pointer-events-none h-full">
              <Canevas largeur={mariage.roomWidthCm} profondeur={mariage.roomDepthCm} tables={d.tables} elements={d.elements} lectureSeule />
            </div>
            <span className="absolute right-3 bottom-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface shadow-md transition group-hover:bg-bronze">
              {d.tables.length ? "Modifier le plan" : "Dessiner ma salle"}
            </span>
          </Link>

          <section className="flex flex-col gap-3 rounded-md border border-or bg-surface-raised p-4">
            <p className="font-display text-xl">Proposition automatique</p>
            <p className="text-sm text-ink-muted">
              Foyers gardés ensemble, contraintes respectées, personnes qui en ont besoin près d’une sortie, proches près de la table d’honneur, puis par affinités. Tout reste modifiable.
            </p>
            <PropositionAuto />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl">Vos tables</h2>
              <div className="flex gap-4 text-sm">
                <Link href="/plan-de-table/imprimer" className="text-bronze underline">
                  Imprimer
                </Link>
                <Link href="/plan-de-table/traiteur" className="text-bronze underline">
                  Rapport traiteur
                </Link>
              </div>
            </div>
            {d.tables.length === 0 && <p className="text-ink-muted">Aucune table pour l’instant : ouvrez l’éditeur et touchez « + Ajouter ».</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {d.tables.map((t) => (
                <div key={t.id} className={`rounded-md border bg-surface-raised p-4 ${t.invites.length > t.places ? "border-alerte" : "border-line"}`}>
                  <p className="flex items-baseline justify-between gap-2 font-semibold">
                    <span>
                      {t.honneur ? "♥ " : `${t.numero}. `}
                      {t.nom}
                    </span>
                    <span className="text-sm font-normal text-ink-muted">
                      {t.invites.length}/{t.places}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t.invites
                      .sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
                      .map((i) => i.nom.split(" ")[0])
                      .join(", ") || "Personne pour l’instant"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl">Contraintes</h2>
            <p className="text-sm text-ink-muted">Les membres d’un même foyer sont déjà gardés ensemble. Ajoutez ici vos autres souhaits, pris en compte par la proposition automatique.</p>
            <form action={ajouterContrainte} className="flex flex-wrap items-center gap-2">
              <select name="a" required aria-label="Premier invité" defaultValue="" className={champ}>
                <option value="" disabled>
                  Un invité…
                </option>
                {d.invites.map((g) => (
                  <option key={g.id} value={g.id}>
                    {d.nom(g)}
                  </option>
                ))}
              </select>
              <select name="type" aria-label="Type de contrainte" className="rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm">
                <option value="ENSEMBLE">avec</option>
                <option value="SEPARES">pas à côté de</option>
              </select>
              <select name="b" required aria-label="Second invité" defaultValue="" className={champ}>
                <option value="" disabled>
                  un autre invité…
                </option>
                {d.invites.map((g) => (
                  <option key={g.id} value={g.id}>
                    {d.nom(g)}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-full border border-ink px-4 py-2 text-sm font-semibold">
                Ajouter
              </button>
            </form>
            <ul className="flex flex-col gap-1 text-sm">
              {d.regles.map((c) => {
                const n = (idg: string) => d.nom(d.invites.find((g) => g.id === idg) ?? { firstName: "?", lastName: null });
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <span>
                      {n(c.guestAId)} {c.together ? "avec" : "pas à côté de"} {n(c.guestBId)}
                    </span>
                    <form action={supprimerContrainte}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-ink-muted underline">
                        Retirer
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
