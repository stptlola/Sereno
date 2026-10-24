import { describe, expect, it } from "vitest";
import { jour } from "./dates";
import { grouperParPeriode, periodeDe } from "./periodes";

const auj = jour(2026, 10, 23);
const mariage = jour(2028, 6, 17);
const t = (a: number, m: number, j: number, faite = false) => ({ date: jour(a, m, j), faite });

describe("frise par périodes", () => {
  it("détaille le mois en cours et le suivant, regroupe le lointain", () => {
    expect(periodeDe(jour(2026, 10, 30), false, auj, mariage)).toBe("ceMois");
    expect(periodeDe(jour(2026, 11, 15), false, auj, mariage)).toBe("moisProchain");
    expect(periodeDe(jour(2027, 1, 10), false, auj, mariage)).toBe("dans2a3Mois");
    expect(periodeDe(jour(2027, 3, 1), false, auj, mariage)).toBe("dans3a6Mois");
    expect(periodeDe(jour(2027, 8, 1), false, auj, mariage)).toBe("dans6a12Mois");
    expect(periodeDe(jour(2028, 1, 1), false, auj, mariage)).toBe("plusDUnAn");
  });

  it("garde la semaine du mariage et l'après en bas", () => {
    expect(periodeDe(jour(2028, 6, 14), false, auj, mariage)).toBe("semaineDuMariage");
    expect(periodeDe(jour(2028, 7, 17), false, auj, mariage)).toBe("apresLeMariage");
  });

  it("signale une tâche passée non faite, mais range une tâche passée faite dans le mois", () => {
    expect(periodeDe(jour(2026, 10, 1), false, auj, mariage)).toBe("aRattraper");
    expect(periodeDe(jour(2026, 10, 1), true, auj, mariage)).toBe("ceMois");
  });

  it("ouvre les deux premières périodes qui ont encore du travail, dans l'ordre", () => {
    const groupes = grouperParPeriode(
      [t(2026, 10, 30, true), t(2026, 11, 15), t(2027, 3, 1), t(2027, 8, 1), t(2028, 7, 17)],
      auj,
      mariage,
    );
    expect(groupes.map((g) => g.cle)).toEqual(["ceMois", "moisProchain", "dans3a6Mois", "dans6a12Mois", "apresLeMariage"]);
    expect(groupes.filter((g) => g.ouverte).map((g) => g.cle)).toEqual(["moisProchain", "dans3a6Mois"]);
  });

  it("donne la première et la dernière date de chaque période", () => {
    const [g] = grouperParPeriode([t(2027, 4, 2), t(2027, 2, 1)], auj, mariage);
    expect(g?.du).toEqual(jour(2027, 2, 1));
    expect(g?.au).toEqual(jour(2027, 4, 2));
  });
});
