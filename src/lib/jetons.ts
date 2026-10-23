import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Jeton aléatoire, non devinable, à mettre dans un lien. */
export function nouveauJeton(): string {
  return randomBytes(32).toString("base64url");
}

/** Empreinte stockée en base à la place du jeton. */
export function empreinte(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}
