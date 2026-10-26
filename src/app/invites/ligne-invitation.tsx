"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { changerReponse, changerReponseInvitation, convierAuMoment, modifierChamp, modifierInvitation, supprimerInvitation } from "../actions/invites";

export interface MembreLigne {
  id: string;
  prenom: string;
  nom: string | null;
  enfant: boolean;
  reponse: "EN_ATTENTE" | "PRESENT" | "ABSENT";
  details: string;
  aConfirmer: boolean;
  enLigne: boolean;
  cote: string;
  /** Moments auxquels la personne est conviée ; vide = tous. */
  moments: string[];
}

export interface OptionsInvitation {
  moments: { id: string; nom: string }[];
  cotes: { valeur: string; libelle: string }[];
  liens: { cle: string; libelle: string }[];
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
export function LigneInvitation({
  cle,
  titre,
  prenoms,
  membres,
  reponse,
  foyer,
  lien,
  options,
}: {
  /** Identifiant stable de l'invitation : elle reste dépliée si elle change de colonne (de côté). */
  cle: string;
  titre: string;
  prenoms: string;
  membres: MembreLigne[];
  reponse: string;
  foyer: string | null;
  lien: string | null;
  options: OptionsInvitation;
}) {
  const [decalage, setDecalage] = useState(0);
  const ligne = useRef<HTMLLIElement>(null);
  const [deplie, setDeplieEtat] = useState(false);
  // L'invitation dépliée le reste après un changement de côté, qui la fait passer dans une autre colonne.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("sereno:invitation-ouverte") === cle) {
        setDeplieEtat(true);
        ligne.current?.scrollIntoView({ block: "nearest" });
      }
    } catch {
      /* stockage indisponible */
    }
  }, [cle]);
  const setDeplie = (v: boolean) => {
    setDeplieEtat(v);
    try {
      if (v) sessionStorage.setItem("sereno:invitation-ouverte", cle);
      else if (sessionStorage.getItem("sereno:invitation-ouverte") === cle) sessionStorage.removeItem("sereno:invitation-ouverte");
    } catch {
      /* rien */
    }
  };
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, demarrer] = useTransition();
  const geste = useRef<{ x: number; y: number; depart: number; horizontal: boolean | null } | null>(null);
  const ids = membres.map((m) => m.id);
  const seul = membres.length === 1;
  const petit = "rounded-sm border border-line bg-surface-raised px-2 py-1.5 text-sm";
  const coteCommun = new Set(membres.map((m) => m.cote)).size === 1 ? membres[0]!.cote : "";
  // Sans moment précis, une personne est conviée à tous les moments.
  const conviee = (m: MembreLigne, momentId: string) => m.moments.length === 0 || m.moments.includes(momentId);
  const agirSur = (f: () => Promise<unknown>) =>
    demarrer(async () => {
      await f();
    });
  const puce = (libelle: string, actif: boolean, surClic: () => void, aria: string, petitePuce = false) => (
    <button
      key={libelle}
      type="button"
      disabled={enCours}
      aria-pressed={actif}
      aria-label={aria}
      onClick={surClic}
      className={`rounded-full border ${petitePuce ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"} ${actif ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised text-ink-muted line-through decoration-ink-muted/50"}`}
    >
      {actif ? "✓ " : ""}
      {libelle}
    </button>
  );

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
    <li ref={ligne} className="relative overflow-hidden border-b border-line last:border-b-0">
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
          <div className="mt-2 flex flex-col gap-3 rounded-sm bg-surface-soft p-3">
            {/* Pour toute l'invitation : nom du foyer, côté, lien et moments, appliqués à tous d'un coup. */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-bronze uppercase">{seul ? "Modifier" : "Pour toute l’invitation"}</p>
              <div className="flex flex-wrap items-center gap-2">
                {!seul && foyer !== null && (
                  <input
                    key={foyer}
                    defaultValue={foyer}
                    maxLength={80}
                    aria-label="Nom du foyer"
                    onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== foyer && agirSur(() => modifierInvitation(ids, { foyer: e.target.value }))}
                    className={`${petit} min-w-0 flex-[1_1_12rem] font-semibold`}
                  />
                )}
                <select key={`c-${coteCommun}`} defaultValue={coteCommun} aria-label="Côté de toute l’invitation" onChange={(e) => agirSur(() => modifierInvitation(ids, { cote: e.target.value }))} className={petit}>
                  {coteCommun === "" && <option value="">Côtés différents</option>}
                  {options.cotes.map((c) => (
                    <option key={c.valeur} value={c.valeur}>
                      {c.libelle}
                    </option>
                  ))}
                </select>
                <select key={`l-${lien}`} defaultValue={lien ?? ""} aria-label="Lien de toute l’invitation" onChange={(e) => agirSur(() => modifierInvitation(ids, { lien: e.target.value }))} className={petit}>
                  <option value="">Lien…</option>
                  {options.liens.map((l) => (
                    <option key={l.cle} value={l.cle}>
                      {l.libelle}
                    </option>
                  ))}
                </select>
              </div>
              {options.moments.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={seul ? "Moments" : "Moments de toute l’invitation"}>
                  <span className="text-xs text-ink-muted">{seul ? "Convié au :" : "Tous conviés au :"}</span>
                  {options.moments.map((mo) => {
                    const tousConvies = membres.every((m) => conviee(m, mo.id));
                    return puce(mo.nom, tousConvies, () => agirSur(() => convierAuMoment(ids, mo.id, !tousConvies)), `${mo.nom} : ${tousConvies ? "retirer" : "convier"} ${seul ? "" : "toute l’invitation"}`);
                  })}
                </div>
              )}
            </div>
            {!seul && (
              <div className="flex flex-col gap-2 border-t border-line pt-2">
                <p className="text-xs font-semibold tracking-wide text-bronze uppercase">Personne par personne</p>
                {membres.map((m) => (
                  <div key={`${m.id}-${m.cote}-${m.moments.join(",")}`} className="flex flex-col gap-1 py-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link href={`/invites/${m.id}`} className="min-w-0 flex-[1_1_10rem] text-sm">
                        <span className="font-semibold underline">{[m.prenom, m.nom].filter(Boolean).join(" ")}</span>
                        {m.enfant && <span className="text-ink-muted"> (enfant)</span>}
                        {m.details && <span className="block text-xs text-ink-muted">{m.details}</span>}
                      </Link>
                      <select defaultValue={m.cote} aria-label={`Côté de ${m.prenom}`} onChange={(e) => agirSur(() => modifierChamp(m.id, "side", e.target.value))} className={`${petit} py-1 text-xs`}>
                        {options.cotes.map((c) => (
                          <option key={c.valeur} value={c.valeur}>
                            {c.libelle}
                          </option>
                        ))}
                      </select>
                      {boutons(m.reponse, [m.id], m.prenom)}
                    </div>
                    {options.moments.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Moments de ${m.prenom}`}>
                        {options.moments.map((mo) => {
                          const oui = conviee(m, mo.id);
                          return puce(mo.nom, oui, () => agirSur(() => convierAuMoment([m.id], mo.id, !oui)), `${mo.nom} : ${oui ? "retirer" : "convier"} ${m.prenom}`, true);
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
