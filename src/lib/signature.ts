import { createHmac, timingSafeEqual } from "node:crypto";

// Signature des liens sans connexion (désinscription des e-mails) : HMAC-SHA256 avec AUTH_SECRET.

export function signer(secret: string, donnees: string): string {
  return createHmac("sha256", secret).update(donnees).digest("base64url");
}

export function verifier(secret: string, donnees: string, signature: string): boolean {
  const attendue = Buffer.from(signer(secret, donnees));
  const recue = Buffer.from(signature);
  return attendue.length === recue.length && timingSafeEqual(attendue, recue);
}
