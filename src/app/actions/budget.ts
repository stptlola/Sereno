"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { lireEuros, statutAutomatique } from "@/domain/budget/calculs";
import { totauxDetail } from "@/domain/budget/detail";
import { accesEcriture, lireDateJour } from "@/lib/acces";
import { db } from "@/lib/db";

// Budget (M3-01 à M3-07, M3-13, M3-14). Tout est vérifié par mariage : on ne touche jamais au budget d'un autre couple.

const id = z.string().min(1);
const libelle = z.string().trim().min(1, "Donnez un nom.").max(120);
const texte = (max: number) => z.string().trim().max(max).transform((v) => v || null);

async function journal(weddingId: string, userId: string, entity: string, entityId: string, action: string) {
  await db.activityLog.create({ data: { weddingId, userId, entity, entityId, action } });
}

function rafraichir(depenseId?: string) {
  revalidatePath("/budget");
  revalidatePath("/budget/echeancier");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/planning");
  if (depenseId) revalidatePath(`/budget/depenses/${depenseId}`);
}

async function depenseDuMariage(depenseId: string, weddingId: string) {
  const d = await db.expense.findFirst({ where: { id: depenseId, weddingId }, include: { payments: true } });
  if (!d) redirect("/budget");
  return d;
}

/** Recalcule le statut « payé » automatique après un changement (M3-14). */
async function majStatut(depenseId: string) {
  const d = await db.expense.findUniqueOrThrow({ where: { id: depenseId }, include: { payments: true } });
  const statut = statutAutomatique({
    posteId: d.categoryId,
    prevuCentimes: d.plannedCents,
    reelCentimes: d.actualCents,
    statut: d.status,
    versements: d.payments.map((p) => ({ montantCentimes: p.amountCents, paye: p.isPaid })),
  });
  if (statut !== d.status) await db.expense.update({ where: { id: depenseId }, data: { status: statut } });
}

export async function ajouterDepense(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const posteId = id.parse(formData.get("posteId"));
  const poste = await db.budgetCategory.findFirst({ where: { id: posteId, weddingId: mariage.id } });
  if (!poste) redirect("/budget");
  const nom = libelle.safeParse(formData.get("label"));
  if (!nom.success) return;
  const d = await db.expense.create({
    data: { weddingId: mariage.id, categoryId: posteId, label: nom.data, plannedCents: lireEuros(formData.get("planned")) },
  });
  await journal(mariage.id, user.id, "Expense", d.id, "creee");
  rafraichir();
}

export async function modifierDepense(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const detaillee = (await db.expenseLine.count({ where: { expenseId: String(formData.get("id") ?? ""), expense: { weddingId: mariage.id } } })) > 0;
  const d = await depenseDuMariage(id.parse(formData.get("id")), mariage.id);
  const posteId = id.parse(formData.get("posteId"));
  const poste = await db.budgetCategory.findFirst({ where: { id: posteId, weddingId: mariage.id } });
  await db.expense.update({
    where: { id: d.id },
    data: {
      label: libelle.catch(d.label).parse(formData.get("label")),
      categoryId: poste ? poste.id : d.categoryId,
      // Une dépense détaillée en lignes tire son prévu et son réel du détail : on ne les remplace pas ici.
      ...(detaillee ? {} : { plannedCents: lireEuros(formData.get("planned")), actualCents: lireEuros(formData.get("actual")) }),
      vendor: texte(120).parse(formData.get("vendor") ?? ""),
      payer: texte(60).parse(formData.get("payer") ?? ""),
      note: texte(2000).parse(formData.get("note") ?? ""),
      status: z.enum(["A_CHERCHER", "DEVIS_RECU", "RESERVE", "PAYE"]).catch(d.status).parse(formData.get("status")),
    },
  });
  await majStatut(d.id);
  await journal(mariage.id, user.id, "Expense", d.id, "modifiee");
  rafraichir(d.id);
  redirect("/budget");
}

export async function supprimerDepense(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const d = await depenseDuMariage(id.parse(formData.get("id")), mariage.id);
  await db.expense.delete({ where: { id: d.id } });
  await journal(mariage.id, user.id, "Expense", d.id, "supprimee");
  rafraichir();
  redirect("/budget");
}

/** Recalcule le prévu et le réel d'une dépense détaillée à partir de ses lignes (les cautions à part). */
async function synchroniserDetail(depenseId: string) {
  const lignes = await db.expenseLine.findMany({ where: { expenseId: depenseId } });
  if (!lignes.length) return;
  const t = totauxDetail(lignes.map((l) => ({ prevuCentimes: l.plannedCents, reelCentimes: l.actualCents, caution: l.isDeposit })));
  await db.expense.update({ where: { id: depenseId }, data: { plannedCents: t.prevuCentimes, actualCents: t.reelCentimes } });
  await majStatut(depenseId);
}

