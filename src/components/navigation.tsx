import Link from "next/link";
import { Logo } from "./logo";

const LIENS = [
  { href: "/tableau-de-bord", libelle: "Planning" },
  { href: "/budget", libelle: "Budget" },
  { href: "/invites", libelle: "Invités" },
  { href: "/parametres", libelle: "Réglages" },
];

/** En-tête de l'application : logo, navigation, et bouton d'ajout (flottant sur mobile). */
export function Navigation({ actif }: { actif?: string }) {
  return (
    <>
      <header className="sticky top-0 z-20 -mx-6 border-b border-line bg-surface/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <Link href="/tableau-de-bord" aria-label="Sereno, retour au planning" className="text-ink">
            <Logo className="h-7 w-auto sm:h-8" />
          </Link>
          <nav className="flex items-center gap-0.5 text-sm sm:gap-1" aria-label="Navigation principale">
            {LIENS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actif === l.href ? "page" : undefined}
                className={`rounded-full px-2 py-2 sm:px-3 ${actif === l.href ? "bg-surface-soft font-semibold text-ink" : "text-ink-muted hover:text-ink"}`}
              >
                {l.libelle}
              </Link>
            ))}
            <Link
              href="/taches/nouvelle"
              className="ml-2 hidden items-center gap-2 rounded-full bg-ink px-4 py-2 font-semibold text-surface transition hover:bg-bronze sm:inline-flex"
            >
              <span aria-hidden className="text-lg leading-none text-or">+</span> Ajouter une tâche
            </Link>
          </nav>
        </div>
      </header>
      {actif !== "/taches/nouvelle" && (
        <Link
          href="/taches/nouvelle"
          aria-label="Ajouter une tâche"
          className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-3xl text-or shadow-lg sm:hidden"
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
        >
          +
        </Link>
      )}
    </>
  );
}
