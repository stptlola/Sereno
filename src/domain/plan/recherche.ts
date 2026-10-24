import { sansAccents } from "../planning/filtres";

// Retrouver la table d'un invité le jour J (M5-23), depuis l'espace des témoins.

export interface InviteTable {
  prenom: string;
  nom: string | null;
  table: string | null;
  place: number | null;
}

/** Recherche tolérante : sans accents ni majuscules, sur le prénom et le nom, mot par mot. Au plus 8 résultats. */
export function rechercherInvite<T extends InviteTable>(saisie: string, invites: readonly T[]): T[] {
  const mots = sansAccents(saisie).split(/\s+/).filter((m) => m.length >= 2);
  if (!mots.length) return [];
  return invites
    .filter((i) => {
      const texte = sansAccents(`${i.prenom} ${i.nom ?? ""}`);
      return mots.every((m) => texte.split(/\s+/).some((x) => x.startsWith(m)));
    })
    .slice(0, 8);
}
