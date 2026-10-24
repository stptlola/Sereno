"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { preparerInvitation, PREFIXE_ACCOMPAGNANT } from "@/domain/invites/invitation";
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

/**
 * Ajoute une invitation entière : une personne, un couple ou une famille, avec son foyer (M4-01 à M4-03).
 * Prévient d'un doublon probable avant d'ajouter (M4-10).
 */
export async function ajouterInvitation(precedent: EtatAjout, formData: FormData): Promise<EtatAjout> {
  const { user, mariage } = await accesEcriture();
  const type = z.enum(["personne", "couple", "famille"]).catch("personne").parse(formData.get("type"));
  const lignes = Array.from({ length: 12 }, (_, i) => ({
    prenom: String(formData.get(`prenom-${i}`) ?? ""),
    nom: String(formData.get(`nom-${i}`) ?? ""),
    enfant: formData.get(`enfant-${i}`) === "on",
  }));
  const prep = preparerInvitation(type, lignes, String(formData.get("nomCommun") ?? ""), formData.get("accompagnant") === "on");
  if ("erreur" in prep) return { erreur: prep.erreur, essai: precedent.essai };

  const existants = await db.guest.findMany({ where: { weddingId: mariage.id }, select: { id: true, firstName: true, lastName: true, email: true } });
  if (existants.length + prep.personnes.length > MAX_INVITES) return { erreur: "Vous avez atteint le nombre maximal d’invités." };
  if (formData.get("confirmerDoublon") !== "1") {
    for (const p of prep.personnes.filter((x) => !x.aConfirmer)) {
      const d = doublonDe({ prenom: p.prenom, nom: p.nom, email: null }, existants.map((e) => ({ id: e.id, prenom: e.firstName, nom: e.lastName, email: e.email })));
      if (d) {
        const e = existants.find((x) => x.id === d)!;
        return { doublon: { id: d, nom: [e.firstName, e.lastName].filter(Boolean).join(" ") }, essai: precedent.essai };
      }
    }
  }
  const cote_ = cote.parse(formData.get("side"));
  const lien_ = lien.parse(formData.get("category") || undefined) ?? null;
  await db.$transaction(async (tx) => {
    const foyerId = prep.foyer ? (await tx.household.create({ data: { weddingId: mariage.id, name: prep.foyer } })).id : null;
    for (const p of prep.personnes) {
      const g = await tx.guest.create({
        data: { weddingId: mariage.id, householdId: foyerId, firstName: p.prenom, lastName: p.nom, side: cote_, category: lien_, ageGroup: p.enfant ? "ENFANT" : "ADULTE" },
      });
      await tx.activityLog.create({ data: { weddingId: mariage.id, userId: user.id, entity: "Guest", entityId: g.id, action: "cree" } });
    }
  });
  rafraichir();
  const premier = prep.personnes[0]!.prenom;
  const message =
    type === "famille" && prep.foyer
      ? `La ${prep.foyer!.charAt(0).toLowerCase()}${prep.foyer!.slice(1)} est ajoutée à la liste (${prep.personnes.length} personnes).`
      : type === "couple"
        ? `${prep.foyer} sont ajoutés à la liste.`
        : prep.personnes.length > 1
          ? `${premier} et son accompagnant sont ajoutés à la liste.`
          : `${premier} est ajouté à la liste.`;
  return { ajoute: message, essai: (precedent.essai ?? 0) + 1 };
}

/** Ajoute une personne au foyer d'un invité (un enfant, un conjoint…), en créant le foyer si besoin. */
export async function ajouterAuFoyer(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const g = await db.guest.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  const p = prenom.safeParse(formData.get("prenom"));
  if (!g || !p.success) return;
  const foyerId = g.householdId ?? (await db.household.create({ data: { weddingId: mariage.id, name: [g.firstName, g.lastName].filter(Boolean).join(" ") } })).id;
  if (!g.householdId) await db.guest.update({ where: { id: g.id }, data: { householdId: foyerId } });
  const n = await db.guest.create({
    data: {
      weddingId: mariage.id,
      householdId: foyerId,
      firstName: p.data,
      lastName: texte(60).parse(formData.get("nom") ?? "") ?? g.lastName,
      side: g.side,
      category: g.category,
      ageGroup: formData.get("enfant") === "on" ? "ENFANT" : "ADULTE",
      tableId: g.tableId,
    },
  });
  await journal(mariage.id, user.id, n.id, "cree");
  rafraichir(g.id);
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

/** Réponse pour toute une invitation en un geste (M4-06). */
export async function changerReponseInvitation(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const ids = formData.getAll("id").map(String).slice(0, 30);
  const rsvp = z.enum(["EN_ATTENTE", "PRESENT", "ABSENT"]).parse(formData.get("rsvp"));
  const { count } = await db.guest.updateMany({ where: { id: { in: ids }, weddingId: mariage.id }, data: { rsvp, rsvpAt: rsvp === "EN_ATTENTE" ? null : new Date() } });
  if (count) await db.activityLog.create({ data: { weddingId: mariage.id, userId: user.id, entity: "Guest", entityId: ids[0]!, action: `reponse-${rsvp}-${count}` } });
  rafraichir();
}

/** Retire toute une invitation (ses membres et son foyer). */
export async function supprimerInvitation(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const ids = formData.getAll("id").map(String).slice(0, 30);
  const membres = await db.guest.findMany({ where: { id: { in: ids }, weddingId: mariage.id }, select: { id: true, householdId: true } });
  if (!membres.length) return;
  const foyers = [...new Set(membres.map((m) => m.householdId).filter((f): f is string => Boolean(f)))];
  await db.$transaction([
    db.guest.deleteMany({ where: { id: { in: membres.map((m) => m.id) }, weddingId: mariage.id } }),
    // Un foyer qui n'a plus personne disparaît aussi.
    db.household.deleteMany({ where: { id: { in: foyers }, weddingId: mariage.id, guests: { none: {} } } }),
    db.activityLog.create({ data: { weddingId: mariage.id, userId: user.id, entity: "Guest", entityId: membres[0]!.id, action: `invitation-supprimee-${membres.length}` } }),
  ]);
  rafraichir();
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
    // Une colonne « Accompagnant » à Oui crée une vraie personne, à nommer plus tard.
    if (i.accompagnant) {
      const foyerId = g.householdId ?? (await db.household.create({ data: { weddingId: mariage.id, name: `${[i.prenom, i.nom].filter(Boolean).join(" ")} et son accompagnant` } })).id;
      if (!g.householdId) await db.guest.update({ where: { id: g.id }, data: { householdId: foyerId } });
      await db.guest.create({ data: { weddingId: mariage.id, householdId: foyerId, firstName: `${PREFIXE_ACCOMPAGNANT}${i.prenom}`, side: i.cote, category: i.lien, rsvp: i.reponse, rsvpAt: g.rsvpAt } });
      ajoutes++;
    }
  }
  await db.activityLog.create({ data: { weddingId: mariage.id, userId: user.id, entity: "Guest", entityId: mariage.id, action: `import-${ajoutes}` } });
  rafraichir();
  return { ajoutes, ignores, erreurs: r.erreurs };
}
