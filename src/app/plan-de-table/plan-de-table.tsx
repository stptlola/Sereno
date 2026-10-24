"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState, useTransition } from "react";
import { Message } from "@/components/ui";
import type { Alerte } from "@/domain/plan/plan";
import {
  ajouterContrainte,
  ajouterElement,
  ajouterTable,
  modifierSalle,
  modifierTable,
  placerInvite,
  proposerPlacement,
  supprimerContrainte,
  supprimerElement,
  supprimerTable,
  viderPlan,
  type EtatProposition,
} from "../actions/plan";
import { PlanSalle } from "./plan-salle";
import type { ElementVue, InviteVue, TableVue } from "./types";

const FORMES = [
  ["RONDE", "Ronde"],
  ["RECTANGLE", "Rectangulaire"],
  ["OVALE", "Ovale"],
  ["CARREE", "Carrée"],
  ["DEMI_LUNE", "Demi-lune"],
] as const;
const TYPES_ELEMENTS = [
  ["piste", "Piste de danse"],
  ["scene", "Scène"],
  ["dj", "DJ"],
  ["buffet", "Buffet"],
  ["bar", "Bar"],
  ["gateau", "Gâteau"],
  ["cadeaux", "Cadeaux"],
  ["photobooth", "Photobooth"],
  ["enfants", "Coin enfants"],
  ["sortie", "Sortie"],
] as const;

