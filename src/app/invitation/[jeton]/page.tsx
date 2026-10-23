import type { Metadata } from "next";
import Link from "next/link";
import { Bouton, PageCompte } from "@/components/ui";
import { db } from "@/lib/db";
import { empreinte } from "@/lib/jetons";
import { mariageDe, sessionCourante } from "@/lib/session";
import { accepterInvitation } from "../../actions/mariage";

export const metadata: Metadata = { title: "Invitation · Sereno" };
export const dynamic = "force-dynamic";

export default async function PageInvitation({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: empreinte(jeton) },
    include: { wedding: true },
  });
  const valide = invitation && !invitation.acceptedAt && invitation.expiresAt > new Date();
  if (!valide)
    return (
      <PageCompte titre="Ce lien n’est plus valable" sousTitre="Il a peut-être expiré ou déjà été utilisé. Demandez un nouveau lien à votre partenaire.">
        <Link href="/" className="text-bronze underline">
          Revenir à l’accueil
        </Link>
      </PageCompte>
    );

  const session = await sessionCourante();
  const retour = encodeURIComponent(`/invitation/${jeton}`);
  const prenoms = [invitation.wedding.partner1Name, invitation.wedding.partner2Name].filter(Boolean).join(" et ");
  const dejaMembre = session ? await mariageDe(session.user.id) : null;

  return (
    <PageCompte titre="Vous êtes invité à organiser ce mariage" sousTitre={`Le mariage de ${prenoms}, avec les mêmes droits que votre partenaire.`}>
      {!session ? (
        <div className="flex flex-col gap-3">
          <Link href={`/inscription?retour=${retour}`} className="rounded-full bg-ink px-6 py-3 text-center font-semibold text-surface">
            Créer mon compte
          </Link>
          <Link href={`/connexion?retour=${retour}`} className="text-center text-sm text-bronze underline">
            J’ai déjà un compte
          </Link>
        </div>
      ) : dejaMembre ? (
        <p className="text-ink-muted">Votre compte organise déjà un mariage. Pour l’instant, un compte ne peut suivre qu’un seul mariage.</p>
      ) : (
        <form action={accepterInvitation}>
          <input type="hidden" name="jeton" value={jeton} />
          <Bouton type="submit" className="w-full">
            Rejoindre l’organisation
          </Bouton>
        </form>
      )}
    </PageCompte>
  );
}
