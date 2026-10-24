import type { Metadata } from "next";
import Link from "next/link";
import { BoutonImprimer } from "@/components/bouton-imprimer";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Imprimer le plan de table · Sereno" };
export const dynamic = "force-dynamic";

const DOCS = [
  ["alpha", "Plan alphabétique"],
  ["tables", "Plan par table"],
  ["marque-places", "Marque-places"],
  ["numeros", "Numéros de table"],
] as const;

const ICONES_REGIME: Record<string, string> = { Végétarien: "🌱", Végan: "🌿", "Sans gluten": "🌾", "Sans porc": "⊘", Halal: "☪", Casher: "✡", Autre: "★" };

/** Supports imprimés générés depuis le plan (M5-09, M5-19) : seuls les invités présents y figurent. */
export default async function PageImprimer({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const doc = (DOCS.find(([v]) => v === p.doc)?.[0] ?? "alpha") as (typeof DOCS)[number][0];
  const { mariage } = await accesEcriture();
  const [tables, presents, enAttente] = await Promise.all([
    db.seatingTable.findMany({ where: { weddingId: mariage.id }, orderBy: [{ honor: "desc" }, { number: "asc" }] }),
    db.guest.findMany({ where: { weddingId: mariage.id, rsvp: "PRESENT", tableId: { not: null } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.guest.count({ where: { weddingId: mariage.id, rsvp: "EN_ATTENTE" } }),
  ]);
  const nomTable = new Map(tables.map((t) => [t.id, t.honor ? t.name : `Table ${t.number}${t.name !== `Table ${t.number}` ? ` · ${t.name}` : ""}`]));
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" & ");
  const triAlpha = [...presents].sort((a, b) => (a.lastName ?? a.firstName).localeCompare(b.lastName ?? b.firstName, "fr") || a.firstName.localeCompare(b.firstName, "fr"));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8 print:max-w-none print:p-0">
      <div className="sans-impression flex flex-col gap-4">
        <Link href="/plan-de-table" className="text-sm text-bronze underline">
          ← Retour au plan de table
        </Link>
        <h1 className="font-display text-3xl">Imprimer</h1>
        <nav className="flex flex-wrap gap-2" aria-label="Documents">
          {DOCS.map(([v, l]) => (
            <Link key={v} href={`?doc=${v}`} aria-current={doc === v ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${doc === v ? "border-ink bg-ink text-surface" : "border-line"}`}>
              {l}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-ink-muted">
          {presents.length} invité{presents.length > 1 ? "s" : ""} présent{presents.length > 1 ? "s" : ""} et placé{presents.length > 1 ? "s" : ""}.
          {enAttente ? ` ${enAttente} n’${enAttente > 1 ? "ont" : "a"} pas encore répondu et n’apparaissent pas.` : ""} Un changement de dernière minute ? Modifiez le plan, puis réimprimez seulement la carte concernée.
        </p>
        <BoutonImprimer />
      </div>

      {presents.length === 0 && <p className="rounded-md bg-surface-soft p-4">Aucun invité présent n’est encore placé.</p>}

      {doc === "alpha" && presents.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="text-center">
            <p className="font-display text-4xl">Trouvez votre place</p>
            <p className="text-ink-muted">{prenoms}</p>
          </div>
          <ul className="columns-1 gap-8 text-lg sm:columns-2 print:columns-2">
            {triAlpha.map((g) => (
              <li key={g.id} className="garder-ensemble flex justify-between gap-4 border-b border-line py-1.5">
                <span>
                  <span className="font-semibold">{g.lastName ?? ""}</span> {g.firstName}
                </span>
                <span className="text-bronze">{nomTable.get(g.tableId!)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {doc === "tables" && presents.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {tables
            .filter((t) => presents.some((g) => g.tableId === t.id))
            .map((t) => (
              <div key={t.id} className="garder-ensemble rounded-md border border-line p-4">
                <p className="font-display text-2xl">{nomTable.get(t.id)}</p>
                <ul className="mt-2">
                  {presents
                    .filter((g) => g.tableId === t.id)
                    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99))
                    .map((g) => (
                      <li key={g.id}>
                        {g.firstName} {g.lastName ?? ""}
                        {g.plusOne ? " + 1" : ""}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </section>
      )}

      {doc === "marque-places" && presents.length > 0 && (
        <section className="grid grid-cols-2 gap-3">
          {presents.flatMap((g) => [g, ...(g.plusOne ? [{ ...g, id: `${g.id}+1`, firstName: `Accompagnant de ${g.firstName}`, lastName: null, diets: [] }] : [])]).map((g) => (
            <div key={g.id} className="garder-ensemble flex h-40 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-ink-muted p-3 text-center">
              <p className="font-display text-3xl leading-tight">{g.firstName}</p>
              {g.lastName && <p className="text-ink-muted">{g.lastName}</p>}
              <p className="text-sm text-bronze">
                {nomTable.get(g.tableId!)}
                {g.diets.length > 0 && <span title={g.diets.join(", ")}> · {g.diets.map((d) => ICONES_REGIME[d] ?? "★").join(" ")}</span>}
              </p>
            </div>
          ))}
        </section>
      )}

      {doc === "numeros" && (
        <section className="flex flex-col">
          {tables.map((t) => (
            <div key={t.id} className="saut-de-page garder-ensemble flex min-h-[60vh] flex-col items-center justify-center gap-4 border-b border-dashed border-line print:min-h-screen print:border-0">
              <p className="font-display text-[10rem] leading-none">{t.honor ? "♥" : t.number}</p>
              <p className="font-display text-3xl">{t.honor ? t.name : t.name !== `Table ${t.number}` ? t.name : ""}</p>
              <p className="text-ink-muted">{prenoms}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
