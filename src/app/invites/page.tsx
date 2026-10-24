import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { compter, libelleLien, LIENS, repartition, type Cote } from "@/domain/invites/invites";
import { sansAccents } from "@/domain/planning";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { ajouterMoment, changerReponse } from "../actions/invites";
import { AjoutInvite } from "./ajout";
import { OutilsInvites } from "./outils";

export const metadata: Metadata = { title: "Invités · Sereno" };
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const REPONSES = [
  { valeur: "PRESENT", libelle: "Présent", court: "Oui", classe: "border-or bg-or text-ink" },
  { valeur: "EN_ATTENTE", libelle: "En attente", court: "?", classe: "border-line bg-surface-soft text-ink-muted" },
  { valeur: "ABSENT", libelle: "Absent", court: "Non", classe: "border-ink-muted bg-surface-raised text-ink-muted line-through" },
] as const;

function Chiffre({ libelle, valeur }: { libelle: string; valeur: number | string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-surface-soft p-3 sm:p-5">
      <p className="text-xs text-ink-muted sm:text-sm">{libelle}</p>
      <p className="font-display text-xl sm:text-3xl">{valeur}</p>
    </div>
  );
}

type InviteListe = Awaited<ReturnType<typeof charger>>[number];

function charger(weddingId: string) {
  return db.guest.findMany({
    where: { weddingId },
    include: { household: true, moments: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

function BoutonsReponse({ g }: { g: InviteListe }) {
  return (
    <div className="flex shrink-0 gap-1" role="group" aria-label={`Réponse de ${g.firstName}`}>
      {REPONSES.map((r) => (
        <form key={r.valeur} action={changerReponse}>
          <input type="hidden" name="id" value={g.id} />
          <input type="hidden" name="rsvp" value={r.valeur} />
          <button
            type="submit"
            aria-pressed={g.rsvp === r.valeur}
            title={r.libelle}
            aria-label={`${r.libelle}${g.rsvp === r.valeur ? " (réponse actuelle)" : ""}`}
            className={`h-8 min-w-10 rounded-full border px-2 text-xs font-semibold ${g.rsvp === r.valeur ? r.classe : "border-line text-ink-muted hover:border-ink"}`}
          >
            {r.court}
          </button>
        </form>
      ))}
    </div>
  );
}

function LigneInvite({ g }: { g: InviteListe }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/invites/${g.id}`} className="font-semibold hover:underline">
          {[g.firstName, g.lastName].filter(Boolean).join(" ")}
          {g.plusOne && <span className="font-normal text-ink-muted"> + 1</span>}
        </Link>
        <span className="text-xs text-ink-muted">
          {[g.household?.name, g.ageGroup === "ENFANT" ? `Enfant${g.age ? `, ${g.age} ans` : ""}` : null, g.diets.join(", ") || null, g.allergies ? `Allergies : ${g.allergies}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <BoutonsReponse g={g} />
    </li>
  );
}

export default async function PageInvites({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { mariage } = await accesEcriture();
  const [tous, moments] = await Promise.all([charger(mariage.id), db.moment.findMany({ where: { weddingId: mariage.id }, orderBy: { name: "asc" } })]);

  const c = compter(
    tous.map((g) => ({
      prenom: g.firstName,
      nom: g.lastName,
      cote: g.side,
      lien: g.category,
      age: g.ageGroup,
      email: g.email,
      reponse: g.rsvp,
      regimes: g.diets,
      accompagnant: g.plusOne,
      moments: g.moments.map((m) => m.momentId),
    })),
  );
  const r = repartition(c.parCote);

  const q = sansAccents(un(params.q));
  const reponse = un(params.reponse);
  const moment = un(params.moment);
  const vue = un(params.vue);
  const filtres = tous.filter((g) => {
    if (reponse && g.rsvp !== reponse) return false;
    if (moment && !g.moments.some((m) => m.momentId === moment)) return false;
    if (q && !sansAccents([g.firstName, g.lastName, g.email, g.household?.name].filter(Boolean).join(" ")).includes(q)) return false;
    return true;
  });

  const nomCote: Record<Cote, string> = {
    PARTENAIRE_1: `Côté ${mariage.partner1Name}`,
    PARTENAIRE_2: `Côté ${mariage.partner2Name ?? "partenaire 2"}`,
    COMMUN: "Commun",
  };
  const ordreLien = (cle: string | null) => {
    const i = LIENS.findIndex((l) => l.cle === cle);
    return i < 0 ? 99 : i;
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-8 px-6 pt-0 pb-24">
      <Navigation actif="/invites" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Invités</h1>
          <p className="mt-1 text-ink-muted">Un invité par personne, enfants compris. Le « + 1 » compte une personne de plus.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/invites/import" className="text-bronze underline">
            Importer un fichier
          </Link>
          <a href="/invites/export" className="text-bronze underline">
            Exporter pour Excel
          </a>
        </div>
      </div>

      <section className="grid grid-cols-4 gap-2 sm:gap-4" aria-label="Vos invités en chiffres">
        <Chiffre libelle="Invités" valeur={c.personnes} />
        <Chiffre libelle="Présents" valeur={c.presents} />
        <Chiffre libelle="En attente" valeur={c.enAttente} />
        <Chiffre libelle="Absents" valeur={c.absents} />
      </section>
      {c.personnes > 0 && (
        <div className="-mt-4 flex flex-col gap-2 text-sm text-ink-muted">
          <p>
            {c.enfants} enfant{c.enfants > 1 ? "s" : ""} · {c.repasSpeciaux} repas spécia{c.repasSpeciaux > 1 ? "ux" : "l"} parmi les présents
            {moments.map((m) => ` · ${m.name} : ${c.parMoment[m.id] ?? 0}`).join("")}
          </p>
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-soft" aria-hidden>
            <div className="bg-ink" style={{ width: `${r.p1}%` }} />
            <div className="bg-or" style={{ width: `${r.p2}%` }} />
          </div>
          <p>
            Répartition : {mariage.partner1Name} {r.p1} %{mariage.partner2Name ? ` · ${mariage.partner2Name} ${r.p2} %` : ""} · commun {r.commun} %
          </p>
        </div>
      )}

      <AjoutInvite prenoms={{ p1: mariage.partner1Name, p2: mariage.partner2Name }} />

      <section className="flex flex-col gap-4">
        <OutilsInvites total={filtres.length} moments={moments} />
        {tous.length === 0 && (
          <p className="rounded-md bg-surface-soft p-4">
            Votre liste est vide. Ajoutez vos premiers invités ci-dessus, ou{" "}
            <Link href="/invites/import" className="font-semibold text-bronze underline">
              importez votre fichier Excel
            </Link>
            .
          </p>
        )}
        {tous.length > 0 && filtres.length === 0 && <p className="text-ink-muted">Aucun invité ne correspond à votre recherche.</p>}

        {vue === "" && filtres.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {(["PARTENAIRE_1", "PARTENAIRE_2", "COMMUN"] as const)
              .filter((s) => s !== "PARTENAIRE_2" || mariage.partner2Name)
              .map((s) => {
                const liste = filtres.filter((g) => g.side === s).sort((a, b) => ordreLien(a.category) - ordreLien(b.category));
                const groupes = [...new Set(liste.map((g) => g.category))];
                return (
                  <div key={s} className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-4">
                    <h2 className="flex items-baseline justify-between font-display text-xl">
                      {nomCote[s]} <span className="font-sans text-sm text-ink-muted">{liste.reduce((n, g) => n + (g.plusOne ? 2 : 1), 0)}</span>
                    </h2>
                    {liste.length === 0 && <p className="text-sm text-ink-muted">Personne pour l’instant.</p>}
                    {groupes.map((lien) => (
                      <div key={lien ?? "aucun"}>
                        <p className="mt-2 text-xs font-semibold text-bronze uppercase">{libelleLien(lien)}</p>
                        <ul>
                          {liste
                            .filter((g) => g.category === lien)
                            .map((g) => (
                              <LigneInvite key={g.id} g={g} />
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        )}

        {vue === "alpha" && filtres.length > 0 && (
          <ul className="rounded-md border border-line bg-surface-raised px-4">
            {[...filtres]
              .sort((a, b) => (a.lastName ?? a.firstName).localeCompare(b.lastName ?? b.firstName, "fr") || a.firstName.localeCompare(b.firstName, "fr"))
              .map((g) => (
                <LigneInvite key={g.id} g={g} />
              ))}
          </ul>
        )}

        {vue === "tableau" && filtres.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-line bg-surface-raised">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-soft text-xs text-ink-muted">
                <tr>
                  {["Invité", "Côté", "Lien", "Foyer", "Âge", "Régimes", "Moments", "Réponse"].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtres.map((g) => (
                  <tr key={g.id} className="border-t border-line">
                    <td className="px-3 py-2">
                      <Link href={`/invites/${g.id}`} className="font-semibold hover:underline">
                        {[g.firstName, g.lastName].filter(Boolean).join(" ")}
                        {g.plusOne ? " + 1" : ""}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{nomCote[g.side].replace("Côté ", "")}</td>
                    <td className="px-3 py-2">{g.category ? libelleLien(g.category) : "—"}</td>
                    <td className="px-3 py-2">{g.household?.name ?? "—"}</td>
                    <td className="px-3 py-2">{g.ageGroup === "ENFANT" ? "Enfant" : "Adulte"}</td>
                    <td className="px-3 py-2">{g.diets.join(", ") || "—"}</td>
                    <td className="px-3 py-2">{moments.filter((m) => g.moments.some((x) => x.momentId === m.id)).map((m) => m.name).join(", ") || "—"}</td>
                    <td className="px-3 py-2">
                      <BoutonsReponse g={g} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form action={ajouterMoment} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-muted">Vos moments : {moments.map((m) => m.name).join(", ") || "aucun"}.</span>
        <input name="name" maxLength={60} placeholder="Ajouter un moment (brunch…)" aria-label="Nouveau moment" className="rounded-full border border-line bg-surface-raised px-3 py-1.5" />
        <button type="submit" className="text-bronze underline">
          Ajouter
        </button>
      </form>
    </main>
  );
}
