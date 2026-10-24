"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { doublonDe, importer, LIENS, REGIMES } from "@/domain/invites/invites";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";

const id = z.string().min(1);
const prenom = z.string().trim().min(1, "Indiquez au moins un prénom.").max(60);
const texte = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const cote = z.enum(["PARTENAIRE_1", "PARTENAIRE_2", "COMMUN"]).catch("COMMUN");
const lien = z.enum(LIENS.map((l) => l.cle) as [string, ...string[]]).optional().catch(undefined);
const MAX_INVITES = 2000;

function rafraichir(inviteId?: string) {
  revalidatePath("/invites");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/planning");
  if (inviteId) revalidatePath(`/invites/${inviteId}`);
}

async function journal(weddingId: string, userId: string, entityId: string, action: string) {
  await db.activityLog.create({ data: { weddingId, userId, entity: "Guest", entityId, action } });
}

/** Trouve ou crée le foyer de ce nom (M4-02). */
async function foyer(weddingId: string, nom: string | null): Promise<string | null> {
  if (!nom) return null;
  const existant = await db.household.findFirst({ where: { weddingId, name: { equals: nom, mode: "insensitive" } } });
  return (existant ?? (await db.household.create({ data: { weddingId, name: nom } }))).id;
}

export type EtatAjout = { erreur?: string; doublon?: { id: string; nom: string }; ajoute?: string; essai?: number };

/** Ajoute un invité, en prévenant d'un doublon probable (M4-01, M4-10). */
export async function ajouterInvite(precedent: EtatAjout, formData: FormData): Promise<EtatAjout> {
  const { user, mariage } = await accesEcriture();
  const p = prenom.safeParse(formData.get("firstName"));
  if (!p.success) return { erreur: p.error.issues[0]?.message };
  const nom = texte(60).parse(formData.get("lastName") ?? "");
  const email = texte(120).parse(formData.get("email") ?? "");
  const existants = await db.guest.findMany({ where: { weddingId: mariage.id }, select: { id: true, firstName: true, lastName: true, email: true } });
  if (existants.length >= MAX_INVITES) return { erreur: "Vous avez atteint le nombre maximal d’invités." };
  if (formData.get("confirmerDoublon") !== "1") {
    const d = doublonDe({ prenom: p.data, nom, email }, existants.map((e) => ({ id: e.id, prenom: e.firstName, nom: e.lastName, email: e.email })));
    if (d) {
      const e = existants.find((x) => x.id === d)!;
      return { doublon: { id: d, nom: [e.firstName, e.lastName].filter(Boolean).join(" ") }, essai: precedent.essai };
    }
  }
  const g = await db.guest.create({
    data: {
      weddingId: mariage.id,
      firstName: p.data,
      lastName: nom,
      email,
      side: cote.parse(formData.get("side")),
      category: lien.parse(formData.get("category") || undefined) ?? null,
      ageGroup: formData.get("ageGroup") === "ENFANT" ? "ENFANT" : "ADULTE",
      plusOne: formData.get("plusOne") === "on",
    },
  });
  await journal(mariage.id, user.id, g.id, "cree");
  rafraichir();
  return { ajoute: [g.firstName, g.lastName].filter(Boolean).join(" "), essai: (precedent.essai ?? 0) + 1 };
}

/** Change la réponse d'un invité en un geste (M4-06). */
export async function changerReponse(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const g = await db.guest.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  if (!g) return;
  const rsvp = z.enum(["EN_ATTENTE", "PRESENT", "ABSENT"]).parse(formData.get("rsvp"));
  await db.guest.update({ where: { id: g.id }, data: { rsvp, rsvpAt: rsvp === "EN_ATTENTE" ? null : new Date() } });
  await journal(mariage.id, user.id, g.id, `reponse-${rsvp}`);
  rafraichir(g.id);
}

