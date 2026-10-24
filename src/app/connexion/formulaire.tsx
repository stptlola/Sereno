"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoutonsSociaux } from "@/components/boutons-sociaux";
import { Bouton, Champ, Message } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { usePret } from "@/lib/pret";
import { messageErreur } from "@/lib/erreurs-auth";

export function FormulaireConnexion({ retour, google, apple }: { retour: string; google: boolean; apple: boolean }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const pret = usePret();
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEnvoi(true);
    setErreur(null);
    const { error } = await authClient.signIn.email({
      email: String(f.get("email") ?? "").trim(),
      password: String(f.get("motDePasse") ?? ""),
      rememberMe: true,
    });
    setEnvoi(false);
    if (error) return setErreur(messageErreur(error.code));
    router.push(retour);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <BoutonsSociaux google={google} apple={apple} retour={retour} />
      <form onSubmit={soumettre} method="post" className="flex flex-col gap-4">
        <Champ libelle="Adresse e-mail" id="email" name="email" type="email" autoComplete="email" required />
        <Champ libelle="Mot de passe" id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
        <Link href="/mot-de-passe-oublie" className="self-end text-sm text-bronze underline">
          Mot de passe oublié ?
        </Link>
        {erreur && <Message>{erreur}</Message>}
        <Bouton type="submit" disabled={envoi || !pret}>
          {envoi ? "Connexion…" : "Se connecter"}
        </Bouton>
      </form>
      <p className="text-center text-sm">
        Pas encore de compte ?{" "}
        <Link className="font-semibold text-bronze underline" href="/commencer">
          Commencer gratuitement
        </Link>
      </p>
    </div>
  );
}
