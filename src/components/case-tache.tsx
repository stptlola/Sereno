import { basculerTache } from "@/app/actions/mariage";
import type { VueTache } from "./tableau";

/** Case à cocher d'une tâche : vide, à moitié dorée (en cours) ou cochée. */
export function CaseTache({ tache }: { tache: VueTache }) {
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
