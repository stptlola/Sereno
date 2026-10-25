"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { asseoir, placerInvite, proposerPlacement, verrouillerTout, type EtatProposition } from "../../actions/plan";
import type { ElementVue, InviteVue, TableVue } from "../types";
import { Avatar, type Affichage } from "./avatar";
import { Canevas, type Selection, type Vue } from "./canevas";
import { PanneauAjouter, PanneauElement, PanneauPlace, PanneauSalle, PanneauTable } from "./panneaux";

type Tiroir = "plan" | "ajouter" | null;
type Attrape = { id: string; nom: string; cote: string; enfant?: boolean; marie?: boolean; depuis: "rail" | "place"; x: number; y: number; bouge: boolean };

/**
 * Éditeur du plan de table, sur le modèle des meilleurs outils, en plus doux (M5-16, M5-17) :
 * les invités à placer attendent sur le bord droit ; on les glisse sur une chaise. Un tiroir latéral,
 * avec son onglet, s'ouvre selon ce que l'on touche : le plan, une place, une table, un élément.
 */
export function Editeur({ largeur, profondeur, tables, elements, aPlacer }: { largeur: number; profondeur: number; tables: TableVue[]; elements: ElementVue[]; aPlacer: InviteVue[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);
  const [tiroir, setTiroir] = useState<Tiroir>(null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [attrape, setAttrape] = useState<Attrape | null>(null);
  const [, demarrer] = useTransition();
  const vue = useRef<Vue | null>(null);
  const commandes = useRef<{ zoomer: (f: number) => void; recentrer: () => void } | null>(null);
  const vientDeGlisser = useRef(false);
  const [proposition, proposer, enCalcul] = useActionState<EtatProposition, FormData>(proposerPlacement, {});
  const [messageVu, setMessageVu] = useState(false);
  const rafraichir = useCallback(() => router.refresh(), [router]);
  const surVue = useCallback((v: Vue) => {
    vue.current = v;
  }, []);
  const installes = tables.reduce((s, t) => s + t.invites.length, 0);
  // Personnages ou initiales : une préférence d'affichage, gardée sur cet appareil.
  const [affichage, setAffichage] = useState<Affichage>("personnages");
  useEffect(() => {
    try {
      const a = localStorage.getItem("sereno:plan-affichage");
      if (a === "initiales" || a === "personnages") setAffichage(a);
    } catch {
      /* stockage indisponible : affichage par défaut */
    }
  }, []);
  const changerAffichage = (a: Affichage) => {
    setAffichage(a);
    try {
      localStorage.setItem("sereno:plan-affichage", a);
    } catch {
      /* rien */
    }
  };
  const toutVerrouille = tables.length + elements.length > 0 && tables.every((t) => t.verrouille) && elements.every((e) => e.verrouille);

  // Sur iPhone, Safari zoome la page entière quand on pince : on l'en empêche dans l'éditeur,
  // pour que le pincement zoome uniquement le plan.
  useEffect(() => {
    const bloquer = (e: Event) => e.preventDefault();
    const plusieursDoigts = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", bloquer, { passive: false });
    document.addEventListener("gesturechange", bloquer, { passive: false });
    document.addEventListener("gestureend", bloquer, { passive: false });
    document.addEventListener("touchmove", plusieursDoigts, { passive: false });
    const html = document.documentElement;
    const avant = html.style.overscrollBehavior;
    html.style.overscrollBehavior = "none";
    return () => {
      document.removeEventListener("gesturestart", bloquer);
      document.removeEventListener("gesturechange", bloquer);
      document.removeEventListener("gestureend", bloquer);
      document.removeEventListener("touchmove", plusieursDoigts);
      html.style.overscrollBehavior = avant;
    };
  }, []);
  const inviteChoisi = aPlacer.find((g) => g.id === choisi);

  // ---- Glisser-déposer d'un invité (depuis la liste ou depuis une chaise)
  const attraper = (inv: { id: string; nom: string; cote: string; enfant?: boolean; marie?: boolean }, e: React.PointerEvent, depuis: Attrape["depuis"]) => {
    setAttrape({ ...inv, depuis, x: e.clientX, y: e.clientY, bouge: false });
  };
  useEffect(() => {
    if (!attrape) return;
    const bouge = (e: PointerEvent) =>
      setAttrape((a) => (a && (a.bouge || Math.hypot(e.clientX - a.x, e.clientY - a.y) > 8) ? { ...a, x: e.clientX, y: e.clientY, bouge: true } : a));
    const lache = (e: PointerEvent) => {
      const a = attrape;
      setAttrape(null);
      if (!a) return;
      setAttrape((courant) => courant);
      const bougé = Math.hypot(e.clientX - a.x, e.clientY - a.y) > 8 || a.bouge;
      if (!bougé) {
        if (a.depuis === "rail") setChoisi((c) => (c === a.id ? null : a.id));
        return;
      }
      vientDeGlisser.current = true;
      setTimeout(() => (vientDeGlisser.current = false), 80);
      const sous = document.elementFromPoint(e.clientX, e.clientY);
      const place = sous?.closest<HTMLElement | SVGElement>("[data-place]")?.getAttribute("data-place");
      const table = sous?.closest<HTMLElement | SVGElement>("[data-table]")?.getAttribute("data-table");
      const versListe = Boolean(sous?.closest("[data-rail]"));
      demarrer(async () => {
        if (place) {
          const [tableId, numero] = place.split(":");
          await asseoir(a.id, tableId!, Number(numero));
        } else if (table) await placerInvite(a.id, table);
        else if (versListe && a.depuis === "place") await placerInvite(a.id, null);
        rafraichir();
      });
    };
    window.addEventListener("pointermove", bouge);
    window.addEventListener("pointerup", lache, { once: true });
    return () => {
      window.removeEventListener("pointermove", bouge);
      window.removeEventListener("pointerup", lache);
    };
    // On ne réabonne qu'au début d'un nouveau geste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrape?.id, attrape?.depuis]);

  function surSelection(s: Selection) {
    if (choisi && s?.type === "place")
      return demarrer(async () => {
        await asseoir(choisi, s.tableId, s.numero);
        setChoisi(null);
        rafraichir();
      });
    if (choisi && s?.type === "table")
      return demarrer(async () => {
        await placerInvite(choisi, s.id);
        setChoisi(null);
        rafraichir();
      });
    setSelection(s);
    setTiroir(null);
  }
  const fermer = () => {
    setSelection(null);
    setTiroir(null);
  };

  const ongletActif = selection ? ({ place: "Place", table: "Table", element: "Élément" } as const)[selection.type] : tiroir === "ajouter" ? "Ajouter" : tiroir === "plan" ? "Plan" : null;
  let contenu: React.ReactNode = null;
  if (selection?.type === "place") contenu = <PanneauPlace key={`${selection.tableId}-${selection.numero}`} selection={selection} tables={tables} aPlacer={aPlacer} apres={rafraichir} fermer={fermer} />;
  else if (selection?.type === "table") {
    const t = tables.find((x) => x.id === selection.id);
    if (t) contenu = <PanneauTable key={`${t.id}-${t.nom}-${t.places}-${t.forme}-${t.honneur}-${t.verrouille}`} table={t} apres={rafraichir} fermer={fermer} />;
  } else if (selection?.type === "element") {
    const e = elements.find((x) => x.id === selection.id);
    if (e) contenu = <PanneauElement key={`${e.id}-${e.largeur}-${e.profondeur}-${e.rotation}-${e.verrouille}`} element={e} apres={rafraichir} fermer={fermer} />;
  } else if (tiroir === "ajouter") contenu = <PanneauAjouter vue={vue.current} apres={rafraichir} fermer={fermer} />;
  else if (tiroir === "plan")
    contenu = (
      <>
        <p className="font-display text-xl">Le plan</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setMessageVu(false);
            startTransition(() => proposer(f));
          }}
          className="flex flex-col gap-2 rounded-md bg-surface-soft p-3"
        >
          <p className="text-sm font-semibold">Placer les invités automatiquement</p>
          <p className="text-xs text-ink-muted">Foyers ensemble, contraintes respectées, sorties et table d’honneur, puis par affinités.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="garder" defaultChecked className="h-4 w-4" /> Garder ceux déjà placés
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="melanger" className="h-4 w-4" /> Mélanger les deux côtés
          </label>
          <button type="submit" disabled={enCalcul} className="self-start rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface">
            {enCalcul ? "Placement…" : "✨ Placer automatiquement"}
          </button>
        </form>
        <div className="flex flex-col gap-2 rounded-md bg-surface-soft p-3">
          <p className="text-sm font-semibold">Verrouiller le plan</p>
          <p className="text-xs text-ink-muted">Une fois la salle installée, verrouillez tables et éléments : ils ne bougeront plus quand vous placez vos invités.</p>
          <button
            type="button"
            onClick={() =>
              demarrer(async () => {
                await verrouillerTout(!toutVerrouille);
                rafraichir();
              })
            }
            className="self-start rounded-full border border-ink px-4 py-2 text-sm font-semibold"
          >
            {toutVerrouille ? "🔓 Tout déverrouiller" : "🔒 Tout verrouiller"}
          </button>
        </div>
        <div className="flex flex-col gap-2 rounded-md bg-surface-soft p-3">
          <p className="text-sm font-semibold">Affichage des invités</p>
          <div className="flex gap-2">
            {(
              [
                ["personnages", "Personnages"],
                ["initiales", "Initiales"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={affichage === v} onClick={() => changerAffichage(v)} className={`rounded-full border px-3 py-1.5 text-sm ${affichage === v ? "border-ink bg-ink text-surface" : "border-line bg-surface-raised"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <PanneauSalle largeur={largeur} profondeur={profondeur} apres={rafraichir} />
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/plan-de-table/imprimer" className="text-bronze underline">
            Imprimer
          </Link>
          <Link href="/plan-de-table/traiteur" className="text-bronze underline">
            Rapport traiteur
          </Link>
          <Link href="/plan-de-table" className="text-bronze underline">
            Contraintes de placement
          </Link>
        </div>
      </>
    );
  const ouvert = Boolean(contenu);
  const pastille = (g: { nom: string; cote: string; enfant?: boolean; marie?: boolean }, taille = "h-11 w-11") => (
    <svg viewBox="-32 -32 64 64" className={`${taille} shrink-0 overflow-visible drop-shadow-md`} aria-hidden>
      <Avatar cx={0} cy={0} r={28} nom={g.nom} cote={g.cote} enfant={g.enfant} marie={g.marie} affichage={affichage} />
    </svg>
  );
  const flottant = "flex items-center gap-1.5 rounded-full border border-line bg-surface/95 px-3 py-2 text-sm font-semibold shadow-md backdrop-blur";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden overscroll-none bg-surface-soft" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <Canevas
        largeur={largeur}
        profondeur={profondeur}
        tables={tables}
        elements={elements}
        selection={selection}
        surSelection={surSelection}
        surVue={surVue}
        commandes={commandes}
        surAttraperInvite={(inv, e) => attraper(inv, e, "place")}
        ignorerClic={() => vientDeGlisser.current}
        margeDroite={84}
        affichage={affichage}
      />

      {/* En haut : fermer et titre à gauche ; imprimer et ajouter à droite. */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2" style={{ top: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}>
        {/* « Terminer » quitte l'éditeur : masqué quand un tiroir est ouvert, pour ne pas le confondre avec « Fermer ». */}
        <div className={`pointer-events-auto flex items-center gap-2 transition-opacity ${ouvert ? "pointer-events-none opacity-0" : ""}`}>
          <Link href="/plan-de-table" aria-label="Terminer et quitter l’éditeur" className="flex h-11 items-center gap-1 rounded-full bg-ink px-4 text-sm font-semibold text-surface shadow-md">
            ‹ Terminer
          </Link>
          <span className={`${flottant} hidden sm:flex`}>
            Plan de la réception <span className="font-normal text-ink-muted">· {installes} installés</span>
          </span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/plan-de-table/imprimer" className={`${flottant} hidden sm:flex`}>
            Imprimer
          </Link>
          <button type="button" onClick={() => (ouvert ? fermer() : setTiroir("plan"))} aria-expanded={ouvert} aria-controls="tiroir-plan" className={flottant}>
            Plan
          </button>
          <button type="button" onClick={() => (setSelection(null), setTiroir(tiroir === "ajouter" ? null : "ajouter"))} aria-label="Ajouter une table ou un élément" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-2xl text-or shadow-md">
            +
          </button>
        </div>
      </div>

      {(inviteChoisi || (proposition.faits !== undefined && !messageVu)) && (
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-3" style={{ top: "calc(4.25rem + env(safe-area-inset-top, 0px))" }}>
          <p role="status" className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-ink px-4 py-2 text-sm text-surface shadow-md">
            {inviteChoisi ? (
              <>
                Touchez une chaise pour <strong>{inviteChoisi.nom}</strong>
                <button type="button" onClick={() => setChoisi(null)} className="text-or underline">
                  Annuler
                </button>
              </>
            ) : (
              <>
                <strong>
                  {proposition.faits} invité{(proposition.faits ?? 0) > 1 ? "s" : ""} placé{(proposition.faits ?? 0) > 1 ? "s" : ""}
                </strong>
                {proposition.nonPlaces?.length ? <span className="text-or">{proposition.nonPlaces.length} sans place</span> : null}
                <button type="button" onClick={() => setMessageVu(true)} aria-label="Fermer le message" className="text-or">
                  ✕
                </button>
              </>
            )}
          </p>
        </div>
      )}

      {/* Bord droit : les invités à placer, à glisser sur une chaise. */}
      <aside
        data-rail
        aria-label={`Invités à placer : ${aPlacer.length}`}
        className={`absolute right-2 flex w-16 flex-col items-center gap-2 rounded-full border border-line bg-surface/95 py-3 shadow-md backdrop-blur transition-opacity ${ouvert ? "pointer-events-none opacity-0" : "opacity-100"}`}
        style={{ top: "calc(4.75rem + env(safe-area-inset-top, 0px))", bottom: "10.5rem" }}
      >
        <span className="text-[10px] font-semibold tracking-wide text-bronze uppercase">À placer</span>
        <span className="font-display text-lg leading-none">{aPlacer.length}</span>
        <ul className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-1">
          {aPlacer.length === 0 && <li className="px-1 text-center text-[10px] text-ink-muted">Tout le monde est placé</li>}
          {aPlacer.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                aria-pressed={choisi === g.id}
                aria-label={`${g.nom} : glisser sur une chaise, ou toucher puis toucher une chaise`}
                onPointerDown={(e) => attraper(g, e, "rail")}
                className={`flex flex-col items-center gap-0.5 rounded-full p-0.5 [touch-action:pan-y] ${choisi === g.id ? "ring-2 ring-bronze" : ""}`}
              >
                {pastille(g)}
                <span className="max-w-14 truncate text-[10px] leading-tight">
                  {g.prenom}
                  {g.nomFamille && <span className="block truncate text-ink-muted">{g.nomFamille}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {aPlacer.length > 0 && (
          <button type="button" onClick={() => (setSelection(null), setTiroir("plan"))} aria-label="Placer automatiquement" className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-lg text-or">
            ✨
          </button>
        )}
      </aside>

      {/* Zoom, en bas à droite. */}
      <div className={`absolute bottom-4 flex flex-col gap-2 transition-all ${ouvert ? "right-[min(86vw,22rem)] mr-3" : "right-3"}`} style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
        {[
          ["+", "Zoomer", () => commandes.current?.zoomer(1.4)],
          ["−", "Dézoomer", () => commandes.current?.zoomer(1 / 1.4)],
          ["⤢", "Recentrer le plan", () => commandes.current?.recentrer()],
        ].map(([t, l, f]) => (
          <button key={l as string} type="button" onClick={f as () => void} aria-label={l as string} className="h-11 w-11 rounded-full border border-line bg-surface/95 text-xl font-semibold shadow-md backdrop-blur">
            {t as string}
          </button>
        ))}
      </div>

      {/* Tiroir latéral, avec son onglet vertical, comme sur les outils de référence. */}
      <div id="tiroir-plan" className={`absolute top-0 right-0 bottom-0 z-10 w-[min(86vw,22rem)] transition-transform duration-300 ${ouvert ? "translate-x-0" : "pointer-events-none translate-x-full"}`}>
        {/* L'onglet n'apparaît que tiroir ouvert : fermé, il couvrirait la liste des invités. */}
        {ouvert && (
          <button type="button" onClick={fermer} aria-label={`Fermer le panneau ${ongletActif}`} className="absolute top-1/3 -left-10 flex h-36 w-10 items-center justify-center rounded-l-md border border-r-0 border-line bg-surface shadow-md">
            <span className="rotate-180 text-sm font-semibold tracking-wide [writing-mode:vertical-rl]">{ongletActif} ›</span>
          </button>
        )}
        <section aria-label={`Panneau ${ongletActif ?? ""}`} className="flex h-full flex-col gap-3 overflow-y-auto border-l border-line bg-surface p-4 pt-6 shadow-2xl" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          {ouvert && (
            <button type="button" onClick={fermer} aria-label="Fermer le panneau" className="self-end rounded-full bg-surface-soft px-3 py-1 text-sm">
              Fermer
            </button>
          )}
          {contenu}
        </section>
      </div>

      {/* L'invité attrapé suit le doigt. */}
      {attrape?.bouge && (
        <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2" style={{ left: attrape.x, top: attrape.y }}>
          {pastille(attrape, "h-14 w-14 text-base scale-110")}
        </div>
      )}
    </div>
  );
}
