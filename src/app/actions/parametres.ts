"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CULTES } from "@/domain/mariage/reponses";
import { ajouterMois, MODELE_TACHES, normaliser, planifierMiseAJour } from "@/domain/planning";
import { accesEcriture, lireDateJour } from "@/lib/acces";
import { db } from "@/lib/db";

export type EtatParametres = {
  message?: string;
  erreur?: string;
  recalcul?: { recalculees: number; ajoutees: number; retirees: number };
  /** Incrémenté à chaque enregistrement, pour rejouer l'animation. */
  essai?: number;
};

const schema = z.object({
  partner1Name: z.string().trim().min(1, "Indiquez au moins un prénom.").max(60),
  partner2Name: z.string().trim().max(60).transform((v) => v || null),
  budget: z.coerce.number().min(0).max(10_000_000).optional().catch(undefined),
  invites: z.coerce.number().int().min(0).max(2000).optional().catch(undefined),
  ceremonies: z.array(z.enum(["CIVILE", "LAIQUE", "RELIGIEUSE"])),
  culte: z.enum(CULTES).optional().catch(undefined),
});

/**
 * Modifie les informations du mariage (M12-01). Si la date ou les cérémonies changent,
 * le planning est recalculé (M2-08) : tâches recalées, ajoutées ou masquées.
 */
export async function modifierMariage(precedent: EtatParametres, formData: FormData): Promise<EtatParametres> {
  const { user, mariage } = await accesEcriture();
  const lu = schema.safeParse({
    partner1Name: formData.get("partner1Name"),
    partner2Name: formData.get("partner2Name") ?? "",
    budget: formData.get("budget") || undefined,
    invites: formData.get("invites") || undefined,
    ceremonies: formData.getAll("ceremonies"),
    culte: formData.get("culte") || undefined,
  });
  if (!lu.success) return { erreur: lu.error.issues[0]?.message ?? "Vérifiez les informations saisies." };
  const d = lu.data;
  const date = lireDateJour(formData.get("date"));
  const ceremonies = d.ceremonies.length ? d.ceremonies : (["CIVILE"] as ("CIVILE" | "LAIQUE" | "RELIGIEUSE")[]);

  const taches = await db.task.findMany({ where: { weddingId: mariage.id, templateId: { not: null } } });
  const aujourdhui = normaliser(new Date());
  const maj = planifierMiseAJour(
    taches.map((t) => ({ modeleId: t.templateId!, faite: t.status === "FAIT", masquee: t.hidden, masqueeParLeCouple: t.hiddenByCouple })),
    MODELE_TACHES,
    {
      dateMariage: date,
      // Les tâches déjà passées sont resserrées à partir d'aujourd'hui, pas de la date d'inscription.
      dateDebut: aujourdhui,
      ceremonies,
      options: {
        enfants: mariage.hasChildren ?? undefined,
        brunch: mariage.hasBrunch ?? undefined,
        animal: mariage.hasPet ?? undefined,
        luneDeMiel: mariage.hasHoneymoon ?? undefined,
      },
    },
  );
  const parModele = new Map(taches.map((t) => [t.templateId!, t.id]));
  const modeles = new Map(MODELE_TACHES.map((m) => [m.id, m]));

  await db.$transaction([
    db.wedding.update({
      where: { id: mariage.id },
      data: {
        partner1Name: d.partner1Name,
        partner2Name: d.partner2Name,
        date,
        dateIsTentative: date === null,
        budgetTotalCents: d.budget !== undefined ? Math.round(d.budget * 100) : mariage.budgetTotalCents,
        estimatedGuests: d.invites ?? mariage.estimatedGuests,
        ceremonies,
        religion: ceremonies.includes("RELIGIEUSE") ? (d.culte ?? null) : null,
      },
    }),
    ...maj.aDater.map((t) =>
      db.task.update({ where: { id: parModele.get(t.modeleId)! }, data: { idealDate: t.dateIdeale, dueDate: t.dateAffichee } }),
    ),
    db.task.updateMany({ where: { weddingId: mariage.id, templateId: { in: maj.aMasquer } }, data: { hidden: true } }),
    db.task.updateMany({ where: { weddingId: mariage.id, templateId: { in: maj.aReafficher } }, data: { hidden: false } }),
    db.task.createMany({
      data: maj.aCreer.map((t) => {
        const m = modeles.get(t.modeleId)!;
        return {
          weddingId: mariage.id,
          templateId: m.id,
          title: m.titre,
          tip: m.conseil,
          category: m.sousRubrique ? `${m.rubrique} · ${m.sousRubrique}` : m.rubrique,
          idealDate: t.dateIdeale,
          dueDate: t.dateAffichee,
          createdById: user.id,
        };
      }),
    }),
    db.activityLog.create({ data: { weddingId: mariage.id, userId: user.id, entity: "Wedding", entityId: mariage.id, action: "modifie" } }),
  ]);
  revalidatePath("/tableau-de-bord");
  revalidatePath("/parametres");

  const changes = [
    maj.aDater.length && `${maj.aDater.length} échéance${maj.aDater.length > 1 ? "s" : ""} recalculée${maj.aDater.length > 1 ? "s" : ""}`,
    maj.aCreer.length && `${maj.aCreer.length} tâche${maj.aCreer.length > 1 ? "s" : ""} ajoutée${maj.aCreer.length > 1 ? "s" : ""}`,
    maj.aMasquer.length && `${maj.aMasquer.length} tâche${maj.aMasquer.length > 1 ? "s" : ""} retirée${maj.aMasquer.length > 1 ? "s" : ""}`,
  ].filter(Boolean);
  const sansDate = date === null ? ` Date provisoire : ${new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(ajouterMois(aujourdhui, 12))}.` : "";
  return {
    essai: (precedent.essai ?? 0) + 1,
    message: `C’est enregistré.${changes.length ? ` Votre planning est à jour : ${changes.join(", ")}.` : ""}${sansDate}`,
    recalcul: { recalculees: maj.aDater.length, ajoutees: maj.aCreer.length, retirees: maj.aMasquer.length },
  };
}
