export type Ceremonie = "CIVILE" | "LAIQUE" | "RELIGIEUSE";
export type Repere = "LEGAL" | "IMPORTANT" | "ANTICIPATION" | "SECRET" | null;
export type Condition = "enfants" | "brunch" | "animal" | "luneDeMiel" | null;

/** Une tâche du modèle Sereno (data/modele-taches.json). */
export interface ModeleTache {
  id: string;
  titre: string;
  rubrique: string;
  sousRubrique: string | null;
  ceremonie: "ALL" | Ceremonie;
  repere: Repere;
  decalage: { mois: number; jours: number };
  libelleEcheance: string;
  condition: Condition;
  facultative: boolean;
  conseil: string;
  ordre: number;
}

/** Prestataires que le couple peut déclarer « déjà réservés » à l'inscription (M0-11). */
export const PRESTATAIRES_RESERVABLES = {
  lieu: ["T006", "T009", "T010"],
  traiteur: ["T015"],
  photographe: ["T016"],
  videaste: ["T017"],
  dj: ["T018"],
  fleuriste: ["T026"],
  coiffureMaquillage: ["T027"],
} as const satisfies Record<string, readonly string[]>;

export type PrestataireReservable = keyof typeof PRESTATAIRES_RESERVABLES;

/** Ce que l'on sait du mariage. Une option `undefined` = question pas encore posée (M2-14). */
export interface ProfilMariage {
  dateMariage: Date | null;
  dateDebut: Date;
  ceremonies: Ceremonie[];
  options?: {
    enfants?: boolean;
    brunch?: boolean;
    animal?: boolean;
    luneDeMiel?: boolean;
    etranger?: boolean;
  };
  dejaReserve?: PrestataireReservable[];
}

export interface TachePlanifiee {
  modeleId: string;
  titre: string;
  rubrique: string;
  sousRubrique: string | null;
  repere: Repere;
  conseil: string;
  /** Échéance idéale, calculée depuis la date du mariage. */
  dateIdeale: Date;
  /** Échéance affichée : l'idéale, ou une date resserrée si elle est déjà passée (M2-11). */
  dateAffichee: Date;
  resserree: boolean;
  faite: boolean;
  /** Cochée d'office car le prestataire est déjà réservé (M0-11). */
  cocheeDOffice: boolean;
  facultative: boolean;
}

export interface Planning {
  dateMariage: Date;
  dateProvisoire: boolean;
  joursRestants: number;
  taches: TachePlanifiee[];
}
