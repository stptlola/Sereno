import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";

/** Mise en page des pages légales et publiques secondaires. */
export function PageLegale({ titre, majLe, children }: { titre: string; majLe: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-10">
      <Link href="/" aria-label="Sereno, accueil" className="text-ink">
        <Logo className="h-7 w-auto" />
      </Link>
      <div>
        <h1 className="font-display text-3xl">{titre}</h1>
        <p className="mt-1 text-sm text-ink-muted">Mise à jour le {majLe}</p>
      </div>
      <p className="rounded-md border border-or p-4 text-sm">
        Version de travail : les passages entre crochets sont à compléter, et le texte doit être relu par un professionnel du droit avant l’ouverture au public.
      </p>
      <div className="flex flex-col gap-5 leading-relaxed [&_h2]:mt-2 [&_h2]:font-display [&_h2]:text-xl [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
      <PiedDePage />
    </main>
  );
}

export function PiedDePage() {
  return (
    <footer className="mt-auto flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 text-sm text-ink-muted">
      <Link href="/contact" className="hover:text-ink">
        Contact
      </Link>
      <Link href="/confidentialite" className="hover:text-ink">
        Confidentialité
      </Link>
      <Link href="/conditions" className="hover:text-ink">
        Conditions d’utilisation
      </Link>
      <Link href="/mentions-legales" className="hover:text-ink">
        Mentions légales
      </Link>
    </footer>
  );
}
