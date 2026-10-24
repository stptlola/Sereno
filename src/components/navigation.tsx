import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";

const trait = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONES: Record<string, ReactNode> = {
  planning: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="3" {...trait} />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h3" {...trait} />
    </svg>
  ),
  budget: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="3" {...trait} />
      <path d="M16.5 12.5h.01M3 10h18" {...trait} />
    </svg>
  ),
  invites: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <circle cx="9" cy="8.5" r="3.2" {...trait} />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.6a3 3 0 0 1 0 5.8M17.5 14.3c1.7.6 2.8 2.2 3 4.7" {...trait} />
    </svg>
  ),
  reglages: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...trait} />
      <circle cx="16" cy="7" r="2.2" {...trait} />
      <circle cx="10" cy="17" r="2.2" {...trait} />
    </svg>
  ),
};

const LIENS = [
  { href: "/tableau-de-bord", libelle: "Planning", icone: "planning" },
  { href: "/budget", libelle: "Budget", icone: "budget" },
  { href: "/invites", libelle: "Invités", icone: "invites" },
  { href: "/parametres", libelle: "Réglages", icone: "reglages" },
] as const;

/**
 * Navigation de l'application : en-tête complet sur ordinateur ;
 * sur mobile, le logo en haut et une barre d'onglets en bas, avec le bouton d'ajout au centre.
 */
export function Navigation({ actif }: { actif?: string }) {
  const [gauche, droite] = [LIENS.slice(0, 2), LIENS.slice(2)];
  const onglet = (l: (typeof LIENS)[number]) => (
    <Link
      key={l.href}
      href={l.href}
      aria-current={actif === l.href ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${actif === l.href ? "font-semibold text-ink" : "text-ink-muted"}`}
    >
      {ICONES[l.icone]}
      {l.libelle}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-20 -mx-6 border-b border-line bg-surface/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <Link href="/tableau-de-bord" aria-label="Sereno, retour au planning" className="text-ink">
            <Logo className="h-7 w-auto sm:h-8" />
          </Link>
          <nav className="hidden items-center gap-1 text-sm sm:flex" aria-label="Navigation principale">
            {LIENS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actif === l.href ? "page" : undefined}
                className={`rounded-full px-3 py-2 ${actif === l.href ? "bg-surface-soft font-semibold text-ink" : "text-ink-muted hover:text-ink"}`}
              >
                {l.libelle}
              </Link>
            ))}
            <Link href="/taches/nouvelle" className="ml-2 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-semibold text-surface transition hover:bg-bronze">
              <span aria-hidden className="text-lg leading-none text-or">
                +
              </span>{" "}
              Ajouter une tâche
            </Link>
          </nav>
        </div>
      </header>

      <nav
        aria-label="Navigation principale mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 px-2 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {gauche.map(onglet)}
        <div className="flex flex-1 items-start justify-center">
          <Link
            href="/taches/nouvelle"
            aria-label="Ajouter une tâche"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface bg-ink text-3xl leading-none text-or shadow-md"
          >
            +
          </Link>
        </div>
        {droite.map(onglet)}
      </nav>
    </>
  );
}
