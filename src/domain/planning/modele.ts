import donnees from "@data/modele-taches.json";
import type { ModeleTache } from "./types";

/** Le modèle de tâches Sereno, versionné dans data/modele-taches.json. */
export const MODELE_TACHES: readonly ModeleTache[] = donnees.taches as ModeleTache[];
export const VERSION_MODELE: number = donnees.version;
