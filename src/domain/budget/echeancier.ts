import { ajouterJours, ecartJours, normaliser } from "../planning/dates";
import { sansAccents } from "../planning/filtres";

// Échéancier des paiements (M3-08, M1-06) et « qui finance quoi » (M3-10). Fonctions pures.

export interface PaiementEch {
  id: string;
  depense: string;
  poste: string;
  prestataire: string | null;
  montantCentimes: number;
  echeance: Date | null;
  paye: boolean;
}

export interface GroupeEcheancier {
  cle: string;
  titre: string;
  enRetard: boolean;
  totalCentimes: number;
  paiements: PaiementEch[];
}

const moisAnnee = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Regroupe les paiements à venir : en retard, cette semaine, ce mois-ci, puis mois par mois ;
 * ceux sans date à la fin. Les paiements réglés ne sont pas repris.
 */
export function echeancier(paiements: readonly PaiementEch[], jour: Date): GroupeEcheancier[] {
  const auj = normaliser(jour);
  const finSemaine = ajouterJours(auj, 7);
  const groupes = new Map<string, GroupeEcheancier>();
  const ajouter = (cle: string, titre: string, p: PaiementEch, enRetard = false) => {
    const g = groupes.get(cle) ?? { cle, titre, enRetard, totalCentimes: 0, paiements: [] };
    g.paiements.push(p);
    g.totalCentimes += p.montantCentimes;
    groupes.set(cle, g);
  };
  const aVenir = paiements.filter((p) => !p.paye).sort((a, b) => (a.echeance?.getTime() ?? Infinity) - (b.echeance?.getTime() ?? Infinity));
  for (const p of aVenir) {
    if (!p.echeance) ajouter("9999-sans-date", "Sans date", p);
    else if (ecartJours(auj, p.echeance) < 0) ajouter("0000-retard", "À régulariser", p, true);
    else if (p.echeance.getTime() < finSemaine.getTime()) ajouter("0001-semaine", "Cette semaine", p);
    else if (p.echeance.getUTCFullYear() === auj.getUTCFullYear() && p.echeance.getUTCMonth() === auj.getUTCMonth()) ajouter("0002-mois", "Ce mois-ci", p);
    else {
      const cle = `${p.echeance.getUTCFullYear()}-${String(p.echeance.getUTCMonth() + 1).padStart(2, "0")}`;
      const titre = moisAnnee.format(p.echeance);
      ajouter(cle, titre.charAt(0).toUpperCase() + titre.slice(1), p);
    }
  }
  return [...groupes.values()].sort((a, b) => a.cle.localeCompare(b.cle));
}

/** Les prochains paiements à prévoir (carte de l'Accueil, M1-06) : en retard d'abord, puis par date. */
export function prochainsPaiements(paiements: readonly PaiementEch[], n = 3): PaiementEch[] {
  return paiements
    .filter((p) => !p.paye && p.echeance)
    .sort((a, b) => a.echeance!.getTime() - b.echeance!.getTime())
    .slice(0, n);
}

export interface DepenseFinancement {
  payeur: string | null;
  /** Montant réel s'il est connu, sinon montant prévu. */
  montantCentimes: number;
  payeCentimes: number;
}

export interface PartFinancement {
  payeur: string;
  engageCentimes: number;
  payeCentimes: number;
  resteCentimes: number;
  /** Part du total engagé, en pourcentage arrondi. */
  part: number;
}

/**
 * Qui finance quoi (M3-10) : par financeur, le total engagé, déjà payé et restant.
 * Les noms sont regroupés sans tenir compte des majuscules ni des accents ; sans financeur : « Non précisé ».
 */
export function financement(depenses: readonly DepenseFinancement[]): PartFinancement[] {
  const parCle = new Map<string, PartFinancement>();
  for (const d of depenses) {
    const nom = d.payeur?.trim() || "Non précisé";
    const cle = sansAccents(nom);
    const p = parCle.get(cle) ?? { payeur: nom, engageCentimes: 0, payeCentimes: 0, resteCentimes: 0, part: 0 };
    p.engageCentimes += d.montantCentimes;
    p.payeCentimes += d.payeCentimes;
    parCle.set(cle, p);
  }
  const total = [...parCle.values()].reduce((s, p) => s + p.engageCentimes, 0);
  return [...parCle.values()]
    .map((p) => ({ ...p, resteCentimes: Math.max(0, p.engageCentimes - p.payeCentimes), part: total ? Math.round((p.engageCentimes / total) * 100) : 0 }))
    .sort((a, b) => Number(a.payeur === "Non précisé") - Number(b.payeur === "Non précisé") || b.engageCentimes - a.engageCentimes);
}
