import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ecartJours, normaliser } from "@/domain/planning";
import { accesTemoin } from "@/lib/acces";
import { db } from "@/lib/db";
import { missionsDe } from "@/lib/missions";
import { Deconnexion } from "../tableau-de-bord/deconnexion";
import { ajouterTacheSecrete, basculerMission, basculerTacheSecrete, supprimerTacheSecrete } from "../actions/temoin";
import { RechercheTable } from "./recherche-table";

export const metadata: Metadata = { title: "Espace témoin · Sereno" };
export const dynamic = "force-dynamic";

const formatJour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const IDEES = ["Fixer la date avec les autres témoins", "Choisir l’activité", "Réserver l’activité", "Prévenir les invités", "Ouvrir une cagnotte", "Réserver le repas", "Prévoir le transport", "Préparer les surprises et les jeux"];

function Case({ action, id, faite, titre }: { action: (fd: FormData) => Promise<void>; id: string; faite: boolean; titre: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" aria-label={faite ? `Rouvrir : ${titre}` : `Marquer comme faite : ${titre}`} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 ${faite ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised hover:border-or"}`}>
        {faite && "✓"}
      </button>
    </form>
  );
}

/** Espace des témoins (M8-02) : missions, table d'un invité, préparation secrète de l'EVJF/EVG, contacts. */
export default async function EspaceTemoin() {
  const { user, mariage } = await accesTemoin();
  const [missions, secretes, temoins] = await Promise.all([
    missionsDe(mariage.id, user.name),
    db.task.findMany({ where: { weddingId: mariage.id, witnessOnly: true }, orderBy: [{ status: "asc" }, { createdAt: "asc" }] }),
    db.member.findMany({ where: { weddingId: mariage.id, role: "TEMOIN" }, include: { user: { select: { name: true, email: true } } } }),
  ]);
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" et ");
  const jours = mariage.date ? ecartJours(normaliser(new Date()), mariage.date) : null;
  const titres = new Set(secretes.map((t) => t.title.toLowerCase()));

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-6">
      <header className="flex items-center justify-between">
        <Logo className="h-7 w-auto" />
        <Deconnexion />
      </header>
      <section className="rounded-md bg-ink p-6 text-surface">
        <p className="text-sm text-or">Espace témoin · mariage de {prenoms}</p>
        <p className="mt-1 font-display text-4xl">{jours === null ? "Date à venir" : jours > 0 ? `J-${jours}` : jours === 0 ? "C’est aujourd’hui !" : "Mariage passé"}</p>
        <p className="mt-2 text-sm text-grege">Bonjour {user.name}. Merci d’être là pour eux : voici tout ce qu’il vous faut, et rien de plus.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Vos missions</h2>
        {missions.length === 0 ? (
          <p className="text-ink-muted">Les mariés ne vous ont pas encore confié de mission. Elles apparaîtront ici.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {missions.map((t) => (
              <li key={t.id} className="flex items-start gap-3 rounded-md border border-line bg-surface-raised p-3">
                <Case action={basculerMission} id={t.id} faite={t.status === "FAIT"} titre={t.title} />
                <div className="flex-1">
                  <p className={`font-semibold ${t.status === "FAIT" ? "text-ink-muted line-through" : ""}`}>{t.title}</p>
                  <p className="text-sm text-ink-muted">
                    {t.dueDate ? `Avant le ${formatJour.format(t.dueDate)}` : "Sans date"}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Trouver la table d’un invité</h2>
        <p className="-mt-2 text-sm text-ink-muted">Pratique le jour J, pour orienter ceux qui cherchent leur place.</p>
        <RechercheTable />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-or bg-surface-raised p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl">L’enterrement de vie de célibataire</h2>
        </div>
        <p className="-mt-2 text-sm font-semibold text-bronze">🔒 Secret : visible uniquement des témoins, jamais des mariés.</p>
        <ul className="flex flex-col">
          {secretes.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
              <Case action={basculerTacheSecrete} id={t.id} faite={t.status === "FAIT"} titre={t.title} />
              <span className={`flex-1 ${t.status === "FAIT" ? "text-ink-muted line-through" : ""}`}>
                {t.title}
                {t.assignee && <span className="ml-2 text-xs text-ink-muted">ajoutée par {t.assignee}</span>}
              </span>
              <form action={supprimerTacheSecrete}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" aria-label={`Supprimer : ${t.title}`} className="text-ink-muted hover:text-alerte">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={ajouterTacheSecrete} className="flex gap-2">
          <input name="title" required maxLength={160} placeholder="Une chose à préparer…" aria-label="Nouvelle tâche secrète" className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-3 py-2 text-sm" />
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface">
            Ajouter
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {IDEES.filter((i) => !titres.has(i.toLowerCase())).map((i) => (
            <form key={i} action={ajouterTacheSecrete}>
              <input type="hidden" name="title" value={i} />
              <button type="submit" className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-ink-muted hover:border-ink hover:text-ink">
                + {i}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Les témoins</h2>
        <ul className="flex flex-col gap-1">
          {temoins.map((t) => (
            <li key={t.id} className="text-sm">
              <span className="font-semibold">{t.user.name}</span>
              {t.userId !== user.id && (
                <>
                  {" "}
                  ·{" "}
                  <a href={`mailto:${t.user.email}`} className="text-bronze underline">
                    {t.user.email}
                  </a>
                </>
              )}
              {t.userId === user.id && <span className="text-ink-muted"> (vous)</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
