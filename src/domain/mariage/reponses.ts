import { z } from "zod";
import { PRESTATAIRES_RESERVABLES } from "../planning/types";

// Réponses du parcours de démarrage (M0-05, M0-11), gardées sur l'appareil
// jusqu'à la création du compte (M0-10), puis envoyées au serveur.

export const CULTES = ["catholique", "protestant", "orthodoxe", "juif", "musulman", "hindou", "bouddhiste", "autre"] as const;

const prestataires = Object.keys(PRESTATAIRES_RESERVABLES) as [keyof typeof PRESTATAIRES_RESERVABLES, ...(keyof typeof PRESTATAIRES_RESERVABLES)[]];

export const schemaReponses = z.object({
  prenom1: z.string().trim().max(60).default(""),
  prenom2: z.string().trim().max(60).default(""),
  /** AAAA-MM-JJ, ou vide si la date n'est pas fixée. */
  date: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Date invalide")
    .default(""),
  invites: z.coerce.number().int().min(0).max(2000).optional().catch(undefined),
  /** Budget en euros. */
  budget: z.coerce.number().min(0).max(10_000_000).optional().catch(undefined),
  ceremonies: z.array(z.enum(["CIVILE", "LAIQUE", "RELIGIEUSE"])).max(3).default(["CIVILE"]),
  /** Culte, si une cérémonie religieuse est prévue. */
  culte: z.enum(CULTES).optional().catch(undefined),
  dejaReserve: z.array(z.enum(prestataires)).max(prestataires.length).default([]),
});

export type Culte = (typeof CULTES)[number];

export type ReponsesDemarrage = z.infer<typeof schemaReponses>;

/** Clé de stockage des réponses dans le navigateur. */
export const CLE_STOCKAGE_DEMARRAGE = "sereno:demarrage";
