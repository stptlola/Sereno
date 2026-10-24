import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { accesEcriture } from "@/lib/acces";
import { FormulaireImport } from "./formulaire";

export const metadata: Metadata = { title: "Importer des invités · Sereno" };
export const dynamic = "force-dynamic";

const MODELE = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFFPrénom;Nom;Côté;Lien;Enfant;Accompagnant;Réponse;Régimes;Allergies;E-mail;Téléphone;Foyer\r\nCamille;Martin;Commun;Ami;Non;Oui;En attente;Végétarien;;camille@exemple.fr;;Famille Martin\r\n");

export default async function PageImport() {
  const { mariage } = await accesEcriture();
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 pt-0 pb-28 sm:pb-24">
      <Navigation actif="/invites" />
      <Link href="/invites" className="text-sm text-bronze underline">
        ← Retour aux invités
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl">Importer vos invités</h1>
        <p className="text-ink-muted">
          Vous avez déjà une liste dans Excel ou Google Sheets ? Enregistrez-la au format CSV, puis importez-la ici. Sereno reconnaît les colonnes par leur nom (Prénom, Nom,
          Côté, Lien, Régimes, E-mail…), dans n’importe quel ordre. Seule la colonne Prénom est obligatoire.
        </p>
        <p className="text-sm text-ink-muted">
          Pour le côté, indiquez « {mariage.partner1Name} »{mariage.partner2Name ? `, « ${mariage.partner2Name} »` : ""} ou « Commun ». Les invités déjà présents dans votre liste
          ne sont pas ajoutés une seconde fois.
        </p>
        <a href={MODELE} download="modele-invites-sereno.csv" className="self-start text-sm font-semibold text-bronze underline">
          Télécharger le modèle
        </a>
      </div>
      <FormulaireImport />
    </main>
  );
}
