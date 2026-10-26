"use client";
import { startTransition, useActionState, useState } from "react";
import { classeChamp, Message } from "@/components/ui";
import { deverrouillerSite, repondre, trouverInvitation, type EtatPublic } from "@/app/actions/rsvp";

function soumettreSans(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

export function FormMotDePasse({ slug }: { slug: string }) {
  const [etat, action, enCours] = useActionState<EtatPublic, FormData>(deverrouillerSite, {});
  return (
    <form onSubmit={soumettreSans(action)} method="post" className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="password" name="motDePasse" required aria-label="Mot de passe du site" placeholder="Mot de passe" className={classeChamp} />
      {etat.erreur && <Message>{etat.erreur}</Message>}
      <button type="submit" disabled={enCours} className="rounded-full bg-ink px-6 py-3 font-semibold text-surface">
        Entrer
      </button>
    </form>
  );
}

export function TrouverInvitation({ slug }: { slug: string }) {
  const [etat, action, enCours] = useActionState<EtatPublic, FormData>(trouverInvitation, {});
  return (
    <form onSubmit={soumettreSans(action)} method="post" className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="prenom" required aria-label="Votre prénom" placeholder="Votre prénom" className={classeChamp} />
        <input name="nom" required aria-label="Votre nom" placeholder="Votre nom" className={classeChamp} />
      </div>
      {etat.erreur && <Message>{etat.erreur}</Message>}
      <button type="submit" disabled={enCours} className="self-start rounded-full bg-ink px-6 py-3 font-semibold text-surface">
        {enCours ? "Recherche…" : "Trouver mon invitation"}
      </button>
    </form>
  );
}

export interface MembreFormulaire {
  id: string;
  prenom: string;
  enfant: boolean;
  reponse: "EN_ATTENTE" | "PRESENT" | "ABSENT";
  regimes: string[];
  allergies: string;
  moments: string[];
  plat: string;
}

export function FormReponse({
  slug,
  jeton,
  membres,
  regimes,
  questions,
  reponsesPerso,
  message,
  plats = [],
}: {
  slug: string;
  jeton: string;
  membres: MembreFormulaire[];
  regimes: readonly string[];
  questions: { id: string; libelle: string; type: "texte" | "choix"; choix: string[] }[];
  reponsesPerso: Record<string, string>;
  message: string;
  plats?: string[];
}) {
  const [etat, action, enCours] = useActionState<EtatPublic, FormData>(repondre, {});
  const [presences, setPresences] = useState<Record<string, string>>(Object.fromEntries(membres.map((m) => [m.id, m.reponse === "EN_ATTENTE" ? "" : m.reponse])));
  const choix = (actif: boolean) => `flex-1 rounded-full border px-4 py-3 text-center font-semibold transition ${actif ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised hover:border-ink"}`;
  return (
    <form onSubmit={soumettreSans(action)} method="post" className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="jeton" value={jeton} />
      {membres.map((m) => (
        <fieldset key={m.id} className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4">
          <legend className="px-1 font-display text-xl">
            {m.prenom}
            {m.enfant ? <span className="font-sans text-sm text-ink-muted"> (enfant)</span> : null}
          </legend>
          <div className="flex gap-2">
            {(["PRESENT", "ABSENT"] as const).map((r) => (
              <label key={r} className={choix(presences[m.id] === r)}>
                <input type="radio" name={`reponse-${m.id}`} value={r} required checked={presences[m.id] === r} onChange={() => setPresences({ ...presences, [m.id]: r })} className="sr-only" />
                {r === "PRESENT" ? "Sera là" : "Ne pourra pas venir"}
              </label>
            ))}
          </div>
          {presences[m.id] === "PRESENT" && (
            <>
              {m.moments.length > 0 && <p className="text-sm text-ink-muted">Attendu au : {m.moments.join(", ")}.</p>}
              {plats.length > 0 && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">Votre plat</span>
                  <select name={`plat-${m.id}`} defaultValue={m.plat} aria-label={`Plat de ${m.prenom}`} className={classeChamp}>
                    <option value="">Choisir…</option>
                    {plats.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Un régime alimentaire ?</p>
                <div className="flex flex-wrap gap-2">
                  {regimes.map((r) => (
                    <label key={r} className="cursor-pointer">
                      <input type="checkbox" name={`regimes-${m.id}`} value={r} defaultChecked={m.regimes.includes(r)} className="peer sr-only" />
                      <span className="inline-block rounded-full border border-line px-3 py-1.5 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface peer-focus-visible:outline-2 peer-focus-visible:outline-or">
                        {r}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <input name={`allergies-${m.id}`} defaultValue={m.allergies} maxLength={300} placeholder="Allergies (facultatif)" aria-label={`Allergies de ${m.prenom}`} className={classeChamp} />
            </>
          )}
        </fieldset>
      ))}
      {questions.map((q) => (
        <label key={q.id} className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{q.libelle}</span>
          {q.type === "choix" ? (
            <select name={`question-${q.id}`} defaultValue={reponsesPerso[q.id] ?? ""} className={classeChamp}>
              <option value="">Choisir…</option>
              {q.choix.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input name={`question-${q.id}`} defaultValue={reponsesPerso[q.id] ?? ""} maxLength={500} className={classeChamp} />
          )}
        </label>
      ))}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Un petit mot pour les mariés ?</span>
        <textarea name="message" rows={3} defaultValue={message} maxLength={1000} className={classeChamp} />
      </label>
      {etat.erreur && <Message>{etat.erreur}</Message>}
      <button type="submit" disabled={enCours} className="rounded-full bg-ink px-6 py-3 font-semibold text-surface">
        {enCours ? "Envoi…" : "Envoyer ma réponse"}
      </button>
    </form>
  );
}
