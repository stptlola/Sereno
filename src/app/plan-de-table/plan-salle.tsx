"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deplacer } from "../actions/plan";
import { positionsPlaces, tailleTable, tourner, type ElementVue, type TableVue } from "./types";

type Cible = { type: "table" | "element"; id: string };
export type Selection = { type: "place"; tableId: string; numero: number } | { type: "table"; id: string } | { type: "element"; id: string } | null;

/**
 * Plan de salle à l'échelle (M5-16, M5-17) : places autour de chaque table, avec les prénoms.
 * On glisse tables et éléments ; on touche une place, une table ou un élément pour agir dessus.
 */
export function PlanSalle({
  largeur,
  profondeur,
  tables,
  elements,
  selection,
  surSelection,
}: {
  largeur: number;
  profondeur: number;
  tables: TableVue[];
  elements: ElementVue[];
  selection: Selection;
  surSelection: (s: Selection) => void;
}) {
  const router = useRouter();
  const svg = useRef<SVGSVGElement>(null);
  const [, demarrer] = useTransition();
  const [zoom, setZoom] = useState(1);
  // Par défaut, le plan est cadré sur les tables et les éléments : sur mobile, la salle entière serait illisible.
  const [toutVoir, setToutVoir] = useState(false);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  // La dernière position est gardée dans la référence : un glissement vif peut être relâché avant le prochain affichage.
  const glisse = useRef<{ cible: Cible; dx: number; dy: number; depart: { x: number; y: number }; bouge: boolean; derniere?: { x: number; y: number } } | null>(null);

  useEffect(() => setPositions({}), [tables, elements]);
  // Sur téléphone, le plan s'ouvre zoomé : on le fait défiler du doigt pour se déplacer.
  useEffect(() => {
    if (window.innerWidth < 640) setZoom(2);
  }, []);

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
    if (!g.bouge && Math.hypot(p.x - g.depart.x, p.y - g.depart.y) < 20) return;
    g.bouge = true;
    g.derniere = { x: Math.min(Math.max(p.x - g.dx, 0), largeur), y: Math.min(Math.max(p.y - g.dy, 0), profondeur) };
    const derniere = g.derniere;
    setPositions((s) => ({ ...s, [g.cible.id]: derniere }));
  }

  function finir(cible: Cible) {
    const g = glisse.current;
    glisse.current = null;
    if (!g) return;
    if (g.bouge && g.derniere) {
      const pos = g.derniere;
      demarrer(async () => {
        await deplacer(cible.type, cible.id, pos.x, pos.y);
        router.refresh();
      });
    } else surSelection(cible.type === "table" ? { type: "table", id: cible.id } : { type: "element", id: cible.id });
  }

  const pos = (id: string, x: number, y: number) => positions[id] ?? { x, y };

  const objets = [
    ...tables.map((t) => {
      const { l, p } = tailleTable(t);
      const r = Math.max(l, p) / 2 + 110;
      return { x: t.x, y: t.y, r };
    }),
    ...elements.map((e) => ({ x: e.x, y: e.y, r: Math.max(e.largeur, e.profondeur) / 2 + 40 })),
  ];
  const cadre =
    toutVoir || objets.length === 0
      ? { x: -60, y: -60, l: largeur + 120, p: profondeur + 120 }
      : (() => {
          const x0 = Math.max(-60, Math.min(...objets.map((o) => o.x - o.r)));
          const y0 = Math.max(-60, Math.min(...objets.map((o) => o.y - o.r)));
          const x1 = Math.min(largeur + 60, Math.max(...objets.map((o) => o.x + o.r)));
          const y1 = Math.min(profondeur + 60, Math.max(...objets.map((o) => o.y + o.r)));
          // Un cadre d'au moins 6 mètres de large, pour garder des proportions lisibles.
          const l = Math.max(600, x1 - x0);
          // Marge en haut pour les boutons du plan.
          return { x: x0 - (l - (x1 - x0)) / 2, y: y0 - 90, l, p: Math.max(400, y1 - y0) + 90 };
        })();

  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-surface-raised">
      <button type="button" onClick={() => setToutVoir((v) => !v)} className="absolute top-2 left-2 z-10 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold shadow-sm">
        {toutVoir ? "Recentrer sur les tables" : "Voir toute la salle"}
      </button>
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        {[
          ["+", () => setZoom((z) => Math.min(4, z + 0.5)), "Zoomer"],
          ["−", () => setZoom((z) => Math.max(1, z - 0.5)), "Dézoomer"],
        ].map(([t, f, l]) => (
          <button key={l as string} type="button" onClick={f as () => void} aria-label={l as string} className="h-9 w-9 rounded-full border border-line bg-surface text-lg font-semibold shadow-sm">
            {t as string}
          </button>
        ))}
      </div>
      <div className="max-h-[70vh] overflow-auto overscroll-contain">
        <svg
          ref={svg}
          viewBox={`${cadre.x} ${cadre.y} ${cadre.l} ${cadre.p}`}
          style={{ width: `${zoom * 100}%`, minWidth: zoom > 1 ? `${zoom * 100}%` : undefined }}
          className="block h-auto touch-none select-none"
          onPointerMove={bouger}
          onClick={(e) => e.target === svg.current && surSelection(null)}
          role="img"
          aria-label="Plan de salle"
        >
          <defs>
            <pattern id="grille" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="var(--color-line)" strokeWidth="2" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={largeur} height={profondeur} fill="url(#grille)" stroke="var(--color-ink-muted)" strokeWidth="6" rx="12" onClick={() => surSelection(null)} />
          <text x={Math.max(0, cadre.x + 20)} y={Math.max(-18, cadre.y + 40)} fontSize="26" fill="var(--color-ink-muted)">
            {(largeur / 100).toLocaleString("fr-FR")} m × {(profondeur / 100).toLocaleString("fr-FR")} m · un carreau = 1 m
          </text>

          {elements.map((el) => {
            const { x, y } = pos(el.id, el.x, el.y);
            const sortie = el.type === "sortie";
            const choisi = selection?.type === "element" && selection.id === el.id;
            return (
              <g key={el.id} transform={`translate(${x} ${y}) rotate(${el.rotation})`} className="cursor-move" onPointerDown={(e) => commencer(e, { type: "element", id: el.id }, x, y)} onPointerUp={() => finir({ type: "element", id: el.id })}>
                <rect
                  x={-el.largeur / 2}
                  y={-el.profondeur / 2}
                  width={el.largeur}
                  height={el.profondeur}
                  rx="16"
                  fill={sortie ? "var(--color-or)" : "var(--color-surface-soft)"}
                  stroke={choisi ? "var(--color-bronze)" : "var(--color-ink-muted)"}
                  strokeWidth={choisi ? 10 : 3}
                  strokeDasharray={sortie || choisi ? "" : "12 8"}
                />
                <text textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(36, Math.max(18, el.profondeur / 2.2))} fill="var(--color-ink)">
                  {el.libelle}
                </text>
              </g>
            );
          })}

          {tables.map((t) => {
            const { x, y } = pos(t.id, t.x, t.y);
            const { l, p } = tailleTable(t);
            const parPlace = new Map(t.invites.filter((i) => i.place).map((i) => [i.place!, i]));
            const nbPlaces = Math.max(t.places, ...t.invites.map((i) => i.place ?? 0));
            const places = positionsPlaces(t, nbPlaces);
            const choisie = selection?.type === "table" && selection.id === t.id;
            const trop = t.invites.length > t.places;
            const fond = t.honneur ? "var(--color-ink)" : "var(--color-surface)";
            const texte = t.honneur ? "var(--color-surface)" : "var(--color-ink)";
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
              <g key={t.id} transform={`translate(${x} ${y})`}>
                <g
                  className="cursor-move"
                  onPointerDown={(e) => commencer(e, { type: "table", id: t.id }, x, y)}
                  onPointerUp={() => finir({ type: "table", id: t.id })}
                  role="button"
                  aria-label={`${t.nom}, ${t.invites.length} sur ${t.places} places`}
                >
                  <g transform={`rotate(${t.rotation})`} fill={fond} stroke={trop ? "var(--color-alerte)" : choisie ? "var(--color-bronze)" : "var(--color-ink)"} strokeWidth={choisie || trop ? 10 : 5}>
                    {forme}
                  </g>
                  <text textAnchor="middle" y={-4} fontSize="38" fontWeight="700" fill={texte}>
                    {t.honneur ? "♥" : t.numero}
                  </text>
                  <text textAnchor="middle" y={32} fontSize="24" fill={trop ? "var(--color-alerte)" : texte}>
                    {t.invites.length}/{t.places}
                  </text>
                </g>
                {places.map((pl) => {
                  const r = tourner(pl.x, pl.y, t.rotation);
                  const occupant = parPlace.get(pl.numero);
                  const active = selection?.type === "place" && selection.tableId === t.id && selection.numero === pl.numero;
                  const d = Math.hypot(r.x, r.y) || 1;
                  const lx = r.x + (r.x / d) * 52;
                  const ly = r.y + (r.y / d) * 52;
                  return (
                    <g
                      key={pl.numero}
                      role="button"
                      aria-label={`${t.nom}, place ${pl.numero}${occupant ? ` : ${occupant.nom}` : " : libre"}`}
                      className="cursor-pointer"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        surSelection({ type: "place", tableId: t.id, numero: pl.numero });
                      }}
                    >
                      <circle cx={r.x} cy={r.y} r="24" fill={occupant ? "var(--color-or)" : "var(--color-surface-raised)"} stroke={active ? "var(--color-bronze)" : "var(--color-ink-muted)"} strokeWidth={active ? 8 : 3} strokeDasharray={occupant ? "" : "6 5"} />
                      <text x={r.x} y={r.y} textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="600" fill="var(--color-ink)">
                        {occupant ? occupant.nom.split(" ").map((m) => m[0]).join("").slice(0, 2) : pl.numero}
                      </text>
                      {occupant && (
                        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="22" fill="var(--color-ink)" stroke="var(--color-surface-raised)" strokeWidth="6" paintOrder="stroke">
                          {occupant.nom.split(" ")[0]}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
