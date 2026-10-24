"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { adresseSite, adresseValide, type QuestionPerso } from "@/domain/site/site";
import { accesEcriture, lireDateJour } from "@/lib/acces";
import { db } from "@/lib/db";
import { envoyer } from "@/lib/email";
import { env } from "@/lib/env";
import { assurerLiensPersonnels } from "@/lib/liens-rsvp";
import { empreinteMotDePasse } from "@/lib/mot-de-passe";

export type EtatSite = { message?: string; erreur?: string };

const ligne = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);

/** Crée le mini-site avec une adresse tirée des prénoms, rendue unique si besoin (M5-01). */
export async function creerSite(): Promise<void> {
  const { mariage } = await accesEcriture();
  if (await db.miniSite.findUnique({ where: { weddingId: mariage.id } })) return;
  const base = adresseSite(mariage.partner1Name, mariage.partner2Name);
  let slug = base;
  for (let i = 2; await db.miniSite.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  await db.miniSite.create({
    data: {
      weddingId: mariage.id,
      slug,
      welcome: "Nous avons hâte de partager ce jour avec vous. Vous trouverez ici toutes les informations pratiques, et vous pouvez nous répondre en ligne.",
      faq: [
        { question: "Quelle tenue prévoir ?", reponse: "" },
        { question: "Où se garer ?", reponse: "" },
        { question: "Les enfants sont-ils invités ?", reponse: "" },
        { question: "Avez-vous une liste de cadeaux ?", reponse: "" },
      ],
    },
  });
  revalidatePath("/site");
}

/** Enregistre le contenu du mini-site (M5-01, M5-02, M5-05, M5-11, M5-12). */
export async function modifierSite(_: EtatSite, formData: FormData): Promise<EtatSite> {
  const { mariage } = await accesEcriture();
  const site = await db.miniSite.findUnique({ where: { weddingId: mariage.id } });
  if (!site) return { erreur: "Créez d’abord votre mini-site." };

  const slug = ligne(formData.get("slug"), 50).toLowerCase();
  if (!adresseValide(slug)) return { erreur: "L’adresse ne peut contenir que des lettres minuscules sans accent, des chiffres et des tirets (3 caractères au moins)." };
  if (slug !== site.slug && (await db.miniSite.findUnique({ where: { slug } }))) return { erreur: "Cette adresse est déjà prise : essayez-en une autre." };

  const tableau = (prefixe: string, champs: string[], n: number) =>
    Array.from({ length: n }, (_, i) => Object.fromEntries(champs.map((c) => [c, ligne(formData.get(`${prefixe}.${i}.${c}`), c === "reponse" ? 1000 : 200)]))).filter((o) =>
      Object.values(o).some(Boolean),
    );
  const questions: QuestionPerso[] = tableau("question", ["libelle", "type", "choix"], 4)
    .filter((q) => q.libelle)
    .map((q, i) => ({
      id: `q${i + 1}`,
      libelle: q.libelle!,
      type: q.type === "choix" ? "choix" : "texte",
      choix: q.type === "choix" ? q.choix!.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 8) : [],
    }));
  if (questions.some((q) => q.type === "choix" && q.choix.length < 2)) return { erreur: "Une question à choix a besoin d’au moins deux choix, séparés par des virgules." };

  const lien = ligne(formData.get("cadeauxLien"), 300);
  if (lien && !z.url({ protocol: /^https?$/ }).safeParse(lien).success) return { erreur: "Le lien de la liste de cadeaux doit commencer par https://." };

  const nouveauMdp = String(formData.get("motDePasse") ?? "");
  let passwordHash = site.passwordHash;
  if (formData.get("retirerMotDePasse") === "on") passwordHash = null;
  else if (nouveauMdp) {
    if (nouveauMdp.length < 4) return { erreur: "Le mot de passe du site doit faire au moins 4 caractères." };
    passwordHash = await empreinteMotDePasse(nouveauMdp);
  }

  await db.miniSite.update({
    where: { id: site.id },
    data: {
      slug,
      published: formData.get("published") === "on",
      passwordHash,
      welcome: ligne(formData.get("welcome"), 2000) || null,
      programme: tableau("programme", ["heure", "titre", "lieu"], 8),
      lieux: tableau("lieu", ["nom", "adresse"], 4),
      hebergements: ligne(formData.get("hebergements"), 3000) || null,
      transport: ligne(formData.get("transport"), 3000) || null,
      cadeauxLien: lien || null,
      faq: tableau("faq", ["question", "reponse"], 8).filter((f) => f.question && f.reponse),
      questions: questions as unknown as Prisma.InputJsonValue,
      rsvpDeadline: lireDateJour(formData.get("rsvpDeadline")),
    },
  });
  revalidatePath("/site");
  revalidatePath(`/m/${slug}`);
  return { message: formData.get("published") === "on" ? "C’est enregistré, et votre site est en ligne." : "C’est enregistré. Votre site n’est pas encore visible par vos invités." };
}

/** Envoie le lien de réponse aux foyers qui n'ont pas encore répondu et dont on a l'e-mail (M5-05). */
export async function relancerRetardataires(_: EtatSite): Promise<EtatSite> {
  const { mariage } = await accesEcriture();
  const site = await db.miniSite.findUnique({ where: { weddingId: mariage.id } });
  if (!site?.published) return { erreur: "Mettez d’abord votre site en ligne." };
  await assurerLiensPersonnels(mariage.id);
  const enAttente = await db.guest.findMany({ where: { weddingId: mariage.id, rsvp: "EN_ATTENTE", email: { not: null } }, include: { household: true } });
  // Un seul e-mail par foyer, à la première adresse connue.
  const parFoyer = new Map<string, (typeof enAttente)[number]>();
  for (const g of enAttente) if (!parFoyer.has(g.householdId ?? g.id)) parFoyer.set(g.householdId ?? g.id, g);
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" et ");
  const limite = site.rsvpDeadline ? ` avant le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(site.rsvpDeadline)}` : "";
  for (const g of parFoyer.values()) {
    await envoyer({
      a: g.email!,
      sujet: `${prenoms} : serez-vous des nôtres ?`,
      texte: `Bonjour ${g.firstName},\n\nNous préparons notre mariage et nous aimerions savoir si vous serez là. Il suffit de répondre en ligne${limite}, cela prend une minute${g.household ? `, pour vous et votre foyer` : ""}.\n\nÀ très bientôt,\n${prenoms}`,
      lien: { libelle: "Répondre à l’invitation", url: `${env().APP_URL}/m/${site.slug}/r/${g.rsvpToken}` },
    });
  }
  return { message: parFoyer.size ? `${parFoyer.size} invitation${parFoyer.size > 1 ? "s" : ""} relancée${parFoyer.size > 1 ? "s" : ""} par e-mail.` : "Personne à relancer : tous les invités dont vous avez l’e-mail ont répondu." };
}
