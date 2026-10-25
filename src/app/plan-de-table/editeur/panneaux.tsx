"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { sansAccents } from "@/domain/planning/filtres";
import {
  ajouterElement,
  ajouterTable,
  asseoir,
  dupliquer,
  modifierElement,
  modifierSalle,
  modifierTable,
  placerInvite,
  supprimerElement,
  supprimerTable,
  tourner,
} from "../../actions/plan";
import type { ElementVue, InviteVue, TableVue } from "../types";
import type { Selection, Vue } from "./canevas";

// Sans couleur de fond par défaut : un bouton actif reçoit bg-ink sans conflit avec un fond clair.
const base = "rounded-full border px-3 py-2 text-sm disabled:opacity-50";
const bouton = `${base} border-line bg-surface-raised hover:border-ink`;
const boutonActif = `${base} border-ink bg-ink text-surface`;
const champ = "min-w-0 rounded-sm border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-or";
const FORMES = [
  ["RONDE", "Ronde"],
  ["RECTANGLE", "Rectangulaire"],
  ["OVALE", "Ovale"],
  ["CARREE", "Carrée"],
  ["DEMI_LUNE", "Demi-lune"],
] as const;
const ELEMENTS = [
  ["piste", "Piste de danse"],
  ["scene", "Scène"],
  ["dj", "DJ"],
  ["buffet", "Buffet"],
  ["bar", "Bar"],
  ["gateau", "Gâteau"],
  ["cadeaux", "Cadeaux"],
  ["photobooth", "Photobooth"],
  ["enfants", "Coin enfants"],
  ["sortie", "Sortie"],
] as const;

function useAction(apres: () => void) {
  const [enCours, demarrer] = useTransition();
  return [enCours, (f: () => Promise<unknown>) => demarrer(async () => (await f(), apres()))] as const;
}
const fd = (o: Record<string, string | number | boolean | undefined>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) if (v !== false && v !== undefined) f.set(k, v === true ? "on" : String(v));
  return f;
};

