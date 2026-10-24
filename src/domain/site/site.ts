import { sansAccents } from "../planning/filtres";

// Mini-site du mariage et réponses en ligne des invités (M5-01 à M5-05, M5-11, M5-12).

/** Adresse lisible du mini-site, à partir des prénoms : « lea-et-sam ». */
export function adresseSite(prenom1: string, prenom2: string | null): string {
  const base = [prenom1, prenom2].filter(Boolean).map((p) => sansAccents(p!).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  return (base.filter(Boolean).join("-et-") || "notre-mariage").slice(0, 50);
}

/** Adresse valide : lettres minuscules sans accent, chiffres et tirets, 3 à 50 caractères. */
export function adresseValide(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,48})[a-z0-9]$/.test(slug) && !slug.includes("--");
}

export interface QuestionPerso {
  id: string;
  libelle: string;
  type: "texte" | "choix";
  choix: string[];
}

export interface ReponseInvite {
  guestId: string;
  reponse: "PRESENT" | "ABSENT";
  moments: string[];
  regimes: string[];
  allergies: string | null;
}

export interface MembreFoyer {
  id: string;
  momentsInvites: string[];
}

/**
 * Valide les réponses d'un foyer : seuls les membres du foyer, seuls les moments auxquels chacun est convié,
 * et un absent n'est inscrit à aucun moment (M5-03, règle de M5).
 */
export function validerReponses(
  foyer: readonly MembreFoyer[],
  reponses: readonly ReponseInvite[],
  regimesAutorises: readonly string[],
): { valides: ReponseInvite[]; erreur?: string } {
  const parId = new Map(foyer.map((m) => [m.id, m]));
  const valides: ReponseInvite[] = [];
  for (const r of reponses) {
    const membre = parId.get(r.guestId);
    if (!membre) return { valides: [], erreur: "Réponse pour une personne qui ne fait pas partie de cette invitation." };
    valides.push({
      ...r,
      moments: r.reponse === "PRESENT" ? r.moments.filter((m) => membre.momentsInvites.includes(m)) : [],
      regimes: r.reponse === "PRESENT" ? r.regimes.filter((x) => regimesAutorises.includes(x)) : [],
      allergies: r.reponse === "PRESENT" ? (r.allergies?.trim().slice(0, 300) || null) : null,
    });
  }
  if (valides.length !== foyer.length) return { valides: [], erreur: "Merci de répondre pour chaque personne de l’invitation." };
  return { valides };
}

/** Garde seulement les réponses aux questions qui existent, nettoyées et bornées (M5-11). */
export function nettoyerReponsesPerso(questions: readonly QuestionPerso[], brut: Record<string, string>): Record<string, string> {
  const sortie: Record<string, string> = {};
  for (const q of questions) {
    const v = (brut[q.id] ?? "").trim().slice(0, 500);
    if (!v) continue;
    if (q.type === "choix" && !q.choix.includes(v)) continue;
    sortie[q.id] = v;
  }
  return sortie;
}

/** Le formulaire de réponse est-il encore ouvert ? (date limite incluse, M5-05) */
export function reponsesOuvertes(dateLimite: Date | null, aujourdhui: Date): boolean {
  return !dateLimite || aujourdhui.getTime() <= dateLimite.getTime();
}

/** Rapprochement d'un nom saisi par l'invité : prénom et nom identiques, sans accents ni majuscules. */
export function memeNom(a: { prenom: string; nom: string | null }, saisie: { prenom: string; nom: string }): boolean {
  return sansAccents(a.prenom) === sansAccents(saisie.prenom) && sansAccents(a.nom ?? "") === sansAccents(saisie.nom);
}
