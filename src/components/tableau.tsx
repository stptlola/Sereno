import type { ReactNode } from "react";

// Vue « tableau de bord », commune au récapitulatif du démarrage (sans compte)
// et au tableau de bord connecté. Composants sans état : utilisables côté serveur et client.

export interface VueTache {
  id: string;
  titre: string;
  conseil?: string | null;
  date: Date | null;
  faite: boolean;
  legale?: boolean;
}

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const formatJour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const formatMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const euros = (centimes: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(centimes / 100);

function Carte({ libelle, children, pied }: { libelle: string; children: ReactNode; pied?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-surface-soft p-5">
      <p className="text-sm text-ink-muted">{libelle}</p>
      <div className="font-display text-3xl leading-tight">{children}</div>
      {pied && <div className="mt-1 text-sm text-ink-muted">{pied}</div>}
    </div>
  );
}

function Barre({ pourcent }: { pourcent: number }) {
  return (
    <div className="mt-2 h-2 rounded-full bg-surface-raised" aria-hidden>
      <div className="h-2 rounded-full bg-or" style={{ width: `${Math.min(100, Math.max(0, pourcent))}%` }} />
    </div>
  );
}

export function EnTeteMariage({
  prenoms,
  jours,
  date,
  provisoire,
}: {
  prenoms: string;
  jours: number;
  date: Date;
  provisoire: boolean;
}) {
  const mois = Math.max(1, Math.round(jours / 30.4));
  const titre = provisoire
    ? `${prenoms ? `${prenoms}, votre` : "Votre"} mariage dans environ ${mois} mois`
    : jours > 0
      ? `J-${jours}`
      : jours === 0
        ? "C’est aujourd’hui !"
        : "Mariage passé";
  return (
    <div className="rounded-md bg-ink p-6 text-surface">
      {!provisoire && prenoms && <p className="text-sm text-or">{prenoms}</p>}
      <p className="mt-1 font-display text-4xl leading-tight">{titre}</p>
      <p className="mt-2 text-sm text-grege">
        {provisoire
          ? "Date provisoire : vous la changerez dès qu’elle sera fixée, tout se recalculera."
          : `${formatDate.format(date)} · environ ${mois} mois devant vous`}
      </p>
    </div>
  );
}

export function CartesChiffres({
  faites,
  total,
  budgetCentimes,
  postes,
  invites,
}: {
  faites: number;
  total: number;
  budgetCentimes: number | null;
  postes: { nom: string; prevuCentimes: number }[];
  invites: number | null;
}) {
  const avancement = total ? Math.round((faites / total) * 100) : 0;
  const principaux = [...postes].sort((a, b) => b.prevuCentimes - a.prevuCentimes).slice(0, 3);
  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Votre mariage en chiffres">
      <Carte libelle="Avancement" pied={`${faites} tâche${faites > 1 ? "s" : ""} faite${faites > 1 ? "s" : ""} sur ${total}`}>
        {avancement} %
        <Barre pourcent={avancement} />
      </Carte>
      <Carte
        libelle="Budget"
        pied={
          budgetCentimes
            ? principaux.map((p) => `${p.nom} ${euros(p.prevuCentimes)}`).join(" · ")
            : "À compléter quand vous y verrez plus clair."
        }
      >
        {budgetCentimes ? euros(budgetCentimes) : "À définir"}
      </Carte>
      <Carte libelle="Invités" pied={invites ? `Environ ${Math.ceil(invites / 10)} tables de 10` : "Une estimation suffit pour commencer."}>
        {invites ? `${invites}` : "À estimer"}
      </Carte>
    </section>
  );
}

export function ProchainesEtapes({
  taches,
  aujourdhui,
  caseACocher,
}: {
  taches: VueTache[];
  aujourdhui: Date;
  caseACocher?: (t: VueTache) => ReactNode;
}) {
  const premiere = taches[0]?.date;
  const cetteSemaine = premiere ? premiere.getTime() - aujourdhui.getTime() <= 7 * 86_400_000 : false;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl">{cetteSemaine ? "Cette semaine" : "Vos prochaines étapes"}</h2>
      {taches.length === 0 && <p className="text-ink-muted">Tout est fait pour l’instant. Profitez-en !</p>}
      {taches.map((t) => (
        <div key={t.id} className="flex gap-4 rounded-md border border-line bg-surface-raised p-4">
          {caseACocher?.(t)}
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{t.titre}</p>
              {t.date && <span className="text-sm text-bronze">{formatJour.format(t.date)}</span>}
            </div>
            {t.conseil && <p className="mt-1 text-sm text-ink-muted">{t.conseil}</p>}
          </div>
        </div>
      ))}
    </section>
  );
}

/** Le planning en frise, mois par mois : les deux premiers mois ouverts, les autres repliés avec leur compteur. */
export function FrisePlanning({
  taches,
  caseACocher,
  moisOuverts = 2,
}: {
  taches: VueTache[];
  caseACocher?: (t: VueTache) => ReactNode;
  moisOuverts?: number;
}) {
  const groupes: { cle: string; taches: VueTache[] }[] = [];
  for (const t of taches) {
    const cle = t.date ? formatMois.format(t.date) : "Sans date";
    const dernier = groupes[groupes.length - 1];
    if (dernier?.cle === cle) dernier.taches.push(t);
    else groupes.push({ cle, taches: [t] });
  }
  const premierAFaire = groupes.findIndex((g) => g.taches.some((t) => !t.faite));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl">Votre planning, mois par mois</h2>
      <ol className="relative flex flex-col gap-2 border-l-2 border-line pl-5">
        {groupes.map((g, i) => {
          const faites = g.taches.filter((t) => t.faite).length;
          const toutFait = faites === g.taches.length;
          const ouvert = premierAFaire >= 0 && i >= premierAFaire && i < premierAFaire + moisOuverts;
          return (
            <li key={g.cle} className="relative">
              <span
                aria-hidden
                className={`absolute top-4 -left-[27px] h-3 w-3 rounded-full border-2 ${toutFait ? "border-or bg-or" : "border-ink bg-surface"}`}
              />
              <details open={ouvert} className="group rounded-md border border-line bg-surface-raised">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold capitalize">{g.cle}</span>
                  <span className="flex items-center gap-3 text-sm text-ink-muted">
                    {faites}/{g.taches.length} faite{faites > 1 ? "s" : ""}
                    <span className="transition group-open:rotate-180" aria-hidden>
                      ▾
                    </span>
                  </span>
                </summary>
                <ul className="flex flex-col border-t border-line px-4 py-2">
                  {g.taches.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
                      {caseACocher?.(t)}
                      <span className={`flex-1 ${t.faite ? "text-ink-muted line-through" : ""}`}>{t.titre}</span>
                      {t.legale && <span className="shrink-0 text-xs font-semibold text-bronze">Démarche</span>}
                      {t.date && <span className="shrink-0 text-sm text-ink-muted">{formatJour.format(t.date)}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
