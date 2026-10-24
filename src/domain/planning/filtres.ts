// Filtres et recherche du planning (M2-10, filtre « mes tâches » de M2-06).

export type FiltreStatut = "tous" | "aFaire" | "enCours" | "faites";

export interface Filtres {
  recherche: string;
  statut: FiltreStatut;
  /** Prénom du responsable, ou "" pour tous. */
  responsable: string;
  /** Rubrique principale (« Réception », « Budget »…), ou "" pour toutes. */
  rubrique: string;
}

export interface TacheFiltrable {
  titre: string;
  statut: "A_FAIRE" | "EN_COURS" | "FAIT";
  responsable: string | null;
  categorie: string;
}

export const FILTRES_VIDES: Filtres = { recherche: "", statut: "tous", responsable: "", rubrique: "" };

/** Retire accents et majuscules, pour une recherche tolérante (« demarche » trouve « démarche »). */
export function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function rubriqueDe(categorie: string): string {
  return categorie.split(" · ")[0] ?? categorie;
}

export function lireFiltres(params: Record<string, string | string[] | undefined>): Filtres {
  const v = (k: string) => {
    const x = params[k];
    return (Array.isArray(x) ? x[0] : x)?.slice(0, 80) ?? "";
  };
  const statut = v("statut");
  return {
    recherche: v("q"),
    statut: (["aFaire", "enCours", "faites"] as const).includes(statut as never) ? (statut as FiltreStatut) : "tous",
    responsable: v("qui"),
    rubrique: v("rubrique"),
  };
}

export function filtresActifs(f: Filtres): boolean {
  return Boolean(f.recherche || f.statut !== "tous" || f.responsable || f.rubrique);
}

export function filtrer<T extends TacheFiltrable>(taches: readonly T[], f: Filtres): T[] {
  const mots = sansAccents(f.recherche).split(/\s+/).filter(Boolean);
  return taches.filter((t) => {
    if (f.statut === "aFaire" && t.statut !== "A_FAIRE") return false;
    if (f.statut === "enCours" && t.statut !== "EN_COURS") return false;
    if (f.statut === "faites" && t.statut !== "FAIT") return false;
    if (f.responsable && sansAccents(t.responsable ?? "") !== sansAccents(f.responsable)) return false;
    if (f.rubrique && rubriqueDe(t.categorie) !== f.rubrique) return false;
    if (mots.length) {
      const titre = sansAccents(t.titre);
      if (!mots.every((m) => titre.includes(m))) return false;
    }
    return true;
  });
}
