"use client";
import { useActionState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { inviterCopilote, type EtatInvitation } from "../actions/mariage";

export function InvitationCopilote() {
  const [etat, action, enCours] = useActionState<EtatInvitation, FormData>(inviterCopilote, {});
  return (
    <section className="flex flex-col gap-4 rounded-md border border-or p-5">
      <div>
        <h2 className="font-display text-xl">Organiser à deux</h2>
        <p className="mt-1 text-sm text-ink-muted">Invitez votre partenaire : mêmes droits, modifications visibles par vous deux.</p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <Champ libelle="Son adresse e-mail (facultatif)" id="email-copilote" name="email" type="email" autoComplete="off" />
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Création du lien…" : "Inviter mon partenaire"}
        </Bouton>
      </form>
      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.lien && (
        <div className="flex flex-col gap-2">
          {etat.message && <Message type="info">{etat.message}</Message>}
          <input readOnly value={etat.lien} className="w-full rounded-sm border border-line bg-surface-soft px-3 py-2 text-sm" onFocus={(e) => e.currentTarget.select()} aria-label="Lien d’invitation" />
          <p className="text-sm text-ink-muted">Valable 7 jours.</p>
        </div>
      )}
    </section>
  );
}
