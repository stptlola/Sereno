"use client";
import { startTransition, useActionState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { inviterTemoin, type EtatInvitation } from "../actions/mariage";

export function InvitationTemoin() {
  const [etat, action, enCours] = useActionState<EtatInvitation, FormData>(inviterTemoin, {});
  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
        className="flex flex-col gap-3"
      >
        <Champ libelle="E-mail de votre témoin (facultatif)" id="email-temoin" name="email" type="email" autoComplete="off" />
        <Bouton type="submit" variante="contour" disabled={enCours} className="self-start">
          {enCours ? "Création du lien…" : "Inviter un témoin"}
        </Bouton>
      </form>
      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.lien && (
        <div className="flex flex-col gap-2">
          {etat.message && <Message type="info">{etat.message}</Message>}
          <input readOnly value={etat.lien} onFocus={(e) => e.currentTarget.select()} aria-label="Lien d’invitation du témoin" className="w-full rounded-sm border border-line bg-surface-soft px-3 py-2 text-sm" />
          <p className="text-sm text-ink-muted">Valable 7 jours, pour une seule personne. Créez un lien par témoin.</p>
        </div>
      )}
    </div>
  );
}
