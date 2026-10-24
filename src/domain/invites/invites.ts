import { sansAccents } from "../planning/filtres";

// Invités (M4-01 à M4-10, M4-17, M4-19). Fonctions pures : comptage, doublons, import et export CSV.

export type Cote = "PARTENAIRE_1" | "PARTENAIRE_2" | "COMMUN";
export type Reponse = "EN_ATTENTE" | "PRESENT" | "ABSENT";
export type TrancheAge = "ADULTE" | "ENFANT";

/** Lien avec le couple, en termes neutres (M4-17). */
export const LIENS = [
  { cle: "parent", libelle: "Parent" },
  { cle: "procheParent", libelle: "Famille proche" },
  { cle: "famille", libelle: "Famille" },
  { cle: "amiProche", libelle: "Ami proche" },
  { cle: "ami", libelle: "Ami" },
  { cle: "collegue", libelle: "Collègue" },
  { cle: "temoin", libelle: "Témoin" },
  { cle: "cortege", libelle: "Cortège" },
  { cle: "enfantHonneur", libelle: "Enfant d’honneur" },
  { cle: "porteAlliances", libelle: "Porte-alliances" },
  { cle: "autre", libelle: "Autre" },
] as const;
export type Lien = (typeof LIENS)[number]["cle"];
export const libelleLien = (cle: string | null | undefined) => LIENS.find((l) => l.cle === cle)?.libelle ?? "Sans lien précisé";

export const REGIMES = ["Végétarien", "Végan", "Sans gluten", "Sans porc", "Halal", "Casher", "Autre"] as const;

export interface Invite {
  prenom: string;
  nom: string | null;
  cote: Cote;
  lien: string | null;
  age: TrancheAge;
  email: string | null;
  reponse: Reponse;
  regimes: string[];
  accompagnant: boolean;
  moments: string[];
}

export interface Compteurs {
  personnes: number;
  presents: number;
  absents: number;
  enAttente: number;
  enfants: number;
  repasSpeciaux: number;
  parMoment: Record<string, number>;
  parCote: Record<Cote, number>;
}

/**
 * Compte les personnes : un invité avec un « +1 » compte pour deux (M4-03, M4-07).
 * Les moments ne comptent que les présents.
 */
export function compter(invites: readonly Invite[]): Compteurs {
  const c: Compteurs = { personnes: 0, presents: 0, absents: 0, enAttente: 0, enfants: 0, repasSpeciaux: 0, parMoment: {}, parCote: { PARTENAIRE_1: 0, PARTENAIRE_2: 0, COMMUN: 0 } };
  for (const i of invites) {
    const n = i.accompagnant ? 2 : 1;
    c.personnes += n;
    c.parCote[i.cote] += n;
    if (i.reponse === "PRESENT") {
      c.presents += n;
      if (i.regimes.length) c.repasSpeciaux += 1;
      for (const m of i.moments) c.parMoment[m] = (c.parMoment[m] ?? 0) + n;
    } else if (i.reponse === "ABSENT") c.absents += n;
    else c.enAttente += n;
    if (i.age === "ENFANT") c.enfants += 1;
  }
  return c;
}

/** Répartition par côté en pourcentages arrondis qui font 100 (M4-19). */
export function repartition(parCote: Record<Cote, number>): { p1: number; p2: number; commun: number } {
  const total = parCote.PARTENAIRE_1 + parCote.PARTENAIRE_2 + parCote.COMMUN;
  if (!total) return { p1: 0, p2: 0, commun: 0 };
  const p1 = Math.round((parCote.PARTENAIRE_1 / total) * 100);
  const p2 = Math.round((parCote.PARTENAIRE_2 / total) * 100);
  return { p1, p2, commun: Math.max(0, 100 - p1 - p2) };
}

const cleNom = (prenom: string, nom: string | null) => `${sansAccents(prenom)}|${sansAccents(nom ?? "")}`;

