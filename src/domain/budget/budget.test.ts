import { describe, expect, it } from "vitest";
import { bilan, engage, lireEuros, messageDepassement, resteAPayer, statutAutomatique, type Depense } from "./calculs";
import { suggestionsRestantes } from "./suggestions";

const d = (x: Partial<Depense>): Depense => ({ posteId: "p1", prevuCentimes: null, reelCentimes: null, statut: "A_CHERCHER", versements: [], ...x });

describe("montants", () => {
  it("lit les montants comme on les tape", () => {
    expect(lireEuros("1 234,50")).toBe(123_450);
    expect(lireEuros("800 €")).toBe(80_000);
    expect(lireEuros("12.5")).toBe(1_250);
    expect(lireEuros("")).toBeNull();
    expect(lireEuros("abc")).toBeNull();
    expect(lireEuros("-20")).toBeNull();
  });
});

describe("dépenses", () => {
  it("engage le réel s'il est connu, sinon le prévu", () => {
    expect(engage(d({ prevuCentimes: 100_000 }))).toBe(100_000);
    expect(engage(d({ prevuCentimes: 100_000, reelCentimes: 120_000 }))).toBe(120_000);
  });

  it("calcule le reste à payer à partir des versements payés", () => {
    const x = d({ reelCentimes: 300_000, versements: [{ montantCentimes: 90_000, paye: true }, { montantCentimes: 210_000, paye: false }] });
    expect(resteAPayer(x)).toBe(210_000);
  });

  it("passe en « payé » tout seul quand tout est réglé, et en revient si un versement manque", () => {
    const solde = d({ statut: "RESERVE", reelCentimes: 300_000, versements: [{ montantCentimes: 300_000, paye: true }] });
    expect(statutAutomatique(solde)).toBe("PAYE");
    const partiel = d({ statut: "PAYE", reelCentimes: 300_000, versements: [{ montantCentimes: 100_000, paye: true }] });
    expect(statutAutomatique(partiel)).toBe("RESERVE");
  });
});

describe("bilan", () => {
  const postes = [
    { id: "p1", nom: "Traiteur et boissons", prevuCentimes: 700_000 },
    { id: "p2", nom: "Photo et vidéo", prevuCentimes: 200_000 },
  ];
  const depenses = [
    d({ posteId: "p1", reelCentimes: 730_000, versements: [{ montantCentimes: 200_000, paye: true }] }),
    d({ posteId: "p2", prevuCentimes: 150_000 }),
  ];
  const b = bilan(1_000_000, postes, depenses);

  it("totalise l'engagé, le payé et le reste", () => {
    expect(b.engageCentimes).toBe(880_000);
    expect(b.payeCentimes).toBe(200_000);
    expect(b.resteAPayerCentimes).toBe(680_000);
    expect(b.resteEnveloppeCentimes).toBe(120_000);
    expect(b.depasse).toBe(false);
  });

  it("signale le poste qui dépasse, avec un message rassurant", () => {
    const traiteur = b.postes.find((p) => p.poste.id === "p1")!;
    expect(traiteur.depasse).toBe(true);
    expect(messageDepassement("Traiteur et boissons", traiteur.ecartCentimes).replace(/\s/g, " ")).toBe("Le poste traiteur et boissons dépasse de 300 €. On regarde ensemble ?");
  });

  it("signale le dépassement du budget global", () => {
    expect(bilan(500_000, postes, depenses).depasse).toBe(true);
  });
});

describe("sous-postes suggérés", () => {
  it("propose les suggestions non utilisées, avec les prénoms pour les tenues", () => {
    const s = suggestionsRestantes("Tenues", ["Retouches"], ["Léa", "Sam"]);
    expect(s).toContain("Tenue de Léa");
    expect(s).toContain("Tenue de Sam");
    expect(s).not.toContain("Retouches");
  });
});
