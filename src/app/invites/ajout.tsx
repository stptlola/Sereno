"use client";
import Link from "next/link";
import { startTransition, useActionState, useRef } from "react";
import { classeChamp, Message } from "@/components/ui";
import { LIENS } from "@/domain/invites/invites";
import { ajouterInvite, type EtatAjout } from "../actions/invites";

/** Ajout rapide d'un invité, avec alerte de doublon (M4-01, M4-10). */
export function AjoutInvite({ prenoms }: { prenoms: { p1: string; p2: string | null } }) {
  const formulaire = useRef<HTMLFormElement>(null);
  const [etat, action, enCours] = useActionState<EtatAjout, FormData>(async (prec, fd) => {
    const r = await ajouterInvite(prec, fd);
    if (r.ajoute) {
      formulaire.current?.reset();
      formulaire.current?.querySelector<HTMLInputElement>("input[name=firstName]")?.focus();
    }
    return r;
  }, {});
  const select = "rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm";
  // Envoi géré à la main : React viderait sinon le formulaire après chaque envoi,
  // et l'on perdrait la saisie en cas de doublon ou d'erreur. On ne le vide qu'en cas de succès.
  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }
  return (
    <form ref={formulaire} onSubmit={envoyer} className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4">
      <p className="font-semibold">Ajouter un invité</p>
      <div className="grid grid-cols-2 gap-2">
        <input name="firstName" required maxLength={60} placeholder="Prénom" aria-label="Prénom" className={`${classeChamp} py-2`} />
        <input name="lastName" maxLength={60} placeholder="Nom" aria-label="Nom" className={`${classeChamp} py-2`} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select name="side" aria-label="Côté" defaultValue="COMMUN" className={select}>
          <option value="PARTENAIRE_1">Côté {prenoms.p1}</option>
          {prenoms.p2 && <option value="PARTENAIRE_2">Côté {prenoms.p2}</option>}
          <option value="COMMUN">Commun</option>
        </select>
        <select name="category" aria-label="Lien avec vous" defaultValue="" className={select}>
          <option value="">Lien avec vous…</option>
          {LIENS.map((l) => (
            <option key={l.cle} value={l.cle}>
              {l.libelle}
            </option>
          ))}
        </select>
        <select name="ageGroup" aria-label="Adulte ou enfant" defaultValue="ADULTE" className={select}>
          <option value="ADULTE">Adulte</option>
          <option value="ENFANT">Enfant</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="plusOne" className="h-4 w-4" /> + 1 accompagnant
        </label>
        <button type="submit" disabled={enCours} className="ml-auto rounded-full bg-ink px-5 py-2 text-sm font-semibold text-surface">
          Ajouter
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
            Oui, l’ajouter quand même
          </button>
        </div>
      )}
      {etat.ajoute && !etat.doublon && (
        <p role="status" key={etat.essai} className="text-sm text-bronze">
          {etat.ajoute} est ajouté à la liste.
        </p>
      )}
    </form>
  );
}
