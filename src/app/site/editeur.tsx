"use client";
import { startTransition, useActionState } from "react";
import { Bouton, classeChamp, Message } from "@/components/ui";
import { modifierSite, relancerRetardataires, type EtatSite } from "../actions/site";

export interface ValeursSite {
  slug: string;
  published: boolean;
  aMotDePasse: boolean;
  welcome: string;
  programme: { heure: string; titre: string; lieu: string }[];
  lieux: { nom: string; adresse: string }[];
  hebergements: string;
  transport: string;
  cadeauxLien: string;
  faq: { question: string; reponse: string }[];
  questions: { libelle: string; type: string; choix: string }[];
  rsvpDeadline: string;
}

const lignes = <T,>(liste: T[], n: number, vide: T): T[] => [...liste, ...Array.from({ length: Math.max(0, n - liste.length) }, () => vide)].slice(0, n);

function Groupe({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4">
      <legend className="px-1 font-semibold">{titre}</legend>
      {aide && <p className="-mt-1 text-sm text-ink-muted">{aide}</p>}
      {children}
    </fieldset>
  );
}

export function EditeurSite({ valeurs, adresseBase }: { valeurs: ValeursSite; adresseBase: string }) {
  const [etat, action, enCours] = useActionState<EtatSite, FormData>(modifierSite, {});
  const petit = `${classeChamp} py-2 text-sm`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-4"
    >
      <Groupe titre="En ligne">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="published" defaultChecked={valeurs.published} className="h-5 w-5" />
          <span>Mon site est visible par mes invités</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Adresse du site</span>
          <span className="flex items-center gap-1">
            <span className="text-ink-muted">{adresseBase}/m/</span>
            <input name="slug" defaultValue={valeurs.slug} required maxLength={50} pattern="[a-z0-9-]{3,50}" className={petit} />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Mot de passe (facultatif)</span>
          <input name="motDePasse" type="password" autoComplete="new-password" placeholder={valeurs.aMotDePasse ? "Laisser vide pour garder le mot de passe actuel" : "À indiquer sur vos faire-part"} className={petit} />
          {valeurs.aMotDePasse && (
            <span className="flex items-center gap-2">
              <input type="checkbox" name="retirerMotDePasse" className="h-4 w-4" /> Retirer le mot de passe
            </span>
          )}
        </label>
      </Groupe>

      <Groupe titre="Mot d’accueil">
        <textarea name="welcome" rows={3} maxLength={2000} defaultValue={valeurs.welcome} className={petit} />
      </Groupe>

      <Groupe titre="Programme" aide="Une ligne par moment : heure, ce qui se passe, et où.">
        {lignes(valeurs.programme, 8, { heure: "", titre: "", lieu: "" }).map((p, i) => (
          <div key={i} className="grid grid-cols-[5rem_1fr] gap-2 sm:grid-cols-[5rem_1fr_1fr]">
            <input name={`programme.${i}.heure`} defaultValue={p.heure} placeholder="15:00" aria-label={`Heure ${i + 1}`} className={petit} />
            <input name={`programme.${i}.titre`} defaultValue={p.titre} placeholder="Cérémonie" aria-label={`Moment ${i + 1}`} className={petit} />
            <input name={`programme.${i}.lieu`} defaultValue={p.lieu} placeholder="Mairie de Lyon 2e" aria-label={`Lieu ${i + 1}`} className={`${petit} col-span-2 sm:col-span-1`} />
          </div>
        ))}
      </Groupe>

      <Groupe titre="Lieux" aria-label="Lieux">
        {lignes(valeurs.lieux, 4, { nom: "", adresse: "" }).map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2">
            <input name={`lieu.${i}.nom`} defaultValue={l.nom} placeholder="Château des Lys" aria-label={`Nom du lieu ${i + 1}`} className={petit} />
            <input name={`lieu.${i}.adresse`} defaultValue={l.adresse} placeholder="Adresse complète" aria-label={`Adresse du lieu ${i + 1}`} className={petit} />
          </div>
        ))}
      </Groupe>

      <Groupe titre="Infos pratiques">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Où dormir</span>
          <textarea name="hebergements" rows={3} maxLength={3000} defaultValue={valeurs.hebergements} placeholder="Hôtels, gîtes, codes de réduction…" className={petit} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Venir</span>
          <textarea name="transport" rows={3} maxLength={3000} defaultValue={valeurs.transport} placeholder="Parking, navette, gare la plus proche…" className={petit} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Lien de votre liste de cadeaux</span>
          <input name="cadeauxLien" type="url" defaultValue={valeurs.cadeauxLien} placeholder="https://…" className={petit} />
        </label>
      </Groupe>

      <Groupe titre="Questions fréquentes" aide="Seules les questions avec une réponse s’affichent.">
        {lignes(valeurs.faq, 8, { question: "", reponse: "" }).map((f, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
            <input name={`faq.${i}.question`} defaultValue={f.question} placeholder="Question" aria-label={`Question ${i + 1}`} className={petit} />
            <input name={`faq.${i}.reponse`} defaultValue={f.reponse} placeholder="Réponse" aria-label={`Réponse ${i + 1}`} className={petit} />
          </div>
        ))}
      </Groupe>

      <Groupe titre="Réponses des invités" aria-label="Réponses">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Date limite de réponse</span>
          <input name="rsvpDeadline" type="date" defaultValue={valeurs.rsvpDeadline} className={`${petit} w-48`} />
          <span className="text-ink-muted">Conseil : environ six semaines avant le jour J.</span>
        </label>
        <p className="text-sm font-semibold">Vos questions (facultatif)</p>
        {lignes(valeurs.questions, 4, { libelle: "", type: "texte", choix: "" }).map((q, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[2fr_8rem_2fr]">
            <input name={`question.${i}.libelle`} defaultValue={q.libelle} placeholder="La chanson qui vous fera danser ?" aria-label={`Question personnalisée ${i + 1}`} className={petit} />
            <select name={`question.${i}.type`} defaultValue={q.type} aria-label={`Type de la question ${i + 1}`} className={petit}>
              <option value="texte">Réponse libre</option>
              <option value="choix">Choix</option>
            </select>
            <input name={`question.${i}.choix`} defaultValue={q.choix} placeholder="Si choix : Oui, Non" aria-label={`Choix de la question ${i + 1}`} className={petit} />
          </div>
        ))}
      </Groupe>

      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.message && <Message type="info">{etat.message}</Message>}
      <Bouton type="submit" disabled={enCours} className="sticky bottom-20 lg:bottom-4">
        {enCours ? "Enregistrement…" : "Enregistrer mon site"}
      </Bouton>
    </form>
  );
}

export function Relance() {
  const [etat, action, enCours] = useActionState<EtatSite, FormData>(async (p) => relancerRetardataires(p), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Bouton type="submit" variante="contour" disabled={enCours} className="self-start">
        {enCours ? "Envoi…" : "Relancer ceux qui n’ont pas répondu"}
      </Bouton>
      {etat.erreur && <Message>{etat.erreur}</Message>}
      {etat.message && <Message type="info">{etat.message}</Message>}
    </form>
  );
}
