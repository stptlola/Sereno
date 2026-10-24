"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoutonsSociaux } from "@/components/boutons-sociaux";
import { Bouton, Champ, Message } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { usePret } from "@/lib/pret";
import { messageErreur } from "@/lib/erreurs-auth";

export function FormulaireInscription({ retour, google, apple }: { retour: string; google: boolean; apple: boolean }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const pret = usePret();
  const [code, setCode] = useState<string | undefined>();
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEnvoi(true);
    setErreur(null);
    const { error } = await authClient.signUp.email({
      name: String(f.get("prenom") ?? "").trim(),
      email: String(f.get("email") ?? "").trim(),
      password: String(f.get("motDePasse") ?? ""),
      callbackURL: retour,
    });
    setEnvoi(false);
    if (error) {
      setCode(error.code);
      setErreur(messageErreur(error.code));
      return;
    }
    router.push(retour);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <BoutonsSociaux google={google} apple={apple} retour={retour} />
      <form onSubmit={soumettre} method="post" className="flex flex-col gap-4">
        <Champ libelle="Votre prénom" id="prenom" name="prenom" autoComplete="given-name" required />
        <Champ libelle="Adresse e-mail" id="email" name="email" type="email" autoComplete="email" required />
        <Champ
          libelle="Mot de passe"
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aide="8 caractères minimum."
        />
        {erreur && (
          <Message>
            {erreur}{" "}
            {code?.startsWith("USER_ALREADY_EXISTS") && (
              <Link className="underline" href={`/connexion?retour=${encodeURIComponent(retour)}`}>
                Se connecter
              </Link>
            )}
          </Message>
        )}
        <Bouton type="submit" disabled={envoi || !pret}>
          {envoi ? "Création…" : "Créer mon compte"}
        </Bouton>
        <p className="text-center text-sm text-ink-muted">
          Rien à payer. En créant votre compte, vous acceptez les conditions d’utilisation.
        </p>
      </form>
      <p className="text-center text-sm">
        Déjà un compte ?{" "}
        <Link className="font-semibold text-bronze underline" href={`/connexion?retour=${encodeURIComponent(retour)}`}>
          Se connecter
        </Link>
      </p>
    </div>
  );
}
