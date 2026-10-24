// Calculs du budget (M3-04 à M3-07, M3-14). Montants en centimes.

export type StatutDepense = "A_CHERCHER" | "DEVIS_RECU" | "RESERVE" | "PAYE";

export interface Versement {
  montantCentimes: number;
  paye: boolean;
}

export interface Depense {
  posteId: string;
  prevuCentimes: number | null;
  reelCentimes: number | null;
  statut: StatutDepense;
  versements: Versement[];
}

export interface Poste {
  id: string;
  nom: string;
  prevuCentimes: number;
}

/** Engagé : le montant réel s'il est connu, sinon le prévu (règle de M3). */
export function engage(d: Pick<Depense, "prevuCentimes" | "reelCentimes">): number {
  return d.reelCentimes ?? d.prevuCentimes ?? 0;
}

export function paye(d: Pick<Depense, "versements">): number {
  return d.versements.filter((v) => v.paye).reduce((s, v) => s + v.montantCentimes, 0);
}

export function resteAPayer(d: Depense): number {
  return Math.max(0, engage(d) - paye(d));
}

/** « Payé » se met tout seul quand tous les versements couvrent le montant engagé (M3-14). */
export function statutAutomatique(d: Depense): StatutDepense {
  const e = engage(d);
  if (e > 0 && d.versements.length > 0 && d.versements.every((v) => v.paye) && paye(d) >= e) return "PAYE";
  if (d.statut === "PAYE") return e > 0 && paye(d) >= e ? "PAYE" : "RESERVE";
  return d.statut;
}

export interface BilanPoste {
  poste: Poste;
  engageCentimes: number;
  payeCentimes: number;
  ecartCentimes: number;
  depasse: boolean;
  nbDepenses: number;
}

export interface BilanBudget {
  budgetCentimes: number;
  prevuPostesCentimes: number;
  engageCentimes: number;
  payeCentimes: number;
  resteAPayerCentimes: number;
  resteEnveloppeCentimes: number;
  depasse: boolean;
  postes: BilanPoste[];
}

export function bilan(budgetCentimes: number | null, postes: readonly Poste[], depenses: readonly Depense[]): BilanBudget {
  const parPoste = postes.map((p) => {
    const ds = depenses.filter((d) => d.posteId === p.id);
    const e = ds.reduce((s, d) => s + engage(d), 0);
    const pa = ds.reduce((s, d) => s + paye(d), 0);
    return {
      poste: p,
      engageCentimes: e,
      payeCentimes: pa,
      ecartCentimes: p.prevuCentimes - e,
      depasse: p.prevuCentimes > 0 && e > p.prevuCentimes,
      nbDepenses: ds.length,
    };
  });
  const engageTotal = parPoste.reduce((s, p) => s + p.engageCentimes, 0);
  const payeTotal = parPoste.reduce((s, p) => s + p.payeCentimes, 0);
  const budget = budgetCentimes ?? 0;
  return {
    budgetCentimes: budget,
    prevuPostesCentimes: postes.reduce((s, p) => s + p.prevuCentimes, 0),
    engageCentimes: engageTotal,
    payeCentimes: payeTotal,
    resteAPayerCentimes: depenses.reduce((s, d) => s + resteAPayer(d), 0),
    resteEnveloppeCentimes: budget - engageTotal,
    depasse: budget > 0 && engageTotal > budget,
    postes: parPoste,
  };
}

/** Message d'alerte dans le ton Sereno (M3-07). */
export function messageDepassement(nom: string, ecartCentimes: number): string {
  const montant = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.abs(ecartCentimes) / 100);
  return `Le poste ${nom.toLowerCase()} dépasse de ${montant}. On regarde ensemble ?`;
}

/** Lit un montant saisi en euros (« 1 234,50 », « 1234.5 », « 800 € ») en centimes, ou null. */
export function lireEuros(saisie: unknown): number | null {
  const s = String(saisie ?? "")
    .replace(/[\s\u00a0\u202f€]/g, "")
    .replace(",", ".");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const centimes = Math.round(Number(s) * 100);
  return centimes <= 1_000_000_000 ? centimes : null;
}
