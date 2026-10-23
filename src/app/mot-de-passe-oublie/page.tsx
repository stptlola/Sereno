"use client";
import { useState } from "react";
import { Bouton, Champ, Message, PageCompte } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function PageMotDePasseOublie() {
  const [envoye, setEnvoye] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnvoi(true);
    await authClient.requestPasswordReset({
      email: String(new FormData(e.currentTarget).get("email") ?? "").trim(),
      redirectTo: "/reinitialiser-mot-de-passe",
    });
    // Même message que l'adresse existe ou non, pour ne pas révéler les comptes.
    setEnvoi(false);
    setEnvoye(true);
  }

  return (
    <PageCompte titre="Mot de passe oublié" sousTitre="Indiquez votre adresse : nous vous envoyons un lien, valable une heure.">
      {envoye ? (
        <Message type="info">Si un compte existe avec cette adresse, un e-mail vient de partir. Pensez à regarder dans les indésirables.</Message>
      ) : (
        <form onSubmit={soumettre} className="flex flex-col gap-4">
          <Champ libelle="Adresse e-mail" id="email" name="email" type="email" autoComplete="email" required />
          <Bouton type="submit" disabled={envoi}>
            Recevoir le lien
          </Bouton>
        </form>
      )}
    </PageCompte>
  );
}
