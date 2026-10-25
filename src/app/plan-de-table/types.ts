export interface TableVue {
  id: string;
  nom: string;
  numero: number;
  forme: "RONDE" | "RECTANGLE" | "OVALE" | "CARREE" | "DEMI_LUNE";
  places: number;
  honneur: boolean;
  x: number;
  y: number;
  rotation: number;
  invites: { id: string; nom: string; place: number | null; enfant: boolean; accompagnant: boolean; regimes: string[]; cote: string }[];
}

export interface ElementVue {
  id: string;
  type: string;
  libelle: string;
  x: number;
  y: number;
  largeur: number;
  profondeur: number;
  rotation: number;
}

export interface InviteVue {
  id: string;
  nom: string;
  cote: string;
  accompagnant: boolean;
  enfant: boolean;
  reponse: string;
}

/** Taille d'une table sur le plan (cm), selon sa forme et son nombre de places. */
export function tailleTable(t: Pick<TableVue, "forme" | "places">): { l: number; p: number } {
  const n = t.places;
  switch (t.forme) {
    case "RONDE":
      return { l: Math.max(120, 30 * n), p: Math.max(120, 30 * n) };
    case "OVALE":
      return { l: Math.max(160, 40 * n), p: Math.max(110, 22 * n) };
    case "CARREE":
      return { l: Math.max(90, 25 * n), p: Math.max(90, 25 * n) };
    case "DEMI_LUNE":
      return { l: Math.max(160, 35 * n), p: Math.max(90, 18 * n) };
    default:
      return { l: Math.max(120, 35 * Math.ceil(n / 2)), p: 90 };
  }
}

export interface PositionPlace {
  numero: number;
  x: number;
  y: number;
}

const ECART = 34;

/**
 * Position des places autour d'une table (M5-17), en centimètres par rapport à son centre, avant rotation.
 * Ronde et ovale : tout autour ; rectangulaire : sur les deux grands côtés ; carrée : sur les quatre côtés ;
 * demi-lune (table d'honneur) : face à la salle, sur le côté droit.
 */
export function positionsPlaces(t: Pick<TableVue, "forme" | "places">, nombre = t.places): PositionPlace[] {
  const { l, p } = tailleTable(t);
  const n = Math.max(1, nombre);
  const places: PositionPlace[] = [];
  const reparti = (k: number, longueur: number) => Array.from({ length: k }, (_, i) => -longueur / 2 + (longueur * (i + 0.5)) / k);
  switch (t.forme) {
    case "RONDE":
    case "OVALE": {
      const rx = l / 2 + ECART;
      const ry = (t.forme === "RONDE" ? l : p) / 2 + ECART;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
        places.push({ numero: i + 1, x: Math.cos(a) * rx, y: Math.sin(a) * ry });
      }
      break;
    }
    case "CARREE": {
      const parCote = [0, 1, 2, 3].map((c) => Math.floor(n / 4) + (c < n % 4 ? 1 : 0));
      let num = 1;
      parCote.forEach((k, c) => {
        for (const d of reparti(k, l)) {
          const [x, y] = c === 0 ? [d, -p / 2 - ECART] : c === 1 ? [l / 2 + ECART, d] : c === 2 ? [-d, p / 2 + ECART] : [-l / 2 - ECART, -d];
          places.push({ numero: num++, x, y });
        }
      });
      break;
    }
    case "DEMI_LUNE": {
      for (const [i, d] of reparti(n, l).entries()) places.push({ numero: i + 1, x: d, y: -p / 2 - ECART });
      break;
    }
    default: {
      const haut = Math.ceil(n / 2);
      reparti(haut, l).forEach((d, i) => places.push({ numero: i + 1, x: d, y: -p / 2 - ECART }));
      reparti(n - haut, l).forEach((d, i) => places.push({ numero: haut + i + 1, x: d, y: p / 2 + ECART }));
    }
  }
  return places;
}

/** Applique la rotation de la table à une position de place. */
export function tourner(x: number, y: number, degres: number): { x: number; y: number } {
  const a = (degres * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}

/** Couleurs des pastilles d'invités, selon le côté : l'or, le charbon, ou le grège pour les invités communs. */
export function couleursCote(cote: string): { fond: string; texte: string } {
  if (cote === "PARTENAIRE_1") return { fond: "var(--color-or)", texte: "var(--color-ink)" };
  if (cote === "PARTENAIRE_2") return { fond: "var(--color-ink)", texte: "var(--color-surface)" };
  return { fond: "var(--color-grege)", texte: "var(--color-ink)" };
}

export const initiales = (nom: string) =>
  nom
    .split(" ")
    .filter(Boolean)
    .map((m) => m[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
