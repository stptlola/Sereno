"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { actionGroupee, changerReponse, modifierChamp } from "../actions/invites";

export interface LigneTableau {
  id: string;
  prenom: string;
  nom: string;
  cote: "PARTENAIRE_1" | "PARTENAIRE_2" | "COMMUN";
  lien: string;
  foyer: string;
  enfant: boolean;
  age: number | null;
  regimes: string;
  moments: string;
  reponse: "EN_ATTENTE" | "PRESENT" | "ABSENT";
  listeB: boolean;
}

type Colonne = "nom" | "cote" | "lien" | "foyer" | "age" | "regimes" | "moments" | "reponse";
const ORDRE_REPONSE = { PRESENT: 0, EN_ATTENTE: 1, ABSENT: 2 } as const;
const REPONSES = [
  { valeur: "PRESENT", court: "Oui", libelle: "Présent", actif: "border-or bg-or text-ink" },
  { valeur: "EN_ATTENTE", court: "?", libelle: "En attente", actif: "border-line bg-surface-soft text-ink" },
  { valeur: "ABSENT", court: "Non", libelle: "Absent", actif: "border-ink-muted bg-surface-raised text-ink-muted line-through" },
] as const;

/**
 * Tableau des invités : tri par colonne, modification en place (enregistrée aussitôt),
 * sélection de plusieurs invités pour agir d'un coup, et suppression avec confirmation.
 */
