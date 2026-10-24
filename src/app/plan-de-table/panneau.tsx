"use client";
import Link from "next/link";
import { useTransition } from "react";
import { asseoir, placerInvite, redimensionner, supprimerElement, supprimerTable, tourner } from "../actions/plan";
import type { Selection } from "./plan-salle";
import type { ElementVue, InviteVue, TableVue } from "./types";

/** Panneau d'action sur une place, une table ou un élément du plan (bas d'écran sur mobile). */
export function Panneau({
  selection,
  tables,
  elements,
  aPlacer,
  fermer,
  apres,
}: {
  selection: NonNullable<Selection>;
  tables: TableVue[];
  elements: ElementVue[];
  aPlacer: InviteVue[];
  fermer: () => void;
  apres: () => void;
}) {
  const [enCours, demarrer] = useTransition();
  const agir = (f: () => Promise<unknown>, fermerApres = false) =>
    demarrer(async () => {
      await f();
      apres();
      if (fermerApres) fermer();
    });
  const bouton = "rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50";

  let titre = "";
  let contenu: React.ReactNode = null;
  if (selection.type === "place") {
    const t = tables.find((x) => x.id === selection.tableId);
    if (!t) return null;
    const occupant = t.invites.find((i) => i.place === selection.numero);
    titre = `${t.nom} · place ${selection.numero}`;
    contenu = (
      <>
        {occupant ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{occupant.nom}</p>
            <Link href={`/invites/${occupant.id}`} className="text-sm text-bronze underline">
              Sa fiche
            </Link>
            <button type="button" disabled={enCours} onClick={() => agir(() => placerInvite(occupant.id, null))} className={bouton}>
              Libérer la place
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Place libre.</p>
        )}
        <p className="text-sm font-semibold">{occupant ? "Installer quelqu’un d’autre ici" : "Installer ici"}</p>
        {aPlacer.length === 0 ? (
          <p className="text-sm text-ink-muted">Tous vos invités ont une place. Libérez d’abord une place, ou touchez un invité installé pour l’échanger.</p>
        ) : (
          <ul className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {aPlacer.map((g) => (
              <li key={g.id}>
                <button type="button" disabled={enCours} onClick={() => agir(() => asseoir(g.id, t.id, selection.numero), true)} className={bouton}>
                  {g.nom}
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  } else if (selection.type === "table") {
    const t = tables.find((x) => x.id === selection.id);
    if (!t) return null;
    titre = t.nom;
    contenu = (
      <>
        <p className="text-sm text-ink-muted">
          {t.invites.length} sur {t.places} places. Glissez la table pour la déplacer ; touchez une place pour y installer quelqu’un.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={enCours} onClick={() => agir(() => tourner("table", t.id, -1))} className={bouton}>
            ⟲ Tourner
          </button>
          <button type="button" disabled={enCours} onClick={() => agir(() => tourner("table", t.id, 1))} className={bouton}>
            ⟳ Tourner
          </button>
          <a href={`#table-${t.id}`} onClick={fermer} className={bouton}>
            Modifier la table
          </a>
          <form action={supprimerTable} onSubmit={fermer}>
            <input type="hidden" name="id" value={t.id} />
            <button type="submit" className={`${bouton} text-alerte`}>
              Supprimer
            </button>
          </form>
        </div>
      </>
    );
  } else {
    const e = elements.find((x) => x.id === selection.id);
    if (!e) return null;
    titre = e.libelle;
    contenu = (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={enCours} onClick={() => agir(() => tourner("element", e.id, -1))} className={bouton}>
          ⟲ Tourner
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(() => tourner("element", e.id, 1))} className={bouton}>
          ⟳ Tourner
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(() => redimensionner(e.id, 0.9))} className={bouton}>
          Plus petit
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(() => redimensionner(e.id, 1.1))} className={bouton}>
          Plus grand
        </button>
        <form action={supprimerElement} onSubmit={fermer}>
          <input type="hidden" name="id" value={e.id} />
          <button type="submit" className={`${bouton} text-alerte`}>
            Supprimer
          </button>
        </form>
      </div>
    );
  }

  return (
    <div role="dialog" aria-label={titre} className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-xl flex-col gap-3 rounded-t-md border border-line bg-surface p-4 shadow-lg lg:bottom-4 lg:rounded-md" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xl">{titre}</p>
        <button type="button" onClick={fermer} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft">
          ✕
        </button>
      </div>
      {contenu}
    </div>
  );
}
