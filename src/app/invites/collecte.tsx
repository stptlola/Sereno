import { activerCollecte, ajouterDepuisAdresse, associerAdresse, desactiverCollecte, ignorerAdresse } from "../actions/adresses";
import { env } from "@/lib/env";

type Soumission = { id: string; firstName: string; lastName: string; address: string; email: string | null };

/** Collecte d'adresses par lien (M4-11) : le lien à partager, et les adresses à rattacher à la main. */
export function CollecteAdresses({ jeton, recues, aTrier, invites }: { jeton: string | null; recues: number; aTrier: Soumission[]; invites: { id: string; nom: string }[] }) {
  return (
    <details className="rounded-md border border-line bg-surface-raised p-4" open={aTrier.length > 0}>
      <summary className="cursor-pointer font-semibold">
        Collecte d’adresses pour les faire-part
        {jeton ? <span className="font-normal text-ink-muted"> · {recues} reçue{recues > 1 ? "s" : ""}</span> : null}
        {aTrier.length > 0 && <span className="ml-2 rounded-full bg-or px-2 py-0.5 text-xs text-ink">{aTrier.length} à trier</span>}
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-sm">
        {!jeton ? (
          <>
            <p className="text-ink-muted">Créez un lien à envoyer à vos invités (par message ou sur les réseaux) : chacun y laisse son adresse postale, qui s’ajoute directement à sa fiche.</p>
            <form action={activerCollecte}>
              <button type="submit" className="rounded-full bg-ink px-4 py-2 font-semibold text-surface">
                Créer mon lien de collecte
              </button>
            </form>
          </>
        ) : (
          <>
            <input readOnly value={`${env().APP_URL}/adresses/${jeton}`} aria-label="Lien de collecte d’adresses" className="w-full rounded-sm border border-line bg-surface-soft px-3 py-2" />
            <p className="text-ink-muted">Quand le prénom et le nom correspondent à un seul de vos invités, l’adresse s’ajoute toute seule à son foyer. Sinon, elle vous attend ci-dessous.</p>
            <form action={desactiverCollecte}>
              <button type="submit" className="text-ink-muted underline">
                Désactiver le lien
              </button>
            </form>
          </>
        )}
        {aTrier.map((a) => (
          <div key={a.id} className="flex flex-col gap-2 rounded-sm bg-surface-soft p-3">
            <p>
              <span className="font-semibold">
                {a.firstName} {a.lastName}
              </span>
              {a.email && <span className="text-ink-muted"> · {a.email}</span>}
            </p>
            <p className="whitespace-pre-line text-ink-muted">{a.address}</p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={associerAdresse} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="guestId" required defaultValue="" aria-label={`Rattacher l’adresse de ${a.firstName} à un invité`} className="rounded-sm border border-line bg-surface-raised px-2 py-1.5">
                  <option value="" disabled>
                    C’est l’adresse de…
                  </option>
                  {invites.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nom}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded-full border border-ink px-3 py-1.5 font-semibold">
                  Rattacher
                </button>
              </form>
              <form action={ajouterDepuisAdresse}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="rounded-full border border-line px-3 py-1.5">
                  Ajouter comme invité
                </button>
              </form>
              <form action={ignorerAdresse}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-ink-muted underline">
                  Ignorer
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
