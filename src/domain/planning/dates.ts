// Dates « jour seul », manipulées en UTC pour éviter les décalages d'heure d'été.

const MS_PAR_JOUR = 86_400_000;

/** Crée une date à minuit UTC. Mois de 1 à 12. */
export function jour(annee: number, mois: number, jourDuMois: number): Date {
  return new Date(Date.UTC(annee, mois - 1, jourDuMois));
}

/** Ramène une date quelconque à minuit UTC du même jour. */
export function normaliser(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Ajoute des mois en gardant le jour, borné à la fin du mois (comme EDATE dans un tableur). */
export function ajouterMois(d: Date, mois: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + mois;
  const annee = Math.floor(total / 12);
  const m = total - annee * 12;
  const dernierJour = new Date(Date.UTC(annee, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(annee, m, Math.min(d.getUTCDate(), dernierJour)));
}

export function ajouterJours(d: Date, jours: number): Date {
  return new Date(normaliser(d).getTime() + jours * MS_PAR_JOUR);
}

/** Nombre de jours de a à b (positif si b est après a). */
export function ecartJours(a: Date, b: Date): number {
  return Math.round((normaliser(b).getTime() - normaliser(a).getTime()) / MS_PAR_JOUR);
}
