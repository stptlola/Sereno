import { memeNom } from "../site/site";

// Collecte d'adresses par lien (M4-11) et plats choisis (M4-16). Fonctions pures.

export interface AdresseSaisie {
  rue: string;
  complement: string;
  codePostal: string;
  ville: string;
  pays: string;
}

/** Met en forme une adresse postale sur plusieurs lignes, prête pour une enveloppe ; erreur si elle est incomplète. */
export function formaterAdresse(a: AdresseSaisie): { adresse: string } | { erreur: string } {
  const rue = a.rue.trim().slice(0, 120);
  const cp = a.codePostal.trim().toUpperCase().slice(0, 12);
  const ville = a.ville.trim().slice(0, 80);
  const pays = a.pays.trim().slice(0, 60);
  if (rue.length < 3) return { erreur: "Indiquez votre numéro et votre rue." };
  if (!/^[0-9A-Z][0-9A-Z -]{1,10}$/.test(cp)) return { erreur: "Ce code postal ne semble pas valide." };
  if (!ville) return { erreur: "Indiquez votre ville." };
  const lignes = [rue, a.complement.trim().slice(0, 120), `${cp} ${ville.toUpperCase()}`, /^france$/i.test(pays) ? "" : pays.toUpperCase()];
  return { adresse: lignes.filter(Boolean).join("\n") };
}

/** L'invité à qui rattacher une adresse reçue : seulement si un et un seul invité porte exactement ce prénom et ce nom. */
export function rattacherAdresse(saisie: { prenom: string; nom: string }, invites: readonly { id: string; prenom: string; nom: string | null }[]): string | null {
  const trouves = invites.filter((i) => memeNom({ prenom: i.prenom, nom: i.nom }, saisie));
  return trouves.length === 1 ? trouves[0]!.id : null;
}

/** Garde un plat seulement s'il fait partie des plats proposés par le couple. */
export function nettoyerPlat(choix: string | null | undefined, options: readonly string[]): string | null {
  const c = (choix ?? "").trim();
  return options.includes(c) ? c : null;
}

/** Nombre de chaque plat parmi les présents, dans l'ordre proposé par le couple, puis les « à choisir ». */
export function compterPlats(invites: readonly { plat: string | null }[], options: readonly string[]): { plat: string; nombre: number }[] {
  const res = options.map((o) => ({ plat: o, nombre: invites.filter((i) => i.plat === o).length }));
  const sans = invites.filter((i) => !i.plat || !options.includes(i.plat)).length;
  return sans ? [...res, { plat: "Pas encore choisi", nombre: sans }] : res;
}
