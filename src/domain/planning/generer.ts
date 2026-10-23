import { ajouterJours, ajouterMois, ecartJours, normaliser } from "./dates";
import {
  PRESTATAIRES_RESERVABLES,
  type ModeleTache,
  type Planning,
  type ProfilMariage,
  type TachePlanifiee,
} from "./types";

/** En dessous de cet horizon, les tâches d'anticipation sont masquées (M2-12). */
export const HORIZON_ANTICIPATION_JOURS = 365;

/** Sans date, le planning se base sur une date provisoire dans 12 mois (règle de M0). */
export const MOIS_DATE_PROVISOIRE = 12;

/**
 * Une condition s'applique-t-elle ?
 * - animal : uniquement si le couple a dit oui (la plupart n'en ont pas) ;
 * - enfants, brunch, lune de miel : affichées tant que le couple n'a pas dit non.
 */
function conditionRemplie(modele: ModeleTache, profil: ProfilMariage): boolean {
  const options = profil.options ?? {};
  switch (modele.condition) {
    case null:
      return true;
    case "animal":
      return options.animal === true;
    default:
      return options[modele.condition] !== false;
  }
}

export function tacheConcernee(modele: ModeleTache, profil: ProfilMariage, horizonJours: number): boolean {
  if (modele.ceremonie !== "ALL" && !profil.ceremonies.includes(modele.ceremonie)) return false;
  if (modele.repere === "ANTICIPATION" && horizonJours < HORIZON_ANTICIPATION_JOURS) return false;
  // Les tâches secrètes (EVJF/EVG) appartiennent à l'espace des témoins, pas au planning du couple.
  if (modele.repere === "SECRET") return false;
  return conditionRemplie(modele, profil);
}

function priorite(t: TachePlanifiee): number {
  if (t.repere === "LEGAL") return 0;
  if (t.repere === "IMPORTANT") return 1;
  return 2;
}

/**
 * Répartit les tâches dont l'échéance idéale est déjà passée sur les premières semaines,
 * les plus urgentes d'abord, sans jamais dépasser la veille du mariage (M2-11).
 */
function resserrer(taches: TachePlanifiee[], dateDebut: Date, dateMariage: Date): void {
  const enRetard = taches
    .filter((t) => !t.faite && t.dateIdeale < dateDebut)
    .sort((a, b) => priorite(a) - priorite(b) || a.dateIdeale.getTime() - b.dateIdeale.getTime());
  if (enRetard.length === 0) return;

  const joursRestants = Math.max(1, ecartJours(dateDebut, dateMariage));
  // Environ un quart du temps restant, entre 1 et 6 semaines.
  const semaines = Math.min(6, Math.max(1, Math.floor(joursRestants / 7 / 4)));
  const parSemaine = Math.ceil(enRetard.length / semaines);
  const veille = ajouterJours(dateMariage, -1);

  enRetard.forEach((t, i) => {
    const date = ajouterJours(dateDebut, 7 * Math.floor(i / parSemaine));
    t.dateAffichee = date > veille ? (veille < dateDebut ? dateDebut : veille) : date;
    t.resserree = true;
  });
}

export function genererPlanning(modeles: readonly ModeleTache[], profil: ProfilMariage): Planning {
  const dateDebut = normaliser(profil.dateDebut);
  const dateProvisoire = profil.dateMariage === null;
  const dateMariage = profil.dateMariage
    ? normaliser(profil.dateMariage)
    : ajouterMois(dateDebut, MOIS_DATE_PROVISOIRE);
  const horizon = ecartJours(dateDebut, dateMariage);

  const cocheesDOffice = new Set<string>(
    (profil.dejaReserve ?? []).flatMap((p) => [...PRESTATAIRES_RESERVABLES[p]]),
  );

  const taches: TachePlanifiee[] = modeles
    .filter((m) => tacheConcernee(m, profil, horizon))
    .map((m) => {
      const dateIdeale = ajouterJours(ajouterMois(dateMariage, m.decalage.mois), m.decalage.jours);
      const faite = cocheesDOffice.has(m.id);
      return {
        modeleId: m.id,
        titre: m.titre,
        rubrique: m.rubrique,
        sousRubrique: m.sousRubrique,
        repere: m.repere,
        conseil: m.conseil,
        dateIdeale,
        dateAffichee: dateIdeale,
        resserree: false,
        faite,
        cocheeDOffice: faite,
        facultative: m.facultative,
      };
    });

  resserrer(taches, dateDebut, dateMariage);
  taches.sort(
    (a, b) => a.dateAffichee.getTime() - b.dateAffichee.getTime() || priorite(a) - priorite(b),
  );

  return { dateMariage, dateProvisoire, joursRestants: horizon, taches };
}

/** Les prochaines tâches à faire, pour le tableau de bord (M1-02). */
export function prochainesTaches(planning: Planning, nombre = 3): TachePlanifiee[] {
  return planning.taches.filter((t) => !t.faite && !t.facultative).slice(0, nombre);
}
