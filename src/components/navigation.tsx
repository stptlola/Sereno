import Link from "next/link";

const LIENS = [
  { href: "/tableau-de-bord", libelle: "Tableau de bord" },
  { href: "/taches/nouvelle", libelle: "+ Tâche" },
  { href: "/parametres", libelle: "Paramètres" },
];

export function Navigation({ actif }: { actif?: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/tableau-de-bord" className="text-sm font-semibold tracking-widest text-bronze uppercase">
        sereno
      </Link>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" aria-label="Navigation principale">
        {LIENS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={actif === l.href ? "page" : undefined} className={actif === l.href ? "font-semibold text-ink" : "text-ink-muted hover:text-ink"}>
            {l.libelle}
          </Link>
        ))}
      </nav>
    </header>
  );
}
