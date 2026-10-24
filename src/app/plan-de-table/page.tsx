import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { alertes } from "@/domain/plan/plan";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { PlanDeTable } from "./plan-de-table";

export const metadata: Metadata = { title: "Plan de table · Sereno" };
export const dynamic = "force-dynamic";

export default async function PagePlanDeTable() {
  const { mariage } = await accesEcriture();
  const [tables, elements, invites, regles] = await Promise.all([
    db.seatingTable.findMany({ where: { weddingId: mariage.id }, orderBy: [{ honor: "desc" }, { number: "asc" }] }),
    db.roomElement.findMany({ where: { weddingId: mariage.id } }),
    db.guest.findMany({ where: { weddingId: mariage.id, rsvp: { not: "ABSENT" } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.seatingConstraint.findMany({ where: { weddingId: mariage.id } }),
  ]);
  const nom = (g: { firstName: string; lastName: string | null }) => [g.firstName, g.lastName].filter(Boolean).join(" ");
  const pourAlertes = invites.map((g) => ({
    id: g.id,
    nom: nom(g),
    foyer: g.householdId,
    cote: g.side,
    lien: g.category,
    enfant: g.ageGroup === "ENFANT",
    accompagnant: g.plusOne,
    accessibilite: g.accessibility,
    tableId: g.tableId,
  }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/plan-de-table" />
      <div>
        <h1 className="font-display text-3xl">Plan de table</h1>
        <p className="mt-1 text-ink-muted">Dessinez votre salle, ajoutez vos tables, puis laissez Sereno vous proposer un premier placement. Touchez un invité, puis une table, pour le placer.</p>
      </div>
      {invites.length === 0 ? (
        <p className="rounded-md bg-surface-soft p-4">Ajoutez d’abord vos invités : le plan de table se construit à partir de votre liste.</p>
      ) : (
        <PlanDeTable
          largeur={mariage.roomWidthCm}
          profondeur={mariage.roomDepthCm}
          tables={tables.map((t) => ({
            id: t.id,
            nom: t.name,
            numero: t.number,
            forme: t.shape,
            places: t.seats,
            honneur: t.honor,
            x: t.x,
            y: t.y,
            rotation: t.rotation,
            invites: invites
              .filter((g) => g.tableId === t.id)
              .map((g) => ({ id: g.id, nom: nom(g), place: g.seat, enfant: g.ageGroup === "ENFANT", accompagnant: g.plusOne, regimes: g.diets })),
          }))}
          elements={elements.map((e) => ({ id: e.id, type: e.kind, libelle: e.label ?? e.kind, x: e.x, y: e.y, largeur: e.width, profondeur: e.depth, rotation: e.rotation }))}
          aPlacer={invites.filter((g) => !g.tableId).map((g) => ({ id: g.id, nom: nom(g), cote: g.side, accompagnant: g.plusOne, enfant: g.ageGroup === "ENFANT", reponse: g.rsvp }))}
          tous={invites.map((g) => ({ id: g.id, nom: nom(g) }))}
          contraintes={regles.map((r) => ({ id: r.id, a: r.guestAId, b: r.guestBId, ensemble: r.together }))}
          alertes={alertes(
            pourAlertes,
            tables.map((t) => ({ id: t.id, nom: t.name, places: t.seats, honneur: t.honor, x: t.x, y: t.y })),
            regles.map((r) => ({ a: r.guestAId, b: r.guestBId, type: r.together ? "ENSEMBLE" : "SEPARES" })),
          )}
        />
      )}
    </main>
  );
}
