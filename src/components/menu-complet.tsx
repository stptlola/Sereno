"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GROUPES } from "./rubriques";

/** Onglet « Tout » de la barre mobile : ouvre toutes les rubriques en plein écran. */
export function MenuComplet({ actif }: { actif?: string }) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("keydown", fermer);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fermer);
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  const surRubriqueSecondaire = actif !== undefined && !["/tableau-de-bord", "/planning", "/budget", "/invites"].includes(actif);
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-expanded={ouvert}
        aria-controls="menu-complet"
        className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${surRubriqueSecondaire ? "font-semibold text-ink" : "text-ink-muted"}`}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <circle cx="6" cy="6" r="1.6" />
          <circle cx="12" cy="6" r="1.6" />
          <circle cx="18" cy="6" r="1.6" />
          <circle cx="6" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="18" cy="12" r="1.6" />
          <circle cx="6" cy="18" r="1.6" />
          <circle cx="12" cy="18" r="1.6" />
          <circle cx="18" cy="18" r="1.6" />
        </svg>
        Menu
      </button>
      {/* Affiché au niveau de la page : le flou de la barre du bas emprisonnerait sinon le menu en plein écran. */}
      {ouvert &&
        createPortal(
        <div id="menu-complet" role="dialog" aria-modal="true" aria-label="Toutes les rubriques" className="fixed inset-0 z-40 overflow-y-auto bg-surface px-6 pt-4 pb-10" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}>
          <div className="flex items-center justify-between">
            <p className="font-display text-2xl">Toutes les rubriques</p>
            <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer le menu" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-xl">
              ✕
            </button>
          </div>
          <div className="mt-6 flex flex-col gap-6">
            {GROUPES.map((g) => (
              <section key={g.titre} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold tracking-widest text-bronze uppercase">{g.titre}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {g.rubriques.map((r) => (
                    <Link
                      key={r.slug}
                      href={r.href}
                      onClick={() => setOuvert(false)}
                      aria-current={actif === r.href ? "page" : undefined}
                      className={`flex min-h-16 flex-col justify-between gap-1 rounded-md border p-3 ${actif === r.href ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised"}`}
                    >
                      <span className="font-semibold leading-tight">{r.libelle}</span>
                      {r.bientot && <span className={`self-start rounded-full px-2 py-0.5 text-[11px] font-semibold ${actif === r.href ? "bg-or text-ink" : "bg-surface-soft text-bronze"}`}>Bientôt</span>}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
