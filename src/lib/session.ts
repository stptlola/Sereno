import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

export async function sessionCourante() {
  return auth().api.getSession({ headers: await headers() });
}

/** Renvoie l'utilisateur connecté, ou redirige vers la connexion en revenant ici ensuite. */
export async function utilisateurRequis(retour: string) {
  const session = await sessionCourante();
  if (!session) redirect(`/connexion?retour=${encodeURIComponent(retour)}`);
  return session.user;
}

/** Le mariage de l'utilisateur (un seul au MVP) et son rôle, ou null. */
export async function mariageDe(userId: string) {
  const membre = await db.member.findFirst({
    where: { userId, role: { in: ["CREATEUR", "COPILOTE"] } },
    include: { wedding: true },
    orderBy: { invitedAt: "asc" },
  });
  return membre ? { mariage: membre.wedding, role: membre.role } : null;
}
