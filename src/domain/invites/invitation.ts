import { sansAccents } from "../planning/filtres";

// Ajout « par invitation » (comme sur un faire-part) : une personne, un couple ou une famille,
// avec un foyer créé d'un coup. Remplace le « + 1 » anonyme par une vraie personne à nommer.

export type TypeInvitation = "personne" | "couple" | "famille";

export interface PersonneSaisie {
  prenom: string;
  nom: string;
  enfant: boolean;
}

export interface InvitationPreparee {
  foyer: string | null;
  personnes: { prenom: string; nom: string | null; enfant: boolean; aConfirmer: boolean }[];
}

export const PREFIXE_ACCOMPAGNANT = "Accompagnant de ";

/** Un accompagnant dont le prénom reste à confirmer (créé par la case « avec un accompagnant »). */
export const estAccompagnantAConfirmer = (prenom: string) => prenom.startsWith(PREFIXE_ACCOMPAGNANT);

/**
 * Prépare une invitation : nettoie les saisies, complète le nom de famille commun,
 * et nomme le foyer (« Zoé et Paul Durand », « Famille Durand »).
 */
export function preparerInvitation(type: TypeInvitation, saisies: readonly PersonneSaisie[], nomCommun: string, accompagnant: boolean): InvitationPreparee | { erreur: string } {
  const commun = nomCommun.trim().slice(0, 60);
  const personnes = saisies
    .map((p) => ({ prenom: p.prenom.trim().slice(0, 60), nom: (p.nom.trim() || commun).slice(0, 60) || null, enfant: p.enfant, aConfirmer: false }))
    .filter((p) => p.prenom);
  if (personnes.length === 0) return { erreur: "Indiquez au moins un prénom." };
  if (type === "couple" && personnes.length < 2) return { erreur: "Indiquez les deux prénoms du couple." };
  if (type === "personne" && accompagnant) {
    personnes.push({ prenom: `${PREFIXE_ACCOMPAGNANT}${personnes[0]!.prenom}`, nom: null, enfant: false, aConfirmer: true });
  }
  if (personnes.length === 1) return { foyer: null, personnes };

  const noms = [...new Set(personnes.filter((p) => !p.aConfirmer && p.nom).map((p) => p.nom!))];
  const memeNom = noms.length === 1 ? noms[0]! : null;
  const foyer =
    type === "famille"
      ? `Famille ${memeNom ?? noms[0] ?? personnes[0]!.prenom}`
      : type === "couple"
        ? memeNom
          ? `${personnes[0]!.prenom} et ${personnes[1]!.prenom} ${memeNom}`
          : `${personnes[0]!.prenom} ${personnes[0]!.nom ?? ""} et ${personnes[1]!.prenom} ${personnes[1]!.nom ?? ""}`.replace(/\s+/g, " ").trim()
        : `${personnes[0]!.prenom}${personnes[0]!.nom ? ` ${personnes[0]!.nom}` : ""} et son accompagnant`;
  return { foyer: foyer.slice(0, 80), personnes };
}

/** Clé de tri qui garde les membres d'un même foyer côte à côte dans la liste. */
export function cleTriFoyer(g: { foyer: string | null; nom: string | null; prenom: string; enfant: boolean }): string {
  return `${sansAccents(g.foyer ?? `${g.nom ?? ""} ${g.prenom}`)}|${g.enfant ? 1 : 0}|${sansAccents(g.prenom)}`;
}
