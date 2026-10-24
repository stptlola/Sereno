export interface TableVue {
  id: string;
  nom: string;
  numero: number;
  forme: "RONDE" | "RECTANGLE" | "OVALE" | "CARREE" | "DEMI_LUNE";
  places: number;
  honneur: boolean;
  x: number;
  y: number;
  rotation: number;
  invites: { id: string; nom: string; place: number | null; enfant: boolean; accompagnant: boolean; regimes: string[] }[];
}

export interface ElementVue {
  id: string;
  type: string;
  libelle: string;
  x: number;
  y: number;
  largeur: number;
  profondeur: number;
  rotation: number;
}

export interface InviteVue {
  id: string;
  nom: string;
  cote: string;
  accompagnant: boolean;
  enfant: boolean;
  reponse: string;
}

/** Taille d'une table sur le plan (cm), selon sa forme et son nombre de places. */
export function tailleTable(t: Pick<TableVue, "forme" | "places">): { l: number; p: number } {
  const n = t.places;
  switch (t.forme) {
    case "RONDE":
      return { l: Math.max(120, 30 * n), p: Math.max(120, 30 * n) };
    case "OVALE":
      return { l: Math.max(160, 40 * n), p: Math.max(110, 22 * n) };
    case "CARREE":
      return { l: Math.max(90, 25 * n), p: Math.max(90, 25 * n) };
    case "DEMI_LUNE":
      return { l: Math.max(160, 35 * n), p: Math.max(90, 18 * n) };
    default:
      return { l: Math.max(120, 35 * Math.ceil(n / 2)), p: 90 };
  }
}
