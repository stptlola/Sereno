"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeChamp } from "@/components/ui";

const STATUTS = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "aFaire", libelle: "À faire" },
  { valeur: "enCours", libelle: "En cours" },
  { valeur: "faites", libelle: "Faites" },
];

/** Recherche et filtres du planning, gardés dans l'adresse de la page (M2-10). */
export function BarreFiltres({ responsables, rubriques, total }: { responsables: string[]; rubriques: string[]; total: number }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [enCours, demarrer] = useTransition();
  const [recherche, setRecherche] = useState(params.get("q") ?? "");
  // Derniers filtres demandés : évite qu'un second changement rapide écrase le premier.
  const courants = useRef(params.toString());
  useEffect(() => {
    courants.current = params.toString();
  }, [params]);

  function mettreAJour(cle: string, valeur: string) {
    const p = new URLSearchParams(courants.current);
    if (valeur) p.set(cle, valeur);
    else p.delete(cle);
    courants.current = p.toString();
    demarrer(() => router.replace(`${chemin}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }

  // Recherche lancée après une courte pause de frappe.
  useEffect(() => {
    if (recherche === (params.get("q") ?? "")) return;
    const t = setTimeout(() => mettreAJour("q", recherche.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  const statut = params.get("statut") ?? "";
  const actifs = ["q", "statut", "qui", "rubrique"].some((k) => params.get(k));

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4" aria-busy={enCours}>
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher une tâche : mairie, photographe, faire-part…"
        aria-label="Rechercher une tâche"
        className={classeChamp}
      />
      <div className="flex flex-wrap items-center gap-2">
        {STATUTS.map((s) => (
          <button
            key={s.valeur}
            type="button"
            aria-pressed={statut === s.valeur}
            onClick={() => mettreAJour("statut", s.valeur)}
            className={`rounded-full border px-3 py-1.5 text-sm ${statut === s.valeur ? "border-ink bg-ink text-surface" : "border-line hover:border-ink"}`}
          >
            {s.libelle}
          </button>
        ))}
        <select
          value={params.get("qui") ?? ""}
          onChange={(e) => mettreAJour("qui", e.target.value)}
          aria-label="Filtrer par responsable"
          className="rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm"
        >
          <option value="">Tout le monde</option>
          {responsables.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={params.get("rubrique") ?? ""}
          onChange={(e) => mettreAJour("rubrique", e.target.value)}
          aria-label="Filtrer par rubrique"
          className="rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm"
        >
          <option value="">Toutes les rubriques</option>
          {rubriques.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {actifs && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            {total} tâche{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="text-bronze underline"
            onClick={() => {
              setRecherche("");
              courants.current = "";
              demarrer(() => router.replace(chemin, { scroll: false }));
            }}
          >
            Effacer les filtres
          </button>
        </div>
      )}
    </div>
  );
}