export async function ajouterLigne(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const d = await db.expense.findFirst({ where: { id: id.parse(formData.get("depenseId")), weddingId: mariage.id } });
  const libelle = z.string().trim().min(1).max(120).safeParse(formData.get("label"));
  if (!d || !libelle.success) return;
  // Première ligne : le montant déjà saisi sur la dépense devient une ligne, pour ne rien perdre.
  if ((await db.expenseLine.count({ where: { expenseId: d.id } })) === 0 && (d.plannedCents || d.actualCents)) {
    await db.expenseLine.create({ data: { expenseId: d.id, label: d.label, plannedCents: d.plannedCents, actualCents: d.actualCents } });
  }
  await db.expenseLine.create({ data: { expenseId: d.id, label: libelle.data, plannedCents: lireEuros(formData.get("planned")), isDeposit: formData.get("isDeposit") === "on" || /caution/i.test(libelle.data) } });
  await synchroniserDetail(d.id);
  await journal(mariage.id, user.id, "Expense", d.id, "ligne-ajoutee");
  rafraichir(d.id);
}

export async function modifierLigne(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const l = await db.expenseLine.findFirst({ where: { id: id.parse(formData.get("id")), expense: { weddingId: mariage.id } } });
  if (!l) return;
  await db.expenseLine.update({
    where: { id: l.id },
    data: {
      label: z.string().trim().min(1).max(120).catch(l.label).parse(formData.get("label")),
      plannedCents: lireEuros(formData.get("planned")),
      actualCents: lireEuros(formData.get("actual")),
      isDeposit: formData.get("isDeposit") === "on",
    },
  });
  await synchroniserDetail(l.expenseId);
  rafraichir(l.expenseId);
}

export async function supprimerLigne(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const l = await db.expenseLine.findFirst({ where: { id: id.parse(formData.get("id")), expense: { weddingId: mariage.id } } });
  if (!l) return;
  await db.expenseLine.delete({ where: { id: l.id } });
  await synchroniserDetail(l.expenseId);
  rafraichir(l.expenseId);
}

export async function ajouterVersement(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const d = await depenseDuMariage(id.parse(formData.get("depenseId")), mariage.id);
  const montant = lireEuros(formData.get("amount"));
  if (!montant) return;
  const paye = formData.get("isPaid") === "on";
  await db.payment.create({
    data: { expenseId: d.id, amountCents: montant, dueDate: lireDateJour(formData.get("dueDate")), isPaid: paye, paidAt: paye ? new Date() : null },
  });
  if (d.status === "A_CHERCHER" || d.status === "DEVIS_RECU") await db.expense.update({ where: { id: d.id }, data: { status: "RESERVE" } });
  await majStatut(d.id);
  await journal(mariage.id, user.id, "Payment", d.id, "versement-ajoute");
  rafraichir(d.id);
}

export async function basculerVersement(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const v = await db.payment.findFirst({ where: { id: id.parse(formData.get("id")), expense: { weddingId: mariage.id } } });
  if (!v) return;
  await db.payment.update({ where: { id: v.id }, data: { isPaid: !v.isPaid, paidAt: v.isPaid ? null : new Date() } });
  await majStatut(v.expenseId);
  await journal(mariage.id, user.id, "Payment", v.expenseId, v.isPaid ? "versement-rouvert" : "versement-paye");
  rafraichir(v.expenseId);
}

export async function supprimerVersement(formData: FormData): Promise<void> {
  const { mariage } = await accesEcriture();
  const v = await db.payment.findFirst({ where: { id: id.parse(formData.get("id")), expense: { weddingId: mariage.id } } });
  if (!v) return;
  await db.payment.delete({ where: { id: v.id } });
  await majStatut(v.expenseId);
  rafraichir(v.expenseId);
}

export async function modifierPoste(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const p = await db.budgetCategory.findFirst({ where: { id: id.parse(formData.get("id")), weddingId: mariage.id } });
  if (!p) return;
  await db.budgetCategory.update({
    where: { id: p.id },
    data: { name: libelle.catch(p.name).parse(formData.get("name")), plannedCents: lireEuros(formData.get("planned")) ?? 0 },
  });
  await journal(mariage.id, user.id, "BudgetCategory", p.id, "modifie");
  rafraichir();
}

export async function ajouterPoste(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const nom = libelle.safeParse(formData.get("name"));
  if (!nom.success) return;
  const dernier = await db.budgetCategory.aggregate({ where: { weddingId: mariage.id }, _max: { order: true } });
  const p = await db.budgetCategory.create({
    data: { weddingId: mariage.id, name: nom.data, plannedCents: lireEuros(formData.get("planned")) ?? 0, order: (dernier._max.order ?? 0) + 1 },
  });
  await journal(mariage.id, user.id, "BudgetCategory", p.id, "cree");
  rafraichir();
}

/** Un poste ne se supprime que s'il est vide (M3-03). */
export async function supprimerPoste(formData: FormData): Promise<void> {
  const { user, mariage } = await accesEcriture();
  const p = await db.budgetCategory.findFirst({
    where: { id: id.parse(formData.get("id")), weddingId: mariage.id },
    include: { _count: { select: { expenses: true } } },
  });
  if (!p || p._count.expenses > 0) return;
  await db.budgetCategory.delete({ where: { id: p.id } });
  await journal(mariage.id, user.id, "BudgetCategory", p.id, "supprime");
  rafraichir();
}
