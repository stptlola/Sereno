"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formaterAdresse, rattacherAdresse } from "@/domain/invites/adresses";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { nouveauJeton } from "@/lib/jetons";

// Collecte d'adresses par lien (M4-11) : un lien public par mariage ; l'invité laisse son adresse,
// rattachée d'office si son nom correspond sans ambiguïté, sinon mise de côté pour le couple.

const id = z.string().min(1);

export async function activerCollecte(): Promise<void> {
  const { mariage } = await accesEcriture();
  if (!mariage.addressToken) await db.wedding.update({ where: { id: mariage.id }, data: { addressToken: nouveauJeton().slice(0, 22) } });
  revalidatePath("/invites");
}

export async function desactiverCollecte(): Promise<void> {
  const { mariage } = await accesEcriture();
  await db.wedding.update({ where: { id: mariage.id }, data: { addressToken: null } });
  revalidatePath("/invites");
}

/** Enregistre l'adresse sur le foyer de l'invité (créé au besoin), avec son e-mail et son téléphone s'ils sont donnés. */
async function appliquer(weddingId: string, guestId: string, adresse: string, email: string | null, phone: string | null) {
  const g = await db.guest.findFirstOrThrow({ where: { id: guestId, weddingId } });
  const foyerId = g.householdId ?? (await db.household.create({ data: { weddingId, name: [g.firstName, g.lastName].filter(Boolean).join(" ") } })).id;
  await db.$transaction([
    db.household.update({ where: { id: foyerId }, data: { address: adresse } }),
    db.guest.update({ where: { id: g.id }, data: { householdId: foyerId, email: email ?? g.email, phone: phone ?? g.phone } }),
  ]);
}

export type EtatAdresse = { erreur?: string };

/** Formulaire public : aucune connexion, le lien suffit. */
export async function envoyerAdresse(_: EtatAdresse, formData: FormData): Promise<EtatAdresse> {
  const jeton = z.string().min(10).max(40).parse(formData.get("jeton"));
  const mariage = await db.wedding.findUnique({ where: { addressToken: jeton } });
  if (!mariage) redirect(`/adresses/${jeton}`);
  if (String(formData.get("site") ?? "")) redirect(`/adresses/${jeton}?merci=1`); // champ piège pour les robots
  const prenom = String(formData.get("prenom") ?? "").trim().slice(0, 60);
  const nom = String(formData.get("nom") ?? "").trim().slice(0, 60);
  if (!prenom || !nom) return { erreur: "Indiquez votre prénom et votre nom." };
  const f = formaterAdresse({
    rue: String(formData.get("rue") ?? ""),
    complement: String(formData.get("complement") ?? ""),
    codePostal: String(formData.get("codePostal") ?? ""),
    ville: String(formData.get("ville") ?? ""),
    pays: String(formData.get("pays") ?? "France"),
  });
  if ("erreur" in f) return { erreur: f.erreur };
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim());
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30) || null;
  const invites = await db.guest.findMany({ where: { weddingId: mariage.id, isCouple: false }, select: { id: true, firstName: true, lastName: true } });
  const guestId = rattacherAdresse({ prenom, nom }, invites.map((g) => ({ id: g.id, prenom: g.firstName, nom: g.lastName })));
  if (guestId) await appliquer(mariage.id, guestId, f.adresse, email.success ? email.data : null, phone);
  await db.addressSubmission.create({
    data: { weddingId: mariage.id, firstName: prenom, lastName: nom, address: f.adresse, email: email.success ? email.data : null, phone, guestId, status: guestId ? "RATTACHEE" : "A_TRIER" },
  });
  revalidatePath("/invites");
  redirect(`/adresses/${jeton}?merci=1`);
}

/** Le couple rattache une adresse reçue à l'un de ses invités. */
export async function associerAdresse(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const sub = await db.addressSubmission.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  const guestId = id.safeParse(formData.get("guestId"));
  if (!sub || !guestId.success) return;
  await appliquer(mariage.id, guestId.data, sub.address, sub.email, sub.phone);
  await db.addressSubmission.update({ where: { id: sub.id }, data: { guestId: guestId.data, status: "RATTACHEE" } });
  revalidatePath("/invites");
}

/** Le couple ajoute à sa liste la personne qui a laissé son adresse. */
export async function ajouterDepuisAdresse(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const sub = await db.addressSubmission.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  if (!sub) return;
  const foyer = await db.household.create({ data: { weddingId: mariage.id, name: `${sub.firstName} ${sub.lastName}`, address: sub.address } });
  const g = await db.guest.create({ data: { weddingId: mariage.id, householdId: foyer.id, firstName: sub.firstName, lastName: sub.lastName, email: sub.email, phone: sub.phone } });
  await db.addressSubmission.update({ where: { id: sub.id }, data: { guestId: g.id, status: "RATTACHEE" } });
  revalidatePath("/invites");
}

export async function ignorerAdresse(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  await db.addressSubmission.updateMany({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id }, data: { status: "IGNOREE" } });
  revalidatePath("/invites");
}
