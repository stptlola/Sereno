import { classeChamp } from "@/components/ui";

const isoJour = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/** Champs communs à la création et à la modification d'une tâche. */
export function ChampsTache({
  responsables,
  valeurs,
}: {
  responsables: string[];
  valeurs?: { dueDate?: Date | null; assignee?: string | null; note?: string | null };
}) {
  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Échéance</span>
        <input type="date" name="dueDate" defaultValue={isoJour(valeurs?.dueDate)} className={classeChamp} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Qui s’en occupe ?</span>
        <input name="assignee" list="responsables" defaultValue={valeurs?.assignee ?? ""} placeholder="Un prénom, ou vide" maxLength={60} className={classeChamp} />
        <datalist id="responsables">
          {responsables.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Note</span>
        <textarea name="note" rows={4} defaultValue={valeurs?.note ?? ""} maxLength={2000} placeholder="Un contact, une idée, un prix…" className={classeChamp} />
      </label>
    </>
  );
}
