import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reponsesOuvertes } from "@/domain/site/site";
import { ecartJours, normaliser } from "@/domain/planning";
import { db } from "@/lib/db";
import { mariageDe, sessionCourante } from "@/lib/session";
import { chargerSitePublic } from "@/lib/site-public";
import { FormMotDePasse, TrouverInvitation } from "./formulaires";

export const dynamic = "force-dynamic";

const formatDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const formatCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

type Programme = { heure: string; titre: string; lieu: string }[];
type Lieux = { nom: string; adresse: string }[];
type Faq = { question: string; reponse: string }[];

async function charger(slug: string) {
  const acces = await chargerSitePublic(slug);
  if (acces) return { ...acces, apercu: false };
  // Aperçu pour le couple tant que le site n'est pas en ligne.
  const session = await sessionCourante();
  const site = await db.miniSite.findUnique({ where: { slug }, include: { wedding: { include: { moments: true } } } });
  if (!session || !site) return null;
  const acc = await mariageDe(session.user.id);
  return acc?.mariage.id === site.weddingId ? { site, verrouille: false, apercu: true } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await charger((await params).slug);
  const w = d?.site.wedding;
  return { title: w ? `${[w.partner1Name, w.partner2Name].filter(Boolean).join(" & ")} · notre mariage` : "Mariage" };
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl">{titre}</h2>
      {children}
    </section>
  );
}

export default async function SiteMariage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await charger(slug);
  if (!d) notFound();
  const { site, verrouille, apercu } = d;
  const w = site.wedding;
  const prenoms = [w.partner1Name, w.partner2Name].filter(Boolean).join(" & ");

  if (verrouille)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10 text-center">
        <p className="font-display text-4xl">{prenoms}</p>
        <p className="text-ink-muted">Ce site est réservé aux invités. Le mot de passe figure sur votre faire-part.</p>
        <FormMotDePasse slug={slug} />
      </main>
    );

  const aujourdhui = normaliser(new Date());
  const jours = w.date ? ecartJours(aujourdhui, w.date) : null;
  const programme = (site.programme as Programme) ?? [];
  const lieux = (site.lieux as Lieux) ?? [];
  const faq = (site.faq as Faq) ?? [];
  const ouvert = reponsesOuvertes(site.rsvpDeadline, aujourdhui);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-6 py-10">
      {apercu && (
        <p className="rounded-md border border-or p-3 text-sm">
          Aperçu : votre site n’est pas encore en ligne, vos invités ne le voient pas.{" "}
          <Link href="/site" className="font-semibold text-bronze underline">
            Revenir à l’éditeur
          </Link>
        </p>
      )}
      <header className="flex flex-col items-center gap-3 rounded-md bg-ink px-6 py-12 text-center text-surface">
        <p className="text-sm tracking-widest text-or uppercase">Notre mariage</p>
        <h1 className="font-display text-5xl leading-tight">{prenoms}</h1>
        {w.date && <p className="text-lg text-grege first-letter:uppercase">{formatDate.format(w.date)}</p>}
        {jours !== null && jours > 0 && <p className="text-sm text-or">Plus que {jours} jours</p>}
      </header>

      {site.welcome && <p className="text-center text-lg leading-relaxed whitespace-pre-line">{site.welcome}</p>}

      <section id="reponse" className="flex scroll-mt-6 flex-col gap-3 rounded-md border border-or bg-surface-raised p-5">
        <h2 className="font-display text-2xl">Votre réponse</h2>
        {ouvert ? (
          <>
            <p className="text-ink-muted">
              Indiquez votre prénom et votre nom pour retrouver votre invitation
              {site.rsvpDeadline ? `, et répondez avant le ${formatCourt.format(site.rsvpDeadline)}` : ""}.
            </p>
            <TrouverInvitation slug={slug} />
          </>
        ) : (
          <p className="text-ink-muted">La date limite de réponse est passée. Pour toute question, contactez directement les mariés.</p>
        )}
      </section>

      {programme.length > 0 && (
        <Bloc titre="Le programme">
          <ol className="flex flex-col border-l-2 border-or pl-5">
            {programme.map((p, i) => (
              <li key={i} className="relative py-2">
                <span className="absolute top-4 -left-[27px] h-3 w-3 rounded-full bg-or" aria-hidden />
                <p className="font-semibold">
                  {p.heure && <span className="mr-2 text-bronze">{p.heure}</span>}
                  {p.titre}
                </p>
                {p.lieu && <p className="text-sm text-ink-muted">{p.lieu}</p>}
              </li>
            ))}
          </ol>
        </Bloc>
      )}

      {lieux.length > 0 && (
        <Bloc titre="Les lieux">
          <div className="grid gap-3 sm:grid-cols-2">
            {lieux.map((l, i) => (
              <div key={i} className="rounded-md bg-surface-soft p-4">
                <p className="font-semibold">{l.nom}</p>
                {l.adresse && (
                  <>
                    <p className="text-sm whitespace-pre-line text-ink-muted">{l.adresse}</p>
                    <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(l.adresse)}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-bronze underline">
                      Voir sur la carte
                    </a>
                  </>
                )}
              </div>
            ))}
          </div>
        </Bloc>
      )}

      {site.hebergements && (
        <Bloc titre="Où dormir">
          <p className="whitespace-pre-line">{site.hebergements}</p>
        </Bloc>
      )}
      {site.transport && (
        <Bloc titre="Venir">
          <p className="whitespace-pre-line">{site.transport}</p>
        </Bloc>
      )}
      {site.cadeauxLien && (
        <Bloc titre="Liste de cadeaux">
          <a href={site.cadeauxLien} target="_blank" rel="noopener noreferrer" className="self-start rounded-full border border-ink px-5 py-2.5 font-semibold">
            Voir notre liste
          </a>
        </Bloc>
      )}
      {faq.length > 0 && (
        <Bloc titre="Questions fréquentes">
          <div className="flex flex-col gap-2">
            {faq.map((f, i) => (
              <details key={i} className="rounded-md border border-line bg-surface-raised p-4">
                <summary className="cursor-pointer font-semibold">{f.question}</summary>
                <p className="mt-2 whitespace-pre-line text-ink-muted">{f.reponse}</p>
              </details>
            ))}
          </div>
        </Bloc>
      )}
      <p className="mt-6 text-center text-xs text-ink-muted">
        Site créé avec{" "}
        <Link href="/" className="underline">
          Sereno
        </Link>
      </p>
    </main>
  );
}
