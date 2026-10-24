import type { Metadata } from "next";
import { PageLegale } from "@/components/page-legale";

export const metadata: Metadata = { title: "Conditions d’utilisation · Sereno" };

export default function Conditions() {
  return (
    <PageLegale titre="Conditions d’utilisation" majLe="24 octobre 2026">
      <h2>Le service</h2>
      <p>
        Sereno est un outil en ligne qui aide les couples à organiser leur mariage : planning, budget, liste d’invités et outils associés. Les conseils proposés sont donnés à titre
        indicatif ; les démarches administratives (mairie, notaire, lieu de culte) restent à vérifier auprès des organismes concernés.
      </p>
      <h2>Votre compte</h2>
      <p>
        L’inscription est gratuite. Vous vous engagez à fournir une adresse e-mail valide et à garder votre mot de passe confidentiel. Vous pouvez inviter votre partenaire, qui dispose
        des mêmes droits sur votre mariage. Vous pouvez supprimer votre compte à tout moment depuis vos réglages.
      </p>
      <h2>Vos contenus</h2>
      <p>
        Vous restez propriétaire de ce que vous saisissez. Vous êtes responsable des informations que vous ajoutez sur vos invités, et vous vous engagez à ne les utiliser que pour
        organiser votre mariage.
      </p>
      <h2>Offre payante</h2>
      <p>[À compléter lors du lancement du Pass Mariage Sérénité : prix, contenu, paiement, droit de rétractation de 14 jours et conditions de remboursement.]</p>
      <h2>Disponibilité et responsabilité</h2>
      <p>
        Nous faisons de notre mieux pour que Sereno soit disponible et fiable, et nous sauvegardons vos données chaque jour. Le service peut toutefois être interrompu pour maintenance.
        Notre responsabilité est limitée aux dommages directs causés par une faute de notre part. [À faire relire.]
      </p>
      <h2>Modifications</h2>
      <p>Ces conditions peuvent évoluer ; en cas de changement important, vous serez prévenu par e-mail.</p>
      <h2>Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit français. [À compléter : médiateur de la consommation, juridiction compétente.]</p>
    </PageLegale>
  );
}