/** Doublons probables : même prénom et nom, ou même adresse e-mail (M4-10). */
export function doublonDe(nouveau: Pick<Invite, "prenom" | "nom" | "email">, existants: readonly (Pick<Invite, "prenom" | "nom" | "email"> & { id: string })[]): string | null {
  const cle = cleNom(nouveau.prenom, nouveau.nom);
  const email = nouveau.email ? sansAccents(nouveau.email) : null;
  const trouve = existants.find((e) => (nouveau.nom && cleNom(e.prenom, e.nom) === cle) || (email && e.email && sansAccents(e.email) === email));
  return trouve?.id ?? null;
}

// ---------- CSV (séparateur « ; », lisible directement par Excel en français)

const COLONNES = ["Prénom", "Nom", "Côté", "Lien", "Enfant", "Accompagnant", "Réponse", "Régimes", "Allergies", "E-mail", "Téléphone", "Foyer", "Table"] as const;

function cellule(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface LigneExport {
  prenom: string;
  nom: string | null;
  cote: string;
  lien: string;
  enfant: boolean;
  accompagnant: boolean;
  reponse: string;
  regimes: string[];
  allergies: string | null;
  email: string | null;
  telephone: string | null;
  foyer: string | null;
  table: string | null;
}

export function versCsv(lignes: readonly LigneExport[]): string {
  const entete = COLONNES.join(";");
  const corps = lignes.map((l) =>
    [l.prenom, l.nom, l.cote, l.lien, l.enfant ? "Oui" : "Non", l.accompagnant ? "Oui" : "Non", l.reponse, l.regimes.join(", "), l.allergies, l.email, l.telephone, l.foyer, l.table].map(cellule).join(";"),
  );
  // Marque UTF-8 en tête : Excel affiche alors correctement les accents.
  return "\uFEFF" + [entete, ...corps].join("\r\n") + "\r\n";
}

/** Découpe un CSV (« ; » ou « , »), en gérant les guillemets et les retours à la ligne dans les cellules. */
export function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^\uFEFF/, "");
  const premiere = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (premiere.match(/;/g)?.length ?? 0) >= (premiere.match(/,/g)?.length ?? 0) ? ";" : ",";
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cel = "";
  let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (guillemets) {
      if (ch === '"' && t[i + 1] === '"') {
        cel += '"';
        i++;
      } else if (ch === '"') guillemets = false;
      else cel += ch;
    } else if (ch === '"') guillemets = true;
    else if (ch === sep) {
      ligne.push(cel);
      cel = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      ligne.push(cel);
      lignes.push(ligne);
      ligne = [];
      cel = "";
    } else cel += ch;
  }
  if (cel || ligne.length) {
    ligne.push(cel);
    lignes.push(ligne);
  }
  return lignes.filter((l) => l.some((c) => c.trim()));
}

export interface InviteImporte {
  prenom: string;
  nom: string | null;
  cote: Cote;
  lien: string | null;
  age: TrancheAge;
  accompagnant: boolean;
  reponse: Reponse;
  regimes: string[];
  allergies: string | null;
  email: string | null;
  telephone: string | null;
  foyer: string | null;
}

export interface ResultatImport {
  invites: InviteImporte[];
  erreurs: { ligne: number; message: string }[];
  colonnesReconnues: string[];
}

const ALIAS: Record<keyof InviteImporte, string[]> = {
  prenom: ["prenom", "prénom", "first name", "firstname"],
  nom: ["nom", "nom de famille", "last name", "lastname"],
  cote: ["cote", "côté", "side"],
  lien: ["lien", "categorie", "catégorie", "relation"],
  age: ["enfant", "adulte ou enfant", "age", "âge"],
  accompagnant: ["accompagnant", "+1", "plus one"],
  reponse: ["reponse", "réponse", "statut", "rsvp"],
  regimes: ["regimes", "régimes", "regime", "régime"],
  allergies: ["allergies", "allergie"],
  email: ["e-mail", "email", "mail", "courriel"],
  telephone: ["telephone", "téléphone", "tel", "portable", "phone"],
  foyer: ["foyer", "famille", "household"],
};

