import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const classeChamp =
  "w-full rounded-sm border border-line bg-surface-raised px-4 py-3 text-base text-ink outline-none placeholder:text-ink-muted focus:border-or";

export function Bouton({ variante = "plein", className = "", ...props }: ComponentProps<"button"> & { variante?: "plein" | "contour" }) {
  const base = "inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold transition disabled:opacity-60";
  const style = variante === "plein" ? "bg-ink text-surface hover:bg-bronze" : "border border-line bg-surface-raised text-ink hover:border-ink";
  return <button className={`${base} ${style} ${className}`} {...props} />;
}

export function Champ({ libelle, id, aide, ...props }: ComponentProps<"input"> & { libelle: string; id: string; aide?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{libelle}</span>
      <input id={id} className={classeChamp} {...props} />
      {aide && <span className="text-sm text-ink-muted">{aide}</span>}
    </label>
  );
}

export function Message({ type = "erreur", children }: { type?: "erreur" | "info"; children: ReactNode }) {
  return (
    <p role={type === "erreur" ? "alert" : "status"} className={`rounded-sm p-3 text-sm ${type === "erreur" ? "bg-surface-soft text-alerte" : "bg-surface-soft text-ink"}`}>
      {children}
    </p>
  );
}

export function PageCompte({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <Link href="/" className="text-sm font-semibold tracking-widest text-bronze uppercase">
        sereno
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl">{titre}</h1>
        {sousTitre && <p className="text-ink-muted">{sousTitre}</p>}
      </div>
      {children}
    </main>
  );
}

/** N'accepte qu'un chemin interne comme destination de retour, pour éviter les redirections externes. */
export function retourSur(valeur: string | string[] | undefined, defaut = "/tableau-de-bord"): string {
  const v = Array.isArray(valeur) ? valeur[0] : valeur;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : defaut;
}