export function PlanDeTable({
  largeur,
  profondeur,
  tables,
  elements,
  aPlacer,
  tous,
  contraintes,
  alertes,
}: {
  largeur: number;
  profondeur: number;
  tables: TableVue[];
  elements: ElementVue[];
  aPlacer: InviteVue[];
  tous: { id: string; nom: string }[];
  contraintes: { id: string; a: string; b: string; ensemble: boolean }[];
  alertes: Alerte[];
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<string | null>(null);
  const [, demarrer] = useTransition();
  const [proposition, proposer, enCalcul] = useActionState<EtatProposition, FormData>(proposerPlacement, {});
  const nomInvite = new Map(tous.map((g) => [g.id, g.nom]));
  const selectionne = aPlacer.find((g) => g.id === selection);

  const placer = (inviteId: string, tableId: string | null) =>
    demarrer(async () => {
      await placerInvite(inviteId, tableId);
      setSelection(null);
      router.refresh();
    });

  // Champs compacts, sans largeur imposée, pour que les formulaires tiennent sur une ligne.
  const petit = "min-w-0 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-or";
  return (
    <div className="flex flex-col gap-6">
      {alertes.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Alertes du plan">
          {alertes.map((a, i) => (
            <p key={i} className={`rounded-md border p-3 text-sm ${a.niveau === "erreur" ? "border-alerte text-alerte" : "border-or text-ink"}`}>
              {a.message}
            </p>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-md border border-or bg-surface-raised p-4">
        <p className="font-display text-xl">Proposition automatique</p>
        <p className="text-sm text-ink-muted">
          Sereno place vos invités en gardant les foyers ensemble, en respectant vos contraintes, en installant près d’une sortie ceux qui en ont besoin et vos proches près de la table
          d’honneur. Tout reste modifiable ensuite.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => proposer(fd));
          }}
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="garder" defaultChecked className="h-4 w-4" /> Garder les invités déjà placés
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="melanger" className="h-4 w-4" /> Mélanger les deux côtés
          </label>
          <button type="submit" disabled={enCalcul} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-surface">
            {enCalcul ? "Placement en cours…" : "Placer mes invités"}
          </button>
        </form>
        {proposition.erreur && <Message>{proposition.erreur}</Message>}
        {proposition.faits !== undefined && (
          <div role="status" className="flex flex-col gap-1 rounded-sm bg-surface-soft p-3 text-sm">
            <p className="font-semibold">
              {proposition.faits} invité{proposition.faits > 1 ? "s" : ""} placé{proposition.faits > 1 ? "s" : ""}.
            </p>
            {Object.entries(proposition.raisons ?? {}).map(([r, n]) => (
              <p key={r}>
                {r} : {n}
              </p>
            ))}
            {proposition.nonPlaces?.map((n) => (
              <p key={n.nom} className="text-alerte">
                {n.nom} : {n.raison}
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-3">
          {selectionne && (
            <p role="status" className="rounded-md bg-ink p-3 text-sm text-surface">
              Touchez une table pour y placer <strong>{selectionne.nom}</strong>.{" "}
              <button type="button" className="text-or underline" onClick={() => setSelection(null)}>
                Annuler
              </button>
            </p>
          )}
          <PlanSalle largeur={largeur} profondeur={profondeur} tables={tables} elements={elements} inviteSelectionne={selection} surPlacement={() => (setSelection(null), router.refresh())} />
          <p className="text-xs text-ink-muted">Glissez les tables et les éléments pour reproduire votre salle. Les sorties servent à placer près d’elles les invités qui en ont besoin.</p>
        </div>

        <aside className="flex flex-col gap-3">
          <h2 className="font-display text-xl">
            À placer <span className="font-sans text-sm text-ink-muted">({aPlacer.length})</span>
          </h2>
          {aPlacer.length === 0 && <p className="text-sm text-ink-muted">Tout le monde a sa place.</p>}
          <ul className="flex max-h-96 flex-wrap gap-2 overflow-y-auto lg:flex-col lg:flex-nowrap">
            {aPlacer.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  aria-pressed={selection === g.id}
                  onClick={() => setSelection(selection === g.id ? null : g.id)}
                  className={`rounded-full border px-3 py-1.5 text-left text-sm ${selection === g.id ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised hover:border-ink"}`}
                >
                  {g.nom}
                  {g.accompagnant ? " + 1" : ""}
                  {g.reponse === "EN_ATTENTE" && <span className={selection === g.id ? "text-or" : "text-ink-muted"}> · ?</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-muted">« ? » : pas encore répondu. Les absents ne sont pas proposés.</p>
        </aside>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl">Vos tables</h2>
          <div className="flex gap-3 text-sm">
            <Link href="/plan-de-table/imprimer" className="text-bronze underline">
              Imprimer
            </Link>
            <Link href="/plan-de-table/traiteur" className="text-bronze underline">
              Rapport traiteur
            </Link>
          </div>
        </div>
        <form action={ajouterTable} className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-line p-3">
          <input name="name" maxLength={60} placeholder="Nom (facultatif)" aria-label="Nom de la nouvelle table" className={`${petit} min-w-0 flex-[2]`} />
          <select name="shape" aria-label="Forme" defaultValue="RONDE" className={`${petit} w-auto`}>
            {FORMES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input name="seats" type="number" min={1} max={40} defaultValue={10} aria-label="Nombre de places" className={`${petit} w-20`} />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="honor" className="h-4 w-4" /> Table d’honneur
          </label>
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface">
            Ajouter une table
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          {tables.map((t) => {
            const occupe = t.invites.reduce((s, i) => s + (i.accompagnant ? 2 : 1), 0);
            return (
              <div key={t.id} className={`flex flex-col gap-2 rounded-md border bg-surface-raised p-4 ${occupe > t.places ? "border-alerte" : "border-line"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {t.honneur ? "♥ " : `${t.numero}. `}
                    {t.nom}
                  </p>
                  <span className={`text-sm ${occupe > t.places ? "font-semibold text-alerte" : "text-ink-muted"}`}>
                    {occupe}/{t.places}
                  </span>
                </div>
                {selectionne && occupe < t.places && (
                  <button type="button" onClick={() => placer(selectionne.id, t.id)} className="self-start rounded-full bg-or px-3 py-1 text-sm font-semibold text-ink">
                    Placer {selectionne.nom} ici
                  </button>
                )}
                <ul className="flex flex-col text-sm">
                  {[...t.invites]
                    .sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
                    .map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2 border-b border-line py-1 last:border-b-0">
                        <span>
                          <span className="mr-2 text-xs text-ink-muted">{i.place ?? "–"}</span>
                          {i.nom}
                          {i.accompagnant ? " + 1" : ""}
                          {i.enfant ? <span className="text-ink-muted"> (enfant)</span> : null}
                          {i.regimes.length > 0 && <span className="text-xs text-bronze"> · {i.regimes.join(", ")}</span>}
                        </span>
                        <button type="button" onClick={() => placer(i.id, null)} aria-label={`Retirer ${i.nom} de la table`} className="text-ink-muted hover:text-alerte">
                          ✕
                        </button>
                      </li>
                    ))}
                </ul>
                <details className="text-sm">
                  <summary className="cursor-pointer text-ink-muted">Modifier la table</summary>
                  <form action={modifierTable} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={t.id} />
                    <input name="name" defaultValue={t.nom} maxLength={60} aria-label="Nom de la table" className={`${petit} min-w-0 flex-1`} />
                    <select name="shape" defaultValue={t.forme} aria-label="Forme" className={`${petit} w-auto`}>
                      {FORMES.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <input name="seats" type="number" min={1} max={40} defaultValue={t.places} aria-label="Places" className={`${petit} w-20`} />
                    <label className="flex items-center gap-1">
                      <input type="checkbox" name="honor" defaultChecked={t.honneur} className="h-4 w-4" /> Honneur
                    </label>
                    <button type="submit" className="rounded-full border border-line px-3 py-1.5">
                      Enregistrer
                    </button>
                  </form>
                  <form action={supprimerTable} className="mt-2">
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="text-alerte underline">
                      Supprimer la table (ses invités repassent « à placer »)
                    </button>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
        {tables.some((t) => t.invites.length) && (
          <form action={viderPlan}>
            <button type="submit" className="text-sm text-alerte underline">
              Retirer tout le monde des tables
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Contraintes</h2>
        <p className="text-sm text-ink-muted">Les membres d’un même foyer sont déjà gardés ensemble. Ajoutez ici vos autres souhaits.</p>
        <form action={ajouterContrainte} className="flex flex-wrap items-center gap-2">
          <select name="a" required aria-label="Premier invité" className={`${petit} w-auto min-w-0 flex-1`} defaultValue="">
            <option value="" disabled>
              Un invité…
            </option>
            {tous.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nom}
              </option>
            ))}
          </select>
          <select name="type" aria-label="Type de contrainte" className={`${petit} w-auto`}>
            <option value="ENSEMBLE">avec</option>
            <option value="SEPARES">pas à côté de</option>
          </select>
          <select name="b" required aria-label="Second invité" className={`${petit} w-auto min-w-0 flex-1`} defaultValue="">
            <option value="" disabled>
              un autre invité…
            </option>
            {tous.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nom}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-full border border-ink px-4 py-2 text-sm font-semibold">
            Ajouter
          </button>
        </form>
        <ul className="flex flex-col gap-1 text-sm">
          {contraintes.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <span>
                {nomInvite.get(c.a)} {c.ensemble ? "avec" : "pas à côté de"} {nomInvite.get(c.b)}
              </span>
              <form action={supprimerContrainte}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-ink-muted underline">
                  Retirer
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">La salle</h2>
        <form action={modifierSalle} className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Largeur (m)
            <input name="largeur" inputMode="decimal" defaultValue={(largeur / 100).toLocaleString("fr-FR")} className={`${petit} w-24`} />
          </label>
          <label className="flex flex-col gap-1">
            Profondeur (m)
            <input name="profondeur" inputMode="decimal" defaultValue={(profondeur / 100).toLocaleString("fr-FR")} className={`${petit} w-24`} />
          </label>
          <button type="submit" className="rounded-full border border-line px-4 py-2">
            Enregistrer
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {TYPES_ELEMENTS.map(([v, l]) => (
            <form key={v} action={ajouterElement}>
              <input type="hidden" name="kind" value={v} />
              <button type="submit" className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-ink-muted hover:border-ink hover:text-ink">
                + {l}
              </button>
            </form>
          ))}
        </div>
        {elements.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {elements.map((e) => (
              <li key={e.id}>
                <form action={supprimerElement} className="flex items-center gap-1 rounded-full bg-surface-soft px-3 py-1">
                  <input type="hidden" name="id" value={e.id} />
                  {e.libelle}
                  <button type="submit" aria-label={`Retirer ${e.libelle}`} className="text-ink-muted hover:text-alerte">
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
