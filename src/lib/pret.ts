"use client";
import { useEffect, useState } from "react";

/**
 * Vrai une fois la page prête (code JavaScript chargé). Sert à désactiver l'envoi des formulaires
 * sensibles avant : sinon le navigateur les enverrait à l'ancienne, mot de passe compris dans l'adresse.
 */
export function usePret(): boolean {
  const [pret, setPret] = useState(false);
  useEffect(() => setPret(true), []);
  return pret;
}
