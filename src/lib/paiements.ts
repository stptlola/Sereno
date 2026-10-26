import "server-only";
import type { DepenseFinancement, PaiementEch } from "@/domain/budget/echeancier";
import { db } from "./db";

/** Paiements (acomptes, soldes) et dépenses d'un mariage, pour l'échéancier et « qui finance quoi ». */
export async function chargerPaiements(weddingId: string) {
  const depenses = await db.expense.findMany({ where: { weddingId }, include: { category: { select: { name: true } }, payments: true }, orderBy: { createdAt: "asc" } });
  const paiements: (PaiementEch & { depenseId: string })[] = depenses.flatMap((d) =>
    d.payments.map((p) => ({
      id: p.id,
      depenseId: d.id,
      depense: d.label,
      poste: d.category.name,
      prestataire: d.vendor,
      montantCentimes: p.amountCents,
      echeance: p.dueDate,
      paye: p.isPaid,
    })),
  );
  const financements: DepenseFinancement[] = depenses
    .map((d) => ({
      payeur: d.payer,
      montantCentimes: d.actualCents ?? d.plannedCents ?? 0,
      payeCentimes: d.payments.filter((p) => p.isPaid).reduce((s, p) => s + p.amountCents, 0),
    }))
    .filter((d) => d.montantCentimes > 0);
  return { paiements, financements };
}
