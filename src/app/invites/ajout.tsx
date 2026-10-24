"use client";
import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { Message } from "@/components/ui";
import { LIENS } from "@/domain/invites/invites";
import { ajouterInvitation, type EtatAjout } from "../actions/invites";

type Type = "personne" | "couple" | "famille";
const TYPES: { valeur: Type; libelle: string }[] = [
  { valeur: "personne", libelle: "Une personne" },
  { valeur: "couple", libelle: "Un couple" },
  { valeur: "famille", libelle: "Une famille" },
];

/** Ajout « par invitation », comme sur un faire-part : une personne, un couple ou une famille (M4-01 à M4-03). */
export function AjoutInvite({ prenoms }: { prenoms: { p1: string; p2: string | null } }) {
  const formulaire = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<Type>("personne");
  const [lignes, setLignes] = useState(3);
  const [etat, action, enCours] = useActionState<EtatAjout, FormData>(async (prec, fd) => {
    const r = await ajouterInvitation(prec, fd);
    if (r.ajoute) {
      formulaire.current?.reset();
      setLignes(3);
      formulaire.current?.querySelector<HTMLInputElement>("input[name=prenom-0]")?.focus();
    }
    return r;
  }, {});
  const champ = "min-w-0 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-or";
  const nbLignes = type === "personne" ? 1 : type === "couple" ? 2 : lignes;

  return (
    <form
      ref={formulaire}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Ajouter une invitation</p>
        <div className="flex rounded-full bg-surface-soft p-1" role="radiogroup" aria-label="Type d’invitation">
          {TYPES.map((t) => (
            <label key={t.valeur} className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${type === t.valeur ? "bg-ink font-semibold text-surface" : "text-ink-muted"}`}>
              <input type="radio" name="type" value={t.valeur} checked={type === t.valeur} onChange={() => setType(t.valeur)} className="sr-only" />
              {t.libelle}
            </label>
          ))}
        </div>
      </div>

      {type !== "personne" && (
        <input name="nomCommun" maxLength={60} placeholder={type === "famille" ? "Nom de famille" : "Nom de famille commun (facultatif)"} aria-label="Nom de famille commun" className={champ} />
      )}
      <div className="flex flex-col gap-2">
        {Array.from({ length: nbLignes }, (_, i) => (
          <div key={`${type}-${i}`} className="flex flex-wrap items-center gap-2">
            <input name={`prenom-${i}`} required={i === 0 || (type === "couple" && i === 1)} maxLength={60} placeholder={type === "personne" ? "Prénom" : `Prénom ${i + 1}`} aria-label={`Prénom ${i + 1}`} className={`${champ} flex-1`} />
            {type !== "famille" && <input name={`nom-${i}`} maxLength={60} placeholder={type === "couple" ? "Nom (si différent)" : "Nom"} aria-label={`Nom ${i + 1}`} className={`${champ} flex-1`} />}
            {type === "famille" && (
              <label className="flex items-center gap-1.5 text-sm text-ink-muted">
                <input type="checkbox" name={`enfant-${i}`} className="h-4 w-4" /> Enfant
              </label>
            )}
          </div>
        ))}
        {type === "famille" && lignes < 12 && (
          <button type="button" onClick={() => setLignes(lignes + 1)} className="self-start text-sm text-bronze underline">
            + Une personne de plus
          </button>
        )}
        {type === "personne" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="accompagnant" className="h-4 w-4" /> Avec un accompagnant (prénom à confirmer)
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select name="side" aria-label="Côté" defaultValue="COMMUN" className={champ}>
          <option value="PARTENAIRE_1">Côté {prenoms.p1}</option>
          {prenoms.p2 && <option value="PARTENAIRE_2">Côté {prenoms.p2}</option>}
          <option value="COMMUN">Commun</option>
        </select>
        <select name="category" aria-label="Lien avec vous" defaultValue="" className={champ}>
          <option value="">Lien avec vous…</option>
          {LIENS.map((l) => (
            <option key={l.cle} value={l.cle}>
              {l.libelle}
            </option>
          ))}
        </select>
        <button type="submit" disabled={enCours} className="ml-auto rounded-full bg-ink px-5 py-2 text-sm font-semibold text-surface">
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
      </div>

      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.doublon && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-sm bg-surface-soft p-3 text-sm">
          <span>
            <Link href={`/invites/${etat.doublon.id}`} className="font-semibold underline">
              {etat.doublon.nom}
            </Link>{" "}
            est déjà dans votre liste. Est-ce bien une autre personne ?
          </span>
          <input type="hidden" name="confirmerDoublon" value="1" />
          <button type="submit" className="rounded-full border border-ink px-3 py-1 font-semibold">
            Oui, ajouter quand même
          </button>
        </div>
      )}
      {etat.ajoute && !etat.doublon && (
        <p role="status" key={etat.essai} className="text-sm text-bronze">
          {etat.ajoute}
        </p>
      )}
    </form>
  );
}
