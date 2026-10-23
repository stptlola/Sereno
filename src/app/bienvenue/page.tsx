import { redirect } from "next/navigation";
import { PageCompte } from "@/components/ui";
import { mariageDe, utilisateurRequis } from "@/lib/session";
import { Enregistrement } from "./enregistrement";

export const dynamic = "force-dynamic";

export default async function PageBienvenue() {
  const user = await utilisateurRequis("/bienvenue");
  if (await mariageDe(user.id)) redirect("/tableau-de-bord");
  return (
    <PageCompte titre={`Bienvenue ${user.name}`} sousTitre="On sauvegarde votre planning, c’est l’affaire d’un instant.">
      <Enregistrement />
    </PageCompte>
  );
}
