import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Bouton } from "@/components/ui";
import type { QuestionPerso } from "@/domain/site/site";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { creerSite } from "../actions/site";
import { EditeurSite, Relance } from "./editeur";

export const metadata: Metadata = { title: "Mini-site · Sereno" };
export const dynamic = "force-dynamic";

export default async function PageSite() {
  const { mariage } = await accesEcriture();
  const site = await db.miniSite.findUnique({ where: { weddingId: mariage.id } });
  const [enLigne, enAttente, total] = await Promise.all([
    db.guest.count({ where: { weddingId: mariage.id, rsvpOnline: true } }),
    db.guest.count({ where: { weddingId: mariage.id, rsvp: "EN_ATTENTE" } }),
    db.guest.count({ where: { weddingId: mariage.id } }),
  ]);
  const base = env().APP_URL.replace(/^https?:\/\//, "");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/site" />
      <div>
        <h1 className="font-display text-3xl">Mini-site et réponses</h1>
        <p className="mt-1 text-ink-muted">Un site à votre image pour vos invités : le programme, les lieux, les infos pratiques, et leur réponse en ligne, qui arrive directement dans votre liste.</p>
      </div>
      {!site ? (
        <form action={creerSite} className="flex flex-col gap-3 rounded-md border border-or bg-surface-raised p-6">
          <p className="font-display text-xl">Créer votre mini-site</p>
          <p className="text-ink-muted">Il reste invisible tant que vous ne le mettez pas en ligne. Vous pourrez le prévisualiser à tout moment.</p>
          <Bouton type="submit" className="self-start">
            Créer mon site
          </Bouton>
        </form>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-md bg-surface-soft p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${site.published ? "bg-or text-ink" : "bg-surface-raised text-ink-muted"}`}>{site.published ? "En ligne" : "Brouillon"}</span>
              <input readOnly value={`${env().APP_URL}/m/${site.slug}`} aria-label="Adresse de votre site" className="min-w-0 flex-1 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm" />
              <Link href={`/m/${site.slug}`} target="_blank" className="text-sm font-semibold text-bronze underline">
                {site.published ? "Voir mon site" : "Aperçu"}
              </Link>
            </div>
            <p className="text-sm text-ink-muted">
              {enLigne} invité{enLigne > 1 ? "s ont" : " a"} répondu en ligne · {enAttente} en attente sur {total}.{" "}
              <Link href="/invites?reponse=EN_ATTENTE" className="text-bronze underline">
                Voir qui n’a pas répondu
              </Link>
            </p>
            {site.published && <Relance />}
          </section>
          <EditeurSite
            adresseBase={base}
            valeurs={{
              slug: site.slug,
              published: site.published,
              aMotDePasse: Boolean(site.passwordHash),
              welcome: site.welcome ?? "",
              programme: (site.programme as ValeursProgramme) ?? [],
              lieux: (site.lieux as { nom: string; adresse: string }[]) ?? [],
              hebergements: site.hebergements ?? "",
              transport: site.transport ?? "",
              cadeauxLien: site.cadeauxLien ?? "",
              faq: (site.faq as { question: string; reponse: string }[]) ?? [],
              questions: ((site.questions as unknown as QuestionPerso[]) ?? []).map((q) => ({ libelle: q.libelle, type: q.type, choix: q.choix.join(", ") })),
              rsvpDeadline: site.rsvpDeadline ? site.rsvpDeadline.toISOString().slice(0, 10) : "",
            }}
          />
        </>
      )}
    </main>
  );
}

type ValeursProgramme = { heure: string; titre: string; lieu: string }[];
