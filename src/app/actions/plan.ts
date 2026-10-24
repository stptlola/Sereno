"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { proposerPlan } from "@/domain/plan/plan";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";

// Plan de table (M5-06, M5-07, M5-13, M5-16, M5-17, M5-20). Tout est vérifié par mariage.

const id = z.string().min(1);
const FORMES = ["RONDE", "RECTANGLE", "OVALE", "CARREE", "DEMI_LUNE"] as const;
const ELEMENTS = {
  piste: { label: "Piste de danse", w: 600, d: 600 },
  scene: { label: "Scène", w: 500, d: 250 },
  dj: { label: "DJ", w: 250, d: 150 },
  buffet: { label: "Buffet", w: 400, d: 120 },
  bar: { label: "Bar", w: 300, d: 100 },
  gateau: { label: "Gâteau", w: 120, d: 120 },
  cadeaux: { label: "Cadeaux", w: 150, d: 100 },
  photobooth: { label: "Photobooth", w: 200, d: 200 },
  enfants: { label: "Coin enfants", w: 300, d: 300 },
  sortie: { label: "Sortie", w: 150, d: 40 },
} as const;
export type TypeElement = keyof typeof ELEMENTS;

function rafraichir() {
  revalidatePath("/plan-de-table");
  revalidatePath("/invites");
}

export async function ajouterTable(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const existantes = await db.seatingTable.findMany({ where: { weddingId: mariage.id }, select: { number: true } });
  const numero = existantes.reduce((m, t) => Math.max(m, t.number), 0) + 1;
  const honneur = formData.get("honor") === "on";
  const n = existantes.length;
  await db.seatingTable.create({
    data: {
      weddingId: mariage.id,
      number: numero,
      name: z.string().trim().max(60).parse(formData.get("name") ?? "") || (honneur ? "Table d’honneur" : `Table ${numero}`),
      shape: z.enum(FORMES).catch(honneur ? "RECTANGLE" : "RONDE").parse(formData.get("shape")),
      seats: z.coerce.number().int().min(1).max(40).catch(10).parse(formData.get("seats")),
      honor: honneur,
      // Disposition initiale en grille, que le couple ajuste ensuite sur le plan.
      x: Math.min(mariage.roomWidthCm - 150, 250 + (n % 5) * 350),
      y: Math.min(mariage.roomDepthCm - 150, 250 + Math.floor(n / 5) * 350),
    },
  });
  rafraichir();
}

export async function modifierTable(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const t = await db.seatingTable.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  if (!t) return;
  await db.seatingTable.update({
    where: { id: t.id },
    data: {
      name: z.string().trim().min(1).max(60).catch(t.name).parse(formData.get("name")),
      shape: z.enum(FORMES).catch(t.shape).parse(formData.get("shape")),
      seats: z.coerce.number().int().min(1).max(40).catch(t.seats).parse(formData.get("seats")),
      honor: formData.get("honor") === "on",
    },
  });
  rafraichir();
}

export async function supprimerTable(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  await db.seatingTable.deleteMany({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  rafraichir();
}

const borne = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), max));

/** Déplacement d'une table ou d'un élément sur le plan de salle (glisser-déposer). */
export async function deplacer(type: "table" | "element", cible: string, x: number, y: number, rotation?: number): Promise<void> {
  const { mariage } = await accesEcriture();
  const pos = { x: borne(x, mariage.roomWidthCm), y: borne(y, mariage.roomDepthCm), ...(rotation !== undefined ? { rotation: ((Math.round(rotation) % 360) + 360) % 360 } : {}) };
  if (type === "table") await db.seatingTable.updateMany({ where: { id: cible, weddingId: mariage.id }, data: pos });
  else await db.roomElement.updateMany({ where: { id: cible, weddingId: mariage.id }, data: pos });
  revalidatePath("/plan-de-table");
}

