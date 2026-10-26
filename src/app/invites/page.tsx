import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { estAccompagnantAConfirmer, regrouperParInvitation } from "@/domain/invites/invitation";
import { compter, libelleLien, LIENS, repartition, type Cote } from "@/domain/invites/invites";
import { sansAccents } from "@/domain/planning";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { ajouterMoment, changerReponse } from "../actions/invites";
import { AjoutInvite } from "./ajout";
import { CollecteAdresses } from "./collecte";
import { LigneInvitation } from "./ligne-invitation";
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
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-surface-soft p-3 [container-type:inline-size] sm:p-5">
      <p className="truncate text-xs text-ink-muted sm:text-sm">{libelle}</p>
      <p className="font-display leading-tight whitespace-nowrap" style={{ fontSize: "clamp(1rem, 18cqw, 1.875rem)" }}>
        {valeur}
      </p>
    </div>
  );
}

type InviteListe = Awaited<ReturnType<typeof charger>>[number];

function charger(weddingId: string) {
  return db.guest.findMany({
    // Les mariés ne sont pas des invités : ils n'apparaissent que sur le plan de table.
    where: { weddingId, isCouple: false },
    include: { household: true, moments: true },
    // Ordre de saisie : les membres d'une invitation gardent l'ordre de l'invitation (« Katy et Hervé »).
    orderBy: [{ createdAt: "asc" }],
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
  const listeB = tous.filter((g) => g.listB).length;
  const [recues, aTrier] = await Promise.all([
    db.addressSubmission.count({ where: { weddingId: mariage.id, status: { not: "IGNOREE" } } }),
    db.addressSubmission.findMany({ where: { weddingId: mariage.id, status: "A_TRIER" }, orderBy: { createdAt: "asc" } }),
  ]);

  const q = sansAccents(un(params.q));
  const reponse = un(params.reponse);
  const moment = un(params.moment);
  const vue = un(params.vue);
  const liste = un(params.liste);
  const filtres = tous.filter((g) => {
    if (reponse && g.rsvp !== reponse) return false;
    if (liste === "A" && g.listB) return false;
    if (liste === "B" && !g.listB) return false;
    if (moment && !g.moments.some((m) => m.momentId === moment)) return false;
    if (q && !sansAccents([g.firstName, g.lastName, g.email, g.household?.name].filter(Boolean).join(" ")).includes(q)) return false;
    return true;
  });

  const invitations = (liste: typeof filtres) =>
    regrouperParInvitation(
      liste.map((g) => ({
        id: g.id,
        prenom: g.firstName,
        nom: g.lastName,
        foyerId: g.householdId,
        foyer: g.household?.name ?? null,
        enfant: g.ageGroup === "ENFANT",
        reponse: g.rsvp,
        cote: g.side,
        lien: g.category,
        details: [g.listB ? "Liste B" : null, g.ageGroup === "ENFANT" ? `Enfant${g.age ? `, ${g.age} ans` : ""}` : null, g.diets.join(", ") || null, g.allergies ? `Allergies : ${g.allergies}` : null].filter(Boolean).join(" · "),
        aConfirmer: estAccompagnantAConfirmer(g.firstName),
        enLigne: g.rsvpOnline,
      })),
    );
  const versLigne = (inv: ReturnType<typeof invitations>[number]) => (
    <LigneInvitation key={inv.cle} titre={inv.titre} prenoms={inv.prenoms} reponse={inv.reponse} membres={inv.membres} />
  );

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
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/invites" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Invités</h1>
          <p className="mt-1 text-ink-muted">Ajoutez vos invités par invitation, comme sur un faire-part : une personne, un couple ou une famille. Chacun compte pour une place.</p>
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

      <CollecteAdresses jeton={mariage.addressToken} recues={recues} aTrier={aTrier} invites={tous.map((g) => ({ id: g.id, nom: [g.firstName, g.lastName].filter(Boolean).join(" ") }))} />

      {listeB > 0 || liste ? (
        <nav className="-mb-2 flex flex-wrap items-center gap-2 text-sm" aria-label="Listes A et B">
          <span className="text-ink-muted">Listes :</span>
          {[
            ["", `Tout le monde (${tous.length})`],
            ["A", `Liste A (${tous.length - listeB})`],
            ["B", `Liste B (${listeB})`],
          ].map(([v, l]) => {
            const p = new URLSearchParams(Object.entries(params).flatMap(([k, x]) => (typeof x === "string" && k !== "liste" ? [[k, x]] : [])));
            if (v) p.set("liste", v);
            return (
              <Link key={v} href={`/invites${p.size ? `?${p}` : ""}`} aria-current={liste === v ? "page" : undefined} className={`rounded-full border px-3 py-1 ${liste === v ? "border-ink bg-ink text-surface" : "border-line"}`}>
                {l}
              </Link>
            );
          })}
          <span className="text-xs text-ink-muted">La liste B : ceux que vous inviterez si des places se libèrent.</span>
        </nav>
      ) : null}

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

        {vue === "" && filtres.length > 0 && (() => {
          const cotes = (["PARTENAIRE_1", "PARTENAIRE_2", "COMMUN"] as const).filter((s) => s !== "PARTENAIRE_2" || mariage.partner2Name);
          const occupes = cotes.filter((s) => filtres.some((g) => g.side === s));
          const vides = cotes.filter((s) => !occupes.includes(s));
          return (
            <>
              {/* Seuls les côtés qui ont du monde prennent une colonne ; les autres tiennent en une ligne. */}
              <div className={`grid gap-4 ${occupes.length >= 3 ? "lg:grid-cols-2 2xl:grid-cols-3" : occupes.length === 2 ? "lg:grid-cols-2" : ""}`}>
                {occupes.map((s) => {
                  const liste = filtres.filter((g) => g.side === s);
                  const invs = invitations(liste).sort((x, y) => ordreLien(x.lien) - ordreLien(y.lien) || x.titre.localeCompare(y.titre, "fr"));
                  const groupes = [...new Set(invs.map((i) => i.lien))];
                  return (
                    <div key={s} className="flex min-w-0 flex-col gap-2 rounded-md border border-line bg-surface-raised p-4">
                      <h2 className="flex items-baseline justify-between font-display text-xl">
                        {nomCote[s]} <span className="font-sans text-sm text-ink-muted">{liste.length}</span>
                      </h2>
                      {groupes.map((lien) => (
                        <div key={lien ?? "aucun"}>
                          <p className="mt-2 text-xs font-semibold text-bronze uppercase">{libelleLien(lien)}</p>
                          <ul>{invs.filter((i) => i.lien === lien).map(versLigne)}</ul>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              {vides.length > 0 && <p className="text-sm text-ink-muted">{vides.map((s) => nomCote[s]).join(" · ")} : personne pour l’instant.</p>}
            </>
          );
        })()}

        {vue === "alpha" && filtres.length > 0 && (
          <ul className="rounded-md border border-line bg-surface-raised px-4">
            {invitations(filtres)
              .sort((x, y) => (x.membres[0]!.nom ?? x.titre).localeCompare(y.membres[0]!.nom ?? y.titre, "fr") || x.titre.localeCompare(y.titre, "fr"))
              .map(versLigne)}
          </ul>
        )}

        {vue === "tableau" && filtres.length > 0 && (
          <>
            <p className="-mb-2 text-xs text-ink-muted">Réponse : Oui = présent · ? = en attente de réponse · Non = absent. Touchez un nom pour ouvrir sa fiche.</p>
            <div className="overflow-x-auto rounded-md border border-line bg-surface-raised">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-soft text-xs text-ink-muted">
                  <tr>
                    {["Invité", "Côté", "Lien", "Foyer", "Âge", "Régimes", "Moments", "Réponse"].map((h, i) => (
                      <th key={h} className={`px-2.5 py-2 font-semibold whitespace-nowrap ${i === 0 ? "sticky left-0 z-10 bg-surface-soft" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filtres]
                    // Les membres d'un même foyer restent côte à côte.
                    .sort((x, y) => (x.household?.name ?? `${x.lastName ?? ""} ${x.firstName}`).localeCompare(y.household?.name ?? `${y.lastName ?? ""} ${y.firstName}`, "fr"))
                    .map((g) => {
                      const sesMoments = moments.filter((m) => g.moments.some((x) => x.momentId === m.id)).map((m) => m.name);
                      return (
                        <tr key={g.id} className="border-t border-line">
                          <td className="sticky left-0 z-10 bg-surface-raised px-2.5 py-2 whitespace-nowrap">
                            <Link href={`/invites/${g.id}`} className="font-semibold hover:underline">
                              {[g.firstName, g.lastName].filter(Boolean).join(" ")}
                            </Link>
                            {g.listB && <span className="ml-2 rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-semibold text-bronze">liste B</span>}
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{nomCote[g.side].replace("Côté ", "")}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{g.category ? libelleLien(g.category) : "—"}</td>
                          <td className="max-w-[11rem] truncate px-2.5 py-2" title={g.household?.name ?? undefined}>
                            {g.household?.name ?? "—"}
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{g.ageGroup === "ENFANT" ? `Enfant${g.age ? `, ${g.age} ans` : ""}` : "Adulte"}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{g.diets.join(", ") || "—"}</td>
                          {/* Sans moment précis, l'invité est attendu à tous les moments. */}
                          <td className="px-2.5 py-2 whitespace-nowrap">{sesMoments.length === 0 || sesMoments.length === moments.length ? "Tous" : sesMoments.join(", ")}</td>
                          <td className="px-2.5 py-2">
                            <BoutonsReponse g={g} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </>
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
