import type { Metadata } from "next";
import Link from "next/link";
import { BoutonImprimer } from "@/components/bouton-imprimer";
import { compterPlats } from "@/domain/invites/adresses";
import { REGIMES } from "@/domain/invites/invites";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Rapport traiteur · Sereno" };
export const dynamic = "force-dynamic";

const formatDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Rapport pour le traiteur (M5-10) : couverts adultes et enfants, régimes et allergies, table par table. */
export default async function RapportTraiteur() {
  const { mariage } = await accesEcriture();
  const [tables, presents, site] = await Promise.all([
    db.seatingTable.findMany({ where: { weddingId: mariage.id }, orderBy: [{ honor: "desc" }, { number: "asc" }] }),
    // Tous ceux qui sont attendus : présents et sans réponse (sauf la liste B en attente), jamais les absents.
    db.guest.findMany({ where: { weddingId: mariage.id, rsvp: { in: ["PRESENT", "EN_ATTENTE"] }, NOT: { listB: true, rsvp: "EN_ATTENTE" } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.miniSite.findUnique({ where: { weddingId: mariage.id }, select: { mealOptions: true } }),
  ]);
  const plats = site?.mealOptions ?? [];
  const couverts = (liste: typeof presents) => ({
    adultes: liste.reduce((s, g) => s + (g.ageGroup === "ADULTE" ? 1 : 0) + (g.plusOne ? 1 : 0), 0),
    enfants: liste.filter((g) => g.ageGroup === "ENFANT").length,
    enAttente: liste.filter((g) => g.rsvp === "EN_ATTENTE").length,
  });
  const total = couverts(presents);
  const speciaux = presents.filter((g) => g.diets.length || g.allergies);
  const groupes = [...tables.map((t) => ({ nom: t.honor ? t.name : `Table ${t.number} · ${t.name}`, invites: presents.filter((g) => g.tableId === t.id) })), { nom: "Sans table", invites: presents.filter((g) => !g.tableId) }].filter((g) => g.invites.length);
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" & ");

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8 print:max-w-none print:p-0">
      <div className="sans-impression flex flex-col gap-3">
        <Link href="/plan-de-table" className="text-sm text-bronze underline">
          ← Retour au plan de table
        </Link>
        <BoutonImprimer libelle="Imprimer ou enregistrer en PDF pour le traiteur" />
      </div>
      <header>
        <h1 className="font-display text-3xl">Rapport pour le traiteur</h1>
        <p className="text-ink-muted">
          Mariage de {prenoms}
          {mariage.date ? `, ${formatDate.format(mariage.date)}` : ""}. Établi le {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}, d’après les réponses reçues à cette date.
        </p>
      </header>
      {total.enAttente > 0 && (
        <p className="rounded-md border border-or p-3 text-sm">
          Ce rapport compte les invités présents <strong>et les {total.enAttente} qui n’ont pas encore répondu</strong>, pour une estimation complète. Les absents ne sont pas comptés.
          Imprimez-le de nouveau après votre date limite de réponse, pour des chiffres définitifs.
        </p>
      )}
      <section className="grid grid-cols-3 gap-3 text-center">
        {[
          ["Couverts adultes", total.adultes],
          ["Couverts enfants", total.enfants],
          ["Repas spéciaux", speciaux.length],
        ].map(([l, v]) => (
          <div key={l} className="rounded-md border border-line p-4">
            <p className="font-display text-4xl">{v}</p>
            <p className="text-sm text-ink-muted">{l}</p>
          </div>
        ))}
      </section>
      {total.enAttente > 0 && (
        <p className="-mt-3 text-center text-sm text-ink-muted">
          Dont {total.enAttente} en attente de réponse · {presents.length - total.enAttente} confirmé{presents.length - total.enAttente > 1 ? "s" : ""}
        </p>
      )}
      <section>
        <h2 className="font-display text-xl">Régimes</h2>
        <p>
          {REGIMES.map((r) => [r, presents.filter((g) => g.diets.includes(r)).length] as const)
            .filter(([, n]) => n)
            .map(([r, n]) => `${r} : ${n}`)
            .join(" · ") || "Aucun régime particulier."}
        </p>
      </section>
      {plats.length > 0 && (
        <section>
          <h2 className="font-display text-xl">Plats</h2>
          <p>
            {compterPlats(presents.map((g) => ({ plat: g.mealChoice })), plats)
              .map((x) => `${x.plat} : ${x.nombre}`)
              .join(" · ")}
          </p>
        </section>
      )}
      <section className="overflow-x-auto">
        <h2 className="mb-2 font-display text-xl">Table par table</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-ink">
            <tr>
              <th className="py-2 pr-3">Table</th>
              <th className="py-2 pr-3">Adultes</th>
              <th className="py-2 pr-3">Enfants</th>
              <th className="py-2 pr-3">Dont en attente</th>
              {plats.length > 0 && <th className="py-2 pr-3">Plats</th>}
              <th className="py-2">Repas spéciaux et allergies</th>
            </tr>
          </thead>
          <tbody>
            {groupes.map((gr) => {
              const c = couverts(gr.invites);
              return (
                <tr key={gr.nom} className="garder-ensemble border-b border-line align-top">
                  <td className="py-2 pr-3 font-semibold">{gr.nom}</td>
                  <td className="py-2 pr-3">{c.adultes}</td>
                  <td className="py-2 pr-3">{c.enfants}</td>
                  <td className="py-2 pr-3 text-ink-muted">{c.enAttente || "—"}</td>
                  {plats.length > 0 && (
                    <td className="py-2 pr-3">
                      {compterPlats(gr.invites.map((g) => ({ plat: g.mealChoice })), plats)
                        .filter((x) => x.nombre)
                        .map((x) => `${x.nombre} ${x.plat.toLowerCase()}`)
                        .join(", ")}
                    </td>
                  )}
                  <td className="py-2">
                    {gr.invites
                      .filter((g) => g.diets.length || g.allergies)
                      .map((g) => `${g.firstName} ${g.lastName ?? ""} : ${[g.diets.join(", "), g.allergies ? `allergie ${g.allergies}` : ""].filter(Boolean).join(", ")}`)
                      .join(" ; ") || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-ink-muted">Pensez à ajouter les repas des prestataires (photographe, DJ…) si votre contrat les prévoit.</p>
    </main>
  );
}
