import "server-only";
import { redirect } from "next/navigation";
import { mariageDe, sessionCourante } from "./session";

/** Utilisateur connecté et son mariage, avec un droit d'écriture (créateur ou co-pilote). */
export async function accesEcriture() {
  const session = await sessionCourante();
  if (!session) redirect("/connexion");
  const acces = await mariageDe(session.user.id);
  if (!acces) redirect("/commencer");
  return { user: session.user, mariage: acces.mariage, role: acces.role };
}

/** Lit une date AAAA-MM-JJ en date seule (minuit UTC), ou null. */
export function lireDateJour(valeur: FormDataEntryValue | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valeur ?? ""));
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}