export async function modifierInvite(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const g = await db.guest.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  if (!g) redirect("/invites");
  const age = formData.get("ageGroup") === "ENFANT" ? "ENFANT" : "ADULTE";
  const ageAns = z.coerce.number().int().min(0).max(17).optional().catch(undefined).parse(formData.get("age") || undefined);
  const momentsVoulus = formData.getAll("moments").map(String);
  const momentsDuMariage = await db.moment.findMany({ where: { weddingId: mariage.id, id: { in: momentsVoulus } }, select: { id: true } });
  await db.$transaction([
    db.guest.update({
      where: { id: g.id },
      data: {
        firstName: prenom.catch(g.firstName).parse(formData.get("firstName")),
        lastName: texte(60).parse(formData.get("lastName") ?? ""),
        side: cote.parse(formData.get("side")),
        category: lien.parse(formData.get("category") || undefined) ?? null,
        ageGroup: age,
        age: age === "ENFANT" ? (ageAns ?? null) : null,
        plusOne: formData.get("plusOne") === "on",
        accessibility: formData.get("accessibility") === "on",
        email: texte(120).parse(formData.get("email") ?? ""),
        phone: texte(30).parse(formData.get("phone") ?? ""),
        diets: formData.getAll("diets").map(String).filter((d) => (REGIMES as readonly string[]).includes(d)),
        allergies: texte(300).parse(formData.get("allergies") ?? ""),
        householdId: await foyer(mariage.id, texte(80).parse(formData.get("household") ?? "")),
      },
    }),
    db.guestMoment.deleteMany({ where: { guestId: g.id } }),
    db.guestMoment.createMany({ data: momentsDuMariage.map((m) => ({ guestId: g.id, momentId: m.id })) }),
  ]);
  const rsvp = z.enum(["EN_ATTENTE", "PRESENT", "ABSENT"]).catch(g.rsvp).parse(formData.get("rsvp"));
  if (rsvp !== g.rsvp) await db.guest.update({ where: { id: g.id }, data: { rsvp, rsvpAt: rsvp === "EN_ATTENTE" ? null : new Date() } });
  await journal(mariage.id, user.id, g.id, "modifie");
  rafraichir(g.id);
  redirect("/invites");
}

export async function supprimerInvite(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const g = await db.guest.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  if (g) {
    await db.guest.delete({ where: { id: g.id } });
    await journal(mariage.id, user.id, g.id, "supprime");
  }
  rafraichir();
  redirect("/invites");
}

export async function ajouterMoment(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const nom = z.string().trim().min(1).max(60).safeParse(formData.get("name"));
  if (nom.success) await db.moment.create({ data: { weddingId: mariage.id, name: nom.data } });
  rafraichir();
}

export type EtatImport = { ajoutes?: number; ignores?: number; erreurs?: { ligne: number; message: string }[]; erreur?: string };

/** Importe un fichier CSV ou exporté d'Excel : colonnes reconnues par leur nom, doublons ignorés (M4-09, M4-10). */
export async function importerInvites(_: EtatImport, formData: FormData): Promise<EtatImport> {
  const { user, mariage } = await accesEcriture();
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { erreur: "Choisissez un fichier CSV." };
  if (fichier.size > 2_000_000) return { erreur: "Ce fichier est trop lourd (2 Mo au maximum)." };
  const r = importer(await fichier.text(), { p1: mariage.partner1Name, p2: mariage.partner2Name });
  if (!r.invites.length) return { ajoutes: 0, erreurs: r.erreurs };

  const existants = (await db.guest.findMany({ where: { weddingId: mariage.id }, select: { id: true, firstName: true, lastName: true, email: true } })).map((e) => ({
    id: e.id,
    prenom: e.firstName,
    nom: e.lastName,
    email: e.email,
  }));
  if (existants.length + r.invites.length > MAX_INVITES) return { erreur: "Ce fichier dépasserait le nombre maximal d’invités." };
  let ajoutes = 0;
  let ignores = 0;
  for (const i of r.invites) {
    if (doublonDe(i, existants)) {
      ignores++;
      continue;
    }
    const g = await db.guest.create({
      data: {
        weddingId: mariage.id,
        firstName: i.prenom,
        lastName: i.nom,
        side: i.cote,
        category: i.lien,
        ageGroup: i.age,
        plusOne: i.accompagnant,
        rsvp: i.reponse,
        rsvpAt: i.reponse === "EN_ATTENTE" ? null : new Date(),
        diets: i.regimes,
        allergies: i.allergies,
        email: i.email,
        phone: i.telephone,
        householdId: await foyer(mariage.id, i.foyer),
      },
    });
    existants.push({ id: g.id, prenom: i.prenom, nom: i.nom, email: i.email });
    ajoutes++;
  }
  await db.activityLog.create({ data: { weddingId: mariage.id, userId: user.id, entity: "Guest", entityId: mariage.id, action: `import-${ajoutes}` } });
  rafraichir();
  return { ajoutes, ignores, erreurs: r.erreurs };
}
