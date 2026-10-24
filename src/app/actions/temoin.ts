"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rechercherInvite } from "@/domain/plan/recherche";
import { accesTemoin } from "@/lib/acces";
import { db } from "@/lib/db";
import { missionsDe } from "@/lib/missions";

// Espace des témoins (M8-01, M8-02, M5-23, préparation secrète de l'EVJF/EVG).
// Un témoin ne voit ni le budget ni la liste complète des invités : seulement ses missions,
// la table d'un invité qu'il cherche, et la préparation secrète partagée entre témoins.

const id = z.string().min(1);

export async function basculerMission(formData: FormData): Promise<void> {
  const { user, mariage } = await accesTemoin();
  const t = await db.task.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id, witnessOnly: false } });
  if (!t || !(await missionsDe(mariage.id, user.name)).some((m) => m.id === t.id)) return;
  const faite = t.status !== "FAIT";
  await db.task.update({ where: { id: t.id }, data: { status: faite ? "FAIT" : "A_FAIRE", completedAt: faite ? new Date() : null, updatedById: user.id } });
  await db.activityLog.create({ data: { weddingId: mariage.id, userId: user.id, entity: "Task", entityId: t.id, action: faite ? "faite-par-temoin" : "rouverte-par-temoin" } });
  revalidatePath("/temoin");
  revalidatePath("/planning");
}

/** Préparation secrète : enregistrée masquée et réservée aux témoins, donc invisible de tous les écrans du couple. */
export async function ajouterTacheSecrete(formData: FormData): Promise<void> {
  const { user, mariage } = await accesTemoin();
  const titre = z.string().trim().min(1).max(160).safeParse(formData.get("title"));
  if (!titre.success) return;
  await db.task.create({ data: { weddingId: mariage.id, title: titre.data, category: "EVJF/EVG", witnessOnly: true, hidden: true, createdById: user.id, assignee: user.name } });
  revalidatePath("/temoin");
}

export async function basculerTacheSecrete(formData: FormData): Promise<void> {
  const { user, mariage } = await accesTemoin();
  const t = await db.task.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id, witnessOnly: true } });
  if (!t) return;
  await db.task.update({ where: { id: t.id }, data: { status: t.status === "FAIT" ? "A_FAIRE" : "FAIT", completedAt: t.status === "FAIT" ? null : new Date(), updatedById: user.id } });
  revalidatePath("/temoin");
}

export async function supprimerTacheSecrete(formData: FormData): Promise<void> {
  const { mariage } = await accesTemoin();
  await db.task.deleteMany({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id, witnessOnly: true } });
  revalidatePath("/temoin");
}

export type ResultatTable = { prenom: string; nom: string | null; table: string | null; place: number | null }[];

/** Retrouver la table d'un invité le jour J (M5-23) : au plus 8 résultats, nom et table seulement. */
export async function rechercherTable(saisie: string): Promise<ResultatTable> {
  const { mariage } = await accesTemoin();
  const invites = await db.guest.findMany({
    where: { weddingId: mariage.id, rsvp: { not: "ABSENT" } },
    select: { firstName: true, lastName: true, seat: true, table: { select: { name: true, number: true, honor: true } } },
  });
  return rechercherInvite(
    String(saisie).slice(0, 60),
    invites.map((g) => ({ prenom: g.firstName, nom: g.lastName, table: g.table ? (g.table.honor ? g.table.name : `Table ${g.table.number} · ${g.table.name}`) : null, place: g.seat })),
  );
}
