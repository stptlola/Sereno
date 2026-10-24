import "server-only";
import { sansAccents } from "@/domain/planning";
import { db } from "./db";

/** Les missions d'un témoin : tâches du couple dont il est responsable, ou confiées « aux témoins ». */
export async function missionsDe(weddingId: string, prenom: string) {
  const taches = await db.task.findMany({ where: { weddingId, hidden: false, witnessOnly: false, assignee: { not: null } }, orderBy: { dueDate: "asc" } });
  const moi = sansAccents(prenom);
  return taches.filter((t) => {
    const a = sansAccents(t.assignee ?? "");
    return a === moi || a.startsWith(`${moi} `) || a.includes("temoin");
  });
}
