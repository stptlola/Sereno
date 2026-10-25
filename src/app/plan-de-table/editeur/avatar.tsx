import { couleursCote, initiales } from "../types";

export type Affichage = "personnages" | "initiales";

/**
 * Pastille d'une personne sur le plan : une petite silhouette dans la couleur de son côté
 * (plus petite pour un enfant, avec un cœur pour les mariés), ou ses initiales si on le préfère.
 * Dessinée en SVG, centrée sur (cx, cy), de rayon r.
 */
export function Avatar({ cx, cy, r, nom, cote, enfant = false, marie = false, affichage, contour }: { cx: number; cy: number; r: number; nom: string; cote: string; enfant?: boolean; marie?: boolean; affichage: Affichage; contour?: string }) {
  const c = couleursCote(cote);
  const id = `avatar-${Math.round(cx * 10)}-${Math.round(cy * 10)}-${Math.round(r)}`;
  const tete = enfant ? 0.27 : 0.31;
  return (
    <g style={{ pointerEvents: "none" }}>
      <defs>
        <clipPath id={id}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={c.fond} stroke={contour ?? "var(--color-surface)"} strokeWidth={r * 0.14} />
      {affichage === "initiales" ? (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.78} fontWeight="700" fill={c.texte}>
          {initiales(nom)}
        </text>
      ) : (
        <g clipPath={`url(#${id})`} fill={c.texte} opacity={0.9}>
          <circle cx={cx} cy={cy - r * (enfant ? 0.08 : 0.16)} r={r * tete} />
          <ellipse cx={cx} cy={cy + r * (enfant ? 0.78 : 0.72)} rx={r * (enfant ? 0.52 : 0.62)} ry={r * 0.5} />
        </g>
      )}
      {marie && (
        <g>
          <circle cx={cx + r * 0.72} cy={cy - r * 0.72} r={r * 0.42} fill="var(--color-surface)" />
          <text x={cx + r * 0.72} y={cy - r * 0.7} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.56} fill="var(--color-alerte)">
            ♥
          </text>
        </g>
      )}
    </g>
  );
}
