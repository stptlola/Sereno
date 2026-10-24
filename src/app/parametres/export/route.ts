import { db } from "@/lib/db";
import { sessionCourante } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Export de toutes les données du compte et du mariage, au format JSON (portabilité, M12-03). */
export async function GET() {
  const session = await sessionCourante();
  if (!session) return new Response("Connexion requise", { status: 401 });
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, emailVerified: true, notifHebdo: true, notifRappels: true, createdAt: true },
  });
  const membres = await db.member.findMany({ where: { userId: session.user.id }, select: { role: true, weddingId: true } });
  const mariages = await Promise.all(
    membres.map(async (m) => ({
      role: m.role,
      mariage: await db.wedding.findUnique({
        where: { id: m.weddingId },
        include: {
          members: { select: { role: true, joinedAt: true, user: { select: { name: true } } } },
          // La préparation secrète des témoins n'apparaît pas dans l'export du couple.
          tasks: { where: { witnessOnly: false }, omit: { weddingId: true } },
          budgetCategories: { omit: { weddingId: true }, include: { expenses: { omit: { weddingId: true }, include: { payments: true } } } },
          households: { omit: { weddingId: true } },
          guests: { omit: { weddingId: true }, include: { moments: true } },
          moments: { omit: { weddingId: true } },
          activity: { omit: { weddingId: true }, orderBy: { createdAt: "asc" } },
        },
      }),
    })),
  );
  const contenu = JSON.stringify({ exporteLe: new Date().toISOString(), compte: user, mariages }, null, 2);
  return new Response(contenu, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-donnees-sereno.json"`,
      "Cache-Control": "no-store",
    },
  });
}
