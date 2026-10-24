"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const ETAPES = ["On relit la nouvelle date…", "On recale chaque échéance…", "On ajuste les tâches des cérémonies…", "On vérifie que rien n’est en retard…"];

/** Animation pendant le recalcul du planning. */
export function RecalculEnCours() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, ETAPES.length - 1)), 420);
    return () => clearInterval(t);
  }, []);
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4 rounded-md bg-ink p-6 text-surface">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 64 64" className="h-10 w-10 animate-spin [animation-duration:2.4s]" aria-hidden>
          <circle cx="25" cy="39" r="12.5" fill="none" stroke="var(--color-or)" strokeWidth="5" />
          <circle cx="40" cy="31" r="12.5" fill="none" stroke="var(--color-or)" strokeWidth="3" />
        </svg>
        <p className="font-display text-xl">On recalcule votre planning</p>
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {ETAPES.map((e, k) => (
          <li key={e} className={`transition-opacity duration-300 ${k <= i ? "opacity-100" : "opacity-0"}`}>
            <span className="mr-2 text-or">{k < i ? "✓" : "•"}</span>
            {e}
          </li>
        ))}
      </ul>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className="h-1.5 rounded-full bg-or transition-all duration-500" style={{ width: `${((i + 1) / ETAPES.length) * 100}%` }} />
      </div>
    </div>
  );
}

function Compteur({ cible }: { cible: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const debut = performance.now();
    const duree = Math.min(1200, 300 + cible * 8);
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / duree);
      setN(Math.round(cible * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [cible]);
  return <>{n}</>;
}

/** Résultat du recalcul, avec un compteur qui monte. */
export function RecalculTermine({ recalculees, ajoutees, retirees }: { recalculees: number; ajoutees: number; retirees: number }) {
  return (
    <div role="status" className="flex flex-col gap-4 rounded-md border border-or bg-surface-raised p-6">
      <p className="font-display text-xl">Votre planning est à jour</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-surface-soft p-3">
          <p className="font-display text-3xl">
            <Compteur cible={recalculees} />
          </p>
          <p className="text-xs text-ink-muted">échéances recalculées</p>
        </div>
        <div className="rounded-md bg-surface-soft p-3">
          <p className="font-display text-3xl">
            <Compteur cible={ajoutees} />
          </p>
          <p className="text-xs text-ink-muted">tâches ajoutées</p>
        </div>
        <div className="rounded-md bg-surface-soft p-3">
          <p className="font-display text-3xl">
            <Compteur cible={retirees} />
          </p>
          <p className="text-xs text-ink-muted">tâches retirées</p>
        </div>
      </div>
      <p className="text-sm text-ink-muted">Vos tâches faites et vos tâches personnelles n’ont pas bougé.</p>
      <Link href="/planning" className="self-start rounded-full bg-ink px-6 py-3 font-semibold text-surface">
        Voir mon planning
      </Link>
    </div>
  );
}
