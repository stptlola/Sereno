"use client";
export function BoutonImprimer({ libelle = "Imprimer ou enregistrer en PDF" }: { libelle?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-surface">
      {libelle}
    </button>
  );
}
