import { ajouterJours, ajouterMois, normaliser } from "./dates";

// Frise du planning qui zoome sur ce qui est proche : le mois en cours et le suivant en détail,
// le lointain en grandes périodes, la semaine du mariage et l'après toujours en bas.

export type CleePeriode =
  | "aRattraper"
  | "ceMois"
  | "moisProchain"
  | "dans2a3Mois"
  | "dans3a6Mois"
  | "dans6a12Mois"
  | "plusDUnAn"
  | "semaineDuMariage"
  | "apresLeMariage";

export const LIBELLES_PERIODES: Record<CleePeriode, string> = {
  aRattraper: "À rattraper",
  ceMois: "Ce mois-ci",
  moisProchain: "Le mois prochain",
  dans2a3Mois: "Dans 2 à 3 mois",
  dans3a6Mois: "Dans 3 à 6 mois",
  dans6a12Mois: "Dans 6 à 12 mois",
  plusDUnAn: "Dans plus d’un an",
  semaineDuMariage: "La semaine du mariage",
  apresLeMariage: "Après le mariage",
};

const ORDRE: CleePeriode[] = [
  "aRattraper",
  "ceMois",
  "moisProchain",
  "dans2a3Mois",
  "dans3a6Mois",
  "dans6a12Mois",
  "plusDUnAn",
  "semaineDuMariage",
  "apresLeMariage",
];

export interface TacheDatee {
  date: Date | null;
  faite: boolean;
}

export interface Periode<T> {
  cle: CleePeriode;
  libelle: string;
  /** Première et dernière date des tâches de la période, pour afficher « de février à avril ». */
  du: Date | null;
  au: Date | null;
  taches: T[];
  ouverte: boolean;
}

function debutDuMois(d: Date, decalage = 0): Date {
  return ajouterMois(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), decalage);
}

export function periodeDe(date: Date, faite: boolean, aujourdhui: Date, dateMariage: Date): CleePeriode {
  const d = normaliser(date);
  const auj = normaliser(aujourdhui);
  const mariage = normaliser(dateMariage);
  if (d > mariage) return "apresLeMariage";
  if (d >= ajouterJours(mariage, -7) && mariage >= auj) return "semaineDuMariage";
  if (d < auj) return faite ? "ceMois" : "aRattraper";
  if (d < debutDuMois(auj, 1)) return "ceMois";
  if (d < debutDuMois(auj, 2)) return "moisProchain";
  if (d < ajouterMois(auj, 3)) return "dans2a3Mois";
  if (d < ajouterMois(auj, 6)) return "dans3a6Mois";
  if (d < ajouterMois(auj, 12)) return "dans6a12Mois";
  return "plusDUnAn";
}

/**
 * Regroupe les tâches par période. Sont ouvertes : « À rattraper », puis les deux premières
 * périodes qui contiennent encore des tâches à faire.
 */
export function grouperParPeriode<T extends TacheDatee>(taches: readonly T[], aujourdhui: Date, dateMariage: Date): Periode<T>[] {
  const parCle = new Map<CleePeriode, T[]>();
  for (const t of taches) {
    const cle = t.date ? periodeDe(t.date, t.faite, aujourdhui, dateMariage) : "ceMois";
    parCle.set(cle, [...(parCle.get(cle) ?? []), t]);
  }
  let ouvertesRestantes = 2;
  return ORDRE.filter((cle) => parCle.has(cle)).map((cle) => {
    const liste = parCle.get(cle)!;
    const dates = liste.map((t) => t.date).filter((d): d is Date => d !== null).sort((a, b) => a.getTime() - b.getTime());
    const aFaire = liste.some((t) => !t.faite);
    let ouverte = false;
    if (cle === "aRattraper") ouverte = true;
    else if (aFaire && ouvertesRestantes > 0) {
      ouverte = true;
      ouvertesRestantes -= 1;
    }
    return { cle, libelle: LIBELLES_PERIODES[cle], du: dates[0] ?? null, au: dates[dates.length - 1] ?? null, taches: liste, ouverte };
  });
}
