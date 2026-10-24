"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesChiffres, EnTeteMariage, FrisePlanning, ProchainesEtapes, type VueTache } from "@/components/tableau";
import { repartirBudget } from "@/domain/budget/repartition";
import { CLE_STOCKAGE_DEMARRAGE, type Culte } from "@/domain/mariage/reponses";
import {
  genererPlanning,
  MODELE_TACHES,
  normaliser,
  prochainesTaches,
  type Ceremonie,
  type PrestataireReservable,
} from "@/domain/planning";

// Parcours de démarrage (cahier des charges, section 6.2) : six écrans courts, puis le tableau de bord,
// avant même la création du compte (M0-10).

const PRESTATAIRES: { cle: PrestataireReservable; libelle: string }[] = [
  { cle: "lieu", libelle: "Le lieu" },
  { cle: "traiteur", libelle: "Le traiteur" },
  { cle: "photographe", libelle: "Le photographe" },
  { cle: "videaste", libelle: "Le vidéaste" },
  { cle: "dj", libelle: "Le DJ ou les musiciens" },
  { cle: "fleuriste", libelle: "Le fleuriste" },
  { cle: "coiffureMaquillage", libelle: "Coiffure et maquillage" },
];

const CEREMONIES: { cle: Ceremonie; libelle: string; aide: string }[] = [
  { cle: "CIVILE", libelle: "Civile", aide: "À la mairie, obligatoire en France pour être mariés." },
  { cle: "LAIQUE", libelle: "Laïque", aide: "Une cérémonie symbolique, à votre image." },
  { cle: "RELIGIEUSE", libelle: "Religieuse", aide: "Dans un lieu de culte." },
];

const CULTES: { cle: Culte; libelle: string }[] = [
  { cle: "catholique", libelle: "Catholique" },
  { cle: "protestant", libelle: "Protestante" },
  { cle: "orthodoxe", libelle: "Orthodoxe" },
  { cle: "juif", libelle: "Juive" },
  { cle: "musulman", libelle: "Musulmane" },
  { cle: "hindou", libelle: "Hindoue" },
  { cle: "bouddhiste", libelle: "Bouddhiste" },
  { cle: "autre", libelle: "Autre" },
];

interface Reponses {
  prenom1: string;
  prenom2: string;
  date: string;
  invites: string;
  budget: string;
  ceremonies: Ceremonie[];
  culte?: Culte;
  ceremoniesIndecises: boolean;
  dejaReserve: PrestataireReservable[];
}

const ETAPES = ["prenoms", "date", "invites", "budget", "ceremonies", "reserve"] as const;

function bascule<T>(liste: T[], valeur: T): T[] {
  return liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];
}

