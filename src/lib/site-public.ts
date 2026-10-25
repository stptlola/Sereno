import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { env } from "./env";
import { signer, verifier } from "./signature";

// Accès au mini-site public : publié, et déverrouillé si le couple a mis un mot de passe (M5-02).

export const nomCookieSite = (siteId: string) => `sereno-site-${siteId}`;
export const valeurCookieSite = (siteId: string, passwordHash: string) => signer(env().AUTH_SECRET, `site:${siteId}:${passwordHash}`);

export async function chargerSitePublic(slug: string) {
  const site = await db.miniSite.findUnique({ where: { slug }, include: { wedding: { include: { moments: { orderBy: { name: "asc" } } } } } });
  if (!site?.published) return null;
  let verrouille = false;
  if (site.passwordHash) {
    const c = (await cookies()).get(nomCookieSite(site.id))?.value ?? "";
    verrouille = !(c && verifier(env().AUTH_SECRET, `site:${site.id}:${site.passwordHash}`, c));
  }
  return { site, verrouille };
}

/** Le foyer d'un invité, à partir de son lien personnel : lui seul, ou tous les membres de son foyer. */
export async function foyerDuJeton(siteWeddingId: string, jeton: string) {
  const g = await db.guest.findFirst({ where: { rsvpToken: jeton, weddingId: siteWeddingId, isCouple: false } });
  if (!g) return null;
  const membres = g.householdId
    ? await db.guest.findMany({ where: { householdId: g.householdId, weddingId: siteWeddingId }, include: { moments: true }, orderBy: [{ ageGroup: "asc" }, { firstName: "asc" }] })
    : await db.guest.findMany({ where: { id: g.id }, include: { moments: true } });
  return { invite: g, membres };
}
