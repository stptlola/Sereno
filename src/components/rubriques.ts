// Rubriques de l'application, communes à la barre latérale (ordinateur) et au menu « Tout » (mobile).
// Une rubrique « bientôt » ouvre /bientot/[slug] : ce qui arrive, et en attendant ses tâches du planning.

export interface Rubrique {
  slug: string;
  libelle: string;
  href: string;
  bientot?: {
    /** Rubrique du modèle de tâches dont on montre les tâches en attendant. */
    rubriquePlanning: string;
    /** Mots qui filtrent davantage, si la rubrique ne correspond qu'à une partie d'une rubrique du planning. */
    mots?: string[];
    promesse: string;
  };
}

export interface GroupeRubriques {
  titre: string;
  rubriques: Rubrique[];
}

const bientot = (slug: string, libelle: string, rubriquePlanning: string, promesse: string, mots?: string[]): Rubrique => ({
  slug,
  libelle,
  href: `/bientot/${slug}`,
  bientot: { rubriquePlanning, promesse, mots },
});

export const GROUPES: GroupeRubriques[] = [
  {
    titre: "Organiser",
    rubriques: [
      { slug: "accueil", libelle: "Accueil", href: "/tableau-de-bord" },
      { slug: "planning", libelle: "Planning", href: "/planning" },
      { slug: "budget", libelle: "Budget", href: "/budget" },
      { slug: "invites", libelle: "Invités", href: "/invites" },
      { slug: "site", libelle: "Mini-site et réponses", href: "/site" },
      bientot("prestataires", "Prestataires", "Prestataires", "Un carnet pour tous vos prestataires : contacts, devis comparés côte à côte, contrats, et les questions à poser à chaque métier."),
    ],
  },
  {
    titre: "Le grand jour",
    rubriques: [
      bientot("lieux", "Lieux et réception", "Réception", "Le lieu, le traiteur, les boissons, la musique, la déco : tout ce qui fait la réception, avec un menu et un calcul des boissons."),
      bientot("ceremonie", "Cérémonie", "Cérémonie", "Le déroulé de chaque cérémonie, civile, laïque ou religieuse, et un livret prêt à imprimer."),
      { slug: "plan-de-table", libelle: "Plan de table", href: "/plan-de-table" },
      bientot("jour-j", "Jour J", "Jour J", "Le déroulé heure par heure, la checklist du matin, les contacts d’urgence et le plan B météo, sur une vue mobile ultra-simple."),
    ],
  },
  {
    titre: "Les à-côtés",
    rubriques: [
      bientot("tenues", "Tenues et beauté", "Tenues et beauté", "Vos tenues, essayages et retouches, coiffure et maquillage, avec un mode « surprise » pour garder le secret."),
      bientot("cortege", "Cortège et EVJF/EVG", "Cortège et EVJF/EVG", "Votre cortège, ses missions et ses cadeaux, et un espace secret pour que vos témoins préparent l’enterrement de vie de célibataire."),
      bientot("papeterie", "Papeterie", "Papeterie", "Save-the-date, faire-part, menus, marque-places : chaque support suivi, et les envois cochés foyer par foyer."),
      bientot("cadeaux", "Cadeaux", "Cadeaux", "La liste de cadeaux ou la cagnotte, les cadeaux reçus et les remerciements à envoyer."),
      bientot("voyage-de-noces", "Voyage de noces", "Voyage de noces", "Un budget à part, les réservations, les formalités et la valise de votre lune de miel."),
    ],
  },
  {
    titre: "Mon mariage",
    rubriques: [{ slug: "reglages", libelle: "Réglages", href: "/parametres" }],
  },
];

export const TOUTES = GROUPES.flatMap((g) => g.rubriques);
export const rubriqueParSlug = (slug: string) => TOUTES.find((r) => r.slug === slug);
