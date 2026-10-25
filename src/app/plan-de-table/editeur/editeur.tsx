"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useCallback, useRef, useState, useTransition } from "react";
import { asseoir, placerInvite, proposerPlacement, type EtatProposition } from "../../actions/plan";
import type { ElementVue, InviteVue, TableVue } from "../types";
import { Canevas, type Selection, type Vue } from "./canevas";
import { PanneauAjouter, PanneauElement, PanneauInvites, PanneauPlace, PanneauSalle, PanneauTable } from "./panneaux";

type Outil = "invites" | "ajouter" | "salle" | null;

/**
 * Éditeur du plan de table en plein écran (M5-16, M5-17) : le plan seul, quelques boutons flottants,
 * et un panneau qui s'ouvre selon ce que l'on touche (place, table, élément) ou l'outil choisi.
 */
export function Editeur({ largeur, profondeur, tables, elements, aPlacer }: { largeur: number; profondeur: number; tables: TableVue[]; elements: ElementVue[]; aPlacer: InviteVue[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);
  const [outil, setOutil] = useState<Outil>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [, demarrer] = useTransition();
  const vue = useRef<Vue | null>(null);
  const commandes = useRef<{ zoomer: (f: number) => void; recentrer: () => void } | null>(null);
  const [proposition, proposer, enCalcul] = useActionState<EtatProposition, FormData>(proposerPlacement, {});
  const [resultatVu, setResultatVu] = useState(0);
  const rafraichir = useCallback(() => router.refresh(), [router]);
  const surVue = useCallback((v: Vue) => {
    vue.current = v;
  }, []);
  const choisi = aPlacer.find((g) => g.id === invite);

  function surSelection(s: Selection) {
    // Un invité est choisi : toucher une place ou une table l'y installe directement.
    if (invite && s?.type === "place")
      return demarrer(async () => {
        await asseoir(invite, s.tableId, s.numero);
        setInvite(null);
        rafraichir();
      });
    if (invite && s?.type === "table")
      return demarrer(async () => {
        await placerInvite(invite, s.id);
        setInvite(null);
        rafraichir();
      });
    setSelection(s);
    if (s) setOutil(null);
  }

  const ouvrirOutil = (o: Outil) => {
    setSelection(null);
    setOutil(outil === o ? null : o);
  };
  const fermer = () => {
    setSelection(null);
    setOutil(null);
  };

  let panneau: React.ReactNode = null;
  if (selection?.type === "place") panneau = <PanneauPlace key={`${selection.tableId}-${selection.numero}`} selection={selection} tables={tables} aPlacer={aPlacer} apres={rafraichir} fermer={fermer} />;
  else if (selection?.type === "table") {
    const t = tables.find((x) => x.id === selection.id);
    if (t) panneau = <PanneauTable key={`${t.id}-${t.nom}-${t.places}-${t.forme}`} table={t} apres={rafraichir} fermer={fermer} />;
  } else if (selection?.type === "element") {
    const e = elements.find((x) => x.id === selection.id);
    if (e) panneau = <PanneauElement key={`${e.id}-${e.largeur}-${e.profondeur}-${e.rotation}`} element={e} apres={rafraichir} fermer={fermer} />;
  } else if (outil === "invites") panneau = <PanneauInvites aPlacer={aPlacer} selection={invite} choisir={(id) => (setInvite(id), id && setOutil(null))} />;
  else if (outil === "ajouter") panneau = <PanneauAjouter vue={vue.current} apres={rafraichir} fermer={fermer} />;
  else if (outil === "salle") panneau = <PanneauSalle largeur={largeur} profondeur={profondeur} apres={rafraichir} />;

  const barre = "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold shadow-sm";
  const actif = (o: Outil) => (outil === o ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Une seule ligne, même sur un petit téléphone : le plan garde toute la place. */}
      <header className="flex items-center gap-1.5 overflow-x-auto border-b border-line px-2 py-2">
        <Link href="/plan-de-table" aria-label="Fermer l’éditeur" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-lg">
          ✕
        </Link>
        <p className="mr-auto hidden truncate font-display text-lg sm:block">Plan de la réception</p>
        <button type="button" onClick={() => ouvrirOutil("invites")} className={`${barre} ${actif("invites")} ml-auto sm:ml-0`}>
          Invités <span className={outil === "invites" ? "text-or" : "text-bronze"}>{aPlacer.length}</span>
        </button>
        <button type="button" onClick={() => ouvrirOutil("ajouter")} aria-label="Ajouter une table ou un élément" className={`${barre} ${actif("ajouter")}`}>
          +<span className="hidden sm:inline"> Ajouter</span>
        </button>
        <button type="button" onClick={() => ouvrirOutil("salle")} className={`${barre} ${actif("salle")}`}>
          Salle
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData();
            f.set("garder", "on");
            setResultatVu(0);
            startTransition(() => proposer(f));
          }}
        >
          <button type="submit" disabled={enCalcul} aria-label="Placer automatiquement" className={`${barre} border-ink bg-ink text-surface`}>
            ✨<span className="hidden sm:inline">{enCalcul ? " Placement…" : " Placer automatiquement"}</span>
            <span className="sm:hidden">{enCalcul ? "…" : " Auto"}</span>
          </button>
        </form>
      </header>

      {choisi && (
        <p role="status" className="flex items-center gap-2 bg-ink px-4 py-2 text-sm text-surface">
          Touchez une place ou une table pour y installer <strong>{choisi.nom}</strong>.
          <button type="button" onClick={() => setInvite(null)} className="ml-auto text-or underline">
            Annuler
          </button>
        </p>
      )}
      {proposition.faits !== undefined && resultatVu === 0 && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface-soft px-4 py-2 text-sm">
          <strong>
            {proposition.faits} invité{proposition.faits > 1 ? "s" : ""} placé{proposition.faits > 1 ? "s" : ""}
          </strong>
          {Object.entries(proposition.raisons ?? {}).map(([r, n]) => (
            <span key={r} className="text-ink-muted">
              {r} : {n}
            </span>
          ))}
          {proposition.nonPlaces?.length ? <span className="text-alerte">{proposition.nonPlaces.length} sans place : ajoutez des tables</span> : null}
          <button type="button" onClick={() => setResultatVu(1)} aria-label="Fermer le message" className="ml-auto">
            ✕
          </button>
        </div>
      )}
      {proposition.erreur && <p className="bg-surface-soft px-4 py-2 text-sm text-alerte">{proposition.erreur}</p>}

      <div className="relative min-h-0 flex-1">
        <Canevas largeur={largeur} profondeur={profondeur} tables={tables} elements={elements} selection={selection} surSelection={surSelection} surVue={surVue} commandes={commandes} />
        <div className={`absolute right-3 flex flex-col gap-2 ${panneau ? "bottom-[calc(50%+0.75rem)] lg:bottom-3 lg:right-[25rem]" : "bottom-3"}`}>
          {[
            ["+", "Zoomer", () => commandes.current?.zoomer(1.4)],
            ["−", "Dézoomer", () => commandes.current?.zoomer(1 / 1.4)],
            ["⤢", "Recentrer le plan", () => commandes.current?.recentrer()],
          ].map(([t, l, f]) => (
            <button key={l as string} type="button" onClick={f as () => void} aria-label={l as string} className="h-11 w-11 rounded-full border border-line bg-surface text-xl font-semibold shadow-md">
              {t as string}
            </button>
          ))}
        </div>
        {panneau && (
          <section
            aria-label="Panneau"
            className="absolute inset-x-0 bottom-0 flex max-h-[50%] flex-col gap-3 overflow-y-auto rounded-t-md border-t border-line bg-surface p-4 shadow-2xl lg:inset-x-auto lg:top-0 lg:right-0 lg:max-h-none lg:w-96 lg:rounded-none lg:border-t-0 lg:border-l"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <button type="button" onClick={fermer} aria-label="Fermer le panneau" className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft">
              ✕
            </button>
            {panneau}
          </section>
        )}
      </div>
    </div>
  );
}