export function TableauInvites({ lignes, cotes, liens }: { lignes: LigneTableau[]; cotes: { valeur: string; libelle: string }[]; liens: { cle: string; libelle: string }[] }) {
  const [tri, setTri] = useState<{ col: Colonne; sens: 1 | -1 } | null>(null);
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [confirmerGroupe, setConfirmerGroupe] = useState(false);
  const [message, setMessage] = useState("");
  const [enCours, demarrer] = useTransition();
  const libelleCote = new Map(cotes.map((c) => [c.valeur, c.libelle]));
  const libelleLien = new Map(liens.map((l) => [l.cle, l.libelle]));

  const triees = useMemo(() => {
    if (!tri) return lignes;
    const cle = (l: LigneTableau): string | number =>
      tri.col === "nom" ? `${l.nom} ${l.prenom}` : tri.col === "cote" ? (libelleCote.get(l.cote) ?? "") : tri.col === "lien" ? (libelleLien.get(l.lien) ?? "~") : tri.col === "age" ? (l.enfant ? 1 : 0) : tri.col === "reponse" ? ORDRE_REPONSE[l.reponse] : l[tri.col];
    return [...lignes].sort((a, b) => {
      const x = cle(a);
      const y = cle(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr")) * tri.sens;
    });
  }, [lignes, tri, libelleCote, libelleLien]);

  // La colonne Moments ne sert que si quelqu'un n'est pas attendu partout.
  const avecMoments = lignes.some((l) => l.moments !== "Tous");
  const trier = (col: Colonne) => setTri((t) => (t?.col === col ? (t.sens === 1 ? { col, sens: -1 } : null) : { col, sens: 1 }));
  const basculer = (id: string) => setChoisis((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
  const tous = choisis.size === lignes.length && lignes.length > 0;
  const groupe = (action: Parameters<typeof actionGroupee>[1], valeur = "") =>
    demarrer(async () => {
      const { faits } = await actionGroupee([...choisis], action, valeur);
      setMessage(action === "supprimer" ? `${faits} invité${faits > 1 ? "s" : ""} supprimé${faits > 1 ? "s" : ""}.` : `${faits} invité${faits > 1 ? "s" : ""} modifié${faits > 1 ? "s" : ""}.`);
      setChoisis(new Set());
      setConfirmerGroupe(false);
    });
  const champ = (id: string, nom: Parameters<typeof modifierChamp>[1], valeur: string) =>
    demarrer(async () => {
      const r = await modifierChamp(id, nom, valeur);
      if (r.erreur) setMessage(r.erreur);
    });
  const repondre = (id: string, rsvp: string) =>
    demarrer(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("rsvp", rsvp);
      await changerReponse(fd);
    });

  const enTete = (col: Colonne, libelle: string) => (
    <th className="px-2 py-2 font-semibold whitespace-nowrap" aria-sort={tri?.col === col ? (tri.sens === 1 ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => trier(col)} className="inline-flex items-center gap-1 hover:text-ink">
        {libelle}
        <span aria-hidden className={tri?.col === col ? "text-bronze" : "opacity-30"}>
          {tri?.col === col ? (tri.sens === 1 ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
  // Pas de largeur par défaut : chaque champ reçoit la sienne, pour que rien ne soit écrasé.
  const enPlace = "shrink-0 rounded-sm border border-transparent bg-transparent px-1.5 py-1 hover:border-line focus:border-or focus:bg-surface-raised focus:outline-none";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink-muted">Touchez une case pour la modifier, un titre de colonne pour trier. Réponse : Oui = présent · ? = en attente · Non = absent.</p>
      {choisis.size > 0 && (
        <div role="toolbar" aria-label="Actions sur la sélection" className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-surface shadow-md lg:top-2">
          <strong className="mr-1">
            {choisis.size} sélectionné{choisis.size > 1 ? "s" : ""}
          </strong>
          {REPONSES.map((r) => (
            <button key={r.valeur} type="button" disabled={enCours} onClick={() => groupe("reponse", r.valeur)} className="rounded-full border border-surface/30 px-3 py-1 hover:bg-surface/10">
              {r.libelle}
            </button>
          ))}
          <select aria-label="Changer le côté de la sélection" defaultValue="" onChange={(e) => e.target.value && groupe("cote", e.target.value)} className="rounded-full border border-surface/30 bg-ink px-2 py-1">
            <option value="" disabled>
              Côté…
            </option>
            {cotes.map((c) => (
              <option key={c.valeur} value={c.valeur}>
                {c.libelle}
              </option>
            ))}
          </select>
          <button type="button" disabled={enCours} onClick={() => groupe("liste", "B")} className="rounded-full border border-surface/30 px-3 py-1 hover:bg-surface/10">
            En liste B
          </button>
          <button type="button" disabled={enCours} onClick={() => groupe("liste", "A")} className="rounded-full border border-surface/30 px-3 py-1 hover:bg-surface/10">
            En liste A
          </button>
          <button type="button" disabled={enCours} onClick={() => (confirmerGroupe ? groupe("supprimer") : setConfirmerGroupe(true))} className="rounded-full bg-alerte px-3 py-1 font-semibold text-white">
            {confirmerGroupe ? `Confirmer la suppression (${choisis.size})` : "Supprimer"}
          </button>
          <button type="button" onClick={() => (setChoisis(new Set()), setConfirmerGroupe(false))} className="ml-auto text-or underline">
            Annuler
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm text-bronze">
          {message}
        </p>
      )}
      <div className="overflow-x-auto rounded-md border border-line bg-surface-raised" aria-busy={enCours}>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-soft text-xs text-ink-muted">
            <tr>
              <th className="sticky left-0 z-10 bg-surface-soft py-2 pr-2 pl-2 whitespace-nowrap" aria-sort={tri?.col === "nom" ? (tri.sens === 1 ? "ascending" : "descending") : undefined}>
                <span className="flex items-center gap-3">
                  <input type="checkbox" aria-label="Tout sélectionner" checked={tous} onChange={() => setChoisis(tous ? new Set() : new Set(lignes.map((l) => l.id)))} className="h-4 w-4" />
                  <button type="button" onClick={() => trier("nom")} className="inline-flex items-center gap-1 font-semibold hover:text-ink">
                    Invité
                    <span aria-hidden className={tri?.col === "nom" ? "text-bronze" : "opacity-30"}>
                      {tri?.col === "nom" ? (tri.sens === 1 ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </span>
              </th>
              {enTete("cote", "Côté")}
              {enTete("lien", "Lien")}
              {enTete("foyer", "Foyer")}
              {enTete("age", "Âge")}
              {enTete("regimes", "Régimes")}
              {avecMoments && enTete("moments", "Moments")}
              {enTete("reponse", "Réponse")}
              <th className="px-2 py-2">
                <span className="sr-only">Supprimer</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {triees.map((l) => (
              // La clé suit les valeurs : après un enregistrement, les champs reprennent les données à jour.
              <tr key={`${l.id}-${l.prenom}-${l.nom}-${l.cote}-${l.lien}-${l.enfant}`} className={`border-t border-line ${choisis.has(l.id) ? "bg-surface-soft" : ""}`}>
                <td className="sticky left-0 z-10 py-1.5 pr-1 pl-2" style={{ background: choisis.has(l.id) ? "var(--color-surface-soft)" : "var(--color-surface-raised)" }}>
                  <div className="flex items-center gap-1">
                    <input type="checkbox" aria-label={`Sélectionner ${l.prenom} ${l.nom}`} checked={choisis.has(l.id)} onChange={() => basculer(l.id)} className="mr-2 h-4 w-4 shrink-0" />
                    <input aria-label={`Prénom de ${l.prenom}`} defaultValue={l.prenom} maxLength={60} onBlur={(e) => e.target.value.trim() !== l.prenom && champ(l.id, "firstName", e.target.value)} className={`${enPlace} w-[5.5rem] font-semibold`} />
                    <input aria-label={`Nom de ${l.prenom}`} defaultValue={l.nom} maxLength={60} placeholder="Nom" onBlur={(e) => e.target.value.trim() !== l.nom && champ(l.id, "lastName", e.target.value)} className={`${enPlace} w-[6.5rem] font-semibold`} />
                    {l.listeB && <span className="shrink-0 rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-semibold text-bronze">B</span>}
                  </div>
                </td>
                <td className="px-1 py-1.5">
                  <select aria-label={`Côté de ${l.prenom}`} defaultValue={l.cote} onChange={(e) => champ(l.id, "side", e.target.value)} className={`${enPlace} w-24`}>
                    {cotes.map((c) => (
                      <option key={c.valeur} value={c.valeur}>
                        {c.libelle}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1.5">
                  <select aria-label={`Lien de ${l.prenom}`} defaultValue={l.lien} onChange={(e) => champ(l.id, "category", e.target.value)} className={`${enPlace} w-28`}>
                    <option value="">—</option>
                    {liens.map((x) => (
                      <option key={x.cle} value={x.cle}>
                        {x.libelle}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="max-w-[9rem] truncate px-2 py-1.5" title={l.foyer || undefined}>
                  <Link href={`/invites/${l.id}`} className="hover:underline">
                    {l.foyer || "—"}
                  </Link>
                </td>
                <td className="px-1 py-1.5">
                  <select aria-label={`Âge de ${l.prenom}`} defaultValue={l.enfant ? "ENFANT" : "ADULTE"} onChange={(e) => champ(l.id, "ageGroup", e.target.value)} className={`${enPlace} w-20`}>
                    <option value="ADULTE">Adulte</option>
                    <option value="ENFANT">Enfant{l.age ? `, ${l.age} ans` : ""}</option>
                  </select>
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">{l.regimes || "—"}</td>
                {avecMoments && <td className="px-2 py-1.5 whitespace-nowrap">{l.moments}</td>}
                <td className="px-2 py-1.5">
                  <div className="flex gap-1" role="group" aria-label={`Réponse de ${l.prenom}`}>
                    {REPONSES.map((r) => (
                      <button
                        key={r.valeur}
                        type="button"
                        disabled={enCours}
                        aria-pressed={l.reponse === r.valeur}
                        title={r.libelle}
                        onClick={() => repondre(l.id, r.valeur)}
                        className={`h-7 min-w-9 rounded-full border px-2 text-xs font-semibold ${l.reponse === r.valeur ? r.actif : "border-line text-ink-muted hover:border-ink"}`}
                      >
                        {r.court}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {aSupprimer === l.id ? (
                    <span className="flex gap-2 text-xs">
                      <button type="button" disabled={enCours} onClick={() => demarrer(async () => (await actionGroupee([l.id], "supprimer"), setASupprimer(null)))} className="font-semibold text-alerte underline">
                        Supprimer
                      </button>
                      <button type="button" onClick={() => setASupprimer(null)} className="text-ink-muted underline">
                        Non
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setASupprimer(l.id)} aria-label={`Supprimer ${l.prenom} ${l.nom}`} className="text-ink-muted hover:text-alerte">
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
