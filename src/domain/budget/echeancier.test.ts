import { describe, expect, it } from "vitest";
import { jour } from "../planning/dates";
import { echeancier, financement, prochainsPaiements } from "./echeancier";

const p = (id: string, echeance: Date | null, montant = 10000, paye = false) => ({ id, depense: `Dépense ${id}`, poste: "Traiteur", prestataire: null, montantCentimes: montant, echeance, paye });
const auj = jour(2026, 10, 26);

describe("échéancier des paiements", () => {
  it("regroupe en retard, cette semaine, ce mois-ci, puis mois par mois, et les paiements sans date à la fin", () => {
    const g = echeancier([p("a", jour(2026, 10, 20)), p("b", jour(2026, 10, 28)), p("c", jour(2026, 11, 3)), p("d", jour(2027, 1, 15)), p("e", null), p("f", jour(2026, 10, 30), 500, true)], auj);
    expect(g.map((x) => x.titre)).toEqual(["À régulariser", "Cette semaine", "Novembre 2026", "Janvier 2027", "Sans date"]);
    expect(g[0]?.enRetard).toBe(true);
    expect(g[1]?.paiements.map((x) => x.id)).toEqual(["b"]);
  });

  it("additionne chaque groupe et ignore ce qui est réglé", () => {
    const g = echeancier([p("a", jour(2026, 10, 27), 30000), p("b", jour(2026, 10, 29), 20000), p("c", jour(2026, 10, 29), 99999, true)], auj);
    expect(g).toHaveLength(1);
    expect(g[0]?.totalCentimes).toBe(50000);
  });

  it("donne les prochains paiements datés, le plus proche d'abord", () => {
    expect(prochainsPaiements([p("x", jour(2027, 3, 1)), p("y", jour(2026, 11, 1)), p("z", null), p("w", jour(2026, 10, 1), 1, true)], 2).map((x) => x.id)).toEqual(["y", "x"]);
  });
});

describe("qui finance quoi", () => {
  it("regroupe par financeur sans tenir compte des accents, et calcule les parts", () => {
    const r = financement([
      { payeur: "Parents de Léa", montantCentimes: 300000, payeCentimes: 100000 },
      { payeur: "parents de lea", montantCentimes: 100000, payeCentimes: 0 },
      { payeur: "Nous deux", montantCentimes: 400000, payeCentimes: 400000 },
      { payeur: null, montantCentimes: 200000, payeCentimes: 0 },
    ]);
    expect(r.map((x) => [x.payeur, x.engageCentimes, x.resteCentimes, x.part])).toEqual([
      ["Parents de Léa", 400000, 300000, 40],
      ["Nous deux", 400000, 0, 40],
      ["Non précisé", 200000, 200000, 20],
    ]);
  });
});
