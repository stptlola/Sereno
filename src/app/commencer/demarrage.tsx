"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CLE_STOCKAGE_DEMARRAGE } from "@/domain/mariage/reponses";
import {
  genererPlanning,
  MODELE_TACHES,
  normaliser,
  prochainesTaches,
  type Ceremonie,
  type PrestataireReservable,
} from "@/domain/planning";

// Parcours de démarrage (cahier des charges, section 6.2) : le couple voit son planning
// avant de créer son compte (M0-10). La sauvegarde arrivera avec l'authentification (M0-01).

const PRESTATAIRES: { cle: PrestataireReservable; libelle: string }[] = [
  { cle: "lieu", libelle: "Le lieu" },
  { cle: "traiteur", libelle: "Le traiteur" },
  { cle: "photographe", libelle: "Le photographe" },
  { cle: "videaste", libelle: "Le vidéaste" },
  { cle: "dj", libelle: "Le DJ ou les musiciens" },
  { cle: "fleuriste", libelle: "Le fleuriste" },
  { cle: "coiffureMaquillage", libelle: "Coiffure et maquillage" },
];

const CEREMONIES: { cle: Ceremonie; libelle: string }[] = [
  { cle: "CIVILE", libelle: "Civile" },
  { cle: "LAIQUE", libelle: "Laïque" },
  { cle: "RELIGIEUSE", libelle: "Religieuse" },
];

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const formatMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

interface Reponses {
  prenom1: string;
  prenom2: string;
  date: string;
  invites: string;
  budget: string;
  ceremonies: Ceremonie[];
  dejaReserve: PrestataireReservable[];
}

const ETAPES = ["prenoms", "date", "invites", "budget", "ceremonies", "reserve"] as const;

function bascule<T>(liste: T[], valeur: T): T[] {
  return liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];
}

function conseilHorizon(jours: number, provisoire: boolean): string {
  if (provisoire) return "Pas de date encore ? Aucun souci, on part sur une date provisoire dans un an, que vous changerez quand vous voudrez.";
  if (jours > 540) return "Vous avez du temps devant vous : on avance à votre rythme, sans pression.";
  if (jours > 180) return "C’est un bel horizon : on commence par les réservations les plus demandées.";
  return "C’est serré, mais tout à fait faisable : on regroupe l’essentiel sur les premières semaines.";
}