/** Place un invité à une table (ou le retire), à la première place libre (M5-07). */
export async function placerInvite(guestId: string, tableId: string | null): Promise<{ erreur?: string }> {
  const { mariage } = await accesEcriture();
  const g = await db.guest.findFirst({ where: { id: guestId, weddingId: mariage.id } });
  if (!g) return { erreur: "Invité introuvable." };
  if (tableId) {
    const t = await db.seatingTable.findFirst({ where: { id: tableId, weddingId: mariage.id }, include: { guests: { select: { seat: true } } } });
    if (!t) return { erreur: "Table introuvable." };
    const prises = new Set(t.guests.map((x) => x.seat));
    let place = 1;
    while (prises.has(place)) place++;
    await db.guest.update({ where: { id: g.id }, data: { tableId: t.id, seat: place } });
  } else await db.guest.update({ where: { id: g.id }, data: { tableId: null, seat: null } });
  rafraichir();
  return {};
}

/**
 * Installe un invité sur une place précise (M5-17). Si la place est prise, les deux invités échangent leurs places ;
 * si l'invité installé n'avait pas de place, celui qui occupait la chaise repasse « à placer ».
 */
export async function asseoir(guestId: string, tableId: string, place: number): Promise<{ erreur?: string }> {
  const { mariage } = await accesEcriture();
  const [g, t] = await Promise.all([
    db.guest.findFirst({ where: { id: guestId, weddingId: mariage.id } }),
    db.seatingTable.findFirst({ where: { id: tableId, weddingId: mariage.id } }),
  ]);
  if (!g || !t) return { erreur: "Invité ou table introuvable." };
  const numero = z.coerce.number().int().min(1).max(60).parse(place);
  const occupant = await db.guest.findFirst({ where: { weddingId: mariage.id, tableId: t.id, seat: numero, id: { not: g.id } } });
  await db.$transaction([
    ...(occupant ? [db.guest.update({ where: { id: occupant.id }, data: g.tableId && g.seat ? { tableId: g.tableId, seat: g.seat } : { tableId: null, seat: null } })] : []),
    db.guest.update({ where: { id: g.id }, data: { tableId: t.id, seat: numero } }),
  ]);
  rafraichir();
  return {};
}

/** Fait tourner une table ou un élément par pas de 15 degrés. */
export async function tourner(type: "table" | "element", cible: string, pas: number): Promise<void> {
  const { mariage } = await accesEcriture();
  const delta = Math.sign(pas) * 15;
  if (type === "table") {
    const t = await db.seatingTable.findFirst({ where: { id: cible, weddingId: mariage.id } });
    if (t) await db.seatingTable.update({ where: { id: t.id }, data: { rotation: (((t.rotation + delta) % 360) + 360) % 360 } });
  } else {
    const e = await db.roomElement.findFirst({ where: { id: cible, weddingId: mariage.id } });
    if (e) await db.roomElement.update({ where: { id: e.id }, data: { rotation: (((e.rotation + delta) % 360) + 360) % 360 } });
  }
  revalidatePath("/plan-de-table");
}

/** Agrandit ou réduit un élément du plan de salle (par pas de 10 %). */
export async function redimensionner(cible: string, facteur: number): Promise<void> {
  const { mariage } = await accesEcriture();
  const e = await db.roomElement.findFirst({ where: { id: cible, weddingId: mariage.id } });
  if (!e) return;
  const f = facteur > 1 ? 1.1 : 1 / 1.1;
  await db.roomElement.update({ where: { id: e.id }, data: { width: Math.round(Math.min(3000, Math.max(30, e.width * f))), depth: Math.round(Math.min(3000, Math.max(30, e.depth * f))) } });
  revalidatePath("/plan-de-table");
}

export type EtatProposition = { faits?: number; nonPlaces?: { nom: string; raison: string }[]; raisons?: Record<string, number>; erreur?: string };

