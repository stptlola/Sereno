import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";
import { MenuComplet } from "./menu-complet";
import { GROUPES } from "./rubriques";

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

const ONGLETS = [
  { href: "/planning", libelle: "Planning", icone: "planning" },
  { href: "/budget", libelle: "Budget", icone: "budget" },
  { href: "/invites", libelle: "Invités", icone: "invites" },
] as const;

/**
 * Navigation de l'application.
 * Grand écran : barre latérale avec toutes les rubriques. Mobile et tablette : logo en haut, et en bas
 * Planning, Budget, l'Accueil au centre (mis en avant), Invités, et « Menu » qui ouvre toutes les rubriques.
 */
export function Navigation({ actif }: { actif?: string }) {
  const onglet = (l: (typeof ONGLETS)[number]) => (
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
      <header className="sticky top-0 z-20 -mx-6 border-b border-line bg-surface/90 px-6 py-3 backdrop-blur lg:hidden">
        <Link href="/tableau-de-bord" aria-label="Sereno, retour au planning" className="inline-block text-ink">
          <Logo className="h-7 w-auto" />
        </Link>
      </header>
      {/* Espace en haut sur grand écran, où l'en-tête est remplacé par la barre latérale. */}
      <div className="hidden h-4 lg:block" aria-hidden />

      <aside id="barre-laterale" className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-5 py-6 lg:flex">
        <Link href="/tableau-de-bord" aria-label="Sereno, retour au planning" className="text-ink">
          <Logo className="h-8 w-auto" />
        </Link>
        <Link href="/taches/nouvelle" className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition hover:bg-bronze">
          <span aria-hidden className="text-lg leading-none text-or">
            +
          </span>{" "}
          Ajouter une tâche
        </Link>
        <nav aria-label="Rubriques" className="flex flex-col gap-5 text-sm">
          {GROUPES.map((g) => (
            <div key={g.titre} className="flex flex-col gap-0.5">
              <p className="mb-1 px-3 text-[11px] font-semibold tracking-widest text-bronze uppercase">{g.titre}</p>
              {g.rubriques.map((r) => (
                <Link
                  key={r.slug}
                  href={r.href}
                  aria-current={actif === r.href ? "page" : undefined}
                  className={`flex items-center justify-between gap-2 rounded-full px-3 py-1.5 ${actif === r.href ? "bg-surface-soft font-semibold text-ink" : r.bientot ? "text-ink-muted hover:text-ink" : "text-ink hover:bg-surface-soft"}`}
                >
                  {r.libelle}
                  {r.bientot && <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-semibold text-bronze">Bientôt</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <nav
        aria-label="Navigation principale mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 px-2 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {onglet(ONGLETS[0])}
        {onglet(ONGLETS[1])}
        <Link
          href="/tableau-de-bord"
          aria-current={actif === "/tableau-de-bord" ? "page" : undefined}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] ${actif === "/tableau-de-bord" ? "font-semibold text-ink" : "text-ink-muted"}`}
        >
          <span className={`-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface shadow-md ${actif === "/tableau-de-bord" ? "bg-ink" : "bg-ink/90"}`}>
            <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
              <circle cx="25" cy="39" r="12.5" fill="none" stroke="var(--color-or)" strokeWidth="5" />
              <circle cx="40" cy="31" r="12.5" fill="none" stroke="var(--color-or)" strokeWidth="3" />
              <path d="M40 11.5 L44.5 16 L40 21 L35.5 16 Z" fill="var(--color-or)" />
            </svg>
          </span>
          Accueil
        </Link>
        {onglet(ONGLETS[2])}
        <MenuComplet actif={actif} />
      </nav>
    </>
  );
}
