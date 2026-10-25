"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { deplacer } from "../../actions/plan";
import { positionsPlaces, tailleTable, tourner, type ElementVue, type TableVue } from "../types";
import { Avatar, type Affichage } from "./avatar";

export type Selection = { type: "place"; tableId: string; numero: number } | { type: "table"; id: string } | { type: "element"; id: string } | null;
export interface Vue {
  x: number;
  y: number;
  l: number;
  p: number;
}

type Objet = { type: "table" | "element"; id: string; verrou?: boolean };

/** Cadre initial : les tables et éléments, ou toute la salle s'il n'y a encore rien. */
function cadrer(largeur: number, profondeur: number, tables: TableVue[], elements: ElementVue[]): Vue {
  const objets = [
    ...tables.map((t) => ({ x: t.x, y: t.y, r: Math.max(tailleTable(t).l, tailleTable(t).p) / 2 + 110 })),
    ...elements.map((e) => ({ x: e.x, y: e.y, r: Math.max(e.largeur, e.profondeur) / 2 + 40 })),
  ];
  if (!objets.length) return { x: -60, y: -60, l: largeur + 120, p: profondeur + 120 };
  const x0 = Math.min(...objets.map((o) => o.x - o.r));
  const y0 = Math.min(...objets.map((o) => o.y - o.r));
  const x1 = Math.max(...objets.map((o) => o.x + o.r));
  const y1 = Math.max(...objets.map((o) => o.y + o.r));
  return { x: x0, y: y0, l: Math.max(500, x1 - x0), p: Math.max(400, y1 - y0) };
}

/**
 * Canevas du plan de salle (M5-16, M5-17). On fait glisser le fond pour se déplacer, on pince ou
 * on utilise la molette pour zoomer ; on glisse tables et éléments ; on touche une place, une table ou un élément.
 */
