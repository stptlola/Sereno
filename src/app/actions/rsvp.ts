"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { REGIMES } from "@/domain/invites/invites";
import { memeNom, nettoyerReponsesPerso, reponsesOuvertes, validerReponses, type QuestionPerso } from "@/domain/site/site";
import { normaliser } from "@/domain/planning";
import { db } from "@/lib/db";
import { assurerLiensPersonnels } from "@/lib/liens-rsvp";
import { verifierMotDePasse } from "@/lib/mot-de-passe";
import { chargerSitePublic, foyerDuJeton, nomCookieSite, valeurCookieSite } from "@/lib/site-public";

// Actions publiques du mini-site : aucune connexion, mais tout est vérifié par le site et le lien personnel.

const slug = z.string().min(1).max(60);

export type EtatPublic = { erreur?: string };

export async function deverrouillerSite(_: EtatPublic, formData: FormData): Promise<EtatPublic> {
  const s = slug.parse(formData.get("slug"));
  const site = await db.miniSite.findUnique({ where: { slug: s } });
  if (!site?.published || !site.passwordHash) redirect(`/m/${s}`);
  if (!(await verifierMotDePasse(String(formData.get("motDePasse") ?? ""), site.passwordHash))) return { erreur: "Ce n’est pas le bon mot de passe. Il figure sur votre faire-part." };
  (await cookies()).set(nomCookieSite(site.id), valeurCookieSite(site.id, site.passwordHash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.APP_URL?.startsWith("https"),
    sameSite: "lax",
    path: `/m/${site.slug}`,
    maxAge: 60 * 60 * 24 * 60,
  });
  redirect(`/m/${site.slug}`);
}

/** Retrouve l'invitation par le prénom et le nom exacts (M5-03), sans rien révéler de la liste. */
export async function trouverInvitation(_: EtatPublic, formData: FormData): Promise<EtatPublic> {
  const s = slug.parse(formData.get("slug"));
  const acces = await chargerSitePublic(s);
  if (!acces || acces.verrouille) redirect(`/m/${s}`);
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!prenom || !nom) return { erreur: "Indiquez votre prénom et votre nom, comme sur votre invitation." };
  const candidats = await db.guest.findMany({ where: { weddingId: acces.site.weddingId, isCouple: false }, select: { id: true, firstName: true, lastName: true } });
  const trouve = candidats.filter((g) => memeNom({ prenom: g.firstName, nom: g.lastName }, { prenom, nom }));
  if (trouve.length !== 1) return { erreur: "Nous ne retrouvons pas votre invitation. Vérifiez l’orthographe, ou utilisez le lien reçu par e-mail." };
  await assurerLiensPersonnels(acces.site.weddingId);
  const g = await db.guest.findUniqueOrThrow({ where: { id: trouve[0]!.id } });
  redirect(`/m/${s}/r/${g.rsvpToken}`);
}

/** Enregistre la réponse de tout le foyer, qui arrive directement dans la liste du couple (M5-03, M5-04, M5-11). */
export async function repondre(_: EtatPublic, formData: FormData): Promise<EtatPublic> {
  const s = slug.parse(formData.get("slug"));
  const jeton = z.string().min(10).max(40).parse(formData.get("jeton"));
  // Le lien personnel est secret : il suffit, même si le site est protégé par un mot de passe.
  const acces = await chargerSitePublic(s);
  if (!acces) redirect(`/m/${s}`);
  const { site } = acces;
  if (!reponsesOuvertes(site.rsvpDeadline, normaliser(new Date()))) return { erreur: "La date limite de réponse est passée : contactez directement les mariés." };
  const foyer = await foyerDuJeton(site.weddingId, jeton);
  if (!foyer) redirect(`/m/${s}`);

  const tousLesMoments = site.wedding.moments.map((m) => m.id);
  const invitesA = (m: (typeof foyer.membres)[number]) => (m.moments.length ? m.moments.map((x) => x.momentId) : tousLesMoments);
  const reponses = foyer.membres.map((m) => ({
    guestId: m.id,
    reponse: formData.get(`reponse-${m.id}`) === "PRESENT" ? ("PRESENT" as const) : ("ABSENT" as const),
    // Les moments sont ceux auxquels le couple invite : l'invité confirme sa présence, il ne les modifie pas.
    moments: invitesA(m),
    regimes: formData.getAll(`regimes-${m.id}`).map(String),
    allergies: String(formData.get(`allergies-${m.id}`) ?? ""),
  }));
  if (foyer.membres.some((m) => !formData.get(`reponse-${m.id}`))) return { erreur: "Indiquez pour chaque personne si elle sera présente." };
  const { valides, erreur } = validerReponses(
    foyer.membres.map((m) => ({ id: m.id, momentsInvites: invitesA(m) })),
    reponses,
    REGIMES,
  );
  if (erreur) return { erreur };

  const questions = (site.questions as unknown as QuestionPerso[]) ?? [];
  const perso = nettoyerReponsesPerso(questions, Object.fromEntries(questions.map((q) => [q.id, String(formData.get(`question-${q.id}`) ?? "")])));
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000) || null;
  const maintenant = new Date();

  await db.$transaction([
    ...valides.map((r) =>
      db.guest.update({
        where: { id: r.guestId },
        data: { rsvp: r.reponse, rsvpAt: maintenant, rsvpOnline: true, diets: r.regimes, allergies: r.allergies },
      }),
    ),
    db.guest.update({ where: { id: foyer.invite.id }, data: { rsvpMessage: message, rsvpAnswers: perso } }),
    db.activityLog.create({ data: { weddingId: site.weddingId, entity: "Guest", entityId: foyer.invite.id, action: "reponse-en-ligne" } }),
  ]);
  revalidatePath("/invites");
  redirect(`/m/${s}/r/${jeton}?merci=1`);
}
