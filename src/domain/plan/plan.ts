// Plan de table (M5-06 à M5-08, M5-13, M5-20). Fonctions pures : proposition de placement, alertes.

export interface InvitePlan {
  id: string;
  nom: string;
  foyer: string | null;
  cote: "PARTENAIRE_1" | "PARTENAIRE_2" | "COMMUN";
  lien: string | null;
  enfant: boolean;
  accompagnant: boolean;
  /** A besoin d'être près d'une sortie (âge, mobilité). */
  accessibilite: boolean;
  /** Table déjà choisie par le couple (conservée si l'on garde les placements). */
  tableId: string | null;
  /** L'un des mariés : installé d'office à la table d'honneur. */
  marie?: boolean;
}

export interface TablePlan {
  id: string;
  nom: string;
  places: number;
  honneur: boolean;
  x: number;
  y: number;
}

export interface Contrainte {
  a: string;
  b: string;
  type: "ENSEMBLE" | "SEPARES";
}

export interface Placement {
  inviteId: string;
  tableId: string;
  raison: string;
}

export interface Proposition {
  placements: Placement[];
  nonPlaces: { inviteId: string; raison: string }[];
}

export interface OptionsProposition {
  garderPlaces: boolean;
  melangerCotes: boolean;
  /** Positions des sorties sur le plan, pour placer près d'elles ceux qui en ont besoin. */
  sorties: { x: number; y: number }[];
}

const PROCHES = new Set(["parent", "procheParent", "temoin"]);
const sieges = (i: InvitePlan) => (i.accompagnant ? 2 : 1);

