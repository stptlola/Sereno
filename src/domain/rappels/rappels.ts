import { ajouterJours, ecartJours, normaliser } from "../planning/dates";

// E-mails de rappel (M11-01, M11-02, M11-06, rythme de M2-12). Fonction pure : décide qui reçoit quoi un jour donné.

export interface TacheRappel {
  id: string;
  titre: string;
  echeance: Date | null;
  faite: boolean;
  /** LEGAL ou IMPORTANT déclenchent un rappel 7 jours avant. */
  repere: string | null;
}

export interface DestinataireRappel {
  userId: string;
  email: string;
  prenom: string;
  hebdo: boolean;
  rappels: boolean;
  /** Types déjà envoyés aujourd'hui (pour ne jamais dépasser un e-mail par jour). */
  dejaEnvoyeAujourdhui: boolean;
}

export interface MariageRappel {
  prenoms: string;
  dateMariage: Date | null;
  taches: TacheRappel[];
  destinataires: DestinataireRappel[];
}

export interface EmailRappel {
  userId: string;
  email: string;
  type: "hebdo" | "mensuel" | "echeance" | "hebdo+echeance";
  sujet: string;
  priorites: TacheRappel[];
  echeances: TacheRappel[];
}

export const JOURS_AVANT_RAPPEL = 7;
/** Au-delà, sans tâche dans les 30 prochains jours, l'e-mail du lundi devient mensuel (M2-12). */
const SEUIL_LOINTAIN_JOURS = 365;

function estLundi(d: Date) {
  return d.getUTCDay() === 1;
}

function premierLundiDuMois(d: Date) {
  return estLundi(d) && d.getUTCDate() <= 7;
}

export function planifierRappels(jour: Date, mariages: readonly MariageRappel[]): EmailRappel[] {
  const auj = normaliser(jour);
  const dansSept = ajouterJours(auj, JOURS_AVANT_RAPPEL);
  const envois: EmailRappel[] = [];

  for (const m of mariages) {
    const aFaire = m.taches.filter((t) => !t.faite && t.echeance).sort((a, b) => a.echeance!.getTime() - b.echeance!.getTime());
    const echeances = aFaire.filter((t) => (t.repere === "LEGAL" || t.repere === "IMPORTANT") && ecartJours(dansSept, t.echeance!) === 0);
    const lointain = m.dateMariage ? ecartJours(auj, m.dateMariage) > SEUIL_LOINTAIN_JOURS : false;
    const rienAvant30Jours = !aFaire.some((t) => ecartJours(auj, t.echeance!) <= 30);
    const modeMensuel = lointain && rienAvant30Jours;
    const jourDuRecap = modeMensuel ? premierLundiDuMois(auj) : estLundi(auj);
    const priorites = aFaire.slice(0, 5);

    for (const d of m.destinataires) {
      if (d.dejaEnvoyeAujourdhui) continue;
      const veutRecap = d.hebdo && jourDuRecap && priorites.length > 0;
      const veutEcheance = d.rappels && echeances.length > 0;
      if (!veutRecap && !veutEcheance) continue;
      const type: EmailRappel["type"] = veutRecap && veutEcheance ? "hebdo+echeance" : veutRecap ? (modeMensuel ? "mensuel" : "hebdo") : "echeance";
      const sujet = veutEcheance
        ? `Dans une semaine : ${echeances[0]!.titre.charAt(0).toLowerCase()}${echeances[0]!.titre.slice(1)}`
        : modeMensuel
          ? "Votre mois : on garde le cap, tranquillement"
          : `Votre semaine : ${priorites.length} petite${priorites.length > 1 ? "s" : ""} chose${priorites.length > 1 ? "s" : ""} à faire`;
      envois.push({ userId: d.userId, email: d.email, type, sujet, priorites: veutRecap ? priorites : [], echeances: veutEcheance ? echeances : [] });
    }
  }
  return envois;
}
