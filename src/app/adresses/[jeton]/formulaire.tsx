"use client";
import { startTransition, useActionState } from "react";
import { classeChamp, Message } from "@/components/ui";
import { envoyerAdresse, type EtatAdresse } from "@/app/actions/adresses";

export function FormulaireAdresse({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState<EtatAdresse, FormData>(envoyerAdresse, {});
  const champ = (name: string, libelle: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{libelle}</span>
      <input name={name} className={classeChamp} {...props} />
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      method="post"
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="jeton" value={jeton} />
      <div className="grid gap-3 sm:grid-cols-2">
        {champ("prenom", "Prénom", { required: true, maxLength: 60, autoComplete: "given-name" })}
        {champ("nom", "Nom", { required: true, maxLength: 60, autoComplete: "family-name" })}
      </div>
      {champ("rue", "Numéro et rue", { required: true, maxLength: 120, autoComplete: "address-line1" })}
      {champ("complement", "Complément (facultatif)", { maxLength: 120, autoComplete: "address-line2", placeholder: "Bâtiment, étage, lieu-dit…" })}
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        {champ("codePostal", "Code postal", { required: true, maxLength: 12, autoComplete: "postal-code", inputMode: "text" })}
        {champ("ville", "Ville", { required: true, maxLength: 80, autoComplete: "address-level2" })}
      </div>
      {champ("pays", "Pays", { defaultValue: "France", maxLength: 60, autoComplete: "country-name" })}
      <div className="grid gap-3 sm:grid-cols-2">
        {champ("email", "E-mail (facultatif)", { type: "email", autoComplete: "email" })}
        {champ("phone", "Téléphone (facultatif)", { type: "tel", autoComplete: "tel", maxLength: 30 })}
      </div>
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {etat.erreur && <Message>{etat.erreur}</Message>}
      <button type="submit" disabled={enCours} className="rounded-full bg-ink px-6 py-3 font-semibold text-surface">
        {enCours ? "Envoi…" : "Envoyer mon adresse"}
      </button>
      <p className="text-xs text-ink-muted">Votre adresse ne sert qu’à vous envoyer votre faire-part. Elle n’est visible que des mariés.</p>
    </form>
  );
}