/** Regroupe les invités qui doivent être ensemble : même foyer, ou contrainte « ensemble » (union-find). */
export function groupes(invites: readonly InvitePlan[], contraintes: readonly Contrainte[]): InvitePlan[][] {
  const parent = new Map(invites.map((i) => [i.id, i.id]));
  const racine = (x: string): string => {
    const p = parent.get(x)!;
    if (p === x) return x;
    const r = racine(p);
    parent.set(x, r);
    return r;
  };
  const unir = (a: string, b: string) => {
    if (parent.has(a) && parent.has(b)) parent.set(racine(a), racine(b));
  };
  const parFoyer = new Map<string, string>();
  for (const i of invites) {
    if (!i.foyer) continue;
    const premier = parFoyer.get(i.foyer);
    if (premier) unir(premier, i.id);
    else parFoyer.set(i.foyer, i.id);
  }
  for (const c of contraintes) if (c.type === "ENSEMBLE") unir(c.a, c.b);
  const parRacine = new Map<string, InvitePlan[]>();
  for (const i of invites) parRacine.set(racine(i.id), [...(parRacine.get(racine(i.id)) ?? []), i]);
  return [...parRacine.values()];
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Propose un placement. Les tables d'honneur sont laissées au couple. Ordre de traitement : besoins d'accessibilité,
 * puis proches, puis grands groupes ; pour chaque groupe, la table qui a le plus d'affinités et qui le contient en entier.
 */
export function proposerPlan(
  invites: readonly InvitePlan[],
  tables: readonly TablePlan[],
  contraintesDuCouple: readonly Contrainte[],
  options: OptionsProposition,
): Proposition {
  let contraintes = contraintesDuCouple;
  const tablesLibres = tables.filter((t) => !t.honneur);
  const honneur = tables.find((t) => t.honneur);
  const occupation = new Map(tables.map((t) => [t.id, [] as InvitePlan[]]));
  const placements: Placement[] = [];
  const nonPlaces: Proposition["nonPlaces"] = [];
  const separes = contraintes.filter((c) => c.type === "SEPARES");
  const libres = (t: TablePlan) => t.places - occupation.get(t.id)!.reduce((s, i) => s + sieges(i), 0);
  const placer = (i: InvitePlan, t: TablePlan, raison: string) => {
    occupation.get(t.id)!.push(i);
    placements.push({ inviteId: i.id, tableId: t.id, raison });
  };

  // 1. Placements déjà décidés par le couple.
  const aPlacer: InvitePlan[] = [];
  for (const i of invites) {
    const t = i.tableId ? tables.find((x) => x.id === i.tableId) : undefined;
    if (options.garderPlaces && t) placer(i, t, "Placé par vous");
    else aPlacer.push(i);
  }

  // 2. Les mariés à la table d'honneur ; sans table d'honneur, ils restent ensemble comme un groupe.
  const maries = aPlacer.filter((i) => i.marie);
  if (honneur) {
    for (const m of maries) {
      if (libres(honneur) >= sieges(m)) {
        placer(m, honneur, "À la table d’honneur");
        aPlacer.splice(aPlacer.indexOf(m), 1);
      }
    }
  } else if (maries.length === 2) {
    contraintes = [...contraintes, { a: maries[0]!.id, b: maries[1]!.id, type: "ENSEMBLE" }];
  }

  const procheSortie = (t: TablePlan) => (options.sorties.length ? Math.min(...options.sorties.map((s) => distance(s, t))) : 0);
  const procheHonneur = (t: TablePlan) => (honneur ? distance(honneur, t) : 0);
  const conflit = (g: InvitePlan[], t: TablePlan) =>
    separes.some((c) => {
      const ici = new Set(occupation.get(t.id)!.map((i) => i.id));
      const dansG = new Set(g.map((i) => i.id));
      return (dansG.has(c.a) && ici.has(c.b)) || (dansG.has(c.b) && ici.has(c.a)) || (dansG.has(c.a) && dansG.has(c.b));
    });

  const lesGroupes = groupes(aPlacer, contraintes).sort((a, b) => {
    const acc = Number(b.some((i) => i.accessibilite)) - Number(a.some((i) => i.accessibilite));
    if (acc) return acc;
    const pr = Number(b.some((i) => PROCHES.has(i.lien ?? ""))) - Number(a.some((i) => PROCHES.has(i.lien ?? "")));
    if (pr) return pr;
    return b.reduce((s, i) => s + sieges(i), 0) - a.reduce((s, i) => s + sieges(i), 0);
  });

  for (const g of lesGroupes) {
    const taille = g.reduce((s, i) => s + sieges(i), 0);
    const besoinSortie = g.some((i) => i.accessibilite);
    const proche = g.some((i) => PROCHES.has(i.lien ?? ""));
    // Même lien : +2 ; lien différent : -1 (une table libre vaut mieux qu'une table d'inconnus) ; même côté : +1 si l'on ne mélange pas.
    const affinite = (t: TablePlan) =>
      occupation.get(t.id)!.reduce(
        (s, x) => s + (g.some((i) => i.lien && i.lien === x.lien) ? 2 : -1) + (!options.melangerCotes ? (g.some((i) => i.cote === x.cote) ? 1 : -1) : 0),
        0,
      );
    const candidates = tablesLibres
      .filter((t) => libres(t) >= taille && !conflit(g, t))
      .sort(
        (a, b) =>
          (besoinSortie ? procheSortie(a) - procheSortie(b) : 0) ||
          (proche ? procheHonneur(a) - procheHonneur(b) : 0) ||
          affinite(b) - affinite(a) ||
          libres(a) - libres(b),
      );
    const t = candidates[0];
    if (t) {
      const raison = besoinSortie
        ? "Près d’une sortie"
        : proche && honneur
          ? "Près de la table d’honneur"
          : g.length > 1
            ? g.some((i) => i.foyer) && new Set(g.map((i) => i.foyer)).size === 1
              ? "Avec son foyer"
              : "Ensemble, comme demandé"
            : occupation.get(t.id)!.some((x) => g.some((i) => i.lien && i.lien === x.lien))
              ? "Avec des invités qu’il connaît"
              : "Place disponible";
      for (const i of g) placer(i, t, raison);
      continue;
    }
    // Groupe trop grand pour une seule table : on le répartit sans enfreindre les « à séparer ».
    for (const i of [...g].sort((a, b) => Number(a.enfant) - Number(b.enfant))) {
      const t2 = tablesLibres.filter((t) => libres(t) >= sieges(i) && !conflit([i], t)).sort((a, b) => libres(a) - libres(b))[0];
      if (t2) placer(i, t2, "Groupe réparti : aucune table assez grande pour tous");
      else nonPlaces.push({ inviteId: i.id, raison: "Plus assez de places : ajoutez une table ou des chaises." });
    }
  }
  return { placements, nonPlaces };
}

export type Alerte = { niveau: "erreur" | "attention"; message: string; tableId?: string };

/** Alertes du plan (M5-08) : table trop pleine, invités à séparer réunis, enfant sans adulte de son foyer, présents non placés. */
export function alertes(invites: readonly InvitePlan[], tables: readonly TablePlan[], contraintes: readonly Contrainte[]): Alerte[] {
  const res: Alerte[] = [];
  const nom = new Map(invites.map((i) => [i.id, i.nom]));
  for (const t of tables) {
    const assis = invites.filter((i) => i.tableId === t.id);
    const occupe = assis.reduce((s, i) => s + sieges(i), 0);
    if (occupe > t.places) res.push({ niveau: "erreur", tableId: t.id, message: `${t.nom} : ${occupe} personnes pour ${t.places} places.` });
    for (const e of assis.filter((i) => i.enfant && i.foyer)) {
      const adulte = invites.some((i) => i.foyer === e.foyer && !i.enfant);
      if (adulte && !assis.some((i) => i.foyer === e.foyer && !i.enfant))
        res.push({ niveau: "attention", tableId: t.id, message: `${e.nom} est à la ${t.nom}, sans adulte de son foyer.` });
    }
  }
  for (const c of contraintes.filter((c) => c.type === "SEPARES")) {
    const a = invites.find((i) => i.id === c.a);
    const b = invites.find((i) => i.id === c.b);
    if (a?.tableId && a.tableId === b?.tableId) res.push({ niveau: "erreur", tableId: a.tableId, message: `${nom.get(c.a)} et ${nom.get(c.b)} sont à la même table, alors que vous souhaitiez les séparer.` });
  }
  const sansTable = invites.filter((i) => !i.tableId).length;
  if (sansTable) res.push({ niveau: "attention", message: `${sansTable} invité${sansTable > 1 ? "s" : ""} n’${sansTable > 1 ? "ont" : "a"} pas encore de table.` });
  return res;
}