export function PanneauPlace({ selection, tables, aPlacer, apres, fermer }: { selection: Extract<Selection, { type: "place" }>; tables: TableVue[]; aPlacer: InviteVue[]; apres: () => void; fermer: () => void }) {
  const [enCours, agir] = useAction(apres);
  const [filtre, setFiltre] = useState("");
  const t = tables.find((x) => x.id === selection.tableId);
  if (!t) return null;
  const occupant = t.invites.find((i) => i.place === selection.numero);
  const liste = aPlacer.filter((g) => sansAccents(g.nom).includes(sansAccents(filtre)));
  return (
    <>
      <p className="font-display text-xl">
        {t.nom} · place {selection.numero}
      </p>
      {occupant ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{occupant.nom}</p>
          <button type="button" disabled={enCours} onClick={() => agir(() => placerInvite(occupant.id, null))} className={bouton}>
            Libérer la place
          </button>
          <Link href={`/invites/${occupant.id}`} className="text-sm text-bronze underline">
            Sa fiche
          </Link>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Place libre.</p>
      )}
      <p className="text-sm font-semibold">{occupant ? "Mettre quelqu’un d’autre ici" : "Installer ici"}</p>
      {aPlacer.length > 6 && <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Chercher un invité…" aria-label="Chercher un invité à installer" className={champ} />}
      {aPlacer.length === 0 ? (
        <p className="text-sm text-ink-muted">Tout le monde a sa place. Libérez d’abord une place pour déplacer quelqu’un.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {liste.map((g) => (
            <li key={g.id}>
              <button type="button" disabled={enCours} onClick={() => agir(async () => (await asseoir(g.id, t.id, selection.numero), fermer()))} className={bouton}>
                {g.nom}
                {g.reponse === "EN_ATTENTE" ? " · ?" : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function PanneauTable({ table: t, apres, fermer }: { table: TableVue; apres: () => void; fermer: () => void }) {
  const [enCours, agir] = useAction(apres);
  const [nom, setNom] = useState(t.nom);
  const enregistrer = (changes: Partial<{ name: string; shape: string; seats: number; honor: boolean }>) =>
    agir(() => modifierTable(fd({ id: t.id, name: nom, shape: t.forme, seats: t.places, honor: t.honneur, ...changes })));
  return (
    <>
      <div className="flex items-center gap-2">
        <input value={nom} onChange={(e) => setNom(e.target.value)} onBlur={() => nom.trim() && nom !== t.nom && enregistrer({ name: nom.trim() })} maxLength={60} aria-label="Nom de la table" className={`${champ} flex-1 font-display text-lg`} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-muted">Places</span>
        <button type="button" disabled={enCours || t.places <= 1} onClick={() => enregistrer({ seats: t.places - 1 })} aria-label="Une place de moins" className={`${bouton} w-10`}>
          −
        </button>
        <span className="w-6 text-center font-semibold">{t.places}</span>
        <button type="button" disabled={enCours || t.places >= 40} onClick={() => enregistrer({ seats: t.places + 1 })} aria-label="Une place de plus" className={`${bouton} w-10`}>
          +
        </button>
        <span className="text-sm text-ink-muted">· {t.invites.length} installé{t.invites.length > 1 ? "s" : ""}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {FORMES.map(([v, l]) => (
          <button key={v} type="button" disabled={enCours} aria-pressed={t.forme === v} onClick={() => enregistrer({ shape: v })} className={t.forme === v ? boutonActif : bouton}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={enCours} onClick={() => agir(() => tourner("table", t.id, -1))} className={bouton}>
          ⟲ Tourner
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(() => tourner("table", t.id, 1))} className={bouton}>
          ⟳ Tourner
        </button>
        <button type="button" disabled={enCours} onClick={() => enregistrer({ honor: !t.honneur })} className={bouton}>
          {t.honneur ? "Table ordinaire" : "Table d’honneur"}
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(() => dupliquer("table", t.id))} className={bouton}>
          Dupliquer
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(async () => (await supprimerTable(fd({ id: t.id })), fermer()))} className={`${bouton} text-alerte`}>
          Supprimer
        </button>
      </div>
    </>
  );
}

export function PanneauElement({ element: e, apres, fermer }: { element: ElementVue; apres: () => void; fermer: () => void }) {
  const [enCours, agir] = useAction(apres);
  const [v, setV] = useState({ label: e.libelle, width: e.largeur, depth: e.profondeur, rotation: e.rotation });
  const enregistrer = (x: typeof v) => agir(() => modifierElement(fd({ id: e.id, ...x })));
  const nombre = (cle: "width" | "depth" | "rotation", libelle: string, unite: string) => (
    <label className="flex flex-col gap-1 text-xs text-ink-muted">
      {libelle}
      <span className="flex items-center gap-1">
        <input type="number" inputMode="numeric" value={v[cle]} onChange={(ev) => setV({ ...v, [cle]: Number(ev.target.value) })} onBlur={() => enregistrer(v)} className={`${champ} w-24`} />
        {unite}
      </span>
    </label>
  );
  return (
    <>
      <input value={v.label} onChange={(ev) => setV({ ...v, label: ev.target.value })} onBlur={() => enregistrer(v)} maxLength={60} aria-label="Nom de l’élément" className={`${champ} font-display text-lg`} />
      <div className="flex flex-wrap gap-3">
        {nombre("width", "Largeur", "cm")}
        {nombre("depth", "Profondeur", "cm")}
        {nombre("rotation", "Angle", "°")}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={enCours} onClick={() => agir(() => tourner("element", e.id, -1))} className={bouton}>
          ⟲ Tourner
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(() => tourner("element", e.id, 1))} className={bouton}>
          ⟳ Tourner
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(() => dupliquer("element", e.id))} className={bouton}>
          Dupliquer
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(async () => (await supprimerElement(fd({ id: e.id })), fermer()))} className={`${bouton} text-alerte`}>
          Supprimer
        </button>
      </div>
    </>
  );
}

export function PanneauAjouter({ vue, apres, fermer }: { vue: Vue | null; apres: () => void; fermer: () => void }) {
  const [enCours, agir] = useAction(apres);
  const centre = vue ? { x: Math.round(vue.x + vue.l / 2), y: Math.round(vue.y + vue.p / 2) } : {};
  return (
    <>
      <p className="font-display text-xl">Ajouter</p>
      <p className="text-sm font-semibold">Une table</p>
      <div className="flex flex-wrap gap-2">
        {FORMES.map(([v, l]) => (
          <button key={v} type="button" disabled={enCours} onClick={() => agir(async () => (await ajouterTable(fd({ shape: v, seats: v === "DEMI_LUNE" ? 2 : v === "CARREE" ? 8 : 10, ...centre })), fermer()))} className={bouton}>
            {l}
          </button>
        ))}
        <button type="button" disabled={enCours} onClick={() => agir(async () => (await ajouterTable(fd({ shape: "RECTANGLE", seats: 2, honor: true, ...centre })), fermer()))} className={bouton}>
          ♥ Table d’honneur
        </button>
      </div>
      <p className="text-sm font-semibold">Un élément</p>
      <div className="flex flex-wrap gap-2">
        {ELEMENTS.map(([v, l]) => (
          <button key={v} type="button" disabled={enCours} onClick={() => agir(async () => (await ajouterElement(fd({ kind: v, ...centre })), fermer()))} className={bouton}>
            {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-muted">L’ajout se place au centre de ce que vous voyez ; glissez-le ensuite où vous voulez.</p>
    </>
  );
}

export function PanneauSalle({ largeur, profondeur, apres }: { largeur: number; profondeur: number; apres: () => void }) {
  const [enCours, agir] = useAction(apres);
  const [l, setL] = useState((largeur / 100).toLocaleString("fr-FR"));
  const [p, setP] = useState((profondeur / 100).toLocaleString("fr-FR"));
  return (
    <>
      <p className="font-display text-xl">La salle</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Largeur (m)
          <input inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} className={`${champ} w-24`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Profondeur (m)
          <input inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} className={`${champ} w-24`} />
        </label>
        <button type="button" disabled={enCours} onClick={() => agir(() => modifierSalle(fd({ largeur: l, profondeur: p })))} className={bouton}>
          Enregistrer
        </button>
      </div>
      <p className="text-xs text-ink-muted">Reprenez les dimensions données par votre lieu : le plan est à l’échelle, un carreau = 1 m.</p>
    </>
  );
}

export function PanneauInvites({ aPlacer, selection, choisir }: { aPlacer: InviteVue[]; selection: string | null; choisir: (id: string | null) => void }) {
  const [filtre, setFiltre] = useState("");
  const liste = aPlacer.filter((g) => sansAccents(g.nom).includes(sansAccents(filtre)));
  return (
    <>
      <p className="font-display text-xl">
        À placer <span className="font-sans text-sm text-ink-muted">({aPlacer.length})</span>
      </p>
      {aPlacer.length === 0 ? (
        <p className="text-sm text-ink-muted">Tout le monde a sa place.</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">Touchez un invité, puis sa place sur le plan.</p>
          {aPlacer.length > 6 && <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Chercher un invité…" aria-label="Chercher un invité à placer" className={champ} />}
          <ul className="flex flex-wrap gap-2">
            {liste.map((g) => (
              <li key={g.id}>
                <button type="button" aria-pressed={selection === g.id} onClick={() => choisir(selection === g.id ? null : g.id)} className={selection === g.id ? boutonActif : bouton}>
                  {g.nom}
                  {g.reponse === "EN_ATTENTE" ? " · ?" : ""}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
