import { describe, expect, it } from "vitest";
import { jour } from "../planning/dates";
import { planifierRappels, type MariageRappel } from "./rappels";

const lundi = jour(2026, 10, 26);
const mardi = jour(2026, 10, 27);
const dest = (x = {}) => ({ userId: "u1", email: "lea@ex.fr", prenom: "Léa", hebdo: true, rappels: true, dejaEnvoyeAujourdhui: false, ...x });
const t = (id: string, d: Date, repere: string | null = null, faite = false) => ({ id, titre: `Tâche ${id}`, echeance: d, faite, repere });

const mariage = (x: Partial<MariageRappel> = {}): MariageRappel => ({
  prenoms: "Léa et Sam",
  dateMariage: jour(2027, 6, 19),
  taches: [t("a", jour(2026, 11, 2), "LEGAL"), t("b", jour(2026, 11, 10)), t("c", jour(2026, 10, 30), null, true)],
  destinataires: [dest()],
  ...x,
});

describe("rappels par e-mail", () => {
  it("envoie le lundi les priorités, sans les tâches faites, et regroupe avec le rappel d'échéance", () => {
    const [e] = planifierRappels(lundi, [mariage()]);
    expect(e?.type).toBe("hebdo+echeance");
    expect(e?.priorites.map((p) => p.id)).toEqual(["a", "b"]);
    expect(e?.echeances.map((p) => p.id)).toEqual(["a"]);
    expect(e?.sujet).toBe("Dans une semaine : tâche a");
  });

  it("n'envoie rien un mardi sans échéance dans 7 jours", () => {
    expect(planifierRappels(mardi, [mariage()])).toEqual([]);
  });

  it("rappelle une démarche légale 7 jours avant, même hors lundi", () => {
    const [e] = planifierRappels(mardi, [mariage({ taches: [t("x", jour(2026, 11, 3), "LEGAL")] })]);
    expect(e?.type).toBe("echeance");
  });

  it("ne rappelle pas une tâche ordinaire", () => {
    expect(planifierRappels(mardi, [mariage({ taches: [t("x", jour(2026, 11, 3))] })])).toEqual([]);
  });

  it("respecte les préférences de chacun", () => {
    const envois = planifierRappels(lundi, [mariage({ destinataires: [dest({ hebdo: false }), dest({ userId: "u2", rappels: false, hebdo: false })] })]);
    expect(envois).toHaveLength(1);
    expect(envois[0]?.type).toBe("echeance");
  });

  it("n'envoie jamais deux e-mails le même jour", () => {
    expect(planifierRappels(lundi, [mariage({ destinataires: [dest({ dejaEnvoyeAujourdhui: true })] })])).toEqual([]);
  });

  it("passe au rythme mensuel pour un mariage lointain sans tâche proche", () => {
    const loin = mariage({ dateMariage: jour(2028, 9, 16), taches: [t("z", jour(2027, 3, 1))] });
    expect(planifierRappels(jour(2026, 11, 9), [loin])).toEqual([]);
    const [e] = planifierRappels(jour(2026, 11, 2), [loin]);
    expect(e?.type).toBe("mensuel");
  });
});
