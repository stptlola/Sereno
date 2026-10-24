"use client";
import { startTransition, useActionState } from "react";
import { Bouton, Champ, classeChamp, Message } from "@/components/ui";
import { contacter, type EtatContact } from "../actions/compte";

export function FormulaireContact({ nom, email }: { nom: string; email: string }) {
  const [etat, action, enCours] = useActionState<EtatContact, FormData>(contacter, {});
  if (etat.envoye) return <Message type="info">Merci, votre message est bien parti. Un accusé de réception vient de vous être envoyé, et nous vous répondons au plus vite.</Message>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-4"
    >
      <Champ libelle="Votre prénom" id="nom" name="nom" defaultValue={nom} required maxLength={80} />
      <Champ libelle="Votre adresse e-mail" id="email" name="email" type="email" defaultValue={email} required />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Votre message</span>
        <textarea name="message" rows={6} required minLength={10} maxLength={5000} className={classeChamp} placeholder="Une question, une idée, un souci ?" />
      </label>
      {/* Champ invisible : seuls les robots le remplissent. */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {etat.erreur && <Message>{etat.erreur}</Message>}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Envoi…" : "Envoyer"}
      </Bouton>
    </form>
  );
}
