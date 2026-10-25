import "server-only";
import { db } from "./db";
import { nouveauJeton } from "./jetons";

/** Donne un lien personnel de réponse à chaque invité qui n'en a pas encore (M5-03). */
export async function assurerLiensPersonnels(weddingId: string): Promise<void> {
  const sans = await db.guest.findMany({ where: { weddingId, rsvpToken: null, isCouple: false }, select: { id: true } });
  for (const g of sans) await db.guest.update({ where: { id: g.id }, data: { rsvpToken: nouveauJeton().slice(0, 22) } });
}