export function Demarrage() {
  const [etape, setEtape] = useState(0);
  const [r, setR] = useState<Reponses>({
    prenom1: "",
    prenom2: "",
    date: "",
    invites: "",
    budget: "",
    ceremonies: ["CIVILE"],
    dejaReserve: [],
  });
  const termine = etape >= ETAPES.length;

  // Les réponses restent sur l'appareil jusqu'à la création du compte (M0-10).
  useEffect(() => {
    if (termine) localStorage.setItem(CLE_STOCKAGE_DEMARRAGE, JSON.stringify(r));
  }, [termine, r]);

  const planning = useMemo(
    () =>
      genererPlanning(MODELE_TACHES, {
        dateMariage: r.date ? normaliser(new Date(`${r.date}T00:00:00Z`)) : null,
        dateDebut: normaliser(new Date()),
        ceremonies: r.ceremonies,
        dejaReserve: r.dejaReserve,
      }),
    [r.date, r.ceremonies, r.dejaReserve],
  );

  const prenoms = [r.prenom1, r.prenom2].filter(Boolean).join(" et ") || "Vous";
  const faites = planning.taches.filter((t) => t.faite).length;
  const nbInvites = Number(r.invites) || 0;

  const suivant = () => setEtape((e) => e + 1);
  const precedent = () => setEtape((e) => Math.max(0, e - 1));

  if (termine) {
    const parMois = new Map<string, typeof planning.taches>();
    for (const t of planning.taches.filter((t) => !t.faite)) {
      const cle = formatMois.format(t.dateAffichee);
      parMois.set(cle, [...(parMois.get(cle) ?? []), t]);
    }
    return (
      <section className="flex flex-col gap-8">
        <div className="rounded-md bg-surface-soft p-6">
          <p className="text-sm text-ink-muted">Votre planning est prêt</p>
          <h2 className="mt-1 font-display text-3xl">
            {prenoms}, {planning.dateProvisoire ? "environ " : ""}
            {Math.round(planning.joursRestants / 30)} mois devant vous
          </h2>
          <p className="mt-3 text-ink-muted">
            {planning.taches.length} tâches, dont {faites} déjà faite{faites > 1 ? "s" : ""}.
            {planning.dateProvisoire ? "" : ` Jour J : ${formatDate.format(planning.dateMariage)}.`}
          </p>
        </div>
        <div>
          <h3 className="font-display text-xl">Cette semaine, 3 petites choses</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {prochainesTaches(planning, 3).map((t) => (
              <li key={t.modeleId} className="rounded-md border border-line bg-surface-raised p-4">
                <p className="font-semibold">{t.titre}</p>
                <p className="mt-1 text-sm text-ink-muted">{t.conseil}</p>
              </li>
            ))}
          </ul>
        </div>
        <details className="rounded-md border border-line bg-surface-raised p-4">
          <summary className="cursor-pointer font-semibold">Voir tout le planning</summary>
          <div className="mt-4 flex flex-col gap-5">
            {[...parMois.entries()].map(([mois, taches]) => (
              <div key={mois}>
                <p className="text-sm font-semibold text-bronze capitalize">{mois}</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {taches.map((t) => (
                    <li key={t.modeleId} className="flex justify-between gap-4 border-b border-line py-1">
                      <span>{t.titre}</span>
                      {t.repere === "LEGAL" && <span className="shrink-0 font-semibold text-bronze">Démarche</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
        <div className="flex flex-col gap-3 rounded-md border border-or p-5">
          <p className="font-semibold">Sauvegarder mon planning</p>
          <p className="text-sm text-ink-muted">Rien à payer. Retrouvez-le sur tous vos appareils et ouvrez-le à votre partenaire.</p>
          <Link href="/inscription?retour=/bienvenue" className="self-start rounded-full bg-ink px-6 py-3 font-semibold text-surface">
            Créer mon compte
          </Link>
          <Link href="/connexion?retour=/bienvenue" className="self-start text-sm text-bronze underline">
            J’ai déjà un compte
          </Link>
        </div>
        <button type="button" onClick={() => setEtape(0)} className="self-start text-sm text-bronze underline">
          Modifier mes réponses
        </button>
      </section>
    );
  }

  const nom = ETAPES[etape];
  const champ = "w-full rounded-sm border border-line bg-surface-raised px-4 py-3 text-lg outline-none focus:border-or";
  const choix = (actif: boolean) =>
    `rounded-full border px-4 py-2 text-left transition ${actif ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised"}`;

  return (
    <section className="flex flex-col gap-6">
      <div className="h-1 w-full rounded-full bg-surface-soft">
        <div className="h-1 rounded-full bg-or transition-all" style={{ width: `${((etape + 1) / ETAPES.length) * 100}%` }} />
      </div>

      {nom === "prenoms" && (
        <>
          <h2 className="font-display text-3xl">Comment vous appelez-vous ?</h2>
          <input className={champ} placeholder="Prénom 1" value={r.prenom1} onChange={(e) => setR({ ...r, prenom1: e.target.value })} />
          <input className={champ} placeholder="Prénom 2" value={r.prenom2} onChange={(e) => setR({ ...r, prenom2: e.target.value })} />
        </>
      )}

      {nom === "date" && (
        <>
          <h2 className="font-display text-3xl">Quand est le grand jour ?</h2>
          <input type="date" className={champ} value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} />
          <p className="rounded-md bg-surface-soft p-4 text-ink-muted">
            {conseilHorizon(planning.joursRestants, planning.dateProvisoire)}
          </p>
        </>
      )}

      {nom === "invites" && (
        <>
          <h2 className="font-display text-3xl">Combien d’invités environ ?</h2>
          <input type="number" min={0} inputMode="numeric" className={champ} placeholder="Par exemple 100" value={r.invites} onChange={(e) => setR({ ...r, invites: e.target.value })} />
          {nbInvites > 0 && (
            <p className="rounded-md bg-surface-soft p-4 text-ink-muted">
              {nbInvites} invités, c’est environ {Math.ceil(nbInvites / 2.5)} foyers à inviter et {Math.ceil(nbInvites / 10)} tables de 10. On s’occupe de tout suivre.
            </p>
          )}
        </>
      )}

      {nom === "budget" && (
        <>
          <h2 className="font-display text-3xl">Quel budget imaginez-vous ?</h2>
          <input type="number" min={0} inputMode="numeric" className={champ} placeholder="En euros, ou laissez vide" value={r.budget} onChange={(e) => setR({ ...r, budget: e.target.value })} />
          <p className="text-sm text-ink-muted">Vous ne savez pas encore ? Laissez vide, vous le compléterez plus tard.</p>
        </>
      )}

      {nom === "ceremonies" && (
        <>
          <h2 className="font-display text-3xl">Quelles cérémonies ?</h2>
          <div className="flex flex-wrap gap-2">
            {CEREMONIES.map((c) => (
              <button key={c.cle} type="button" className={choix(r.ceremonies.includes(c.cle))} onClick={() => setR({ ...r, ceremonies: bascule(r.ceremonies, c.cle) })}>
                {c.libelle}
              </button>
            ))}
          </div>
        </>
      )}

      {nom === "reserve" && (
        <>
          <h2 className="font-display text-3xl">Avez-vous déjà réservé quelque chose ?</h2>
          <div className="flex flex-wrap gap-2">
            {PRESTATAIRES.map((p) => (
              <button key={p.cle} type="button" className={choix(r.dejaReserve.includes(p.cle))} onClick={() => setR({ ...r, dejaReserve: bascule(r.dejaReserve, p.cle) })}>
                {p.libelle}
              </button>
            ))}
          </div>
          <p className="text-sm text-ink-muted">Ce qui est déjà fait sera coché d’office dans votre planning.</p>
        </>
      )}

      <div className="flex gap-3">
        {etape > 0 && (
          <button type="button" onClick={precedent} className="rounded-full border border-line px-6 py-3">
            Retour
          </button>
        )}
        <button type="button" onClick={suivant} className="rounded-full bg-ink px-6 py-3 font-semibold text-surface">
          {etape === ETAPES.length - 1 ? "Voir mon planning" : "Suivant"}
        </button>
      </div>
    </section>
  );
}
