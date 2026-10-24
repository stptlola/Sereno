import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaseTache } from "@/components/case-tache";
import { Navigation } from "@/components/navigation";
import { rubriqueParSlug } from "@/components/rubriques";
import { FrisePlanning, type VueTache } from "@/components/tableau";
import { ajouterMois, normaliser, sansAccents } from "@/domain/planning";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ rubrique: string }> }): Promise<Metadata> {
  const r = rubriqueParSlug((await params).rubrique);
  return { title: `${r?.libelle ?? "Bientôt"} · Sereno` };
}

/** Rubrique pas encore développée : ce qui arrive, et en attendant ses tâches du planning. */
export default async function PageBientot({ params }: { params: Promise<{ rubrique: string }> }) {
  const r = rubriqueParSlug((await params).rubrique);
  if (!r) notFound();
  if (!r.bientot) redirect(r.href);
  const { mariage } = await accesEcriture();
  const taches = await db.task.findMany({
    where: { weddingId: mariage.id, hidden: false, OR: [{ category: r.bientot.rubriquePlanning }, { category: { startsWith: `${r.bientot.rubriquePlanning} · ` } }] },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    include: { template: { select: { repere: true } } },
  });
  const mots = (r.bientot.mots ?? []).map(sansAccents);
  const retenues = mots.length ? taches.filter((t) => mots.some((m) => sansAccents(t.title).includes(m))) : taches;
  const vues: VueTache[] = retenues.map((t) => ({
    id: t.id,
    titre: t.title,
    conseil: t.tip,
    date: t.dueDate,
    faite: t.status === "FAIT",
    legale: t.template?.repere === "LEGAL",
    enCours: t.status === "EN_COURS",
    responsable: t.assignee,
    href: `/taches/${t.id}`,
  }));
  const aujourdhui = normaliser(new Date());

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif={r.href} />
      <div className="flex flex-col gap-3">
        <span className="self-start rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-bronze">Bientôt dans Sereno</span>
        <h1 className="font-display text-3xl">{r.libelle}</h1>
        <p className="text-lg text-ink-muted">{r.bientot.promesse}</p>
      </div>
      {vues.length > 0 ? (
        <>
          <p className="rounded-md bg-surface-soft p-4">
            En attendant, voici vos tâches qui concernent cette rubrique : vous pouvez déjà les cocher, les ouvrir et y noter vos idées.
          </p>
          <FrisePlanning
            taches={vues}
            aujourdhui={aujourdhui}
            dateMariage={mariage.date ?? ajouterMois(mariage.startDate, 12)}
            caseACocher={(t) => <CaseTache tache={t} />}
            toutOuvrir
          />
        </>
      ) : (
        <p className="rounded-md bg-surface-soft p-4">
          Aucune tâche de votre planning ne concerne encore cette rubrique.{" "}
          <Link href="/taches/nouvelle" className="font-semibold text-bronze underline">
            Ajoutez-en une
          </Link>{" "}
          si vous voulez noter quelque chose.
        </p>
      )}
    </main>
  );
}
