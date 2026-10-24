import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Mot de passe du mini-site : empreinte scrypt salée, jamais le mot de passe en clair.
const scryptAsync = promisify(scrypt) as (motDePasse: string, sel: Buffer, longueur: number) => Promise<Buffer>;

export async function empreinteMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await scryptAsync(motDePasse, sel, 32);
  return `scrypt$${sel.toString("base64url")}$${cle.toString("base64url")}`;
}

export async function verifierMotDePasse(motDePasse: string, empreinte: string): Promise<boolean> {
  const [algo, sel, cle] = empreinte.split("$");
  if (algo !== "scrypt" || !sel || !cle) return false;
  const attendue = Buffer.from(cle, "base64url");
  const calculee = await scryptAsync(motDePasse, Buffer.from(sel, "base64url"), attendue.length);
  return timingSafeEqual(attendue, calculee);
}
