import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import { mariageDe, sessionCourante } from "./session";

/** Utilisateur connecté et son mariage, avec un droit d'écriture (créateur ou co-pilote). */
export async function accesEcriture() {
  const session = await sessionCourante();
  if (!session) redirect("/connexion");
  const acces = await mariageDe(session.user.id);
  if (!acces) redirect((await temoinDe(session.user.id)) ? "/temoin" : "/commencer");
  return { user: session.user, mariage: acces.mariage, role: acces.role };
}

/** Lit une date AAAA-MM-JJ en date seule (minuit UTC), ou null. */
export function lireDateJour(valeur: FormDataEntryValue | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valeur ?? ""));
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

/** Le mariage dont l'utilisateur est témoin (M8-01), ou null. */
export async function temoinDe(userId: string) {
  return db.member.findFirst({ where: { userId, role: "TEMOIN" }, include: { wedding: true }, orderBy: { invitedAt: "desc" } });
}

/** Accès à l'espace témoin : connecté, et témoin d'un mariage. */
export async function accesTemoin() {
  const session = await sessionCourante();
  if (!session) redirect("/connexion?retour=%2Ftemoin");
  const membre = await temoinDe(session.user.id);
  if (!membre) redirect("/tableau-de-bord");
  return { user: session.user, mariage: membre.wedding };
}