function conseilHorizon(jours: number, provisoire: boolean): string {
  if (provisoire) return "Pas de date encore ? Aucun souci : on part sur une date provisoire dans un an, que vous changerez quand vous voudrez.";
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
    ceremoniesIndecises: false,
    dejaReserve: [],
  });
  const termine = etape >= ETAPES.length;
  const ceremoniesRetenues: Ceremonie[] = r.ceremoniesIndecises || r.ceremonies.length === 0 ? ["CIVILE"] : r.ceremonies;

  // Les réponses restent sur l'appareil jusqu'à la création du compte (M0-10).
  useEffect(() => {
    if (!termine) return;
    const { ceremoniesIndecises: _, ...reste } = r;
    localStorage.setItem(CLE_STOCKAGE_DEMARRAGE, JSON.stringify({ ...reste, ceremonies: ceremoniesRetenues }));
  }, [termine, r, ceremoniesRetenues]);

  const aujourdhui = useMemo(() => normaliser(new Date()), []);
  const planning = useMemo(
    () =>
      genererPlanning(MODELE_TACHES, {
        dateMariage: r.date ? normaliser(new Date(`${r.date}T00:00:00Z`)) : null,
        dateDebut: aujourdhui,
        ceremonies: ceremoniesRetenues,
        dejaReserve: r.dejaReserve,
      }),
    [r.date, ceremoniesRetenues, r.dejaReserve, aujourdhui],
  );

  const suivant = () => setEtape((e) => e + 1);
  const precedent = () => setEtape((e) => Math.max(0, e - 1));

  if (termine) {
    const prenoms = [r.prenom1, r.prenom2].filter(Boolean).join(" et ");
    const budgetCentimes = Number(r.budget) > 0 ? Math.round(Number(r.budget) * 100) : null;
    const vues: VueTache[] = planning.taches.map((t) => ({
      id: t.modeleId,
      titre: t.titre,
      conseil: t.conseil,
      date: t.dateAffichee,
      faite: t.faite,
      legale: t.repere === "LEGAL",
    }));
    const prochaines = prochainesTaches(planning, 3).map((t) => vues.find((v) => v.id === t.modeleId)!);

    return (
      <div className="flex flex-col gap-8">
        <EnTeteMariage prenoms={prenoms} jours={planning.joursRestants} date={planning.dateMariage} provisoire={planning.dateProvisoire} />
        <CartesChiffres
          faites={vues.filter((v) => v.faite).length}
          total={vues.length}
          budgetCentimes={budgetCentimes}
          postes={repartirBudget(budgetCentimes)}
          invites={Number(r.invites) > 0 ? Number(r.invites) : null}
        />
        <div className="flex flex-col gap-3 rounded-md border border-or bg-surface-raised p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Votre planning est prêt : sauvegardez-le</p>
            <p className="text-sm text-ink-muted">Rien à payer. Retrouvez-le partout et ouvrez-le à votre partenaire.</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1">
            <Link href="/inscription?retour=/bienvenue" className="rounded-full bg-ink px-6 py-3 font-semibold text-surface">
              Créer mon compte
            </Link>
            <Link href="/connexion?retour=/bienvenue" className="text-sm text-bronze underline">
              J’ai déjà un compte
            </Link>
          </div>
        </div>
        <ProchainesEtapes taches={prochaines} aujourdhui={aujourdhui} />
        <FrisePlanning taches={vues} aujourdhui={aujourdhui} dateMariage={planning.dateMariage} />
        <button type="button" onClick={() => setEtape(0)} className="self-start text-sm text-bronze underline">
          Modifier mes réponses
        </button>
      </div>
    );
  }

  const nom = ETAPES[etape];
  const champ = "w-full rounded-sm border border-line bg-surface-raised px-4 py-3 text-lg outline-none focus:border-or";
  const choix = (actif: boolean) =>
    `rounded-full border px-4 py-2 text-left transition ${actif ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised hover:border-ink"}`;
  const nbInvites = Number(r.invites) || 0;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 rounded-full bg-surface-soft">
          <div className="h-1 rounded-full bg-or transition-all" style={{ width: `${((etape + 1) / ETAPES.length) * 100}%` }} />
        </div>
        <span className="text-sm text-ink-muted">
          {etape + 1}/{ETAPES.length}
        </span>
      </div>

      {nom === "prenoms" && (
        <>
          <h2 className="font-display text-3xl">Comment vous appelez-vous ?</h2>
          <input className={champ} placeholder="Prénom 1" aria-label="Prénom 1" value={r.prenom1} onChange={(e) => setR({ ...r, prenom1: e.target.value })} />
          <input className={champ} placeholder="Prénom 2" aria-label="Prénom 2" value={r.prenom2} onChange={(e) => setR({ ...r, prenom2: e.target.value })} />
        </>
      )}

      {nom === "date" && (
        <>
          <h2 className="font-display text-3xl">Quand est le grand jour ?</h2>
          <input type="date" aria-label="Date du mariage" className={champ} value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} />
          <p className="rounded-md bg-surface-soft p-4 text-ink-muted">{conseilHorizon(planning.joursRestants, planning.dateProvisoire)}</p>
        </>
      )}

      {nom === "invites" && (
        <>
          <h2 className="font-display text-3xl">Combien d’invités environ ?</h2>
          <input type="number" min={0} inputMode="numeric" aria-label="Nombre d’invités" className={champ} placeholder="Par exemple 100" value={r.invites} onChange={(e) => setR({ ...r, invites: e.target.value })} />
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
          <input type="number" min={0} inputMode="numeric" aria-label="Budget en euros" className={champ} placeholder="En euros, ou laissez vide" value={r.budget} onChange={(e) => setR({ ...r, budget: e.target.value })} />
          <p className="text-sm text-ink-muted">Vous ne savez pas encore ? Laissez vide, vous le compléterez plus tard.</p>
        </>
      )}

      {nom === "ceremonies" && (
        <>
          <h2 className="font-display text-3xl">Quelles cérémonies ?</h2>
          <p className="-mt-3 text-ink-muted">Plusieurs choix possibles.</p>
          <div className="flex flex-col gap-2">
            {CEREMONIES.map((c) => {
              const actif = !r.ceremoniesIndecises && r.ceremonies.includes(c.cle);
              return (
                <button
                  key={c.cle}
                  type="button"
                  aria-pressed={actif}
                  className={`rounded-md border p-4 text-left transition ${actif ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised hover:border-ink"}`}
                  onClick={() => setR({ ...r, ceremoniesIndecises: false, ceremonies: bascule(r.ceremonies, c.cle) })}
                >
                  <span className="font-semibold">{c.libelle}</span>
                  <span className={`block text-sm ${actif ? "text-grege" : "text-ink-muted"}`}>{c.aide}</span>
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={r.ceremoniesIndecises}
              className={`rounded-md border p-4 text-left transition ${r.ceremoniesIndecises ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised hover:border-ink"}`}
              onClick={() => setR({ ...r, ceremoniesIndecises: !r.ceremoniesIndecises })}
            >
              <span className="font-semibold">Pas encore décidé</span>
            </button>
          </div>
          {!r.ceremoniesIndecises && r.ceremonies.includes("RELIGIEUSE") && (
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Quel culte ?</p>
              <div className="flex flex-wrap gap-2">
                {CULTES.map((c) => (
                  <button key={c.cle} type="button" aria-pressed={r.culte === c.cle} className={choix(r.culte === c.cle)} onClick={() => setR({ ...r, culte: r.culte === c.cle ? undefined : c.cle })}>
                    {c.libelle}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {nom === "reserve" && (
        <>
          <h2 className="font-display text-3xl">Avez-vous déjà réservé quelque chose ?</h2>
          <div className="flex flex-wrap gap-2">
            {PRESTATAIRES.map((p) => (
              <button key={p.cle} type="button" aria-pressed={r.dejaReserve.includes(p.cle)} className={choix(r.dejaReserve.includes(p.cle))} onClick={() => setR({ ...r, dejaReserve: bascule(r.dejaReserve, p.cle) })}>
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
          {etape === ETAPES.length - 1 ? "Voir mon tableau de bord" : "Suivant"}
        </button>
      </div>
    </section>
  );
}
