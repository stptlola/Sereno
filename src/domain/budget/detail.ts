// Détail d'une dépense en lignes (salle, ménage, caution…). Fonctions pures.

export interface LigneDepense {
  prevuCentimes: number | null;
  reelCentimes: number | null;
  /** Caution : affichée, mais rendue après l'événement, donc hors du total. */
  caution: boolean;
}

export interface TotauxDetail {
  prevuCentimes: number | null;
  reelCentimes: number | null;
  cautionCentimes: number;
}

/**
 * Totaux d'une dépense détaillée : le prévu additionne le prévu de chaque ligne (ou son réel s'il est seul connu) ;
 * le réel n'est donné que lorsqu'au moins une ligne a un montant réel, et compte alors le prévu des lignes encore sans réel.
 * Les cautions sont mises à part.
 */
export function totauxDetail(lignes: readonly LigneDepense[]): TotauxDetail {
  const comptees = lignes.filter((l) => !l.caution);
  const cautionCentimes = lignes.filter((l) => l.caution).reduce((s, l) => s + (l.reelCentimes ?? l.prevuCentimes ?? 0), 0);
  if (!comptees.length) return { prevuCentimes: null, reelCentimes: null, cautionCentimes };
  const prevu = comptees.reduce((s, l) => s + (l.prevuCentimes ?? l.reelCentimes ?? 0), 0);
  const unReel = comptees.some((l) => l.reelCentimes !== null);
  const reel = unReel ? comptees.reduce((s, l) => s + (l.reelCentimes ?? l.prevuCentimes ?? 0), 0) : null;
  return { prevuCentimes: prevu, reelCentimes: reel, cautionCentimes };
}
