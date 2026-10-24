import type { Metadata } from "next";
import Link from "next/link";
import { PageCompte } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifier } from "@/lib/signature";

export const metadata: Metadata = { title: "Désinscription · Sereno" };
export const dynamic = "force-dynamic";

/** Désinscription en un clic, sans connexion, grâce au lien signé reçu par e-mail (M11-06). */
export default async function PageDesinscription({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const u = typeof p.u === "string" ? p.u : "";
  const s = typeof p.s === "string" ? p.s : "";
  const valide = u && s && verifier(env().AUTH_SECRET, `${u}:tout`, s);
  const fait = valide ? (await db.user.updateMany({ where: { id: u }, data: { notifHebdo: false, notifRappels: false } })).count > 0 : false;
  return (
    <PageCompte
      titre={fait ? "C’est noté" : "Ce lien n’est pas valable"}
      sousTitre={
        fait
          ? "Vous ne recevrez plus les e-mails de rappel de Sereno. Les e-mails liés à votre compte (mot de passe oublié, par exemple) continueront de vous parvenir."
          : "Il a peut-être été modifié. Vous pouvez gérer vos e-mails depuis vos réglages."
      }
    >
      <Link href="/parametres#notifications" className="text-bronze underline">
        {fait ? "Les réactiver depuis mes réglages" : "Ouvrir mes réglages"}
      </Link>
    </PageCompte>
  );
}
