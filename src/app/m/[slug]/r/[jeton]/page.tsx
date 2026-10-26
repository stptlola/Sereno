import Link from "next/link";
import { notFound } from "next/navigation";
import { REGIMES } from "@/domain/invites/invites";
import { reponsesOuvertes, type QuestionPerso } from "@/domain/site/site";
import { normaliser } from "@/domain/planning";
import { chargerSitePublic, foyerDuJeton } from "@/lib/site-public";
import { FormReponse } from "../../formulaires";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votre réponse", robots: { index: false, follow: false } };

const formatCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** Réponse en ligne d'un foyer, via son lien personnel (M5-03). */
export default async function PageReponse({ params, searchParams }: { params: Promise<{ slug: string; jeton: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug, jeton } = await params;
  const { merci } = await searchParams;
  const acces = await chargerSitePublic(slug);
  if (!acces) notFound();
  const { site } = acces;
  const foyer = await foyerDuJeton(site.weddingId, jeton);
  if (!foyer) notFound();
  const w = site.wedding;
  const prenoms = [w.partner1Name, w.partner2Name].filter(Boolean).join(" & ");
  const nomsMoments = new Map(w.moments.map((m) => [m.id, m.name]));
  const ouvert = reponsesOuvertes(site.rsvpDeadline, normaliser(new Date()));
  const presents = foyer.membres.filter((m) => m.rsvp === "PRESENT").map((m) => m.firstName);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-6 py-10">
      <Link href={`/m/${slug}`} className="text-center font-display text-3xl">
        {prenoms}
      </Link>
      {merci ? (
        <div role="status" className="flex flex-col gap-2 rounded-md bg-ink p-6 text-surface">
          <p className="font-display text-2xl">Merci, c’est noté !</p>
          <p className="text-grege">
            {presents.length ? `Nous avons hâte de vous retrouver : ${presents.join(", ")}.` : "Vous allez nous manquer. Merci de nous avoir prévenus."}
          </p>
          {ouvert && <p className="text-sm text-or">Vous pouvez modifier votre réponse ci-dessous{site.rsvpDeadline ? ` jusqu’au ${formatCourt.format(site.rsvpDeadline)}` : ""}.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-3xl">Serez-vous des nôtres ?</h1>
          <p className="text-ink-muted">
            Bonjour {foyer.invite.firstName} ! Répondez pour {foyer.membres.length > 1 ? "chaque personne de votre invitation" : "vous"}
            {site.rsvpDeadline ? `, avant le ${formatCourt.format(site.rsvpDeadline)}` : ""}.
          </p>
        </div>
      )}
      {ouvert ? (
        <FormReponse
          slug={slug}
          jeton={jeton}
          membres={foyer.membres.map((m) => ({
            id: m.id,
            prenom: m.firstName,
            enfant: m.ageGroup === "ENFANT",
            reponse: m.rsvp,
            regimes: m.diets,
            allergies: m.allergies ?? "",
            plat: m.mealChoice ?? "",
            moments: (m.moments.length ? m.moments.map((x) => x.momentId) : w.moments.map((x) => x.id)).map((id) => nomsMoments.get(id) ?? "").filter(Boolean),
          }))}
          regimes={REGIMES}
          questions={(site.questions as unknown as QuestionPerso[]) ?? []}
          reponsesPerso={(foyer.invite.rsvpAnswers as Record<string, string>) ?? {}}
          message={foyer.invite.rsvpMessage ?? ""}
          plats={site.mealOptions}
        />
      ) : (
        <p className="rounded-md bg-surface-soft p-4 text-center">La date limite de réponse est passée. Pour toute question, contactez directement les mariés.</p>
      )}
    </main>
  );
}
