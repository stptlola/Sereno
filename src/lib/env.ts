import "server-only";
import { z } from "zod";

/**
 * Variables d'environnement du serveur, validées au démarrage.
 * La liste complète et leur rôle sont décrits dans DEPLOIEMENT.md.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  APP_URL: z.url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET doit faire au moins 32 caractères"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default("Sereno <bonjour@sereno.fr>"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  /** Protège l'envoi quotidien des rappels (tâche planifiée). Sans lui, l'envoi est désactivé. */
  CRON_SECRET: z.string().min(24, "CRON_SECRET doit faire au moins 24 caractères").optional(),
  /** Adresse qui reçoit les messages du formulaire de contact (par défaut, l'expéditeur des e-mails). */
  SUPPORT_EMAIL: z.email().optional(),
});

export type Env = z.infer<typeof schema>;

let cache: Env | undefined;

/** Lit et valide l'environnement une seule fois ; échoue clairement si une variable manque. */
export function env(): Env {
  if (!cache) {
    const resultat = schema.safeParse(process.env);
    if (!resultat.success) {
      const details = resultat.error.issues
        .map((i) => `- ${i.path.join(".")} : ${i.message.includes("received undefined") ? "variable manquante" : i.message}`)
        .join("\n");
      throw new Error(`Configuration invalide, voir DEPLOIEMENT.md :\n${details}`);
    }
    cache = resultat.data;
  }
  return cache;
}
