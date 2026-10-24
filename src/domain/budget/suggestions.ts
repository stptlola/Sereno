// Sous-postes suggérés par poste (M3-13), tirés de l'analyse des planners et du tableau de la vidéo.
export const SUGGESTIONS: Record<string, string[]> = {
  "Lieu et réception": ["Location du lieu", "Location du chapiteau", "Mobilier et vaisselle", "Éclairage", "Signalétique et livre d’or", "Lieu des préparatifs", "Nuit de noces", "Hébergement des invités"],
  "Traiteur et boissons": ["Traiteur du dîner", "Cocktail du vin d’honneur", "Boissons", "Pièce montée ou gâteau", "Snack de fin de soirée", "Brunch du lendemain", "Repas des prestataires"],
  Tenues: ["Tenue 1", "Tenue 2", "Retouches", "Chaussures", "Accessoires et bijoux", "Tenues des enfants d’honneur"],
  Beauté: ["Essai coiffure", "Coiffure du jour J", "Essai maquillage", "Maquillage du jour J", "Ongles et soins"],
  "Photo et vidéo": ["Photographe", "Vidéaste", "Album photo", "Photobooth"],
  "Animation et musique": ["DJ ou musiciens", "Sono et micros", "Animations", "Garde des enfants", "Cours de danse"],
  "Déco et fleurs": ["Fleuriste", "Décoration florale", "Décoration des tables", "Bougies et accessoires"],
  Alliances: ["Alliances", "Gravure"],
  Papeterie: ["Save-the-date", "Faire-part", "Timbres et envoi", "Menus et marque-places", "Livret de cérémonie", "Cartes de remerciement"],
  Transport: ["Véhicule des mariés", "Navette des invités", "Taxis"],
  "Divers et imprévus": ["Cadeaux des invités", "Cadeaux du cortège", "Assurance annulation", "Participation aux frais de la cérémonie", "Créateur de contenu", "Imprévus"],
};

/** Suggestions pas encore utilisées dans ce poste. */
export function suggestionsRestantes(poste: string, libellesExistants: readonly string[], prenoms: [string, string?]): string[] {
  const deja = new Set(libellesExistants.map((l) => l.toLowerCase()));
  return (SUGGESTIONS[poste] ?? [])
    .map((s) => (s === "Tenue 1" ? `Tenue de ${prenoms[0]}` : s === "Tenue 2" ? (prenoms[1] ? `Tenue de ${prenoms[1]}` : "") : s))
    .filter((s) => s && !deja.has(s.toLowerCase()));
}
