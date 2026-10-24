"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeChamp } from "@/components/ui";

const VUES = [
  { valeur: "", libelle: "Par côté" },
  { valeur: "alpha", libelle: "A à Z" },
  { valeur: "tableau", libelle: "Tableau" },
];
const REPONSES = [
  { valeur: "", libelle: "Tous" },
  { valeur: "PRESENT", libelle: "Présents" },
  { valeur: "EN_ATTENTE", libelle: "En attente" },
  { valeur: "ABSENT", libelle: "Absents" },
];

/** Vues, recherche et filtre par réponse, gardés dans l'adresse (M4-08, M4-19). */
export function OutilsInvites({ total, moments }: { total: number; moments: { id: string; name: string }[] }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [, demarrer] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const courants = useRef(params.toString());
  useEffect(() => {
    courants.current = params.toString();
  }, [params]);

  function maj(cle: string, valeur: string) {
    const p = new URLSearchParams(courants.current);
    if (valeur) p.set(cle, valeur);
    else p.delete(cle);
    courants.current = p.toString();
    demarrer(() => router.replace(`${chemin}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => maj("q", q.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const bouton = (actif: boolean) => `rounded-full border px-3 py-1.5 text-sm ${actif ? "border-ink bg-ink text-surface" : "border-line hover:border-ink"}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Affichage de la liste">
        {VUES.map((v) => (
          <button key={v.valeur} type="button" role="tab" aria-selected={(params.get("vue") ?? "") === v.valeur} onClick={() => maj("vue", v.valeur)} className={bouton((params.get("vue") ?? "") === v.valeur)}>
            {v.libelle}
          </button>
        ))}
      </div>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un invité…" aria-label="Rechercher un invité" className={classeChamp} />
      <div className="flex flex-wrap items-center gap-2">
        {REPONSES.map((r) => (
          <button key={r.valeur} type="button" aria-pressed={(params.get("reponse") ?? "") === r.valeur} onClick={() => maj("reponse", r.valeur)} className={bouton((params.get("reponse") ?? "") === r.valeur)}>
            {r.libelle}
          </button>
        ))}
        {moments.length > 0 && (
          <select value={params.get("moment") ?? ""} onChange={(e) => maj("moment", e.target.value)} aria-label="Filtrer par moment" className="rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm">
            <option value="">Tous les moments</option>
            {moments.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto text-sm text-ink-muted">
          {total} invité{total > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