export function Canevas({
  largeur,
  profondeur,
  tables,
  elements,
  selection,
  surSelection,
  surVue,
  commandes,
  lectureSeule = false,
  surAttraperInvite,
  ignorerClic,
  margeDroite = 0,
  affichage = "personnages",
}: {
  largeur: number;
  profondeur: number;
  tables: TableVue[];
  elements: ElementVue[];
  selection?: Selection;
  surSelection?: (s: Selection) => void;
  /** Informe l'éditeur du cadre visible (pour ajouter une table au centre de la vue). */
  surVue?: (v: Vue) => void;
  /** Reçoit les commandes de zoom de l'éditeur. */
  commandes?: React.RefObject<{ zoomer: (f: number) => void; recentrer: () => void } | null>;
  lectureSeule?: boolean;
  /** Un invité assis est attrapé : l'éditeur gère le glisser-déposer vers une autre place ou vers la liste. */
  surAttraperInvite?: (invite: { id: string; nom: string; cote: string; enfant: boolean; marie: boolean }, e: React.PointerEvent) => void;
  /** Vrai juste après un glisser-déposer, pour ne pas ouvrir le panneau de la place relâchée. */
  ignorerClic?: () => boolean;
  /** Largeur (px) couverte à droite par la liste des invités : le plan se cadre dans la partie visible. */
  margeDroite?: number;
  affichage?: Affichage;
}) {
  const router = useRouter();
  const conteneur = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [, demarrer] = useTransition();
  const [vue, setVue] = useState<Vue>(() => cadrer(largeur, profondeur, tables, elements));
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<{ type: "fond"; vue: Vue; depart: { x: number; y: number }; ecart?: number; milieu?: { x: number; y: number } } | null>(null);
  const glisse = useRef<{ cible: Objet; dx: number; dy: number; depart: { x: number; y: number }; bouge: boolean; derniere?: { x: number; y: number } } | null>(null);
  // Objet verrouillé touché : le geste déplace le plan, et un simple toucher le sélectionne.
  const cibleVerrouillee = useRef<Objet | null>(null);

  // Le cadre garde les proportions de l'écran, et place le contenu dans la partie visible (hors liste des invités).
  const ajusterProportions = useCallback(
    (v: Vue): Vue => {
      const c = conteneur.current;
      if (!c || !c.clientWidth) return v;
      const visible = Math.max(120, c.clientWidth - margeDroite);
      const ratio = c.clientHeight / visible;
      const l = Math.max(v.l, v.p / ratio);
      const p = l * ratio;
      return { x: v.x - (l - v.l) / 2, y: v.y - (p - v.p) / 2, l: (l * c.clientWidth) / visible, p };
    },
    [margeDroite],
  );

  // Sur téléphone, on cadre assez près pour lire les prénoms ; on se déplace ensuite du doigt.
  const rapprocher = useCallback(
    (v: Vue): Vue => {
      const etroit = (conteneur.current?.clientWidth ?? 1000) < 640;
      if (!etroit || v.l <= 520 || lectureSeule) return ajusterProportions(v);
      const cx = v.x + v.l / 2;
      const cy = v.y + v.p / 2;
      return ajusterProportions({ x: cx - 260, y: cy - 260, l: 520, p: 520 });
    },
    [ajusterProportions, lectureSeule],
  );

  useLayoutEffect(() => {
    setVue((v) => rapprocher(v));
    const obs = new ResizeObserver(() => setVue((v) => ajusterProportions(v)));
    if (conteneur.current) obs.observe(conteneur.current);
    return () => obs.disconnect();
  }, [ajusterProportions, rapprocher]);

  useEffect(() => {
    surVue?.(vue);
  }, [vue, surVue]);
  useEffect(() => setPositions({}), [tables, elements]);

  const echelle = () => vue.l / (conteneur.current?.clientWidth || 1);
  const zoomerEn = useCallback((facteur: number, cx?: number, cy?: number) => {
    setVue((v) => {
      const l = Math.min(Math.max(v.l / facteur, 200), (largeur + 400) * 3);
      const p = v.p * (l / v.l);
      const px = cx ?? v.x + v.l / 2;
      const py = cy ?? v.y + v.p / 2;
      return { x: px - ((px - v.x) * l) / v.l, y: py - ((py - v.y) * p) / v.p, l, p };
    });
  }, [largeur]);

  useEffect(() => {
    if (commandes) commandes.current = { zoomer: (f) => zoomerEn(f), recentrer: () => setVue(rapprocher(cadrer(largeur, profondeur, tables, elements))) };
  }, [commandes, zoomerEn, rapprocher, largeur, profondeur, tables, elements]);

  function versPlan(clientX: number, clientY: number) {
    const p = svg.current!.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    const r = p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: r.x, y: r.y };
  }

  // Certains appareils envoient un toucher sans pointeur actif : la capture est alors simplement ignorée.
  function capturer(e: React.PointerEvent) {
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* rien à capturer */
    }
  }

  // ---- Fond : déplacement et pincement
  function fondBas(e: React.PointerEvent) {
    if (lectureSeule) return;
    capturer(e);
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointeurs.current.values()];
    if (pts.length === 1) geste.current = { type: "fond", vue, depart: { x: e.clientX, y: e.clientY } };
    if (pts.length === 2) {
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
      geste.current = { type: "fond", vue, depart: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ecart: Math.hypot(a.x - b.x, a.y - b.y), milieu: versPlan((a.x + b.x) / 2, (a.y + b.y) / 2) };
    }
  }
  function fondBouge(e: React.PointerEvent) {
    if (glisse.current) return objetBouge(e);
    const g = geste.current;
    if (!g || !pointeurs.current.has(e.pointerId)) return;
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointeurs.current.values()];
    const s = g.vue.l / (conteneur.current?.clientWidth || 1);
    if (pts.length >= 2 && g.ecart && g.milieu) {
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
      const f = Math.hypot(a.x - b.x, a.y - b.y) / g.ecart;
      const l = Math.min(Math.max(g.vue.l / f, 200), (largeur + 400) * 3);
      const p = g.vue.p * (l / g.vue.l);
      setVue({ x: g.milieu.x - ((g.milieu.x - g.vue.x) * l) / g.vue.l, y: g.milieu.y - ((g.milieu.y - g.vue.y) * p) / g.vue.p, l, p });
    } else if (pts.length === 1) {
      setVue({ ...g.vue, x: g.vue.x - (e.clientX - g.depart.x) * s, y: g.vue.y - (e.clientY - g.depart.y) * s });
    }
  }
  function fondHaut(e: React.PointerEvent) {
    if (glisse.current) return;
    const g = geste.current;
    pointeurs.current.delete(e.pointerId);
    if (pointeurs.current.size === 0) {
      // Un simple toucher sur le fond désélectionne ; sur un objet verrouillé, il le sélectionne.
      if (g && Math.hypot(e.clientX - g.depart.x, e.clientY - g.depart.y) < 6 && !g.ecart) {
        const v = cibleVerrouillee.current;
        surSelection?.(v ? (v.type === "table" ? { type: "table", id: v.id } : { type: "element", id: v.id }) : null);
      }
      cibleVerrouillee.current = null;
      geste.current = null;
    } else geste.current = { type: "fond", vue, depart: [...pointeurs.current.values()][0]! };
  }

  // ---- Tables et éléments : glisser pour déplacer, toucher pour sélectionner
  function objetBas(e: React.PointerEvent, cible: Objet, x: number, y: number) {
    if (lectureSeule) return;
    if (cible.verrou) {
      // On laisse le geste au fond : il déplace le plan au lieu de l'objet.
      cibleVerrouillee.current = cible;
      return;
    }
    e.stopPropagation();
    capturer(e);
    const p = versPlan(e.clientX, e.clientY);
    glisse.current = { cible, dx: p.x - x, dy: p.y - y, depart: p, bouge: false };
  }
  function objetBouge(e: React.PointerEvent) {
    const g = glisse.current;
    if (!g) return;
    const p = versPlan(e.clientX, e.clientY);
    if (!g.bouge && Math.hypot(p.x - g.depart.x, p.y - g.depart.y) < 12 * echelle()) return;
    g.bouge = true;
    g.derniere = { x: Math.min(Math.max(p.x - g.dx, 0), largeur), y: Math.min(Math.max(p.y - g.dy, 0), profondeur) };
    const d = g.derniere;
    setPositions((s) => ({ ...s, [g.cible.id]: d }));
  }
  function objetHaut(cible: Objet) {
    if (cible.verrou) return;
    const g = glisse.current;
    glisse.current = null;
    if (!g) return;
    if (g.bouge && g.derniere) {
      const pos = g.derniere;
      demarrer(async () => {
        await deplacer(cible.type, cible.id, pos.x, pos.y);
        router.refresh();
      });
    } else surSelection?.(cible.type === "table" ? { type: "table", id: cible.id } : { type: "element", id: cible.id });
  }

  const pos = (id: string, x: number, y: number) => positions[id] ?? { x, y };

  return (
    <div ref={conteneur} className="relative h-full w-full overflow-hidden bg-surface-raised">
      <svg
        ref={svg}
        viewBox={`${vue.x} ${vue.y} ${vue.l} ${vue.p}`}
        className={`block h-full w-full select-none ${lectureSeule ? "" : "touch-none"}`}
        onPointerDown={fondBas}
        onPointerMove={fondBouge}
        onPointerUp={fondHaut}
        onPointerCancel={fondHaut}
        onWheel={(e) => {
          if (lectureSeule) return;
          const p = versPlan(e.clientX, e.clientY);
          zoomerEn(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
        }}
        role="img"
        aria-label="Plan de salle"
      >
        <defs>
          <pattern id="grille-editeur" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="var(--color-line)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x={vue.x - 5000} y={vue.y - 5000} width={vue.l + 10000} height={vue.p + 10000} fill="var(--color-surface-soft)" />
        <rect x="0" y="0" width={largeur} height={profondeur} fill="url(#grille-editeur)" stroke="var(--color-ink-muted)" strokeWidth="6" rx="12" style={{ fill: "var(--color-surface-raised)" }} />
        <rect x="0" y="0" width={largeur} height={profondeur} fill="url(#grille-editeur)" rx="12" />

        {elements.map((el) => {
          const { x, y } = pos(el.id, el.x, el.y);
          const sortie = el.type === "sortie";
          const choisi = selection?.type === "element" && selection.id === el.id;
          return (
            <g key={el.id} transform={`translate(${x} ${y}) rotate(${el.rotation})`} className={lectureSeule || el.verrouille ? "" : "cursor-move"} onPointerDown={(e) => objetBas(e, { type: "element", id: el.id, verrou: el.verrouille }, x, y)} onPointerUp={() => objetHaut({ type: "element", id: el.id, verrou: el.verrouille })} role="button" aria-label={`Élément : ${el.libelle}${el.verrouille ? " (verrouillé)" : ""}`}>
              <rect x={-el.largeur / 2} y={-el.profondeur / 2} width={el.largeur} height={el.profondeur} rx="16" fill={sortie ? "var(--color-or)" : "var(--color-surface-soft)"} stroke={choisi ? "var(--color-bronze)" : "var(--color-ink-muted)"} strokeWidth={choisi ? 10 : 3} strokeDasharray={sortie || choisi ? "" : "12 8"} />
              <text textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(40, Math.max(18, el.profondeur / 2.4))} fill="var(--color-ink)">
                {el.libelle}
              </text>
              {el.verrouille && !lectureSeule && (
                <text x={el.largeur / 2 - 18} y={-el.profondeur / 2 + 20} textAnchor="middle" dominantBaseline="central" fontSize="22" style={{ pointerEvents: "none" }}>
                  🔒
                </text>
              )}
            </g>
          );
        })}

        {tables.map((t) => {
          const { x, y } = pos(t.id, t.x, t.y);
          const { l, p } = tailleTable(t);
          const parPlace = new Map(t.invites.filter((i) => i.place).map((i) => [i.place!, i]));
          const places = positionsPlaces(t, Math.max(t.places, ...t.invites.map((i) => i.place ?? 0)));
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
              <g data-table={t.id} className={lectureSeule || t.verrouille ? "" : "cursor-move"} onPointerDown={(e) => objetBas(e, { type: "table", id: t.id, verrou: t.verrouille }, x, y)} onPointerUp={() => objetHaut({ type: "table", id: t.id, verrou: t.verrouille })} role="button" aria-label={`${t.nom}, ${t.invites.length} sur ${t.places} places${t.verrouille ? " (verrouillée)" : ""}`}>
                <g transform={`rotate(${t.rotation})`} fill={fond} stroke={trop ? "var(--color-alerte)" : choisie ? "var(--color-bronze)" : "var(--color-ink)"} strokeWidth={choisie || trop ? 10 : 5}>
                  {forme}
                </g>
                {/* Le nom de la table, réduit pour tenir dans la table. */}
                <text textAnchor="middle" y={-6} fontSize={Math.min(34, (Math.min(l, p * 1.6) * 0.82) / Math.max(4, t.nom.length * 0.56))} fontWeight="700" fill={texte}>
                  {t.honneur && !t.nom.toLowerCase().includes("honneur") ? `♥ ${t.nom}` : t.nom}
                </text>
                <text textAnchor="middle" y={28} fontSize="22" fill={trop ? "var(--color-alerte)" : texte} opacity={0.8}>
                  {t.invites.length}/{t.places}
                </text>
                {t.verrouille && !lectureSeule && (
                  <text textAnchor="middle" y={62} fontSize="22" style={{ pointerEvents: "none" }}>
                    🔒
                  </text>
                )}
              </g>
              {places.map((pl) => {
                const r = tourner(pl.x, pl.y, t.rotation);
                const occupant = parPlace.get(pl.numero);
                const active = selection?.type === "place" && selection.tableId === t.id && selection.numero === pl.numero;
                const d = Math.hypot(r.x, r.y) || 1;
                return (
                  <g
                    key={pl.numero}
                    role="button"
                    data-place={`${t.id}:${pl.numero}`}
                    aria-label={`${t.nom}, place ${pl.numero}${occupant ? ` : ${occupant.nom}` : " : libre"}`}
                    className={lectureSeule ? "" : occupant ? "cursor-grab" : "cursor-pointer"}
                    onPointerDown={(e) => {
                      if (lectureSeule) return;
                      e.stopPropagation();
                      if (occupant) surAttraperInvite?.({ id: occupant.id, nom: occupant.nom, cote: occupant.cote, enfant: occupant.enfant, marie: occupant.marie }, e);
                    }}
                    onClick={(e) => {
                      if (lectureSeule) return;
                      e.stopPropagation();
                      if (ignorerClic?.()) return;
                      surSelection?.({ type: "place", tableId: t.id, numero: pl.numero });
                    }}
                  >
                    {/* Zone de dépôt un peu plus large que la chaise, plus facile à viser au doigt. */}
                    <circle cx={r.x} cy={r.y} r="34" fill="transparent" />
                    {occupant ? (
                      <Avatar cx={r.x} cy={r.y} r={26} nom={occupant.nom} cote={occupant.cote} enfant={occupant.enfant} marie={occupant.marie} affichage={affichage} contour={active ? "var(--color-bronze)" : undefined} />
                    ) : (
                      <>
                        <circle cx={r.x} cy={r.y} r="25" fill="var(--color-surface-raised)" stroke={active ? "var(--color-bronze)" : "var(--color-ink-muted)"} strokeWidth={active ? 8 : 3} strokeDasharray="6 5" />
                        <text x={r.x} y={r.y} textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="700" fill="var(--color-ink-muted)" style={{ pointerEvents: "none" }}>
                          {pl.numero}
                        </text>
                      </>
                    )}
                    {occupant && (
                      // Prénom, et nom de famille en dessous : on reconnaît les familles d'un coup d'œil.
                      <text x={r.x + (r.x / d) * 62} y={r.y + (r.y / d) * 62} textAnchor="middle" fill="var(--color-ink)" stroke="var(--color-surface-raised)" strokeWidth="7" paintOrder="stroke" style={{ pointerEvents: "none" }}>
                        <tspan x={r.x + (r.x / d) * 62} dy={occupant.nomFamille ? -4 : 7} fontSize="21" fontWeight="700">
                          {occupant.prenom}
                        </tspan>
                        {occupant.nomFamille && (
                          <tspan x={r.x + (r.x / d) * 62} dy="21" fontSize="17" fill="var(--color-ink-muted)">
                            {occupant.nomFamille}
                          </tspan>
                        )}
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
  );
}
