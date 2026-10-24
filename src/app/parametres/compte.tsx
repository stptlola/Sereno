"use client";
import { startTransition, useActionState, useState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { messageErreur } from "@/lib/erreurs-auth";
import { modifierNotifications, modifierProfil, supprimerCompte, type EtatCompte } from "../actions/compte";

/** Envoi sans remise à zéro automatique du formulaire (sinon la saisie disparaît en cas d'erreur). */
function envoiManuel(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

export function Notifications({ hebdo, rappels }: { hebdo: boolean; rappels: boolean }) {
  const [etat, action, enCours] = useActionState<EtatCompte, FormData>(modifierNotifications, {});
  return (
    <form onSubmit={envoiManuel(action)} className="flex flex-col gap-3">
      <label className="flex items-start gap-3">
        <input type="checkbox" name="notifHebdo" defaultChecked={hebdo} className="mt-1 h-5 w-5" />
        <span>
          <span className="font-semibold">Les priorités de la semaine</span>
          <span className="block text-sm text-ink-muted">Le lundi matin, vos 3 à 5 prochaines étapes. Une fois par mois seulement si votre mariage est encore loin.</span>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="notifRappels" defaultChecked={rappels} className="mt-1 h-5 w-5" />
        <span>
          <span className="font-semibold">Les rappels d’échéances importantes</span>
          <span className="block text-sm text-ink-muted">Une semaine avant une démarche en mairie ou une échéance importante.</span>
        </span>
      </label>
      <p className="text-sm text-ink-muted">Jamais plus d’un e-mail par jour. Les e-mails liés à votre compte (mot de passe oublié, par exemple) restent envoyés.</p>
      {etat.message && <Message type="info">{etat.message}</Message>}
      <Bouton type="submit" variante="contour" disabled={enCours} className="self-start">
        Enregistrer mes préférences
      </Bouton>
    </form>
  );
}

export function Profil({ prenom }: { prenom: string }) {
  const [etat, action, enCours] = useActionState<EtatCompte, FormData>(modifierProfil, {});
  return (
    <form onSubmit={envoiManuel(action)} className="flex flex-col gap-3">
      <Champ libelle="Votre prénom" id="name" name="name" defaultValue={prenom} required maxLength={60} />
      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.message && <Message type="info">{etat.message}</Message>}
      <Bouton type="submit" variante="contour" disabled={enCours} className="self-start">
        Enregistrer
      </Bouton>
    </form>
  );
}

export function MotDePasse() {
  const [etat, setEtat] = useState<EtatCompte>({});
  const [enCours, setEnCours] = useState(false);
  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setEnCours(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(f.get("actuel") ?? ""),
      newPassword: String(f.get("nouveau") ?? ""),
      revokeOtherSessions: true,
    });
    setEnCours(false);
    if (error) return setEtat({ erreur: error.code === "INVALID_PASSWORD" ? "Votre mot de passe actuel ne correspond pas." : messageErreur(error.code) });
    form.reset();
    setEtat({ message: "Votre mot de passe est changé. Vos autres appareils ont été déconnectés." });
  }
  return (
    <form onSubmit={soumettre} method="post" className="flex flex-col gap-3">
      <Champ libelle="Mot de passe actuel" id="actuel" name="actuel" type="password" autoComplete="current-password" required />
      <Champ libelle="Nouveau mot de passe" id="nouveau" name="nouveau" type="password" autoComplete="new-password" minLength={8} required aide="8 caractères minimum." />
      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.message && <Message type="info">{etat.message}</Message>}
      <Bouton type="submit" variante="contour" disabled={enCours} className="self-start">
        Changer mon mot de passe
      </Bouton>
    </form>
  );
}

export function SuppressionCompte({ avecPartenaire }: { avecPartenaire: boolean }) {
  const [etat, action, enCours] = useActionState<EtatCompte, FormData>(supprimerCompte, {});
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert)
    return (
      <button type="button" onClick={() => setOuvert(true)} className="self-start text-sm text-alerte underline">
        Supprimer mon compte
      </button>
    );
  return (
    <form onSubmit={envoiManuel(action)} className="flex flex-col gap-3 rounded-md border border-alerte p-4">
      <p className="font-semibold text-alerte">Supprimer définitivement votre compte</p>
      <p className="text-sm">
        {avecPartenaire
          ? "Votre compte et vos accès seront supprimés. Votre partenaire garde le mariage et toute l’organisation, et sera prévenu par e-mail."
          : "Votre compte, votre mariage et toutes ses données (planning, budget, invités) seront supprimés. C’est irréversible : pensez à exporter vos données avant."}
      </p>
      <Champ libelle="Pour confirmer, tapez SUPPRIMER" id="confirmation" name="confirmation" autoComplete="off" required />
      {etat.erreur && <Message>{etat.erreur}</Message>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={enCours} className="rounded-full bg-alerte px-5 py-2.5 font-semibold text-white">
          {enCours ? "Suppression…" : "Supprimer définitivement"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="rounded-full border border-line px-5 py-2.5">
          Annuler
        </button>
      </div>
    </form>
  );
}
