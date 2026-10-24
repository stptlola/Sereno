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

export interface MembreInvitation {
  id: string;
  prenom: string;
  nom: string | null;
  foyerId: string | null;
  foyer: string | null;
  enfant: boolean;
  reponse: "EN_ATTENTE" | "PRESENT" | "ABSENT";
  cote: string;
  lien: string | null;
}

export interface InvitationListe<T extends MembreInvitation = MembreInvitation> {
  cle: string;
  titre: string;
  /** Prénoms des membres (« Léa, Lily et Marc »), vide pour une personne seule. */
  prenoms: string;
  membres: T[];
  /** Réponse commune, ou « MIXTE » si les membres n'ont pas répondu pareil. */
  reponse: MembreInvitation["reponse"] | "MIXTE";
  cote: string;
  lien: string | null;
}

const enumerer = (noms: string[]) => (noms.length <= 1 ? noms.join("") : `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`);

/**
 * Regroupe les invités par invitation (leur foyer), pour une ligne par invitation dans la liste :
 * « Katy et Hervé Stephant », « Famille Meurisse ». Une personne sans foyer forme sa propre invitation.
 */
export function regrouperParInvitation<T extends MembreInvitation>(invites: readonly T[]): InvitationListe<T>[] {
  const parCle = new Map<string, T[]>();
  for (const g of invites) parCle.set(g.foyerId ?? g.id, [...(parCle.get(g.foyerId ?? g.id) ?? []), g]);
  return [...parCle.entries()].map(([cle, membres]) => {
    // Adultes d'abord, puis l'ordre de saisie (tri stable) : « Katy et Hervé », comme sur l'invitation.
    const tries = [...membres].sort((a, b) => Number(a.enfant) - Number(b.enfant));
    const seul = tries.length === 1;
    const reponses = new Set(tries.map((m) => m.reponse));
    return {
      cle,
      titre: seul ? [tries[0]!.prenom, tries[0]!.nom].filter(Boolean).join(" ") : (tries[0]!.foyer ?? enumerer(tries.map((m) => m.prenom))),
      prenoms: seul ? "" : enumerer(tries.map((m) => m.prenom)),
      membres: tries,
      reponse: reponses.size === 1 ? tries[0]!.reponse : "MIXTE",
      cote: tries[0]!.cote,
      lien: tries.find((m) => !m.enfant)?.lien ?? tries[0]!.lien,
    };
  });
}