const oui = (v: string) => ["oui", "o", "yes", "y", "x", "1", "vrai", "true", "enfant"].includes(sansAccents(v));

/**
 * Lit un fichier d'invités : les colonnes sont reconnues par leur nom, dans n'importe quel ordre (M4-09).
 * Les erreurs sont listées ligne par ligne, sans bloquer les lignes valides.
 */
export function importer(texte: string, prenoms: { p1: string; p2: string | null }): ResultatImport {
  const lignes = lireCsv(texte);
  const [entete, ...corps] = lignes;
  if (!entete) return { invites: [], erreurs: [{ ligne: 1, message: "Le fichier est vide." }], colonnesReconnues: [] };
  const index: Partial<Record<keyof InviteImporte, number>> = {};
  entete.forEach((h, i) => {
    const n = sansAccents(h);
    for (const [cle, alias] of Object.entries(ALIAS) as [keyof InviteImporte, string[]][]) {
      if (index[cle] === undefined && alias.some((a) => sansAccents(a) === n)) index[cle] = i;
    }
  });
  if (index.prenom === undefined)
    return { invites: [], erreurs: [{ ligne: 1, message: "Colonne « Prénom » introuvable : vérifiez la première ligne du fichier." }], colonnesReconnues: [] };

  const lire = (l: string[], c: keyof InviteImporte) => (index[c] === undefined ? "" : (l[index[c]!] ?? "").trim());
  const p1 = sansAccents(prenoms.p1);
  const p2 = prenoms.p2 ? sansAccents(prenoms.p2) : null;
  const invites: InviteImporte[] = [];
  const erreurs: ResultatImport["erreurs"] = [];

  corps.forEach((l, k) => {
    const numero = k + 2;
    const prenom = lire(l, "prenom");
    if (!prenom) return erreurs.push({ ligne: numero, message: "Prénom manquant : ligne ignorée." });
    const email = lire(l, "email") || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erreurs.push({ ligne: numero, message: `Adresse e-mail « ${email} » invalide : elle n’a pas été reprise.` });
    const cote = sansAccents(lire(l, "cote"));
    const reponse = sansAccents(lire(l, "reponse"));
    const lienSaisi = sansAccents(lire(l, "lien"));
    invites.push({
      prenom: prenom.slice(0, 60),
      nom: lire(l, "nom").slice(0, 60) || null,
      cote: cote && (cote === p1 || cote === "partenaire 1" || cote === "1") ? "PARTENAIRE_1" : cote && (cote === p2 || cote === "partenaire 2" || cote === "2") ? "PARTENAIRE_2" : "COMMUN",
      lien: LIENS.find((x) => sansAccents(x.libelle) === lienSaisi || sansAccents(x.cle) === lienSaisi)?.cle ?? (lienSaisi ? "autre" : null),
      age: oui(lire(l, "age")) ? "ENFANT" : "ADULTE",
      accompagnant: oui(lire(l, "accompagnant")),
      reponse: ["present", "présent", "oui", "confirme", "confirmé"].map(sansAccents).includes(reponse) ? "PRESENT" : ["absent", "non", "decline", "décliné"].map(sansAccents).includes(reponse) ? "ABSENT" : "EN_ATTENTE",
      regimes: lire(l, "regimes")
        .split(/[,/]/)
        .map((r) => REGIMES.find((x) => sansAccents(x) === sansAccents(r)) ?? null)
        .filter((r): r is (typeof REGIMES)[number] => r !== null),
      allergies: lire(l, "allergies").slice(0, 300) || null,
      email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 120) : null,
      telephone: lire(l, "telephone").slice(0, 30) || null,
      foyer: lire(l, "foyer").slice(0, 80) || null,
    });
  });
  return { invites, erreurs, colonnesReconnues: (Object.keys(index) as (keyof InviteImporte)[]).filter((k) => index[k] !== undefined) };
}
