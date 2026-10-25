import "server-only";
import { alertes } from "@/domain/plan/plan";
import { db } from "@/lib/db";
import type { ElementVue, InviteVue, TableVue } from "./types";

/** Données du plan de table, communes au résumé et à l'éditeur. */
export async function chargerPlan(weddingId: string) {
  const [tablesBrutes, elementsBruts, invites, regles] = await Promise.all([
    db.seatingTable.findMany({ where: { weddingId }, orderBy: [{ honor: "desc" }, { number: "asc" }] }),
    db.roomElement.findMany({ where: { weddingId } }),
    db.guest.findMany({ where: { weddingId, rsvp: { not: "ABSENT" } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.seatingConstraint.findMany({ where: { weddingId } }),
  ]);
  const nom = (g: { firstName: string; lastName: string | null }) => [g.firstName, g.lastName].filter(Boolean).join(" ");
  const tables: TableVue[] = tablesBrutes.map((t) => ({
    id: t.id,
    nom: t.name,
    numero: t.number,
    forme: t.shape,
    places: t.seats,
    honneur: t.honor,
    x: t.x,
    y: t.y,
    rotation: t.rotation,
    verrouille: t.locked,
    invites: invites.filter((g) => g.tableId === t.id).map((g) => ({ id: g.id, nom: nom(g), place: g.seat, enfant: g.ageGroup === "ENFANT", accompagnant: g.plusOne, regimes: g.diets, cote: g.side })),
  }));
  const elements: ElementVue[] = elementsBruts.map((e) => ({ id: e.id, type: e.kind, libelle: e.label ?? e.kind, x: e.x, y: e.y, largeur: e.width, profondeur: e.depth, rotation: e.rotation, verrouille: e.locked }));
  const aPlacer: InviteVue[] = invites.filter((g) => !g.tableId).map((g) => ({ id: g.id, nom: nom(g), cote: g.side, accompagnant: g.plusOne, enfant: g.ageGroup === "ENFANT", reponse: g.rsvp }));
  const lesAlertes = alertes(
    invites.map((g) => ({ id: g.id, nom: nom(g), foyer: g.householdId, cote: g.side, lien: g.category, enfant: g.ageGroup === "ENFANT", accompagnant: g.plusOne, accessibilite: g.accessibility, tableId: g.tableId })),
    tablesBrutes.map((t) => ({ id: t.id, nom: t.name, places: t.seats, honneur: t.honor, x: t.x, y: t.y })),
    regles.map((r) => ({ a: r.guestAId, b: r.guestBId, type: r.together ? "ENSEMBLE" : "SEPARES" })),
  );
  return { tables, elements, aPlacer, invites, regles, alertes: lesAlertes, nom };
}
