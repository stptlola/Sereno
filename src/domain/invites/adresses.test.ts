import { describe, expect, it } from "vitest";
import { compterPlats, formaterAdresse, nettoyerPlat, rattacherAdresse } from "./adresses";

describe("collecte d'adresses", () => {
  it("met l'adresse en forme pour une enveloppe, sans le pays pour la France", () => {
    expect(formaterAdresse({ rue: "12 rue des Lys", complement: "Bât. B", codePostal: "69002", ville: "Lyon", pays: "France" })).toEqual({ adresse: "12 rue des Lys\nBât. B\n69002 LYON" });
    expect(formaterAdresse({ rue: "Rue du Lac 3", complement: "", codePostal: "1201", ville: "Genève", pays: "Suisse" })).toEqual({ adresse: "Rue du Lac 3\n1201 GENÈVE\nSUISSE" });
  });
  it("refuse une adresse incomplète", () => {
    expect(formaterAdresse({ rue: "", complement: "", codePostal: "69002", ville: "Lyon", pays: "" })).toHaveProperty("erreur");
    expect(formaterAdresse({ rue: "12 rue", complement: "", codePostal: "!", ville: "Lyon", pays: "" })).toHaveProperty("erreur");
  });
  it("rattache seulement quand un seul invité correspond exactement", () => {
    const l = [{ id: "1", prenom: "Zoé", nom: "Durand" }, { id: "2", prenom: "Paul", nom: "Durand" }, { id: "3", prenom: "Paul", nom: "Durand" }];
    expect(rattacherAdresse({ prenom: "zoe", nom: "DURAND" }, l)).toBe("1");
    expect(rattacherAdresse({ prenom: "Paul", nom: "Durand" }, l)).toBeNull();
    expect(rattacherAdresse({ prenom: "Inès", nom: "Moreau" }, l)).toBeNull();
  });
});

describe("plats choisis", () => {
  const options = ["Viande", "Poisson", "Végétarien"];
  it("n'accepte que les plats proposés", () => {
    expect(nettoyerPlat("Poisson", options)).toBe("Poisson");
    expect(nettoyerPlat("Pizza", options)).toBeNull();
  });
  it("compte chaque plat, puis ceux qui n'ont pas encore choisi", () => {
    expect(compterPlats([{ plat: "Viande" }, { plat: "Viande" }, { plat: "Poisson" }, { plat: null }], options)).toEqual([
      { plat: "Viande", nombre: 2 },
      { plat: "Poisson", nombre: 1 },
      { plat: "Végétarien", nombre: 0 },
      { plat: "Pas encore choisi", nombre: 1 },
    ]);
  });
});
