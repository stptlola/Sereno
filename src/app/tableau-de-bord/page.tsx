import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ecartJours, normaliser } from "@/domain/planning";
import { db } from "@/lib/db";
import { mariageDe, utilisateurRequis } from "@/lib/session";
import { basculerTache } from "../actions/mariage";
import { Deconnexion } from "./deconnexion";
import { InvitationCopilote } from "./invitation-copilote";

export const metadata: Metadata = { title: "Tableau de bord · Sereno" };
export const dynamic = "force-dynamic";

const formatJour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const formatMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function CaseTache({ id, faite, titre }: { id: string; faite: boolean; titre: string }) {
  return (
    <form action={basculerTache}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={faite ? `Rouvrir : ${titre}` : `Marquer comme faite : ${titre}`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 ${faite ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised hover:border-or"}`}
      >
        {faite && "✓"}
      </button>
    </form>
  );
}

export default async function TableauDeBord() {
  const user = await utilisateurRequis("/tableau-de-bord");
  const acces = await mariageDe(user.id);
  if (!acces) redirect("/commencer");
  const { mariage, role } = acces;

  const [taches, copilote] = await Promise.all([
    db.task.findMany({ where: { weddingId: mariage.id, hidden: false }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] }),
    db.member.findFirst({ where: { weddingId: mariage.id, role: "COPILOTE" }, include: { user: true } }),
  ]);

  const aujourdhui = normaliser(new Date());
  const jours = mariage.date ? ecartJours(aujourdhui, mariage.date) : null;
  const faites = taches.filter((t) => t.status === "FAIT").length;
  const avancement = taches.length ? Math.round((faites / taches.length) * 100) : 0;
  const prochaines = taches.filter((t) => t.status !== "FAIT").slice(0, 3);
  const procheSemaine = prochaines[0]?.dueDate ? ecartJours(aujourdhui, prochaines[0].dueDate) <= 7 : false;
  const titreProchaines = procheSemaine
    ? `Cette semaine, ${prochaines.length} petite${prochaines.length > 1 ? "s" : ""} chose${prochaines.length > 1 ? "s" : ""}`
    : "Vos prochaines étapes";
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" et ");

  const parMois = new Map<string, typeof taches>();
  for (const t of taches) {
    const cle = t.dueDate ? formatMois.format(t.dueDate) : "Sans date";
    parMois.set(cle, [...(parMois.get(cle) ?? []), t]);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold tracking-widest text-bronze uppercase">sereno</p>
        <Deconnexion />
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md bg-surface-soft p-5 sm:col-span-2">
          <p className="text-sm text-ink-muted">{prenoms}</p>
          <p className="mt-1 font-display text-4xl">
            {jours === null ? "Date à fixer" : jours > 0 ? `J-${jours}` : jours === 0 ? "C’est aujourd’hui !" : "Mariage passé"}
          </p>
          {mariage.date && <p className="mt-1 text-sm text-ink-muted">{formatDate.format(mariage.date)}</p>}
        </div>
        <div className="rounded-md bg-surface-soft p-5">
          <p className="text-sm text-ink-muted">Avancement</p>
          <p className="mt-1 font-display text-4xl">{avancement} %</p>
          <div className="mt-3 h-2 rounded-full bg-surface-raised">
            <div className="h-2 rounded-full bg-or" style={{ width: `${avancement}%` }} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">{titreProchaines}</h2>
        {prochaines.map((t) => (
          <div key={t.id} className="flex gap-4 rounded-md border border-line bg-surface-raised p-4">
            <CaseTache id={t.id} faite={false} titre={t.title} />
            <div>
              <p className="font-semibold">{t.title}</p>
              {t.tip && <p className="mt-1 text-sm text-ink-muted">{t.tip}</p>}
            </div>
          </div>
        ))}
      </section>

      {role === "CREATEUR" && !copilote && <InvitationCopilote />}
      {copilote && (
        <p className="text-sm text-ink-muted">
          Vous organisez à deux avec <span className="font-semibold text-ink">{copilote.user.name}</span>.
        </p>
      )}

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-2xl">Votre planning</h2>
        {[...parMois.entries()].map(([mois, liste]) => (
          <div key={mois} className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-bronze capitalize">{mois}</h3>
            {liste.map((t) => {
              const faite = t.status === "FAIT";
              return (
                <div key={t.id} className="flex items-center gap-3 border-b border-line py-2">
                  <CaseTache id={t.id} faite={faite} titre={t.title} />
                  <span className={`flex-1 ${faite ? "text-ink-muted line-through" : ""}`}>{t.title}</span>
                  {t.dueDate && <span className="shrink-0 text-sm text-ink-muted">{formatJour.format(t.dueDate)}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </main>
  );
}
