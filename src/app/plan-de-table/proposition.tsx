"use client";
import { startTransition, useActionState } from "react";
import { Message } from "@/components/ui";
import { proposerPlacement, type EtatProposition } from "../actions/plan";

/** Proposition automatique (M5-13, M5-20), avec ses options et le détail des raisons. */
export function PropositionAuto() {
  const [etat, proposer, enCalcul] = useActionState<EtatProposition, FormData>(proposerPlacement, {});
  return (
    <div className="flex flex-col gap-3">
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
        <button type="submit" disabled={enCalcul} className="rounded-full border border-ink px-5 py-2.5 text-sm font-semibold">
          {enCalcul ? "Placement en cours…" : "✨ Placer automatiquement"}
        </button>
      </form>
      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.faits !== undefined && (
        <div role="status" className="flex flex-col gap-1 rounded-sm bg-surface-soft p-3 text-sm">
          <p className="font-semibold">
            {etat.faits} invité{etat.faits > 1 ? "s" : ""} placé{etat.faits > 1 ? "s" : ""}.
          </p>
          {Object.entries(etat.raisons ?? {}).map(([r, n]) => (
            <p key={r}>
              {r} : {n}
            </p>
          ))}
          {etat.nonPlaces?.map((n) => (
            <p key={n.nom} className="text-alerte">
              {n.nom} : {n.raison}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
