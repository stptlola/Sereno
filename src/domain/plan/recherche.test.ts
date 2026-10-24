import { describe, expect, it } from "vitest";
import { rechercherInvite } from "./recherche";

const liste = [
  { prenom: "Zoé", nom: "Durand", table: "Les Roses", place: 3 },
  { prenom: "Paul", nom: "Durand", table: "Les Roses", place: 4 },
  { prenom: "Inès", nom: "Moreau", table: null, place: null },
];

describe("retrouver la table d'un invité", () => {
  it("trouve par le début du prénom ou du nom, sans accents", () => {
    expect(rechercherInvite("zoe", liste).map((i) => i.prenom)).toEqual(["Zoé"]);
    expect(rechercherInvite("durand", liste)).toHaveLength(2);
    expect(rechercherInvite("ines mor", liste).map((i) => i.table)).toEqual([null]);
  });
  it("ignore une saisie trop courte et ne cherche pas au milieu des mots", () => {
    expect(rechercherInvite("z", liste)).toEqual([]);
    expect(rechercherInvite("rand", liste)).toEqual([]);
  });
});
