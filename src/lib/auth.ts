import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { envoyer } from "./email";
import { env } from "./env";

// Authentification (M0-01 à M0-04) : e-mail et mot de passe, Google et Apple si configurés.

function creerAuth() {
  const e = env();
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET)
    socialProviders.google = { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET };
  if (e.APPLE_CLIENT_ID && e.APPLE_CLIENT_SECRET)
    socialProviders.apple = { clientId: e.APPLE_CLIENT_ID, clientSecret: e.APPLE_CLIENT_SECRET };

  return betterAuth({
    appName: "Sereno",
    baseURL: e.APP_URL,
    secret: e.AUTH_SECRET,
    trustedOrigins: [e.APP_URL, "https://appleid.apple.com"],
    database: prismaAdapter(db, { provider: "postgresql" }),
    telemetry: { enabled: false },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 jours (M0-03)
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: 60 * 60, // 1 heure (M0-04)
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await envoyer({
          a: user.email,
          sujet: "Réinitialiser votre mot de passe Sereno",
          texte: `Bonjour ${user.name},\n\nVous avez demandé à changer votre mot de passe. Ce lien est valable une heure et ne peut servir qu'une fois.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.`,
          lien: { libelle: "Choisir un nouveau mot de passe", url },
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await envoyer({
          a: user.email,
          sujet: "Bienvenue sur Sereno : confirmez votre adresse",
          texte: `Bonjour ${user.name},\n\nVotre planning de mariage est bien sauvegardé. Confirmez votre adresse e-mail pour sécuriser votre compte.`,
          lien: { libelle: "Confirmer mon adresse", url },
        });
      },
    },
    socialProviders,
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof creerAuth>;
let instance: Auth | undefined;

/** Instance créée à la première utilisation, pour ne pas lire l'environnement pendant la construction. */
export function auth(): Auth {
  instance ??= creerAuth();
  return instance;
}

/** Fournisseurs de connexion disponibles, pour afficher ou non les boutons. */
export function fournisseursSociaux(): { google: boolean; apple: boolean } {
  const e = env();
  return {
    google: Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET),
    apple: Boolean(e.APPLE_CLIENT_ID && e.APPLE_CLIENT_SECRET),
  };
}
