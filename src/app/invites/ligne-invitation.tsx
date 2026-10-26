"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { changerReponse, changerReponseInvitation, supprimerInvitation } from "../actions/invites";

export interface MembreLigne {
  id: string;
  prenom: string;
  nom: string | null;
  enfant: boolean;
  reponse: "EN_ATTENTE" | "PRESENT" | "ABSENT";
  details: string;
  aConfirmer: boolean;
  enLigne: boolean;
}

const REPONSES = [
  { valeur: "PRESENT", court: "Oui", libelle: "Présent", actif: "border-or bg-or text-ink" },
  { valeur: "EN_ATTENTE", court: "?", libelle: "En attente", actif: "border-line bg-surface-soft text-ink-muted" },
  { valeur: "ABSENT", court: "Non", libelle: "Absent", actif: "border-ink-muted bg-surface-raised text-ink-muted line-through" },
] as const;

const OUVERT = -112;

/**
 * Une ligne par invitation (foyer) : la réponse s'applique à tous en un geste,
 * on déplie pour répondre personne par personne, et l'on glisse vers la gauche pour supprimer.
 */
export function LigneInvitation({ titre, prenoms, membres, reponse }: { titre: string; prenoms: string; membres: MembreLigne[]; reponse: string }) {
  const [decalage, setDecalage] = useState(0);
  const [deplie, setDeplie] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, demarrer] = useTransition();
  const geste = useRef<{ x: number; y: number; depart: number; horizontal: boolean | null } | null>(null);
  const ids = membres.map((m) => m.id);
  const seul = membres.length === 1;

  const repondre = (rsvp: string, cible: string[]) =>
    demarrer(async () => {
      const fd = new FormData();
      cible.forEach((i) => fd.append("id", i));
      fd.set("rsvp", rsvp);
      await (cible.length === 1 ? changerReponse(fd) : changerReponseInvitation(fd));
    });
  const supprimer = () =>
    demarrer(async () => {
      const fd = new FormData();
      ids.forEach((i) => fd.append("id", i));
      await supprimerInvitation(fd);
    });

  const boutons = (actuelle: string, cible: string[], nom: string) => (
    <div className="flex shrink-0 gap-1" role="group" aria-label={`Réponse de ${nom}`}>
      {REPONSES.map((r) => (
        <button
          key={r.valeur}
          type="button"
          disabled={enCours}
          onClick={() => repondre(r.valeur, cible)}
          aria-pressed={actuelle === r.valeur}
          aria-label={`${r.libelle}${cible.length > 1 ? " pour toute l’invitation" : ""}`}
          className={`h-8 min-w-10 rounded-full border px-2 text-xs font-semibold ${actuelle === r.valeur ? r.actif : "border-line text-ink-muted hover:border-ink"}`}
        >
          {r.court}
        </button>
      ))}
    </div>
  );

  return (
    <li className="relative overflow-hidden border-b border-line last:border-b-0">
      {/* Zone de suppression, révélée en glissant vers la gauche. */}
      <div className="absolute inset-y-0 right-0 flex w-28 items-center justify-center bg-alerte">
        <button type="button" disabled={enCours} onClick={() => (confirmer ? supprimer() : setConfirmer(true))} className="h-full w-full px-2 text-sm font-semibold text-white" tabIndex={decalage ? 0 : -1}>
          {confirmer ? "Confirmer" : seul ? "Supprimer" : `Supprimer (${membres.length})`}
        </button>
      </div>
      <div
        className="relative bg-surface-raised py-2 transition-transform duration-150 [touch-action:pan-y]"
        style={{ transform: `translateX(${decalage}px)` }}
        onPointerDown={(e) => {
          geste.current = { x: e.clientX, y: e.clientY, depart: decalage, horizontal: null };
        }}
        onPointerMove={(e) => {
          const g = geste.current;
          if (!g) return;
          const dx = e.clientX - g.x;
          const dy = e.clientY - g.y;
          if (g.horizontal === null && Math.hypot(dx, dy) > 8) g.horizontal = Math.abs(dx) > Math.abs(dy);
          if (g.horizontal) setDecalage(Math.min(0, Math.max(OUVERT - 20, g.depart + dx)));
        }}
        onPointerUp={() => {
          const g = geste.current;
          geste.current = null;
          if (!g?.horizontal) return;
          setDecalage((d) => (d < OUVERT / 2 ? OUVERT : 0));
          setConfirmer(false);
        }}
        onPointerCancel={() => {
          geste.current = null;
          setDecalage(0);
        }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* Au moins 12rem pour le nom : faute de place, les boutons passent dessous au lieu de casser le nom mot par mot. */}
          <button type="button" onClick={() => (decalage ? setDecalage(0) : setDeplie(!deplie))} aria-expanded={deplie} className="flex min-w-0 flex-[1_1_12rem] flex-col text-left">
            <span className="font-semibold">
              {titre}
              {membres.some((m) => m.aConfirmer) && <span className="ml-2 rounded-full border border-or px-2 py-0.5 text-[10px] font-semibold text-bronze">prénom à confirmer</span>}
              {membres.some((m) => m.enLigne) && <span className="ml-2 rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-semibold text-bronze">en ligne</span>}
            </span>
            <span className="text-xs text-ink-muted">
              {seul ? membres[0]!.details || "Toucher pour les détails" : `${prenoms} · ${membres.length} personnes`}
              {reponse === "MIXTE" && <span className="font-semibold text-bronze"> · réponses mixtes</span>}
            </span>
          </button>
          {boutons(reponse, ids, titre)}
        </div>
        {deplie && (
          <div className="mt-2 flex flex-col gap-1 rounded-sm bg-surface-soft p-3">
            {!seul &&
              membres.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
                  <Link href={`/invites/${m.id}`} className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold underline">{[m.prenom, m.nom].filter(Boolean).join(" ")}</span>
                    {m.enfant && <span className="text-ink-muted"> (enfant)</span>}
                    {m.details && <span className="block text-xs text-ink-muted">{m.details}</span>}
                  </Link>
                  {boutons(m.reponse, [m.id], m.prenom)}
                </div>
              ))}
            <div className="flex flex-wrap gap-4 pt-1 text-sm">
              {seul && (
                <Link href={`/invites/${membres[0]!.id}`} className="text-bronze underline">
                  Ouvrir la fiche
                </Link>
              )}
              <button type="button" disabled={enCours} onClick={() => (confirmer ? supprimer() : setConfirmer(true))} className="text-alerte underline">
                {confirmer ? "Confirmer la suppression" : seul ? "Supprimer" : "Supprimer toute l’invitation"}
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
