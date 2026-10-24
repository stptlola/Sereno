"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Bouton, Message } from "@/components/ui";
import { importerInvites, type EtatImport } from "../../actions/invites";

export function FormulaireImport() {
  const [etat, action, enCours] = useActionState<EtatImport, FormData>(importerInvites, {});
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4 rounded-md border border-dashed border-line bg-surface-raised p-5">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Votre fichier</span>
          <input type="file" name="fichier" accept=".csv,text/csv" required className="text-sm" />
        </label>
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Import en cours…" : "Importer"}
        </Bouton>
      </form>
      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.ajoutes !== undefined && (
        <div role="status" className="flex flex-col gap-2 rounded-md bg-surface-soft p-4">
          <p className="font-semibold">
            {etat.ajoutes} invité{etat.ajoutes > 1 ? "s" : ""} ajouté{etat.ajoutes > 1 ? "s" : ""}
            {etat.ignores ? `, ${etat.ignores} déjà présent${etat.ignores > 1 ? "s" : ""} dans votre liste et ignoré${etat.ignores > 1 ? "s" : ""}` : ""}.
          </p>
          {etat.erreurs && etat.erreurs.length > 0 && (
            <ul className="text-sm text-alerte">
              {etat.erreurs.map((e) => (
                <li key={`${e.ligne}-${e.message}`}>
                  Ligne {e.ligne} : {e.message}
                </li>
              ))}
            </ul>
          )}
          <Link href="/invites" className="self-start text-bronze underline">
            Voir ma liste
          </Link>
        </div>
      )}
    </div>
  );
}
