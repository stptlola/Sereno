import type { Metadata } from "next";
import { PageLegale } from "@/components/page-legale";

export const metadata: Metadata = { title: "Confidentialité · Sereno" };

export default function Confidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité" majLe="24 octobre 2026">
      <p>Sereno vous aide à organiser votre mariage. Pour cela, nous avons besoin de quelques données. Voici, simplement, lesquelles, pourquoi, et ce que vous pouvez en faire.</p>
      <h2>Qui est responsable de vos données ?</h2>
      <p>[Nom ou raison sociale de l’éditeur], voir les <a href="/mentions-legales" className="text-bronze underline">mentions légales</a>.</p>
      <h2>Ce que nous collectons</h2>
      <ul>
        <li>Votre compte : prénom, adresse e-mail, mot de passe (stocké uniquement sous forme chiffrée), ou votre identifiant Google ou Apple si vous vous connectez ainsi.</li>
        <li>Votre mariage : prénoms du couple, date, budget, cérémonies, tâches, dépenses et notes que vous saisissez.</li>
        <li>Vos invités : les informations que vous saisissez ou importez à leur sujet (nom, coordonnées, régime alimentaire, allergies, réponse). Vous les saisissez sous votre responsabilité, pour organiser votre mariage ; nous ne les utilisons jamais à d’autres fins.</li>
        <li>Des données techniques nécessaires au fonctionnement et à la sécurité : adresse IP et navigateur liés à votre session de connexion.</li>
      </ul>
      <h2>Pourquoi</h2>
      <ul>
        <li>Fournir le service : votre planning, votre budget, votre liste d’invités (exécution du contrat).</li>
        <li>Vous envoyer les e-mails liés à votre compte et, si vous le souhaitez, les rappels de votre planning (vous pouvez les désactiver à tout moment).</li>
        <li>Sécuriser le service et prévenir les abus (intérêt légitime).</li>
      </ul>
      <h2>Ce que nous ne faisons jamais</h2>
      <p>Pas de publicité, pas de revente de données, pas de transmission à des prestataires du mariage, pas de profilage commercial.</p>
      <h2>Qui y a accès</h2>
      <p>
        Vous, votre partenaire si vous l’invitez, et nos sous-traitants techniques strictement nécessaires : l’hébergeur du service ([nom]) et le service d’envoi d’e-mails ([nom]), tous
        situés dans l’Union européenne. [À compléter si d’autres services sont ajoutés.]
      </p>
      <h2>Combien de temps</h2>
      <p>
        Tant que votre compte existe. Si vous supprimez votre compte, vos données sont effacées immédiatement, puis disparaissent des sauvegardes sous 30 jours au plus. Les comptes
        inactifs depuis [durée à définir, par exemple 3 ans] après la date du mariage pourront être supprimés, après vous avoir prévenu.
      </p>
      <h2>Cookies</h2>
      <p>Sereno n’utilise qu’un cookie indispensable, qui garde votre session ouverte. Aucun cookie publicitaire ou de mesure d’audience : c’est pourquoi aucun bandeau ne vous est demandé.</p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez à tout moment consulter et corriger vos données dans l’application, les télécharger (Réglages, « Télécharger toutes mes données »), supprimer votre compte
        (Réglages, « Supprimer mon compte »), ou nous écrire pour toute autre demande via la page <a href="/contact" className="text-bronze underline">Contact</a>. Un invité peut aussi nous
        demander la suppression des données le concernant. Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr).
      </p>
    </PageLegale>
  );
}
