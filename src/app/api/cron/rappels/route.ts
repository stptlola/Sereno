import { contenuRappel } from "@/domain/rappels/contenu";
import { planifierRappels, type MariageRappel } from "@/domain/rappels/rappels";
import { normaliser } from "@/domain/planning";
import { db } from "@/lib/db";
import { envoyer } from "@/lib/email";
import { env } from "@/lib/env";
import { timingSafeEqual } from "node:crypto";
import { signer } from "@/lib/signature";

export const dynamic = "force-dynamic";

/**
 * Envoi quotidien des rappels (M11-01, M11-02), déclenché chaque matin par une tâche planifiée de Coolify
 * (voir DEPLOIEMENT.md). Protégé par CRON_SECRET ; relançable sans risque : un seul e-mail par personne et par jour.
 */
export async function POST(request: Request) {
  const e = env();
  if (!e.CRON_SECRET) return Response.json({ erreur: "CRON_SECRET non configuré : envoi désactivé." }, { status: 503 });
  const jeton = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const autorise = jeton.length === e.CRON_SECRET.length && timingSafeEqual(Buffer.from(jeton), Buffer.from(e.CRON_SECRET));
  if (!autorise) return Response.json({ erreur: "Non autorisé" }, { status: 401 });

  const aujourdhui = normaliser(new Date());
  const mariages = await db.wedding.findMany({
    include: {
      tasks: { where: { hidden: false }, select: { id: true, title: true, dueDate: true, status: true, template: { select: { repere: true } } } },
      members: { where: { role: { in: ["CREATEUR", "COPILOTE"] } }, include: { user: { include: { notifications: { where: { day: aujourdhui } } } } } },
    },
  });

  const donnees: MariageRappel[] = mariages.map((m) => ({
    prenoms: [m.partner1Name, m.partner2Name].filter(Boolean).join(" et "),
    dateMariage: m.date,
    taches: m.tasks.map((t) => ({ id: t.id, titre: t.title, echeance: t.dueDate, faite: t.status === "FAIT", repere: t.template?.repere ?? null })),
    destinataires: m.members.map((mb) => ({
      userId: mb.userId,
      email: mb.user.email,
      prenom: mb.user.name,
      hebdo: mb.user.notifHebdo,
      rappels: mb.user.notifRappels,
      dejaEnvoyeAujourdhui: mb.user.notifications.length > 0,
    })),
  }));

  const envois = planifierRappels(aujourdhui, donnees);
  let envoyes = 0;
  for (const envoi of envois) {
    // Le journal est écrit avant l'envoi : sa contrainte d'unicité empêche tout doublon, même en cas d'exécutions simultanées.
    try {
      await db.notificationLog.create({ data: { userId: envoi.userId, type: envoi.type, day: aujourdhui } });
    } catch {
      continue;
    }
    const prenom = donnees.flatMap((d) => d.destinataires).find((d) => d.userId === envoi.userId)?.prenom ?? "";
    const donneesLien = `${envoi.userId}:tout`;
    await envoyer({
      a: envoi.email,
      sujet: envoi.sujet,
      texte: contenuRappel(envoi, prenom),
      lien: { libelle: "Ouvrir mon planning", url: `${e.APP_URL}/tableau-de-bord` },
      desinscription: `${e.APP_URL}/desinscription?u=${encodeURIComponent(envoi.userId)}&s=${signer(e.AUTH_SECRET, donneesLien)}`,
    });
    envoyes++;
  }
  return Response.json({ jour: aujourdhui.toISOString().slice(0, 10), prevus: envois.length, envoyes });
}
