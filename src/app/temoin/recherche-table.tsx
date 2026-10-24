"use client";
import { useEffect, useState, useTransition } from "react";
import { classeChamp } from "@/components/ui";
import { rechercherTable, type ResultatTable } from "../actions/temoin";

/** Retrouver la table d'un invité, le jour J, en tapant quelques lettres de son nom (M5-23). */
export function RechercheTable() {
  const [saisie, setSaisie] = useState("");
  const [resultats, setResultats] = useState<ResultatTable | null>(null);
  const [enCours, demarrer] = useTransition();
  useEffect(() => {
    if (saisie.trim().length < 2) return setResultats(null);
    const t = setTimeout(() => demarrer(async () => setResultats(await rechercherTable(saisie))), 250);
    return () => clearTimeout(t);
  }, [saisie]);
  return (
    <div className="flex flex-col gap-3">
      <input type="search" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Tapez un prénom ou un nom…" aria-label="Rechercher un invité" className={`${classeChamp} text-lg`} />
      <div aria-live="polite" aria-busy={enCours}>
        {resultats && resultats.length === 0 && <p className="text-ink-muted">Personne ne correspond. Vérifiez l’orthographe.</p>}
        {resultats && resultats.length > 0 && (
          <ul className="flex flex-col gap-2">
            {resultats.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-md bg-surface-soft p-3">
                <span className="font-semibold">{[r.prenom, r.nom].filter(Boolean).join(" ")}</span>
                <span className="text-right">
                  {r.table ? (
                    <>
                      <span className="font-display text-lg">{r.table}</span>
                      {r.place && <span className="block text-sm text-ink-muted">place {r.place}</span>}
                    </>
                  ) : (
                    <span className="text-sm text-ink-muted">Pas encore de table</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
