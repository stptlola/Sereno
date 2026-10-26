import { libelleLien, versCsv } from "@/domain/invites/invites";
import { db } from "@/lib/db";
import { mariageDe, sessionCourante } from "@/lib/session";

export const dynamic = "force-dynamic";

const REPONSES = { EN_ATTENTE: "En attente", PRESENT: "Présent", ABSENT: "Absent" } as const;

/** Export de la liste d'invités, lisible directement dans Excel (M4-09). */
export async function GET() {
  const session = await sessionCourante();
  if (!session) return new Response("Connexion requise", { status: 401 });
  const acces = await mariageDe(session.user.id);
  if (!acces) return new Response("Aucun mariage", { status: 404 });
  const { mariage } = acces;
  const invites = await db.guest.findMany({ where: { weddingId: mariage.id, isCouple: false }, include: { household: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
  const cote = { PARTENAIRE_1: mariage.partner1Name, PARTENAIRE_2: mariage.partner2Name ?? "Partenaire 2", COMMUN: "Commun" } as const;
  const csv = versCsv(
    invites.map((g) => ({
      prenom: g.firstName,
      nom: g.lastName,
      cote: cote[g.side],
      lien: g.category ? libelleLien(g.category) : "",
      enfant: g.ageGroup === "ENFANT",
      listeB: g.listB,
      plat: g.mealChoice,
      adresse: g.household?.address ?? null,
      reponse: REPONSES[g.rsvp],
      regimes: g.diets,
      allergies: g.allergies,
      email: g.email,
      telephone: g.phone,
      foyer: g.household?.name ?? null,
      table: null,
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invites-sereno.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
