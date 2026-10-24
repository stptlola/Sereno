import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { accesEcriture } from "@/lib/acces";
import { db } from "@/lib/db";
import { Deconnexion } from "../tableau-de-bord/deconnexion";
import { MotDePasse, Notifications, Profil, SuppressionCompte } from "./compte";
import { retirerTemoin } from "../actions/mariage";
import { FormulaireParametres } from "./formulaire";
import { InvitationTemoin } from "./temoins";

export const metadata: Metadata = { title: "Réglages · Sereno" };
export const dynamic = "force-dynamic";

function Section({ id, titre, children }: { id?: string; titre: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-4 border-t border-line pt-6">
      <h2 className="font-display text-2xl">{titre}</h2>
      {children}
    </section>
  );
}

export default async function PageParametres() {
  const { mariage, user } = await accesEcriture();
  const [compte, partenaires, aMotDePasse, temoins] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, notifHebdo: true, notifRappels: true } }),
    db.member.count({ where: { weddingId: mariage.id, userId: { not: user.id }, role: { in: ["CREATEUR", "COPILOTE"] } } }),
    db.account.count({ where: { userId: user.id, providerId: "credential" } }),
    db.member.findMany({ where: { weddingId: mariage.id, role: "TEMOIN" }, include: { user: { select: { name: true, email: true } } } }),
  ]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 pt-0 pb-28 lg:pb-12">
      <Navigation actif="/parametres" />
      <div>
        <h1 className="font-display text-3xl">Votre mariage</h1>
        <p className="mt-1 text-ink-muted">Ces informations personnalisent votre planning. Modifiez-les quand vous voulez.</p>
      </div>
      <FormulaireParametres
        valeurs={{
          partner1Name: mariage.partner1Name,
          partner2Name: mariage.partner2Name ?? "",
          date: mariage.date ? mariage.date.toISOString().slice(0, 10) : "",
          budget: mariage.budgetTotalCents ? String(Math.round(mariage.budgetTotalCents / 100)) : "",
          invites: mariage.estimatedGuests ? String(mariage.estimatedGuests) : "",
          ceremonies: mariage.ceremonies,
          culte: mariage.religion ?? "",
        }}
      />

      <Section id="temoins" titre="Vos témoins">
        <p className="text-sm text-ink-muted">
          Ils ont leur propre espace : les missions que vous leur confiez (choisissez-les comme responsables d’une tâche), la table de chaque invité le jour J, et un coin secret pour
          préparer votre enterrement de vie de célibataire. Ils ne voient ni votre budget, ni votre liste d’invités.
        </p>
        {temoins.length > 0 && (
          <ul className="flex flex-col gap-1">
            {temoins.map((t) => (
              <li key={t.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1">
                  <span className="font-semibold">{t.user.name}</span> · {t.user.email}
                </span>
                <form action={retirerTemoin}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-alerte underline">
                    Retirer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <InvitationTemoin />
      </Section>

      <Section id="notifications" titre="E-mails">
        <Notifications hebdo={compte.notifHebdo} rappels={compte.notifRappels} />
      </Section>

      <Section titre="Mon compte">
        <p className="text-sm text-ink-muted">Connecté avec {compte.email}</p>
        <Profil prenom={compte.name} />
        {aMotDePasse > 0 && (
          <details className="rounded-md border border-line bg-surface-raised p-4">
            <summary className="cursor-pointer font-semibold">Changer mon mot de passe</summary>
            <div className="mt-4">
              <MotDePasse />
            </div>
          </details>
        )}
        <Deconnexion />
      </Section>

      <Section titre="Mes données">
        <p className="text-sm text-ink-muted">Vos données restent hébergées en Europe, ne sont jamais revendues ni transmises à des prestataires.</p>
        <a href="/parametres/export" className="self-start rounded-full border border-line px-5 py-2.5 font-semibold">
          Télécharger toutes mes données
        </a>
        <SuppressionCompte avecPartenaire={partenaires > 0} />
      </Section>

      <Section titre="Aide">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/contact" className="text-bronze underline">
            Nous écrire
          </Link>
          <Link href="/confidentialite" className="text-bronze underline">
            Confidentialité
          </Link>
          <Link href="/conditions" className="text-bronze underline">
            Conditions d’utilisation
          </Link>
          <Link href="/mentions-legales" className="text-bronze underline">
            Mentions légales
          </Link>
        </div>
      </Section>
    </main>
  );
}
