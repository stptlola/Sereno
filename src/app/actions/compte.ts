"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envoyer } from "@/lib/email";
import { env } from "@/lib/env";
import { sessionCourante } from "@/lib/session";

async function utilisateur() {
  const session = await sessionCourante();
  if (!session) redirect("/connexion");
  return session.user;
}

export type EtatCompte = { message?: string; erreur?: string };

/** Préférences d'e-mails (M11-06). */
export async function modifierNotifications(_: EtatCompte, formData: FormData): Promise<EtatCompte> {
  const user = await utilisateur();
  await db.user.update({
    where: { id: user.id },
    data: { notifHebdo: formData.get("notifHebdo") === "on", notifRappels: formData.get("notifRappels") === "on", notifReponses: formData.get("notifReponses") === "on" },
  });
  revalidatePath("/parametres");
  return { message: "Vos préférences d’e-mails sont enregistrées." };
}

/** Prénom affiché (M12-02). */
export async function modifierProfil(_: EtatCompte, formData: FormData): Promise<EtatCompte> {
  const user = await utilisateur();
  const nom = z.string().trim().min(1, "Indiquez votre prénom.").max(60).safeParse(formData.get("name"));
  if (!nom.success) return { erreur: nom.error.issues[0]?.message };
  await db.user.update({ where: { id: user.id }, data: { name: nom.data } });
  revalidatePath("/parametres");
  return { message: "C’est enregistré." };
}

/**
 * Suppression du compte et des données (M12-04), après confirmation écrite.
 * Si un co-pilote existe, le mariage lui est transmis et il est prévenu ; sinon le mariage est supprimé avec tout son contenu.
 */
export async function supprimerCompte(_: EtatCompte, formData: FormData): Promise<EtatCompte> {
  const user = await utilisateur();
  if (String(formData.get("confirmation") ?? "").trim().toUpperCase() !== "SUPPRIMER") return { erreur: "Tapez SUPPRIMER pour confirmer." };

  const membres = await db.member.findMany({ where: { userId: user.id }, include: { wedding: { include: { members: { include: { user: true } } } } } });
  const aPrevenir: { email: string; prenom: string }[] = [];
  await db.$transaction(async (tx) => {
    for (const m of membres) {
      const autres = m.wedding.members.filter((x) => x.userId !== user.id && x.role !== "TEMOIN");
      if (autres.length === 0) {
        await tx.wedding.delete({ where: { id: m.weddingId } });
      } else if (m.role === "CREATEUR") {
        const successeur = autres[0]!;
        await tx.member.update({ where: { id: successeur.id }, data: { role: "CREATEUR" } });
        aPrevenir.push({ email: successeur.user.email, prenom: successeur.user.name });
      } else {
        aPrevenir.push(...autres.map((a) => ({ email: a.user.email, prenom: a.user.name })));
      }
    }
    await tx.user.delete({ where: { id: user.id } });
  });
  for (const p of aPrevenir) {
    await envoyer({
      a: p.email,
      sujet: `${user.name} a supprimé son compte Sereno`,
      texte: `Bonjour ${p.prenom},\n\n${user.name} a supprimé son compte Sereno. Votre mariage et toute votre organisation restent intacts : vous en êtes maintenant le ou la seule responsable, et vous pourrez inviter à nouveau votre partenaire quand vous le souhaitez.`,
      lien: { libelle: "Ouvrir mon planning", url: `${env().APP_URL}/tableau-de-bord` },
    });
  }
  // Les sessions ont été supprimées avec le compte ; on efface aussi le cookie.
  await auth().api.signOut({ headers: await headers() }).catch(() => undefined);
  redirect("/?compte=supprime");
}

export type EtatContact = { envoye?: boolean; erreur?: string };

/** Formulaire de contact (M12-06) : message transmis au support, accusé de réception à la personne. */
export async function contacter(_: EtatContact, formData: FormData): Promise<EtatContact> {
  if (String(formData.get("site") ?? "")) return { envoye: true }; // champ piège pour les robots
  const donnees = z
    .object({
      nom: z.string().trim().min(1, "Indiquez votre prénom.").max(80),
      email: z.email("Cette adresse e-mail ne semble pas valide."),
      message: z.string().trim().min(10, "Votre message est un peu court.").max(5000),
    })
    .safeParse({ nom: formData.get("nom"), email: String(formData.get("email") ?? "").trim(), message: formData.get("message") });
  if (!donnees.success) return { erreur: donnees.error.issues[0]?.message };
  const e = env();
  const support = e.SUPPORT_EMAIL ?? (/<([^>]+)>/.exec(e.MAIL_FROM)?.[1] ?? e.MAIL_FROM);
  await envoyer({ a: support, repondreA: donnees.data.email, sujet: `Contact Sereno : ${donnees.data.nom}`, texte: `De : ${donnees.data.nom} <${donnees.data.email}>\n\n${donnees.data.message}` });
  await envoyer({
    a: donnees.data.email,
    sujet: "Nous avons bien reçu votre message",
    texte: `Bonjour ${donnees.data.nom},\n\nMerci pour votre message, il est bien arrivé. Nous vous répondons au plus vite, en général sous deux jours ouvrés.`,
  });
  return { envoye: true };
}
