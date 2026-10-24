"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { preparerMariage } from "@/domain/mariage/preparer";
import { schemaReponses } from "@/domain/mariage/reponses";
import { MODELE_TACHES } from "@/domain/planning";
import { db } from "@/lib/db";
import { envoyer } from "@/lib/email";
import { env } from "@/lib/env";
import { empreinte, nouveauJeton } from "@/lib/jetons";
import { mariageDe, sessionCourante } from "@/lib/session";

const VALIDITE_INVITATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours (M0-07)

async function utilisateur() {
  const session = await sessionCourante();
  if (!session) redirect("/connexion");
  return session.user;
}

/** Enregistre le mariage issu du démarrage (M0-10, M0-13), une seule fois par compte. */
export async function creerMariageDepuisDemarrage(brut: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await utilisateur();
  if (await mariageDe(user.id)) return { ok: true };

  const reponses = schemaReponses.safeParse(brut ?? {});
  if (!reponses.success) return { ok: false, message: "Vos réponses sont incomplètes : reprenez le démarrage." };
  const p = preparerMariage(reponses.data, MODELE_TACHES, new Date());

  await db.$transaction(async (tx) => {
    const mariage = await tx.wedding.create({
      data: {
        ...p.mariage,
        members: { create: { userId: user.id, role: "CREATEUR", joinedAt: new Date() } },
        budgetCategories: {
          create: p.postesBudget.map((b) => ({ name: b.nom, plannedCents: b.prevuCentimes, order: b.ordre })),
        },
        moments: { create: [{ name: "Vin d’honneur" }, { name: "Dîner" }] },
      },
    });
    await tx.task.createMany({
      data: p.taches.map((t) => ({
        weddingId: mariage.id,
        templateId: t.templateId,
        title: t.title,
        tip: t.tip,
        category: t.category,
        idealDate: t.idealDate,
        dueDate: t.dueDate,
        status: t.done ? "FAIT" : "A_FAIRE",
        autoCompleted: t.autoCompleted,
        completedAt: t.done ? new Date() : null,
        createdById: user.id,
      })),
    });
    await tx.activityLog.create({
      data: { weddingId: mariage.id, userId: user.id, entity: "Wedding", entityId: mariage.id, action: "creation" },
    });
  });
  revalidatePath("/tableau-de-bord");
  revalidatePath("/planning");
  return { ok: true };
}

/** Coche ou décoche une tâche (M2-04, M1-02), en gardant l'auteur et l'historique (M0-09). */
export async function basculerTache(formData: FormData): Promise<void> {
  const user = await utilisateur();
  const id = z.string().min(1).parse(formData.get("id"));
  const acces = await mariageDe(user.id);
  if (!acces) redirect("/commencer");
  const tache = await db.task.findFirst({ where: { id, weddingId: acces.mariage.id, witnessOnly: false } });
  if (!tache) return;
  const faite = tache.status !== "FAIT";
  await db.$transaction([
    db.task.update({
      where: { id },
      data: { status: faite ? "FAIT" : "A_FAIRE", completedAt: faite ? new Date() : null, updatedById: user.id },
    }),
    db.activityLog.create({
      data: { weddingId: acces.mariage.id, userId: user.id, entity: "Task", entityId: id, action: faite ? "faite" : "rouverte" },
    }),
  ]);
  revalidatePath("/tableau-de-bord");
  revalidatePath("/planning");
}

export type EtatInvitation = { lien?: string; message?: string; erreur?: string };

