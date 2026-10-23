"use client";
import { authClient } from "@/lib/auth-client";
import { Bouton } from "./ui";

export function BoutonsSociaux({ google, apple, retour }: { google: boolean; apple: boolean; retour: string }) {
  if (!google && !apple) return null;
  return (
    <div className="flex flex-col gap-3">
      {google && (
        <Bouton type="button" variante="contour" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: retour })}>
          Continuer avec Google
        </Bouton>
      )}
      {apple && (
        <Bouton type="button" variante="contour" onClick={() => authClient.signIn.social({ provider: "apple", callbackURL: retour })}>
          Continuer avec Apple
        </Bouton>
      )}
      <p className="text-center text-sm text-ink-muted">ou avec votre adresse e-mail</p>
    </div>
  );
}
