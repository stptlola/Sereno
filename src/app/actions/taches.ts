"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accesEcriture, lireDateJour } from "@/lib/acces";
import { db } from "@/lib/db";

const texte = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const schemaTache = z.object({
  status: z.enum(["A_FAIRE", "EN_COURS", "FAIT"]),
  assignee: texte(60),
  note: texte(2000),
});

async function journal(weddingId: string, userId: string, entityId: string, action: string) {
  await db.activityLog.create({ data: { weddingId, userId, entity: "Task", entityId, action } });
}

/** Modifie statut, responsable, note et échéance d'une tâche (M2-04 à M2-06). */
export async function modifierTache(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const id = z.string().min(1).parse(formData.get("id"));
  const tache = await db.task.findFirst({ where: { id, weddingId: mariage.id, witnessOnly: false } });
  if (!tache) redirect("/planning");
  const donnees = schemaTache.parse({
    status: formData.get("status"),
    assignee: formData.get("assignee") ?? "",
    note: formData.get("note") ?? "",
  });
  const titre = tache.templateId ? tache.title : z.string().trim().min(1).max(160).catch(tache.title).parse(formData.get("title"));
  const echeance = lireDateJour(formData.get("dueDate"));
  await db.task.update({
    where: { id },
    data: {
      ...donnees,
      title: titre,
      dueDate: echeance ?? tache.dueDate,
      completedAt: donnees.status === "FAIT" ? (tache.completedAt ?? new Date()) : null,
      updatedById: user.id,
    },
  });
  await journal(mariage.id, user.id, id, "modifiee");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/planning");
  redirect("/planning");
}

/** Ajoute une tâche personnelle (M2-05). */
export async function ajouterTache(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const titre = z.string().trim().min(1).max(160).parse(formData.get("title"));
  const donnees = schemaTache.omit({ status: true }).parse({
    assignee: formData.get("assignee") ?? "",
    note: formData.get("note") ?? "",
  });
  const tache = await db.task.create({
    data: {
      weddingId: mariage.id,
      title: titre,
      category: "Personnel",
      dueDate: lireDateJour(formData.get("dueDate")),
      ...donnees,
      createdById: user.id,
      updatedById: user.id,
    },
  });
  await journal(mariage.id, user.id, tache.id, "creee");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/planning");
  redirect("/planning");
}

/**
 * Retire une tâche du planning : une tâche personnelle est supprimée ; une tâche du modèle est masquée
 * (pour qu'un recalcul ne la recrée pas), et reste réaffichable.
 */
export async function retirerTache(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const id = z.string().min(1).parse(formData.get("id"));
  const tache = await db.task.findFirst({ where: { id, weddingId: mariage.id, witnessOnly: false } });
  if (tache) {
    if (tache.templateId) await db.task.update({ where: { id }, data: { hidden: true, hiddenByCouple: true, updatedById: user.id } });
    else await db.task.delete({ where: { id } });
    await journal(mariage.id, user.id, id, tache.templateId ? "masquee" : "supprimee");
  }
  revalidatePath("/tableau-de-bord");
  revalidatePath("/planning");
  redirect("/planning");
}

export async function reafficherTache(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const id = z.string().min(1).parse(formData.get("id"));
  await db.task.updateMany({ where: { id, weddingId: mariage.id, witnessOnly: false }, data: { hidden: false, hiddenByCouple: false, updatedById: user.id } });
  await journal(mariage.id, user.id, id, "reaffichee");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/planning");
}
