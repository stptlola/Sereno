// Charge le modèle de tâches Sereno dans la base (table TaskTemplate).
// Idempotent : peut être relancé à chaque déploiement sans créer de doublons.
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const fichier = new URL("../data/modele-taches.json", import.meta.url);
const { version, taches } = JSON.parse(await readFile(fichier, "utf8"));

try {
  for (const t of taches) {
    const donnees = {
      titre: t.titre,
      rubrique: t.rubrique,
      sousRubrique: t.sousRubrique,
      ceremonie: t.ceremonie,
      repere: t.repere,
      decalageMois: t.decalage.mois,
      decalageJours: t.decalage.jours,
      libelleEcheance: t.libelleEcheance,
      condition: t.condition,
      facultative: t.facultative,
      conseil: t.conseil,
      ordre: t.ordre,
      version,
    };
    await db.taskTemplate.upsert({ where: { id: t.id }, create: { id: t.id, ...donnees }, update: donnees });
  }
  console.log(`Modèle de tâches v${version} : ${taches.length} tâches à jour.`);
} finally {
  await db.$disconnect();
}
