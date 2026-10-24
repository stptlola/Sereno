import type { Metadata } from "next";
import { PageLegale } from "@/components/page-legale";

export const metadata: Metadata = { title: "Mentions légales · Sereno" };

export default function MentionsLegales() {
  return (
    <PageLegale titre="Mentions légales" majLe="24 octobre 2026">
      <h2>Éditeur</h2>
      <p>
        Le service Sereno est édité par [nom ou raison sociale], [forme juridique, par exemple micro-entreprise], dont le siège est situé [adresse complète], immatriculé sous le numéro
        SIRET [numéro]. Directeur ou directrice de la publication : [prénom et nom]. Contact : via la page <a href="/contact" className="text-bronze underline">Contact</a>.
      </p>
      <h2>Hébergement</h2>
      <p>Le service est hébergé par [nom de l’hébergeur, par exemple OVHcloud], [adresse de l’hébergeur], sur des serveurs situés dans l’Union européenne.</p>
      <h2>Propriété intellectuelle</h2>
      <p>La marque Sereno, son logo, ses textes, son modèle de tâches et ses visuels sont protégés. Toute reproduction sans autorisation est interdite.</p>
      <h2>Données personnelles</h2>
      <p>
        La façon dont vos données sont utilisées et protégées est détaillée dans la <a href="/confidentialite" className="text-bronze underline">politique de confidentialité</a>.
      </p>
    </PageLegale>
  );
}
