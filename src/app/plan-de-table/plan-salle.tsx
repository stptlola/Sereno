"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deplacer, placerInvite } from "../actions/plan";
import { tailleTable, type ElementVue, type TableVue } from "./types";

type Cible = { type: "table" | "element"; id: string };

/** Plan de salle à l'échelle (M5-16) : on glisse tables et éléments ; une table touchée reçoit l'invité sélectionné. */
export function PlanSalle({
  largeur,
  profondeur,
  tables,
  elements,
  inviteSelectionne,
  surPlacement,
}: {
  largeur: number;
  profondeur: number;
  tables: TableVue[];
  elements: ElementVue[];
  inviteSelectionne: string | null;
  surPlacement: () => void;
}) {
  const router = useRouter();
  const svg = useRef<SVGSVGElement>(null);
  const [, demarrer] = useTransition();
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  // La dernière position est gardée dans la référence : un glissement vif peut être relâché avant le prochain affichage.
  const glisse = useRef<{ cible: Cible; dx: number; dy: number; depart: { x: number; y: number }; bouge: boolean; derniere?: { x: number; y: number } } | null>(null);

  // Les positions locales s'effacent quand les données du serveur arrivent.
  useEffect(() => setPositions({}), [tables, elements]);

  function versPlan(e: React.PointerEvent) {
    const p = svg.current!.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const r = p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: r.x, y: r.y };
  }

  function commencer(e: React.PointerEvent, cible: Cible, x: number, y: number) {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = versPlan(e);
    glisse.current = { cible, dx: p.x - x, dy: p.y - y, depart: p, bouge: false };
  }

  function bouger(e: React.PointerEvent) {
    const g = glisse.current;
    if (!g) return;
    const p = versPlan(e);
    if (!g.bouge && Math.hypot(p.x - g.depart.x, p.y - g.depart.y) < 15) return;
    g.bouge = true;
    g.derniere = { x: Math.min(Math.max(p.x - g.dx, 0), largeur), y: Math.min(Math.max(p.y - g.dy, 0), profondeur) };
    const derniere = g.derniere;
    setPositions((s) => ({ ...s, [g.cible.id]: derniere }));
  }

  function finir(cible: Cible) {
    const g = glisse.current;
    glisse.current = null;
    if (!g) return;
    if (g.bouge) {
      const pos = g.derniere;
      if (pos) demarrer(async () => {
        await deplacer(cible.type, cible.id, pos.x, pos.y);
        router.refresh();
      });
    } else if (cible.type === "table" && inviteSelectionne) {
      demarrer(async () => {
        await placerInvite(inviteSelectionne, cible.id);
        surPlacement();
      });
    }
  }

  const pos = (id: string, x: number, y: number) => positions[id] ?? { x, y };
  const grille = 100;

  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface-raised">
      <svg ref={svg} viewBox={`-40 -40 ${largeur + 80} ${profondeur + 80}`} className="block h-auto w-full touch-none select-none" onPointerMove={bouger} role="img" aria-label="Plan de salle">
        <defs>
          <pattern id="grille" width={grille} height={grille} patternUnits="userSpaceOnUse">
            <path d={`M ${grille} 0 L 0 0 0 ${grille}`} fill="none" stroke="var(--color-line)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={largeur} height={profondeur} fill="url(#grille)" stroke="var(--color-ink-muted)" strokeWidth="6" rx="12" />
        <text x="0" y="-12" fontSize="28" fill="var(--color-ink-muted)">
          {(largeur / 100).toLocaleString("fr-FR")} m × {(profondeur / 100).toLocaleString("fr-FR")} m · un carreau = 1 m
        </text>

        {elements.map((el) => {
          const { x, y } = pos(el.id, el.x, el.y);
          const sortie = el.type === "sortie";
          return (
            <g key={el.id} transform={`translate(${x} ${y}) rotate(${el.rotation})`} className="cursor-move" onPointerDown={(e) => commencer(e, { type: "element", id: el.id }, x, y)} onPointerUp={() => finir({ type: "element", id: el.id })}>
              <rect x={-el.largeur / 2} y={-el.profondeur / 2} width={el.largeur} height={el.profondeur} rx="16" fill={sortie ? "var(--color-or)" : "var(--color-surface-soft)"} stroke="var(--color-ink-muted)" strokeWidth="3" strokeDasharray={sortie ? "" : "12 8"} />
              <text textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(36, el.profondeur / 2.2)} fill="var(--color-ink)">
                {el.libelle}
              </text>
            </g>
          );
        })}

        {tables.map((t) => {
          const { x, y } = pos(t.id, t.x, t.y);
          const { l, p } = tailleTable(t);
          const occupe = t.invites.reduce((s, i) => s + (i.accompagnant ? 2 : 1), 0);
          const plein = occupe >= t.places;
          const trop = occupe > t.places;
          const cible = Boolean(inviteSelectionne) && !plein;
          const fond = t.honneur ? "var(--color-ink)" : "var(--color-surface)";
          const texte = t.honneur ? "var(--color-surface)" : "var(--color-ink)";
          const contour = trop ? "var(--color-alerte)" : cible ? "var(--color-or)" : "var(--color-ink)";
          const forme =
            t.forme === "RONDE" ? (
              <circle r={l / 2} />
            ) : t.forme === "OVALE" ? (
              <ellipse rx={l / 2} ry={p / 2} />
            ) : t.forme === "DEMI_LUNE" ? (
              <path d={`M ${-l / 2} ${-p / 2} H ${l / 2} A ${l / 2} ${p} 0 0 1 ${-l / 2} ${-p / 2} Z`} />
            ) : (
              <rect x={-l / 2} y={-p / 2} width={l} height={p} rx="10" />
            );
          return (
            <g
              key={t.id}
              transform={`translate(${x} ${y})`}
              className={cible ? "cursor-pointer" : "cursor-move"}
              onPointerDown={(e) => commencer(e, { type: "table", id: t.id }, x, y)}
              onPointerUp={() => finir({ type: "table", id: t.id })}
              role="button"
              aria-label={`${t.nom}, ${occupe} sur ${t.places} places${cible ? " : toucher pour placer l’invité sélectionné" : ""}`}
            >
              <g transform={`rotate(${t.rotation})`} fill={fond} stroke={contour} strokeWidth={cible || trop ? 10 : 5}>
                {forme}
              </g>
              <text textAnchor="middle" y={-6} fontSize="40" fontWeight="700" fill={texte}>
                {t.honneur ? "♥" : t.numero}
              </text>
              <text textAnchor="middle" y={34} fontSize="26" fill={trop ? "var(--color-alerte)" : texte}>
                {occupe}/{t.places}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
