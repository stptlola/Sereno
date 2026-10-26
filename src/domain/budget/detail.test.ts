import { describe, expect, it } from "vitest";
import { totauxDetail } from "./detail";

const l = (prevu: number | null, reel: number | null = null, caution = false) => ({ prevuCentimes: prevu, reelCentimes: reel, caution });

describe("détail d'une dépense", () => {
  it("additionne le prévu des lignes, sans réel tant qu'aucun n'est connu", () => {
    expect(totauxDetail([l(300000), l(25000)])).toEqual({ prevuCentimes: 325000, reelCentimes: null, cautionCentimes: 0 });
  });

  it("donne un réel dès qu'une ligne en a un, en complétant avec le prévu des autres", () => {
    expect(totauxDetail([l(300000, 280000), l(25000)])).toEqual({ prevuCentimes: 325000, reelCentimes: 305000, cautionCentimes: 0 });
  });

  it("met la caution à part : elle est rendue après le mariage", () => {
    expect(totauxDetail([l(300000), l(100000, null, true)])).toEqual({ prevuCentimes: 300000, reelCentimes: null, cautionCentimes: 100000 });
  });

  it("sans ligne comptée, laisse les montants de la dépense à définir", () => {
    expect(totauxDetail([l(50000, null, true)])).toEqual({ prevuCentimes: null, reelCentimes: null, cautionCentimes: 50000 });
    expect(totauxDetail([])).toEqual({ prevuCentimes: null, reelCentimes: null, cautionCentimes: 0 });
  });
});