/** Crée un lien Co-pilote valable 7 jours, envoyé par e-mail si une adresse est donnée (M0-07). */
export async function inviterCopilote(_: EtatInvitation, formData: FormData): Promise<EtatInvitation> {
  const user = await utilisateur();
  const acces = await mariageDe(user.id);
  if (!acces || acces.role !== "CREATEUR") return { erreur: "Seule la personne qui a créé le mariage peut inviter son ou sa partenaire." };
  const email = z.email().optional().or(z.literal("")).safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) return { erreur: "Cette adresse e-mail ne semble pas valide." };

  const jeton = nouveauJeton();
  await db.invitation.create({
    data: {
      weddingId: acces.mariage.id,
      role: "COPILOTE",
      email: email.data || null,
      tokenHash: empreinte(jeton),
      invitedById: user.id,
      expiresAt: new Date(Date.now() + VALIDITE_INVITATION_MS),
    },
  });
  const lien = `${env().APP_URL}/invitation/${jeton}`;
  if (email.data) {
    await envoyer({
      a: email.data,
      sujet: `${user.name} vous invite à organiser votre mariage sur Sereno`,
      texte: `Bonjour,\n\n${user.name} vous invite à rejoindre l’organisation de votre mariage sur Sereno, avec les mêmes droits. Le lien est valable 7 jours.`,
      lien: { libelle: "Rejoindre l’organisation", url: lien },
    });
  }
  return { lien, message: email.data ? `Invitation envoyée à ${email.data}.` : "Lien créé : copiez-le et envoyez-le à votre partenaire." };
}

/** Invite un témoin (M8-01) : lien valable 7 jours, envoyé par e-mail si une adresse est donnée. */
export async function inviterTemoin(_: EtatInvitation, formData: FormData): Promise<EtatInvitation> {
  const user = await utilisateur();
  const acces = await mariageDe(user.id);
  if (!acces) return { erreur: "Seuls les mariés peuvent inviter leurs témoins." };
  const email = z.email().optional().or(z.literal("")).safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) return { erreur: "Cette adresse e-mail ne semble pas valide." };
  const jeton = nouveauJeton();
  await db.invitation.create({
    data: {
      weddingId: acces.mariage.id,
      role: "TEMOIN",
      email: email.data || null,
      tokenHash: empreinte(jeton),
      invitedById: user.id,
      expiresAt: new Date(Date.now() + VALIDITE_INVITATION_MS),
    },
  });
  const lien = `${env().APP_URL}/invitation/${jeton}`;
  const prenoms = [acces.mariage.partner1Name, acces.mariage.partner2Name].filter(Boolean).join(" et ");
  if (email.data) {
    await envoyer({
      a: email.data,
      sujet: `${prenoms} vous ouvrent leur espace témoin sur Sereno`,
      texte: `Bonjour,\n\n${prenoms} vous ont choisi comme témoin, et vous ouvrent un espace rien qu’à vous sur Sereno : vos missions, la table de chaque invité le jour J, et un coin secret pour préparer l’enterrement de vie de célibataire, invisible des mariés. Le lien est valable 7 jours.`,
      lien: { libelle: "Ouvrir mon espace témoin", url: lien },
    });
  }
  return { lien, message: email.data ? `Invitation envoyée à ${email.data}.` : "Lien créé : copiez-le et envoyez-le à votre témoin." };
}

/** Retire un témoin du mariage (ses tâches secrètes restent aux autres témoins). */
export async function retirerTemoin(formData: FormData): Promise<void> {
  const user = await utilisateur();
  const acces = await mariageDe(user.id);
  if (!acces) return;
  await db.member.deleteMany({ where: { id: z.string().min(1).parse(formData.get("id")), weddingId: acces.mariage.id, role: "TEMOIN" } });
  revalidatePath("/parametres");
}

/** Rejoint le mariage en tant que Co-pilote (M0-08). */
export async function accepterInvitation(formData: FormData): Promise<void> {
  const user = await utilisateur();
  const jeton = z.string().min(20).parse(formData.get("jeton"));
  const invitation = await db.invitation.findUnique({ where: { tokenHash: empreinte(jeton) } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) redirect(`/invitation/${jeton}`);
  // Un témoin peut l'être tout en organisant son propre mariage : on vérifie seulement qu'il n'est pas déjà membre de celui-ci.
  const dejaMembre =
    invitation.role === "TEMOIN"
      ? await db.member.findFirst({ where: { weddingId: invitation.weddingId, userId: user.id } })
      : await mariageDe(user.id);
  if (!dejaMembre) {
    await db.$transaction([
      db.member.create({ data: { weddingId: invitation.weddingId, userId: user.id, role: invitation.role, joinedAt: new Date() } }),
      db.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
      db.activityLog.create({
        data: { weddingId: invitation.weddingId, userId: user.id, entity: "Member", entityId: user.id, action: "rejoint" },
      }),
    ]);
  }
  redirect(invitation.role === "TEMOIN" ? "/temoin" : "/tableau-de-bord");
}
