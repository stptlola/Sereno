import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Bouton, classeChamp } from "@/components/ui";
import { LIENS, REGIMES } from "@/domain/invites/invites";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { estAccompagnantAConfirmer } from "@/domain/invites/invitation";
import { ajouterAuFoyer, modifierInvite, supprimerInvite } from "../../actions/invites";

export const metadata: Metadata = { title: "Invité · Sereno" };
export const dynamic = "force-dynamic";

function Choix({ name, valeur, actif, children, type = "radio" }: { name: string; valeur: string; actif: boolean; children: React.ReactNode; type?: "radio" | "checkbox" }) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={valeur} defaultChecked={actif} className="peer sr-only" />
      <span className="inline-block rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface peer-focus-visible:outline-2 peer-focus-visible:outline-or">
        {children}
      </span>
    </label>
  );
}

export default async function PageInvite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { mariage } = await accesEcriture();
  const [g, moments, foyers, site] = await Promise.all([
    db.guest.findFirst({ where: { id, weddingId: mariage.id }, include: { household: true, moments: true } }),
    db.moment.findMany({ where: { weddingId: mariage.id }, orderBy: { name: "asc" } }),
    db.household.findMany({ where: { weddingId: mariage.id }, orderBy: { name: "asc" } }),
    db.miniSite.findUnique({ where: { weddingId: mariage.id }, select: { questions: true } }),
  ]);
  if (!g) notFound();
  const autresDuFoyer = g.householdId ? await db.guest.findMany({ where: { householdId: g.householdId, id: { not: g.id } }, orderBy: { firstName: "asc" } }) : [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/invites" />
      <Link href="/invites" className="text-sm text-bronze underline">
        ← Retour aux invités
      </Link>
      {g.rsvpOnline && (
        <section className="flex flex-col gap-1 rounded-md bg-surface-soft p-4 text-sm">
          <p className="font-semibold">Réponse en ligne{g.rsvpAt ? ` le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(g.rsvpAt)}` : ""}</p>
          {g.rsvpMessage && <p className="italic">« {g.rsvpMessage} »</p>}
          {Object.entries((g.rsvpAnswers as Record<string, string>) ?? {}).map(([k, v]) => (
            <p key={k}>
              {((site?.questions as { id: string; libelle: string }[] | undefined) ?? []).find((q) => q.id === k)?.libelle ?? k} : {v}
            </p>
          ))}
        </section>
      )}
      {estAccompagnantAConfirmer(g.firstName) && (
        <p className="rounded-md border border-or p-3 text-sm">Accompagnant à confirmer : dès que vous connaissez son prénom, remplacez « {g.firstName} » ci-dessous.</p>
      )}
      <form key={g.updatedAt.getTime()} action={modifierInvite} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={g.id} />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Prénom</span>
            <input name="firstName" defaultValue={g.firstName} required maxLength={60} className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Nom</span>
            <input name="lastName" defaultValue={g.lastName ?? ""} maxLength={60} className={classeChamp} />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Réponse</legend>
          <div className="flex flex-wrap gap-2">
            <Choix name="rsvp" valeur="EN_ATTENTE" actif={g.rsvp === "EN_ATTENTE"}>En attente</Choix>
            <Choix name="rsvp" valeur="PRESENT" actif={g.rsvp === "PRESENT"}>Présent</Choix>
            <Choix name="rsvp" valeur="ABSENT" actif={g.rsvp === "ABSENT"}>Absent</Choix>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Côté</legend>
          <div className="flex flex-wrap gap-2">
            <Choix name="side" valeur="PARTENAIRE_1" actif={g.side === "PARTENAIRE_1"}>{mariage.partner1Name}</Choix>
            {mariage.partner2Name && (
              <Choix name="side" valeur="PARTENAIRE_2" actif={g.side === "PARTENAIRE_2"}>
                {mariage.partner2Name}
              </Choix>
            )}
            <Choix name="side" valeur="COMMUN" actif={g.side === "COMMUN"}>Commun</Choix>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Lien avec vous</span>
            <select name="category" defaultValue={g.category ?? ""} className={classeChamp}>
              <option value="">Non précisé</option>
              {LIENS.map((l) => (
                <option key={l.cle} value={l.cle}>
                  {l.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Foyer</span>
            <input name="household" list="foyers" defaultValue={g.household?.name ?? ""} maxLength={80} placeholder="Famille Martin" className={classeChamp} />
            <datalist id="foyers">
              {foyers.map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Âge</legend>
            <div className="flex gap-2">
              <Choix name="ageGroup" valeur="ADULTE" actif={g.ageGroup === "ADULTE"}>Adulte</Choix>
              <Choix name="ageGroup" valeur="ENFANT" actif={g.ageGroup === "ENFANT"}>Enfant</Choix>
            </div>
          </fieldset>
          <label className="flex w-28 flex-col gap-1.5">
            <span className="text-sm font-semibold">Âge (enfant)</span>
            <input name="age" type="number" min={0} max={17} defaultValue={g.age ?? ""} className={classeChamp} />
          </label>
          <label className="flex items-center gap-2 pb-3 text-sm">
            <input type="checkbox" name="accessibility" defaultChecked={g.accessibility} className="h-5 w-5" /> Doit être placé près d’une sortie (âge, mobilité)
          </label>
        </div>

        {moments.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Invité au…</legend>
            <div className="flex flex-wrap gap-2">
              {moments.map((m) => (
                <Choix key={m.id} type="checkbox" name="moments" valeur={m.id} actif={g.moments.some((x) => x.momentId === m.id)}>
                  {m.name}
                </Choix>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Régime alimentaire</legend>
          <div className="flex flex-wrap gap-2">
            {REGIMES.map((r) => (
              <Choix key={r} type="checkbox" name="diets" valeur={r} actif={g.diets.includes(r)}>
                {r}
              </Choix>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Allergies</span>
          <input name="allergies" defaultValue={g.allergies ?? ""} maxLength={300} placeholder="Arachides, fruits de mer…" className={classeChamp} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">E-mail</span>
            <input name="email" type="email" defaultValue={g.email ?? ""} maxLength={120} className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Téléphone</span>
            <input name="phone" type="tel" defaultValue={g.phone ?? ""} maxLength={30} className={classeChamp} />
          </label>
        </div>
        <Bouton type="submit">Enregistrer</Bouton>
      </form>
      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="font-display text-xl">Son foyer{g.household ? ` · ${g.household.name}` : ""}</h2>
        {autresDuFoyer.length > 0 ? (
          <ul className="flex flex-col text-sm">
            {autresDuFoyer.map((m) => (
              <li key={m.id}>
                <Link href={`/invites/${m.id}`} className="text-bronze underline">
                  {[m.firstName, m.lastName].filter(Boolean).join(" ")}
                </Link>
                {m.ageGroup === "ENFANT" ? " (enfant)" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Seul pour l’instant.</p>
        )}
        <form action={ajouterAuFoyer} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={g.id} />
          <input name="prenom" required maxLength={60} placeholder="Prénom" aria-label="Prénom de la personne à ajouter au foyer" className="min-w-0 flex-1 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm" />
          <input name="nom" maxLength={60} placeholder={g.lastName ?? "Nom"} aria-label="Nom de la personne à ajouter au foyer" className="min-w-0 flex-1 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm" />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="enfant" className="h-4 w-4" /> Enfant
          </label>
          <button type="submit" className="rounded-full border border-ink px-4 py-2 text-sm font-semibold">
            Ajouter au foyer
          </button>
        </form>
      </section>
      <form action={supprimerInvite} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={g.id} />
        <button type="submit" className="text-sm text-alerte underline">
          Retirer cet invité de la liste
        </button>
      </form>
    </main>
  );
}