/** Propose et applique un placement complet (M5-13, M5-20) ; tout reste modifiable ensuite. */
export async function proposerPlacement(_: EtatProposition, formData: FormData): Promise<EtatProposition> {
  const { mariage } = await accesEcriture();
  const [invites, tables, regles, sorties] = await Promise.all([
    db.guest.findMany({ where: { weddingId: mariage.id, rsvp: { not: "ABSENT" } }, include: { household: true } }),
    db.seatingTable.findMany({ where: { weddingId: mariage.id } }),
    db.seatingConstraint.findMany({ where: { weddingId: mariage.id } }),
    db.roomElement.findMany({ where: { weddingId: mariage.id, kind: "sortie" } }),
  ]);
  if (!tables.some((t) => !t.honor)) return { erreur: "Ajoutez d’abord vos tables." };
  const p = proposerPlan(
    invites.map((g) => ({
      id: g.id,
      nom: [g.firstName, g.lastName].filter(Boolean).join(" "),
      foyer: g.householdId,
      cote: g.side,
      lien: g.category,
      enfant: g.ageGroup === "ENFANT",
      accompagnant: g.plusOne,
      accessibilite: g.accessibility,
      tableId: g.tableId,
    })),
    tables.map((t) => ({ id: t.id, nom: t.name, places: t.seats, honneur: t.honor, x: t.x, y: t.y })),
    regles.map((r) => ({ a: r.guestAId, b: r.guestBId, type: r.together ? "ENSEMBLE" : "SEPARES" })),
    { garderPlaces: formData.get("garder") === "on", melangerCotes: formData.get("melanger") === "on", sorties },
  );
  // On numérote les places dans l'ordre du placement, table par table.
  const compteur = new Map<string, number>();
  const parId = new Map(invites.map((g) => [g.id, g]));
  await db.$transaction([
    db.guest.updateMany({ where: { weddingId: mariage.id, id: { in: p.nonPlaces.map((n) => n.inviteId) } }, data: { tableId: null, seat: null } }),
    ...p.placements.map((pl) => {
      const n = (compteur.get(pl.tableId) ?? 0) + 1;
      compteur.set(pl.tableId, n + (parId.get(pl.inviteId)?.plusOne ? 1 : 0));
      return db.guest.update({ where: { id: pl.inviteId }, data: { tableId: pl.tableId, seat: n } });
    }),
  ]);
  rafraichir();
  const raisons: Record<string, number> = {};
  for (const pl of p.placements) raisons[pl.raison] = (raisons[pl.raison] ?? 0) + 1;
  return {
    faits: p.placements.length,
    raisons,
    nonPlaces: p.nonPlaces.map((n) => {
      const g = parId.get(n.inviteId)!;
      return { nom: [g.firstName, g.lastName].filter(Boolean).join(" "), raison: n.raison };
    }),
  };
}

export async function viderPlan(): Promise<void> {
  const { mariage } = await accesEcriture();
  await db.guest.updateMany({ where: { weddingId: mariage.id }, data: { tableId: null, seat: null } });
  rafraichir();
}

export async function ajouterContrainte(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const a = id.parse(formData.get("a"));
  const b = id.parse(formData.get("b"));
  if (a === b) return;
  const deux = await db.guest.count({ where: { weddingId: mariage.id, id: { in: [a, b] } } });
  if (deux !== 2) return;
  const [x, y] = [a, b].sort();
  await db.seatingConstraint.upsert({
    where: { guestAId_guestBId: { guestAId: x!, guestBId: y! } },
    create: { weddingId: mariage.id, guestAId: x!, guestBId: y!, together: formData.get("type") === "ENSEMBLE" },
    update: { together: formData.get("type") === "ENSEMBLE" },
  });
  rafraichir();
}

export async function supprimerContrainte(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  await db.seatingConstraint.deleteMany({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  rafraichir();
}

export async function ajouterElement(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const kind = z.enum(Object.keys(ELEMENTS) as [TypeElement, ...TypeElement[]]).parse(formData.get("kind"));
  const e = ELEMENTS[kind];
  await db.roomElement.create({ data: { weddingId: mariage.id, kind, label: e.label, x: Math.round(mariage.roomWidthCm / 2), y: Math.round(mariage.roomDepthCm / 2), width: e.w, depth: e.d } });
  revalidatePath("/plan-de-table");
}

export async function supprimerElement(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  await db.roomElement.deleteMany({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  revalidatePath("/plan-de-table");
}

/** Dimensions de la salle, saisies en mètres (M5-16). */
export async function modifierSalle(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const m = (v: FormDataEntryValue | null, def: number) => Math.round(z.coerce.number().min(3).max(200).catch(def / 100).parse(String(v ?? "").replace(",", ".")) * 100);
  await db.wedding.update({ where: { id: mariage.id }, data: { roomWidthCm: m(formData.get("largeur"), mariage.roomWidthCm), roomDepthCm: m(formData.get("profondeur"), mariage.roomDepthCm) } });
  revalidatePath("/plan-de-table");
}
