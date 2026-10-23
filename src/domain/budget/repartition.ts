// Répartition indicative du budget par poste (M3-02). Base de départ, jamais imposée :
// les pourcentages sont à valider avec les premiers couples (voir cahier des charges, M3).

export const POSTES_PAR_DEFAUT = [
  { nom: "Lieu et réception", part: 20 },
  { nom: "Traiteur et boissons", part: 35 },
  { nom: "Tenues", part: 8 },
  { nom: "Beauté", part: 3 },
  { nom: "Photo et vidéo", part: 10 },
  { nom: "Animation et musique", part: 7 },
  { nom: "Déco et fleurs", part: 7 },
  { nom: "Alliances", part: 3 },
  { nom: "Papeterie", part: 2 },
  { nom: "Transport", part: 2 },
  { nom: "Divers et imprévus", part: 3 },
] as const;

export interface PosteBudget {
  nom: string;
  prevuCentimes: number;
  ordre: number;
}

/**
 * Répartit un budget (en centimes) selon les parts par défaut.
 * Les arrondis sont reportés sur le dernier poste, pour que le total tombe juste.
 */
export function repartirBudget(totalCentimes: number | null): PosteBudget[] {
  const total = totalCentimes && totalCentimes > 0 ? Math.round(totalCentimes) : 0;
  const postes = POSTES_PAR_DEFAUT.map((p, i) => ({
    nom: p.nom,
    prevuCentimes: Math.floor((total * p.part) / 100),
    ordre: i,
  }));
  const reste = total - postes.reduce((s, p) => s + p.prevuCentimes, 0);
  const dernier = postes[postes.length - 1];
  if (dernier) dernier.prevuCentimes += reste;
  return postes;
}
