export const euros = (centimes: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: centimes % 100 ? 2 : 0 }).format(centimes / 100);

/** Valeur à afficher dans un champ de saisie en euros (« 1234,5 »). */
export const champEuros = (centimes: number | null | undefined) =>
  centimes === null || centimes === undefined ? "" : (centimes / 100).toLocaleString("fr-FR", { useGrouping: false, maximumFractionDigits: 2 });

export const STATUTS_DEPENSE = {
  A_CHERCHER: { libelle: "À chercher", classe: "border-line text-ink-muted" },
  DEVIS_RECU: { libelle: "Devis reçu", classe: "border-or text-bronze" },
  RESERVE: { libelle: "Réservé", classe: "border-ink bg-ink text-surface" },
  PAYE: { libelle: "Payé", classe: "border-or bg-or text-ink" },
} as const;

/** Montant arrondi à l'euro, pour les grands totaux. */
export const eurosArrondis = (centimes: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(centimes / 100));
