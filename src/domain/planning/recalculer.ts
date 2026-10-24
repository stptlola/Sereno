import { genererPlanning } from "./generer";
import type { ModeleTache, ProfilMariage } from "./types";

// Mise à jour du planning quand le mariage change (date, cérémonies, options) : M2-08, M2-13.
// Les tâches personnelles du couple ne sont jamais touchées ; les tâches faites gardent leurs dates.

export interface TacheExistante {
  modeleId: string;
  faite: boolean;
  masquee: boolean;
  /** Masquée par le couple lui-même : on ne la réaffiche pas. */
  masqueeParLeCouple: boolean;
}

export interface MiseAJourPlanning {
  aCreer: { modeleId: string; dateIdeale: Date; dateAffichee: Date }[];
  aDater: { modeleId: string; dateIdeale: Date; dateAffichee: Date }[];
  aMasquer: string[];
  aReafficher: string[];
}

export function planifierMiseAJour(
  existantes: readonly TacheExistante[],
  modeles: readonly ModeleTache[],
  profil: ProfilMariage,
): MiseAJourPlanning {
  const cible = genererPlanning(modeles, profil);
  const attendues = new Map(cible.taches.map((t) => [t.modeleId, t]));
  const parModele = new Map(existantes.map((e) => [e.modeleId, e]));
  const resultat: MiseAJourPlanning = { aCreer: [], aDater: [], aMasquer: [], aReafficher: [] };

  for (const t of cible.taches) {
    const e = parModele.get(t.modeleId);
    if (!e) resultat.aCreer.push({ modeleId: t.modeleId, dateIdeale: t.dateIdeale, dateAffichee: t.dateAffichee });
    else {
      if (!e.faite) resultat.aDater.push({ modeleId: t.modeleId, dateIdeale: t.dateIdeale, dateAffichee: t.dateAffichee });
      if (e.masquee && !e.masqueeParLeCouple) resultat.aReafficher.push(t.modeleId);
    }
  }
  for (const e of existantes) {
    if (!attendues.has(e.modeleId) && !e.masquee && !e.faite) resultat.aMasquer.push(e.modeleId);
  }
  return resultat;
}
