"use client";
import Link from "next/link";
import { useState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { messageErreur } from "@/lib/erreurs-auth";

export function FormulaireReinitialisation({ jeton }: { jeton: string | null }) {
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(jeton ? null : messageErreur("INVALID_TOKEN"));

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!jeton) return;
    const { error } = await authClient.resetPassword({
      newPassword: String(new FormData(e.currentTarget).get("motDePasse") ?? ""),
      token: jeton,
    });
    if (error) return setErreur(messageErreur(error.code));
    setFait(true);
  }

  if (fait)
    return (
      <Message type="info">
        Votre mot de passe est changé.{" "}
        <Link href="/connexion" className="font-semibold underline">
          Se connecter
        </Link>
      </Message>
    );

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-4">
      <Champ
        libelle="Nouveau mot de passe"
        id="motDePasse"
        name="motDePasse"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        aide="8 caractères minimum."
      />
      {erreur && <Message>{erreur}</Message>}
      <Bouton type="submit" disabled={!jeton}>
        Changer mon mot de passe
      </Bouton>
    </form>
  );
}
