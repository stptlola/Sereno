import { repartirBudget, type PosteBudget } from "../budget/repartition";
import { genererPlanning, jour, normaliser, type ModeleTache } from "../planning";
import type { ReponsesDemarrage } from "./reponses";

export interface MariagePrepare {
  mariage: {
    partner1Name: string;
    partner2Name: string | null;
    date: Date | null;
    dateIsTentative: boolean;
    startDate: Date;
    budgetTotalCents: number | null;
    estimatedGuests: number | null;
    ceremonies: ReponsesDemarrage["ceremonies"];
    bookedVendors: string[];
  };
  taches: {
    templateId: string;
    title: string;
    tip: string;
    category: string;
    idealDate: Date;
    dueDate: Date;
    autoCompleted: boolean;
    done: boolean;
  }[];
  postesBudget: PosteBudget[];
}

function lireDate(valeur: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  return m ? jour(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

/**
 * Transforme les réponses du démarrage en données prêtes à enregistrer :
 * le mariage, ses tâches (via genererPlanning) et ses postes de budget.
 * Fonction pure : aucune écriture, testable sans base.
 */
export function preparerMariage(
  reponses: ReponsesDemarrage,
  modeles: readonly ModeleTache[],
  aujourdhui: Date,
): MariagePrepare {
  const dateMariage = lireDate(reponses.date);
  const dateDebut = normaliser(aujourdhui);
  const ceremonies = reponses.ceremonies.length > 0 ? reponses.ceremonies : (["CIVILE"] as const);
  const planning = genererPlanning(modeles, {
    dateMariage,
    dateDebut,
    ceremonies: [...ceremonies],
    dejaReserve: reponses.dejaReserve,
  });
  const budgetTotalCents = reponses.budget ? Math.round(reponses.budget * 100) : null;

  return {
    mariage: {
      partner1Name: reponses.prenom1 || "Partenaire 1",
      partner2Name: reponses.prenom2 || null,
      date: dateMariage,
      dateIsTentative: dateMariage === null,
      startDate: dateDebut,
      budgetTotalCents,
      estimatedGuests: reponses.invites ?? null,
      ceremonies: [...ceremonies],
      bookedVendors: [...reponses.dejaReserve],
    },
    taches: planning.taches.map((t) => ({
      templateId: t.modeleId,
      title: t.titre,
      tip: t.conseil,
      category: t.sousRubrique ? `${t.rubrique} · ${t.sousRubrique}` : t.rubrique,
      idealDate: t.dateIdeale,
      dueDate: t.dateAffichee,
      autoCompleted: t.cocheeDOffice,
      done: t.faite,
    })),
    postesBudget: repartirBudget(budgetTotalCents),
  };
}
