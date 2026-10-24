"use client";
import { startTransition, useActionState, useRef, useState } from "react";
import { Bouton, Champ, Message } from "@/components/ui";
import { modifierMariage, type EtatParametres } from "../actions/parametres";
import { RecalculEnCours, RecalculTermine } from "./recalcul";

const DUREE_MINIMALE_MS = 1800;

const CEREMONIES = [
  { valeur: "CIVILE", libelle: "Civile" },
  { valeur: "LAIQUE", libelle: "Laïque" },
  { valeur: "RELIGIEUSE", libelle: "Religieuse" },
];
const CULTES = [
  ["catholique", "Catholique"],
  ["protestant", "Protestante"],
  ["orthodoxe", "Orthodoxe"],
  ["juif", "Juive"],
  ["musulman", "Musulmane"],
  ["hindou", "Hindoue"],
  ["bouddhiste", "Bouddhiste"],
  ["autre", "Autre"],
];

export interface ValeursMariage {
  partner1Name: string;
  partner2Name: string;
  date: string;
  budget: string;
  invites: string;
  ceremonies: string[];
  culte: string;
}

export function FormulaireParametres({ valeurs }: { valeurs: ValeursMariage }) {
  const [recalcule, setRecalcule] = useState(false);
  const changementRef = useRef(false);
  const [etat, action, enCours] = useActionState<EtatParametres, FormData>(async (precedent, formData) => {
    const [resultat] = await Promise.all([
      modifierMariage(precedent, formData),
      new Promise((r) => setTimeout(r, changementRef.current ? DUREE_MINIMALE_MS : 0)),
    ]);
    return resultat;
  }, {});

  // On n'anime que si la date ou les cérémonies changent : c'est là que le planning est recalculé.
  // Calculé à l'envoi, hors de l'action, pour que l'animation s'affiche tout de suite.
  // Envoi géré à la main, pour que React ne vide pas le formulaire (sinon la saisie serait perdue en cas d'erreur).
  function avantEnvoi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const changement =
      String(f.get("date") ?? "") !== valeurs.date ||
      f.getAll("ceremonies").map(String).sort().join() !== [...valeurs.ceremonies].sort().join();
    changementRef.current = changement;
    setRecalcule(changement);
    startTransition(() => action(f));
  }

  return (
    <form onSubmit={avantEnvoi} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ libelle="Prénom 1" id="partner1Name" name="partner1Name" defaultValue={valeurs.partner1Name} required maxLength={60} />
        <Champ libelle="Prénom 2" id="partner2Name" name="partner2Name" defaultValue={valeurs.partner2Name} maxLength={60} />
      </div>
      <Champ libelle="Date du mariage" id="date" name="date" type="date" defaultValue={valeurs.date} aide="Laissez vide si elle n’est pas encore fixée. Changer la date recalcule tout votre planning." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ libelle="Budget global (€)" id="budget" name="budget" type="number" min={0} inputMode="numeric" defaultValue={valeurs.budget} />
        <Champ libelle="Invités estimés" id="invites" name="invites" type="number" min={0} inputMode="numeric" defaultValue={valeurs.invites} />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Cérémonies</legend>
        <div className="flex flex-wrap gap-3">
          {CEREMONIES.map((c) => (
            <label key={c.valeur} className="flex items-center gap-2">
              <input type="checkbox" name="ceremonies" value={c.valeur} defaultChecked={valeurs.ceremonies.includes(c.valeur)} className="h-5 w-5 accent-[var(--color-ink)]" />
              {c.libelle}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Culte (si cérémonie religieuse)</span>
        <select name="culte" defaultValue={valeurs.culte} className="w-full rounded-sm border border-line bg-surface-raised px-4 py-3">
          <option value="">Non précisé</option>
          {CULTES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {etat.erreur && <Message>{etat.erreur}</Message>}
      {enCours && recalcule && <RecalculEnCours />}
      {!enCours && etat.recalcul && recalcule && <RecalculTermine key={etat.essai} {...etat.recalcul} />}
      {!enCours && etat.message && !recalcule && <Message type="info">{etat.message}</Message>}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}
